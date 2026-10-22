import { cargoInfo, tipoLabel } from "./constants";
import { fmtLong, fmtPeriodo } from "./datetime";
import { ESCOLA } from "./escola";

/** Finalidades de comunicação por WhatsApp. */
export type FinalidadeKey =
  | "CONVITE"
  | "LEMBRETE"
  | "CONFIRMACAO"
  | "ALTERACAO"
  | "CANCELAMENTO"
  | "AGRADECIMENTO";

export const FINALIDADES: {
  key: FinalidadeKey;
  label: string;
  descricao: string;
  emoji: string;
}[] = [
  {
    key: "CONVITE",
    label: "Convite / convocação",
    descricao: "Comunica o agendamento com data, hora, assunto e local.",
    emoji: "📩",
  },
  {
    key: "LEMBRETE",
    label: "Lembrete do despertador",
    descricao: "Aviso de proximidade do compromisso.",
    emoji: "⏰",
  },
  {
    key: "CONFIRMACAO",
    label: "Confirmação de participação",
    descricao: "Solicita confirmação de presença do responsável.",
    emoji: "✅",
  },
  {
    key: "ALTERACAO",
    label: "Alteração de data, hora ou local",
    descricao: "Comunica mudanças no compromisso já agendado.",
    emoji: "🔁",
  },
  {
    key: "CANCELAMENTO",
    label: "Cancelamento",
    descricao: "Informa o cancelamento do compromisso.",
    emoji: "🚫",
  },
  {
    key: "AGRADECIMENTO",
    label: "Agradecimento / registro",
    descricao: "Registro de encerramento após a realização.",
    emoji: "🙏",
  },
];

export const FINALIDADES_KEYS = FINALIDADES.map((f) => f.key) as [
  FinalidadeKey,
  ...FinalidadeKey[],
];

export function finalidadeInfo(key: string) {
  return (
    FINALIDADES.find((f) => f.key === key) ?? {
      key: "CONVITE" as FinalidadeKey,
      label: key,
      descricao: "",
      emoji: "📩",
    }
  );
}

/**
 * Normaliza o telefone para o padrão aceito pelo WhatsApp (somente dígitos,
 * com código do país). No Brasil, aplica o DDI 55 quando ausente.
 */
export function normalizarTelefone(valor: string | null | undefined): string | null {
  if (!valor) return null;
  let digitos = valor.replace(/\D/g, "");
  if (digitos.length === 0) return null;

  // Remove zeros de operadora/DDD longa distância no início
  while (digitos.startsWith("0")) digitos = digitos.slice(1);

  if (digitos.startsWith("55")) {
    return digitos.length >= 12 && digitos.length <= 13 ? digitos : null;
  }
  if (digitos.length === 10 || digitos.length === 11) {
    return `55${digitos}`;
  }
  return digitos.length >= 12 ? digitos : null;
}

export function telefoneFormatado(valor: string | null | undefined): string {
  const normalizado = normalizarTelefone(valor);
  if (!normalizado) return valor?.trim() || "sem telefone";
  const nacional = normalizado.startsWith("55") ? normalizado.slice(2) : normalizado;
  if (nacional.length === 11) {
    return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 7)}-${nacional.slice(7)}`;
  }
  if (nacional.length === 10) {
    return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 6)}-${nacional.slice(6)}`;
  }
  return `+${normalizado}`;
}

