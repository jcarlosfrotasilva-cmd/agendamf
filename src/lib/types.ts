export type AlarmeItem = {
  id: number;
  titulo: string;
  tipo: string;
  assunto: string;
  cargoResponsavel: string;
  local: string;
  dataInicio: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  lembreteMinutos: number;
  status: string;
  prioridade: string;
  despertadorAtivo: boolean;
  gestorNome: string | null;
  gestorTelefone: string | null;
};

export type DespertadorResposta = {
  itens: AlarmeItem[];
  agora: string;
  total: number;
};
