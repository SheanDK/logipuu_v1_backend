//backend/src/controllers/chipOrderController.ts
import { Request, Response } from 'express';
import pool from '../config/db';
import { ChipOrder } from '../types/chipTransportTypes';

// 1. Create Order
export const createChipOrder = async (req: Request, res: Response) => {
    try {
        const {
            asiakas_id,
            title_id,
            pvm_alku,
            pvm_loppu,
            kuormia_tavoite,
            tuote_tyyppi,
            further_info,
            flexibility_type,
            pcs_per_day,
            weeks_left,
            valid_until_notice,
            distribution
        } = req.body;

        const endDate = pvm_loppu || pvm_alku;

        const query = `
            INSERT INTO public.chip_orders 
            (asiakas_id, title_id, pvm_alku, pvm_loppu, kuormia_tavoite, tuote_tyyppi, lisatiedot, 
             flexibility_type, pcs_per_day, weeks_full, valid_until_notice, weekly_distribution)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `;

        const values = [
            asiakas_id,
            title_id || null,
            pvm_alku,
            endDate,
            kuormia_tavoite || 1,
            tuote_tyyppi || '',
            further_info || '',
            flexibility_type || 'No Flexibility',
            pcs_per_day || 0,
            weeks_left || 1,
            valid_until_notice || false,
            JSON.stringify(distribution || {})
        ];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);

    } catch (error: any) {
        console.error('Error creating chip order:', error.message);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// 2. Get Active Orders
export const getActiveChipOrders = async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT 
                co.order_id as "orderId", 
                co.asiakas_id as "asiakasId", 
                co.title_id as "titleId",
                TO_CHAR(co.pvm_alku, 'DD.MM.YYYY') as "startDate",
                TO_CHAR(co.pvm_loppu, 'DD.MM.YYYY') as "endDate",
                co.kuormia_tavoite as "targetQty", 
                co.tuote_tyyppi as "productType",
                co.lisatiedot as "lisatiedot",
                co.flexibility_type as "flexibility_type",
                co.pcs_per_day as "pcsPerDay",
                co.weeks_full as "weeksFull",
                co.valid_until_notice as "valid_until_notice",
                co.weekly_distribution as "weeklyDistribution",
                a.asiakkaan_nimi as "customerName",
                ct.nimike_nimi as "titleName",
                ct.lyhenne as "lyhenne"
            FROM chip_orders co
            JOIN asiakkaat a ON co.asiakas_id = a.asiakkaan_id
            LEFT JOIN chip_titles ct ON co.title_id = ct.title_id
            WHERE co.is_active = true
            ORDER BY co.order_id DESC;
        `;

        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching chip orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// 3. Get Weekly Plan 
export const getWeeklyPlan = async (req: Request, res: Response) => {
    try {
        const { week, year } = req.query;

        if (!week || !year) {
            return res.status(400).json({ error: 'Week and Year are required parameters.' });
        }

        const query = `
            SELECT 
                -- Weekly Program Details (vehicle and driver)
                wp.program_id,
                wp.viikko_nro,
                wp.vuosi,
                k.kalusto_nro,
                k.rek_nro AS vehicle_reg_no,
                d.kulj_id,
                d.nimi AS driver_name,
                d.puhelin_nro AS driver_phone,

                -- Chip Load Details (relevant loads)
                cl.load_id,
                cl.pvm AS scheduled_date,
                cl.status,
                cl.planned_m3,
                cl.actual_m3,
                cl.lahto_paikka, -- Energy Warehouse ID
                cl.purku_paikka, -- Unloading Site ID

                -- Order & Customer Details (customer)
                co.order_id,
                a.asiakkaan_nimi AS customer_name,
                a.kohteen_vari AS customer_color, -- Frontend to show the color
                
                -- Location Details (for map)
                p_lahto.nimi AS loading_site_name,
                p_purku.purkupaikka AS unloading_site_name

            FROM weekly_programs wp
            -- 1. vehicle
            JOIN kalusto k ON wp.kalusto_nro = k.kalusto_nro
            -- 2. driver
            JOIN kuljettajat d ON wp.kulj_id = d.kulj_id
            -- 3. Load (LEFT JOIN to show vehicles without loads)
            LEFT JOIN chip_loads cl ON wp.program_id = cl.program_id
            -- 4. Order and Customer
            LEFT JOIN chip_orders co ON cl.order_id = co.order_id
            LEFT JOIN asiakkaat a ON co.asiakas_id = a.asiakkaan_id
            -- 5. Location Details (Optional - for map)
            LEFT JOIN puulaani p_lahto ON cl.lahto_paikka = p_lahto.puulaani_id
            LEFT JOIN purkupaikka p_purku ON cl.purku_paikka = p_purku.purkupaikka_id

            WHERE wp.viikko_nro = $1 AND wp.vuosi = $2
            ORDER BY wp.program_id, cl.pvm;
        `;

        const result = await pool.query(query, [week, year]);

        console.log("First Row from DB:", result.rows[0]);

        const formattedData = result.rows.reduce((acc: any[], row) => {
            const programId = row.program_id || row.programId;
            const weekNum = row.viikko_nro || row.viikkoNro;
            const yearNum = row.vuosi;
            const vehicleId = row.kalusto_nro || row.kalustoNro;
            const vehicleReg = row.vehicle_reg_no || row.vehicleRegNo;
            const driverId = row.kulj_id || row.kuljId;
            const driverName = row.driver_name || row.driverName;
            const driverPhone = row.driver_phone || row.driverPhone;

            const loadId = row.load_id || row.loadId;
            const scheduledDate = row.scheduled_date || row.scheduledDate;
            const plannedM3 = row.planned_m3 || row.plannedM3;
            const actualM3 = row.actual_m3 || row.actualM3;
            const loadingSite = row.loading_site_name || row.loadingSiteName;
            const unloadingSite = row.unloading_site_name || row.unloadingSiteName;
            const customerName = row.customer_name || row.customerName;
            const customerColor = row.customer_color || row.customerColor;

            let program = acc.find(p => p.program_id === programId);

            if (!program) {
                program = {
                    program_id: programId,
                    week: weekNum,
                    year: yearNum,
                    vehicle: {
                        id: vehicleId,
                        reg_no: vehicleReg
                    },
                    driver: {
                        id: driverId,
                        name: driverName,
                        phone: driverPhone
                    },
                    loads: []
                };
                acc.push(program);
            }

            if (loadId) {
                program.loads.push({
                    load_id: loadId,
                    date: scheduledDate,
                    status: row.status,
                    planned_m3: plannedM3,
                    actual_m3: actualM3,
                    customer: {
                        name: customerName,
                        color: customerColor
                    },
                    locations: {
                        origin: loadingSite,
                        destination: unloadingSite
                    }
                });
            }

            return acc;
        }, []);

        res.status(200).json(formattedData);

    } catch (error) {
        console.error('Error fetching weekly plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 4. Schedule a New Load
export const scheduleChipLoad = async (req: Request, res: Response) => {
    try {
        const { program_id, order_id, pvm, lahto_paikka, purku_paikka, planned_m3 } = req.body;

        if (!program_id || !order_id || !pvm || !lahto_paikka || !purku_paikka) {
            return res.status(400).json({ error: 'Missing required fields for scheduling.' });
        }

        const query = `
            INSERT INTO public.chip_loads 
            (program_id, order_id, pvm, lahto_paikka, purku_paikka, planned_m3, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'NOT_SENT')
            RETURNING *;
        `;

        const values = [
            Number(program_id),
            Number(order_id),
            pvm,
            Number(lahto_paikka),
            Number(purku_paikka),
            Number(planned_m3 || 0)
        ];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);

    } catch (error: any) {
        console.error('DATABASE ERROR in scheduleChipLoad:', error.message);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
};

export const updateChipOrder = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const {
            asiakas_id, title_id, pvm_alku, pvm_loppu, kuormia_tavoite,
            tuote_tyyppi, further_info, flexibility_type, pcs_per_day,
            weeks_left, valid_until_notice, distribution
        } = req.body;

        const query = `
            UPDATE public.chip_orders 
            SET asiakas_id = $1, title_id = $2, pvm_alku = $3, pvm_loppu = $4, 
                kuormia_tavoite = $5, tuote_tyyppi = $6, lisatiedot = $7, 
                flexibility_type = $8, pcs_per_day = $9, weeks_full = $10, 
                valid_until_notice = $11, weekly_distribution = $12
            WHERE order_id = $13
            RETURNING *;
        `;

        const values = [
            asiakas_id, title_id, pvm_alku, pvm_loppu || pvm_alku,
            kuormia_tavoite, tuote_tyyppi, further_info,
            flexibility_type, pcs_per_day, weeks_left,
            valid_until_notice, JSON.stringify(distribution),
            orderId
        ];

        const result = await pool.query(query, values);
        res.status(200).json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

export const deleteChipOrder = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        await pool.query(`DELETE FROM public.chip_loads WHERE order_id = $1`, [orderId]);
        const result = await pool.query(`DELETE FROM public.chip_orders WHERE order_id = $1`, [orderId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.status(200).json({ success: true, message: 'Subscription deleted successfully' });
    } catch (error: any) {
        console.error("Delete Order Error:", error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};