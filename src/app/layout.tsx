import type { Metadata } from 'next';
import Providers from './providers';
import Shell from '@/components/Shell';
import '@/styles/globals.scss';

export const metadata: Metadata = { title: 'Evotras Platform Yönetimi' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body><Providers><Shell>{children}</Shell></Providers></body>
    </html>
  );
}
