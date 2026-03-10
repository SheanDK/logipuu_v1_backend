// backend/src/services/consignmentService.ts
import pool from '../config/db';

/* -----------------------------------------------------------------------------
 * Interfaces
 * ---------------------------------------------------------------------------*/

//1. Search Filters
export interface SearchFilters {
    dateFrom: string;
    dateTo: string;
    customerId: number | null;
    vehicleId: number | null;
    unbilled: boolean;
    billed: boolean;
}

//2. Create Consignment
export interface CreateConsignmentDto {
    kuormaId: number;
    pvm: string | null;
    rahtikirjanNro: string | null;
    reitti: string | null;
    lisatiedot: string | null;
    m3: number;
    m3_hinta: number;
    km: number;
    km_hinta: number;
    kpl: number;
    kpl_hinta: number;
    jako: number;
    jako_hinta: number;
    tievero: number;
    koko_hinta: number;
}

//3. Update Consignment
export interface UpdateConsignmentDto {
    pvm?: string;
    rahtikirjanNro?: string;
    reitti?: string;
    lisatiedot?: string;
    m3?: number;
    m3_hinta?: number;
    km?: number;
    km_hinta?: number;
    kpl?: number;
    kpl_hinta?: number;
    jako?: number;
    jako_hinta?: number;
    tievero?: number;
    koko_hinta?: number;
}

/* -----------------------------------------------------------------------------
 * Service Functions
 * ---------------------------------------------------------------------------*/

//1. Search Consignments
export const searchConsignments = async (filters: SearchFilters) => {
    const params: any[] = [];
    const where: string[] = [];
    let paramIndex = 1;

    where.push(`kk.tyyppi = 1`);

    if (filters.dateFrom) {
        where.push(`kk.pvm >= $${paramIndex++}`);
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        where.push(`kk.pvm <= $${paramIndex++}`);
        params.push(filters.dateTo);
    }
    if (filters.customerId) {
        where.push(`kk.asiakas_id = $${paramIndex++}`);
        params.push(filters.customerId);
    }
    if (filters.vehicleId) {
        where.push(`kk.kalusto_nro = $${paramIndex++}`);
        params.push(filters.vehicleId);
    }

    if (filters.unbilled && !filters.billed) {
        where.push(`(kk.laskutukseen = 0 OR kk.laskutukseen = 1)`);
        where.push(`kk.pvm_laskutus IS NULL`);
    } else if (!filters.unbilled && filters.billed) {
        where.push(`kk.laskutukseen = 3`);
        where.push(`kk.pvm_laskutus IS NOT NULL`);
    } else if (!filters.unbilled && !filters.billed) {
        where.push(`1=0`);
    }

    const query = `
        SELECT
            rk.rahti_id,
            rk.kuorma_id,
            rk.pvm,
            rk.reitti,
            rk.lisatiedot,
            rk.rahtikirjan_nro,

            rk.m3,           rk.m3_hinta,
            rk.km,           rk.km_hinta,
            rk.kpl,          rk.kpl_hinta,
            rk.jako,         rk.jako_hinta,
            rk.tievero,
            rk.koko_hinta      AS kokohinta,

            ask.asiakkaan_nimi AS asiakas,
            kl.rek_nro         AS auto_nro,
            ku.nimi            AS knimi,
            ptt.puutavara      AS puutavara,

            kk.pvm_laskutus,
            kk.laskutukseen
        FROM public.rahtikirja rk
        INNER JOIN public.kuorma kk      ON rk.kuorma_id    = kk.kuorma_id
        LEFT  JOIN public.asiakkaat ask  ON kk.asiakas_id   = ask.asiakkaan_id
        LEFT  JOIN public.kuljettajat ku ON kk.kulj_id      = ku.kulj_id
        LEFT  JOIN public.kalusto kl     ON kk.kalusto_nro  = kl.kalusto_nro
        LEFT  JOIN public.puutavaralaji pt ON kk.puutavara_id = pt.puutavara_id
        LEFT  JOIN public.puutavarat ptt ON pt.puutavara_nro = ptt.puutavara_nro
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY kk.pvm DESC, rk.pvm DESC, rk.rahti_id DESC
        LIMIT 10000;
    `;

    const result = await pool.query(query, params);
    return result.rows;
};

