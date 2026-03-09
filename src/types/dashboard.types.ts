//backend/src/types/dashboard.types.ts

//1. Admin Dashboard
export interface IAdminDashboardStats {
    activeTimberStacksCount: number;
    loadsCompletedTodayCount: number;
    pendingBillingsCount: number;
    vehiclesNeedingInspectionCount: number;
    activeVehiclesCount: number;
    activeDriversCount: number;
}

//2. Dispatcher Dashboard 
export interface IDispatchDashboardStats {
    activeLoadsCount: number;
    availableDriversCount: number;
    availableVehiclesCount: number;
    totalRemainingVolume: number;
    upcomingLoadsTodayCount: number;
}

//3. Driver Dashboard 
export interface IDriverDashboardStats {
    driverId: number;
    todayAssignedLoadsCount: number;
    todayCompletedLoadsCount: number;
    weekTotalLoadsCount: number;
    upcomingLoadsCount: number;
}

//4. Admin/Dispatch dashboards 
export interface IVolumeByDay {
    date: string;
    volume: number;
}

//5. Dispatch Dashboard
export interface IActiveTripListItem {
    ajomaaraysNro: string;
    driverName: string | null;
    vehicleRegNo: string | null;
    status: string;
    progress: number;
}