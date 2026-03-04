// backend/src/services/otherMarkerService.ts
import pool from '../config/db';
import * as query from '../queries/mapQueries/otherMarkerQueries';
import { CreateOtherMarkerDto, UpdateOtherMarkerDto } from '../dto/otherMarker.dto';

// 1. Get All Other Markers
export const getAllOtherMarkers = async () => {
    const { rows } = await pool.query(query.SELECT_ALL_OTHER_MARKERS);
    return rows;
};

// 2. Get Other Marker by ID
export const getOtherMarkerById = async (id: number) => {
    const { rows } = await pool.query(query.SELECT_OTHER_MARKER_BY_ID, [id]);
    return rows[0] || null;
};

// 3. Create Other Marker
export const createOtherMarker = async (data: CreateOtherMarkerDto) => {
    const params = [data.name, data.iconType, data.additionalInfo, data.color, data.latitude, data.longitude];
    const { rows } = await pool.query(query.INSERT_OTHER_MARKER, params);
    return rows[0];
};

// 4. Update Other Marker
export const updateOtherMarker = async (id: number, data: UpdateOtherMarkerDto) => {
    const existing = await getOtherMarkerById(id);
    if (!existing) return null;

    const params = [
        data.name ?? existing.nimi,
        data.iconType ?? existing.tyyppi,
        data.additionalInfo ?? existing.lisatieto,
        data.color ?? existing.vari,
        data.latitude ?? existing.sijaintiLat,
        data.longitude ?? existing.sijaintiLong,
        id
    ];
    const { rows } = await pool.query(query.UPDATE_OTHER_MARKER, params);
    return rows[0];
};

// 5. Delete Other Marker
export const deleteOtherMarker = async (id: number) => {
    const result = await pool.query(query.DELETE_OTHER_MARKER, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
};