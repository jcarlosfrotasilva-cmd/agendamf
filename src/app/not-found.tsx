import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card-surface max-w-lg p-8 text-center">
        <span className="text-4xl">🗓️</span>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
          Registro não localizado na agenda
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          O compromisso pode ter sido excluído, adiado ou o endereço informado está incorreto.
          Consulte a agenda completa para verificar os compromissos da gestão escolar.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/agenda"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            Ir para a agenda
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  );
}
