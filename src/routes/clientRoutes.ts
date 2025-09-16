// backend/src/routes/clientRoutes.ts
import { Router } from 'express';
import * as clientController from '../controllers/clientController'; 
import { protect } from '../middlewares/authMiddleware'; 
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto'; 

const router = Router();

// --- Define Roles ---
const officeRoles = ['Superuser', 'Admin', 'Toimisto', 'Ajojärjestelijä'];
const driverRoles = ['Kuljettaja'];
// A combined list for routes accessible by both
const allStaffRoles = [...officeRoles, ...driverRoles];

// --- Define Permissions ---
const VIEW_CLIENT_PERMISSION = ['clients_view'];
const CREATE_CLIENT_PERMISSION = ['clients_create'];
const EDIT_CLIENT_PERMISSION = ['clients_edit'];
const DELETE_CLIENT_PERMISSION = ['clients_delete'];

// GET all clients: Requires 'clients_view' permission, accessible by all staff
router.get(
    '/',
    protect, 
    // --- THIS IS THE FIX ---
    // Pass both the roles and the permission for a more robust check.
    authorize(allStaffRoles, VIEW_CLIENT_PERMISSION), 
    clientController.getAllClientsHandler
);

// GET client by ID: Also requires 'clients_view' permission, accessible by all staff
router.get(
    '/:id',
    protect,
    authorize(allStaffRoles, VIEW_CLIENT_PERMISSION),
    clientController.getClientByIdHandler
);

// POST a new client: Restricted to office roles with create permission
router.post(
    '/',
    protect,
    authorize(officeRoles, CREATE_CLIENT_PERMISSION), 
    validateDto(CreateClientDto),
    clientController.createClientHandler
);

// PUT to update a client: Restricted to office roles with edit permission
router.put(
    '/:id',
    protect,
    authorize(officeRoles, EDIT_CLIENT_PERMISSION),
    validateDto(UpdateClientDto, { skipMissingProperties: true }), // Allow partial updates
    clientController.updateClientHandler
);

// DELETE a client: Restricted to office roles with delete permission
router.delete(
    '/:id',
    protect,
    authorize(officeRoles, DELETE_CLIENT_PERMISSION),
    clientController.deleteClientHandler
);

export default router;