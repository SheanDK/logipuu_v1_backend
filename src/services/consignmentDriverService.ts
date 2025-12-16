// src/services/consignmentDriverService.ts
import { PoolClient } from 'pg';
import pool from '../config/db';
import { CreateConsignmentDto } from '../dto/consignment.dto';
import { executeTransaction } from '../utils/dbUtils';

/**
 * Helper to calculate totals from waybills array
 */
const calculateTotals = (waybills: any[]) => {
    let m3 = 0;
    let km = 0;
    let kpl = 0;
    let tunnit = 0; // Maps to 'jako'

    if (waybills && waybills.length > 0) {
        waybills.forEach(w => {
            m3 += Number(w.m3) || 0;
            km += Number(w.km) || 0;
            kpl += Number(w.kpl) || 0;
            tunnit += Number(w.jako) || 0;
        });
    }
    return { m3, km, kpl, tunnit };
};

/**
 * Fetches a list of parent consignment loads for a specific driver and vehicle.
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
            -- Fetch totals so Driver sees updates made by Office
            k.m3,
            k.km,
            k.kpl,
            k.tunnit,
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
            -- Only show loads sent by driver ('Completed') but NOT yet accepted by office.
            -- laskutukseen = 0 means "Unchecked/Unbilled". 
            -- When office accepts, laskutukseen becomes 1, so it hides from here.
            AND k.status = 'Completed'
            AND k.laskutukseen = 0
        ORDER BY k.pvm DESC;
    `;
    const result = await pool.query(query, [driverId, vehicleId]);
    return result.rows;
};

/**
 * Fetches the full details of a single consignment load.
 */
export const getConsignmentById = async (id: number, driverId: number): Promise<any | null> => {
    const kuormaQuery = `SELECT * FROM public.kuorma WHERE kuorma_id = $1::bigint AND kulj_id = $2 AND tyyppi = 1;`;
    
    const rahtikirjatQuery = `
        SELECT 
            rahti_id, kuorma_id, pvm, rahtikirjan_nro, reitti, 
            m3, km, kpl, jako, tievero, lisatiedot,
            m3_hinta, km_hinta, kpl_hinta, jako_hinta, koko_hinta
        FROM public.rahtikirja 
        WHERE kuorma_id = $1::bigint 
        ORDER BY rahti_id ASC;
    `;

    try {
        const kuormaResult = await pool.query(kuormaQuery, [id, driverId]);
        
        if (!kuormaResult || kuormaResult.rowCount === 0) {
            return null;
        }

        const rahtikirjatResult = await pool.query(rahtikirjatQuery, [id]);
        
        const kuorma = kuormaResult.rows[0];
        kuorma.rahtikirjat = rahtikirjatResult?.rows || []; 
        
        return kuorma;

    } catch (error) {
        console.error(`Error in getConsignmentById:`, error);
        throw error;
    }
};

/**
 * Creates a new consignment load.
 */
export const createConsignment = async (dto: CreateConsignmentDto, driverId: number, vehicleId: number) => {
    return executeTransaction(async (client: PoolClient) => {
        // 1. Calculate Totals
        const totals = calculateTotals(dto.rahtikirjat);

        // 2. Insert Parent (Kuorma)
        // status='Completed', laskutukseen=0 (Unchecked)
        const kuormaInsertQuery = `
            INSERT INTO public.kuorma (
                tyyppi, asiakas_id, pvm, lisatiedot, kulj_id, kalusto_nro, 
                status, laskutukseen,
                m3, km, kpl, tunnit
            )
            VALUES (1, $1, $2, $3, $4, $5, 'Completed', 0, $6, $7, $8, $9) 
            RETURNING kuorma_id;
        `;
        
        const kuormaResult = await client.query(kuormaInsertQuery, [
            dto.asiakasId, 
            dto.pvm, 
            dto.lisatiedot, 
            driverId, 
            vehicleId,
            totals.m3,
            totals.km,
            totals.kpl,
            totals.tunnit
        ]);
        
        const newKuormaId = kuormaResult.rows[0].kuorma_id;

        // 3. Insert Children
        if (dto.rahtikirjat && dto.rahtikirjat.length > 0) {
            for (const r of dto.rahtikirjat) {
                const rahtikirjaInsertQuery = `
                    INSERT INTO public.rahtikirja (
                        kuorma_id, pvm, rahtikirjan_nro, reitti, 
                        m3, km, kpl, jako, tievero, lisatiedot,
                        m3_hinta, km_hinta, kpl_hinta, jako_hinta, koko_hinta
                    ) VALUES (
                        $1, $2, $3, $4, 
                        $5, $6, $7, $8, $9, $10,
                        0, 0, 0, 0, 0
                    )
                    RETURNING rahti_id;
                `;
                
                const params = [
                    newKuormaId, 
                    dto.pvm, 
                    r.rahtikirjanNumero || '',
                    r.reitti || '',
                    Number(r.m3) || 0, 
                    Number(r.km) || 0, 
                    Number(r.kpl) || 0,
                    Number(r.jako) || 0, 
                    Number(r.tievero) || 0, 
                    r.lisatiedot || ''
                ];
                
                await client.query(rahtikirjaInsertQuery, params);
            }
        }
        return { kuormaId: newKuormaId };
    });
};

