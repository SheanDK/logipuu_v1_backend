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