export type CargoKey =
  | "DIRETOR"
  | "VICE_DIRETOR"
  | "COORDENADOR_PEDAGOGICO"
  | "GERENTE_ORGANIZACAO";

export type CargoInfo = {
  key: CargoKey;
  label: string;
  short: string;
  sigla: string;
  accent: string;
  dot: string;
  chip: string;
  ring: string;
  descricao: string;
};

export const CARGOS: CargoInfo[] = [
  {
    key: "DIRETOR",
    label: "Diretor(a) de Escola",
    short: "Diretor(a)",
    sigla: "DE",
    accent: "from-indigo-600 to-blue-600",
    dot: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    ring: "ring-indigo-200",
    descricao: "Articulação institucional, decisões estratégicas e representação da escola.",
  },
  {
    key: "VICE_DIRETOR",
    label: "Vice-Diretor(a)",
    short: "Vice-Diretor(a)",
    sigla: "VD",
    accent: "from-violet-600 to-fuchsia-600",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 ring-violet-200",
    ring: "ring-violet-200",
    descricao: "Apoio direto à direção, disciplina, fluxos internos e substituições.",
  },
  {
    key: "COORDENADOR_PEDAGOGICO",
    label: "Coordenador(a) de Gestão Pedagógica Geral",
    short: "Coordenador(a) Pedagógico(a)",
    sigla: "CP",
    accent: "from-emerald-600 to-teal-600",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    ring: "ring-emerald-200",
    descricao:
      "Orientações pedagógicas, formação de professores, acompanhamento de aprendizagem.",
  },
  {
    key: "GERENTE_ORGANIZACAO",
    label: "Gerente de Organização Escolar",
    short: "Gerente de Organização",
    sigla: "GO",
    accent: "from-amber-500 to-orange-600",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 ring-amber-200",
    ring: "ring-amber-200",
    descricao:
      "Rotinas administrativas, horários, infraestrutura, documentação e fluxo escolar.",
  },
];

export const CARGO_KEYS = CARGOS.map((c) => c.key) as [CargoKey, ...CargoKey[]];

export function cargoInfo(key: string): CargoInfo {
  return (
    CARGOS.find((c) => c.key === key) ?? {
      key: "GERENTE_ORGANIZACAO",
      label: key,
      short: key,
      sigla: "GO",
      accent: "from-slate-500 to-slate-700",
      dot: "bg-slate-500",
      chip: "bg-slate-100 text-slate-700 ring-slate-200",
      ring: "ring-slate-200",
      descricao: "",
    }
  );
}

export type TipoKey =
  | "ORIENTACAO_PEDAGOGICA"
  | "REUNIAO"
  | "REUNIAO_APM"
  | "REUNIAO_CONSELHO_ESCOLA"
  | "REUNIAO_GREMIO_ESTUDANTIL"
  | "AULA"
  | "HTPC"
  | "REUNIAO_PAIS"
  | "AVALIACAO"
  | "SUBSTITUICAO"
  | "FORMACAO"
  | "VISITA_TECNICA"
  | "CONSELHO_CLASSE"
  | "ATENDIMENTO_FAMILIA"
  | "EVENTO"
  | "OUTRO";

export type TipoInfo = {
  key: TipoKey;
  label: string;
  sigla: string;
  chip: string;
  bar: string;
  descricao: string;
};

