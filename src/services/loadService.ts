// backend/src/services/loadService.ts

import pool from '../config/db';
import { ILoad, ILoadDetails, ILoadListItem, IMapTrip, ITripDetails } from '../types/load.types';
import { CreateLoadDto, UpdateLoadDto, CompleteLoadDto, CreateBulkLoadDto } from '../dto/load.dto';
import { UserPayload } from '../middlewares/authMiddleware';
import { socketService } from './socketService';

// 1. Load List Filters
export interface ILoadListFilters {
    asiakasId?: string;
    kalustoNro?: string;
    kuljId?: string;
    status?: 'active' | 'pending_inspection' | 'all';
    loadType?: number;
}

// 2. Helper function to recalculate totals for a given puulaani_id
const recalculatePuulaaniTotals = async (client: any, puulaaniId: number) => {
    if (!puulaaniId) return;

    console.log(`Recalculating ALL totals for parent puulaani ID: ${puulaaniId}...`);

    const recalculateQuery = `
        WITH ptl_hauled_sum AS (
            SELECT puutavara_id, COALESCE(SUM(m3), 0) AS new_hauled_total
            FROM public.kuorma
            WHERE puulaani_id = $1 AND is_active = TRUE AND puutavara_id IS NOT NULL
            GROUP BY puutavara_id
        ),
        updated_ptl AS (
            UPDATE public.puutavaralaji ptl
            SET haettu = COALESCE(phs.new_hauled_total, 0), jaljella = ptl.kuutiot - COALESCE(phs.new_hauled_total, 0)
            FROM ptl_hauled_sum phs
            WHERE ptl.puulaani_id = $1 AND ptl.puutavara_id = phs.puutavara_id
            RETURNING ptl.puulaani_id
        ),
        puulaani_summary AS (
            SELECT COALESCE(SUM(kuutiot), 0) as total_volume, COALESCE(SUM(haettu), 0) as total_hauled
            FROM public.puutavaralaji
            WHERE puulaani_id = $1
        )
        UPDATE public.puulaani p
        SET kok = ps.total_volume, jaljella = (ps.total_volume - ps.total_hauled)
        FROM puulaani_summary ps
        WHERE p.puulaani_id = $1;
    `;
    await client.query(recalculateQuery, [puulaaniId]);
};

// 3. Get All Loads for List
export const getAllLoadsForList = async (filters: ILoadListFilters): Promise<ILoadListItem[]> => {
    let queryText = `
        SELECT
            k.kuorma_id, 
            k.pvm, -- Return RAW DATE
            k.ajomaarays_nro,
            k.vastaanotto_nro, kal.rek_nro, kul.nimi AS kuljettajan_nimi,
            p.nimi AS puulaani_nimi, a.asiakkaan_nimi, pt.puutavara AS timber_type,
            k.reitti, 
            CASE WHEN k.tyyppi = 1 
                 THEN COALESCE((SELECT SUM(m3) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id), 0) 
                 ELSE k.m3 
            END as m3,
            CASE WHEN k.tyyppi = 1 
                 THEN COALESCE((SELECT SUM(km) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id), 0) 
                 ELSE k.km 
            END as km,
            k.tunnit, 
            CASE WHEN k.tyyppi = 1 
                 THEN COALESCE((SELECT SUM(kpl) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id), 0) 
                 ELSE k.kpl 
            END as kpl,
            k.lisatiedot, k.status, k.is_active, k.tyyppi,
            p.sijainti_lat as origin_lat, p.sijainti_long as origin_lng,
            (SELECT COUNT(*) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id) as waybill_count
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
    `;
    const conditions: string[] = [];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (filters.loadType !== undefined) {
        conditions.push(`k.tyyppi = $${paramIndex++}`);
        queryParams.push(filters.loadType);
    }

    if (filters.status === 'active') {
        conditions.push(`k.status != 'Completed'`);
        conditions.push(`k.is_active = TRUE`);
    } else if (filters.status === 'pending_inspection') {
        conditions.push(`k.status = 'Completed'`);
        conditions.push(`k.laskutukseen = 0`);
        conditions.push(`k.is_active = TRUE`);
    } else if (filters.status !== 'all') {
        conditions.push(`k.is_active = TRUE`);
    }

    if (filters.asiakasId) { conditions.push(`k.asiakas_id = $${paramIndex++}`); queryParams.push(parseInt(filters.asiakasId, 10)); }
    if (filters.kalustoNro) { conditions.push(`k.kalusto_nro = $${paramIndex++}`); queryParams.push(parseInt(filters.kalustoNro, 10)); }
    if (filters.kuljId) { conditions.push(`k.kulj_id = $${paramIndex++}`); queryParams.push(parseInt(filters.kuljId, 10)); }

    if (conditions.length > 0) { queryText += ` WHERE ${conditions.join(' AND ')}`; }
    queryText += ` ORDER BY k.pvm DESC, k.kuorma_id DESC;`;

    try {
        const result = await pool.query(queryText, queryParams);
        return result.rows;
    } catch (error) {
        console.error("Error fetching filtered loads:", error);
        throw new Error("Database query for fetching filtered loads failed.");
    }
};

