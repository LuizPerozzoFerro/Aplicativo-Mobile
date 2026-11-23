/** Dia de marco vindo da rota (texto): inteiro de 1 a 9999, ou null. */
export function parseMilestoneDay(value: unknown): number | null {
  const day = typeof value === 'string' && /^\d{1,4}$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(day) && day >= 1 ? day : null;
}
