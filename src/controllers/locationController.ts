// backend/src/controllers/locationController.ts

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { UpdateLocationDto } from '../dto/location.dto';
import { socketService } from '../services/socketService';
import pool from '../config/db'; // Import the database pool for direct updates

/**
 * Updates the current location for a given vehicle in the database.
 * In a larger application, this logic would reside in its own `locationService.ts`.
 * For simplicity here, we perform the direct database update.
 * @param vehicleId - The identifier of the vehicle (e.g., KalustoNro or RekNro).
 * @param latitude - The new latitude.
 * @param longitude - The new longitude.
 * @param timestamp - The UNIX timestamp of the location update.
 * @returns A promise that resolves when the update is complete.
 */
const updateLocationInDatabase = async (
    vehicleId: string,
    latitude: number,
    longitude: number,
    timestamp: number
) => {
    const query = `
        UPDATE public.kalusto
        SET
            viim_sijainti_lat = $2,
            viim_sijainti_long = $3,
            viim_sijainti_aika = to_timestamp($4 / 1000.0)
        WHERE rek_nro = $1;
    `;

    console.log(`DB_UPDATE: Updating location for vehicle [${vehicleId}] to [Lat: ${latitude}, Lng: ${longitude}]`);

    await pool.query(query, [vehicleId, latitude, longitude, timestamp]);
};


/**
 * Handles the request to update a vehicle's location.
 * It validates the input, updates the database, and emits a real-time event.
 */
export const updateVehicleLocationHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const dto = res.locals.validatedDto as UpdateLocationDto;
        const user = req.user;

        const locationData = {
            vehicleId: dto.vehicleId,
            latitude: parseFloat(dto.latitude),
            longitude: parseFloat(dto.longitude),
            timestamp: dto.timestamp || Date.now(),
        };

        await updateLocationInDatabase(
            locationData.vehicleId,
            locationData.latitude,
            locationData.longitude,
            locationData.timestamp
        );

        socketService.emitLocationUpdate({
            vehicleId: locationData.vehicleId,
            lat: locationData.latitude,
            lng: locationData.longitude,
            timestamp: locationData.timestamp,
            updatedBy: user?.userId,
        });

        res.status(200).json({ message: 'Location updated and broadcasted successfully.' });

    } catch (error) {
        console.error("Error in updateVehicleLocationHandler:", error);
        next(error);
    }
};

export const createQuickPuulaaniHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, address, lat, lng, instructions, customer_ids } = req.body;

        const primaryCustomerId = customer_ids && customer_ids.length > 0 ? customer_ids[0] : null;

        if (!primaryCustomerId) {
            res.status(400).json({ error: 'At least one customer must be selected.' });
            return;
        }

        const query = `
            INSERT INTO public.puulaani (asiakas_id, pvm, nimi, lisatiedot, sijainti_lat, sijainti_long, aktiivinen)
            VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, true)
            RETURNING puulaani_id as id;
        `;

        const fullDetails = `${address || ''} ${instructions || ''}`;
        const result = await pool.query(query, [primaryCustomerId, name, fullDetails, lat, lng]);

        console.log("✅ Quick Loading Point Created:", result.rows[0].id);
        res.status(201).json({ id: result.rows[0].id });
    } catch (error) {
        console.error("❌ DB ERROR in createQuickPuulaani:", error);
        next(error);
    }
};

export const createQuickPurkupaikkaHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, lat, lng, customer_ids } = req.body;
        const primaryCustomerId = customer_ids && customer_ids.length > 0 ? customer_ids[0] : null;

        const query = `
            INSERT INTO public.purkupaikka (asiakas_id, purkupaikka, sijainti_lat, sijainti_long, is_active, is_visible_on_map)
            VALUES ($1, $2, $3, $4, true, true)
            RETURNING purkupaikka_id as id;
        `;

        const result = await pool.query(query, [primaryCustomerId, name, lat, lng]);

        console.log("✅ Quick Unloading Point Created:", result.rows[0].id);
        res.status(201).json({ id: result.rows[0].id });
    } catch (error) {
        console.error("❌ DB ERROR in createQuickPurkupaikka:", error);
        next(error);
    }
};

/**
 * Proxies address search to Nominatim to avoid CORS/User-Agent issues on the frontend.
 */
export const searchAddressHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { q } = req.query;
        if (!q) {
            res.status(400).json({ error: 'Search query is required.' });
            return;
        }

        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(String(q))}&limit=1`, {
            headers: {
                'User-Agent': 'KuromaERP/1.0 (contact@kuroma.fi)'
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim search failed with status ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error: any) {
        console.error("❌ Proxy Geocoding Error:", error.message);
        res.status(500).json({ error: 'Geocoding failed', details: error.message });
    }
};