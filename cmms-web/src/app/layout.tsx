import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Enterprise CMMS Maintenance Engine',
  description: 'Next.js 16 PWA + .NET 10 Coravel Computerized Maintenance Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
