/**
 * Provedor de WhatsApp simulado — usado APENAS para testar o disparo automático
 * localmente (não faz parte do sistema). Registra cada requisição recebida.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 4599);
const recebidas = [];

const servidor = createServer((req, res) => {
  let corpo = "";
  req.on("data", (chunk) => (corpo += chunk));
  req.on("end", () => {
    if (req.url?.startsWith("/message/sendText") || req.url?.includes("send-text")) {
      let dados = {};
      try {
        dados = JSON.parse(corpo);
      } catch {
        dados = { raw: corpo };
      }
      recebidas.push({ url: req.url, apikey: req.headers.apikey ?? null, ...dados });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ key: { id: `mock-${recebidas.length}` }, status: "PENDING" }));
      return;
    }
    if (req.url === "/_recebidas") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ total: recebidas.length, recebidas }));
      return;
    }
    if (req.url === "/_limpar") {
      recebidas.length = 0;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404).end();
  });
});

servidor.listen(PORT, () => {
  console.log(`mock-whatsapp-provider ouvindo em http://127.0.0.1:${PORT}`);
});