//2. Get Consignment by ID
export const getConsignmentById = async (id: number) => {
    const query = `
        SELECT
            rk.rahti_id,
            rk.kuorma_id,
            rk.pvm,
            rk.reitti,
            rk.lisatiedot,
            rk.rahtikirjan_nro,

            rk.m3,           rk.m3_hinta,
            rk.km,           rk.km_hinta,
            rk.kpl,          rk.kpl_hinta,
            rk.jako,         rk.jako_hinta,
            rk.tievero,
            rk.koko_hinta      AS kokohinta,

            ask.asiakkaan_nimi AS asiakas,
            kl.rek_nro         AS auto_nro,
            ku.nimi            AS knimi,
            ptt.puutavara      AS puutavara,

            kk.pvm_laskutus,
            kk.laskutukseen
        FROM public.rahtikirja rk
        INNER JOIN public.kuorma kk      ON rk.kuorma_id    = kk.kuorma_id
        LEFT  JOIN public.asiakkaat ask  ON kk.asiakas_id   = ask.asiakkaan_id
        LEFT  JOIN public.kuljettajat ku ON kk.kulj_id      = ku.kulj_id
        LEFT  JOIN public.kalusto kl     ON kk.kalusto_nro  = kl.kalusto_nro
        LEFT  JOIN public.puutavaralaji pt ON kk.puutavara_id = pt.puutavara_id
        LEFT  JOIN public.puutavarat ptt ON pt.puutavara_nro = ptt.puutavara_nro
        WHERE rk.rahti_id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
};

//3. Create Consignment
export const createConsignment = async (dto: CreateConsignmentDto) => {
    const query = `
        INSERT INTO public.rahtikirja (
            kuorma_id, pvm, rahtikirjan_nro, reitti, lisatiedot,
            m3, m3_hinta, km, km_hinta, kpl, kpl_hinta, jako, jako_hinta, 
            tievero, koko_hinta
        ) VALUES (
            $1, $2, $3, $4, $5, 
            $6, $7, $8, $9, $10, $11, $12, $13, 
            $14, $15
        ) RETURNING *;
    `;

    const params = [
        dto.kuormaId,
        dto.pvm,
        dto.rahtikirjanNro,
        dto.reitti,
        dto.lisatiedot,
        dto.m3 || 0, dto.m3_hinta || 0,
        dto.km || 0, dto.km_hinta || 0,
        dto.kpl || 0, dto.kpl_hinta || 0,
        dto.jako || 0, dto.jako_hinta || 0,
        dto.tievero || 0, dto.koko_hinta || 0
    ];

    const result = await pool.query(query, params);
    return result.rows[0];
};

//4. Update Consignment
export const updateConsignment = async (id: number, dto: UpdateConsignmentDto) => {
    const fields: string[] = [];
    const params: any[] = [id];
    let idx = 2;

    const addField = (col: string, val: any) => {
        if (val !== undefined) {
            fields.push(`${col} = $${idx++}`);
            params.push(val);
        }
    };

    addField('pvm', dto.pvm);
    addField('rahtikirjan_nro', dto.rahtikirjanNro);
    addField('reitti', dto.reitti);
    addField('lisatiedot', dto.lisatiedot);
    addField('m3', dto.m3);
    addField('km', dto.km);
    addField('kpl', dto.kpl);
    addField('jako', dto.jako);
    addField('m3_hinta', dto.m3_hinta);
    addField('km_hinta', dto.km_hinta);
    addField('kpl_hinta', dto.kpl_hinta);
    addField('jako_hinta', dto.jako_hinta);
    addField('tievero', dto.tievero);
    addField('koko_hinta', dto.koko_hinta);

    if (fields.length === 0) return null;

    const query = `UPDATE public.rahtikirja SET ${fields.join(', ')} WHERE rahti_id = $1 RETURNING *`;

    try {
        const result = await pool.query(query, params);
        return result.rows[0] || null;
    } catch (error) {
        console.error("DB Update Error:", error);
        throw error;
    }
};

//5. Check Consignment Status
export const checkConsignmentStatus = async (id: number): Promise<'billed' | 'notfound' | 'ok'> => {
    const result = await pool.query('SELECT pvm_laskutus FROM public.rahtikirja WHERE rahti_id = $1', [id]);
    if (result.rowCount === 0) return 'notfound';
    if (result.rows[0].pvmLaskutus) return 'billed';
    return 'ok';
};

//6. Delete Consignment
export const deleteConsignment = async (id: number) => {
    const result = await pool.query('DELETE FROM public.rahtikirja WHERE rahti_id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
};

//7. Invoice Kuormat
export const invoiceKuormat = async (kuormaIds: number[]) => {
    if (kuormaIds.length === 0) {
        return { updated: 0, updatedKuormaIds: [], alreadyBilled: 0, alreadyIds: [], notFound: 0, notFoundIds: [] };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const updateQuery = `
            UPDATE public.kuorma 
            SET pvm_laskutus = CURRENT_DATE, laskutukseen = 3
            WHERE kuorma_id = ANY($1) AND pvm_laskutus IS NULL
            RETURNING kuorma_id;
        `;
        const updateResult = await client.query(updateQuery, [kuormaIds]);
        const updatedIds = updateResult.rows.map(r => r.kuormaId);

        const excludeIds = updatedIds.length > 0 ? updatedIds : [-1];
        const alreadyBilledQuery = `
            SELECT DISTINCT kuorma_id FROM public.kuorma 
            WHERE kuorma_id = ANY($1) AND pvm_laskutus IS NOT NULL AND kuorma_id != ALL($2)
        `;
        const alreadyResult = await client.query(alreadyBilledQuery, [kuormaIds, excludeIds]);
        const alreadyIds = alreadyResult.rows.map(r => r.kuormaId);

        const foundSet = new Set([...updatedIds, ...alreadyIds]);
        const notFoundIds = kuormaIds.filter(id => !foundSet.has(id));

        await client.query('COMMIT');

        return {
            updated: updatedIds.length,
            updatedKuormaIds: [...new Set(updatedIds)],
            alreadyBilled: alreadyIds.length,
            alreadyIds: alreadyIds,
            notFound: notFoundIds.length,
            notFoundIds: notFoundIds,
            billedDate: new Date().toISOString().split('T')[0]
        };

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};