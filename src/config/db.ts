// backend/src/config/db.ts
import { Pool, PoolConfig, QueryResult } from 'pg';
import { toCamelCase } from '../utils/caseConverter';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
};

const originalPool = new Pool(poolConfig);

const pool = {
    query: async (text: string, params?: any[]): Promise<QueryResult> => {
        const result = await originalPool.query(text, params);

        if (result.rows && result.rows.length > 0) {
            result.rows = await toCamelCase(result.rows);
        }

        return result;
    },
    connect: () => originalPool.connect(),
};

originalPool.on('error', (err) => {
    console.error('Unexpected error on idle client in DB pool', err);
    process.exit(-1);
});

export default pool;