export const TIPOS: TipoInfo[] = [
  {
    key: "ORIENTACAO_PEDAGOGICA",
    label: "Orientação Pedagógica",
    sigla: "OP",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    bar: "bg-emerald-500",
    descricao: "Orientação com professores e coordenação, com data, hora, assunto e local.",
  },
  {
    key: "REUNIAO",
    label: "Reunião",
    sigla: "RE",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    bar: "bg-indigo-500",
    descricao: "Reuniões administrativas e de alinhamento da gestão.",
  },
  {
    key: "REUNIAO_APM",
    label: "Reunião da APM",
    sigla: "APM",
    chip: "bg-rose-50 text-rose-700 ring-rose-200",
    bar: "bg-rose-500",
    descricao:
      "Associação de Pais e Mestres: prestação de contas, aprovação de plano de aplicação e parcerias.",
  },
  {
    key: "REUNIAO_CONSELHO_ESCOLA",
    label: "Reunião do Conselho de Escola",
    sigla: "CE",
    chip: "bg-amber-50 text-amber-700 ring-amber-200",
    bar: "bg-amber-500",
    descricao:
      "Conselho de Escola: decisões colegiadas, regimento, uso de recursos e encaminhamentos institucionais.",
  },
  {
    key: "REUNIAO_GREMIO_ESTUDANTIL",
    label: "Reunião do Grêmio Estudantil",
    sigla: "GE",
    chip: "bg-violet-50 text-violet-700 ring-violet-200",
    bar: "bg-violet-500",
    descricao:
      "Grêmio Estudantil: protagonismo juvenil, propostas dos estudantes e organização de eventos.",
  },
  {
    key: "AULA",
    label: "Aula / Regência",
    sigla: "AU",
    chip: "bg-blue-50 text-blue-700 ring-blue-200",
    bar: "bg-blue-500",
    descricao: "Aula regular, regência de turma e acompanhamento em sala.",
  },
  {
    key: "HTPC",
    label: "HTPC / Planejamento coletivo",
    sigla: "HT",
    chip: "bg-lime-50 text-lime-700 ring-lime-200",
    bar: "bg-lime-500",
    descricao:
      "Horário de Trabalho Pedagógico Coletivo: planejamento, estudos e alinhamento entre professores.",
  },
  {
    key: "REUNIAO_PAIS",
    label: "Reunião de Pais e Mestres",
    sigla: "RP",
    chip: "bg-pink-50 text-pink-700 ring-pink-200",
    bar: "bg-pink-500",
    descricao: "Reunião com famílias, entrega de avaliações e plantão de atendimento.",
  },
  {
    key: "AVALIACAO",
    label: "Avaliação / Recuperação",
    sigla: "AV",
    chip: "bg-purple-50 text-purple-700 ring-purple-200",
    bar: "bg-purple-500",
    descricao: "Aplicação de avaliações, recuperação paralela e reforço.",
  },
  {
    key: "SUBSTITUICAO",
    label: "Substituição de aula",
    sigla: "SB",
    chip: "bg-stone-100 text-stone-700 ring-stone-300",
    bar: "bg-stone-500",
    descricao: "Cobertura de aulas por ausência de professor titular.",
  },
  {
    key: "FORMACAO",
    label: "Formação / Ação formativa",
    sigla: "FO",
    chip: "bg-sky-50 text-sky-700 ring-sky-200",
    bar: "bg-sky-500",
    descricao: "Formações continuadas, oficinas e ações formativas.",
  },
  {
    key: "VISITA_TECNICA",
    label: "Visita Técnica",
    sigla: "VT",
    chip: "bg-teal-50 text-teal-700 ring-teal-200",
    bar: "bg-teal-500",
    descricao: "Vistorias, visitas da supervisão de ensino e inspeções.",
  },
  {
    key: "CONSELHO_CLASSE",
    label: "Conselho de Classe",
    sigla: "CC",
    chip: "bg-cyan-50 text-cyan-700 ring-cyan-200",
    bar: "bg-cyan-500",
    descricao: "Conselhos de classe e séries, com análise de desempenho e infrequência.",
  },
  {
    key: "ATENDIMENTO_FAMILIA",
    label: "Atendimento à Família",
    sigla: "AF",
    chip: "bg-orange-50 text-orange-700 ring-orange-200",
    bar: "bg-orange-500",
    descricao: "Atendimentos a responsáveis e acompanhamento individual de estudantes.",
  },
  {
    key: "EVENTO",
    label: "Evento Escolar",
    sigla: "EV",
    chip: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
    bar: "bg-fuchsia-500",
    descricao: "Feiras, mostras, festivais e cerimônias da comunidade escolar.",
  },
  {
    key: "OUTRO",
    label: "Outro",
    sigla: "OU",
    chip: "bg-slate-100 text-slate-600 ring-slate-300",
    bar: "bg-slate-400",
    descricao: "Outros compromissos da agenda da gestão.",
  },
];

