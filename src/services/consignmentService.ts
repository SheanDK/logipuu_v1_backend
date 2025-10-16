// import pool from '../config/db';
// import {
//   buildConsignmentSearchQuery,
//   buildGetConsignmentByIdQuery,
//   buildInsertConsignmentQuery,
//   buildUpdateConsignmentQuery,
// } from '../queries/consignmentQueries';

// export type ConsignmentFilters = {
//   dateFrom: string;
//   dateTo: string;
//   customerId: number | null;
//   vehicleId: number | null;
//   unbilled: boolean;
//   billed: boolean;
// };

// // Database row type (snake_case aliases from SQL)
// export type ConsignmentRowDb = {
//   rahti_id: number;
//   pvm: string | null;
//   reitti: string | null;
//   lisatiedot: string | null;
//   rahtikirjan_nro: string | null;

//   m3: number | null;
//   m3_hinta: number | null;
//   km: number | null;
//   km_hinta: number | null;
//   kpl: number | null;
//   kpl_hinta: number | null;
//   jako: number | null;
//   jako_hinta: number | null;
//   tievero: number | null;
//   kokohinta: number | null;

//   asiakas: string | null;
//   auto_nro: string | null;
//   knimi: string | null;
//   pvm_laskutus: string | null;
//   kuorma_id: number;
// };

// export type SaveConsignmentDto = {
//   kuormaId?: number;
//   date?: string | null;  // YYYY-MM-DD
//   waybillNumber?: string | null;
//   route?: string | null;
//   notes?: string | null;

//   m3?: number | null;
//   m3_hinta?: number | null;
//   km?: number | null;
//   km_hinta?: number | null;
//   kpl?: number | null;
//   kpl_hinta?: number | null;
//   jako?: number | null;
//   jako_hinta?: number | null;

//   tievero?: number | null;
//   koko_hinta?: number | null;
// };

// export type InvoiceResult = {
//   updated: number;
//   updatedKuormaIds: number[];
//   alreadyBilled: number;
//   alreadyIds: number[];
//   notFound: number;
//   notFoundIds: number[];
//   billedDate: string; // YYYY-MM-DD
// };

// /**
//  * Search consignments using parameterized SQL built by the query helper.
//  */
// export async function searchConsignments(filters: ConsignmentFilters): Promise<ConsignmentRowDb[]> {
//   const { sql, params } = buildConsignmentSearchQuery(filters);
//   const result = await pool.query(sql, params);
//   return (result.rows ?? []) as ConsignmentRowDb[];
// }

// /**
//  * Fetch a single consignment by rahti_id.
//  */
// export async function getConsignmentById(id: number): Promise<ConsignmentRowDb | null> {
//   const { sql, params } = buildGetConsignmentByIdQuery(id);
//   const res = await pool.query(sql, params);
//   return (res.rows?.[0] as ConsignmentRowDb) ?? null;
// }

// /**
//  * Insert a new consignment and return its new rahti_id.
//  * Accepts either snake_case or camelCase id in the RETURNING row (defensive).
//  */
// export async function createConsignment(dto: any): Promise<number> {
//   const { sql, params } = buildInsertConsignmentQuery(dto);
//   // console.log('[CONS][INSERT][SQL]', sql.trim());
//   // console.log('[CONS][INSERT][PARAMS]', params);
//   const r = await pool.query(sql, params);

//   // console.log('[CONS][INSERT][RAW ROWS]', r.rows);

//   // Read both snake_case and camelCase field names
//   const rec = (r.rows?.[0] ?? {}) as any;
//   const rawId = rec.rahti_id ?? rec.rahtiId ?? rec.id;
//   const newId = Number(rawId);

//   // console.log('[CONS][INSERT][NEW-ID]', rawId, '->', newId);

//   return newId;
// }

