import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import * as woodService from '../services/woodCategoriesService';
import { CreateWoodCategoryDto, UpdateWoodCategoryDto } from '../dto/woodCategory.dto';

export const getAllWoodCategoriesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log(`User ${req.user?.userId} fetching all wood categories.`);
    const items = await woodService.getAllWoodCategories();
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

export const getWoodCategoryByIdHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid wood category ID format.' });

    const item = await woodService.getWoodCategoryById(id);
    if (!item) return res.status(404).json({ message: 'Wood category not found' });

    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
};

export const createWoodCategoryHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const payload = req.body as CreateWoodCategoryDto;
    const created = await woodService.createWoodCategory(payload);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

export const updateWoodCategoryHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid wood category ID format.' });

    const payload = req.body as UpdateWoodCategoryDto;
    const updated = await woodService.updateWoodCategory(id, payload);
    if (!updated) return res.status(404).json({ message: 'Wood category not found for update' });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteWoodCategoryHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid wood category ID format.' });

    const result = await woodService.deleteWoodCategory(id);
    if (!result) return res.status(404).json({ message: 'Wood category not found for deletion' });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
