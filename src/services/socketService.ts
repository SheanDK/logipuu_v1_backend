// backend/src/services/socketService.ts
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../middlewares/authMiddleware';
import pool from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_dev_change_this';

// Singleton class to manage the Socket.IO server instance
class SocketService {
    private static instance: SocketService;
    private io: Server | null = null;

    private constructor() {}

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

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

        // --- THE MAIN LOGIC IS UPDATED HERE ---
        this.io.on('connection', (socket: Socket) => {
            console.log(`🔌 New client connected: ${socket.id}`);
            
            // 1. Authenticate the connection
            try {
                const { token, vehicleId } = socket.handshake.auth; // FIX: Destructure both token and vehicleId

                if (!token) { throw new Error("No token provided"); }
                if (!vehicleId) { throw new Error("No vehicleId provided"); } // FIX: Add check for vehicleId

                const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;

                // Ensure the token itself contains the driver ID
                if (!decoded.driverNumericId) {
                    throw new Error("Token is invalid for a tracking session (missing driver ID)");
                }
                
                // FIX: Attach both decoded data and the separate vehicleId to the socket object
                (socket as any).user = {
                    ...decoded,
                    kalustoNro: parseInt(vehicleId, 10) // Use the vehicleId from auth
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

            // Handle disconnection
            socket.on('disconnect', () => {
                const user = (socket as any).user;
                const reason = user ? `Driver ID ${user.driverNumericId}` : 'Unauthenticated user';
                console.log(`🔌 Client disconnected: ${reason} (Socket ID: ${socket.id})`);
            });
        });
    }

    /**
     * Private helper to encapsulate event listeners for an authenticated socket.
     */
     private handleLocationUpdates(socket: Socket): void {
        socket.on('updateLocation', (coords: { lat: number; lng: number }) => {
            const user = (socket as any).user as UserPayload;
            if (!user || !user.kalustoNro) return;

            console.log(`📍 Received location from Driver ${user.driverNumericId} for Vehicle ${user.kalustoNro}:`, coords);
            
            // --- 2. THE FIX IS HERE: Call the function to update the database ---
            this.updateVehicleLocationInDb(user.kalustoNro, coords.lat, coords.lng);


            // Emit this new location to all clients in the "dispatchers" room
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

    // --- 3. ADD THE NEW DATABASE UPDATE FUNCTION ---
    /**
     * Updates the vehicle's last known location in the 'kalusto' table.
     * @param vehicleId - The ID of the vehicle (kalusto_nro).
     * @param lat - The latitude.
     * @param lng - The longitude.
     */
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

    // --- 4. MODIFY THE BROADCAST FUNCTION TO USE THE NEW PAYLOAD ---
    public emitLocationUpdate(locationPayload: any) {
        if (this.io) {
            this.io.to('dispatchers').emit('newDriverLocation', locationPayload);
            console.log(`🚀 Broadcasted location update for vehicle: ${locationPayload.vehicleId}`);
        }
    }

    public getIO(): Server {
        if (!this.io) {
            throw new Error("Socket.IO not initialized. Call initialize() first.");
        }
        return this.io;
    }
}

export const socketService = SocketService.getInstance();