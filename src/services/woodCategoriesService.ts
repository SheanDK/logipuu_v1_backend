import pool from '../config/db';
import {
  IWoodCategory,
} from '../types/woodCategory.types';
import {
  CreateWoodCategoryDto,
  UpdateWoodCategoryDto,
} from '../dto/woodCategory.dto';
import * as woodQueries from '../queries/woodCategoryQueries/woodCategoryQueries';

/** Fetch all wood categories. */
export const getAllWoodCategories = async (): Promise<IWoodCategory[]> => {
  try {
    const result = await pool.query(woodQueries.SELECT_ALL_WOOD_CATEGORIES);
    return result.rows as IWoodCategory[];
  } catch (error) {
    console.error('WOOD_CATEGORY_SERVICE: Error fetching all categories:', error);
    throw error;
  }
};

/** Fetch a single wood category by id. */
export const getWoodCategoryById = async (id: number): Promise<IWoodCategory | null> => {
  try {
    const result = await pool.query(woodQueries.SELECT_WOOD_CATEGORY_BY_ID, [id]);
    if (result.rows.length === 0) return null;
    return result.rows[0] as IWoodCategory;
  } catch (error) {
    console.error(`WOOD_CATEGORY_SERVICE: Error fetching category by ID ${id}:`, error);
    throw error;
  }
};

/** Create a new wood category. */
export const createWoodCategory = async (
  data: CreateWoodCategoryDto
): Promise<IWoodCategory> => {
  const { puutavara, lisatiedot, aktiivinen } = data;
  try {
    const result = await pool.query(woodQueries.INSERT_WOOD_CATEGORY, [
      puutavara,
      lisatiedot ?? null,
      aktiivinen ?? true,
    ]);
    return result.rows[0] as IWoodCategory;
  } catch (error) {
    console.error('WOOD_CATEGORY_SERVICE: Error creating category:', error);
    throw error;
  }
};

/** Update an existing wood category (partial update). */
export const updateWoodCategory = async (
  id: number,
  data: UpdateWoodCategoryDto
): Promise<IWoodCategory | null> => {
  try {
    const existing = await getWoodCategoryById(id);
    if (!existing) return null;

    const merged = {
      puutavara: data.puutavara ?? existing.puutavara,
      lisatiedot: data.lisatiedot ?? existing.lisatiedot,
      aktiivinen:
        typeof data.aktiivinen === 'boolean' ? data.aktiivinen : existing.aktiivinen,
    };

    const result = await pool.query(woodQueries.UPDATE_WOOD_CATEGORY_BY_ID, [
      merged.puutavara,
      merged.lisatiedot,
      merged.aktiivinen,
      id,
    ]);

    return result.rows[0] as IWoodCategory;
  } catch (error) {
    console.error(`WOOD_CATEGORY_SERVICE: Error updating category ID ${id}:`, error);
    throw error;
  }
};

/** Delete a wood category by id. */
export const deleteWoodCategory = async (
  id: number
): Promise<{ woodCategoryId: number; message: string } | null> => {
  try {
    const result = await pool.query(woodQueries.DELETE_WOOD_CATEGORY_BY_ID, [id]);
    if (result.rowCount === 0) return null;

    return {
      woodCategoryId: result.rows[0].puutavaraNro,
      message: 'Wood category deleted successfully',
    };
  } catch (error) {
    console.error(`WOOD_CATEGORY_SERVICE: Error deleting category ID ${id}:`, error);
    throw error;
  }
};
