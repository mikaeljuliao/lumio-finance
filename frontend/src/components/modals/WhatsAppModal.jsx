import { QRCodeSVG } from "qrcode.react";
import { MessageSquare, ExternalLink, X, Smartphone, Send } from "lucide-react";
import { LUMIO_WHATSAPP } from "../../lib/constants";

export function WhatsAppModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-[#0F0F12] border border-zinc-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5 text-center z-10 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="space-y-2">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-white tracking-tight uppercase">
            WhatsApp do Lumio
          </h3>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold font-mono">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>{LUMIO_WHATSAPP.formatted}</span>
          </div>
        </div>

        {/* Compact QR Code Container */}
        <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl space-y-2 flex flex-col items-center justify-center">
          <div className="bg-white p-2.5 rounded-xl shadow-md">
            <QRCodeSVG
              value={LUMIO_WHATSAPP.link}
              size={130}
              bgColor="#FFFFFF"
              fgColor="#09090B"
              level="M"
            />
          </div>
          <p className="text-[11px] text-zinc-400 font-medium">
            Escaneie para iniciar a conversa
          </p>
        </div>

        {/* Tip Box */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-left space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] uppercase">
            <Send className="w-3 h-3" />
            <span>Exemplo de envio:</span>
          </div>
          <p className="text-zinc-300 font-mono text-[11px]">
            &quot;gastei 35 no almoço&quot;
          </p>
        </div>

        {/* Action Button */}
        <a
          href={LUMIO_WHATSAPP.link}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/15 active:scale-95"
        >
          <span>Abrir WhatsApp</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
