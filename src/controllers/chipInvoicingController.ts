// backend/src/controllers/chipInvoicingController.ts
import { Request, Response, NextFunction } from 'express';
import { chipInvoicingService } from '../services/chipInvoicingService';

export const searchInvoicing = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters = {
            dateFrom: req.query.dateFrom as string,
            dateTo: req.query.dateTo as string,
            customerId: req.query.customerId ? Number(req.query.customerId) : null,
            vehicleId: req.query.vehicleId ? Number(req.query.vehicleId) : null,
            unbilled: req.query.unbilled === 'true',
            billed: req.query.billed === 'true'
        };
        const data = await chipInvoicingService.search(filters);
        res.json(data);
    } catch (e) { next(e); }
};

export const confirmInvoicing = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { loadIds } = req.body;
        const result = await chipInvoicingService.invoiceLoads(loadIds);
        res.json(result);
    } catch (e) { next(e); }
};

export const updateLoadHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await chipInvoicingService.updateLoad(Number(req.params.id), req.body);
        res.json(result);
    } catch (e) { next(e); }
};