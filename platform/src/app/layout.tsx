import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'رافل – مركز التحكم',
  description: 'منصة موحّدة لإدارة وحدات رافل للتخزين مع Zoho Creator و Zoho Books',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
