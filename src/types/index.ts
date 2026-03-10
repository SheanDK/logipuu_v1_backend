// backend/src/types/index.ts

//1. Export all interfaces and types
export * from './client.types';
export * from './driver.types';
export * from './otherInfo.types';
export * from './permission.types';
export * from './role.types';
export * from './timberStack.types';
export * from './unloadingSite.types';
export * from './user.types';
export * from './vehicle.types';
export * from './waybill.types';

//2. Export all DTOs as well for easy access in services
export * from '../dto/auth.dto';
export * from '../dto/client.dto';
export * from '../dto/driver.dto';
export * from '../dto/location.dto';
export * from '../dto/otherInfo.dto';
export * from '../dto/otherMarker.dto';
export * from '../dto/role.dto';
export * from '../dto/timberStack.dto';
export * from '../dto/unloadingSite.dto';
export * from '../dto/user.dto';
export * from '../dto/vehicle.dto';
export * from '../dto/waybill.dto';