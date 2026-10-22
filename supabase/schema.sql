-- ============================================================
-- AGENDA DE COMPROMISSOS DA GESTÃO ESCOLAR
-- EE PROFA. MARLENE FRATTINI
-- Estrutura do banco para o Supabase (PostgreSQL)
--
-- Como aplicar:
--   1. Supabase → SQL Editor → New query
--   2. Cole todo este conteúdo e clique em Run
--   (alternativa local: npx drizzle-kit push)
-- ============================================================

create table if not exists gestores (
  id            serial primary key,
  nome          text not null,
  cargo         text not null,
  email         text,
  telefone      text,
  escola        text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  constraint gestores_cargo_check check (cargo in (
    'DIRETOR','VICE_DIRETOR','COORDENADOR_PEDAGOGICO','GERENTE_ORGANIZACAO'
  ))
);
create index if not exists gestores_cargo_idx on gestores (cargo);

create table if not exists compromissos (
  id                 serial primary key,
  titulo             text not null,
  tipo               text not null default 'ORIENTACAO_PEDAGOGICA',
  assunto            text not null,
  descricao          text,
  cargo_responsavel  text not null,
  gestor_id          integer references gestores(id) on delete set null,
  data_inicio        date not null,
  data_fim           date not null,
  hora_inicio        text not null,
  hora_fim           text not null,
  local              text not null,
  participantes      text,
  prioridade         text not null default 'NORMAL',
  status             text not null default 'AGENDADO',
  lembrete_minutos   integer not null default 30,
  despertador_ativo  boolean not null default true,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  constraint compromissos_periodo_check check (data_fim >= data_inicio),
  constraint compromissos_status_check check (status in (
    'AGENDADO','CONFIRMADO','EM_ANDAMENTO','REALIZADO','ADIADO','CANCELADO'
  )),
  constraint compromissos_prioridade_check check (prioridade in (
    'BAIXA','NORMAL','ALTA','URGENTE'
  ))
);
create index if not exists compromissos_data_idx   on compromissos (data_inicio);
create index if not exists compromissos_cargo_idx  on compromissos (cargo_responsavel);
create index if not exists compromissos_local_idx  on compromissos (local);
create index if not exists compromissos_status_idx on compromissos (status);

create table if not exists auditoria (
  id          serial primary key,
  entidade    text not null,
  entidade_id integer,
  acao        text not null,
  detalhe     text not null,
  criado_em   timestamptz not null default now()
);

create table if not exists api_tokens (
  id        serial primary key,
  nome      text not null,
  orgao     text,
  token     text not null unique,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Usuários do sistema (equipe de gestão) — login por e-mail e senha
create table if not exists usuarios (
  id            serial primary key,
  nome          text not null,
  email         text not null unique,
  senha_hash    text not null,
  papel         text not null default 'GESTAO',
  cargo         text,
  ativo         boolean not null default true,
  ultimo_acesso timestamptz,
  criado_em     timestamptz not null default now(),
  constraint usuarios_papel_check check (papel in ('ADMIN','GESTAO','LEITURA'))
);
create index if not exists usuarios_email_idx on usuarios (email);

-- Corpo docente (cada professor tem agenda própria e link pessoal de leitura)
create table if not exists professores (
  id           serial primary key,
  nome         text not null,
  disciplina   text,
  turmas       text,
  turno        text not null default 'MANHA',
  email        text,
  telefone     text,
  observacoes  text,
  token_acesso text unique,
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now(),
  constraint professores_turno_check check (turno in ('MANHA','TARDE','NOITE','INTEGRAL'))
);
create index if not exists professores_nome_idx  on professores (nome);
create index if not exists professores_turno_idx on professores (turno);

-- Convocações: professores envolvidos em cada compromisso
create table if not exists compromisso_professores (
  id             serial primary key,
  compromisso_id integer not null references compromissos(id) on delete cascade,
  professor_id   integer not null references professores(id) on delete cascade,
  criado_em      timestamptz not null default now(),
  unique (compromisso_id, professor_id)
);
create index if not exists compromisso_professores_compromisso_idx on compromisso_professores (compromisso_id);
create index if not exists compromisso_professores_professor_idx   on compromisso_professores (professor_id);

-- Comunicações por WhatsApp enviadas aos responsáveis pelos compromissos
create table if not exists mensagens_whatsapp (
  id               serial primary key,
  compromisso_id   integer not null references compromissos(id) on delete cascade,
  gestor_id        integer references gestores(id) on delete set null,
  professor_id     integer references professores(id) on delete set null,
  destino_nome     text not null,
  destino_telefone text not null,
  finalidade       text not null default 'CONVITE',
  mensagem         text not null,
  canal            text not null default 'LINK',
  status           text not null default 'GERADO',
  erro             text,
  enviado_em       timestamptz,
  criado_em        timestamptz not null default now(),
  constraint mensagens_finalidade_check check (finalidade in (
    'CONVITE','LEMBRETE','CONFIRMACAO','ALTERACAO','CANCELAMENTO','AGRADECIMENTO'
  )),
  constraint mensagens_status_check check (status in (
    'GERADO','ENVIADO','FALHA','CANCELADO'
  )),
  constraint mensagens_canal_check check (canal in ('LINK','API'))
);
create index if not exists mensagens_whatsapp_compromisso_idx
  on mensagens_whatsapp (compromisso_id);
create index if not exists mensagens_whatsapp_criado_idx
  on mensagens_whatsapp (criado_em);

-- Gatilho que mantém atualizado_em sincronizado
create or replace function atualiza_timestamp() returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists compromissos_atualizado_em on compromissos;
create trigger compromissos_atualizado_em
  before update on compromissos
  for each row execute function atualiza_timestamp();

-- ------------------------------------------------------------
-- Limpeza de dados de demonstração (a base deve iniciar vazia)
-- ------------------------------------------------------------
truncate table mensagens_whatsapp      restart identity cascade;
truncate table compromisso_professores restart identity cascade;
truncate table usuarios                restart identity cascade;
truncate table professores             restart identity cascade;
truncate table compromissos            restart identity cascade;
truncate table auditoria               restart identity;
truncate table api_tokens              restart identity;
truncate table gestores                restart identity cascade;
