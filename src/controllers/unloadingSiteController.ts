// backend/src/controllers/unloadingSiteController.ts
import { Response, NextFunction } from 'express';
import * as unloadingSiteService from '../services/unloadingSiteService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CreateUnloadingSiteDto, UpdateUnloadingSiteDto, UpdateUnloadingSiteVisibilityDto } from '../dto/unloadingSite.dto';

// 1. --- GET ALL UNLOADING SITES ---
export const getAllUnloadingSitesHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const sites = await unloadingSiteService.getAllUnloadingSites();
        res.status(200).json(sites);
    } catch (error) { next(error); }
};

// 2. --- GET UNLOADING SITE BY ID ---
export const getUnloadingSiteByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });
        const site = await unloadingSiteService.getUnloadingSiteById(id);
        if (!site) return res.status(404).json({ message: 'Unloading site not found' });
        res.status(200).json(site);
    } catch (error) { next(error); }
};

// 3. --- GET UNLOADING SITES BY CLIENT ID ---
export const getUnloadingSitesByClientIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const clientId = parseInt(req.params.clientId as string, 10);
        if (isNaN(clientId)) return res.status(400).json({ message: "Invalid Client ID format." });

        const sites = await unloadingSiteService.getUnloadingSitesByClientId(clientId);
        res.status(200).json(sites);
    } catch (error) { next(error); }
};

// 4. --- UPDATE UNLOADING SITE VISIBILITY ---
export const updateUnloadingSiteVisibilityHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        const { isVisible } = req.body as UpdateUnloadingSiteVisibilityDto;
        const updatedSite = await unloadingSiteService.updateUnloadingSiteVisibility(id, isVisible);
        if (!updatedSite) return res.status(404).json({ message: 'Unloading site not found' });
        res.status(200).json(updatedSite);
    } catch (error) { next(error); }
};

// 5. --- CREATE UNLOADING SITE ---
export const createUnloadingSiteHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const dto = req.body as CreateUnloadingSiteDto;
        const newSite = await unloadingSiteService.createUnloadingSite(dto);
        res.status(201).json(newSite);
    } catch (error) { next(error); }
};

// 6. --- UPDATE UNLOADING SITE ---
export const updateUnloadingSiteHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });
        const dto = req.body as UpdateUnloadingSiteDto;
        const updatedSite = await unloadingSiteService.updateUnloadingSite(id, dto);
        if (!updatedSite) return res.status(404).json({ message: 'Unloading site not found for update' });
        res.status(200).json(updatedSite);
    } catch (error) { next(error); }
};

// 7. --- DELETE UNLOADING SITE ---
export const deleteUnloadingSiteHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });
        const result = await unloadingSiteService.deleteUnloadingSite(id);
        if (!result) return res.status(404).json({ message: 'Unloading site not found for deletion' });
        res.status(200).json(result);
    } catch (error) { next(error); }
};

