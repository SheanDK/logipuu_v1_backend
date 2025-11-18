// backend/src/controllers/timberStackController.ts
import { Response, NextFunction } from 'express';
import * as timberStackService from '../services/timberStackService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CreateTimberStackDto } from '../dto/timberStack.dto'; // UpdateTimberStackDto is no longer needed here
import { ITimberStackFilters, IUpdateTimberStackFullDto, UpdateTimberStackLocationDto, ITimberStackListFilters  } from '../types';

export const getAllTimberStacksHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const filters: ITimberStackFilters = {
            clientId: req.query.clientId as string | undefined,
            status: req.query.status as 'all' | 'active' | undefined,
            vehicleId: req.query.vehicleId as string | undefined,
            timberTypeId: req.query.timberTypeId as string | undefined,
        };
        
        const stacks = await timberStackService.getAllTimberStacks(filters);
        res.status(200).json(stacks);
    } catch (error) { 
        next(error); 
    }
};

export const getTimberStackByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });
        const stack = await timberStackService.getTimberStackById(id);
        if (!stack) return res.status(404).json({ message: 'Timber stack not found' });
        res.status(200).json(stack);
    } catch (error) { next(error); }
};

export const createTimberStackHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const dto = req.body as CreateTimberStackDto;
        const newStack = await timberStackService.createTimberStack(dto);
        res.status(201).json(newStack);
    } catch (error) {
        next(error);
    }
};

export const getTimberStackFullDetailsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });
        const details = await timberStackService.getTimberStackFullDetails(id);
        if (!details) return res.status(404).json({ message: 'Timber stack details not found' });
        res.status(200).json(details);
    } catch (error) { next(error); }
};

export const updateTimberStackFullHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });

        const dto = req.body as IUpdateTimberStackFullDto;
        
        await timberStackService.updateTimberStackFull(id, dto);
        res.status(200).json({ message: 'Timber stack updated successfully' });
    } catch (error) { 
        next(error); 
    }
};

// --- REMOVED THE UNUSED HANDLER ---
// export const updateTimberStackHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => { ... };

export const deleteTimberStackHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });
        
        // deleteTimberStack වෙනුවට deactivateTimberStack call කරන්න
        const result = await timberStackService.deactivateTimberStack(id);
        
        if (!result) return res.status(404).json({ message: 'Timber stack not found.' });
        
        res.status(200).json(result);
    } catch (error) { 
        next(error); 
    }
};

export const updateLocationHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        // DTO එක, 'res.locals' වෙනුවට, 'req.body' වෙතින් ලබාගන්න
        const dto = req.body as UpdateTimberStackLocationDto;

        // Validate a
        if (isNaN(id) || dto.latitude == null || dto.longitude == null) {
            return res.status(400).json({ message: "Invalid ID or missing location data provided." });
        }
        
        const updatedLocation = await timberStackService.updateTimberStackLocation(id, dto);
        
        if (!updatedLocation) {
            return res.status(404).json({ message: 'Timber stack not found for location update.' });
        }
        
        res.status(200).json(updatedLocation);
    } catch (error) { 
        next(error); 
    }
};

// --- NEW HANDLER Marker Move ---
export const updateTimberStackLocationHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID format." });

        const dto = res.locals.validatedDto as UpdateTimberStackLocationDto;

        const updatedLocation = await timberStackService.updateTimberStackLocation(id, dto);
        if (!updatedLocation) {
            return res.status(404).json({ message: 'Timber stack not found for location update.' });
        }
        res.status(200).json(updatedLocation);
    } catch (error) {
        next(error);
    }
};

// --- THIS IS THE HANDLER FOR THE PUULAANI LIST VIEW ---
export const getTimberStackListHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // Extract and typecast filters from query parameters
        const filters: ITimberStackListFilters = {
            clientId: req.query.clientId as string | undefined,
            status: req.query.status as 'all' | 'active' | 'completed' | undefined,
            vehicleId: req.query.vehicleId as string | undefined,
            timberTypeId: req.query.timberTypeId as string | undefined,
        };
        
        const stackList = await timberStackService.getTimberStackList(filters);
        res.status(200).json(stackList);
    } catch (error) { 
        next(error); 
    }
};

// --- THIS IS THE NEW HANDLER THAT WAS MISSING ---
export const getTimberTypesForStackHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid Puulaani ID format." });
        }
        
        const timberTypes = await timberStackService.getTimberTypesForStack(id);
        
        // It's good practice to return an empty array if nothing is found, 
        // rather than a 404, unless the main stack itself doesn't exist.
        res.status(200).json(timberTypes);
    } catch (error) {
        next(error);
    }
};

export const getActiveTimberStacksByClientHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const clientIdString = req.params.clientId;
        const clientId = parseInt(clientIdString, 10);

        if (isNaN(clientId) || clientId <= 0) {
            console.error(`[Controller Error] Invalid Client ID received: '${clientIdString}'`);
            return res.status(400).json({ message: "Invalid Client ID format." });
        }

        const stacks = await timberStackService.getActiveTimberStacksByClient(clientId);
        res.status(200).json(stacks);

    } catch (error) {
        next(error);
    }
};

export const getWoodEntriesByPuulaaniIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        const woodEntries = await timberStackService.getWoodEntriesByPuulaaniId(id);
        res.status(200).json(woodEntries);
    } catch (error) { next(error); }
};