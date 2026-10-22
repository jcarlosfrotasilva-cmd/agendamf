import {
  CARGOS,
  STATUSES,
  TIPOS,
  cargoInfo,
  statusInfo,
  tipoInfo,
} from "./constants";
import { labelDiaCurto, fmtLong } from "./datetime";
import type { CompromissoComGestor } from "./repo";

export type Grupo = {
  chave: string;
  label: string;
  sublabel?: string;
  destaque?: string;
  itens: CompromissoComGestor[];
};

export function agrupar(
  itens: CompromissoComGestor[],
  agrupamento: string,
): Grupo[] {
  const mapa = new Map<string, CompromissoComGestor[]>();
  for (const item of itens) {
    const chave =
      agrupamento === "CARGO"
        ? item.cargoResponsavel
        : agrupamento === "LOCAL"
          ? item.local
          : agrupamento === "TIPO"
            ? item.tipo
            : agrupamento === "STATUS"
              ? item.status
              : item.dataInicio;
    const atual = mapa.get(chave);
    if (atual) atual.push(item);
    else mapa.set(chave, [item]);
  }

  const chaves = Array.from(mapa.keys());
  if (agrupamento === "DATA") chaves.sort();
  else if (agrupamento === "CARGO") {
    const ordem = CARGOS.map((c) => c.key);
    chaves.sort((a, b) => ordem.indexOf(a as never) - ordem.indexOf(b as never));
  } else if (agrupamento === "STATUS") {
    const ordem = STATUSES.map((s) => s.key);
    chaves.sort((a, b) => ordem.indexOf(a as never) - ordem.indexOf(b as never));
  } else if (agrupamento === "TIPO") {
    const ordem = TIPOS.map((t) => t.key);
    chaves.sort((a, b) => ordem.indexOf(a as never) - ordem.indexOf(b as never));
  } else {
    chaves.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  return chaves.map((chave) => {
    const doGrupo = mapa.get(chave) ?? [];
    if (agrupamento === "CARGO") {
      const info = cargoInfo(chave);
      return {
        chave,
        label: info.label,
        sublabel: `${doGrupo.length} compromisso(s)`,
        destaque: info.accent,
        itens: doGrupo,
      };
    }
    if (agrupamento === "STATUS") {
      const info = statusInfo(chave);
      return {
        chave,
        label: info.label,
        sublabel: `${doGrupo.length} compromisso(s)`,
        destaque: info.bar,
        itens: doGrupo,
      };
    }
    if (agrupamento === "TIPO") {
      const info = tipoInfo(chave);
      return {
        chave,
        label: info.label,
        sublabel: `${doGrupo.length} compromisso(s)`,
        destaque: info.bar,
        itens: doGrupo,
      };
    }
    if (agrupamento === "LOCAL") {
      return {
        chave,
        label: chave,
        sublabel: `${doGrupo.length} compromisso(s)`,
        destaque: "bg-teal-500",
        itens: doGrupo,
      };
    }
    return {
      chave,
      label: labelDiaCurto(chave),
      sublabel: fmtLong(chave),
      destaque: "bg-indigo-500",
      itens: doGrupo,
    };
  });
}
