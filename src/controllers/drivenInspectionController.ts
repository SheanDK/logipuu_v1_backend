// backend/src/controllers/drivenInspectionController.ts
import { Response, NextFunction } from 'express';
import * as drivenInspectionService from '../services/drivenInspectionService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { IUpdateDrivenInspectionRowDto, IAcceptEntriesDto, ICreateKuormaFromPtlDto  } from '../types';

export const getListHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const filters = req.query; 
        const list = await drivenInspectionService.getDrivenInspectionList(filters);
        res.status(200).json(list);
    } catch (error) { next(error); }
};

export const updateRowHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        const dto = req.body as IUpdateDrivenInspectionRowDto;
        const updatedRow = await drivenInspectionService.updateDrivenInspectionRow(id, dto);
        if (!updatedRow) return res.status(404).json({ message: "Entry not found." });
        res.status(200).json(updatedRow);
    } catch (error) { next(error); }
};

export const acceptEntriesHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const dto = req.body as IAcceptEntriesDto;
        
        // --- FIX: Validate for 'puutavaraIds' ---
        if (!dto.puutavaraIds || !Array.isArray(dto.puutavaraIds)) {
            return res.status(400).json({ message: "Invalid payload. Expected an object with a 'puutavaraIds' array." });
        }
        
        const result = await drivenInspectionService.acceptEntries(dto);
        res.status(200).json(result);
    } catch (error) { next(error); }
};

export const deleteEntryHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID." });
        
        const result = await drivenInspectionService.deleteDrivenInspectionEntry(id);
        if (!result) return res.status(404).json({ message: "Entry not found." });
        
        res.status(200).json(result);
    } catch (error) { next(error); }
};

export const createHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const dto = req.body as ICreateKuormaFromPtlDto;
        const newEntry = await drivenInspectionService.createKuormaFromPtl(dto);
        res.status(201).json(newEntry);
    } catch (error) {
        next(error);
    }
};