/** Gera o link wa.me (click-to-chat) já com a mensagem codificada. */
export function linkWhatsApp(
  telefone: string | null | undefined,
  mensagem: string,
): string | null {
  const numero = normalizarTelefone(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export type DadosMensagem = {
  titulo: string;
  tipo: string;
  assunto: string;
  descricao?: string | null;
  cargoResponsavel: string;
  responsavel?: string | null;
  local: string;
  dataInicio: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  participantes?: string | null;
  status: string;
  prioridade?: string;
  lembreteMinutos?: number;
  id: number;
};

const STATUS_LABEL: Record<string, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  EM_ANDAMENTO: "Em andamento",
  REALIZADO: "Realizado",
  ADIADO: "Adiado",
  CANCELADO: "Cancelado",
};

function descricaoLembrete(minutos?: number): string {
  if (!minutos) return "";
  if (minutos < 60) return `${minutos} minutos antes`;
  if (minutos === 60) return "1 hora antes";
  if (minutos === 1440) return "1 dia antes";
  return `${minutos / 60} horas antes`;
}

/** Monta a mensagem completa conforme a finalidade escolhida. */
export function montarMensagem(
  dados: DadosMensagem,
  finalidade: FinalidadeKey,
  baseUrl: string,
  destinatario = "{{nome}}",
): string {
  const cargo = cargoInfo(dados.cargoResponsavel);
  const tituloBloco: Record<FinalidadeKey, string> = {
    CONVITE: "CONVOCAÇÃO / CONVITE DE COMPROMISSO",
    LEMBRETE: "LEMBRETE DE COMPROMISSO",
    CONFIRMACAO: "CONFIRMAÇÃO DE PARTICIPAÇÃO",
    ALTERACAO: "ALTERAÇÃO DE COMPROMISSO",
    CANCELAMENTO: "CANCELAMENTO DE COMPROMISSO",
    AGRADECIMENTO: "REGISTRO DE COMPROMISSO REALIZADO",
  };

  const periodo =
    dados.dataInicio === dados.dataFim
      ? `${fmtLong(dados.dataInicio)} · ${dados.horaInicio} às ${dados.horaFim}`
      : `${fmtLong(dados.dataInicio)} ${dados.horaInicio} → ${fmtLong(dados.dataFim)} ${dados.horaFim}`;

  const linhas: string[] = [
    "*AGENDA DA GESTÃO ESCOLAR*",
    ESCOLA.nome,
    "",
    `*${tituloBloco[finalidade]}*`,
    "",
    `Olá, ${destinatario}!`,
  ];

  const abertura: Record<FinalidadeKey, string> = {
    CONVITE: "Você tem um novo compromisso registrado na agenda da gestão:",
    LEMBRETE: "Passando para lembrar do seu compromisso que está próximo:",
    CONFIRMACAO: "Pedimos a gentileza de confirmar sua participação no compromisso abaixo:",
    ALTERACAO: "O compromisso abaixo sofreu alteração. Confira os dados atualizados:",
    CANCELAMENTO: "Informamos o cancelamento do compromisso abaixo:",
    AGRADECIMENTO: "Registramos a realização do compromisso abaixo. Obrigado pela participação!",
  };
  linhas.push(abertura[finalidade], "");

  linhas.push(`📌 *${dados.titulo}*`);
  linhas.push(`🗂️ Tipo: ${tipoLabel(dados.tipo)}`);
  linhas.push(`📝 Assunto: ${dados.assunto}`);
  linhas.push(`📅 ${periodo}`);
  linhas.push(`📍 Local: ${dados.local}`);
  linhas.push(`⚑ Responsável: ${cargo.label}${dados.responsavel ? ` — ${dados.responsavel}` : ""}`);
  if (dados.participantes) linhas.push(`👥 Participantes: ${dados.participantes}`);
  linhas.push(`🔖 Situação: ${STATUS_LABEL[dados.status] ?? dados.status}`);

  const lembrete = descricaoLembrete(dados.lembreteMinutos);
  if (lembrete && finalidade !== "CANCELAMENTO") {
    linhas.push(`⏰ Despertador do sistema: ${lembrete}`);
  }

  if (dados.descricao) {
    linhas.push("", "*Pauta:*", dados.descricao);
  }

  if (finalidade === "CONFIRMACAO") {
    linhas.push("", "Responda esta mensagem confirmando presença. 🙏");
  }
  if (finalidade === "ALTERACAO") {
    linhas.push("", "Se não puder comparecer no novo horário, avise a gestão. 🙏");
  }
  if (finalidade === "CANCELAMENTO") {
    linhas.push("", "Uma nova data será comunicada pela gestão da escola.");
  }

  linhas.push(
    "",
    `Detalhes: ${baseUrl}/compromissos/${dados.id}`,
    `Adicionar à sua agenda: ${baseUrl}/api/compromissos/${dados.id}/ics`,
    "",
    "—",
    `${ESCOLA.nomeCompleto}`,
    `${ESCOLA.usoExclusivo}`,
  );

  return linhas.join("\n");
}

export function linkPublico(dados: DadosMensagem, baseUrl: string) {
  return `${baseUrl}/compromissos/${dados.id}`;
}

/** Provedores de API do WhatsApp suportados para DISPARO AUTOMÁTICO. */
export type ProvedorKey = "meta" | "zapi" | "evolution" | "twilio";

export const PROVEDORES: {
  key: ProvedorKey;
  label: string;
  descricao: string;
  variaveis: string[];
}[] = [
  {
    key: "meta",
    label: "WhatsApp Cloud API (Meta oficial)",
    descricao:
      "Número oficial verificado no Meta Business. Exige template aprovado para mensagens iniciadas pela escola.",
    variaveis: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"],
  },
  {
    key: "zapi",
    label: "Z-API",
    descricao:
      "Conecta um número comum do WhatsApp por QR Code e envia texto livre. Muito usado em escolas no Brasil.",
    variaveis: ["ZAPI_INSTANCE", "ZAPI_TOKEN", "ZAPI_CLIENT_TOKEN (opcional)"],
  },
  {
    key: "evolution",
    label: "Evolution API",
    descricao:
      "Solução open source auto-hospedada; envia texto livre pelo número conectado à instância.",
    variaveis: ["EVOLUTION_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE"],
  },
  {
    key: "twilio",
    label: "Twilio WhatsApp",
    descricao: "Provedor internacional com sandbox rápido para testes e números dedicados.",
    variaveis: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"],
  },
];

function credenciaisPresentes(provedor: ProvedorKey): boolean {
  switch (provedor) {
    case "meta":
      return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
    case "zapi":
      return Boolean(process.env.ZAPI_INSTANCE && process.env.ZAPI_TOKEN);
    case "evolution":
      return Boolean(
        process.env.EVOLUTION_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE,
      );
    case "twilio":
      return Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
          process.env.TWILIO_AUTH_TOKEN &&
          process.env.TWILIO_WHATSAPP_FROM,
      );
  }
}

