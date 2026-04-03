// app/layout.js
import './globals.css';

export const metadata = {
  title: 'AI Router',
  description: 'Router para Gemini y Groq',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
