// src/services/invoicingService.ts
import pool from '../config/db';
import {
  buildGetInvoicingRowByIdQuery,
  buildInvoicingSearchQuery,
  buildUpdateInvoicingRowQuery,
  buildInvoicePrefetchQuery,
  buildInvoiceManyUpdateQuery,
} from '../queries/invoicingQueries';

// 1. Invoicing Filters
export type InvoicingFilters = {
  dateFrom: string;
  dateTo: string;
  customerId: number | null;
  vehicleId: number | null;
  woodTypeIdList: number[];
  unbilled: boolean;
  billed: boolean;
};

// 2. Invoicing Row
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

// 3. Update Invoicing DTO
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

// 4. Search Invoicing
export async function searchInvoicing(filters: InvoicingFilters): Promise<InvoicingRow[]> {
  const { sql, params } = buildInvoicingSearchQuery(filters);
  // console.log('[INVOICING][SEARCH][SQL]', sql, params);
  const result = await pool.query(sql, params);
  return (result.rows ?? []) as InvoicingRow[];
}

// 5. Update Invoicing Row
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

// 6. Get Invoicing Row by ID
export async function getInvoicingRowById(id: number): Promise<InvoicingRow | null> {
  const { sql, params } = buildGetInvoicingRowByIdQuery(id);
  // console.log('[INVOICING][GET-BY-ID][SQL]', sql, params);
  const res = await pool.query(sql, params);
  return (res.rows?.[0] as InvoicingRow) ?? null;
}

// 7. Invoice Many
export async function invoiceMany(ids: number[]): Promise<{
  total: number;
  updated: number;
  alreadyBilled: number;
  notFound: number;
  updatedIds: number[];
}> {
  const total = ids.length;
  //console.log('[INVOICE][IN] ids =', ids, 'count =', total);

  const pick = (r: any, ...keys: string[]) => {
    const k = keys.find(k => r[k] !== undefined);
    return k ? r[k] : undefined;
  };
  const numOrUndef = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  // 8. Prefetch
  const preQ = buildInvoicePrefetchQuery(ids);
  const pre = await pool.query(preQ.sql, preQ.params);

  const foundIdsArr = (pre.rows ?? [])
    .map((r: any) => numOrUndef(pick(r, 'kuorma_id', 'kuormaId')))
    .filter((n: number | undefined): n is number => n !== undefined);
  const foundIds = new Set<number>(foundIdsArr);

  const alreadySetArr = (pre.rows ?? [])
    .filter((r: any) => pick(r, 'pvm_laskutus', 'pvmLaskutus') != null)
    .map((r: any) => numOrUndef(pick(r, 'kuorma_id', 'kuormaId')))
    .filter((n: number | undefined): n is number => n !== undefined);
  const alreadySet = new Set<number>(alreadySetArr);

  const billable = ids
    .map(Number)
    .filter(id => foundIds.has(id) && !alreadySet.has(id));

  // 9. Update
  let updated = 0;
  let updatedIds: number[] = [];
  if (billable.length > 0) {
    const updQ = buildInvoiceManyUpdateQuery(billable);
    const upd = await pool.query(updQ.sql, updQ.params);
    updated = upd.rowCount ?? 0;

    updatedIds = (upd.rows ?? [])
      .map((r: any) => numOrUndef(pick(r, 'kuorma_id', 'kuormaId')))
      .filter((n: number | undefined): n is number => n !== undefined);

  } else {
  }

  const alreadyBilled = alreadySet.size;
  const notFound = total - foundIds.size;
  const out = { total, updated, alreadyBilled, notFound, updatedIds };
  return out;
}
