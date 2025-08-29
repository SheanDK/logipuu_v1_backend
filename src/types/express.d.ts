// backend/src/types/express.d.ts

// Import the UserPayload interface from your auth middleware
import { UserPayload } from '../middlewares/authMiddleware';

// Use declaration merging to add a 'user' property to the Express Request interface
declare global {
  namespace Express {
    export interface Request {
      user?: UserPayload;
    }
  }
}