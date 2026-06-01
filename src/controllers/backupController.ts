// backend/src/controllers/backupController.ts
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import pool from '../config/db';
import {
    VehicleImportSchema, UserImportSchema, DriverImportSchema,
    ChipLoadImportSchema, TimberLoadImportSchema, ConsignmentImportSchema
} from '../schemas/backupSchemas';

// Helper to log audit events
const logAudit = async (username: string, action: string, module: string, details: string, ip: string) => {
    await pool.query(
        `INSERT INTO public.system_audits (username, action_type, module_affected, details, ip_address) 
         VALUES ($1, $2, $3, $4, $5)`,
        [username, action, module, details, ip]
    );
};

// 1. 🚀 NEW: Download Blank CSV Templates (This was missing)
export const downloadTemplateHandler = async (req: Request, res: Response, next: NextFunction) => {
    const { module } = req.params;
    try {
        let headers = '';
        if (module === 'vehicles') {
            headers = 'kalusto_nro,rek_nro,ed_katsastus,katsastus_aik,aktiivinen,planning_group';
        } else if (module === 'drivers') {
            headers = 'kulj_id,nimi,puhelin_nro,email,halytys';
        } else if (module === 'users') {
            headers = 'tunnus,nimi,taso,salasana,aktiivinen,kulj_id';
        } else if (module === 'chip_loads') {
            headers = 'load_id,title_id,vehicle_number,order_id,scheduled_date,status,actual_m3,actual_ton,is_billed,driver_user_id';
        } else if (module === 'timber_loads') {
            headers = 'kuorma_id,tyyppi,asiakas_id,puulaani_id,puutavara_id,auto_id,kulj_id,pvm,m3,km,laskutukseen,kalusto_nro';
        } else if (module === 'consignment_loads') {
            headers = 'rahti_id,pvm,kuorma_id,rahtikirjan_nro,reitti,m3,m3_hinta,km,km_hinta,kpl,kpl_hinta,jako,jako_hinta,tievero,koko_hinta,lisatiedot,asiakas_id';
        } else {
            return res.status(400).json({ error: 'Invalid module specified.' });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=template_${module}.csv`);
        return res.send(headers);
    } catch (error) { next(error); }
};

// 2. Export Data to CSV
export const exportDataHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { module } = req.body;
    const username = req.user?.userId || 'unknown';

    try {
        let query = '';
        if (module === 'vehicles') query = 'SELECT * FROM public.kalusto';
        else if (module === 'users') query = 'SELECT tunnus, nimi, taso, aktiivinen, kulj_id FROM public.kayttajat';
        else if (module === 'drivers') query = 'SELECT * FROM public.kuljettajat';
        else if (module === 'chip_loads') query = 'SELECT * FROM public.chip_loads';
        else if (module === 'timber_loads') query = 'SELECT * FROM public.kuorma WHERE tyyppi = 0';
        else if (module === 'consignment_loads') query = 'SELECT * FROM public.rahtikirja';
        else return res.status(400).json({ error: 'Invalid module.' });

        const dataRes = await pool.query(query);
        const rows = dataRes.rows;

        if (rows.length === 0) return res.status(404).json({ error: 'No records found to export.' });

        const headers = Object.keys(rows[0]).join(',');
        const csvRows = rows.map((row: any) =>
            Object.values(row).map((val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
        );
        const csvContent = [headers, ...csvRows].join('\n');

        await logAudit(username, 'EXPORT', module, `Exported ${rows.length} rows successfully`, req.ip || '127.0.0.1');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=backup_${module}_${Date.now()}.csv`);
        return res.status(200).send(csvContent);
    } catch (error) { next(error); }
};

