import { QrCode } from "lucide-react";

export function QrCodeBanner({ qrCode }) {
  if (!qrCode) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/20 p-6 rounded-3xl mb-8 flex flex-col sm:flex-row items-center gap-6 shadow-xl backdrop-blur-sm">
      <div className="bg-white p-3 rounded-2xl shrink-0 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCode} alt="WhatsApp QR Code" className="w-40 h-40" />
      </div>
      <div className="space-y-3 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 text-amber-400">
          <QrCode className="w-5 h-5" />
          <h3 className="text-lg font-black uppercase tracking-tight">
            Vincular WhatsApp
          </h3>
        </div>
        <p className="text-xs text-zinc-300 max-w-md leading-relaxed">
          Abra o WhatsApp no celular, toque em <strong className="text-white">Dispositivos Conectados</strong> e escaneie o código ao lado para sincronizar seus gastos em tempo real.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
          Aguardando escaneamento...
        </div>
      </div>
    </div>
  );
}
