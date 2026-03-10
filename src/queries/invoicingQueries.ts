// backend/src/queries/invoicingQueries.ts
import { UpdateInvoicingDto } from "../services/invoicingService";

// 1. buildInvoicingSearchQuery
export function buildInvoicingSearchQuery(filters: {
  dateFrom: string;
  dateTo: string;
  customerId: number | null;
  vehicleId: number | null;
  woodTypeIdList: number[];
  unbilled: boolean;
  billed: boolean;
}) {
  const params: any[] = [];
  const where: string[] = [];

  where.push(`kk.laskutukseen = 0`);
  where.push(`kk.tyyppi = 0`);

  params.push(filters.dateFrom);
  params.push(filters.dateTo);
  where.push(`kk.pvm BETWEEN $${params.length - 1} AND $${params.length}`);

  if (filters.customerId !== null && filters.customerId !== undefined) {
    params.push(filters.customerId);
    where.push(`kk.asiakas_id = $${params.length}`);
  }

  if (filters.vehicleId !== null && filters.vehicleId !== undefined) {
    params.push(filters.vehicleId);
    where.push(`kk.kalusto_nro = $${params.length}`);
  }

  if (Array.isArray(filters.woodTypeIdList) && filters.woodTypeIdList.length > 0) {
    params.push(filters.woodTypeIdList);
    where.push(`pt.puutavara_nro = ANY($${params.length}::bigint[])`);
  }

  if (filters.unbilled && !filters.billed) {
    where.push(`kk.pvm_laskutus IS NULL`);
  } else if (!filters.unbilled && filters.billed) {
    where.push(`kk.pvm_laskutus IS NOT NULL`);
  }

  const sql = `
    SELECT
      pu.nimi                 AS pnimi,
      kk.pvm_laskutus         AS pvm_laskutus,
      ask.asiakkaan_nimi      AS asiakas,
      ptt.puutavara           AS puutavara,
      kk.pvm                  AS pvm,

      kk.vastaanotto_nro      AS vastaanotto_nro,
      kk.reitti               AS reitti,

      kk.m3                   AS m3,
      kk.km                   AS km,
      kk.tunnit               AS tunnit,
      kk.kpl                  AS kpl,

      kk.m3_hinta             AS m3_hinta,
      kk.km_hinta             AS km_hinta,
      kk.tunnit_hinta         AS tunnit_hinta,
      kk.kpl_hinta            AS kpl_hinta,

      kk.laskutukseen         AS laskutukseen,
      kk.kokohinta            AS kokohinta,
      kk.kuorma_id            AS kuorma_id,
      kk.lisatiedot           AS lisatiedot,
      kk.ajomaarays_nro       AS ajomaarays_nro,
      kl.rek_nro              AS auto_nro,
      ku.nimi                 AS knimi
    FROM puutavaralaji    AS pt
    INNER JOIN puutavarat AS ptt ON pt.puutavara_nro = ptt.puutavara_nro
    INNER JOIN kuorma     AS kk  ON pt.puutavara_id  = kk.puutavara_id

    LEFT JOIN puulaani     AS pu  ON pu.puulaani_id   = pt.puulaani_id
    LEFT JOIN asiakkaat    AS ask ON kk.asiakas_id    = ask.asiakkaan_id
    LEFT JOIN kuljettajat  AS ku  ON kk.kulj_id       = ku.kulj_id
    LEFT JOIN kalusto      AS kl  ON kk.kalusto_nro   = kl.kalusto_nro

    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY kk.pvm DESC, kk.kuorma_id DESC
    LIMIT 10000
  `;

  return { sql, params };
}