export const TIPO_KEYS = TIPOS.map((t) => t.key) as [TipoKey, ...TipoKey[]];

/** Tipos de reuniões colegiadas da comunidade escolar. */
export const TIPOS_COLEGIADOS: TipoKey[] = [
  "REUNIAO_APM",
  "REUNIAO_CONSELHO_ESCOLA",
  "REUNIAO_GREMIO_ESTUDANTIL",
];

/** Tipos típicos da agenda do professor (corpo docente). */
export const TIPOS_DOCENTES: TipoKey[] = [
  "AULA",
  "HTPC",
  "REUNIAO_PAIS",
  "AVALIACAO",
  "SUBSTITUICAO",
  "ORIENTACAO_PEDAGOGICA",
  "FORMACAO",
  "CONSELHO_CLASSE",
];

export type TurnoKey = "MANHA" | "TARDE" | "NOITE" | "INTEGRAL";

export const TURNOS: { key: TurnoKey; label: string; sigla: string; chip: string }[] = [
  { key: "MANHA", label: "Manhã", sigla: "M", chip: "bg-amber-50 text-amber-700 ring-amber-200" },
  { key: "TARDE", label: "Tarde", sigla: "T", chip: "bg-orange-50 text-orange-700 ring-orange-200" },
  { key: "NOITE", label: "Noite", sigla: "N", chip: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { key: "INTEGRAL", label: "Integral", sigla: "I", chip: "bg-teal-50 text-teal-700 ring-teal-200" },
];

export const TURNO_KEYS = TURNOS.map((t) => t.key) as [TurnoKey, ...TurnoKey[]];

export function turnoInfo(key: string) {
  return (
    TURNOS.find((t) => t.key === key) ?? {
      key: "MANHA" as TurnoKey,
      label: key,
      sigla: "M",
      chip: "bg-slate-100 text-slate-600 ring-slate-300",
    }
  );
}

export function tipoInfo(key: string): TipoInfo {
  return (
    TIPOS.find((t) => t.key === key) ?? {
      key: "OUTRO",
      label: key,
      sigla: key.slice(0, 2).toUpperCase(),
      chip: "bg-slate-100 text-slate-600 ring-slate-300",
      bar: "bg-slate-400",
      descricao: "",
    }
  );
}

export function tipoLabel(key: string): string {
  return tipoInfo(key).label;
}

/** Sugestões de preenchimento para os tipos de reunião colegiada. */
export type PresetTipo = {
  local: string;
  participantes: string;
  assunto: string;
  lembreteMinutos: number;
  pauta: string;
};

export const PRESETS_TIPO: Record<string, PresetTipo> = {
  REUNIAO_APM: {
    local: "Sala de Reuniões",
    participantes: "Membros da APM, pais, mestres e equipe gestora",
    assunto: "Assuntos da Associação de Pais e Mestres",
    lembreteMinutos: 1440,
    pauta:
      "Pauta: prestação de contas, aprovação do plano de aplicação de recursos, parcerias e ações de apoio à aprendizagem.",
  },
  REUNIAO_CONSELHO_ESCOLA: {
    local: "Sala de Reuniões",
    participantes: "Conselheiros escolares, direção, professores, funcionários e estudantes",
    assunto: "Assuntos do Conselho de Escola",
    lembreteMinutos: 1440,
    pauta:
      "Pauta: regimento interno, decisões colegiadas, uso de recursos, calendário escolar e encaminhamentos institucionais.",
  },
  REUNIAO_GREMIO_ESTUDANTIL: {
    local: "Auditório",
    participantes: "Diretoria do grêmio, estudantes representantes e coordenação",
    assunto: "Assuntos do Grêmio Estudantil",
    lembreteMinutos: 60,
    pauta:
      "Pauta: protagonismo juvenil, propostas dos estudantes, projetos culturais e esportivos e organização de eventos.",
  },
};

export type StatusKey =
  | "AGENDADO"
  | "CONFIRMADO"
  | "EM_ANDAMENTO"
  | "REALIZADO"
  | "ADIADO"
  | "CANCELADO";

export const STATUSES: {
  key: StatusKey;
  label: string;
  chip: string;
  bar: string;
}[] = [
  {
    key: "AGENDADO",
    label: "Agendado",
    chip: "bg-sky-50 text-sky-700 ring-sky-200",
    bar: "bg-sky-500",
  },
  {
    key: "CONFIRMADO",
    label: "Confirmado",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    bar: "bg-emerald-500",
  },
  {
    key: "EM_ANDAMENTO",
    label: "Em andamento",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    bar: "bg-indigo-500",
  },
  {
    key: "REALIZADO",
    label: "Realizado",
    chip: "bg-slate-100 text-slate-600 ring-slate-300",
    bar: "bg-slate-400",
  },
  {
    key: "ADIADO",
    label: "Adiado",
    chip: "bg-amber-50 text-amber-700 ring-amber-200",
    bar: "bg-amber-500",
  },
  {
    key: "CANCELADO",
    label: "Cancelado",
    chip: "bg-rose-50 text-rose-700 ring-rose-200",
    bar: "bg-rose-500",
  },
];

export const STATUS_KEYS = STATUSES.map((s) => s.key) as [StatusKey, ...StatusKey[]];

export function statusInfo(key: string) {
  return (
    STATUSES.find((s) => s.key === key) ?? {
      key: "AGENDADO" as StatusKey,
      label: key,
      chip: "bg-slate-100 text-slate-600 ring-slate-300",
      bar: "bg-slate-400",
    }
  );
}

export type PrioridadeKey = "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";

export const PRIORIDADES: {
  key: PrioridadeKey;
  label: string;
  chip: string;
}[] = [
  { key: "BAIXA", label: "Baixa", chip: "bg-slate-100 text-slate-600 ring-slate-300" },
  { key: "NORMAL", label: "Normal", chip: "bg-sky-50 text-sky-700 ring-sky-200" },
  { key: "ALTA", label: "Alta", chip: "bg-amber-50 text-amber-700 ring-amber-200" },
  { key: "URGENTE", label: "Urgente", chip: "bg-rose-50 text-rose-700 ring-rose-200" },
];

export const PRIORIDADE_KEYS = PRIORIDADES.map((p) => p.key) as [
  PrioridadeKey,
  ...PrioridadeKey[],
];

export function prioridadeInfo(key: string) {
  return (
    PRIORIDADES.find((p) => p.key === key) ?? {
      key: "NORMAL" as PrioridadeKey,
      label: key,
      chip: "bg-slate-100 text-slate-600 ring-slate-300",
    }
  );
}

export const LEMBRETES = [5, 10, 15, 30, 60, 120, 1440];

export const LOCAIS_SUGERIDOS = [
  "Sala da Direção",
  "Sala de Coordenação Pedagógica",
  "Sala de Reuniões",
  "Sala dos Professores",
  "Biblioteca",
  "Laboratório de Informática",
  "Auditório",
  "Pátio Central",
  "Quadra Poliesportiva",
  "Secretaria Escolar",
  "Refeitório",
  "Google Meet / Online",
];

export const AGRUPAMENTOS = [
  { key: "DATA", label: "Por data" },
  { key: "CARGO", label: "Por cargo" },
  { key: "LOCAL", label: "Por local" },
  { key: "TIPO", label: "Por tipo" },
  { key: "STATUS", label: "Por situação" },
] as const;

export type AgrupamentoKey = (typeof AGRUPAMENTOS)[number]["key"];

export const PERIODOS = [
  { key: "HOJE", label: "Hoje" },
  { key: "SEMANA", label: "Esta semana" },
  { key: "PROXIMOS7", label: "Próximos 7 dias" },
  { key: "MES", label: "Este mês" },
  { key: "PASSADOS", label: "Já realizados/anteriores" },
  { key: "TODOS", label: "Todo o período" },
] as const;

export type PeriodoKey = (typeof PERIODOS)[number]["key"];
