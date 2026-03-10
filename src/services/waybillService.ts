// backend/src/services/waybillService.ts
import pool from '../config/db';
import { IWaybill } from '../types/waybill.types';
import { CreateWaybillDto, UpdateWaybillDto } from '../dto/waybill.dto';
import * as getQueries from '../queries/waybillQueries/getWaybillQueries';
import * as createQueries from '../queries/waybillQueries/createWaybillQueries';
import * as updateQueries from '../queries/waybillQueries/updateWaybillQueries';
import * as deleteQueries from '../queries/waybillQueries/deleteWaybillQueries';

// 1. Fetches all waybills.
export const getAllWaybills = async (): Promise<IWaybill[]> => {
    const result = await pool.query(getQueries.SELECT_ALL_WAYBILLS);
    return result.rows;
};

// 2. Fetches a waybill by its ID.
export const getWaybillById = async (id: number): Promise<IWaybill | null> => {
    const result = await pool.query(getQueries.SELECT_WAYBILL_BY_ID, [id]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
};

// 3. Creates a new waybill.
export const createWaybill = async (data: CreateWaybillDto): Promise<IWaybill> => {
    const params = [
        data.pvm, data.kuormaId, data.rahtikirjanNro ?? null, data.reitti ?? null, data.m3,
        data.m3Hinta ?? 0, data.km, data.kmHinta ?? 0, data.kpl ?? 0, data.kplHinta ?? 0,
        data.jako ?? 0, data.jakoHinta ?? 0, data.tievero ?? 0, data.kokoHinta, data.lisatiedot ?? null
    ];
    const result = await pool.query(createQueries.INSERT_WAYBILL, params);
    if (result.rows[0] && result.rows[0].rahtiId) {
        const newWaybill = await getWaybillById(result.rows[0].rahtiId);
        if (newWaybill) return newWaybill;
    }
    throw new Error('Waybill creation failed. Could not retrieve details.');
};

// 4. Updates a waybill.
export const updateWaybill = async (id: number, data: UpdateWaybillDto): Promise<IWaybill | null> => {
    const existing = await getWaybillById(id);
    if (!existing) return null;

    const params = [
        data.pvm ?? existing.pvm,
        data.kuormaId ?? existing.kuormaId,
        data.rahtikirjanNro ?? existing.rahtikirjanNro,
        data.reitti ?? existing.reitti,
        data.m3 ?? existing.m3,
        data.m3Hinta ?? existing.m3Hinta,
        data.km ?? existing.km,
        data.kmHinta ?? existing.kmHinta,
        data.kpl ?? existing.kpl,
        data.kplHinta ?? existing.kplHinta,
        data.jako ?? existing.jako,
        data.jakoHinta ?? existing.jakoHinta,
        data.tievero ?? existing.tievero,
        data.kokoHinta ?? existing.kokoHinta,
        data.lisatiedot ?? existing.lisatiedot,
        id
    ];
    const result = await pool.query(updateQueries.UPDATE_WAYBILL_BY_ID, params);
    if (result.rows[0] && result.rows[0].rahtiId) {
        const updatedWaybill = await getWaybillById(result.rows[0].rahtiId);
        if (updatedWaybill) return updatedWaybill;
    }
    return null;
};

// 5. Soft deletes a waybill.
export const deleteWaybill = async (id: number): Promise<{ rahtiId: number; message: string } | null> => {
    const result = await pool.query(deleteQueries.DELETE_WAYBILL_BY_ID, [id]);
    if (result.rowCount === 0) return null;
    return { rahtiId: result.rows[0].rahtiId, message: 'Waybill deleted successfully' };
};