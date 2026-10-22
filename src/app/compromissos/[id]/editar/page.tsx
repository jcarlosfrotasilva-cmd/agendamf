import Link from "next/link";
import { notFound } from "next/navigation";
import { CompromissoForm } from "@/components/CompromissoForm";
import { Card } from "@/components/ui";
import {
  idsProfessoresDoCompromisso,
  listarGestores,
  listarProfessores,
  obterCompromisso,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function EditarCompromissoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isFinite(numero) || numero <= 0) notFound();

  const [item, gestores, docentes, idsConvocados] = await Promise.all([
    obterCompromisso(numero),
    listarGestores(),
    listarProfessores({ ativo: undefined }),
    idsProfessoresDoCompromisso(numero),
  ]);
  if (!item) notFound();

  return (
    <div className="space-y-5">
      <nav className="text-[11px] text-slate-500">
        <Link href="/" className="hover:text-indigo-600">
          Painel
        </Link>{" "}
        / <Link href="/agenda" className="hover:text-indigo-600">Agenda</Link> /{" "}
        <Link href={`/compromissos/${item.id}`} className="hover:text-indigo-600">
          #{item.id}
        </Link>{" "}
        / <span className="font-semibold text-slate-700">Editar</span>
      </nav>

      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">
          Atualização
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Editar compromisso
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Altere datas, horários, local, responsável, situação e a antecedência do despertador.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <CompromissoForm
          modo="editar"
          gestores={gestores.map((g) => ({ id: g.id, nome: g.nome, cargo: g.cargo }))}
          professores={docentes.map((p) => ({
            id: p.id,
            nome: p.nome,
            disciplina: p.disciplina,
            turmas: p.turmas,
            turno: p.turno,
          }))}
          inicial={{
            id: item.id,
            titulo: item.titulo,
            tipo: item.tipo,
            assunto: item.assunto,
            descricao: item.descricao ?? "",
            cargoResponsavel: item.cargoResponsavel,
            gestorId: item.gestorId ? String(item.gestorId) : "",
            dataInicio: item.dataInicio,
            dataFim: item.dataFim,
            horaInicio: item.horaInicio,
            horaFim: item.horaFim,
            local: item.local,
            participantes: item.participantes ?? "",
            prioridade: item.prioridade,
            status: item.status,
            lembreteMinutos: String(item.lembreteMinutos),
            despertadorAtivo: item.despertadorAtivo,
            professorIds: idsConvocados,
          }}
        />

        <Card className="h-fit p-5">
          <h2 className="text-sm font-semibold text-slate-900">Histórico do registro</h2>
          <dl className="mt-3 space-y-2 text-xs text-slate-600">
            <div>
              <dt className="font-semibold uppercase tracking-wide text-slate-500">
                Criado em
              </dt>
              <dd>{new Date(item.criadoEm).toLocaleString("pt-BR")}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide text-slate-500">
                Última atualização
              </dt>
              <dd>{new Date(item.atualizadoEm).toLocaleString("pt-BR")}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide text-slate-500">
                Gestor vinculado
              </dt>
              <dd>{item.gestorNome ?? "Nenhum gestor específico vinculado"}</dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            Todas as alterações são registradas na trilha de auditoria do banco interno e refletem
            imediatamente na consulta externa online.
          </p>
        </Card>
      </div>
    </div>
  );
}
