// backend/src/types/woodCategory.types.ts

/**
 * Application-layer model for rows from table `public.puutavarat`.
 * Keys are camelCased to align with the rest of the codebase and the camelcase-keys middleware.
 */
export interface IWoodCategory {
  puutavaraNro: number;      // PK of puutavarat
  puutavara: string;         // Name of the wood category
  lisatiedot: string | null; // Optional description
  aktiivinen: boolean;       // Active flag
}

/**
 * DTO returned to the frontend.
 * Kept identical to IWoodCategory for simplicity (you can split later if needed).
 */
export interface IWoodCategoryDto {
  puutavaraNro: number;
  puutavara: string;
  lisatiedot: string | null;
  aktiivinen: boolean;
}

/**
 * Payload for create operation.
 * Maps directly to DB columns (`puutavara`, `lisatiedot`, `aktiivinen`).
 */
export interface ICreateWoodCategoryInput {
  puutavara: string;
  lisatiedot?: string | null;
  aktiivinen?: boolean; // Defaults to true if omitted
}

/**
 * Payload for partial update operation.
 * Any field may be provided; only provided fields are updated.
 */
export interface IUpdateWoodCategoryInput {
  puutavara?: string;
  lisatiedot?: string | null;
  aktiivinen?: boolean;
}
