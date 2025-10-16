// backend/src/services/consignmentDriverService.ts
import { PoolClient } from 'pg';
import pool from '../config/db';
import { CreateConsignmentDto } from '../dto/consignment.dto';
import { executeTransaction } from '../utils/dbUtils';

/**
 * Fetches a list of parent consignment loads for a specific driver and vehicle.
 * This is used for the main dashboard list view.
 */
export const getConsignmentsForDriver = async (driverId: number, vehicleId: number) => { 
    const query = `
        SELECT
            k.kuorma_id, 
            k.pvm, 
            a.asiakkaan_nimi, 
            kal.rek_nro as auto_nro, 
            kul.nimi as kuljettajan_nimi, 
            k.status,
            (SELECT COUNT(*) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id) as rahtikirja_count
        FROM public.kuorma k
        JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        WHERE 
            k.kulj_id = $1 
            AND k.kalusto_nro = $2 
            AND k.tyyppi = 1 
            AND k.is_active = TRUE
        ORDER BY k.pvm DESC;
    `;
    const result = await pool.query(query, [driverId, vehicleId]);
    return result.rows;
};

/**
 * Fetches the full details of a single consignment load, including all its child waybills.
 * This is used when a user clicks to edit an existing consignment.
 */
export const getConsignmentById = async (id: number, driverId: number): Promise<any | null> => {
    console.log(`\n--- [Service: getConsignmentById] ---`);
    console.log(`[1] Initiated for kuorma_id: ${id}, driver_id: ${driverId}`);
    
    // The parent kuorma_id is also likely a bigint, so we cast here as well for safety.
    const kuormaQuery = `SELECT * FROM public.kuorma WHERE kuorma_id = $1::bigint AND kulj_id = $2 AND tyyppi = 1;`;
    
    // --- THE MAIN FIX IS HERE ---
    const rahtikirjatQuery = `SELECT * FROM public.rahtikirja WHERE kuorma_id = $1::bigint ORDER BY rahti_id ASC;`;

    try {
        const kuormaResult = await pool.query(kuormaQuery, [id, driverId]);
        
        if (!kuormaResult || kuormaResult.rowCount === 0) {
            console.log(`[2] RESULT: Parent kuorma with id ${id} NOT FOUND for this driver. Returning null.`);
            console.log(`-------------------------------------\n`);
            return null;
        }
        console.log(`[2] SUCCESS: Parent kuorma with id ${id} found.`);

        console.log(`[3] Now fetching waybills with query: ${rahtikirjatQuery} (using parameter: ${id})`);
        const rahtikirjatResult = await pool.query(rahtikirjatQuery, [id]);
        
        const rowCount = rahtikirjatResult?.rowCount || 0;
        console.log(`[4] RESULT: Waybill query returned ${rowCount} rows.`);
        
        if (rowCount > 0) {
            console.log('[5] Found waybill data:', rahtikirjatResult.rows);
        }

        const kuorma = kuormaResult.rows[0];
        kuorma.rahtikirjat = rahtikirjatResult?.rows || []; 
        
        console.log('[6] SUCCESS: Final object being returned to controller:', kuorma);
        console.log(`-------------------------------------\n`);
        return kuorma;

    } catch (error) {
        console.error(`[!!!] UNEXPECTED ERROR in getConsignmentById:`, error);
        console.log(`-------------------------------------\n`);
        throw error;
    }
};

/**
 * Creates a new consignment load (parent) and its associated waybills (children)
 * within a single database transaction.
 */
export const createConsignment = async (dto: CreateConsignmentDto, driverId: number, vehicleId: number) => {
    return executeTransaction(async (client: PoolClient) => {
        const kuormaInsertQuery = `
            INSERT INTO public.kuorma (tyyppi, asiakas_id, pvm, lisatiedot, kulj_id, kalusto_nro, status)
            VALUES (1, $1, $2, $3, $4, $5, 'Assigned') RETURNING kuorma_id;
        `;
        const kuormaResult = await client.query(kuormaInsertQuery, [dto.asiakasId, dto.pvm, dto.lisatiedot, driverId, vehicleId]);
        const newKuormaId = kuormaResult.rows[0].kuorma_id;

        if (dto.rahtikirjat && dto.rahtikirjat.length > 0) {
            for (const r of dto.rahtikirjat) {
                const rahtikirjaInsertQuery = `
                    INSERT INTO public.rahtikirja (
                        kuorma_id, pvm, rahtikirjan_nro, reitti, 
                        m3, km, kpl, jako, tievero, lisatiedot
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING rahti_id;
                `;
                // FIX: Use camelCase properties from the DTO.
                const params = [
                    newKuormaId, dto.pvm, 
                    r.rahtikirjanNumero || '',
                    r.reitti || '',
                    Number(r.m3) || 0, Number(r.km) || 0, Number(r.kpl) || 0,
                    Number(r.jako) || 0, Number(r.tievero) || 0, r.lisatiedot || ''
                ];
                const result = await client.query(rahtikirjaInsertQuery, params);
                if (result.rowCount === 0) { throw new Error(`DB INSERT FAILED`); }
            }
        }
        return { kuormaId: newKuormaId };
    });
};

export const updateConsignment = async (id: number, dto: CreateConsignmentDto, driverId: number) => {
    return executeTransaction(async (client: PoolClient) => {
        const ownerCheck = await client.query('SELECT kulj_id FROM public.kuorma WHERE kuorma_id = $1', [id]);
        if (ownerCheck.rowCount === 0 || ownerCheck.rows[0].kulj_id !== driverId) { throw new Error('Forbidden'); }
        
        const kuormaUpdateQuery = `UPDATE public.kuorma SET asiakas_id = $1, pvm = $2, lisatiedot = $3 WHERE kuorma_id = $4;`;
        await client.query(kuormaUpdateQuery, [dto.asiakasId, dto.pvm, dto.lisatiedot, id]);
        
        await client.query('DELETE FROM public.rahtikirja WHERE kuorma_id = $1', [id]);

        if (dto.rahtikirjat && dto.rahtikirjat.length > 0) {
            for (const r of dto.rahtikirjat) {
                const rahtikirjaInsertQuery = `
                    INSERT INTO public.rahtikirja (
                        kuorma_id, pvm, rahtikirjan_nro, reitti, 
                        m3, km, kpl, jako, tievero, lisatiedot
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING rahti_id;
                `;
                // FIX: Use camelCase properties from the DTO.
                const params = [
                    id, dto.pvm,
                    r.rahtikirjanNumero || '',
                    r.reitti || '',
                    Number(r.m3) || 0, Number(r.km) || 0, Number(r.kpl) || 0,
                    Number(r.jako) || 0, Number(r.tievero) || 0, r.lisatiedot || ''
                ];
                const result = await client.query(rahtikirjaInsertQuery, params);
                if (result.rowCount === 0) { throw new Error(`DB INSERT FAILED during update.`); }
            }
        }
        return { kuormaId: id };
    });
};