import Link from "next/link";
import { redirect } from "next/navigation";
import { MinhaSenhaForm } from "@/components/MinhaSenhaForm";
import { Card } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { SENHA_MINIMA } from "@/lib/senha";

export const dynamic = "force-dynamic";

export default async function MinhaSenhaPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Segurança da conta
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Minha senha de acesso
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Altere a senha da sua conta da equipe de gestão. A troca é imediata e vale para o próximo
          acesso.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Trocar a senha</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Informe a senha atual para confirmar sua identidade.
          </p>
          <div className="mt-4">
            <MinhaSenhaForm email={sessao.email} nome={sessao.nome} />
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Política de senha</h2>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li>• Mínimo de {SENHA_MINIMA} caracteres.</li>
              <li>• Pelo menos uma letra e um número.</li>
              <li>• Não pode conter o e-mail de acesso nem o próprio nome.</li>
              <li>• Não pode repetir a senha atual.</li>
              <li>• Recomendado: 12+ caracteres com maiúsculas, minúsculas e símbolo.</li>
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Como o sistema guarda a senha</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              A senha nunca é gravada em texto. Ao criar ou trocar, o servidor gera um{" "}
              <strong>hash scrypt</strong> com <em>salt</em> aleatório por usuário (formato{" "}
              <code>scrypt$salt$hash</code>, 168 caracteres). No login, o sistema recalcula o hash e
              compara em tempo constante. Nem administradores nem o banco conseguem recuperar a senha
              original.
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Consequência prática: se alguém esquecer a senha, não há como “ver” a antiga — é
              preciso <strong>redefinir</strong> (a administração faz isso em Usuários e Acessos).
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Não consegue entrar?</h2>
            <ol className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600">
              <li>
                <strong>1.</strong> Peça a outro administrador para redefinir sua senha em{" "}
                <Link href="/usuarios" className="font-semibold text-indigo-600 hover:text-indigo-700">
                  Usuários e Acessos → Editar → Nova senha
                </Link>
                .
              </li>
              <li>
                <strong>2.</strong> Se o próprio administrador perdeu a senha, use o procedimento de
                recuperação no servidor (<code>node scripts/reset-senha.mjs email@escola novaSenha</code>).
              </li>
              <li>
                <strong>3.</strong> Professores não têm senha: o acesso deles é o link pessoal
                gerado em Professores (pode ser renovado a qualquer momento).
              </li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