/**
 * Provedor ativo para disparo automático. Usa WHATSAPP_PROVIDER quando definido;
 * caso contrário detecta automaticamente pelo primeiro provedor com credenciais.
 */
export function provedorAtivo(): ProvedorKey | null {
  const explicito = (process.env.WHATSAPP_PROVIDER ?? "").trim().toLowerCase() as ProvedorKey;
  const lista: ProvedorKey[] = ["meta", "zapi", "evolution", "twilio"];
  if (lista.includes(explicito)) return credenciaisPresentes(explicito) ? explicito : null;
  return lista.find((p) => credenciaisPresentes(p)) ?? null;
}

/** Indica se o DISPARO AUTOMÁTICO está configurado (algum provedor pronto). */
export function cloudApiConfigurada(): boolean {
  return provedorAtivo() !== null;
}

export function provedorInfo(provedor: ProvedorKey) {
  return PROVEDORES.find((p) => p.key === provedor) ?? null;
}

export function descricaoProvedorAtivo(): string {
  const ativo = provedorAtivo();
  if (!ativo) return "não configurado — usando link manual do WhatsApp";
  return provedorInfo(ativo)?.label ?? ativo;
}

/** Convite enviado automaticamente na criação/edição do compromisso. */
export function envioAutomaticoConvite(): boolean {
  return process.env.WHATSAPP_AUTO_CONVITE === "true";
}

/** Envia "ALTERACAO" automaticamente quando o compromisso muda depois do convite. */
export function envioAutomaticoAlteracao(): boolean {
  return process.env.WHATSAPP_AUTO_ALTERACAO !== "false";
}

/** Minutos após o início em que o lembrete ainda pode ser disparado. */
export function janelaAposInicioMinutos(): number {
  const valor = Number(process.env.WHATSAPP_JANELA_MINUTOS ?? 180);
  return Number.isFinite(valor) && valor > 0 ? valor : 180;
}

export type ResultadoEnvioWhatsApp = {
  enviado: boolean;
  canal: "LINK" | "API";
  provedor: string;
  erro?: string;
  idMensagem?: string;
};
