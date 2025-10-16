// import { Response, NextFunction } from 'express';
// import { AuthenticatedRequest } from '../middlewares/authMiddleware';
// import * as consignmentService from '../services/consignmentService';

// /* -----------------------------------------------------------------------------
//  * Helpers
//  * ---------------------------------------------------------------------------*/

// /**
//  * Normalize an input into ISO date "YYYY-MM-DD".
//  * - Accepts Date, ISO-like string, or anything parsable by Date().
//  * - Returns null when not parseable.
//  */
// const normalizeDate = (d: unknown): string | null => {
//   if (d == null) return null;
//   if (d instanceof Date) {
//     const y = d.getFullYear();
//     const m = String(d.getMonth() + 1).padStart(2, '0');
//     const day = String(d.getDate()).padStart(2, '0');
//     return `${y}-${m}-${day}`;
//   }
//   const s = String(d);
//   const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
//   if (m) return m[0];
//   const parsed = new Date(s);
//   if (!Number.isNaN(parsed.getTime())) {
//     const y = parsed.getFullYear();
//     const mm = String(parsed.getMonth() + 1).padStart(2, '0');
//     const dd = String(parsed.getDate()).padStart(2, '0');
//     return `${y}-${mm}-${dd}`;
//   }
//   return null;
// };

// /** Pick the first defined property value from a set of candidate keys. */
// const pick = (r: any, ...keys: string[]) => {
//   const k = keys.find(k => r[k] !== undefined);
//   return k ? r[k] : undefined;
// };

// /** Coerce to number; treat null/empty as 0. */
// const num = (v: any) => (v == null || v === '' ? 0 : Number(v));

// /**
//  * Map a DB row (snake_case) to the frontend payload shape (BillingRow-compatible).
//  * Also supports some legacy/camelCase aliases defensively.
//  */
// const mapRowToPayload = (r: any) => ({
//   id: pick(r, 'rahti_id', 'rahtiId'),
//   kuormaId: pick(r, 'kuorma_id', 'kuormaId'),
//   date: normalizeDate(pick(r, 'pvm')),
//   customer: pick(r, 'asiakas'),
//   vehicle: pick(r, 'auto_nro', 'autoNro'),
//   driverName: pick(r, 'knimi', 'kuljettaja'),
//   waybillNumber: pick(r, 'rahtikirjan_nro', 'rahtikirjanNro'),
//   route: pick(r, 'reitti'),
//   notes: pick(r, 'lisatiedot'),
//   woodType: pick(r, 'puutavara'),

//   // Quantities
//   quantityM3: num(pick(r, 'm3')),
//   km: num(pick(r, 'km')),
//   hours: num(pick(r, 'jako', 'tunnit')),
//   pieces: num(pick(r, 'kpl')),

//   // Unit prices
//   unitPriceM3: num(pick(r, 'm3_hinta', 'm3Hinta')),
//   unitPriceKm: num(pick(r, 'km_hinta', 'kmHinta')),
//   unitPriceHour: num(pick(r, 'jako_hinta', 'tunnit_hinta', 'jakoHinta')),
//   unitPricePiece: num(pick(r, 'kpl_hinta', 'kplHinta')),

//   // Taxes / grand total
//   roadTax: num(pick(r, 'tievero')),
//   total: num(pick(r, 'kokohinta')),

//   // Billing status
//   billed: pick(r, 'pvm_laskutus', 'pvmLaskutus') != null,
//   billedDate: normalizeDate(pick(r, 'pvm_laskutus', 'pvmLaskutus')),
// });

// /* -----------------------------------------------------------------------------
//  * Controllers
//  * ---------------------------------------------------------------------------*/

// /**
//  * GET /api/consignments/search
//  * Query consignments by date range, customer/vehicle, and billing status.
//  * Expects string query params: dateFrom, dateTo, customerId?, vehicleId?, unbilled?, billed?
//  * - unbilled/billed are treated as "1" => true
//  */
// export const searchConsignmentsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//   try {
//     const { dateFrom, dateTo, customerId, vehicleId, unbilled, billed } =
//       req.query as Record<string, string | undefined>;

//     const filters = {
//       dateFrom: dateFrom ?? '',
//       dateTo: dateTo ?? '',
//       customerId: customerId ? Number(customerId) : null,
//       vehicleId: vehicleId ? Number(vehicleId) : null,
//       unbilled: unbilled === '1',
//       billed: billed === '1',
//     };

//     const rows = await consignmentService.searchConsignments(filters);
//     const payload = rows.map(mapRowToPayload);
//     res.status(200).json(payload);
//   } catch (e) {
//     next(e);
//   }
// };

// /**
//  * GET /api/consignments/:id
//  * Fetch a single consignment by its rahti_id.
//  */
// export const getConsignmentByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//   try {
//     const id = Number(req.params.id);
//     if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' });

//     const row = await consignmentService.getConsignmentById(id);
//     if (!row) return res.status(404).json({ message: 'Not found' });

//     const payload = mapRowToPayload(row as any);
//     res.status(200).json(payload);
//   } catch (e) {
//     next(e);
//   }
// };

// /**
//  * POST /api/consignments
//  * Create a consignment row. Body fields are the FE names; they are mapped to DB columns.
//  * Returns the freshly read row (mapped) or a minimal success when id cannot be parsed.
//  */
// export const createConsignmentHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//   try {
//     // console.log('[CONS][POST] BODY =', JSON.stringify(req.body));
//     const b = req.body ?? {};
//     const kuormaId = Number(b.kuormaId);
//     const date = b.date || null;

