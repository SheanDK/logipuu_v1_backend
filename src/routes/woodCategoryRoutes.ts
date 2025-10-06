import { Router } from 'express';
import * as woodCategoriesController from '../controllers/woodCategoriesController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateWoodCategoryDto, UpdateWoodCategoryDto } from '../dto/woodCategory.dto';

const router = Router();

// Permission constants
const VIEW_WOOD_PERMISSION   = ['wood categories_view'];
const CREATE_WOOD_PERMISSION = ['wood categories_create'];
const EDIT_WOOD_PERMISSION   = ['wood categories_edit'];
const DELETE_WOOD_PERMISSION = ['wood categories_delete'];

router.get('/',    protect, authorize(VIEW_WOOD_PERMISSION),   woodCategoriesController.getAllWoodCategoriesHandler);
router.get('/:id', protect, authorize(VIEW_WOOD_PERMISSION),   woodCategoriesController.getWoodCategoryByIdHandler);
router.post('/',   protect, authorize(CREATE_WOOD_PERMISSION), validateDto(CreateWoodCategoryDto), woodCategoriesController.createWoodCategoryHandler);
router.put('/:id', protect, authorize(EDIT_WOOD_PERMISSION),   validateDto(UpdateWoodCategoryDto), woodCategoriesController.updateWoodCategoryHandler);
router.delete('/:id', protect, authorize(DELETE_WOOD_PERMISSION), woodCategoriesController.deleteWoodCategoryHandler);

export default router;
