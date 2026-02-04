// backend/src/config/db.ts
import { Pool, PoolConfig, QueryResult } from 'pg'; // Import necessary types from pg
//import camelcaseKeys from 'camelcase-keys';
import dotenv from 'dotenv';

dotenv.config();

// Define pool configuration
const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
};

// Create the original pool instance
const originalPool = new Pool(poolConfig);

// Create a new object that will wrap the original pool's query method
const pool = {
    /**
     * Executes a SQL query and automatically converts the result rows' keys to camelCase.
     * @param text The SQL query text.
     * @param params The parameters for the SQL query.
     * @returns A promise that resolves with the query result, with rows transformed to camelCase.
     */
    query: async (text: string, params?: any[]): Promise<QueryResult> => {
        // Dynamic import inside the async function
        const { default: camelcaseKeys } = await import('camelcase-keys');

        const result = await originalPool.query(text, params);

        if (result.rows && result.rows.length > 0) {
            result.rows = camelcaseKeys(result.rows, { deep: true });
        }

        return result;
    },

    // You can also expose other pool methods if needed, like connect
    connect: () => originalPool.connect(),
};

// Error listener for the original pool
originalPool.on('error', (err) => {
    console.error('Unexpected error on idle client in DB pool', err);
    process.exit(-1);
});

// Export the wrapped pool object as the default export
export default pool;