// 3. Validate Import (Dry Run with Async Database FK Checks)
export const validateImportHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { module, data } = req.body;

    if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'No mapped data array provided.' });
    }

    try {
        const tempRows: any[] = [];
        const errors: any[] = [];
        let schema: any;

        if (module === 'vehicles') schema = VehicleImportSchema;
        else if (module === 'users') schema = UserImportSchema;
        else if (module === 'drivers') schema = DriverImportSchema;
        else if (module === 'chip_loads') schema = ChipLoadImportSchema;
        else if (module === 'timber_loads') schema = TimberLoadImportSchema;
        else if (module === 'consignment_loads') schema = ConsignmentImportSchema;
        else return res.status(400).json({ error: 'Invalid module.' });

        // Phase 1: Basic Zod Structure Validation
        data.forEach((row: any, idx: number) => {
            const result = schema.safeParse(row);
            if (result.success) {
                tempRows.push({ data: result.data, rowNo: idx + 1 });
            } else {
                errors.push({
                    row: idx + 1,
                    error: result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
                });
            }
        });

        // Phase 2: Asynchronous Bulk Foreign Key Integrity Checks (Dry Run)
        const validRows: any[] = [];
        if (tempRows.length > 0) {
            if (module === 'chip_loads') {
                // 🚀 FIXED: Filter out NaN values using Number.isFinite to prevent Postgres 500 [1]
                const titleIds = [...new Set(tempRows.map(r => Number(r.data.title_id)).filter(n => Number.isFinite(n)))];
                const vehicleNumbers = [...new Set(tempRows.map(r => Number(r.data.vehicle_number)).filter(n => Number.isFinite(n)))];

                const [existingTitles, existingVehicles] = await Promise.all([
                    pool.query('SELECT title_id FROM public.chip_titles WHERE title_id = ANY($1)', [titleIds]),
                    pool.query('SELECT kalusto_nro FROM public.kalusto WHERE kalusto_nro = ANY($1)', [vehicleNumbers])
                ]);

                const titleSet = new Set(existingTitles.rows.map(r => Number(r.title_id)));
                const vehicleSet = new Set(existingVehicles.rows.map(r => Number(r.kalusto_nro)));

                tempRows.forEach(r => {
                    let isValid = true;
                    if (!titleSet.has(Number(r.data.title_id))) {
                        errors.push({ row: r.rowNo, error: `FK Violation: title_id ${r.data.title_id} does not exist.` });
                        isValid = false;
                    }
                    if (!vehicleSet.has(Number(r.data.vehicle_number))) {
                        errors.push({ row: r.rowNo, error: `FK Violation: vehicle_number ${r.data.vehicle_number} does not exist.` });
                        isValid = false;
                    }
                    if (isValid) validRows.push(r.data);
                });
            } else if (module === 'timber_loads') {
                // 🚀 FIXED: Filter out NaN values using Number.isFinite [1]
                const clientIds = [...new Set(tempRows.map(r => Number(r.data.asiakas_id)).filter(n => Number.isFinite(n)))];

                const existingClients = await pool.query('SELECT asiakkaan_id FROM public.asiakkaat WHERE asiakkaan_id = ANY($1)', [clientIds]);
                const clientSet = new Set(existingClients.rows.map(r => Number(r.asiakkaan_id)));

                tempRows.forEach(r => {
                    if (!clientSet.has(Number(r.data.asiakas_id))) {
                        errors.push({ row: r.rowNo, error: `Foreign Key Violation: customer_id ${r.data.asiakas_id} does not exist.` });
                    } else {
                        validRows.push(r.data);
                    }
                });
            } else if (module === 'consignment_loads') {
                // 🚀 FIXED: Filter out NaN values using Number.isFinite [1]
                const loadIds = [...new Set(tempRows.map(r => Number(r.data.kuorma_id)).filter(n => Number.isFinite(n)))];

                const existingLoads = await pool.query('SELECT kuorma_id FROM public.kuorma WHERE kuorma_id = ANY($1)', [loadIds]);
                const loadSet = new Set(existingLoads.rows.map(r => Number(r.kuorma_id)));

                tempRows.forEach(r => {
                    if (!loadSet.has(Number(r.data.kuorma_id))) {
                        errors.push({ row: r.rowNo, error: `Foreign Key Violation: kuorma_id ${r.data.kuorma_id} does not exist.` });
                    } else {
                        validRows.push(r.data);
                    }
                });
            } else {
                tempRows.forEach(r => validRows.push(r.data));
            }
        }

        return res.status(200).json({
            totalRows: data.length,
            validCount: validRows.length,
            invalidCount: errors.length,
            validRows,
            errors: errors.sort((a, b) => a.row - b.row)
        });
    } catch (error: any) {
        console.error("Dry Run Failed:", error.message);
        return res.status(500).json({ error: `Dry Run crashed: ${error.message}` });
    }
};

