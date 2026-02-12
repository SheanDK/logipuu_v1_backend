// src/controllers/chipTitleController.ts

import { Request, Response } from 'express';
import pool from '../config/db';

// ලියාපදිංචි කළ සියලුම Nimikkeet ලබා ගැනීම
export const getAllChipTitles = async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT 
                ct.*, 
                a.asiakkaan_nimi as customer_name,
                p.nimi as origin_name,
                pp.purkupaikka as destination_name,
                pt.puutavara as product_name
            FROM chip_titles ct
            JOIN asiakkaat a ON ct.asiakas_id = a.asiakkaan_id
            JOIN puulaani p ON ct.lahto_paikka_id = p.puulaani_id
            JOIN purkupaikka pp ON ct.purku_paikka_id = pp.purkupaikka_id
            JOIN puutavarat pt ON ct.tuote_nro = pt.puutavara_nro
            ORDER BY ct.title_id DESC;
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error: any) {
        console.error('ERROR in getAllChipTitles:', error.message);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
};

// create new chip title
export const createChipTitle = async (req: Request, res: Response) => {
    try {
        // frontend data
        const {
            asiakas_id,
            lahto_paikka_id,
            purku_paikka_id,
            tuote_nro,
            nimike_nimi,
            lyhenne,
            tuote_tyyppi_nimi,
            laskutusperuste,
            ohjeet_kuljettajalle,
            req_kpl,
            req_m3,
            req_ton,
            req_h,
            req_odotus,
            req_km,
            aktiivinen
        } = req.body;

        // validation
        if (!asiakas_id || !lahto_paikka_id || !purku_paikka_id || !tuote_nro || !nimike_nimi) {
            return res.status(400).json({ error: 'Missing required fields. Please fill all mandatory fields.' });
        }

        const query = `
            INSERT INTO public.chip_titles (
                asiakas_id, 
                lahto_paikka_id, 
                purku_paikka_id, 
                tuote_nro, 
                nimike_nimi,
                lyhenne,
                tuote_tyyppi_nimi,
                laskutusperuste,
                ohjeet_kuljettajalle,
                req_kpl,
                req_m3,
                req_ton,
                req_h,
                req_odotus,
                req_km,
                aktiivinen
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
            RETURNING *;
        `;

        const values = [
            Number(asiakas_id),
            Number(lahto_paikka_id),
            Number(purku_paikka_id),
            Number(tuote_nro),
            nimike_nimi,
            lyhenne || null,
            tuote_tyyppi_nimi || null,
            laskutusperuste || 'Tons',
            ohjeet_kuljettajalle || null,
            !!req_kpl,
            !!req_m3,
            !!req_ton,
            !!req_h,
            !!req_odotus,
            !!req_km,
            aktiivinen !== false
        ];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);

    } catch (error: any) {
        console.error('ERROR in createChipTitle:', error.message);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// update chip title
export const updateChipTitle = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            asiakas_id,
            lahto_paikka_id,
            purku_paikka_id,
            tuote_nro,
            nimike_nimi,
            lyhenne,
            tuote_tyyppi_nimi,
            laskutusperuste,
            ohjeet_kuljettajalle,
            req_kpl,
            req_m3,
            req_ton,
            req_h,
            req_odotus,
            req_km,
            aktiivinen
        } = req.body;

        const query = `
            UPDATE public.chip_titles 
            SET 
                asiakas_id = $1, 
                lahto_paikka_id = $2, 
                purku_paikka_id = $3, 
                tuote_nro = $4, 
                nimike_nimi = $5,
                lyhenne = $6,
                tuote_tyyppi_nimi = $7,
                laskutusperuste = $8,
                ohjeet_kuljettajalle = $9,
                req_kpl = $10,
                req_m3 = $11,
                req_ton = $12,
                req_h = $13,
                req_odotus = $14,
                req_km = $15,
                aktiivinen = $16
            WHERE title_id = $17
            RETURNING *;
        `;

        const values = [
            Number(asiakas_id),
            Number(lahto_paikka_id),
            Number(purku_paikka_id),
            Number(tuote_nro),
            nimike_nimi,
            lyhenne || null,
            tuote_tyyppi_nimi || null,
            laskutusperuste || 'Tons',
            ohjeet_kuljettajalle || null,
            !!req_kpl,
            !!req_m3,
            !!req_ton,
            !!req_h,
            !!req_odotus,
            !!req_km,
            aktiivinen !== false,
            Number(id)
        ];

        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chip title not found' });
        }
        res.status(200).json(result.rows[0]);

    } catch (error: any) {
        console.error('ERROR in updateChipTitle:', error.message);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};