// backend/src/services/socketService.ts
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../middlewares/authMiddleware';
import pool from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_dev_change_this';

class SocketService {
    private static instance: SocketService;
    private io: Server | null = null;

    private onlineTokens: Set<string> = new Set();

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public getOnlineIdentifiers(): Set<string> {
        return this.onlineTokens;
    }

    public emit(event: string, data: any) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    public emitToVehicle(vehicleNumber: number, event: string, data: any) {
        if (this.io) {
            this.io.to(`vehicle_${vehicleNumber}`).emit(event, data);
            console.log(`🔔 Event '${event}' sent to Vehicle Room: vehicle_${vehicleNumber}`);
        }
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

        this.io.on('connection', (socket: Socket) => {
            const { token, vehicleId } = socket.handshake.auth;

            if (!token) {
                console.warn(`[Socket Auth] No token provided for ${socket.id}. Disconnecting.`);
                socket.disconnect();
                return;
            }

            try {
                const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;

                // 🚀 Add token to online set
                this.onlineTokens.add(token);
                console.log(`🔌 New client connected: ${socket.id}. Total Online Devices: ${this.onlineTokens.size}`);
                this.emitToDispatchers('driverStatusChanged', { userId: decoded.driverNumericId, status: 'online' });

                (socket as any).user = {
                    ...decoded,
                    kalustoNro: (vehicleId !== undefined && vehicleId !== null) ? parseInt(vehicleId, 10) : undefined
                };

                const user = (socket as any).user;
                const userId = decoded.driverNumericId || decoded.userId;
                const isOfficeUser = decoded.roles?.some(r => ['Ajojärjestelijä', 'Ylläpitäjä', 'Admin', 'Superuser'].includes(r));

                if (isOfficeUser) {
                    socket.join('dispatchers');
                } else {
                    if (decoded.driverNumericId) {
                        socket.join(`user_${decoded.driverNumericId}`);
                        socket.join(`driver_${decoded.driverNumericId}`);
                    }
                }

                if (user.kalustoNro !== undefined && user.kalustoNro !== null) {
                    socket.join(`vehicle_${user.kalustoNro}`);
                }

                socket.on('disconnect', async () => {
                    this.onlineTokens.delete(token);
                    console.log(`🔌 Client disconnected: ${socket.id}. Remaining Online: ${this.onlineTokens.size}`);
                    this.emitToDispatchers('driverStatusChanged', { userId: decoded.driverNumericId, status: 'offline' });
                    if (isOfficeUser) return;

                    try {
                        const deleteRes = await pool.query(
                            `DELETE FROM public.driver_active_sessions WHERE token_identifier = $1 RETURNING user_id`,
                            [token]
                        );

                        if (deleteRes.rowCount && deleteRes.rowCount > 0) {
                            const dbUserId = deleteRes.rows[0].user_id;

                            const checkRemainingRes = await pool.query(
                                `SELECT count(*) FROM public.driver_active_sessions WHERE user_id = $1`,
                                [dbUserId]
                            );

                            const activeCount = parseInt(checkRemainingRes.rows[0].count);

                            if (activeCount === 0) {
                                await pool.query(
                                    `UPDATE public.kayttajat SET current_vehicle_id = NULL WHERE kulj_id = $1`,
                                    [dbUserId]
                                );
                                console.log(`✅ [AUTO-RELEASE] Vehicle freed for Driver ${dbUserId} (All tabs closed).`);
                            }

                            this.emitToDispatchers('chipLoadUpdated', { action: 'SESSION_CLEANUP' });
                        }
                    } catch (dbErr) {
                        console.error("❌ Cleanup failed on disconnect:", dbErr);
                    }
                });

                if (!isOfficeUser) {
                    this.handleLocationUpdates(socket);
                }

            } catch (error: any) {
                console.log(`[Socket Auth] Authentication failed for ${socket.id}: ${error.message}`);
                socket.disconnect();
            }
        });
    }

    private handleLocationUpdates(socket: Socket): void {
        socket.on('updateLocation', (coords: { lat: number; lng: number }) => {
            const user = (socket as any).user as UserPayload;
            if (!user || !user.kalustoNro) return;

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

    private async updateVehicleLocationInDb(vehicleId: number, lat: number, lng: number): Promise<void> {
        const query = `UPDATE public.kalusto SET viim_sijainti_lat = $1, viim_sijainti_long = $2, viim_sijainti_aika = NOW() WHERE kalusto_nro = $3;`;
        try {
            await pool.query(query, [lat, lng, vehicleId]);
        } catch (error) {
            console.error(`[DB Update] FAILED for vehicle ${vehicleId}:`, error);
        }
    }

    public emitLocationUpdate(locationPayload: any) {
        if (this.io) {
            this.io.to('dispatchers').emit('newDriverLocation', locationPayload);
        }
    }

    public getIO(): Server {
        if (!this.io) {
            throw new Error("Socket.IO not initialized.");
        }
        return this.io;
    }

    public emitToDispatchers(event: string, data: any) {
        if (this.io) {
            this.io.to('dispatchers').emit(event, data);
            console.log(`🚀 Real-time notification broadcasted to all Dispatchers: ${event}`);
        }
    }

    public emitToUser(userId: number, event: string, data: any) {
        if (this.io) {
            this.io.to(`user_${userId}`).emit(event, data);
            console.log(`👤 Notification sent to User Room: user_${userId}`);
        }
    }
}

export const socketService = SocketService.getInstance();