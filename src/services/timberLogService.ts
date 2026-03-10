// backend/src/services/timberLogService.ts
import pool from '../config/db';

// Fetches timber log entries for a specific timber stack (Puulaani)
// that still have remaining volume to be loaded.
// @param puulaaniId The ID of the timber stack.
// @returns A promise that resolves to an array of available timber log entries.
export const getTimberLogsForStack = async (puulaaniId: number) => {
    console.log(`--- Fetching available timber logs for puulaani ID: ${puulaaniId} ---`);
    const query = `
        SELECT
            ptl.puutavara_id,
            ptl.puulaani_id,
            ptl.puutavara_nro,
            pt.puutavara AS timber_type_name,
            ptl.purkupaikka_id,
            pp.purkupaikka AS unloading_site_name,
            ptl.jaljella AS remaining_volume
        FROM public.puutavaralaji ptl
        LEFT JOIN public.puutavarat pt ON ptl.puutavara_nro = pt.puutavara_nro
        LEFT JOIN public.purkupaikka pp ON ptl.purkupaikka_id = pp.purkupaikka_id
        WHERE ptl.puulaani_id = $1 
          AND ptl.jaljella > 0
        ORDER BY pt.puutavara;
    `;
    try {
        const result = await pool.query(query, [puulaaniId]);
        return result.rows;
    } catch (error) {
        console.error(`Database query failed in getTimberLogsForStack for puulaani ${puulaaniId}:`, error);
        throw error;
    }
};