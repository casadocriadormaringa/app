import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { DeliveryAlert } from '@/components/DeliveryAlert';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gerenciador de Pedidos',
  description: 'Sistema de gerenciamento de recebimento de pedidos',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
        <DeliveryAlert />
      </body>
    </html>
  );
}
