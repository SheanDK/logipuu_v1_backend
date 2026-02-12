// backend/src/controllers/clientController.ts
import { Request, Response, NextFunction } from 'express';
import * as clientService from '../services/clientService';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';
import { IClient } from '../types/client.types';

export const createClientHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const clientData = req.body as CreateClientDto;
        const newClient = await clientService.createClient(clientData);
        res.status(201).json(newClient);
    } catch (error: any) {
        if (error.code === '23505' && error.constraint === 'UQ_AsiakkaanNimi') {
            return res.status(409).json({ message: `A client with the name "${req.body.clientName}" already exists.` });
        }
        next(error);
    }
};

export const getAllClientsHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const clients: IClient[] = await clientService.getAllClients();
        res.status(200).json(clients);
    } catch (error) {
        next(error);
    }
};

export const getClientByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const clientId: string = req.params.id as string;
        const client: IClient | null = await clientService.getClientById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.status(200).json(client);
    } catch (error) {
        next(error);
    }
};

export const updateClientHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const clientId: string = req.params.id as string;
        const clientData = req.body as UpdateClientDto;
        const updatedClient: IClient | null = await clientService.updateClient(clientId, clientData);
        if (!updatedClient) {
            return res.status(404).json({ message: 'Client not found for update' });
        }
        res.status(200).json(updatedClient);
    } catch (error) {
        next(error);
    }
};

export const deleteClientHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const clientId: string = req.params.id as string;
        const result = await clientService.deleteClient(clientId);
        if (!result) {
            return res.status(404).json({ message: 'Client not found for deletion' });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const checkColorExistsHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { color, clientId } = req.query;
        if (!color || typeof color !== 'string') {
            return res.status(400).json({ message: 'Color is required.' });
        }
        const exists = await clientService.checkTargetColorExists(color, clientId as string);
        res.status(200).json(exists);
    } catch (error) {
        next(error);
    }
};