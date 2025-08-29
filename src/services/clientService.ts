// backend/src/services/clientService.ts
import pool from '../config/db';
import { IClient } from '../types/client.types'; // Using the backend's IClient type
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';
import * as query from '../queries/clientQueries';

export const getAllClients = async (): Promise<IClient[]> => {
    // The camelcase-keys middleware in db.ts handles the conversion automatically.
    const result = await pool.query(query.SELECT_ALL_CLIENTS);
    return result.rows;
};

export const getClientById = async (clientId: string): Promise<IClient | null> => {
    const result = await pool.query(query.SELECT_CLIENT_BY_ID, [clientId]);
    return result.rows[0] || null;
};

export const createClient = async (clientData: CreateClientDto): Promise<IClient> => {
    const {
        clientName, address, postalCode, city, phoneNo, vatId,
        targetColor, type, isActive, contactPerson, email, additionalInfo
    } = clientData;

    // Ensure null values are passed correctly for optional fields
    const values = [
        clientName,
        address ?? null,
        postalCode ?? null,
        city ?? null,
        phoneNo ?? null,
        vatId ?? null,
        targetColor ?? null, // Will send null if not provided
        type,
        isActive ?? true,
        contactPerson ?? null,
        email ?? null,
        additionalInfo ?? null
    ];

    const result = await pool.query(query.INSERT_CLIENT, values);
    return result.rows[0];
};

export const updateClient = async (clientId: string, clientData: UpdateClientDto): Promise<IClient | null> => {
    const existingClient = await getClientById(clientId);
    if (!existingClient) {
        return null; // Client not found, can't update
    }

    // Merge DTO data with existing data to create a complete object for the query.
    // Ensure existing values are used if not provided in clientData, and null is explicitly passed.
    const updatedName = clientData.clientName ?? existingClient.clientName;
    const updatedAddress = clientData.address ?? existingClient.address;
    const updatedPostalCode = clientData.postalCode ?? existingClient.postalCode;
    const updatedCity = clientData.city ?? existingClient.city;
    const updatedPhoneNo = clientData.phoneNo ?? existingClient.phoneNo;
    const updatedVatId = clientData.vatId ?? existingClient.vatId;
    const updatedTargetColor = clientData.targetColor ?? existingClient.targetColor;
    const updatedType = clientData.type ?? existingClient.type;
    const updatedIsActive = clientData.isActive ?? existingClient.isActive;
    const updatedContactPerson = clientData.contactPerson ?? existingClient.contactPerson;
    const updatedEmail = clientData.email ?? existingClient.email;
    const updatedAdditionalInfo = clientData.additionalInfo ?? existingClient.additionalInfo;

    const values = [
        updatedName,
        updatedAddress,
        updatedPostalCode,
        updatedCity,
        updatedPhoneNo,
        updatedVatId,
        updatedTargetColor,
        updatedType,
        updatedIsActive,
        updatedContactPerson,
        updatedEmail,
        updatedAdditionalInfo,
        clientId
    ];

    const result = await pool.query(query.UPDATE_CLIENT_BY_ID, values);
    return result.rows[0];
};

export const deleteClient = async (clientId: string): Promise<{ deletedClientId: string; message: string } | null> => {
    try {
        const result = await pool.query(query.DELETE_CLIENT_BY_ID, [clientId]);

        if (typeof result.rowCount === 'number' && result.rowCount > 0) {
            return {
                deletedClientId: String(result.rows[0].asiakkaanId),
                message: 'Client deleted successfully'
            };
        }
        return null;
    } catch (error) {
        console.error(`CLIENT_SERVICE: Error deleting client ID ${clientId}:`, error);
        throw error;
    }
};

export const checkTargetColorExists = async (color: string, clientId?: string): Promise<boolean> => {
    try {
        // Pass clientId as null if it's undefined, for SQL query compatibility.
        const result = await pool.query(query.CHECK_IF_COLOR_IS_IN_USE, [color, clientId ?? null]);
        return (typeof result.rowCount === 'number' && result.rowCount > 0);
    } catch (error) {
        console.error("Error checking color existence in DB:", error);
        throw error;
    }
};