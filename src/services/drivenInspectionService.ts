// backend/src/services/drivenInspectionService.ts
import pool from '../config/db';
import camelcaseKeys from 'camelcase-keys';
import { 
    IDrivenInspectionListItem, 
    IDrivenInspectionFilters, 
    IUpdateDrivenInspectionRowDto, 
    IAcceptEntriesDto,
    ICreateKuormaFromPtlDto  
} from '../types';
import { 
    UPDATE_DRIVEN_INSPECTION_ROW,
    ACCEPT_KUORMA_ENTRIES_FOR_BILLING,
    MARK_PUUTAVARALAJI_AS_COMPLETE,
    SELECT_INSPECTION_LIST,
    INSERT_NEW_KUORMA_FROM_PTL
} from '../queries/drivenInspectionQueries';


export const getDrivenInspectionList = async (filters: Partial<IDrivenInspectionFilters>): Promise<IDrivenInspectionListItem[]> => {
    let query = SELECT_INSPECTION_LIST;
    
    const queryParams: any[] = [];
    const conditions: string[] = ["ptl.haettu > 0", "ptl.valmis = FALSE"];
    let paramIndex = 1;

    if (filters.startDate && filters.endDate) {
        conditions.push(`p.pvm BETWEEN $${paramIndex++} AND $${paramIndex++}`);
        queryParams.push(filters.startDate, filters.endDate);
    }
    if (filters.customerId) {
        conditions.push(`p.asiakas_id = $${paramIndex++}`);
        queryParams.push(filters.customerId);
    }
    if (filters.vehicleId) {
        conditions.push(`p.auto_nro ILIKE '%' || (SELECT rek_nro FROM public.kalusto WHERE kalusto_nro = $${paramIndex++}) || '%'`);
        queryParams.push(filters.vehicleId);
    }
    if (filters.timberGradeIds && Array.isArray(filters.timberGradeIds) && filters.timberGradeIds.length > 0) {
        const placeholders = filters.timberGradeIds.map(() => `$${paramIndex++}`).join(',');
        conditions.push(`ptl.puutavara_nro IN (${placeholders})`);
        queryParams.push(...filters.timberGradeIds);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY p.pvm DESC, ptl.puutavara_id DESC;`;
    
    console.log("==================== DEBUG START ====================");
    console.log("EXECUTING QUERY:", query);
    console.log("WITH PARAMS:", queryParams);
    
    try {
        const result = await pool.query(query, queryParams);
        
        // CRITICAL DEBUG: Check raw database result
        console.log("RAW DATABASE RESULT (first row):", JSON.stringify(result.rows[0], null, 2));
        
        const camelCasedRows = camelcaseKeys(result.rows);
        
        // CRITICAL DEBUG: Check after camelCase conversion
        console.log("AFTER CAMELCASE (first row):", JSON.stringify(camelCasedRows[0], null, 2));
        console.log("DATE FIELD VALUE:", camelCasedRows[0]?.date);
        console.log("===================== DEBUG END =====================");

        return camelCasedRows;

    } catch (error) {
        console.error('Error in getDrivenInspectionList service:', error);
        throw error;
    }
};

export const updateDrivenInspectionRow = async (kuormaId: number, data: IUpdateDrivenInspectionRowDto) => {
    if (!kuormaId) {
        throw new Error("Cannot update details: No associated load record found.");
    }

    const currentEntryResult = await pool.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1', [kuormaId]);
    if (currentEntryResult.rowCount === 0) {
        throw new Error("Load record not found.");
    }
    
    const currentEntry = currentEntryResult.rows[0];
    
    // FIX: Ensure date is properly formatted
    const date = data.date ? data.date : (currentEntry.pvm ? currentEntry.pvm.toISOString().split('T')[0] : null);
    const receptionNo = data.receptionNo ?? currentEntry.vastaanotto_nro;
    const drivingRoute = data.drivingRoute ?? currentEntry.reitti;
    const cubicMeters = data.cubicMeters ?? currentEntry.m3;
    const freightKm = data.freightKm ?? currentEntry.km;
    const hours = data.hours ?? currentEntry.tunnit;
    const pcs = data.pcs ?? currentEntry.kpl;
    const additionalInfo = data.additionalInfo ?? currentEntry.lisatiedot;

    const queryParams = [
        date,               // Parameter 1
        receptionNo,        // Parameter 2
        drivingRoute,       // Parameter 3
        cubicMeters,        // Parameter 4
        freightKm,          // Parameter 5
        hours,              // Parameter 6
        pcs,                // Parameter 7
        additionalInfo,     // Parameter 8
        kuormaId            // Parameter 9
    ];
    
    console.log('Updating kuorma with params:', queryParams);
    
    try {
        const result = await pool.query(UPDATE_DRIVEN_INSPECTION_ROW, queryParams);
        
        if (result.rowCount === 0) {
            throw new Error("No rows were updated.");
        }
        
        const updatedRow = camelcaseKeys(result.rows[0]);
        console.log('Updated row result:', updatedRow);
        
        return updatedRow;
    } catch (error) {
        console.error('Error updating driven inspection row:', error);
        throw error;
    }
};

export const acceptEntries = async (data: IAcceptEntriesDto): Promise<any> => {
    const { puutavaraIds } = data;
    
    if (!puutavaraIds || puutavaraIds.length === 0) {
        throw new Error("No entries selected for approval.");
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const kuormaResult = await client.query(ACCEPT_KUORMA_ENTRIES_FOR_BILLING, [puutavaraIds]);
        const ptlResult = await client.query(MARK_PUUTAVARALAJI_AS_COMPLETE, [puutavaraIds]);

        await client.query('COMMIT');

        return {
            message: `${ptlResult.rowCount} entries have been marked as complete and sent for invoicing.`,
            approvedCount: ptlResult.rowCount,
            approvedPuutavaraIds: ptlResult.rows.map((row: any) => row.puutavara_id),
            updatedKuormaIds: kuormaResult.rows.map((row: any) => row.kuorma_id)
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in acceptEntries service transaction:', error);
        throw error;
    } finally {
        client.release();
    }
};

export const deleteDrivenInspectionEntry = async (id: number) => {
    const result = await pool.query('UPDATE public.puutavaralaji SET valmis = TRUE WHERE puutavara_id = $1', [id]);
    if (result.rowCount === 0) return null;
    return { puutavaraId: id, message: 'Entry removed from inspection list.' };
};

export const createKuormaFromPtl = async (data: ICreateKuormaFromPtlDto) => {
    const { 
        puutavaraId, receptionNo, drivingRoute, cubicMeters, freightKm, 
        hours, pcs, additionalInfo 
    } = data;

    const queryParams = [
        puutavaraId,
        receptionNo,
        drivingRoute,
        cubicMeters,
        freightKm,
        hours,
        pcs,
        additionalInfo
    ];

    console.log('Creating new kuorma with params:', queryParams);

    try {
        const result = await pool.query(INSERT_NEW_KUORMA_FROM_PTL, queryParams);
        if (result.rowCount === 0) {
            throw new Error("Failed to create load record. The source timber entry might not exist.");
        }
        
        const createdRow = camelcaseKeys(result.rows[0]);
        console.log('Created row result:', createdRow);
        
        return createdRow;
    } catch (error) {
        console.error('Error in createKuormaFromPtl service:', error);
        throw error;
    }
};