// /**
//  * Partially update a consignment. Returns true if any row was updated.
//  * If the query builder produced no SETs, we treat it as a no-op success.
//  */
// export async function updateConsignment(id: number, dto: any): Promise<boolean> {
//   const { sql, params } = buildUpdateConsignmentQuery(id, dto);
//   if (!sql) return true;
//   // console.log('[CONS][UPDATE][SQL]', sql.trim());
//   // console.log('[CONS][UPDATE][PARAMS]', params);
//   const r = await pool.query(sql, params);
//   return (r.rowCount ?? 0) > 0;
// }

// /**
//  * Check whether a consignment (by rahti_id) is billed.
//  * Returns:
//  *  - 'ok'       -> exists and not billed
//  *  - 'billed'   -> exists and has pvm_laskutus
//  *  - 'notfound' -> no matching row
//  */
// export async function checkConsignmentStatus(id: number): Promise<'ok' | 'billed' | 'notfound'> {
//   const pre = await pool.query(
//     `SELECT kk.pvm_laskutus
//        FROM rahtikirja rk
//        JOIN kuorma kk ON kk.kuorma_id = rk.kuorma_id
//       WHERE rk.rahti_id = $1`,
//     [id]
//   );
//   if ((pre.rowCount ?? 0) === 0) return 'notfound';
//   const billed = pre.rows[0]?.pvm_laskutus != null;
//   return billed ? 'billed' : 'ok';
// }

// /**
//  * Delete a consignment row by rahti_id. Returns true if a row was deleted.
//  */
// export async function deleteConsignment(id: number): Promise<boolean> {
//   const r = await pool.query(
//     `DELETE FROM rahtikirja WHERE rahti_id = $1`,
//     [id]
//   );
//   return (r.rowCount ?? 0) > 0;
// }

// /**
//  * Mark the given loads (kuorma) as billed.
//  * - Reads current billing state for the provided kuormaIds
//  * - Updates only those with NULL pvm_laskutus (sets laskutukseen=3 & pvm_laskutus=CURRENT_DATE)
//  * - Returns counts and id lists for updated/already-billed/not-found
//  * - Executes within a transaction
//  */
// export async function invoiceKuormat(kuormaIds: number[]): Promise<InvoiceResult> {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     // Fetch current billing state for the loads
//     const sel = await client.query<{ kuorma_id: number; pvm_laskutus: string | null }>(
//       `
//       SELECT kuorma_id, pvm_laskutus
//       FROM kuorma
//       WHERE kuorma_id = ANY($1::bigint[])
//       `,
//       [kuormaIds]
//     );

//     const existing = new Set(sel.rows.map(r => r.kuorma_id));
//     const notFoundIds = kuormaIds.filter(id => !existing.has(id));

//     const alreadyIds = sel.rows.filter(r => r.pvm_laskutus !== null).map(r => r.kuorma_id);
//     const toUpdateIds = sel.rows.filter(r => r.pvm_laskutus === null).map(r => r.kuorma_id);

//     let updated = 0;
//     let updatedKuormaIds: number[] = [];
//     let billedDate = new Date().toISOString().slice(0, 10);

//     if (toUpdateIds.length) {
//       const upd = await client.query<{ kuorma_id: number; pvm_laskutus: string }>(
//         `
//         UPDATE kuorma
//         SET laskutukseen = 3,
//             pvm_laskutus = CURRENT_DATE
//         WHERE kuorma_id = ANY($1::bigint[])
//         RETURNING kuorma_id, pvm_laskutus
//         `,
//         [toUpdateIds]
//       );
//       updated = upd.rowCount || 0;
//       updatedKuormaIds = upd.rows.map(r => Number(r.kuorma_id));
//       if (upd.rows[0]?.pvm_laskutus) billedDate = String(upd.rows[0].pvm_laskutus).slice(0, 10);
//     }

//     await client.query('COMMIT');

//     return {
//       updated,
//       updatedKuormaIds,
//       alreadyBilled: alreadyIds.length,
//       alreadyIds,
//       notFound: notFoundIds.length,
//       notFoundIds,
//       billedDate,
//     };
//   } catch (e) {
//     await client.query('ROLLBACK');
//     throw e;
//   } finally {
//     client.release();
//   }
// }
