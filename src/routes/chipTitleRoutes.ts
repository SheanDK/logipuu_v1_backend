// backend/src/routes/chipTitleRoutes.ts
import { Router } from 'express';
import { getAllChipTitles, createChipTitle, updateChipTitle } from '../controllers/chipTitleController';

const router = Router();

router.get('/', getAllChipTitles);
router.post('/', createChipTitle);
router.patch('/:id', updateChipTitle);

export default router;