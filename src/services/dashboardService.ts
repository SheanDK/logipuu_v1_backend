// backend/src/services/dashboardService.ts
import camelcaseKeys from 'camelcase-keys';
import pool from '../config/db';
import * as adminQueries from '../queries/dashboardQueries/adminDashboardQueries';
import * as dispatchQueries from '../queries/dashboardQueries/dispatchDashboardQueries';
import * as driverQueries from '../queries/dashboardQueries/driverDashboardQueries';
import { IVolumeByDay, IActiveTripListItem } from '../types/dashboard.types';

// Helper function to execute a query and return the first row's first value (count/sum)
const getScalarValue = async (query: string, params: any[] = []): Promise<number> => {
    try {
        const result = await pool.query(query, params);
        if (result.rows.length > 0 && result.rows[0] && typeof result.rows[0][Object.keys(result.rows[0])[0]] !== 'undefined') {
            // Convert to number, as COUNT(*) returns bigint (string in JS)
            return Number(result.rows[0][Object.keys(result.rows[0])[0]]) || 0;
        }
        return 0;
    } catch (error) {
        console.error(`Error executing scalar query: ${query}`, error);
        return 0; // Return 0 on error to prevent dashboard crash
    }
};


export const getAdminDashboardData = async () => {
    const [
        activeTimberStacksCount,
        loadsCompletedTodayCount,
        pendingBillingsCount,
        vehiclesNeedingInspectionCount,
        activeVehiclesCount,
        activeDriversCount,
        activeCustomersCount,       // New
        totalVolumeToday,           // New
        unbilledConsignmentsCount   // New
    ] = await Promise.all([
        getScalarValue(adminQueries.COUNT_ACTIVE_TIMBER_STACKS),
        getScalarValue(adminQueries.COUNT_LOADS_COMPLETED_TODAY),
        getScalarValue(adminQueries.COUNT_PENDING_BILLINGS),
        getScalarValue(adminQueries.COUNT_VEHICLES_NEEDING_INSPECTION),
        getScalarValue(adminQueries.COUNT_ACTIVE_VEHICLES),
        getScalarValue(adminQueries.COUNT_ACTIVE_DRIVERS),
        getScalarValue(adminQueries.COUNT_ACTIVE_CUSTOMERS),
        getScalarValue(adminQueries.SUM_TOTAL_VOLUME_TODAY),
        getScalarValue(adminQueries.COUNT_UNBILLED_CONSIGNMENTS)
    ]);

    return {
        activeTimberStacksCount,
        loadsCompletedTodayCount,
        pendingBillingsCount,
        vehiclesNeedingInspectionCount,
        activeVehiclesCount,
        activeDriversCount,
        activeCustomersCount,
        totalVolumeToday,
        unbilledConsignmentsCount,
        // You can add more complex data here if needed
    };
};

export const getDispatchDashboardData = async () => {
    const [
        activeLoadsCount,
        availableDriversCount,
        availableVehiclesCount,
        totalRemainingVolume,
        upcomingLoadsTodayCount
    ] = await Promise.all([
        getScalarValue(dispatchQueries.COUNT_ACTIVE_LOADS),
        getScalarValue(dispatchQueries.COUNT_AVAILABLE_DRIVERS),
        getScalarValue(dispatchQueries.COUNT_AVAILABLE_VEHICLES),
        getScalarValue(dispatchQueries.SUM_REMAINING_VOLUME_ACTIVE_STACKS),
        getScalarValue(dispatchQueries.COUNT_UPCOMING_LOADS_TODAY)
    ]);

    return {
        activeLoadsCount,
        availableDriversCount,
        availableVehiclesCount,
        totalRemainingVolume,
        upcomingLoadsTodayCount,
    };
};

