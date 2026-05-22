export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '1rem' }}>
      <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#111827', marginBottom: '1rem' }}>404</h2>
      <p style={{ color: '#4b5563', fontWeight: 500, marginBottom: '2rem' }}>Página não encontrada.</p>
      <a 
        href="/"
        style={{ padding: '0.75rem 1.5rem', backgroundColor: '#4f46e5', color: '#ffffff', borderRadius: '1rem', fontWeight: 900, textDecoration: 'none' }}
      >
        Voltar para o Início
      </a>
    </div>
  );
}
