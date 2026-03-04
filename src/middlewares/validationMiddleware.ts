// backend/src/middlewares/validationMiddleware.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validate, ValidationError, ValidatorOptions } from 'class-validator';
import { plainToInstance } from 'class-transformer';

// The function now accepts an optional 'validatorOptions' object.
export const validateDto = (dtoClass: any, validatorOptions?: ValidatorOptions): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const dtoInstance = plainToInstance(dtoClass, req.body);

        const options: ValidatorOptions = {
            whitelist: true,
            forbidNonWhitelisted: true,
            validationError: { target: false },
            ...validatorOptions,
        };

        const errors: ValidationError[] = await validate(dtoInstance, options);

        if (errors.length > 0) {
            const errorMessages = errors.map(error => ({
                property: error.property,
                constraints: error.constraints ? Object.values(error.constraints) : [],
            }));
            return res.status(400).json({ message: 'Validation failed', errors: errorMessages });
        }

        req.body = dtoInstance;

        next();
    };
};