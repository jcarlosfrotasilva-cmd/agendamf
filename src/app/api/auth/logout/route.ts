import { json, serverError } from "@/lib/api";
import { encerrarSessao, getSessao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const sessao = await getSessao();
    await encerrarSessao();
    if (sessao) {
      await registrarAuditoria({
        entidade: "usuario",
        entidadeId: sessao.uid,
        acao: "LOGOUT",
        detalhe: `Sessão encerrada — ${sessao.nome}.`,
      });
    }
    return json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/logout", error);
    return serverError();
  }
}
