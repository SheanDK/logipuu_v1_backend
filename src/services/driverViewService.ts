// backend/src/services/driverViewService.ts
import pool from '../config/db';
import camelcaseKeys from 'camelcase-keys';

// ... (Interfaces: MapLocation, DriverMapData - no change)
interface MapLocation {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
}
export interface DriverMapData {
    puulaanit: MapLocation[];
    purkupaikat: MapLocation[];
}


// --- THIS IS THE MAIN CHANGE ---
// The function now accepts vehicleId as a required parameter
export const getMapDataForDriver = async (driverId: number, vehicleId: number): Promise<DriverMapData> => {
    
    const client = await pool.connect();
    try {
        console.log(`[Service] Executing getMapDataForDriver for vehicleId: ${vehicleId}`); // Add a log
        
        const [puulaanitResult, purkupaikatResult] = await Promise.all([
            
            // --- THIS IS THE SIMPLIFIED DEBUGGING QUERY ---
            // It ONLY gets puulaanit assigned to the specific vehicle, ignoring all other conditions.
            client.query(`
                SELECT 
                    p.puulaani_id AS id, 
                    p.nimi AS name, 
                    p.sijainti_lat AS latitude, 
                    p.sijainti_long AS longitude 
                FROM public.puulaani p
                JOIN public.autot a ON p.puulaani_id = a.puulaani_id
                WHERE a.kalusto_id = $1;
            `, [vehicleId]),

            // Query 2 (Purkupaikat) remains the same
            client.query(`
                SELECT 
                    purkupaikka_id AS id, 
                    purkupaikka AS name, 
                    sijainti_lat AS latitude, 
                    sijainti_long AS longitude 
                FROM public.purkupaikka 
                WHERE is_active = TRUE AND is_visible_on_map = TRUE AND sijainti_lat IS NOT NULL AND sijainti_long IS NOT NULL;
            `)
        ]);

        console.log(`[Service] For vehicle ${vehicleId}, DB returned ${puulaanitResult.rowCount} puulaanit.`);

        return {
            puulaanit: camelcaseKeys(puulaanitResult.rows),
            purkupaikat: camelcaseKeys(purkupaikatResult.rows)
        };

    } catch (error) {
        console.error(`[Service Error] Failed to get map data for driver ${driverId} and vehicle ${vehicleId}:`, error);
        throw new Error('Database query for map data failed.');
    } finally {
        client.release();
    }
};

// --- THIS IS THE NEW FUNCTION, ADDED TO THIS FILE ---
export const getSingleLoadForEdit = async (id: number): Promise<any | null> => {
    const query = `
        SELECT 
            k.kuorma_id, k.pvm, k.status, k.m3, k.km, k.reitti, k.lisatiedot,
            k.vastaanotto_nro, k.puutavara_id, k.puulaani_id, k.asiakas_id,
            k.kulj_id -- Also select kulj_id for the security check
        FROM public.kuorma k
        WHERE k.kuorma_id = $1;
    `;
    try {
        const result = await pool.query(query, [id]);
        if (result.rowCount === 0) return null;
        return camelcaseKeys(result.rows[0]);
    } catch (error) {
        console.error(`Error fetching single load for edit with ID ${id}:`, error);
        throw new Error(`DB query for fetching single load with ID ${id} failed.`);
    }
};

export const getConsignmentsForDriver = async (driverId: number): Promise<any[]> => {
    // This query selects loads where the type is '1' (Pole Transport/Consignment)
    // for the currently logged-in driver.
    const queryText = `
        SELECT 
            k.kuorma_id,
            k.pvm,
            k.ajomaarays_nro,
            k.status,
            a.asiakkaan_nimi,
            k.lahto,
            k.kohde
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        WHERE
            k.kulj_id = $1 AND
            k.tyyppi = 1 AND
            k.is_active = TRUE AND
            k.status NOT IN ('Completed', 'Cancelled')
        ORDER BY k.pvm DESC;
    `;
    try {
        const result = await pool.query(queryText, [driverId]);
        return camelcaseKeys(result.rows);
    } catch (error) {
        console.error(`[Service Error] Failed to get consignments for driver ${driverId}:`, error);
        throw new Error('Database query for consignments failed.');
    }
};

// --- THIS IS THE NEW FUNCTION ---
export const getActiveTripForDriver = async (driverId: number): Promise<any | null> => {
    try {
        const query = `
            SELECT 
                k.kuorma_id, k.status, k.puutavara_id,
                p.nimi AS puulaani_name, p.sijainti_lat AS puulaani_lat, p.sijainti_long AS puulaani_lng,
                pp.purkupaikka AS purkupaikka_name, pp.sijainti_lat AS purkupaikka_lat, pp.sijainti_long AS purkupaikka_lng,
                pt.puutavara AS puutavaralaji
            FROM public.kuorma k
            LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
            LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
            LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
            LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
            WHERE
                k.kulj_id = $1 AND
                k.status NOT IN ('Assigned', 'Completed', 'Cancelled') AND
                k.is_active = TRUE
            ORDER BY k.pvm DESC, k.kuorma_id DESC
            LIMIT 1;
        `;
        const result = await pool.query(query, [driverId]);
        if (result.rowCount === 0) {
            return null;
        }
        return camelcaseKeys(result.rows[0]);
    } catch (error) {
        console.error(`[Service Error] Failed to get active trip for driver ${driverId}:`, error);
        throw new Error('Database query for active trip failed.');
    }
};

// --- THIS IS THE NEW FUNCTION for the driver ---
export const updateTimberEntryStatus = async (puulaaniId: number, timberEntries: { puutavaraId: number, valmis: boolean }[]): Promise<void> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        for (const entry of timberEntries) {
            await client.query(
                'UPDATE public.puutavaralaji SET valmis = $1 WHERE puutavara_id = $2 AND puulaani_id = $3',
                [entry.valmis, entry.puutavaraId, puulaaniId]
            );
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[Service Error] Failed to update timber entry statuses for puulaani ${puulaaniId}:`, error);
        throw new Error('Database query for updating timber statuses failed.');
    } finally {
        client.release();
    }
};

export const getCompletedTripsForDriver = async (driverId: number): Promise<any[]> => {
    const query = `
        SELECT
            k.kuorma_id,
            k.pvm,
            a.asiakkaan_nimi,
            -- Use a CASE statement to determine the load type as a string
            CASE 
                WHEN k.tyyppi = 0 THEN 'Timber Load'
                WHEN k.tyyppi = 1 THEN 'Consignment'
                ELSE 'Unknown'
            END AS load_type,
            -- Try to get the destination name from multiple sources
            COALESCE(pp.purkupaikka, k.kohde, 'N/A') AS kohde,
            COALESCE(p.nimi, k.lahto, 'N/A') AS lahto
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE
            k.kulj_id = $1 AND
            k.status = 'Completed' AND
            k.is_active = TRUE
        ORDER BY k.pvm DESC;
    `;
    try {
        const result = await pool.query(query, [driverId]);
        return result.rows; // db wrapper will convert to camelCase
    } catch (error) {
        console.error(`[Service Error] Failed to get completed trips for driver ${driverId}:`, error);
        throw new Error('Database query for completed trips failed.');
    }
};