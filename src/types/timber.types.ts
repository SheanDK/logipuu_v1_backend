// backend/src/types/timber.types.ts
//1. ITimber type is API response for /api/timber endpoint
export type ITimber = {
  puutavaranro: number;      // db bigint -> ts number
  puutavara: string;         // db character varying -> ts string
  lisatiedot: string;        // db text -> ts string
  aktiivinen: boolean;       // db boolean -> ts boolean
};
