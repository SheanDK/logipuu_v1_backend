// src/services/invoicingService.ts
import pool from '../config/db';
import {
  buildGetInvoicingRowByIdQuery,
  buildInvoicingSearchQuery,
  buildUpdateInvoicingRowQuery,
  buildInvoicePrefetchQuery,
  buildInvoiceManyUpdateQuery,
} from '../queries/invoicingQueries';

export type InvoicingFilters = {
  dateFrom: string;
  dateTo: string;
  customerId: number | null;
  vehicleId: number | null;
  woodTypeIdList: number[];
  unbilled: boolean;
  billed: boolean;
};

/**
 * Keep these names in sync with SELECT aliases (snake_case).
 * This mirrors the DB result row returned by the invoicing queries.
 */
export type InvoicingRow = {
  pnimi: string | null;
  pvm_laskutus: string | null;
  asiakas: string | null;
  puutavara: string | null;
  pvm: string | null;

  vastaanotto_nro: string | null;
  reitti: string | null;

  m3: number | null;
  km: number | null;
  tunnit: number | null;
  kpl: number | null;

  m3_hinta: number | null;
  km_hinta: number | null;
  tunnit_hinta: number | null;
  kpl_hinta: number | null;

  laskutukseen: number | null;
  kokohinta: number | null;
  kuorma_id: number;
  lisatiedot: string | null;
  ajomaarays_nro: string | null;
  auto_nro: string | null;
  knimi: string | null;
};

/**
 * DTO for patching an invoicing row.
 * Keys are in camelCase and mapped to snake_case in the query builder.
 */
export type UpdateInvoicingDto = {
  waybillNumber?: string | null;   
  vastaanottoNro?: string | null;  
  route?: string | null;           
  notes?: string | null;           

  m3?: number | null;              
  km?: number | null;              
  hours?: number | null;           
  pieces?: number | null;          

  unitPriceM3?: number | null;     
  unitPriceKm?: number | null;     
  unitPriceHour?: number | null;   
  unitPricePiece?: number | null;  

  kokohinta?: number | null;       
  billedDate?: string | null;      
};

/**
 * Search invoicing rows using the query builder and return typed results.
 */
export async function searchInvoicing(filters: InvoicingFilters): Promise<InvoicingRow[]> {
  const { sql, params } = buildInvoicingSearchQuery(filters);
  // console.log('[INVOICING][SEARCH][SQL]', sql, params);
  const result = await pool.query(sql, params);
  return (result.rows ?? []) as InvoicingRow[];
}

/**
 * Partially update a single invoicing row by id.
 * Returns true when at least one row was affected.
 * If the builder produced no SET clauses, treat as a no-op success.
 */
export async function updateInvoicingRow(id: number, dto: UpdateInvoicingDto): Promise<boolean> {
  const { sql, params } = buildUpdateInvoicingRowQuery(id, dto);
  if (!sql) {
    // console.log('[INVOICING][PATCH][NOOP] nothing to update for id=', id);
    return true;
  }
  // console.log('[INVOICING][PATCH][SQL]', sql, params);
  const res = await pool.query(sql, params);
  return (res?.rowCount ?? 0) > 0;
}

/**
 * Fetch a single invoicing row by id.
 */
export async function getInvoicingRowById(id: number): Promise<InvoicingRow | null> {
  const { sql, params } = buildGetInvoicingRowByIdQuery(id);
  // console.log('[INVOICING][GET-BY-ID][SQL]', sql, params);
  const res = await pool.query(sql, params);
  return (res.rows?.[0] as InvoicingRow) ?? null;
}

/**
 * Mark many loads (kuorma) as billed in one go.
 *
 * Flow:
 *  1) Prefetch the given kuorma ids with current billed state.
 *  2) Determine billable ids (exist AND not yet billed).
 *  3) Update only billable ids to set pvm_laskutus = CURRENT_DATE.
 *  4) Summarize the outcome.
 *
 * @param ids Array of kuorma ids (numbers)
 * @returns Summary with counts and updated id list.
 */
export async function invoiceMany(ids: number[]): Promise<{
  total: number;
  updated: number;
  alreadyBilled: number;
  notFound: number;
  updatedIds: number[];
}> {
  const total = ids.length;
  //console.log('[INVOICE][IN] ids =', ids, 'count =', total);

  // Small helpers:
  // - pick: read the first defined property from given keys (handles camelCase vs snake_case)
  // - numOrUndef: convert to number if finite, otherwise undefined
  const pick = (r: any, ...keys: string[]) => {
    const k = keys.find(k => r[k] !== undefined);
    return k ? r[k] : undefined;
  };
  const numOrUndef = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  // PREFETCH: get all rows that match the ids and see which ones already have pvm_laskutus
  const preQ = buildInvoicePrefetchQuery(ids);
  // console.log('[INVOICE][PREFETCH][SQL]', preQ.sql.trim(), preQ.params);
  const pre = await pool.query(preQ.sql, preQ.params);
  // console.log('[INVOICE][PREFETCH][ROWCOUNT]', pre.rowCount, 'sample row =', pre.rows?.[0], 'keys=', Object.keys(pre.rows?.[0] || {}));

  // IMPORTANT: result rows may be camelCased by a transform, so read both variants.
  const foundIdsArr = (pre.rows ?? [])
    .map((r: any) => numOrUndef(pick(r, 'kuorma_id', 'kuormaId')))
    .filter((n: number | undefined): n is number => n !== undefined);
  const foundIds = new Set<number>(foundIdsArr);

  const alreadySetArr = (pre.rows ?? [])
    .filter((r: any) => pick(r, 'pvm_laskutus', 'pvmLaskutus') != null)
    .map((r: any) => numOrUndef(pick(r, 'kuorma_id', 'kuormaId')))
    .filter((n: number | undefined): n is number => n !== undefined);
  const alreadySet = new Set<number>(alreadySetArr);

  // Billable = those that exist AND are not yet billed
  const billable = ids
    .map(Number)
    .filter(id => foundIds.has(id) && !alreadySet.has(id));

  // console.log('[INVOICE][SETS] found =', foundIds.size, 'already =', alreadySet.size, 'billable =', billable);

  // UPDATE: set pvm_laskutus = CURRENT_DATE for billable rows only
  let updated = 0;
  let updatedIds: number[] = [];
  if (billable.length > 0) {
    const updQ = buildInvoiceManyUpdateQuery(billable);
    // console.log('[INVOICE][UPDATE][SQL]', updQ.sql.trim(), updQ.params);
    const upd = await pool.query(updQ.sql, updQ.params);
    updated = upd.rowCount ?? 0;

    // Read returned ids (again accept both naming styles)
    updatedIds = (upd.rows ?? [])
      .map((r: any) => numOrUndef(pick(r, 'kuorma_id', 'kuormaId')))
      .filter((n: number | undefined): n is number => n !== undefined);

    // console.log('[INVOICE][UPDATE][RESULT] updated =', updated, 'ids =', updatedIds, 'raw sample =', upd.rows?.[0]);
  } else {
    // console.log('[INVOICE][UPDATE] nothing billable (all already billed or not found)');
  }

  // Summary stats for the response
  const alreadyBilled = alreadySet.size;
  const notFound = total - foundIds.size;

  const out = { total, updated, alreadyBilled, notFound, updatedIds };
  //console.log('[INVOICE][OUT]', out);
  return out;
}
