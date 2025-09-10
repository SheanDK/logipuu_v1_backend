// backend/src/routes/clientRoutes.ts
import { Router } from 'express';
import * as clientController from '../controllers/clientController'; 
import { protect } from '../middlewares/authMiddleware'; 
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto'; 

const router = Router();

// Define permissions required for each action
const VIEW_CLIENT_PERMISSION = ['clients_view'];
const CREATE_CLIENT_PERMISSION = ['clients_create'];
const EDIT_CLIENT_PERMISSION = ['clients_edit'];
const DELETE_CLIENT_PERMISSION = ['clients_delete'];

// GET all clients: Requires 'client_view' permission
router.get(
    '/',
    protect, 
    authorize([], VIEW_CLIENT_PERMISSION), // Pass permission array as second argument
    clientController.getAllClientsHandler
);

// GET client by ID: Also requires 'client_view' permission
router.get(
    '/:id',
    protect,
    authorize([], VIEW_CLIENT_PERMISSION),
    clientController.getClientByIdHandler
);

// POST a new client: Requires 'client_create' permission
router.post(
    '/',
    protect,
    authorize([], CREATE_CLIENT_PERMISSION), 
    validateDto(CreateClientDto),
    clientController.createClientHandler
);

// PUT to update a client: Requires 'client_edit' permission
router.put(
    '/:id',
    protect,
    authorize([], EDIT_CLIENT_PERMISSION),
    validateDto(UpdateClientDto),
    clientController.updateClientHandler
);

// DELETE a client: Requires 'client_delete' permission
router.delete(
    '/:id',
    protect,
    authorize([], DELETE_CLIENT_PERMISSION),
    clientController.deleteClientHandler
);

export default router;