// backend/src/controllers/waybillController.ts
import { Request, Response, NextFunction } from 'express';
import * as waybillService from '../services/waybillService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CreateWaybillDto, UpdateWaybillDto } from '../dto/waybill.dto';

export const getAllWaybillsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const waybills = await waybillService.getAllWaybills();
        res.status(200).json(waybills);
    } catch (error) { next(error); }
};

export const getWaybillByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });
        const waybill = await waybillService.getWaybillById(id);
        if (!waybill) return res.status(404).json({ message: 'Waybill not found' });
        res.status(200).json(waybill);
    } catch (error) { next(error); }
};

export const createWaybillHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const dto = req.body as CreateWaybillDto;
        const newWaybill = await waybillService.createWaybill(dto);
        res.status(201).json(newWaybill);
    } catch (error) { next(error); }
};

export const updateWaybillHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });
        const dto = req.body as UpdateWaybillDto;
        const updatedWaybill = await waybillService.updateWaybill(id, dto);
        if (!updatedWaybill) return res.status(404).json({ message: 'Waybill not found for update' });
        res.status(200).json(updatedWaybill);
    } catch (error) { next(error); }
};

export const deleteWaybillHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });
        const result = await waybillService.deleteWaybill(id);
        if (!result) return res.status(404).json({ message: 'Waybill not found for deletion' });
        res.status(200).json(result);
    } catch (error) { next(error); }
};