//     // console.log('[CONS][POST] parsed kuormaId=', kuormaId, 'date=', date);

//     if (!Number.isFinite(kuormaId)) {
//       return res.status(400).json({ message: 'Invalid kuormaId', debug: { kuormaId: b.kuormaId } });
//     }

//     const dto = {
//       kuormaId,
//       pvm: date,
//       rahtikirjanNro: b.waybillNumber ?? null,
//       reitti: b.route ?? null,
//       lisatiedot: b.notes ?? null,
//       m3: Number(b.quantityM3 ?? 0),
//       m3_hinta: Number(b.unitPriceM3 ?? 0),
//       km: Number(b.km ?? 0),
//       km_hinta: Number(b.unitPriceKm ?? 0),
//       kpl: Number(b.pieces ?? 0),
//       kpl_hinta: Number(b.unitPricePiece ?? 0),
//       jako: Number(b.hours ?? 0),
//       jako_hinta: Number(b.unitPriceHour ?? 0),
//       tievero: Number(b.roadTax ?? 0),
//       koko_hinta: Number(b.total ?? 0),
//     };

//     // console.log('[CONS][POST] DTO =', dto);

//     // Additional guard: no numeric field may be NaN
//     for (const [k, v] of Object.entries(dto)) {
//       if (['kuormaId'].includes(k)) continue;
//       if (typeof v === 'number' && !Number.isFinite(v)) {
//         return res.status(400).json({ message: `Invalid numeric field: ${k}`, debug: { [k]: v } });
//       }
//     }

//     const newId = await consignmentService.createConsignment(dto);
//     // console.log('[CONS][POST] CREATED rahti_id =', newId);

//     if (!Number.isFinite(newId)) {
//       // Defensive fallback: avoid fetching by an invalid id
//       return res.status(201).json({
//         message: 'Created consignment, but could not read returning id (check column name transform).',
//       });
//     }

//     const fresh = await consignmentService.getConsignmentById(newId);
//     return res.status(201).json(mapRowToPayload(fresh));
//   } catch (e) {
//     next(e);
//   }
// };

// /**
//  * PATCH /api/consignments/:id
//  * Partially update a consignment row. Only provided fields are updated.
//  * Returns the fresh mapped record.
//  */
// export const updateConsignmentHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//   try {
//     // console.log('[CONS][PATCH] params=', req.params, 'body=', JSON.stringify(req.body));
//     const id = Number(req.params.id);
//     if (!Number.isFinite(id)) {
//       return res.status(400).json({ message: 'Invalid id', debug: { id: req.params.id } });
//     }

//     const b = req.body ?? {};
//     const dto = {
//       pvm: b.date ?? undefined,
//       rahtikirjanNro: b.waybillNumber ?? undefined,
//       reitti: b.route ?? undefined,
//       lisatiedot: b.notes ?? undefined,
//       m3: b.quantityM3,
//       m3_hinta: b.unitPriceM3,
//       km: b.km,
//       km_hinta: b.unitPriceKm,
//       kpl: b.pieces,
//       kpl_hinta: b.unitPricePiece,
//       jako: b.hours,
//       jako_hinta: b.unitPriceHour,
//       tievero: b.roadTax,
//       koko_hinta: b.total,
//     };

//     // console.log('[CONS][PATCH] DTO =', dto);

//     const ok = await consignmentService.updateConsignment(id, dto);
//     if (!ok) return res.status(404).json({ message: 'Row not found' });

//     const fresh = await consignmentService.getConsignmentById(id);
//     return res.status(200).json(mapRowToPayload(fresh));
//   } catch (e) {
//     next(e);
//   }
// };

// /**
//  * DELETE /api/consignments/:id
//  * Deletes a consignment row if it exists and is not billed.
//  * 409 is returned for billed rows, 404 for non-existing ones.
//  */
// export const deleteConsignmentHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//   try {
//     const id = Number(req.params.id);
//     if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' });

//     const status = await consignmentService.checkConsignmentStatus(id);
//     if (status === 'notfound') return res.status(404).json({ message: 'Not found' });
//     if (status === 'billed') return res.status(409).json({ message: 'Cannot delete a billed consignment' });

//     const ok = await consignmentService.deleteConsignment(id);
//     if (!ok) return res.status(404).json({ message: 'Not found' });

//     return res.status(200).json({ deleted: true });
//   } catch (e) {
//     next(e);
//   }
// };

// /**
//  * POST /api/consignments/invoice
//  * Body: { kuormaIds: (number|string)[] }
//  * - Validates body, converts to numeric ids, invoices eligible loads, and returns a summary.
//  */
// export const invoiceManyHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//   try {
//     const body = req.body || {};
//     const ids = Array.isArray(body.kuormaIds) ? body.kuormaIds : [];

//     const kuormaIds: number[] = ids
//       .map((x: unknown) => Number(x))
//       .filter((n: number) => Number.isFinite(n));

//     if (!kuormaIds.length) {
//       return res.status(400).json({ message: 'Invalid body: kuormaIds required (non-empty numeric array).' });
//     }

//     const result = await consignmentService.invoiceKuormat(kuormaIds);
//     return res.status(200).json(result);
//   } catch (err) {
//     next(err);
//   }
// };