// 4. Get Load by ID
export const getLoadById = async (id: number): Promise<ILoadDetails | null> => {
    const query = `
        SELECT k.*, a.asiakkaan_nimi, kal.rek_nro, kul.nimi AS kuljettajan_nimi,
            p.nimi AS origin_name, p.osoite AS origin_address, p.sijainti_lat AS origin_lat,
            p.sijainti_long AS origin_lng, p.lisatiedot AS origin_instructions,
            pt.puutavara AS task_timber_type_name, pl.jaljella AS task_remaining_volume_before_this_trip,
            pp.purkupaikka AS destination_name, pp.osoite AS destination_address,
            pp.sijainti_lat AS destination_lat, pp.sijainti_long AS destination_lng
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE k.kuorma_id = $1;
    `;
    try {
        const result = await pool.query(query, [id]);
        if (result.rowCount === 0) return null;
        const row = result.rows[0];
        return { ...row, taskVolume: row.m3 };
    } catch (error) {
        console.error(`Error fetching detailed load with ID ${id}:`, error);
        throw new Error(`Database query for fetching detailed load with ID ${id} failed.`);
    }
};

// 5. Get Trip by Load ID
export const getTripByLoadId = async (id: number): Promise<any> => {

    // 1. Check Load Type
    const typeCheckQuery = `SELECT tyyppi FROM public.kuorma WHERE kuorma_id = $1`;
    const typeCheckResult = await pool.query(typeCheckQuery, [id]);

    if (typeCheckResult.rowCount === 0) {
        console.error(`[getTripByLoadId] Load with ID ${id} not found.`);
        return null;
    }

    const loadType = typeCheckResult.rows[0].tyyppi;

    // 6. Case A: Consignment (Rahtikirja) - tyyppi = 1
    if (loadType === 1) {
        console.log(`[getTripByLoadId] Fetching Consignment details for ID ${id}`);

        const loadQuery = `
            SELECT 
                k.kuorma_id as "kuormaId",
                k.pvm,
                k.status,
                k.lisatiedot,
                CASE WHEN k.tyyppi = 1 
                     THEN COALESCE((SELECT SUM(m3) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id), 0) 
                     ELSE k.m3 
                END as m3,
                CASE WHEN k.tyyppi = 1 
                     THEN COALESCE((SELECT SUM(km) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id), 0) 
                     ELSE k.km 
                END as km,
                CASE WHEN k.tyyppi = 1 
                     THEN COALESCE((SELECT SUM(kpl) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id), 0) 
                     ELSE k.kpl 
                END as kpl,
                k.tunnit, 
                k.tyyppi,
                k.kulj_id,
                k.kalusto_nro,
                k.asiakas_id,
                
                -- Joins for Names
                a.asiakkaan_nimi as "asiakkaanNimi",
                kal.rek_nro as "rekNro",
                kul.nimi as "kuljettajanNimi"
            FROM public.kuorma k
            LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
            LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
            LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
            WHERE k.kuorma_id = $1
        `;
        const loadResult = await pool.query(loadQuery, [id]);
        const loadData = loadResult.rows[0];

        // 7. Fetch Waybills with Customer Names
        const waybillsQuery = `
            SELECT 
                r.rahti_id as "rahtiId",
                r.asiakas_id as "asiakasId",
                a.asiakkaan_nimi as "customerName", -- Joined name
                r.rahtikirjan_nro as "rahtikirjanNro",
                r.reitti,
                r.m3, 
                r.km, 
                r.kpl, 
                r.jako, 
                r.tievero, 
                r.lisatiedot
            FROM public.rahtikirja r
            LEFT JOIN public.asiakkaat a ON r.asiakas_id = a.asiakkaan_id
            WHERE r.kuorma_id = $1
            ORDER BY r.rahti_id ASC
        `;
        const waybillsResult = await pool.query(waybillsQuery, [id]);

        loadData.rahtikirjat = waybillsResult.rows;
        loadData.kuormaId = id; // Ensure ID is present

        return loadData;
    }

    // 8. Case B: Timber Load (Puukuorma) - tyyppi = 0
    else {
        console.log(`[getTripByLoadId] Fetching Timber Trip details for ID ${id}`);

        const initialLoadQuery = 'SELECT ajomaarays_nro, asiakas_id, kulj_id, kalusto_nro FROM public.kuorma WHERE kuorma_id = $1';
        const initialLoadResult = await pool.query(initialLoadQuery, [id]);

        const { ajomaaraysNro, asiakasId, kuljId, kalustoNro } = initialLoadResult.rows[0];
        const drivingOrderNumber = ajomaaraysNro;

        // 9. Fetch details for the specific row (for completed trip view)
        const tripLegsQuery = `
            SELECT
                k.kuorma_id as "kuormaId", 
                k.pvm, 
                k.status, 
                k.m3, k.km, 
                k.tunnit, 
                k.kpl, 
                k.reitti, 
                k.vastaanotto_nro as "vastaanottoNro", -- EXPLICIT ALIAS
                k.ajomaarays_nro as "ajomaaraysNro",   -- EXPLICIT ALIAS
                k.kulj_id, 
                k.lisatiedot,
                k.puulaani_id, 
                k.puutavara_id, 
                k.kalusto_nro,
                
                COALESCE(p.nimi, k.lahto, 'N/A') AS lahto,
                COALESCE(pp.purkupaikka, k.kohde, 'N/A') AS kohde,
                
                a.asiakkaan_nimi as "asiakkaanNimi",
                kal.rek_nro as "rekNro",
                kul.nimi as "kuljettajanNimi",
                
                'Timber Load' as tyyppi
            FROM public.kuorma k
            LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
            LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
            LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
            LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
            LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
            LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
            LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
            WHERE k.kuorma_id = $1
        `;
        const tripLegsResult = await pool.query(tripLegsQuery, [id]);

        if (tripLegsResult.rowCount === 0) return null;

        const row = tripLegsResult.rows[0];

        // 10. Construct Trip Details Object
        const tripDetails = {
            tripId: ajomaaraysNro || `Trip #${id}`,
            kuormaId: id,
            ajomaaraysNro: row.ajomaaraysNro,
            vastaanottoNro: row.vastaanottoNro,
            asiakasId: asiakasId,
            asiakkaanNimi: row.asiakkaanNimi,
            rekNro: row.rekNro,
            kalustoNro: kalustoNro,
            kuljettajanNimi: row.kuljettajanNimi,
            lahto: row.lahto,
            kohde: row.kohde,
            m3: row.m3,
            km: row.km,
            tunnit: row.tunnit,
            kpl: row.kpl,
            tyyppi: row.tyyppi,
            pvm: row.pvm,
            lisatiedot: row.lisatiedot,
            legs: []
        };

        return tripDetails;
    }
};