// 4. Execute Import inside a safe Transaction
export const executeImportHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { module, data, conflictStrategy } = req.body;
    const username = req.user?.userId || 'unknown';

    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: 'No valid data provided for import.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        const onConflictClause = conflictStrategy === 'skip' ? 'DO NOTHING' : 'DO UPDATE SET';

        for (const item of data) {
            let query = '';
            let params: any[] = [];

            if (module === 'vehicles') {
                query = `
                    INSERT INTO public.kalusto (kalusto_nro, rek_nro, ed_katsastus, katsastus_aik, aktiivinen, planning_group)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (kalusto_nro) ${onConflictClause} ${conflictStrategy === 'skip' ? '' : `
                        rek_nro = EXCLUDED.rek_nro, ed_katsastus = EXCLUDED.ed_katsastus,
                        katsastus_aik = EXCLUDED.katsastus_aik, aktiivinen = EXCLUDED.aktiivinen,
                        planning_group = EXCLUDED.planning_group
                    `};
                `;
                params = [Number(item.kalusto_nro), item.rek_nro, item.ed_katsastus, item.katsastus_aik, Boolean(item.aktiivinen), item.planning_group];
            } else if (module === 'users') {
                query = `
                    INSERT INTO public.kayttajat (tunnus, nimi, taso, salasana, aktiivinen, kulj_id)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (tunnus) ${onConflictClause} ${conflictStrategy === 'skip' ? '' : `
                        nimi = EXCLUDED.nimi, taso = EXCLUDED.taso, salasana = EXCLUDED.salasana,
                        aktiivinen = EXCLUDED.aktiivinen, kulj_id = EXCLUDED.kulj_id
                    `};
                `;
                params = [item.tunnus, item.nimi, Number(item.taso), item.salasana, Boolean(item.aktiivinen), item.kulj_id ? Number(item.kulj_id) : null];
            } else if (module === 'drivers') {
                query = `
                    INSERT INTO public.kuljettajat (kulj_id, nimi, puhelin_nro, email, halytys)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (kulj_id) ${onConflictClause} ${conflictStrategy === 'skip' ? '' : `
                        nimi = EXCLUDED.nimi, puhelin_nro = EXCLUDED.puhelin_nro,
                        email = EXCLUDED.email, halytys = EXCLUDED.halytys
                    `};
                `;
                params = [Number(item.kulj_id), item.nimi, item.puhelin_nro || null, item.email || null, Boolean(item.halytys)];
            } else if (module === 'chip_loads') {
                query = `
                    INSERT INTO public.chip_loads (load_id, title_id, vehicle_number, order_id, scheduled_date, status, actual_m3, actual_ton, is_billed, driver_user_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (load_id) ${onConflictClause} ${conflictStrategy === 'skip' ? '' : `
                        title_id = EXCLUDED.title_id, vehicle_number = EXCLUDED.vehicle_number,
                        order_id = EXCLUDED.order_id, scheduled_date = EXCLUDED.scheduled_date,
                        status = EXCLUDED.status, actual_m3 = EXCLUDED.actual_m3,
                        actual_ton = EXCLUDED.actual_ton, is_billed = EXCLUDED.is_billed,
                        driver_user_id = EXCLUDED.driver_user_id
                    `};
                `;
                params = [Number(item.load_id), Number(item.title_id), Number(item.vehicle_number), item.order_id ? Number(item.order_id) : null, item.scheduled_date, item.status, Number(item.actual_m3), Number(item.actual_ton), Boolean(item.is_billed), item.driver_user_id ? Number(item.driver_user_id) : null];
            } else if (module === 'timber_loads') {
                query = `
                    INSERT INTO public.kuorma (kuorma_id, tyyppi, asiakas_id, puulaani_id, puutavara_id, auto_id, kulj_id, pvm, m3, km, laskutukseen, kalusto_nro)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (kuorma_id) ${onConflictClause} ${conflictStrategy === 'skip' ? '' : `
                        asiakas_id = EXCLUDED.asiakas_id, puulaani_id = EXCLUDED.puulaani_id,
                        puutavara_id = EXCLUDED.puutavara_id, auto_id = EXCLUDED.auto_id,
                        kulj_id = EXCLUDED.kulj_id, pvm = EXCLUDED.pvm, m3 = EXCLUDED.m3,
                        km = EXCLUDED.km, laskutukseen = EXCLUDED.laskutukseen, kalusto_nro = EXCLUDED.kalusto_nro
                    `};
                `;
                params = [Number(item.kuorma_id), Number(item.tyyppi), Number(item.asiakas_id), item.puulaani_id ? Number(item.puulaani_id) : null, item.puutavara_id ? Number(item.puutavara_id) : null, item.auto_id ? Number(item.auto_id) : null, item.kulj_id ? Number(item.kulj_id) : null, item.pvm, Number(item.m3), Number(item.km), Number(item.laskutukseen), item.kalusto_nro ? Number(item.kalusto_nro) : null];
            } else if (module === 'consignment_loads') {
                query = `
                    INSERT INTO public.rahtikirja (rahti_id, pvm, kuorma_id, rahtikirjan_nro, reitti, m3, m3_hinta, km, km_hinta, kpl, kpl_hinta, jako, jako_hinta, tievero, koko_hinta, lisatiedot, asiakas_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                    ON CONFLICT (rahti_id) ${onConflictClause} ${conflictStrategy === 'skip' ? '' : `
                        pvm = EXCLUDED.pvm, kuorma_id = EXCLUDED.kuorma_id, rahtikirjan_nro = EXCLUDED.rahtikirjan_nro,
                        reitti = EXCLUDED.reitti, m3 = EXCLUDED.m3, m3_hinta = EXCLUDED.m3_hinta,
                        km = EXCLUDED.km, km_hinta = EXCLUDED.km_hinta, kpl = EXCLUDED.kpl, kpl_hinta = EXCLUDED.kpl_hinta,
                        jako = EXCLUDED.jako, jako_hinta = EXCLUDED.jako_hinta, tievero = EXCLUDED.tievero,
                        koko_hinta = EXCLUDED.koko_hinta, lisatiedot = EXCLUDED.lisatiedot, asiakas_id = EXCLUDED.asiakas_id
                    `};
                `;
                params = [Number(item.rahti_id), item.pvm, Number(item.kuorma_id), item.rahtikirjan_nro, item.reitti, Number(item.m3), Number(item.m3_hinta), Number(item.km), Number(item.km_hinta), Number(item.kpl), Number(item.kpl_hinta), Number(item.jako), Number(item.jako_hinta), Number(item.tievero), Number(item.koko_hinta), item.lisatiedot, Number(item.asiakas_id)];
            }

            await client.query(query, params);
        }

        await client.query('COMMIT');
        await logAudit(username, 'IMPORT_EXECUTE', module, `Imported ${data.length} rows successfully using ${conflictStrategy} strategy`, req.ip || '127.0.0.1');
        return res.status(200).json({ success: true, importedCount: data.length });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Import transaction failed, rolled back.", error.message);
        return res.status(500).json({ error: 'Database transaction failed.' });
    } finally {
        client.release();
    }
};