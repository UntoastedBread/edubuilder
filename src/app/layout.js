import '@/styles/globals.css';

export const metadata = {
  title: 'EduBuilder',
  description: 'AI-powered interactive lesson builder',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
