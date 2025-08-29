import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import * as controller from '../controllers/otherMarkerController';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateOtherMarkerDto, UpdateOtherMarkerDto } from '../dto/otherMarker.dto';

const router = Router();

// Define permissions if necessary
// const permissions = { view: ['some_permission'], create: ['...'], edit: ['...'], delete: ['...'] };

// GET /api/other-markers/
router.get(
    '/',
    protect,
    // authorize([], permissions.view), // You can add authorization later
    controller.getAllHandler
);

// GET /api/other-markers/:id
router.get(
    '/:id',
    protect,
    controller.getByIdHandler
);

// POST /api/other-markers/
router.post(
    '/',
    protect,
    validateDto(CreateOtherMarkerDto),
    controller.createHandler
);

// PUT /api/other-markers/:id
router.put(
    '/:id',
    protect,
    validateDto(UpdateOtherMarkerDto),
    controller.updateHandler
);

// DELETE /api/other-markers/:id
router.delete(
    '/:id',
    protect,
    controller.deleteHandler
);

export default router;