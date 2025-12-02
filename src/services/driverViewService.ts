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
        const [puulaanitResult, purkupaikatResult] = await Promise.all([
            
            client.query(`
                SELECT 
                    p.puulaani_id AS id, 
                    p.nimi AS name, 
                    p.sijainti_lat AS latitude, 
                    p.sijainti_long AS longitude,
                    -- FIX: Use the customer's color directly from the 'asiakkaat' table.
                    -- Provide a default color if it's null.
                    COALESCE(a.kohteen_vari, '#1976D2') AS color 
                FROM 
                    public.puulaani p
                -- Join with 'asiakkaat' to get the customer's color
                LEFT JOIN 
                    public.asiakkaat a ON p.asiakas_id = a.asiakkaan_id
                -- LEFT JOIN with 'autot' to check for assignments
                LEFT JOIN 
                    public.autot at ON p.puulaani_id = at.puulaani_id
                WHERE 
                    p.aktiivinen = TRUE 
                    AND p.valmis = FALSE
                    AND (p.sijainti_lat IS NOT NULL AND p.sijainti_long IS NOT NULL)
                    AND (p.sijainti_lat != 0 OR p.sijainti_long != 0)
                    AND (
                        -- Condition 1: Puulaani is assigned to the selected vehicle
                        at.kalusto_id = $1 
                        OR
                        -- Condition 2: Puulaani is not assigned to ANY vehicle
                        NOT EXISTS (SELECT 1 FROM public.autot a2 WHERE a2.puulaani_id = p.puulaani_id)
                    )
                -- Group by to handle cases where a puulaani might be linked to multiple customers or assignments,
                -- ensuring each puulaani appears only once.
                GROUP BY p.puulaani_id, a.kohteen_vari;

            `, [vehicleId]),

            client.query(`
                SELECT DISTINCT
                    (pp.purkupaikka_id * -1) AS id,
                    pp.purkupaikka AS name,
                    pp.sijainti_lat AS latitude,
                    pp.sijainti_long AS longitude
                FROM 
                    public.purkupaikka pp
                JOIN 
                    public.puutavaralaji pl ON pp.purkupaikka_id = pl.purkupaikka_id
                JOIN 
                    public.puulaani p ON pl.puulaani_id = p.puulaani_id
                JOIN 
                    public.autot a ON p.puulaani_id = a.puulaani_id
                WHERE 
                    a.kalusto_id = $1
                    AND pp.is_active = TRUE 
                    AND pp.is_visible_on_map = TRUE 
                    AND pp.sijainti_lat IS NOT NULL 
                    AND pp.sijainti_long IS NOT NULL
                    AND (pp.sijainti_lat != 0 OR pp.sijainti_long != 0);
            `, [vehicleId])
        ]);

        return {
            puulaanit: puulaanitResult.rows,
            purkupaikat: purkupaikatResult.rows
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

// FIX: This function is completely rewritten to support multi-leg trips.
export const getActiveTripForDriver = async (driverId: number): Promise<any | null> => {
    const client = await pool.connect();
    try {
        // Step 1: Find the 'ajomaarays_nro' of any active trip (this part is correct).
        const activeTripQuery = `
        SELECT ajomaarays_nro 
        FROM public.kuorma 
        WHERE
         kulj_id = $1 
         AND status NOT IN ('Assigned', 'Completed', 'Cancelled') 
         AND is_active = TRUE 
         ORDER BY pvm DESC, kuorma_id DESC 
         LIMIT 1;`;
        const activeTripResult = await client.query(activeTripQuery, [driverId]);

        if (activeTripResult.rowCount === 0) { return null; }
        const ajomaaraysNro = activeTripResult.rows[0].ajomaarays_nro;
        if (!ajomaaraysNro) { return null; }

        // --- THE FIX IS HERE ---
        // Step 2: Fetch all legs with robust COALESCE fallbacks for names.
        const allLegsQuery = `
            SELECT 
                k.kuorma_id, 
                k.status, 
                k.puutavara_id, 
                k.ajomaarays_nro,
                
                -- Use COALESCE to get the best available name for "From"
                COALESCE(p.nimi, k.lahto) AS puulaani_name, 
                
                -- Use COALESCE to get the best available name for "To"
                COALESCE(pp.purkupaikka, k.kohde) AS purkupaikka_name,

                p.sijainti_lat AS puulaani_lat, p.sijainti_long AS puulaani_lng,
                pp.sijainti_lat AS purkupaikka_lat, pp.sijainti_long AS purkupaikka_lng,
                pt.puutavara AS puutavaralaji,
                a.asiakkaan_nimi,
                kal.rek_nro,
                 k.m3,
                -- Also select lat/lng for the panel
                pp.sijainti_lat AS purkupaikka_lat,
                pp.sijainti_long AS purkupaikka_lng
            FROM public.kuorma k
            LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
            LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
            LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
            LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
            LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
            LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
            WHERE
                k.ajomaarays_nro = $1 AND
                k.kulj_id = $2 AND
                k.is_active = TRUE AND
                k.status NOT IN ('Completed', 'Cancelled')
            ORDER BY k.kuorma_id ASC;
        `;
        const allLegsResult = await client.query(allLegsQuery, [ajomaaraysNro, driverId]);
        
        if (allLegsResult.rowCount === 0) { return null; }

        // Step 3: Construct the final trip object (this part is correct).
        const firstLeg = allLegsResult.rows[0];
        return {
            ajomaaraysNro: ajomaaraysNro,
            asiakkaanNimi: firstLeg.asiakkaan_nimi,
            rekNro: firstLeg.rek_nro,
            legs: camelcaseKeys(allLegsResult.rows) 
        };

    } catch (error) {
        console.error(`[Service Error] Failed to get active trip for driver ${driverId}:`, error);
        throw new Error('Database query for active trip failed.');
    } finally {
        client.release();
    }
};

// --- THIS IS THE NEW FUNCTION for the driver ---
export const updateTimberEntryStatus = async (puulaaniId: number, timberEntries: { puutavaraId: number, valmis: boolean }[]): Promise<any> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Step 1: Update the 'valmis' status for each timber entry
        // The database trigger will automatically handle the recalculation.
        for (const entry of timberEntries) {
            const updateQuery = 'UPDATE public.puutavaralaji SET valmis = $1 WHERE puutavara_id = $2 AND puulaani_id = $3';
            await client.query(updateQuery, [entry.valmis, entry.puutavaraId, puulaaniId]);
        }
        
        await client.query('COMMIT');
        
        return { message: `Statuses updated for puulaani ${puulaaniId}. Totals recalculated by trigger.` };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`SERVICE ERROR: Failed to update timber entry statuses for puulaani ${puulaaniId}`, error);
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

