import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Router',
  description: 'Multi AI Proxy - Gemini, Groq y Grok',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
