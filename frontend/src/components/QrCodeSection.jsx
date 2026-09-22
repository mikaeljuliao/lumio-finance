import { QrCode } from "lucide-react";

export function QrCodeSection({ qrCode }) {
  return (
    <section className="bg-zinc-900/60 border-2 border-emerald-500/20 p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-10">
      <div className="bg-white p-4 rounded-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
      </div>
      <div className="text-center md:text-left space-y-4">
        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">
          Vincular
        </h2>
        <p className="text-zinc-400 text-lg max-w-sm font-medium">
          Escaneie para registrar seus gastos por voz.
        </p>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
          <QrCode className="w-4 h-4" /> Aguardando Scan
        </span>
      </div>
    </section>
  );
}