// 2. buildUpdateInvoicingRowQuery
export function buildUpdateInvoicingRowQuery(id: number, dto: UpdateInvoicingDto) {
  const sets: string[] = [];
  const params: any[] = [];
  let i = 1;

  const push = (fragment: string, value: any) => {
    sets.push(fragment.replace('?', `$${i}`));
    params.push(value);
    i += 1;
  };

  if (dto.waybillNumber !== undefined) push('ajomaarays_nro = ?', dto.waybillNumber);
  if (dto.vastaanottoNro !== undefined) push('vastaanotto_nro = ?', dto.vastaanottoNro);
  if (dto.route !== undefined) push('reitti = ?', dto.route);
  if (dto.notes !== undefined) push('lisatiedot = ?', dto.notes);

  if (dto.m3 !== undefined) push('m3 = ?', dto.m3);
  if (dto.km !== undefined) push('km = ?', dto.km);
  if (dto.hours !== undefined) push('tunnit = ?', dto.hours);
  if (dto.pieces !== undefined) push('kpl = ?', dto.pieces);

  if (dto.unitPriceM3 !== undefined) push('m3_hinta = ?', dto.unitPriceM3);
  if (dto.unitPriceKm !== undefined) push('km_hinta = ?', dto.unitPriceKm);
  if (dto.unitPriceHour !== undefined) push('tunnit_hinta = ?', dto.unitPriceHour);
  if (dto.unitPricePiece !== undefined) push('kpl_hinta = ?', dto.unitPricePiece);

  if (dto.kokohinta !== undefined) push('kokohinta = ?', dto.kokohinta);

  if (dto.billedDate !== undefined) {
    sets.push(`pvm_laskutus = $${i}::date`);
    params.push(dto.billedDate);
    i += 1;
  }

  if (!sets.length) return { sql: '', params: [] };

  params.push(id);
  const sql = `UPDATE kuorma SET ${sets.join(', ')} WHERE kuorma_id = $${i}`;
  return { sql, params };
}

// 3. buildGetInvoicingRowByIdQuery
export function buildGetInvoicingRowByIdQuery(id: number) {
  const sql = `
    SELECT
      pu.nimi                 AS pnimi,
      kk.pvm_laskutus         AS pvm_laskutus,
      ask.asiakkaan_nimi      AS asiakas,
      ptt.puutavara           AS puutavara,
      kk.pvm                  AS pvm,

      kk.vastaanotto_nro      AS vastaanotto_nro,
      kk.reitti               AS reitti,

      kk.m3                   AS m3,
      kk.km                   AS km,
      kk.tunnit               AS tunnit,
      kk.kpl                  AS kpl,

      kk.m3_hinta             AS m3_hinta,
      kk.km_hinta             AS km_hinta,
      kk.tunnit_hinta         AS tunnit_hinta,
      kk.kpl_hinta            AS kpl_hinta,

      kk.laskutukseen         AS laskutukseen,
      kk.kokohinta            AS kokohinta,
      kk.kuorma_id            AS kuorma_id,
      kk.lisatiedot           AS lisatiedot,
      kk.ajomaarays_nro       AS ajomaarays_nro,
      kl.rek_nro              AS auto_nro,
      ku.nimi                 AS knimi
    FROM kuorma kk
    INNER JOIN puutavaralaji pt  ON pt.puutavara_id  = kk.puutavara_id
    INNER JOIN puutavarat   ptt  ON pt.puutavara_nro = ptt.puutavara_nro
    LEFT JOIN puulaani      pu   ON pu.puulaani_id   = pt.puulaani_id
    LEFT JOIN asiakkaat     ask  ON kk.asiakas_id    = ask.asiakkaan_id
    LEFT JOIN kuljettajat   ku   ON kk.kulj_id       = ku.kulj_id
    LEFT JOIN kalusto       kl   ON kk.kalusto_nro   = kl.kalusto_nro
    WHERE kk.kuorma_id = $1
    LIMIT 1
  `;
  return { sql, params: [id] };
}

// 4. buildInvoicePrefetchQuery
export function buildInvoicePrefetchQuery(ids: number[]) {
  const sql = `
    SELECT kuorma_id, pvm_laskutus
    FROM kuorma
    WHERE kuorma_id::bigint = ANY($1::bigint[])
  `;
  const params = [ids];
  return { sql, params };
}

// 5. buildInvoiceManyUpdateQuery
export function buildInvoiceManyUpdateQuery(ids: number[]) {
  const sql = `
    UPDATE kuorma
    SET pvm_laskutus = CURRENT_DATE
    WHERE kuorma_id::bigint = ANY($1::bigint[])
      AND pvm_laskutus IS NULL
    RETURNING kuorma_id
  `;
  const params = [ids];
  return { sql, params };
}
