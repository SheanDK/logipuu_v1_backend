// backend/src/services/socketService.ts
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../middlewares/authMiddleware';
import pool from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_dev_change_this';

class SocketService {
    emit(arg0: string, updatedLoad: any) {
        throw new Error('Method not implemented.');
    }
    private static instance: SocketService;
    private io: Server | null = null;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    // Initializes the Socket.IO server with CORS options.
    // @param httpServer The HTTP server instance from Express.
    // @param frontendUrl The allowed origin for CORS.
    public initialize(httpServer: HttpServer, frontendUrl: string): void {
        if (this.io) {
            console.warn("Socket.IO server is already initialized.");
            return;
        }

        this.io = new Server(httpServer, {
            cors: {
                origin: frontendUrl,
                methods: ["GET", "POST"]
            }
        });

        console.log("✅ Socket.IO server initialized and listening for connections.");

        this.io.on('connection', (socket: Socket) => {
            console.log(`🔌 New client connected: ${socket.id}`);

            try {
                const { token, vehicleId } = socket.handshake.auth;

                if (!token) { throw new Error("No token provided"); }
                if (!vehicleId) { throw new Error("No vehicleId provided"); }

                const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;

                if (!decoded.driverNumericId) {
                    throw new Error("Token is invalid for a tracking session (missing driver ID)");
                }

                (socket as any).user = {
                    ...decoded,
                    kalustoNro: parseInt(vehicleId, 10)
                };

                const user = (socket as any).user;
                console.log(`[Socket Auth] Client ${socket.id} authenticated as Driver ID: ${user.driverNumericId}, Vehicle: ${user.kalustoNro}`);

                socket.join('dispatchers');
                socket.join(`driver_${user.driverNumericId}`);

                this.handleLocationUpdates(socket);

            } catch (error: any) {
                console.log(`[Socket Auth] Authentication failed for ${socket.id}: ${error.message}. Disconnecting.`);
                socket.disconnect();
                return;
            }

            socket.on('disconnect', () => {
                const user = (socket as any).user;
                const reason = user ? `Driver ID ${user.driverNumericId}` : 'Unauthenticated user';
                console.log(`🔌 Client disconnected: ${reason} (Socket ID: ${socket.id})`);
            });
        });
    }

    // Private helper to encapsulate event listeners for an authenticated socket.
    private handleLocationUpdates(socket: Socket): void {
        socket.on('updateLocation', (coords: { lat: number; lng: number }) => {
            const user = (socket as any).user as UserPayload;
            if (!user || !user.kalustoNro) return;

            console.log(`📍 Received location from Driver ${user.driverNumericId} for Vehicle ${user.kalustoNro}:`, coords);

            this.updateVehicleLocationInDb(user.kalustoNro, coords.lat, coords.lng);

            const locationPayload = {
                vehicleId: user.kalustoNro,
                driverId: user.driverNumericId,
                lat: coords.lat,
                lng: coords.lng,
                timestamp: Date.now()
            };
            this.emitLocationUpdate(locationPayload);
        });
    }

    // Updates the vehicle's last known location in the 'kalusto' table.
    private async updateVehicleLocationInDb(vehicleId: number, lat: number, lng: number): Promise<void> {
        const query = `
            UPDATE public.kalusto
            SET 
                viim_sijainti_lat = $1,
                viim_sijainti_long = $2,
                viim_sijainti_aika = NOW()
            WHERE kalusto_nro = $3;
        `;
        try {
            await pool.query(query, [lat, lng, vehicleId]);
            console.log(`[DB Update] Successfully updated location for vehicle ${vehicleId}`);
        } catch (error) {
            console.error(`[DB Update] FAILED to update location for vehicle ${vehicleId}:`, error);
        }
    }

    // Emits the location update to all connected dispatchers.
    public emitLocationUpdate(locationPayload: any) {
        if (this.io) {
            this.io.to('dispatchers').emit('newDriverLocation', locationPayload);
            console.log(`🚀 Broadcasted location update for vehicle: ${locationPayload.vehicleId}`);
        }
    }

    // Returns the Socket.IO server instance.
    public getIO(): Server {
        if (!this.io) {
            throw new Error("Socket.IO not initialized. Call initialize() first.");
        }
        return this.io;
    }
}

export const socketService = SocketService.getInstance();