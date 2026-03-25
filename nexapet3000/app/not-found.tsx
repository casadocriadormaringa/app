import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h2 className="text-4xl font-black text-gray-900 mb-4">404</h2>
      <p className="text-gray-600 font-medium mb-8">Página não encontrada.</p>
      <Link 
        href="/"
        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all"
      >
        Voltar para o Início
      </Link>
    </div>
  );
}
