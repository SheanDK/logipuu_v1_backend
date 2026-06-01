// backend/src/schemas/backupSchemas.ts
import { z } from 'zod';

// 1. Vehicle Import Schema
export const VehicleImportSchema = z.object({
    kalusto_nro: z.preprocess((val: unknown) => Number(val), z.number().int().positive()),
    rek_nro: z.string().min(2).max(15),
    ed_katsastus: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    katsastus_aik: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    aktiivinen: z.preprocess((val: unknown) => String(val).toLowerCase() === 'true', z.boolean()),
    planning_group: z.string().max(100).default('General')
});

// 2. User Import Schema
export const UserImportSchema = z.object({
    tunnus: z.string().min(3).max(50),
    nimi: z.string().min(2).max(50),
    taso: z.preprocess((val: unknown) => Number(val), z.number().int().min(1).max(5)),
    salasana: z.string().min(4),
    aktiivinen: z.preprocess((val: unknown) => String(val).toLowerCase() === 'true', z.boolean()),
    kulj_id: z.preprocess((val: unknown) => val ? Number(val) : null, z.number().nullable())
});

// 3. Driver Import Schema
export const DriverImportSchema = z.object({
    kulj_id: z.preprocess((val: unknown) => Number(val), z.number().int().positive()),
    nimi: z.string().min(2).max(50),
    puhelin_nro: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    halytys: z.preprocess((val: unknown) => String(val).toLowerCase() === 'true', z.boolean()).default(true)
});

// 4. Chip Load Import Schema
export const ChipLoadImportSchema = z.object({
    load_id: z.preprocess((val: unknown) => Number(val), z.number().int().positive()),
    title_id: z.preprocess((val: unknown) => Number(val), z.number().int().positive()),
    vehicle_number: z.preprocess((val: unknown) => Number(val), z.number().int().positive()),
    order_id: z.preprocess((val: unknown) => val ? Number(val) : null, z.number().nullable().optional()),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    status: z.string().default('NOT_SENT'),
    actual_m3: z.preprocess((val: unknown) => Number(val), z.number()),
    actual_ton: z.preprocess((val: unknown) => Number(val), z.number()),
    is_billed: z.preprocess((val: unknown) => String(val).toLowerCase() === 'true', z.boolean()).default(false),
    driver_user_id: z.preprocess((val: unknown) => val ? Number(val) : null, z.number().nullable().optional())
});

// 5. Timber Load (public.kuorma) Import Schema
export const TimberLoadImportSchema = z.object({
    kuorma_id: z.preprocess((val: unknown) => Number(val), z.number().int().positive()),
    tyyppi: z.preprocess((val: unknown) => Number(val), z.number().int().default(0)),
    asiakas_id: z.preprocess((val: unknown) => Number(val), z.number().int().positive()),
    puulaani_id: z.preprocess((val: unknown) => val ? Number(val) : null, z.number().nullable().optional()),
    puutavara_id: z.preprocess((val: unknown) => val ? Number(val) : null, z.number().nullable().optional()),
    auto_id: z.preprocess((val: unknown) => val ? Number(val) : null, z.number().nullable().optional()),
    kulj_id: z.preprocess((val: unknown) => val ? Number(val) : null, z.number().nullable().optional()),
    pvm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    m3: z.preprocess((val: unknown) => Number(val), z.number()).default(0),
    km: z.preprocess((val: unknown) => Number(val), z.number()).default(0),
    laskutukseen: z.preprocess((val: unknown) => Number(val), z.number().int().default(0)),
    kalusto_nro: z.preprocess((val: unknown) => val ? Number(val) : null, z.number().nullable().optional())
});

// 6. Consignment (public.rahtikirja) Import Schema
export const ConsignmentImportSchema = z.object({
    rahti_id: z.preprocess((val: unknown) => Number(val), z.number().int().positive()),
    pvm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    kuorma_id: z.preprocess((val: unknown) => Number(val), z.number().int().positive()),
    rahtikirjan_nro: z.string().min(1),
    reitti: z.string().default(''),
    m3: z.preprocess((val: unknown) => Number(val), z.number()).default(0),
    m3_hinta: z.preprocess((val: unknown) => Number(val), z.number()).default(0),
    km: z.preprocess((val: unknown) => Number(val), z.number()).default(0),
    km_hinta: z.preprocess((val: unknown) => Number(val), z.number()).default(0),
    kpl: z.preprocess((val: unknown) => Number(val), z.number()).default(0),
    kpl_hinta: z.preprocess((val: unknown) => Number(val), z.number()).default(0),
    jako: z.preprocess((val: unknown) => Number(val), z.number()).default(0),
    jako_hinta: z.preprocess((val: unknown) => Number(val), z.number()).default(0),
    tievero: z.preprocess((val: unknown) => Number(val), z.number()).default(0),
    koko_hinta: z.preprocess((val: unknown) => Number(val), z.number()).default(0),
    lisatiedot: z.string().default(''),
    asiakas_id: z.preprocess((val: unknown) => Number(val), z.number().int().positive())
});