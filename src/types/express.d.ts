// backend/src/types/express.d.ts

//1. Import the UserPayload interface from your auth middleware
import { UserPayload } from '../middlewares/authMiddleware';

//2. Use declaration merging to add a 'user' property to the Express Request interface
declare global {
  namespace Express {
    export interface Request {
      user?: UserPayload;
    }
  }
}