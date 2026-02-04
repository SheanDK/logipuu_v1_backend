// backend/src/services/authService.ts
import pool from '../config/db';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { findUserByTunnusWithRolesAndPermissionsQuery } from '../queries/authQueries';
import { UserLoginDTO } from '../dto/auth.dto';
import { UserPayload } from '../middlewares/authMiddleware';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your_fallback_secret_for_dev_change_this';
type JwtTimeString = `${number}${'s' | 'm' | 'h' | 'd'}`;
const ACCESS_TOKEN_EXPIRES_IN_CONFIG: string = process.env.ACCESS_TOKEN_EXPIRES_IN || '8h';

export const loginUserService = async (loginData: UserLoginDTO) => {
    const { username, password } = loginData;

    const userResult = await pool.query(findUserByTunnusWithRolesAndPermissionsQuery, [username]);

    if (userResult.rows.length === 0) {
        throw new Error('Invalid username or password');
    }

    const userFromDb = userResult.rows[0];

    // The database pool now handles camelCasing automatically.
    console.log("--- CAMELCASED OBJECT (after pool transform) ---", userFromDb);

    if (!userFromDb.salasana) {
        console.error(`CRITICAL: User ${username} has no password hash.`);
        throw new Error('Authentication configuration error.');
    }

    const isPasswordMatch = await bcrypt.compare(password, userFromDb.salasana);
    if (!isPasswordMatch) {
        throw new Error('Invalid username or password');
    }

    if (!userFromDb.aktiivinen) {
        throw new Error('This user account is inactive.');
    }

    const payload: UserPayload = {
        userId: userFromDb.tunnus,
        fullName: userFromDb.nimi,
        roles: userFromDb.roles || [],
        permissions: userFromDb.permissions || [],
        userLevel: userFromDb.taso,
        driverNumericId: userFromDb.kuljId ? parseInt(String(userFromDb.kuljId), 10) : undefined,
    };

    console.log("--- PAYLOAD BEING SIGNED INTO TOKEN ---", payload);

    const signOptions: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRES_IN_CONFIG as JwtTimeString };
    const token = jwt.sign(payload, JWT_SECRET, signOptions);

    return {
        token,
        user: {
            username: payload.userId,
            fullName: payload.fullName,
            roles: payload.roles,
            permissions: payload.permissions,
            driverNumericId: payload.driverNumericId,
        },
    };
};