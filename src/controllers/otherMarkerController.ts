import { Request, Response, NextFunction } from 'express';
import * as service from '../services/otherMarkerService';
import { CreateOtherMarkerDto, UpdateOtherMarkerDto } from '../dto/otherMarker.dto';

export const getAllHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await service.getAllOtherMarkers();
        res.status(200).json(data);
    } catch (error) { next(error); }
};

export const getByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) { return res.status(400).json({ message: "Invalid ID format." }); }

        const data = await service.getOtherMarkerById(id);
        if (!data) { return res.status(404).json({ message: "Marker not found." }); }

        res.status(200).json(data);
    } catch (error) { next(error); }
};

export const createHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const dto = (res.locals.validatedDto || req.body) as CreateOtherMarkerDto;
        const newData = await service.createOtherMarker(dto);
        res.status(201).json(newData);
    } catch (error) { next(error); }
};

export const updateHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) { return res.status(400).json({ message: "Invalid ID format." }); }

        const dto = (res.locals.validatedDto || req.body) as UpdateOtherMarkerDto;
        const updatedData = await service.updateOtherMarker(id, dto);

        if (!updatedData) { return res.status(404).json({ message: 'Marker not found for update.' }); }

        res.status(200).json(updatedData);
    } catch (error) { next(error); }
};

export const deleteHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) { return res.status(400).json({ message: "Invalid ID format." }); }

        const success = await service.deleteOtherMarker(id);
        if (!success) { return res.status(404).json({ message: "Marker not found for deletion." }); }

        res.status(204).send();
    } catch (error) { next(error); }
};