// 11. Create Load
export const createLoad = async (data: CreateLoadDto): Promise<ILoad> => {
    const {
        tyyppi, asiakasId, puulaaniId, kalustoNro, kuljId, pvm,
        ajomaaraysNro, kohde, lahto, m3, km, lisatiedot, puutavaraId, vastaanottoNro
    } = data;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let autoId: number | null = null;
        if (puulaaniId && kalustoNro) {
            const autoResult = await client.query('SELECT auto_id FROM public.autot WHERE puulaani_id = $1 AND kalusto_id = $2 LIMIT 1', [puulaaniId, kalustoNro]);
            if (autoResult && (autoResult.rowCount ?? 0) > 0) { autoId = autoResult.rows[0].autoId; }
        }

        const insertQuery = `
            INSERT INTO public.kuorma 
            (tyyppi, asiakas_id, puulaani_id, puutavara_id, auto_id, kulj_id, pvm, ajomaarays_nro, kohde, lahto, m3, km, lisatiedot, kalusto_nro, status, vastaanotto_nro) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Assigned', $15) 
            RETURNING *;
        `;
        const params = [tyyppi, asiakasId, puulaaniId ?? null, puutavaraId ?? null, autoId, kuljId, pvm, ajomaaraysNro ?? null, kohde ?? null, lahto ?? null, m3 ?? 0, km ?? 0, lisatiedot ?? null, kalustoNro, vastaanottoNro ?? null];
        const result = await client.query(insertQuery, params);
        const newLoad = result.rows[0];

        if (puutavaraId && m3 && m3 > 0) {
            await client.query(`UPDATE public.puutavaralaji SET haettu = haettu + $1, jaljella = jaljella - $1 WHERE puutavara_id = $2;`, [m3, puutavaraId]);
        }
        if (newLoad.puulaaniId) {
            await recalculatePuulaaniTotals(client, newLoad.puulaaniId);
        }
        await client.query('COMMIT');
        return newLoad;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("!!! DATABASE ERROR while creating new load:", error);
        throw new Error("Database query for creating a new load failed.");
    } finally {
        client.release();
    }
};

