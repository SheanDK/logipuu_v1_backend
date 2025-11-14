//backend/src/types/dashboard.types.ts

// Admin Dashboard
export interface IAdminDashboardStats {
    activeTimberStacksCount: number;
    loadsCompletedTodayCount: number;
    pendingBillingsCount: number;
    vehiclesNeedingInspectionCount: number;
    activeVehiclesCount: number;
    activeDriversCount: number;
}

// Dispatcher Dashboard 
export interface IDispatchDashboardStats {
    activeLoadsCount: number;
    availableDriversCount: number;
    availableVehiclesCount: number;
    totalRemainingVolume: number;
    upcomingLoadsTodayCount: number;
}

// Driver Dashboard 
export interface IDriverDashboardStats {
    driverId: number;
    todayAssignedLoadsCount: number;
    todayCompletedLoadsCount: number;
    weekTotalLoadsCount: number;
    upcomingLoadsCount: number;
}

// Admin/Dispatch dashboards 
export interface IVolumeByDay {
    date: string; // e.g., "Nov 13"
    volume: number;
}

// Dispatch Dashboard
export interface IActiveTripListItem {
    ajomaaraysNro: string; // Trip ID
    driverName: string | null;
    vehicleRegNo: string | null;
    status: string;
    progress: number; // 0-100
}