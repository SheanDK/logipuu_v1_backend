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
    
    // The query now returns original column names (tunnus, nimi, salasana...)
    const userResult = await pool.query(findUserByTunnusWithRolesAndPermissionsQuery, [username]);

    if (userResult.rows.length === 0) {
        throw new Error('Invalid username or password');
    }

    // The middleware converts DB results to camelCase (e.g., tunnus, nimi, salasana, kuljId)
    const userFromDb = userResult.rows[0];

    if (!userFromDb.salasana) { // 'salasana' is the camelCased version of the DB column
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

    // CORRECTED: Map the camelCased DB results to the JWT payload interface.
    // This is the correct place for this mapping.
    const payload: UserPayload = {
        userId: userFromDb.tunnus, // Map tunnus -> userId
        fullName: userFromDb.nimi, // Map nimi -> fullName
        roles: userFromDb.roles || [],
        permissions: userFromDb.permissions || [],
        userLevel: userFromDb.taso, // Map taso -> userLevel
        driverNumericId: userFromDb.kulj_Id ? parseInt(String(userFromDb.kulj_Id), 10) : undefined,
    };

    let expiresInFinalValue: number | JwtTimeString;
    if (/^\d+$/.test(ACCESS_TOKEN_EXPIRES_IN_CONFIG)) {
        expiresInFinalValue = parseInt(ACCESS_TOKEN_EXPIRES_IN_CONFIG, 10);
    } else {
        expiresInFinalValue = ACCESS_TOKEN_EXPIRES_IN_CONFIG as JwtTimeString;
    }

    const signOptions: SignOptions = { expiresIn: expiresInFinalValue };
    const token = jwt.sign(payload, JWT_SECRET, signOptions);

    return {
        token,
        user: { // The object returned to the frontend uses the payload structure
            username: payload.userId,
            fullName: payload.fullName,
            roles: payload.roles,
            permissions: payload.permissions,
            driverNumericId: payload.driverNumericId,
        },
    };
};