export const getSingleCompletedTrip = async (id: number, driverId: number): Promise<any | null> => {
    // FIX: The query now includes all necessary JOINs and COALESCE logic
    // to correctly find the Origin and Destination names for both load types.
    const query = `
        SELECT
            k.kuorma_id, 
            k.pvm, 
            a.asiakkaan_nimi,
            kal.rek_nro,
            kul.nimi AS kuljettajan_nimi, 
            k.m3, 
            k.km, 
            k.lisatiedot,
            CASE 
                WHEN k.tyyppi = 0 THEN 'Timber Load'
                WHEN k.tyyppi = 1 THEN 'Consignment'
                ELSE 'Unknown'
            END AS tyyppi,
            -- Robustly find Origin name
            COALESCE(p.nimi, k.lahto) AS lahto,
            -- Robustly find Destination name
            COALESCE(pp.purkupaikka, k.kohde) AS kohde
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        -- Add missing JOINs for name resolution
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE 
            k.kuorma_id = $1 
            AND k.kulj_id = $2
            AND k.status = 'Completed';
    `;
    try {
        const result = await pool.query(query, [id, driverId]);
        if (result.rowCount === 0) return null;
        // The db wrapper will handle camelCasing.
        return result.rows[0];
    } catch (error) {
        console.error(`Error fetching completed trip details for ID ${id}:`, error);
        throw error;
    }
};