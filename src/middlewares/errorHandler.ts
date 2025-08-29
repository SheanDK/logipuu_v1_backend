import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
    statusCode?: number;
    code?: string; // For PostgreSQL error codes like '23503' (FK violation)
    detail?: string; // For PostgreSQL error details
}

export const globalErrorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
    console.error("ERROR LOG: ", new Date().toISOString());
    console.error("Request Method: ", req.method);
    console.error("Request URL: ", req.originalUrl);
    console.error("Error Message: ", err.message);
    if (err.code) console.error("Error Code (DB): ", err.code);
    if (err.detail) console.error("Error Detail (DB): ", err.detail);
    console.error("Error Stack: ", err.stack);

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Handle specific common errors
    if (err.code === '23505') { // Unique violation
        statusCode = 409; // Conflict
        message = `Resource conflict: ${err.detail || 'A record with this unique identifier already exists.'}`;
    } else if (err.code === '23503') { // Foreign key violation
        statusCode = 400; // Bad Request or 409 Conflict
        message = `Referenced data not found or cannot be deleted due to existing relationships: ${err.detail || 'Foreign key constraint violation.'}`;
    } else if (err.code === '22P02') { // Invalid text representation (e.g., trying to parse non-numeric string to number)
        statusCode = 400;
        message = `Invalid data format provided: ${err.message}`;
    }

    // Don't send stack trace in production
    const responseError = process.env.NODE_ENV === 'production' ? { message } : { message, stack: err.stack };

    res.status(statusCode).json(responseError);
};