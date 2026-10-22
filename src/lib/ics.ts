import type { cargoInfo } from "./constants";
import { tipoLabel } from "./constants";
import { ESCOLA } from "./escola";
import type { CompromissoComGestor } from "./repo";

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

/** Monta um timestamp iCal (floating/local) a partir de data + hora. */
export function icsTimestamp(iso: string, hora: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

export function icsUtcStamp(value = new Date()): string {
  return (
    `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}` +
    `T${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}${pad(value.getUTCSeconds())}Z`
  );
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function fold(line: string): string {
  if (line.length <= 74) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length > 0) {
    chunks.push(` ${rest.slice(0, 73)}`);
    rest = rest.slice(73);
  }
  return chunks.join("\r\n");
}

export function evento(
  compromisso: CompromissoComGestor,
  cargo: (key: string) => ReturnType<typeof cargoInfo>,
  baseUrl: string,
  options: { comAlarme?: boolean } = {},
): string[] {
  const label = tipoLabel(compromisso.tipo);
  const cargoLabel = cargo(compromisso.cargoResponsavel).label;
  const linhas = [
    "BEGIN:VEVENT",
    `UID:compromisso-${compromisso.id}@agenda-gestao-escolar`,
    `DTSTAMP:${icsUtcStamp()}`,
    `DTSTART:${icsTimestamp(compromisso.dataInicio, compromisso.horaInicio)}`,
    `DTEND:${icsTimestamp(compromisso.dataFim, compromisso.horaFim)}`,
    fold(`SUMMARY:${escapeText(`${compromisso.titulo} · ${label}`)}`),
    fold(
      `DESCRIPTION:${escapeText(
        [
          `Assunto: ${compromisso.assunto}`,
          `Cargo responsável: ${cargoLabel}${
            compromisso.gestorNome ? ` (${compromisso.gestorNome})` : ""
          }`,
          compromisso.participantes ? `Participantes: ${compromisso.participantes}` : "",
          compromisso.descricao ? `\n${compromisso.descricao}` : "",
          `Situação: ${compromisso.status}`,
        ]
          .filter(Boolean)
          .join("\n"),
      )}`,
    ),
    fold(`LOCATION:${escapeText(compromisso.local)}`),
    `STATUS:${compromisso.status === "CANCELADO" ? "CANCELLED" : "CONFIRMED"}`,
    "CATEGORIES:GESTÃO ESCOLAR",
    `URL:${baseUrl}/compromissos/${compromisso.id}`,
  ];

  if (options.comAlarme && compromisso.despertadorAtivo) {
    linhas.push(
      "BEGIN:VALARM",
      "TRIGGER:-PT" + compromisso.lembreteMinutos + "M",
      "ACTION:DISPLAY",
      fold(`DESCRIPTION:${escapeText(`Despertador: ${compromisso.titulo}`)}`),
      "END:VALARM",
    );
    linhas.push(
      "BEGIN:VALARM",
      "TRIGGER:PT0M",
      "ACTION:DISPLAY",
      fold(
        `DESCRIPTION:${escapeText(`Início do compromisso: ${compromisso.titulo} · ${compromisso.local}`)}`,
      ),
      "END:VALARM",
    );
  }

  linhas.push("END:VEVENT");
  return linhas;
}

export function calendario(
  nome: string,
  eventos: string[][],
  baseUrl: string,
): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${ESCOLA.nome}//Agenda Gestao Escolar//PT-BR`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${escapeText(nome)}`),
    "X-WR-TIMEZONE:America/Sao_Paulo",
    fold(`X-WR-CALDESC:${escapeText(`${ESCOLA.nome} - agenda de compromissos da gestao escolar`)}`),
    `URL:${baseUrl}/consulta`,
    ...eventos.flat(),
    "END:VCALENDAR",
  ];
  return `${linhas.join("\r\n")}\r\n`;
}
