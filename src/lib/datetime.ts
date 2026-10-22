/** Utilitários de data/hora em pt-BR trabalhando com datas ISO (YYYY-MM-DD). */

const LONG_DATE = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const SHORT_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const DAY_MONTH = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const WEEKDAY = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  timeZone: "UTC",
});

export function isoToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isoFromDate(value: Date): string {
  const y = value.getFullYear();
  const m = `${value.getMonth() + 1}`.padStart(2, "0");
  const d = `${value.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function asDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function fmtLong(iso: string): string {
  return LONG_DATE.format(asDate(iso));
}

export function fmtShort(iso: string): string {
  return SHORT_DATE.format(asDate(iso));
}

export function fmtDayMonth(iso: string): string {
  return DAY_MONTH.format(asDate(iso)).replace(".", "");
}

export function fmtWeekday(iso: string): string {
  return WEEKDAY.format(asDate(iso));
}

export function addDays(iso: string, days: number): string {
  const base = asDate(iso);
  base.setUTCDate(base.getUTCDate() + days);
  return isoFromDate(base);
}

export function diffDays(fromIso: string, toIso: string): number {
  return Math.round((asDate(toIso).getTime() - asDate(fromIso).getTime()) / 86400000);
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0));
  return isoFromDate(last);
}

export function weekRange(iso: string): { inicio: string; fim: string } {
  const base = asDate(iso);
  const weekday = base.getUTCDay(); // 0 = domingo
  const offset = weekday === 0 ? -6 : 1 - weekday;
  const inicio = addDays(iso, offset);
  return { inicio, fim: addDays(inicio, 6) };
}

export function rangeForPeriodo(
  periodo: string,
  hoje = isoToday(),
): { de: string; ate: string } {
  switch (periodo) {
    case "HOJE":
      return { de: hoje, ate: hoje };
    case "SEMANA": {
      const { inicio, fim } = weekRange(hoje);
      return { de: inicio, ate: fim };
    }
    case "PROXIMOS7":
      return { de: hoje, ate: addDays(hoje, 7) };
    case "MES":
      return { de: startOfMonth(hoje), ate: endOfMonth(hoje) };
    case "PASSADOS":
      return { de: "1970-01-01", ate: addDays(hoje, -1) };
    default:
      return { de: "1970-01-01", ate: "2100-12-31" };
  }
}

/** Concatena data + hora locais em um Date (fuso do dispositivo). */
export function toLocalDate(iso: string, hora: string): Date {
  const safeHora = /^\d{2}:\d{2}$/.test(hora) ? hora : "00:00";
  return new Date(`${iso}T${safeHora}:00`);
}

export function fmtPeriodo(
  dataInicio: string,
  dataFim: string,
  horaInicio: string,
  horaFim: string,
): string {
  const mesmoDia = dataInicio === dataFim;
  if (mesmoDia) {
    return `${fmtShort(dataInicio)} · ${horaInicio} às ${horaFim}`;
  }
  return `${fmtShort(dataInicio)} ${horaInicio} → ${fmtShort(dataFim)} ${horaFim}`;
}

export function fmtDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function horaToMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function duracaoMinutos(
  dataInicio: string,
  dataFim: string,
  horaInicio: string,
  horaFim: string,
): number {
  const dias = diffDays(dataInicio, dataFim);
  return dias * 1440 + (horaToMinutos(horaFim) - horaToMinutos(horaInicio));
}

export function fmtHoraRelativa(date: Date, agora = new Date()): string {
  const diff = Math.round((date.getTime() - agora.getTime()) / 1000);
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? "em" : "há";
  if (abs < 60) return diff >= 0 ? "agora" : "há instantes";
  const min = Math.round(abs / 60);
  if (min < 60) return `${suffix} ${min} min`;
  const horas = Math.floor(min / 60);
  const resto = min % 60;
  if (horas < 24) return `${suffix} ${horas}h${resto ? ` ${resto}min` : ""}`;
  const dias = Math.round(horas / 24);
  return `${suffix} ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

export function fmtCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const dias = Math.floor(total / 86400);
  const horas = Math.floor((total % 86400) / 3600);
  const min = Math.floor((total % 3600) / 60);
  const seg = total % 60;
  const pad = (n: number) => `${n}`.padStart(2, "0");
  if (dias > 0) return `${dias}d ${pad(horas)}:${pad(min)}:${pad(seg)}`;
  return `${pad(horas)}:${pad(min)}:${pad(seg)}`;
}

export function labelDiaCurto(iso: string): string {
  const hoje = isoToday();
  const d = diffDays(hoje, iso);
  if (d === 0) return "Hoje";
  if (d === 1) return "Amanhã";
  if (d === -1) return "Ontem";
  return `${fmtWeekday(iso)} · ${fmtDayMonth(iso)}`;
}
