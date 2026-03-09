// backend/src/types/woodCategory.types.ts

//1. This interface is API response for /api/woodCategory endpoint.
export interface IWoodCategory {
  puutavaraNro: number;
  puutavara: string;
  lisatiedot: string | null;
  aktiivinen: boolean;
}

//2. This interface is API response for /api/woodCategory endpoint.
export interface IWoodCategoryDto {
  puutavaraNro: number;
  puutavara: string;
  lisatiedot: string | null;
  aktiivinen: boolean;
}

//3. This interface is API response for /api/woodCategory endpoint.
export interface ICreateWoodCategoryInput {
  puutavara: string;
  lisatiedot?: string | null;
  aktiivinen?: boolean;
}

//4. This interface is API response for /api/woodCategory endpoint.
export interface IUpdateWoodCategoryInput {
  puutavara?: string;
  lisatiedot?: string | null;
  aktiivinen?: boolean;
}
