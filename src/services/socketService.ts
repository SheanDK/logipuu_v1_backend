// backend/src/services/socketService.ts
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

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
    
    // --- IMPLEMENTATION IS HERE ---
    /**
     * Emits a 'locationUpdate' event to all connected clients.
     * @param locationPayload - The data payload containing vehicle ID, lat, lng, etc.
     */
    public emitLocationUpdate(locationPayload: { vehicleId: string | number; lat: number; lng: number; timestamp?: number; updatedBy?: string; }) {
        if (this.io) {
            // 'locationUpdate' is the event name the frontend will listen for.
            this.io.emit('locationUpdate', locationPayload);
            console.log(`🚀 Emitted location update for vehicle: ${locationPayload.vehicleId}`);
        } else {
            console.warn('Socket.IO not initialized. Cannot emit location update.');
        }
    }
    // --- END IMPLEMENTATION ---

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
            console.log(`🔌 A user connected with socket ID: ${socket.id}`);

            socket.on('joinRoom', (roomName: string) => {
                socket.join(roomName);
                console.log(`Socket ${socket.id} joined room: ${roomName}`);
            });

            socket.on('disconnect', () => {
                console.log(`User disconnected with socket ID: ${socket.id}`);
            });
        });
    }

    public getIO(): Server {
        if (!this.io) {
            throw new Error("Socket.IO not initialized. Call initialize() first.");
        }
        return this.io;
    }

    public emitToRoom(roomName: string, eventName: string, payload: any): void {
        if (this.io) {
            this.io.to(roomName).emit(eventName, payload);
            console.log(`Emitted '${eventName}' to room '${roomName}'.`);
        }
    }
}

export const socketService = SocketService.getInstance();