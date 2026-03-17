// backend/src/services/socketService.ts
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../middlewares/authMiddleware';
import pool from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_dev_change_this';

class SocketService {
    public emit(event: string, data: any) {
        if (this.io) {
            this.io.emit(event, data);
        }
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

                if (!token) {
                    console.warn(`[Socket Auth] No token provided for ${socket.id}. Disconnecting.`);
                    socket.disconnect();
                    return;
                }

                const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
                
                // Store user data on socket
                (socket as any).user = {
                    ...decoded,
                    kalustoNro: vehicleId ? parseInt(vehicleId, 10) : undefined
                };

                const user = (socket as any).user;
                console.log(`[Socket Auth] Client ${socket.id} authenticated. User ID: ${user.userId}, Roles: ${user.roles?.join(', ')}`);

                // Always join 'dispatchers' or a global room to receive broadcasts
                socket.join('dispatchers');

                // If this is a driver session, join driver-specific rooms and handle location
                if (user.driverNumericId) {
                    console.log(`[Socket Auth] Driver detected: ID ${user.driverNumericId}, Vehicle: ${user.kalustoNro || 'N/A'}`);
                    socket.join(`driver_${user.driverNumericId}`);
                    this.handleLocationUpdates(socket);
                }

            } catch (error: any) {
                console.log(`[Socket Auth] Authentication failed for ${socket.id}: ${error.message}. Disconnecting.`);
                socket.disconnect();
                return;
            }

            socket.on('disconnect', () => {
                const user = (socket as any).user;
                const identity = user ? (user.driverNumericId ? `Driver ID ${user.driverNumericId}` : `User ID ${user.userId}`) : 'Unauthenticated user';
                console.log(`🔌 Client disconnected: ${identity} (Socket ID: ${socket.id})`);
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