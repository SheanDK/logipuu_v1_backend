// backend/src/middlewares/validationMiddleware.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validate, ValidationError, ValidatorOptions } from 'class-validator'; // Import ValidatorOptions
import { plainToInstance } from 'class-transformer';

// --- THIS IS THE FIX ---
// The function now accepts an optional 'validatorOptions' object.
export const validateDto = (dtoClass: any, validatorOptions?: ValidatorOptions): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const dtoInstance = plainToInstance(dtoClass, req.body);

        // --- THIS IS THE FIX ---
        // Merge the default options with any custom options passed in.
        const options: ValidatorOptions = {
            whitelist: true,
            forbidNonWhitelisted: true,
            validationError: { target: false },
            ...validatorOptions, // Custom options (like skipMissingProperties) will override defaults if provided
        };

        const errors: ValidationError[] = await validate(dtoInstance, options);

        if (errors.length > 0) {
            const errorMessages = errors.map(error => ({
                property: error.property,
                constraints: error.constraints ? Object.values(error.constraints) : [],
            }));
            return res.status(400).json({ message: 'Validation failed', errors: errorMessages });
        }
        
        // --- IMPROVEMENT ---
        // Instead of using res.locals, which is less type-safe,
        // we replace req.body with the validated (and potentially transformed) DTO instance.
        // This is a common and clean practice.
        req.body = dtoInstance;

        next();
    };
};