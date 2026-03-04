// src/services/consignmentDriverService.ts
import { PoolClient } from 'pg';
import pool from '../config/db';
import { executeTransaction } from '../utils/dbUtils';

// --- CONSIGNMENT DRIVER SERVICE ---
//1. Get Consignments for Driver
export const getConsignmentsForDriver = async (driverId: number, vehicleId: number) => {
    const query = `
        SELECT
            k.kuorma_id as "kuormaId", 
            k.pvm, 
            kal.rek_nro as "autoNro", 
            k.status,
            -- Count number of waybills
            (SELECT COUNT(*) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id) as "waybillCount",
            -- Total M3 form the parent record (calculated by frontend)
            k.m3 as "totalM3" 
        FROM public.kuorma k
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        WHERE 
            k.kulj_id = $1 
            AND k.tyyppi = 1 
            AND k.is_active = TRUE
            AND k.status = 'Draft' -- CHANGE: Only show Drafts to the driver
        ORDER BY k.pvm DESC, k.kuorma_id DESC;
    `;
    const result = await pool.query(query, [driverId]);
    return result.rows;
};

//2. Get Consignment by ID
export const getConsignmentById = async (id: number, driverId: number): Promise<any | null> => {
    const kuormaQuery = `
        SELECT k.*, k.kuorma_id as "kuormaId", k.asiakas_id as "asiakasId" 
        FROM public.kuorma k 
        WHERE k.kuorma_id = $1::bigint AND k.kulj_id = $2 AND k.tyyppi = 1;
    `;

    const rahtikirjatQuery = `
        SELECT 
            r.rahti_id as "rahtiId",
            r.asiakas_id as "asiakasId",
            a.asiakkaan_nimi as "customerName",
            r.rahtikirjan_nro as "rahtikirjanNro",
            r.reitti,
            r.m3, r.km, r.kpl, r.jako, r.tievero, r.lisatiedot
        FROM public.rahtikirja r 
        LEFT JOIN public.asiakkaat a ON r.asiakas_id = a.asiakkaan_id
        WHERE r.kuorma_id = $1::bigint 
        ORDER BY r.rahti_id ASC;
    `;

    try {
        const kuormaResult = await pool.query(kuormaQuery, [id, driverId]);

        if (!kuormaResult || kuormaResult.rowCount === 0) {
            return null;
        }

        const rahtikirjatResult = await pool.query(rahtikirjatQuery, [id]);

        const kuorma = kuormaResult.rows[0];
        kuorma.rahtikirjat = rahtikirjatResult.rows || [];

        return kuorma;

    } catch (error) {
        console.error(`Error in getConsignmentById:`, error);
        throw error;
    }
};

//3. Create Consignment
export const createConsignment = async (dto: any, driverId: number, vehicleId: number) => {
    return executeTransaction(async (client: PoolClient) => {
        const status = dto.status || 'Draft';
        const kuormaInsertQuery = `
            INSERT INTO public.kuorma (
                tyyppi, pvm, kulj_id, kalusto_nro, asiakas_id, 
                m3, km, kpl, tunnit, lisatiedot, status, is_active
            )
            VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE) 
            RETURNING kuorma_id;
        `;

        const kuormaParams = [
            dto.pvm,
            driverId,
            vehicleId,
            dto.asiakasId || null,
            Number(dto.m3) || 0,
            Number(dto.km) || 0,
            Number(dto.kpl) || 0,
            Number(dto.tunnit) || 0,
            dto.lisatiedot || '',
            status // 'Draft' or 'Assigned'
        ];

        const kuormaResult = await client.query(kuormaInsertQuery, kuormaParams);
        const newKuormaId = kuormaResult.rows[0].kuormaId;

        if (dto.rahtikirjat && dto.rahtikirjat.length > 0) {
            for (const r of dto.rahtikirjat) {
                const rahtikirjaInsertQuery = `
                    INSERT INTO public.rahtikirja (
                        kuorma_id, pvm, asiakas_id, rahtikirjan_nro, reitti, 
                        m3, km, kpl, jako, tievero, lisatiedot
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
                `;
                const params = [
                    newKuormaId,
                    dto.pvm,
                    r.asiakasId || null,
                    r.rahtikirjanNumero || '',
                    r.reitti || '',
                    Number(r.m3) || 0, Number(r.km) || 0, Number(r.kpl) || 0,
                    Number(r.jako) || 0, Number(r.tievero) || 0, r.lisatiedot || ''
                ];
                await client.query(rahtikirjaInsertQuery, params);
            }
        }
        return { kuormaId: newKuormaId };
    });
};

//4. Update Consignment
export const updateConsignment = async (id: number, dto: any, driverId: number) => {
    return executeTransaction(async (client: PoolClient) => {
        const ownerCheck = await client.query('SELECT kulj_id FROM public.kuorma WHERE kuorma_id = $1', [id]);
        if (ownerCheck.rowCount === 0 || ownerCheck.rows[0].kuljId !== driverId) { throw new Error('Forbidden'); }

        if (!dto.rahtikirjat || dto.rahtikirjat.length === 0) {
            await client.query('DELETE FROM public.rahtikirja WHERE kuorma_id = $1', [id]);
            await client.query('DELETE FROM public.kuorma WHERE kuorma_id = $1', [id]);

            return { kuormaId: id, status: 'DELETED' };
        }

        const status = dto.status || 'Draft';
        const kuormaUpdateQuery = `
            UPDATE public.kuorma 
            SET pvm = $1, asiakas_id = $2, m3 = $3, km = $4, kpl = $5, tunnit = $6, lisatiedot = $7, status = $8
            WHERE kuorma_id = $9;
        `;
        const kuormaParams = [
            dto.pvm, dto.asiakasId || null, Number(dto.m3) || 0, Number(dto.km) || 0,
            Number(dto.kpl) || 0, Number(dto.tunnit) || 0, dto.lisatiedot || '', status, id
        ];
        await client.query(kuormaUpdateQuery, kuormaParams);
        await client.query('DELETE FROM public.rahtikirja WHERE kuorma_id = $1', [id]);

        if (dto.rahtikirjat && dto.rahtikirjat.length > 0) {
            for (const r of dto.rahtikirjat) {
                const rahtikirjaInsertQuery = `
                    INSERT INTO public.rahtikirja (
                        kuorma_id, pvm, asiakas_id, rahtikirjan_nro, reitti, 
                        m3, km, kpl, jako, tievero, lisatiedot
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
                `;
                const params = [
                    id, dto.pvm, r.asiakasId || null, r.rahtikirjanNumero || '',
                    r.reitti || '', Number(r.m3) || 0, Number(r.km) || 0, Number(r.kpl) || 0,
                    Number(r.jako) || 0, Number(r.tievero) || 0, r.lisatiedot || ''
                ];
                await client.query(rahtikirjaInsertQuery, params);
            }
        }
        return { kuormaId: id };
    });
};