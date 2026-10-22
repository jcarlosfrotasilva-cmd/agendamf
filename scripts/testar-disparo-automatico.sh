#!/usr/bin/env bash
# Teste do disparo automático de WhatsApp usando um provedor simulado local.
# Executa: provedor mock -> servidor Next com credenciais de teste -> disparo real.
set -u

cd "$(dirname "$0")/.."

PORTA_MOCK=4599
PORTA_APP=3100
SEGREDO=segredo-teste

echo "== 1. subindo provedor simulado =="
node scripts/mock-whatsapp-provider.mjs > /tmp/mock.log 2>&1 &
MOCK_PID=$!
sleep 1
curl -s --max-time 3 "http://127.0.0.1:${PORTA_MOCK}/_recebidas" >/dev/null && echo "provedor simulador ativo"

echo "== 2. subindo aplicação com credenciais do provedor =="
EVOLUTION_URL="http://127.0.0.1:${PORTA_MOCK}" \
EVOLUTION_API_KEY="chave-teste" \
EVOLUTION_INSTANCE="escola" \
WHATSAPP_PROVIDER="evolution" \
WHATSAPP_AUTO_CONVITE="true" \
CRON_SECRET="${SEGREDO}" \
  node node_modules/next/dist/bin/next start -p "${PORTA_APP}" > /tmp/srv-auto.log 2>&1 &
APP_PID=$!

for _ in $(seq 1 25); do
  if curl -s --max-time 2 "http://127.0.0.1:${PORTA_APP}/api/health" >/dev/null; then break; fi
  sleep 1
done

B="http://127.0.0.1:${PORTA_APP}"

echo
echo "== 3. provedor detectado =="
curl -s "${B}/api/whatsapp/automatico?simulacao=true&secret=${SEGREDO}" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print('provedor:',d['provedor'],'| automatico:',d['automatico'],'|',d['provedorDescricao'])"

echo
echo "== 4. disparo REAL dos lembretes =="
curl -s -X POST "${B}/api/whatsapp/automatico?somente=lembretes&secret=${SEGREDO}" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('lembretes enviados:',d['lembretesEnviados'],'| falhas:',d['falhas'],'| pendentes:',d['pendentes'])
[print('  -',x['titulo'],'|',x['finalidade'],'|',x['status'],'|',x['telefone'],'| id:',x.get('idMensagem')) for x in d['detalhes']]
"

echo
echo "== 5. mensagens recebidas pelo provedor =="
curl -s "http://127.0.0.1:${PORTA_MOCK}/_recebidas" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('total:',d['total'])
[print('  ->',r.get('number'),'| apikey:',r.get('apikey'),'|',(r.get('text') or '')[:60].replace(chr(10),' / ')) for r in d['recebidas']]
"

echo
echo "== 6. segunda execução (deduplicação: não deve reenviar) =="
curl -s -X POST "${B}/api/whatsapp/automatico?somente=lembretes&secret=${SEGREDO}" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print('lembretes enviados:',d['lembretesEnviados'],'| detalhes:',len(d['detalhes']))"
curl -s "http://127.0.0.1:${PORTA_MOCK}/_recebidas" \
  | python3 -c "import json,sys;print('total no provedor (deve seguir igual):',json.load(sys.stdin)['total'])"

echo
echo "== 7. proteção do agendador (CRON_SECRET) =="
printf "sem segredo: "; curl -s -o /dev/null -w "%{http_code}\n" "${B}/api/whatsapp/automatico"
printf "com segredo: "; curl -s -o /dev/null -w "%{http_code}\n" "${B}/api/whatsapp/automatico?secret=${SEGREDO}"

echo
echo "== 8. convite automático ao agendar =="
GESTOR=$(curl -s -X POST "${B}/api/gestores" -H 'Content-Type: application/json' \
  -d '{"nome":"Diretor Teste Automatico","cargo":"DIRETOR","telefone":"(11) 99111-2222"}')
GID=$(echo "$GESTOR" | sed -E 's/.*"id":([0-9]+).*/\1/')
HOJE=$(date +%F)
NOVO=$(curl -s -X POST "${B}/api/compromissos" -H 'Content-Type: application/json' \
  -d "{\"titulo\":\"Reuniao do Conselho de Escola (teste)\",\"tipo\":\"REUNIAO_CONSELHO_ESCOLA\",\"assunto\":\"Validar convite automatico\",\"cargoResponsavel\":\"DIRETOR\",\"gestorId\":${GID},\"dataInicio\":\"${HOJE}\",\"dataFim\":\"${HOJE}\",\"horaInicio\":\"20:00\",\"horaFim\":\"22:00\",\"local\":\"Sala de Reunioes\",\"lembreteMinutos\":60,\"despertadorAtivo\":true,\"enviarConvite\":true}")
echo "$NOVO" | python3 -c "import json,sys;d=json.load(sys.stdin);c=d.get('convite') or {};print('compromisso id:',d['compromisso']['id'],'| convite enviado:',c.get('enviado'),'| erro:',c.get('erro'))"
CID=$(echo "$NOVO" | python3 -c "import json,sys;print(json.load(sys.stdin)['compromisso']['id'])")

echo
echo "== 9. histórico registrado no banco (via API) =="
curl -s "${B}/api/whatsapp" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('provedor:',d['provedor'],'| total registros:',d['total'])
[print('  -',i['finalidade'],'|',i['status'],'|',i['canal'],'|',i['destinoTelefone']) for i in d['itens'][:8]]
"

echo
echo "== 10. teste de envio pelo painel =="
curl -s -X POST "${B}/api/whatsapp/teste" -H 'Content-Type: application/json' \
  -d '{"telefone":"(11) 99999-8888"}' \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print('enviado:',d['enviado'],'| provedor:',d['provedor'],'| id:',d.get('idMensagem'),'| erro:',d.get('erro'))"

echo
echo "== 11. limpando registros de teste =="
curl -s -X DELETE "${B}/api/compromissos/${CID}" >/dev/null
curl -s -X DELETE "${B}/api/gestores/${GID}" >/dev/null
echo "CID=${CID} GID=${GID}" > /tmp/ids-auto.txt
echo "concluído; encerrando processos de teste"
kill "$APP_PID" 2>/dev/null
kill "$MOCK_PID" 2>/dev/null
wait 2>/dev/null
exit 0
