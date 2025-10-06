import { SaveConsignmentDto } from '../services/consignmentService';

/**
 * Consignment invoicing – search and get by id
 *
 * Date filter uses the load date (kk.pvm) to stay aligned with the legacy system.
 *
 * Billing status mapping:
 *  - unbilled => kk.laskutukseen IN (0,1) AND kk.pvm_laskutus IS NULL
 *  - billed   => kk.laskutukseen IN (3)   AND kk.pvm_laskutus IS NOT NULL
 */

/**
 * Build a parameterized SQL query for consignment search.
 * Uses positional parameters ($1, $2, …) to avoid SQL injection.
 */
export function buildConsignmentSearchQuery(filters: {
  dateFrom: string;
  dateTo: string;
  customerId: number | null;
  vehicleId: number | null; // maps to kalusto_nro
  unbilled: boolean;
  billed: boolean;
}) {
  const params: any[] = [];
  const where: string[] = [];

  // Limit to waybill consignment rows
  where.push(`kk.tyyppi = 1`);

  // Date boundaries use the load date
  params.push(filters.dateFrom);
  params.push(filters.dateTo);
  where.push(`kk.pvm BETWEEN $${params.length - 1} AND $${params.length}`);

  if (filters.customerId != null) {
    params.push(filters.customerId);
    where.push(`kk.asiakas_id = $${params.length}`);
  }

  if (filters.vehicleId != null) {
    params.push(filters.vehicleId);
    // matches the schema column name
    where.push(`kk.kalusto_nro = $${params.length}`);
  }

  // Mutually exclusive status filters (if both true/false, show all)
  if (filters.unbilled && !filters.billed) {
    where.push(`kk.laskutukseen = 0`);
    where.push(`kk.pvm_laskutus IS NULL`);
  } else if (!filters.unbilled && filters.billed) {
    where.push(`kk.laskutukseen = 3`);
    where.push(`kk.pvm_laskutus IS NOT NULL`);
  }

  const sql = `
    SELECT
      rk.rahti_id,
      rk.pvm,
      rk.reitti,
      rk.lisatiedot,
      rk.rahtikirjan_nro,

      rk.m3,           rk.m3_hinta,
      rk.km,           rk.km_hinta,
      rk.kpl,          rk.kpl_hinta,
      rk.jako,         rk.jako_hinta,
      rk.tievero,
      rk.koko_hinta      AS kokohinta,  -- unified alias for the frontend

      ask.asiakkaan_nimi AS asiakas,
      kl.rek_nro         AS auto_nro,
      ku.nimi            AS knimi,
      ptt.puutavara      AS puutavara,

      kk.pvm_laskutus,
      kk.laskutukseen,
      kk.kuorma_id
    FROM rahtikirja rk
    INNER JOIN kuorma kk           ON rk.kuorma_id    = kk.kuorma_id
    LEFT  JOIN asiakkaat ask       ON kk.asiakas_id   = ask.asiakkaan_id
    LEFT  JOIN kuljettajat ku      ON kk.kulj_id      = ku.kulj_id
    LEFT  JOIN kalusto kl          ON kk.kalusto_nro  = kl.kalusto_nro
    LEFT  JOIN puutavaralaji pt    ON kk.puutavara_id = pt.puutavara_id
    LEFT  JOIN puutavarat ptt      ON pt.puutavara_nro = ptt.puutavara_nro
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY kk.pvm DESC, rk.pvm DESC, rk.rahti_id DESC
    LIMIT 10000
  `;
  return { sql, params };
}

/**
 * Build a parameterized SQL query to fetch a single consignment by rahti_id.
 */
export function buildGetConsignmentByIdQuery(id: number) {
  const sql = `
    SELECT
      rk.rahti_id,
      rk.pvm,
      rk.reitti,
      rk.lisatiedot,
      rk.rahtikirjan_nro,

      rk.m3,           rk.m3_hinta,
      rk.km,           rk.km_hinta,
      rk.kpl,          rk.kpl_hinta,
      rk.jako,         rk.jako_hinta,
      rk.tievero,
      rk.koko_hinta      AS kokohinta,

      ask.asiakkaan_nimi AS asiakas,
      kl.rek_nro         AS auto_nro,
      ku.nimi            AS knimi,
      ptt.puutavara      AS puutavara,

      kk.pvm_laskutus,
      kk.laskutukseen,
      kk.kuorma_id
    FROM rahtikirja rk
    INNER JOIN kuorma kk           ON rk.kuorma_id    = kk.kuorma_id
    LEFT  JOIN asiakkaat ask       ON kk.asiakas_id   = ask.asiakkaan_id
    LEFT  JOIN kuljettajat ku      ON kk.kulj_id      = ku.kulj_id
    LEFT  JOIN kalusto kl          ON kk.kalusto_nro  = kl.kalusto_nro
    LEFT  JOIN puutavaralaji pt    ON kk.puutavara_id = pt.puutavara_id
    LEFT  JOIN puutavarat ptt      ON pt.puutavara_nro = ptt.puutavara_nro
    WHERE rk.rahti_id = $1
    LIMIT 1
  `;
  return { sql, params: [id] };
}

