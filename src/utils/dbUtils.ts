// backend/src/utils/dbUtils.ts
import { PoolClient } from 'pg';
import pool from '../config/db';

/**
 * Executes a series of database operations within a single transaction.
 * If any operation fails, it automatically rolls back all changes.
 * If all operations succeed, it commits the changes.
 * @param callback The function containing all database queries to be executed.
 * It receives the client as an argument.
 */
export const executeTransaction = async <T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database transaction failed. Rolling back.', error);
        throw error; // Re-throw the error to be handled by the service
    } finally {
        client.release();
    }
};