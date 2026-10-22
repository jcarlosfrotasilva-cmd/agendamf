# Agenda de Compromissos da Gestão Escolar

**EE PROFA. MARLENE FRATTINI** — sistema de uso exclusivo da equipe de gestão da escola.

Organiza a agenda dos cargos de gestão e permite agendar orientações pedagógicas e reuniões
colegiadas (APM, Conselho de Escola e Grêmio Estudantil) com data de início, data fim, hora,
assunto e local, além de despertador de compromissos e consulta online externa.

## Cargos atendidos

| Cargo | Descrição |
| --- | --- |
| Diretor(a) de Escola | Articulação institucional e decisões estratégicas |
| Vice-Diretor(a) | Apoio à direção, disciplina e fluxos internos |
| Coordenador(a) de Gestão Pedagógica Geral | Orientações pedagógicas e formação docente |
| Gerente de Organização Escolar | Rotinas administrativas, horários e infraestrutura |

## Banco de dados — Supabase (PostgreSQL)

O sistema conecta-se **apenas pelo servidor** à connection string do Supabase.

1. Crie o projeto no Supabase.
2. Copie a *Connection string* (Project Settings → Database).
3. Configure a variável de ambiente `SUPABASE_DB_URL` (ou `DATABASE_URL`) — veja `.env.example`.
   A TLS é ativada automaticamente para hosts remotos.
4. Crie a estrutura executando `supabase/schema.sql` no **SQL Editor** do Supabase
   (alternativa por linha de comando: `npx drizzle-kit push`).
5. Abra a página **Banco de Dados** do sistema para conferir conexão, estrutura e contagens.

> A base inicia **sem dados de demonstração** — nenhum compromisso ou gestor fictício é criado.
> O script de estrutura já encerra com comandos de limpeza comentados/explicitados para reinício.

## Acesso ao sistema (quem entra e como)

| Perfil | Como acessa | O que pode fazer |
| --- | --- | --- |
| **Administrador(a)** | `/entrar` com e-mail e senha | Tudo: agenda, professores, WhatsApp, usuários e configuração do banco |
| **Gestão escolar** | `/entrar` com e-mail e senha | Cria/edita compromissos, convoca professores, envia WhatsApp, dá baixa |
| **Consulta (leitura)** | `/entrar` com e-mail e senha | Somente visualiza a agenda, relatórios e indicadores |
| **Professor(a)** | Link pessoal `(/professor/<código>)`, sem senha | Vê apenas a própria agenda, em modo leitura |
| **Público externo** | `/api/public/v1/*` e feed `.ics` | Consulta online somente leitura, sem dados de contato |

- **Primeiro uso:** enquanto nenhum usuário existir, `/entrar` mostra a criação do primeiro
  administrador (a tela deixa de aparecer depois do primeiro cadastro).
- **Sessão:** cookie HTTP-only assinado (HMAC-SHA256), validade de 12 horas, verificação no
  middleware. Todas as páginas e APIs internas redirecionam para `/entrar` (401 nas APIs).
- **Senhas:** armazenadas com `scrypt` e salt individual — nunca em texto puro.
- **Links dos professores:** gerados em *Professores → “Gerar link”* e enviados por WhatsApp.
  O link é pessoal, pode ser renovado a qualquer momento (invalida o anterior) e não dá acesso à
  área da gestão.
- **Auditoria:** login, tentativa de acesso indevida, logout, convites, mensagens e alterações ficam
  registrados na trilha do painel.

## Módulos do sistema

- **Painel da Gestão** — indicadores do dia/semana/mês, próximo compromisso com contagem
  regressiva, gráficos por cargo, local, tipo e situação, trilha de auditoria.
- **Agenda** — filtros por período, dia, cargo, local, tipo, situação, gestor e busca livre,
  com organização por data, cargo, local, tipo ou situação.
- **Novo compromisso / edição** — data de início e fim, hora de início e fim, assunto, local,
  participantes, prioridade, situação e antecedência do despertador (5 min a 24 h).
- **Gestores / Cargos** — cadastro da equipe de gestão por função.
- **Locais** — ocupação dos espaços, cargos envolvidos e próxima ocupação.
- **Despertador** — verificação a cada 30 s, aviso sonoro, notificação do navegador, alerta em
  tela, soneca e baixa de situação.
- **Consulta Online** — leitura da API pública em tempo real, com inspeção do JSON.
- **API Externa** — documentação, chaves de integração e feed iCalendar.
- **Mensagens WhatsApp** — envio ao responsável pelo compromisso e histórico completo de
  comunicações (convite, lembrete, confirmação, alteração, cancelamento, agradecimento).
- **Testes do Sistema** — smoke test de todas as rotas e cenários de validação.
- **Banco de Dados** — diagnóstico do Supabase, script de estrutura e manutenção.
- **Usuários e Acessos** — criação de usuários, perfis, bloqueio e redefinição de senha.

## Comunicação pelo WhatsApp

Cada compromisso tem a aba **“Enviar mensagem pelo WhatsApp”**, que monta automaticamente o texto
com nome da escola, título, tipo, assunto, datas, horários, local, responsável, participantes,
pauta e links de detalhe/`.ics`.

