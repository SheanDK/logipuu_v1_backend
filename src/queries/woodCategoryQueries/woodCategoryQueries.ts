// backend/src/queries/woodCategoryQueries/woodCategoryQueries.ts

// 1. SELECT_ALL_WOOD_CATEGORIES
export const SELECT_ALL_WOOD_CATEGORIES = `
  SELECT puutavara_nro AS "puutavaraNro",
         puutavara,
         lisatiedot,
         aktiivinen
  FROM public.puutavarat
  ORDER BY LOWER(puutavara) ASC, puutavara_nro ASC;
`;

// 2. SELECT_WOOD_CATEGORY_BY_ID
export const SELECT_WOOD_CATEGORY_BY_ID = `
  SELECT puutavara_nro AS "puutavaraNro",
         puutavara,
         lisatiedot,
         aktiivinen
  FROM public.puutavarat
  WHERE puutavara_nro = $1
  LIMIT 1;
`;

// 3. INSERT_WOOD_CATEGORY
export const INSERT_WOOD_CATEGORY = `
  INSERT INTO public.puutavarat (puutavara, lisatiedot, aktiivinen)
  VALUES ($1, $2, COALESCE($3, TRUE))
  RETURNING puutavara_nro AS "puutavaraNro",
            puutavara,
            lisatiedot,
            aktiivinen;
`;

// 4. UPDATE_WOOD_CATEGORY_BY_ID
export const UPDATE_WOOD_CATEGORY_BY_ID = `
  UPDATE public.puutavarat
  SET puutavara = $1,
      lisatiedot = $2,
      aktiivinen = $3
  WHERE puutavara_nro = $4
  RETURNING puutavara_nro AS "puutavaraNro",
            puutavara,
            lisatiedot,
            aktiivinen;
`;

// 5. DELETE_WOOD_CATEGORY_BY_ID
export const DELETE_WOOD_CATEGORY_BY_ID = `
  DELETE FROM public.puutavarat
  WHERE puutavara_nro = $1
  RETURNING puutavara_nro AS "puutavaraNro";
`;