/**
 * Build INSERT for a new consignment row (rahtikirja).
 * Note: explicit casts ensure correct types for Postgres.
 */
export function buildInsertConsignmentQuery(dto: {
  kuormaId: number;
  pvm: string | null;
  rahtikirjanNro: string | null;
  reitti: string | null;
  lisatiedot: string | null;
  m3: number; m3_hinta: number;
  km: number; km_hinta: number;
  kpl: number; kpl_hinta: number;
  jako: number; jako_hinta: number;
  tievero: number; koko_hinta: number;
}) {
  const sql = `
    INSERT INTO rahtikirja (
      kuorma_id, pvm, rahtikirjan_nro, reitti, lisatiedot,
      m3, m3_hinta, km, km_hinta, kpl, kpl_hinta, jako, jako_hinta, tievero, koko_hinta
    ) VALUES (
      $1::bigint, $2::date, $3, $4, $5,
      $6::numeric, $7::numeric, $8::numeric, $9::numeric, $10::numeric, $11::numeric,
      $12::numeric, $13::numeric, $14::numeric, $15::numeric
    )
    RETURNING rahti_id AS "rahti_id"
  `;
  const params = [
    dto.kuormaId, dto.pvm, dto.rahtikirjanNro, dto.reitti, dto.lisatiedot,
    dto.m3, dto.m3_hinta, dto.km, dto.km_hinta, dto.kpl, dto.kpl_hinta,
    dto.jako, dto.jako_hinta, dto.tievero, dto.koko_hinta
  ];
  return { sql, params };
}

/**
 * Build UPDATE for an existing consignment row.
 * Only provided fields are updated (partial update).
 */
export function buildUpdateConsignmentQuery(id: number, dto: any) {
  const sets: string[] = [];
  const params: any[] = [];
  let i = 1;

  const push = (frag: string, v: any, cast = '') => {
    sets.push(frag.replace('?', `$${i}${cast}`));
    params.push(v);
    i += 1;
  };

  // Nullable text/date fields
  if (dto.pvm !== undefined) push('pvm = ?', dto.pvm, '::date');
  if (dto.rahtikirjanNro !== undefined) push('rahtikirjan_nro = ?', dto.rahtikirjanNro);
  if (dto.reitti !== undefined) push('reitti = ?', dto.reitti);
  if (dto.lisatiedot !== undefined) push('lisatiedot = ?', dto.lisatiedot);

  // Numeric fields
  if (dto.m3 !== undefined) push('m3 = ?', dto.m3, '::numeric');
  if (dto.m3_hinta !== undefined) push('m3_hinta = ?', dto.m3_hinta, '::numeric');
  if (dto.km !== undefined) push('km = ?', dto.km, '::numeric');
  if (dto.km_hinta !== undefined) push('km_hinta = ?', dto.km_hinta, '::numeric');
  if (dto.kpl !== undefined) push('kpl = ?', dto.kpl, '::numeric');
  if (dto.kpl_hinta !== undefined) push('kpl_hinta = ?', dto.kpl_hinta, '::numeric');
  if (dto.jako !== undefined) push('jako = ?', dto.jako, '::numeric');
  if (dto.jako_hinta !== undefined) push('jako_hinta = ?', dto.jako_hinta, '::numeric');
  if (dto.tievero !== undefined) push('tievero = ?', dto.tievero, '::numeric');
  if (dto.koko_hinta !== undefined) push('koko_hinta = ?', dto.koko_hinta, '::numeric');

  if (!sets.length) return { sql: '', params: [] };

  params.push(id);
  const sql = `UPDATE rahtikirja SET ${sets.join(', ')} WHERE rahti_id = $${i}::bigint`;
  return { sql, params };
}
