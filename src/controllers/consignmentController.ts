// backend/src/controllers/consignmentController.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import * as consignmentService from '../services/consignmentService';

// GET /api/consignments/search
// Handles searching via query parameters.
export const searchConsignmentsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {

        const { dateFrom, dateTo, customerId, vehicleId, unbilled, billed } = req.query;


        const filters: consignmentService.SearchFilters = {
            dateFrom: dateFrom as string,
            dateTo: dateTo as string,
            customerId: customerId ? Number(customerId) : null,
            vehicleId: vehicleId ? Number(vehicleId) : null,
            unbilled: unbilled === '1' || unbilled === 'true',
            billed: billed === '1' || billed === 'true',
        };

        const data = await consignmentService.searchConsignments(filters);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// GET /api/consignments/:id
// Handles fetching by ID.
export const getConsignmentByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);

        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid ID format." });
        }

        const data = await consignmentService.getConsignmentById(id);
        if (!data) {
            return res.status(404).json({ message: 'Consignment not found.' });
        }
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// POST /api/consignments
// Handles creating a new consignment.
export const createConsignmentHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const newId = await consignmentService.createConsignment(req.body);
        const createdData = await consignmentService.getConsignmentById(newId);
        res.status(201).json(createdData);
    } catch (error) {
        next(error);
    }
};

// PATCH /api/consignments/:id
// Handles updating an existing consignment.
export const updateConsignmentHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });

        const success = await consignmentService.updateConsignment(id, req.body);
        if (!success) return res.status(404).json({ message: 'Update failed or not found.' });

        const updatedData = await consignmentService.getConsignmentById(id);
        res.status(200).json(updatedData);
    } catch (error) {
        next(error);
    }
};

// DELETE /api/consignments/:id
// Handles deleting an existing consignment.
export const deleteConsignmentHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });

        const status = await consignmentService.checkConsignmentStatus(id);
        if (status === 'billed') {
            return res.status(409).json({ message: 'Cannot delete a billed consignment.' });
        }
        if (status === 'notfound') {
            return res.status(404).json({ message: 'Consignment not found.' });
        }

        await consignmentService.deleteConsignment(id);
        res.status(200).json({ deleted: true });
    } catch (error) {
        next(error);
    }
};

// POST /api/consignments/invoice
// Handles invoicing multiple consignments.
export const invoiceManyHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { kuormaIds } = req.body;
        const ids = (Array.isArray(kuormaIds) ? kuormaIds : []).map((x: any) => Number(x)).filter((n: number) => !isNaN(n));

        const result = await consignmentService.invoiceKuormat(ids);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};