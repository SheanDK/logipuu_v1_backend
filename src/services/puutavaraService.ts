// backend/src/services/puutavaraService.ts
import pool from '../config/db';
import * as query from '../queries/puutavaraQueries/puutavaraQueries';
import { IPuutavaraItem } from '../types/timberStack.types';

export const getAllWoodTypes = async () => {
    const { rows } = await pool.query(query.SELECT_ALL_PUUTAVARAT);
    return rows;
};