/**
 * Updates an existing consignment.
 */
export const updateConsignment = async (id: number, dto: CreateConsignmentDto, driverId: number) => {
    return executeTransaction(async (client: PoolClient) => {
        // 1. Verify Ownership & Status
        // Check both 'status' and 'laskutukseen' to ensure it's not accepted/billed yet
        const ownerCheck = await client.query('SELECT kulj_id, status, laskutukseen FROM public.kuorma WHERE kuorma_id = $1', [id]);
        
        if (ownerCheck.rowCount === 0) { throw new Error('Not Found'); }
        if (ownerCheck.rows[0].kulj_id !== driverId) { throw new Error('Forbidden'); }
        
        const { status, laskutukseen } = ownerCheck.rows[0];
        // If status is not Completed OR laskutukseen is not 0, it means office has processed it.
        if (status !== 'Completed' || laskutukseen !== 0) { 
            throw new Error('Cannot edit: Load already accepted/processed by office'); 
        }
        
        // 2. Calculate Totals
        const totals = calculateTotals(dto.rahtikirjat);

        // 3. Update Parent (Kuorma)
        const kuormaUpdateQuery = `
            UPDATE public.kuorma 
            SET asiakas_id = $1, pvm = $2, lisatiedot = $3,
                m3 = $4, km = $5, kpl = $6, tunnit = $7
            WHERE kuorma_id = $8;
        `;
        
        await client.query(kuormaUpdateQuery, [
            dto.asiakasId, 
            dto.pvm, 
            dto.lisatiedot,
            totals.m3,
            totals.km,
            totals.kpl,
            totals.tunnit,
            id
        ]);
        
        // 4. Delete old Waybills
        await client.query('DELETE FROM public.rahtikirja WHERE kuorma_id = $1', [id]);

        // 5. Insert new Waybills
        if (dto.rahtikirjat && dto.rahtikirjat.length > 0) {
            for (const r of dto.rahtikirjat) {
                const rahtikirjaInsertQuery = `
                    INSERT INTO public.rahtikirja (
                        kuorma_id, pvm, rahtikirjan_nro, reitti, 
                        m3, km, kpl, jako, tievero, lisatiedot,
                        m3_hinta, km_hinta, kpl_hinta, jako_hinta, koko_hinta
                    ) VALUES (
                        $1, $2, $3, $4, 
                        $5, $6, $7, $8, $9, $10,
                        0, 0, 0, 0, 0
                    );
                `;
                
                const params = [
                    id, 
                    dto.pvm, 
                    r.rahtikirjanNumero || '', 
                    r.reitti || '',
                    Number(r.m3) || 0, 
                    Number(r.km) || 0, 
                    Number(r.kpl) || 0, 
                    Number(r.jako) || 0, 
                    Number(r.tievero) || 0, 
                    r.lisatiedot || ''
                ];
                
                await client.query(rahtikirjaInsertQuery, params);
            }
        }
        return { kuormaId: id };
    });
};