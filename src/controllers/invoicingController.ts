// src/controllers/invoicingController.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import * as invoicingService from '../services/invoicingService';

// --- helpers ---
const normalizeDate = (d: unknown): string | null => {
  if (d == null) return null;
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const s = String(d);
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }
  return null;
};

const pick = (r: any, ...keys: string[]) =>
  keys.find(k => r[k] !== undefined) ? r[keys.find(k => r[k] !== undefined)!] : undefined;

const num = (v: any) => (v == null || v === '' ? 0 : Number(v));

// --- map DB row -> FE payload ---
const mapRowToPayload = (r: any) => ({
  id: pick(r, 'kuorma_id', 'kuormaId', 'kuormaid'),
  date: normalizeDate(pick(r, 'pvm')),
  customer: pick(r, 'asiakas'),
  vehicle: pick(r, 'auto_nro', 'autoNro', 'autonro'),
  woodType: pick(r, 'puutavara'),

  quantityM3: num(pick(r, 'm3')),
  unitPrice: num(pick(r, 'm3_hinta', 'm3Hinta')),
  sum: num(pick(r, 'kokohinta')),

  billed: pick(r, 'pvmLaskutus') != null,
  billedDate: normalizeDate(pick(r, 'pvmLaskutus')),

  puulaaniName: pick(r, 'pnimi'),
  waybillNumber: pick(r, 'ajomaarays_nro', 'ajomaaraysNro', 'ajomaaraysnro'),
  vastaanottoNro: pick(r, 'vastaanotto_nro', 'vastaanottoNro', 'vastaanottonro'),
  driverName: pick(r, 'knimi'),
  route: pick(r, 'reitti'),
  notes: pick(r, 'lisatiedot'),

  km: num(pick(r, 'km')),
  unitPriceKm: num(pick(r, 'km_hinta', 'kmHinta', 'unitPriceKm', 'unitpricekm')),

  hours: num(pick(r, 'tunnit', 'hours')),
  unitPriceHour: num(pick(r, 'tunnit_hinta', 'tunnitHinta', 'unitPriceHour', 'unitpricehour')),

  pieces: num(pick(r, 'kpl', 'pieces')),
  unitPricePiece: num(pick(r, 'kpl_hinta', 'kplHinta', 'unitPricePiece', 'unitpricepiece')),
});


// 1. --- SEARCH ---
export const searchInvoicingHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { dateFrom, dateTo, customerId, vehicleId, woodTypeIds, unbilled, billed } =
      req.query as Record<string, string | undefined>;

    const filters = {
      dateFrom: dateFrom ?? '',
      dateTo: dateTo ?? '',
      customerId: customerId ? Number(customerId) : null,
      vehicleId: vehicleId ? Number(vehicleId) : null,
      woodTypeIdList: (woodTypeIds ?? '')
        .split(',').map(s => s.trim()).filter(Boolean)
        .map(Number).filter(n => !Number.isNaN(n)),
      unbilled: unbilled === '1',
      billed: billed === '1',
    };

    const rows = await invoicingService.searchInvoicing(filters);
    const payload = rows.map(mapRowToPayload);
    res.status(200).json(payload);
  } catch (e) { next(e); }
};

// 2. --- UPDATE ---
export const updateInvoicingHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' });
    const {
      waybillNumber, vastaanottoNro, route, notes,
      quantityM3, km, hours, pieces,
      unitPriceM3, unitPriceKm, unitPriceHour, unitPricePiece,
      total, billedDate,
    } = (req.body ?? {}) as any;

    const ok = await invoicingService.updateInvoicingRow(id, {
      waybillNumber, vastaanottoNro, route, notes,
      m3: quantityM3, km, hours, pieces,
      unitPriceM3, unitPriceKm, unitPriceHour, unitPricePiece,
      kokohinta: total, billedDate,
    });

    //console.log('[INVOICING][PATCH] update result ok =', ok);
    if (!ok) return res.status(404).json({ message: 'Row not found' });

    const fresh = await invoicingService.getInvoicingRowById(id);
    if (!fresh) return res.status(404).json({ message: 'Row not found after update' });
    const payload = mapRowToPayload(fresh as any);
    res.status(200).json(payload);
  } catch (e) { next(e); }
};

// 3. --- INVOICE MANY ---
export const invoiceManyHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const raw = (req.body?.ids ?? []) as Array<string | number>;
    const ids = raw.map(n => Number(n)).filter(n => Number.isFinite(n));
    if (!ids.length) return res.status(400).json({ message: 'No ids provided' });
    const result = await invoicingService.invoiceMany(ids);
    return res.status(200).json(result);
  } catch (e) { next(e); }
};


