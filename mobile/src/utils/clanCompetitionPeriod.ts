/**
 * Períodos de la competición mensual entre clanes (zona Europe/Madrid).
 * La primera competición empieza el 1 de junio de 2026 a las 00:00 (hora española).
 * Cada período dura el mes natural (28/30/31 días) y se reinicia el día 1.
 */

export const CLAN_COMPETITION_TZ = 'Europe/Madrid';

/** Primera competición: 1 junio 2026, 00:00 en Madrid. */
export const CLAN_COMPETITION_FIRST_YEAR = 2026;
export const CLAN_COMPETITION_FIRST_MONTH = 6;

export type ClanCompetitionPeriod = {
  /** Inicio del período activo (ms UTC). */
  periodStartMs: number;
  /** Instante en que empieza el siguiente período (ms UTC, exclusivo). */
  periodEndMs: number;
  /** Días hasta el reinicio (redondeo hacia arriba, coherente con el badge «Reinicia en Xd»). */
  daysLeft: number;
  /** false antes del 1-jun-2026: aún no cuenta publicaciones. */
  isCompetitionActive: boolean;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Convierte una fecha/hora civil en `timeZone` a timestamp UTC. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): number {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 4; i++) {
    const p = getZonedParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    utc += target - asUtc;
  }
  return utc;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function addCalendarMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

/**
 * Devuelve el período de competición vigente según la hora actual en Madrid.
 */
export function getClanCompetitionPeriod(nowMs = Date.now()): ClanCompetitionPeriod {
  const tz = CLAN_COMPETITION_TZ;
  const firstStartMs = zonedTimeToUtc(
    CLAN_COMPETITION_FIRST_YEAR,
    CLAN_COMPETITION_FIRST_MONTH,
    1,
    0,
    0,
    0,
    tz,
  );

  if (nowMs < firstStartMs) {
    return {
      periodStartMs: firstStartMs,
      periodEndMs: firstStartMs,
      daysLeft: Math.max(0, Math.ceil((firstStartMs - nowMs) / (24 * 60 * 60 * 1000))),
      isCompetitionActive: false,
    };
  }

  const { year, month } = getZonedParts(new Date(nowMs), tz);
  const periodStartMs = zonedTimeToUtc(year, month, 1, 0, 0, 0, tz);
  const next = addCalendarMonth(year, month);
  const periodEndMs = zonedTimeToUtc(next.year, next.month, 1, 0, 0, 0, tz);

  return {
    periodStartMs,
    periodEndMs,
    daysLeft: Math.max(0, Math.ceil((periodEndMs - nowMs) / (24 * 60 * 60 * 1000))),
    isCompetitionActive: true,
  };
}

/** Días del mes natural del período activo (28, 30 o 31). */
export function getActiveCompetitionMonthLength(nowMs = Date.now()): number {
  const period = getClanCompetitionPeriod(nowMs);
  if (!period.isCompetitionActive) {
    return daysInMonth(CLAN_COMPETITION_FIRST_YEAR, CLAN_COMPETITION_FIRST_MONTH);
  }
  const { year, month } = getZonedParts(new Date(period.periodStartMs), CLAN_COMPETITION_TZ);
  return daysInMonth(year, month);
}
