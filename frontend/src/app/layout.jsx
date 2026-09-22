import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Lumio — Controle Financeiro Inteligente",
  description: "Controle financeiro pessoal inteligente com registro via WhatsApp",
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
