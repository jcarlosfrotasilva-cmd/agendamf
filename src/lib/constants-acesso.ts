/** Perfis de acesso (compartilhado entre cliente e servidor, sem dependências). */
export type PapelKey = "ADMIN" | "GESTAO" | "LEITURA";

export const PAPEIS: {
  key: PapelKey;
  label: string;
  descricao: string;
  chip: string;
}[] = [
  {
    key: "ADMIN",
    label: "Administrador(a)",
    descricao: "Acesso total, incluindo usuários e configuração.",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  {
    key: "GESTAO",
    label: "Gestão escolar",
    descricao: "Cria compromissos, convoca e envia WhatsApp.",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  {
    key: "LEITURA",
    label: "Consulta (leitura)",
    descricao: "Apenas visualiza a agenda e os indicadores.",
    chip: "bg-slate-100 text-slate-600 ring-slate-300",
  },
];