// 12. Update Load
export const updateLoad = async (id: number, data: UpdateLoadDto, user: UserPayload): Promise<ILoad> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 12.1 Lock the target row and get its current state.
        const { rows, rowCount } = await client.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1 FOR UPDATE', [id]);
        if (rowCount === 0) {
            throw new Error(`Load with ID ${id} not found.`);
        }
        const existingLoad = rows[0];
        const isDriver = user.roles.includes('Kuljettaja');

        // 12.2 AUTHORIZATION & STATUS CHECKS

        if (isDriver) {
            console.log(`[SERVICE DEBUG] Driver Authorization Check:`, {
                loadId: id,
                existingKuljId: existingLoad.kuljId,
                userDriverId: user.driverNumericId,
                status: existingLoad.status
            });

            // 12.2.1 Driver Check 1: Must own the load
            if (existingLoad.kuljId !== user.driverNumericId) {
                console.warn(`[SERVICE DEBUG] Driver ${user.driverNumericId} blocked: Not owner of load ${id}.`);
                throw new Error('You are not authorized to edit this load.');
            }

            // 12.2.2 Driver Check 2: Cannot edit if Completed
            if (existingLoad.status === 'Completed') {
                throw new Error('Cannot edit a completed load.');
            }

            // 12.2.3 Driver Check 3: Can only edit 'Assigned' loads
            if (existingLoad.status !== 'Assigned') {
                throw new Error('This load is already in progress and cannot be edited.');
            }

        } else {
            console.log(`[SERVICE DEBUG] Office User Authorization Check:`, {
                loadId: id,
                status: existingLoad.status,
                laskutukseen: existingLoad.laskutukseen
            });
            // 12.2.4 Office User Check: Cannot edit if already invoiced (laskutukseen = 1)
            if (existingLoad.status === 'Completed' && existingLoad.laskutukseen === 1) {
                console.warn(`[SERVICE DEBUG] Office user blocked: Load ${id} is already invoiced.`);
                throw new Error('Cannot edit a load that has already been accepted for invoicing.');
            }
        }

        // 12.3 SCENARIO 1: CONSIGNMENT UPDATE (tyyppi = 1)
        if (existingLoad.tyyppi === 1) {
            console.log(`[updateLoad] Updating Consignment ID: ${id}`);

            // 12.3.1 Update Parent Load (Kuorma)
            const updateKuormaQuery = `
                UPDATE public.kuorma 
                SET pvm = $1, lisatiedot = $2, m3 = $3, km = $4, kpl = $5, tunnit = $6,  asiakas_id = $7
                WHERE kuorma_id = $8
                RETURNING *;
            `;
            const kuormaParams = [
                data.pvm,
                data.lisatiedot,
                Number(data.m3) || 0,
                Number(data.km) || 0,
                Number(data.kpl) || 0,
                Number(data.tunnit) || 0,
                data.asiakasId || null,
                id
            ];
            const kuormaResult = await client.query(updateKuormaQuery, kuormaParams);
            const updatedLoad = kuormaResult.rows[0];

            // 12.3.2 Update Waybills (Rahtikirja)
            // Strategy: Delete All existing for this load and Insert New ones from payload
            if (data.rahtikirjat && Array.isArray(data.rahtikirjat)) {
                await client.query('DELETE FROM public.rahtikirja WHERE kuorma_id = $1', [id]);

                for (const wb of data.rahtikirjat) {
                    const insertWbQuery = `
                        INSERT INTO public.rahtikirja (
                            kuorma_id, pvm, asiakas_id, rahtikirjan_nro, reitti, 
                            m3, km, kpl, jako, tievero, lisatiedot
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
                    `;
                    const wbParams = [
                        id,
                        data.pvm,
                        wb.asiakasId || null,
                        wb.rahtikirjanNumero || '',
                        wb.reitti || '',
                        Number(wb.m3) || 0,
                        Number(wb.km) || 0,
                        Number(wb.kpl) || 0,
                        Number(wb.jako) || 0,
                        Number(wb.tievero) || 0,
                        wb.lisatiedot || ''
                    ];
                    await client.query(insertWbQuery, wbParams);
                }
            }

            await client.query('COMMIT');
            return updatedLoad as ILoad;
        }

        // 12.4 SCENARIO 2: TIMBER LOAD UPDATE (tyyppi = 0)
        else {
            // 12.4.1 Calculate volume change (m3 delta)
            const oldM3 = Number(existingLoad.m3) || 0;
            const newM3 = data.m3 !== undefined ? Number(data.m3) : oldM3;
            const m3Delta = newM3 - oldM3;

            // 12.4.2 Update timber entry if volume changed
            if (existingLoad.puutavaraId && m3Delta !== 0) {
                const updateTimberEntryQuery = `
                    UPDATE public.puutavaralaji
                    SET haettu = haettu + $1, jaljella = jaljella - $1
                    WHERE puutavara_id = $2;
                `;
                await client.query(updateTimberEntryQuery, [m3Delta, existingLoad.puutavaraId]);
            }

            // 12.4.3 Construct update query
            let fieldsToUpdate: Partial<any>;

            if (isDriver) {
                fieldsToUpdate = {
                    vastaanotto_nro: data.vastaanottoNro,
                    m3: data.m3,
                    km: data.km,
                    reitti: data.reitti,
                    lisatiedot: data.lisatiedot
                };
            } else {
                // 12.4.4 Office users fields
                fieldsToUpdate = {
                    tyyppi: data.tyyppi,
                    asiakas_id: data.asiakasId,
                    puulaani_id: data.puulaaniId,
                    puutavara_id: data.puutavaraId,
                    kalusto_nro: data.kalustoNro,
                    kulj_id: data.kuljId,
                    pvm: data.pvm,
                    ajomaarays_nro: data.ajomaaraysNro,
                    vastaanotto_nro: data.vastaanottoNro,
                    kohde: data.kohde,
                    lahto: data.lahto,
                    reitti: data.reitti,
                    m3: data.m3,
                    km: data.km,
                    tunnit: data.tunnit,
                    kpl: data.kpl,
                    lisatiedot: data.lisatiedot
                };
            }

            // 12.4.5 Update the load
            const updates: { [key: string]: any } = {};
            for (const [key, value] of Object.entries(fieldsToUpdate)) {
                if (value !== undefined) {
                    updates[key] = value;
                }
            }
            //
            let updatedLoadRow;
            if (Object.keys(updates).length > 0) {
                const setClauses = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
                const params = [...Object.values(updates), id];
                const updateQuery = `UPDATE public.kuorma SET ${setClauses} WHERE kuorma_id = $${params.length} RETURNING *;`;

                const result = await client.query(updateQuery, params);
                updatedLoadRow = result.rows[0];
            } else {
                updatedLoadRow = existingLoad;
            }

            // 12.4.6 Recalculate totals
            if (updatedLoadRow.puulaaniId) {
                await recalculatePuulaaniTotals(client, updatedLoadRow.puulaaniId);
            }

            await client.query('COMMIT');
            return updatedLoadRow as ILoad;
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error in updateLoad transaction for ID ${id}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

// 13. Delete Load
export const deleteLoad = async (id: number, user: UserPayload): Promise<{ kuormaId: number; message: string } | null> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 13.1 Get the full load details to perform checks and get necessary IDs.
        const loadResult = await client.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1 FOR UPDATE', [id]);
        if (loadResult.rowCount === 0) {
            return null;
        }
        const existingLoad = loadResult.rows[0];

        // 13.2 Authorization Checks
        const isDriver = user.roles.includes('Kuljettaja');
        if (isDriver) {
            if (existingLoad.kuljId !== user.driverNumericId) {
                throw new Error('Forbidden: You are not authorized to delete this load.');
            }
            if (existingLoad.status === 'Completed') {
                throw new Error('Cannot delete a completed load.');
            }
        }

        // 13.3 Revert the 'haettu' (hauled) value in the corresponding timber log.
        const m3ToRevert = Number(existingLoad.m3) || 0;
        if (existingLoad.puutavaraId && m3ToRevert > 0) {
            console.log(`Reverting ${m3ToRevert} m³ from timber entry ID: ${existingLoad.puutavaraId}...`);
            const updateTimberEntryQuery = `
                UPDATE public.puutavaralaji
                SET 
                    haettu = haettu - $1, 
                    jaljella = jaljella + $1
                WHERE puutavara_id = $2;
            `;
            await client.query(updateTimberEntryQuery, [m3ToRevert, existingLoad.puutavaraId]);
        }

        // 13.4 Soft-delete the load itself.
        const softDeleteQuery = 'UPDATE public.kuorma SET is_active = FALSE WHERE kuorma_id = $1 RETURNING kuorma_id;';
        const result = await client.query(softDeleteQuery, [id]);

        // 13.5 Recalculate the grand totals for the parent puulaani.
        if (existingLoad.puulaaniId) {
            await recalculatePuulaaniTotals(client, existingLoad.puulaaniId);
        }

        await client.query('COMMIT');

        console.log(`Successfully soft-deleted load with ID: ${id} and updated totals.`);
        return {
            kuormaId: result.rows[0].kuormaId,
            message: 'Load marked as inactive and totals updated successfully'
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error during soft delete for load ID ${id}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

// 14. Update Load Status
export const updateLoadStatus = async (id: number, status: string, driverId: number): Promise<ILoad> => {
    const updateQuery = `UPDATE public.kuorma SET status = $1 WHERE kuorma_id = $2 AND kulj_id = $3 RETURNING *;`;
    try {
        const result = await pool.query(updateQuery, [status, id, driverId]);
        if (result.rowCount === 0) {
            throw new Error('Load not found or you are not authorized to update it.');
        }
        const updatedLoad = result.rows[0];

        socketService.emit('loadStatusUpdated', updatedLoad);

        return updatedLoad;
    } catch (error) {
        console.error(`Error during status update for load ID ${id}:`, error);
        throw error;
    }
};

// 15. Get My Loads for List
export const getMyLoadsForList = async (driverId: number): Promise<ILoadListItem[]> => {
    const queryText = `
        SELECT
            k.ajomaarays_nro,
            MIN(k.kuorma_id) AS kuorma_id,
            SUM(k.m3) AS m3,
            STRING_AGG(DISTINCT COALESCE(p.nimi, k.lahto, 'N/A'), ' -> ') AS lahto,
            STRING_AGG(DISTINCT COALESCE(pp.purkupaikka, k.kohde, 'N/A'), ' -> ') AS kohde,
            (array_agg(a.asiakkaan_nimi ORDER BY k.kuorma_id ASC))[1] AS asiakkaan_nimi,
            (array_agg(k.status ORDER BY k.kuorma_id ASC))[1] AS status,
            (array_agg(kal.rek_nro ORDER BY k.kuorma_id ASC))[1] AS rek_nro,
            (array_agg(k.pvm ORDER BY k.kuorma_id ASC))[1] AS pvm,
            (array_agg(p.sijainti_lat ORDER BY k.kuorma_id ASC))[1] as origin_lat,
            (array_agg(p.sijainti_long ORDER BY k.kuorma_id ASC))[1] as origin_lng
            
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE 
            k.is_active = TRUE 
            AND k.kulj_id = $1
            AND k.status NOT IN ('Completed', 'Cancelled')
        GROUP BY 
            k.ajomaarays_nro
        ORDER BY 
            pvm ASC, k.kuorma_id ASC;
    `;
    try {
        const result = await pool.query(queryText, [driverId]);

        const processedRows = result.rows.map(row => {
            const finalRow = { ...row };
            if (!finalRow.ajomaaraysNro) {
                finalRow.ajomaaraysNro = `Trip #${finalRow.kuormaId}`;
            }
            return finalRow;
        });


        return processedRows as ILoadListItem[];

    } catch (error) {
        console.error(`[Service Error] Failed to fetch active trips for driver ID ${driverId}. Query failed.`, error);
        throw new Error("Database query for fetching driver's active trips failed.");
    }
};



// 16. Complete Load
export const completeLoad = async (loadId: number, driverId: number, data: CompleteLoadDto): Promise<ILoad> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 16.1 Fetch the load and ensure it's valid for completion
        const loadResult = await client.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1 FOR UPDATE', [loadId]);
        if (loadResult.rowCount === 0) {
            throw new Error('Load not found.');
        }
        const load = loadResult.rows[0];
        if (load.kuljId !== driverId) {
            throw new Error('You are not authorized to complete this load.');
        }
        if (load.status !== 'At Destination') {
            throw new Error(`Load cannot be completed from its current status: ${load.status}`);
        }

        // 16.2 Update the kuorma table with actuals and set status to 'Completed'
        const updateLoadQuery = `
            UPDATE public.kuorma 
            SET 
                status = 'Completed',
                actual_m3 = $1,
                actual_km = $2,
                completion_timestamp = NOW()
            WHERE kuorma_id = $3
            RETURNING *;
        `;
        const updatedLoadResult = await client.query(updateLoadQuery, [data.actualM3, data.actualKm, loadId]);

        // 16.3 Update the puutavaralaji table
        if (load.puutavaraId) {
            const updateTaskQuery = `
                UPDATE public.puutavaralaji
                SET 
                    haettu = haettu + $1,
                    jaljella = jaljella - $1
                WHERE puutavara_id = $2;
            `;
            await client.query(updateTaskQuery, [data.actualM3, load.puutavaraId]);
        }

        // 16.4 Update the parent puulaani's remaining volume
        if (load.puulaaniId) {
            const updatePuulaaniQuery = `
                UPDATE public.puulaani
                SET
                    jaljella = jaljella - $1
                WHERE puulaani_id = $2;
            `;
            await recalculatePuulaaniTotals(client, load.puulaaniId);
            await client.query(updatePuulaaniQuery, [data.actualM3, load.puulaaniId]);
        }

        await client.query('COMMIT');
        console.log(`--- Load ${loadId} completed and ALL related tables updated ---`);
        return updatedLoadResult.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error completing load ${loadId}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

// 17. Get Loads for Inspection
export const getLoadsForInspection = async (): Promise<ILoadListItem[]> => {
    console.log('--- Fetching loads for inspection ---');

    const queryText = `
        SELECT
            k.kuorma_id,
            k.pvm,
            k.ajomaarays_nro,
            k.vastaanotto_nro,
            kal.rek_nro,
            kul.nimi AS kuljettajan_nimi,
            COALESCE(p.nimi, k.lahto, 'N/A') AS lahto,
            COALESCE(pp.purkupaikka, k.kohde, 'N/A') AS kohde,
            a.asiakkaan_nimi,
            pt.puutavara AS timber_type,
            k.reitti,
            CASE WHEN k.tyyppi = 1 
                 THEN COALESCE((SELECT SUM(m3) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id), 0) 
                 ELSE k.m3 
            END as m3,
            CASE WHEN k.tyyppi = 1 
                 THEN COALESCE((SELECT SUM(km) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id), 0) 
                 ELSE k.km 
            END as km,
            k.tunnit,
            CASE WHEN k.tyyppi = 1 
                 THEN COALESCE((SELECT SUM(kpl) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id), 0) 
                 ELSE k.kpl 
            END as kpl,
            k.lisatiedot,
            k.status,
            k.is_active,
            k.puutavara_id,
            k.tyyppi,
            (SELECT COUNT(*) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id) as waybill_count
        FROM
            public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE 
            k.status = 'Completed' AND
            k.laskutukseen = 0 AND
            k.is_active = TRUE
        ORDER BY
            k.pvm ASC, k.kuorma_id ASC;
    `;

    try {
        const result = await pool.query(queryText);
        return result.rows;
    } catch (error) {
        console.error("Error fetching loads for inspection:", error);
        throw new Error("Database query for fetching inspection loads failed.");
    }
};

// 18. Accept Loads for Invoicing
export const acceptLoadsForInvoicing = async (loadIds: number[]) => {
    const query = `UPDATE public.kuorma SET laskutukseen = 1 WHERE kuorma_id = ANY($1) RETURNING kuorma_id;`;
    const result = await pool.query(query, [loadIds]);
    return { count: result.rowCount, ids: result.rows.map(r => r.kuormaId) };
};

// 19. Get My Completed Loads for List
export const getMyCompletedLoadsForList = async (driverId: number) => {
    const query = `
        SELECT k.kuorma_id, k.pvm, a.asiakkaan_nimi, k.tyyppi, 
               CASE WHEN k.tyyppi = 1 
                    THEN COALESCE((SELECT SUM(m3) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id), 0) 
                    ELSE k.m3 
               END as m3,
               COALESCE(p.nimi, k.lahto) AS lahto, COALESCE(pp.purkupaikka, k.kohde) AS kohde,
               (SELECT COUNT(*) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id) as waybill_count
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE k.kulj_id = $1 AND k.status = 'Completed' AND k.is_active = TRUE
        ORDER BY k.pvm DESC;
    `;
    const result = await pool.query(query, [driverId]);
    return result.rows;
};

// 20. Get My Last Completed Load
export const getMyLastCompletedLoad = async (driverId: number) => {
    const query = `SELECT * FROM public.kuorma WHERE kulj_id = $1 AND status = 'Completed' ORDER BY completion_timestamp DESC LIMIT 1;`;
    const result = await pool.query(query, [driverId]);
    return result.rows.length > 0 ? result.rows[0] : null;
};

// 21. Get Active Trips for Map
export const getActiveTripsForMap = async () => {
    const query = `
        SELECT k.kuorma_id, k.status, k.pvm, a.asiakkaan_nimi,
               p.sijainti_lat AS origin_lat, p.sijainti_long AS origin_lng,
               pp.sijainti_lat AS dest_lat, pp.sijainti_long AS dest_lng
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE k.status != 'Completed' AND k.is_active = TRUE;
    `;
    const result = await pool.query(query);
    return result.rows;
};

// 22. Update Trip by Load ID
export const updateTripByLoadId = async (initialLoadId: number, data: any, driverId: number) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const updateQuery = `UPDATE public.kuorma SET status = $1 WHERE (kuorma_id = $2 OR ajomaarays_nro = (SELECT ajomaarays_nro FROM public.kuorma WHERE kuorma_id = $2)) AND kulj_id = $3 RETURNING *;`;
        const result = await client.query(updateQuery, [data.status, initialLoadId, driverId]);
        await client.query('COMMIT');
        return result.rows;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

// 23. Create Bulk Load
export const createBulkLoad = async (dto: CreateBulkLoadDto, user: UserPayload) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const results = [];
        for (const leg of dto.legs) {
            const res = await createLoad(leg as any);
            results.push(res);
        }
        await client.query('COMMIT');
        return results;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

// 24. Update Trip Status
export const updateTripStatus = async (ajomaaraysNro: string, status: string, driverId: number) => {
    const query = `UPDATE public.kuorma SET status = $1 WHERE ajomaarays_nro = $2 AND kulj_id = $3 RETURNING *;`;
    const result = await pool.query(query, [status, ajomaaraysNro, driverId]);
    return { count: result.rowCount, rows: result.rows };
};