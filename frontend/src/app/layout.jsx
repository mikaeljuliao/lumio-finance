import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Lumio",
  description: "Controle financeiro pessoal com registro de gastos via WhatsApp e IA.",
  icons: {
    icon: "/favicon-icon.jpg",
    shortcut: "/favicon-icon.jpg",
    apple: "/favicon-icon.jpg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
