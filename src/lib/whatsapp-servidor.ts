import { cargoInfo } from "./constants";
import { FINALIDADES, montarMensagem, telefoneFormatado } from "./whatsapp";
import type { CompromissoComGestor } from "./repo";

/** Uso no servidor: prepara destinatários e modelos de mensagem do compromisso. */

export type Destinatario = {
  id: number | null;
  nome: string;
  cargo: string;
  telefone: string | null;
  rotulo: string;
};

export function montarDestinatarios(
  compromisso: CompromissoComGestor,
  gestores: {
    id: number;
    nome: string;
    cargo: string;
    telefone: string | null;
  }[],
): Destinatario[] {
  const lista: Destinatario[] = [];
  const vistos = new Set<string>();

  const adicionar = (
    id: number | null,
    nome: string,
    cargo: string,
    telefone: string | null,
    prefixo: string,
  ) => {
    const chave = `${id ?? "x"}-${nome}`;
    if (vistos.has(chave)) return;
    vistos.add(chave);
    lista.push({
      id,
      nome,
      cargo,
      telefone,
      rotulo: `${prefixo}${nome} — ${cargoInfo(cargo).short}${
        telefone ? ` (${telefoneFormatado(telefone)})` : " (sem telefone)"
      }`,
    });
  };

  if (compromisso.gestorId && compromisso.gestorNome) {
    adicionar(
      compromisso.gestorId,
      compromisso.gestorNome,
      compromisso.gestorCargo ?? compromisso.cargoResponsavel,
      compromisso.gestorTelefone,
      "Responsável: ",
    );
  }

  for (const gestor of gestores) {
    if (gestor.cargo !== compromisso.cargoResponsavel) continue;
    adicionar(gestor.id, gestor.nome, gestor.cargo, gestor.telefone ?? null, "");
  }

  adicionar(
    null,
    compromisso.gestorNome ?? cargoInfo(compromisso.cargoResponsavel).short,
    compromisso.cargoResponsavel,
    compromisso.gestorTelefone,
    "Cargo: ",
  );

  return lista;
}

export function montarModelos(
  compromisso: CompromissoComGestor,
  baseUrl: string,
): Record<string, string> {
  const dados = {
    id: compromisso.id,
    titulo: compromisso.titulo,
    tipo: compromisso.tipo,
    assunto: compromisso.assunto,
    descricao: compromisso.descricao,
    cargoResponsavel: compromisso.cargoResponsavel,
    responsavel: compromisso.gestorNome,
    local: compromisso.local,
    dataInicio: compromisso.dataInicio,
    dataFim: compromisso.dataFim,
    horaInicio: compromisso.horaInicio,
    horaFim: compromisso.horaFim,
    participantes: compromisso.participantes,
    status: compromisso.status,
    prioridade: compromisso.prioridade,
    lembreteMinutos: compromisso.lembreteMinutos,
  };

  const modelos: Record<string, string> = {};
  for (const finalidade of FINALIDADES) {
    modelos[finalidade.key] = montarMensagem(dados, finalidade.key, baseUrl);
  }
  return modelos;
}
