// backend/src/services/socketService.ts
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../middlewares/authMiddleware';
import pool from '../config/db';
import { chatService } from './chatService';

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

        this.io.on('connection', async (socket: Socket) => {
            const { token, vehicleId } = socket.handshake.auth;

            if (!token) {
                console.warn(`[Socket Auth] No token provided for ${socket.id}. Disconnecting.`);
                socket.disconnect();
                return;
            }

            const sanitizedToken = token.startsWith('Bearer ') ? token.slice(7) : token;
            (socket as any).sanitizedToken = sanitizedToken;

            console.log(`[Socket Init] Socket ${socket.id} attached with token: ${sanitizedToken.substring(0, 20)}...`);

            try {
                const decoded = jwt.verify(sanitizedToken, JWT_SECRET) as UserPayload;
                this.onlineTokens.add(sanitizedToken);

                const userIdForLog = decoded.driverNumericId || decoded.userId;
                console.log(`[DEBUG-SOCKET] Token stored. User: ${userIdForLog}. Total Online: ${this.onlineTokens.size}`);

                // Fetch the vehicle reg number dynamically to emit to office chat page
                let rekNro: string | null = null;
                if (vehicleId !== undefined && vehicleId !== null) {
                    try {
                        const result = await pool.query('SELECT rek_nro FROM public.kalusto WHERE kalusto_nro = $1', [Number(vehicleId)]);
                        rekNro = result.rows[0]?.rek_nro || null;
                    } catch (err) {
                        console.error("Failed to fetch vehicle reg no for socket init:", err);
                    }
                }

                this.emitToDispatchers('driverStatusChanged', {
                    userId: decoded.driverNumericId,
                    status: 'online',
                    vehicleNumber: vehicleId ? Number(vehicleId) : null,
                    vehicleRegNo: rekNro
                });
                (socket as any).user = {
                    ...decoded,
                    kalustoNro: (vehicleId !== undefined && vehicleId !== null) ? parseInt(vehicleId, 10) : undefined
                };

                const user = (socket as any).user;
                const isOfficeUser = decoded.roles?.some(r => ['Ajojärjestelijä', 'Ylläpitäjä', 'Admin', 'Superuser'].includes(r));

                if (isOfficeUser) {
                    socket.join('dispatchers');
                    socket.join('user_0'); // Office users join Support room to get direct chats!
                } else {
                    if (decoded.driverNumericId) {
                        socket.join(`user_${decoded.driverNumericId}`);
                        socket.join(`driver_${decoded.driverNumericId}`);
                    }
                }

                if (user.kalustoNro !== undefined && user.kalustoNro !== null) {
                    socket.join(`vehicle_${user.kalustoNro}`);
                }

                // 💬 Live Chat Events
                socket.on('join_chat_room', (userId: number) => {
                    socket.join(`user_${userId}`);
                    console.log(`💬 Socket joined private chat room: user_${userId}`);
                });

                socket.on('send_chat_message', async (data: { senderId: number; recipientId: number; vehicleNumber: number | null; text: string }) => {
                    const { senderId, recipientId, vehicleNumber, text } = data;
                    try {
                        const savedMsg = await chatService.saveMessage(senderId, recipientId, vehicleNumber, text);
                        this.emitToUser(recipientId, 'receiveMessage', savedMsg);
                        if (senderId !== recipientId) {
                            this.emitToUser(senderId, 'receiveMessage', savedMsg);
                        }
                    } catch (err: any) {
                        console.error('[Socket Chat] Failed to save/send message:', err.message);
                    }
                });

                socket.on('broadcast_all', async (data: { senderId: number; text: string }) => {
                    const { senderId, text } = data;
                    try {
                        const allDriversRes = await pool.query(
                            'SELECT kulj_id AS "driverId" FROM public.kuljettajat'
                        );

                        const savedMessages = [];

                        for (const row of allDriversRes.rows) {
                            const recipientId = Number(row.driverId);
                            if (!Number.isFinite(recipientId)) continue;

                            const saved = await chatService.saveMessage(
                                senderId, recipientId, null, text, true
                            );
                            this.emitToUser(recipientId, 'receiveMessage', saved);
                            savedMessages.push(saved);
                        }

                        // Office side broadcast archive realtime update
                        if (savedMessages.length > 0) {
                            this.emitToDispatchers('broadcastSent', {
                                messageText: text,
                                createdAt: savedMessages[0].created_at ?? savedMessages[0].createdAt,
                                recipientCount: savedMessages.length,
                                recipientNames: null,
                                messageIds: savedMessages.map(m => Number(m.message_id ?? m.messageId)),
                                isDeleted: false
                            });
                        }

                    } catch (err: any) {
                        console.error('[Socket Chat] Failed to broadcast to all:', err.message);
                    }
                });

                socket.on('broadcast_selected', async (data: {
                    senderId: number;
                    recipientIds: number[];
                    text: string
                }) => {
                    const { senderId, recipientIds, text } = data;
                    try {
                        if (!Array.isArray(recipientIds)) return;

                        const savedMessages = [];

                        for (const recipientId of recipientIds) {
                            const cleanId = Number(recipientId);
                            if (!Number.isFinite(cleanId)) continue;

                            const saved = await chatService.saveMessage(
                                senderId, cleanId, null, text, true
                            );
                            this.emitToUser(cleanId, 'receiveMessage', saved);
                            savedMessages.push(saved);
                        }

                        // Office side realtime update
                        if (savedMessages.length > 0) {
                            const ids = savedMessages.map(m => Number(m.recipient_id ?? m.recipientId));
                            const namesRes = await pool.query(
                                `SELECT nimi FROM public.kuljettajat WHERE kulj_id = ANY($1::int[])`,
                                [ids]
                            );
                            const names = namesRes.rows.map((r: any) => r.nimi).join(', ');

                            this.emitToDispatchers('broadcastSent', {
                                messageText: text,
                                createdAt: savedMessages[0].created_at ?? savedMessages[0].createdAt,
                                recipientCount: savedMessages.length,
                                recipientNames: names || null,
                                messageIds: savedMessages.map(m => Number(m.message_id ?? m.messageId)),
                                isDeleted: false
                            });
                        }

                    } catch (err: any) {
                        console.error('[Socket Chat] Failed to execute selected broadcast:', err.message);
                    }
                });

                // Event: Live Soft Delete Messages (Sync both sides)
                socket.on('delete_chat_messages', async (data: {
                    messageIds: number[];
                    senderId: number;
                    recipientId: number
                }) => {
                    const { messageIds, senderId, recipientId } = data;
                    try {
                        const numericIds = messageIds.map(id => Number(id)).filter(id => !isNaN(id));
                        const deletedIds = await chatService.softDeleteMessages(numericIds, senderId);

                        console.log(`[DELETE] Requested: ${numericIds}, Deleted: ${JSON.stringify(deletedIds)}, Sender: ${senderId}, Recipient: ${recipientId}`);

                        if (deletedIds.length === 0) {
                            console.warn('[DELETE] Nothing deleted — sender ownership check failed or null ids');
                            return;
                        }

                        this.emitToUser(recipientId, 'messagesDeleted', { messageIds: deletedIds });
                        this.emitToUser(senderId, 'messagesDeleted', { messageIds: deletedIds });

                        console.log(`[DELETE] Emitted messagesDeleted to user_${senderId} and user_${recipientId}`);
                    } catch (err: any) {
                        console.error('[Socket Chat] Soft delete failed:', err.message);
                    }
                });

                // Broadcast cluster delete — all recipients notify
                socket.on('delete_broadcast_cluster', async (data: {
                    messageIds: number[];
                    senderId: number;
                }) => {
                    const { messageIds, senderId } = data;

                    // Office only can delete broadcasts
                    if (senderId !== 0) {
                        console.warn('[DELETE BROADCAST] Unauthorized attempt by sender:', senderId);
                        return;
                    }

                    try {
                        const numericIds = messageIds.map(Number).filter(id => !isNaN(id) && id > 0);

                        const query = `
            UPDATE public.chat_messages
            SET is_deleted = true, message_text = 'Message deleted'
            WHERE message_id = ANY($1::int[])
            AND is_broadcast = true
            AND sender_id = 0
            RETURNING message_id AS "deletedId",
                      recipient_id AS "recipientId";
        `;
                        const res = await pool.query(query, [numericIds]);

                        if (res.rows.length === 0) {
                            console.warn('[DELETE BROADCAST] Nothing deleted');
                            return;
                        }

                        const deletedIds = res.rows
                            .map((r: any) => r.deletedId)
                            .filter((id: any) => id !== null);

                        const recipientIds = [...new Set(
                            res.rows.map((r: any) => Number(r.recipientId))
                        )];

                        console.log(`[DELETEBROADCAST] Deleted ${deletedIds.length} msgs, notifying ${recipientIds.length} drivers`);

                        // Each recipient notify
                        for (const recipientId of recipientIds) {
                            this.emitToUser(recipientId, 'messagesDeleted', { messageIds: deletedIds });
                        }

                        // Office itself notify (broadcast section update)
                        this.emitToUser(0, 'broadcastClusterDeleted', { messageIds: deletedIds });
                        this.emitToDispatchers('broadcastClusterDeleted', { messageIds: deletedIds });

                    } catch (err: any) {
                        console.error('[Socket Chat] Broadcast cluster delete failed:', err.message);
                    }
                });

                // 🚀 HIGHLY STABLE DISCONNECT & LOGOUT FLOW
                socket.on('disconnect', async () => {
                    const currentToken = (socket as any).sanitizedToken;
                    this.onlineTokens.delete(currentToken);

                    const driverId = (socket as any).user?.driverNumericId;

                    // 🚀 1. Keep the standard memory cleanup
                    if (driverId && this.io) {
                        const remainingSockets = await this.io.in(`driver_${driverId}`).fetchSockets();

                        if (remainingSockets.length === 0) {
                            this.emitToDispatchers('driverStatusChanged', {
                                userId: Number(driverId),
                                status: 'offline'
                            });
                            console.log(`📡 [SOCKET] Driver ${driverId} is now fully OFFLINE (No remaining sessions)`);
                        }
                    }

                    // 🚀 2. Emit offline state inside the Database success block to prevent race conditions
                    if (!isOfficeUser && currentToken) {
                        try {
                            const deleteRes = await pool.query(
                                `DELETE FROM public.driver_active_sessions WHERE 
 (token_identifier = $1 OR token_identifier = $2) RETURNING user_id as "userId"`,
                                [currentToken, `Bearer ${currentToken}`]
                            );

                            if (deleteRes.rowCount && deleteRes.rowCount > 0) {
                                const dbUserId = deleteRes.rows[0].userId;

                                const checkRes = await pool.query(`SELECT count(*) FROM public.driver_active_sessions WHERE user_id = $1`, [dbUserId]);
                                const activeCount = parseInt(checkRes.rows[0].count, 10);

                                if (activeCount === 0) {
                                    await pool.query(`UPDATE public.kayttajat SET current_vehicle_id = NULL WHERE kulj_id = $1`, [dbUserId]);
                                    console.log(`✅ [AUTO-RELEASE] Vehicle freed for Driver ${dbUserId}.`);

                                    this.emitToDispatchers('driverStatusChanged', {
                                        userId: Number(dbUserId),
                                        status: 'offline'
                                    });
                                }
                                this.emitToDispatchers('chipLoadUpdated', { action: 'SESSION_CLEANUP' });
                            }
                        } catch (err) { console.error("Cleanup Error:", err); }
                    }
                });

                if (!isOfficeUser) this.handleLocationUpdates(socket);

            } catch (error: any) {
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