import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import '@/styles/globals.css';

const roboto = Roboto({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TinyGrid - Mini Spreadsheet',
  description: 'A minimal spreadsheet application with formulas and ranges',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body className={roboto.className}>{children}</body>
    </html>
  );
}