- **Destinatários**: gestor vinculado ao compromisso, qualquer gestor do cargo responsável ou um
  número avulso (ex.: representante da APM ou do grêmio).
- **Finalidades**: 📩 convite/convocação · ⏰ lembrete do despertador · ✅ confirmação de presença ·
  🔁 alteração · 🚫 cancelamento · 🙏 agradecimento/registro.
- **Canais de envio**:
  1. *Link direto (sem configuração)* — abre o WhatsApp (Web ou app) com o texto pronto; depois o
     usuário confirma “Marcar como enviada”.
  2. *Disparo automático (servidor)* — com um provedor de API configurado, o sistema envia sozinho,
     sem clique: convite ao agendar, lembrete do despertador na antecedência definida e aviso de
     alteração após edição do compromisso.

### Disparo automático (sem intervenção humana)

Provedores suportados — defina `WHATSAPP_PROVIDER` ou deixe o sistema detectar pelo primeiro com
credenciais:

| Provedor | Variáveis | Observação |
| --- | --- | --- |
| Z-API | `ZAPI_INSTANCE`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN` | número comum por QR Code, texto livre |
| WhatsApp Cloud API (Meta) | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | número oficial; exige template aprovado |
| Evolution API | `EVOLUTION_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` | open source, auto-hospedada |
| Twilio WhatsApp | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | sandbox rápido para testes |

Comportamento: `WHATSAPP_AUTO_CONVITE=true` dispara o convite na criação do compromisso,
`WHATSAPP_AUTO_ALTERACAO` avisa edições após o convite e `WHATSAPP_JANELA_MINUTOS` (padrão 180)
define a tolerância após o início para o lembrete. A deduplicação é garantida pela tabela
`mensagens_whatsapp` — cada finalidade é enviada uma única vez por compromisso.

**Agendador (necessário para o lembrete sair no horário certo)** — a rota
`/api/whatsapp/automatico` roda no servidor e deve ser chamada a cada 5 minutos:

```bash
# cron-job.org / Cloud Scheduler / GitHub Actions
curl "https://SEU_DOMINIO/api/whatsapp/automatico?somente=todos&secret=$CRON_SECRET"
```

```sql
-- Supabase: pg_cron + pg_net
select cron.schedule('agenda-whatsapp-disparo', '*/5 * * * *', $$
  select net.http_get(
    url := 'https://SEU_DOMINIO/api/whatsapp/automatico?somente=todos&secret=SEU_CRON_SECRET'
  );
$$);
```

Proteja a rota com `CRON_SECRET` (sem ele, a chamada fica aberta). Também é possível executar o
disparo manualmente pela tela **Mensagens WhatsApp** (“Executar disparo automático agora” e
“Simular (sem enviar)”) e testar o provedor com “Enviar mensagem de teste”.

Para validar o fluxo sem provedor real, use `scripts/testar-disparo-automatico.sh`, que sobe um
provedor simulado local e confere envio, deduplicação, proteção do cron e convite automático.
- **Registro**: toda mensagem fica salva em `mensagens_whatsapp` com destinatário, telefone
  normalizado (DDI 55 + DDD + número), finalidade, canal, status, erro e horário, além de entrada na
  trilha de auditoria. A página **Mensagens WhatsApp** consolida os envios com filtros.
- **Despertador**: quando o alarme de um compromisso dispara, o botão “Avisar o responsável pelo
  WhatsApp” envia o lembrete em um clique.

## Consulta externa online

| Endpoint | Função |
| --- | --- |
| `GET /api/public/v1/agenda` | Lista JSON com filtros (`de`, `ate`, `periodo`, `cargo`, `tipo`, `local`, `status`, `busca`, `limite`) |
| `GET /api/public/v1/agenda.ics` | Feed iCalendar para Google Agenda / Outlook, com alarmes |
| `GET /api/public/v1/resumo` | Indicadores agregados por cargo, tipo, situação e local |
| `GET /api/public/v1/openapi` | Contrato OpenAPI 3.0 |
| `GET /api/health` | Saúde do serviço e do banco (uso em monitoramento) |

Com uma chave de integração (`?key=`, `X-Api-Key` ou `Authorization: Bearer`) a resposta inclui
também pauta, participantes e responsável.

## Desenvolvimento

```bash
npm run dev        # ambiente de desenvolvimento
npm run build      # build de produção
npm run start      # servidor de produção
npm run typecheck  # verificação de tipos
```

### Variáveis de ambiente relevantes

```bash
SUPABASE_DB_URL=...            # banco de dados (Supabase)
SESSION_SECRET=...             # assinatura dos cookies de sessão (defina em produção)
WHATSAPP_PROVIDER=zapi         # disparo automático de WhatsApp (opcional)
CRON_SECRET=...                # protege a rota do agendador
```

> Defina `SESSION_SECRET` em produção. Sem ela, a assinatura usa a própria URL do banco como
> semente — funciona, mas trocar a senha do banco encerraria todas as sessões.

Stack: Next.js (App Router) · TypeScript · Tailwind CSS · Drizzle ORM · PostgreSQL (Supabase).
