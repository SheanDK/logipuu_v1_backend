// backend/src/services/consignmentDriverService.ts
import pool from '../config/db';
import camelcaseKeys from 'camelcase-keys';
import { CreateConsignmentDto } from '../dto/consignment.dto';

// --- SERVICE TO GET THE LIST OF CONSIGNMENTS FOR THE DASHBOARD ---
export const getConsignmentsForDriver = async (driverId: number) => {
    const query = `
        SELECT
            k.kuorma_id,
            k.pvm,
            a.asiakkaan_nimi,
            k.status,
            (SELECT COUNT(*) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id) as rahtikirja_count
        FROM public.kuorma k
        JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        WHERE k.kulj_id = $1 AND k.tyyppi = 1 AND k.is_active = TRUE
        ORDER BY k.pvm DESC;
    `;
    const result = await pool.query(query, [driverId]);
    return camelcaseKeys(result.rows);
};

// --- SERVICE TO GET A SINGLE CONSIGNMENT WITH ITS WAYBILLS FOR EDITING ---
export const getConsignmentById = async (id: number, driverId: number) => {
    const kuormaQuery = `SELECT * FROM public.kuorma WHERE kuorma_id = $1 AND kulj_id = $2 AND tyyppi = 1;`;
    const rahtikirjatQuery = `SELECT * FROM public.rahtikirja WHERE kuorma_id = $1;`;

    const kuormaResult = await pool.query(kuormaQuery, [id, driverId]);
    if (kuormaResult.rowCount === 0) {
        return null; // Not found or not owned by this driver
    }

    const rahtikirjatResult = await pool.query(rahtikirjatQuery, [id]);

    const kuorma = camelcaseKeys(kuormaResult.rows[0]);
    kuorma.rahtikirjat = camelcaseKeys(rahtikirjatResult.rows);

    return kuorma;
};

// --- SERVICE TO CREATE A NEW CONSIGNMENT (PARENT + CHILDREN) ---
export const createConsignment = async (dto: CreateConsignmentDto, driverId: number, vehicleId: number) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Insert the parent "Kuorma"
        const kuormaInsertQuery = `
            INSERT INTO public.kuorma (tyyppi, asiakas_id, pvm, lisatiedot, kulj_id, kalusto_nro, status)
            VALUES (1, $1, $2, $3, $4, $5, 'Assigned')
            RETURNING kuorma_id;
        `;
        const kuormaResult = await client.query(kuormaInsertQuery, [dto.asiakasId, dto.pvm, dto.lisatiedot, driverId, vehicleId]);
        const newKuormaId = kuormaResult.rows[0].kuorma_id;

        // 2. Insert the child "Rahtikirjat"
        for (const r of dto.rahtikirjat) {
            const rahtikirjaInsertQuery = `
                INSERT INTO public.rahtikirja (kuorma_id, reitti, m3, km)
                VALUES ($1, $2, $3, $4);
            `;
            await client.query(rahtikirjaInsertQuery, [newKuormaId, r.reitti, r.m3, r.km]);
        }

        await client.query('COMMIT'); // Commit transaction
        return { kuormaId: newKuormaId };

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback on error
        throw error;
    } finally {
        client.release();
    }
};

// --- SERVICE TO UPDATE AN EXISTING CONSIGNMENT ---
export const updateConsignment = async (id: number, dto: CreateConsignmentDto, driverId: number) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Security check: Ensure the driver owns this Kuorma
        const ownerCheck = await client.query('SELECT kulj_id FROM public.kuorma WHERE kuorma_id = $1', [id]);
        if (ownerCheck.rowCount === 0 || ownerCheck.rows[0].kulj_id !== driverId) {
            throw new Error('Forbidden');
        }
        
        // 1. Update parent "Kuorma"
        const kuormaUpdateQuery = `
            UPDATE public.kuorma SET asiakas_id = $1, pvm = $2, lisatiedot = $3 WHERE kuorma_id = $4;
        `;
        await client.query(kuormaUpdateQuery, [dto.asiakasId, dto.pvm, dto.lisatiedot, id]);

        // 2. Delete old child "Rahtikirjat"
        await client.query('DELETE FROM public.rahtikirja WHERE kuorma_id = $1', [id]);

        // 3. Insert new child "Rahtikirjat"
        for (const r of dto.rahtikirjat) {
             const rahtikirjaInsertQuery = `
                INSERT INTO public.rahtikirja (kuorma_id, reitti, m3, km)
                VALUES ($1, $2, $3, $4);
            `;
            await client.query(rahtikirjaInsertQuery, [id, r.reitti, r.m3, r.km]);
        }
        
        await client.query('COMMIT');
        return { kuormaId: id };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};