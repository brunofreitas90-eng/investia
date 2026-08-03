import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DelfoInvestIA — Análise Inteligente de Investimentos',
  description:
    'Plataforma SaaS com IA para analisar ações brasileiras e americanas, controlar dividendos e imposto de renda.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DelfoInvestIA',
  },
  icons: {
    icon: [
      { url: '/icons/app-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a4d68',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="min-h-screen antialiased bg-[#050506] text-white">
        {children}
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
