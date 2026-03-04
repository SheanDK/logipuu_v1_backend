// backend/src/services/vehicleService.ts
import pool from '../config/db';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';
import { IVehicle } from '../types/vehicle.types';
import * as vehicleQueries from '../queries/vehicleQueries';

// 1. Fetches all vehicles.
export const getAllVehicles = async (): Promise<IVehicle[]> => {
    try {
        const result = await pool.query(vehicleQueries.SELECT_ALL_VEHICLES);
        return result.rows as IVehicle[];
    } catch (error) {
        console.error("VEHICLE_SERVICE: Error fetching all vehicles:", error);
        throw error;
    }
};

// 2. Fetches a vehicle by its ID.
export const getVehicleById = async (id: number): Promise<IVehicle | null> => {
    try {
        const result = await pool.query(vehicleQueries.SELECT_VEHICLE_BY_ID, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0] as IVehicle;
    } catch (error) {
        console.error(`VEHICLE_SERVICE: Error fetching vehicle by ID ${id}:`, error);
        throw error;
    }
};

// 3. Creates a new vehicle.
export const createVehicle = async (vehicleData: CreateVehicleDto): Promise<IVehicle> => {
    const { registrationNo, previousInspectionDate, nextInspectionDate, isActive } = vehicleData;
    try {
        const result = await pool.query(vehicleQueries.INSERT_VEHICLE, [
            registrationNo,
            new Date(previousInspectionDate),
            new Date(nextInspectionDate),
            isActive ?? true
        ]);
        return result.rows[0] as IVehicle;
    } catch (error) {
        console.error("VEHICLE_SERVICE: Error creating vehicle:", error);
        throw error;
    }
};

// 4. Updates a vehicle.
export const updateVehicle = async (id: number, vehicleData: UpdateVehicleDto): Promise<IVehicle | null> => {
    try {
        const existingVehicle = await getVehicleById(id);
        if (!existingVehicle) {
            return null;
        }

        const updatedData = {
            registrationNo: vehicleData.registrationNo ?? existingVehicle.registrationNo,
            previousInspectionDate: vehicleData.previousInspectionDate
                ? new Date(vehicleData.previousInspectionDate)
                : existingVehicle.previousInspectionDate,
            nextInspectionDate: vehicleData.nextInspectionDate
                ? new Date(vehicleData.nextInspectionDate)
                : existingVehicle.nextInspectionDate,
            isActive: vehicleData.isActive ?? existingVehicle.isActive,
        };

        const result = await pool.query(vehicleQueries.UPDATE_VEHICLE_BY_ID, [
            updatedData.registrationNo,
            updatedData.previousInspectionDate,
            updatedData.nextInspectionDate,
            updatedData.isActive,
            id
        ]);
        return result.rows[0] as IVehicle;
    } catch (error) {
        console.error(`VEHICLE_SERVICE: Error updating vehicle ID ${id}:`, error);
        throw error;
    }
};

// 5. Soft deletes a vehicle.
export const deleteVehicle = async (id: number): Promise<{ vehicleNo: number; message: string } | null> => {
    try {
        const result = await pool.query(vehicleQueries.DELETE_VEHICLE_BY_ID, [id]);
        if (result.rowCount === 0) {
            return null;
        }
        return {
            vehicleNo: result.rows[0].vehicleNo,
            message: 'Vehicle deleted successfully'
        };
    } catch (error) {
        console.error(`VEHICLE_SERVICE: Error deleting vehicle ID ${id}:`, error);
        throw error;
    }
};

// 6. Checks if a registration number already exists in the database.
export const checkRegistrationNoExists = async (registrationNo: string, existingVehicleId?: string): Promise<boolean> => {
    try {
        const result = await pool.query(
            `SELECT COUNT(*) FROM public.kalusto WHERE rek_nro = $1 ${existingVehicleId ? 'AND kalusto_nro != $2' : ''}`,
            existingVehicleId ? [registrationNo, existingVehicleId] : [registrationNo]
        );
        return parseInt(result.rows[0].count, 10) > 0;
    } catch (error) {
        console.error("SERVICE ERROR: Failed to check registration number existence:", error);
        throw error;
    }
};
