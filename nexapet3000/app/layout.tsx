import './globals.css';
import { Metadata } from 'next';
import { ExpirationWrapper } from '@/components/ExpirationWrapper';
import { AppProvider } from '@/components/AppContext';

export const metadata: Metadata = {
  title: 'Casa do Criador Maringá - POS',
  description: 'Sistema de PDV e Gerenciamento para Pet Shop',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProvider>
          <ExpirationWrapper>
            {children}
          </ExpirationWrapper>
        </AppProvider>
      </body>
    </html>
  );
}
