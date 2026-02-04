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
    connect: async () => {
        const client = await originalPool.connect();
        const originalQuery = client.query.bind(client);

        // Patch the client's query method to automatically camelCase results
        // This ensures transactions and explicitly managed clients also benefit from conversion.
        // @ts-ignore
        client.query = async (...args: any[]) => {
            // @ts-ignore
            const result = await originalQuery(...args);
            if (result && result.rows && result.rows.length > 0) {
                result.rows = await toCamelCase(result.rows);
            }
            return result;
        };

        return client;
    },
};

originalPool.on('error', (err) => {
    console.error('Unexpected error on idle client in DB pool', err);
    process.exit(-1);
});

export default pool;