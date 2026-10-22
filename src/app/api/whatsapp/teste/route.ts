import type { NextRequest } from "next/server";
import { exigirEdicao } from "@/lib/auth";
import { badRequest, json, serverError } from "@/lib/api";
import { ESCOLA } from "@/lib/escola";
import { descricaoProvedorAtivo, normalizarTelefone, provedorAtivo } from "@/lib/whatsapp";
import { enviarPorProvedor } from "@/lib/whatsapp-providers";
import { registrarAuditoria } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * Teste real de disparo automático: envia uma mensagem de verificação para o
 * número informado usando o provedor configurado.
 */
export async function POST(request: NextRequest) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;
    const body = (await request.json()) as { telefone?: string };
    const numero = normalizarTelefone(body.telefone ?? "");
    if (!numero) {
      return badRequest("Informe um WhatsApp válido com DDD, ex.: (11) 98812-4477.");
    }

    const provedor = provedorAtivo();
    if (!provedor) {
      return badRequest(
        "Nenhum provedor de API do WhatsApp configurado. Defina as credenciais em Banco de Dados para habilitar o disparo automático.",
      );
    }

    const mensagem = [
      "*AGENDA DA GESTÃO ESCOLAR*",
      ESCOLA.nome,
      "",
      "*TESTE DE DISPARO AUTOMÁTICO* ✅",
      "",
      "Esta é uma mensagem de verificação enviada automaticamente pelo sistema de agendamento de compromissos da gestão escolar.",
      "",
      `Provedor: ${descricaoProvedorAtivo()}`,
      `Horário: ${new Date().toLocaleString("pt-BR")}`,
      "",
      "Se você recebeu esta mensagem, o envio automático está funcionando.",
      "",
      "—",
      ESCOLA.nomeCompleto,
    ].join("\n");

    const resultado = await enviarPorProvedor(numero, mensagem, provedor);

    await registrarAuditoria({
      entidade: "whatsapp",
      entidadeId: null,
      acao: resultado.enviado ? "TESTE_ENVIO_OK" : "TESTE_ENVIO_FALHA",
      detalhe: resultado.enviado
        ? `Teste de disparo automático enviado com sucesso para ${numero} via ${provedor}.`
        : `Falha no teste de disparo automático para ${numero} via ${provedor}: ${resultado.erro}.`,
    });

    return json({
      ok: resultado.enviado,
      provedor,
      provedorDescricao: descricaoProvedorAtivo(),
      telefone: numero,
      enviado: resultado.enviado,
      idMensagem: resultado.idMensagem,
      erro: resultado.erro,
    });
  } catch (error) {
    console.error("POST /api/whatsapp/teste", error);
    return serverError();
  }
}
