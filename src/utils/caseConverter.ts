// backend/src/utils/caseConverter.ts

/**
 * Professional utility to handle camelcase-keys in a hybrid CommonJS/ESM environment.
 * This avoids ERR_REQUIRE_ESM by using a transpilation-safe dynamic import.
 */

let camelcaseKeysCache: any = null;

async function getCamelcaseKeys() {
    if (camelcaseKeysCache) return camelcaseKeysCache;

    try {
        // We use the Function constructor to prevent TypeScript/Webpack/ts-node 
        // from transpiling `import()` into `require()`.
        const module = await (new Function('return import("camelcase-keys")')());
        camelcaseKeysCache = module.default;
        return camelcaseKeysCache;
    } catch (error) {
        console.error('Failed to load camelcase-keys dynamically:', error);
        throw error;
    }
}

/**
 * Converts object keys to camelCase.
 * @param input The object or array of objects to convert.
 * @param options Options for camelcase-keys (e.g., { deep: true }).
 */
export async function toCamelCase(input: any, options: any = { deep: true }) {
    if (!input) return input;
    const camelcaseKeys = await getCamelcaseKeys();
    return camelcaseKeys(input, options);
}

/**
 * Utility to transform database QueryResult rows.
 */
export async function transformRows(rows: any[]) {
    if (!rows || rows.length === 0) return rows;
    return toCamelCase(rows);
}