export const getDriverDashboardData = async (driverId: number) => {
    if (!driverId) {
        throw new Error('Driver ID is required for driver dashboard data.');
    }

    const [
        todayAssignedLoadsCount,
        todayCompletedLoadsCount,
        weekTotalLoadsCount,
        upcomingLoadsCount
    ] = await Promise.all([
        getScalarValue(driverQueries.COUNT_DRIVER_TODAY_ASSIGNED_LOADS, [driverId]),
        getScalarValue(driverQueries.COUNT_DRIVER_TODAY_COMPLETED_LOADS, [driverId]),
        getScalarValue(driverQueries.COUNT_DRIVER_WEEK_TOTAL_LOADS, [driverId]),
        getScalarValue(driverQueries.COUNT_DRIVER_UPCOMING_LOADS, [driverId])
    ]);

    return {
        driverId,
        todayAssignedLoadsCount,
        todayCompletedLoadsCount,
        weekTotalLoadsCount,
        upcomingLoadsCount,
    };
};

// --- NEW FUNCTION 1: Volume Chart
/**
 * Fetches volume data for the last 7 days.
 * This can be used by both Admin and Dispatch dashboards.
 */
export const getVolumeLast7Days = async (): Promise<IVolumeByDay[]> => {
    try {
        const result = await pool.query(adminQueries.GET_VOLUME_LAST_7_DAYS);
        return result.rows;
    } catch (error) {
        console.error('Error fetching volume for last 7 days:', error);
        throw error;
    }
};

// --- NEW FUNCTION 2: Active Trips List 
/**
 * Fetches a list of currently active trips.
 * Primarily for the Dispatcher dashboard.
 */
export const getActiveTripsList = async (): Promise<IActiveTripListItem[]> => {
    try {
        const result = await pool.query(dispatchQueries.GET_ACTIVE_TRIPS_LIST);
        return camelcaseKeys(result.rows);
    } catch (error)
 {
        console.error('Error fetching active trips list:', error);
        throw error;
    }
};

/**
 * get customer data for dashboard
 */
export const getCustomerDashboardData = async (customerId: number) => {
    
    // 1. අද දින එම පාරිභෝගිකයා වෙනුවෙන් අවසන් කළ ලෝඩ් ගණන
    const COUNT_CUSTOMER_COMPLETED_TODAY = `
        SELECT COUNT(*) FROM public.kuorma 
        WHERE asiakas_id = $1 AND status = 'Completed' AND pvm::date = CURRENT_DATE
    `;

    // 2. එම පාරිභෝගිකයාගේ සක්‍රිය පූලානිවල ඉතිරිව ඇති මුළු පරිමාව
    const SUM_CUSTOMER_REMAINING_VOLUME = `
        SELECT COALESCE(SUM(jaljella), 0) FROM public.puulaani 
        WHERE asiakas_id = $1 AND aktiivinen = TRUE AND valmis = FALSE
    `;

    // 3. එම පාරිභෝගිකයාගේ දැනට පවතින සක්‍රිය පූලානි ගණන
    const COUNT_CUSTOMER_ACTIVE_STACKS = `
        SELECT COUNT(*) FROM public.puulaani 
        WHERE asiakas_id = $1 AND aktiivinen = TRUE AND valmis = FALSE
    `;

    // 4. එම පාරිභෝගිකයාගේ බිල් කිරීමට ඇති ලෝඩ් ගණන
    const COUNT_CUSTOMER_PENDING_INVOICE = `
        SELECT COUNT(*) FROM public.kuorma 
        WHERE asiakas_id = $1 AND (laskutukseen IS NULL OR laskutukseen = 0) AND status = 'Completed'
    `;

    const [completedToday, remainingVolume, activeStacks, pendingInvoices] = await Promise.all([
        getScalarValue(COUNT_CUSTOMER_COMPLETED_TODAY, [customerId]),
        getScalarValue(SUM_CUSTOMER_REMAINING_VOLUME, [customerId]),
        getScalarValue(COUNT_CUSTOMER_ACTIVE_STACKS, [customerId]),
        getScalarValue(COUNT_CUSTOMER_PENDING_INVOICE, [customerId])
    ]);

    return {
        completedTodayCount: completedToday,
        remainingVolume: Number(remainingVolume) || 0,
        activeStacksCount: activeStacks,
        pendingInvoicesCount: pendingInvoices
    };
};