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
    //
    // IMPORTANT: Choose the correct identifier for your 'kalusto' table.
    // Assuming 'rek_nro' (registration number) is the `vehicleId` sent from the frontend.
    // If you send 'kalusto_nro', change the WHERE clause to `WHERE kalusto_nro = $1`.
    //
    // Also, ensure your 'kalusto' table has 'viim_sijainti_lat', 'viim_sijainti_long',
    // and 'viim_sijainti_aika' columns.
    //
    const query = `
        UPDATE public.kalusto
        SET
            viim_sijainti_lat = $2,
            viim_sijainti_long = $3,
            viim_sijainti_aika = to_timestamp($4 / 1000.0) -- Convert JS timestamp (ms) to PostgreSQL timestamp
        WHERE rek_nro = $1;
    `;

    // Log the database update action for debugging purposes.
    console.log(`DB_UPDATE: Updating location for vehicle [${vehicleId}] to [Lat: ${latitude}, Lng: ${longitude}]`);
    
    // Execute the query.
    await pool.query(query, [vehicleId, latitude, longitude, timestamp]);
};


/**
 * Handles the request to update a vehicle's location.
 * It validates the input, updates the database, and emits a real-time event.
 */
export const updateVehicleLocationHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        // 1. Get validated data from the previous middleware (validateDto).
        const dto = res.locals.validatedDto as UpdateLocationDto;
        const user = req.user; // Get authenticated user details from the 'protect' middleware.

        // 2. Prepare the data for database and socket emission.
        // We use parseFloat to ensure latitude/longitude are numbers.
        const locationData = {
            vehicleId: dto.vehicleId,
            latitude: parseFloat(dto.latitude),
            longitude: parseFloat(dto.longitude),
            timestamp: dto.timestamp || Date.now(), // Use provided timestamp or current time.
        };

        // 3. Perform the database update.
        // This is an async operation; we wait for it to complete.
        await updateLocationInDatabase(
            locationData.vehicleId,
            locationData.latitude,
            locationData.longitude,
            locationData.timestamp
        );

        // 4. After a successful database update, emit the event via Socket.IO to all clients.
        // This allows other users (e.g., dispatchers) to see the location change in real-time.
        socketService.emitLocationUpdate({
            vehicleId: locationData.vehicleId, // Use the same identifier (e.g., registration number)
            lat: locationData.latitude,
            lng: locationData.longitude,
            timestamp: locationData.timestamp,
            updatedBy: user?.userId, // Optionally, include which user triggered the update.
        });
        
        // 5. Send a success response back to the client who made the API request.
        res.status(200).json({ message: 'Location updated and broadcasted successfully.' });

    } catch (error) {
        // 6. If any step fails, pass the error to the global error handler middleware.
        console.error("Error in updateVehicleLocationHandler:", error);
        next(error);
    }
};