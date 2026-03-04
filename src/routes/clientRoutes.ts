// backend/src/routes/clientRoutes.ts
import { Router } from 'express';
import * as clientController from '../controllers/clientController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';

const router = Router();

// 1. Define Roles
const officeRoles = ['Superuser', 'Admin', 'Office', 'Ajojärjestelijä'];
const driverRoles = ['Kuljettaja'];
const allStaffRoles = [...officeRoles, ...driverRoles];

// 2. Define Permissions
const VIEW_CLIENT_PERMISSION = ['clients_view'];
const CREATE_CLIENT_PERMISSION = ['clients_create'];
const EDIT_CLIENT_PERMISSION = ['clients_edit'];
const DELETE_CLIENT_PERMISSION = ['clients_delete'];

// 3. Get check if color is already in use
router.get(
    '/check-color',
    protect,
    authorize(allStaffRoles, VIEW_CLIENT_PERMISSION),
    clientController.checkColorExistsHandler
);

// 4. GET all clients: Requires 'clients_view' permission, accessible by all staff
router.get(
    '/',
    protect,
    authorize(allStaffRoles, VIEW_CLIENT_PERMISSION),
    clientController.getAllClientsHandler
);

// 5. GET client by ID: Also requires 'clients_view' permission, accessible by all staff
router.get(
    '/:id',
    protect,
    authorize(allStaffRoles, VIEW_CLIENT_PERMISSION),
    clientController.getClientByIdHandler
);

// 6. POST a new client: Restricted to office roles with create permission
router.post(
    '/',
    protect,
    authorize(officeRoles, CREATE_CLIENT_PERMISSION),
    validateDto(CreateClientDto),
    clientController.createClientHandler
);

// 7. PUT to update a client: Restricted to office roles with edit permission
router.put(
    '/:id',
    protect,
    authorize(officeRoles, EDIT_CLIENT_PERMISSION),
    validateDto(UpdateClientDto, { skipMissingProperties: true }), // Allow partial updates
    clientController.updateClientHandler
);

// 8. DELETE a client: Restricted to office roles with delete permission
router.delete(
    '/:id',
    protect,
    authorize(officeRoles, DELETE_CLIENT_PERMISSION),
    clientController.deleteClientHandler
);

export default router;