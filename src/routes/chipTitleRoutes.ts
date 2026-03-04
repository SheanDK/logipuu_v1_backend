// backend/src/routes/chipTitleRoutes.ts
import { Router } from 'express';
import { getAllChipTitles, createChipTitle, updateChipTitle } from '../controllers/chipTitleController';

const router = Router();

// 1. Get All Chip Titles
router.get('/', getAllChipTitles);

// 2. Create Chip Title
router.post('/', createChipTitle);

// 3. Update Chip Title
router.patch('/:id', updateChipTitle);

export default router;