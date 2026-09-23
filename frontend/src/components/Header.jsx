import { Wallet, ArrowDownRight, ArrowUpRight, Wifi, WifiOff, QrCode } from "lucide-react";
import { MONTH_NAMES } from "../lib/constants";

export function Header({
  filtroData,
  socketConnected,
  qrCode,
  onPrevMonth,
  onNextMonth,
  onConnect,
  onDisconnect
}) {
  return (
    <header className="flex flex-col gap-6">
      {/* Linha principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-xl shadow-emerald-500/20">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
              Lumio
              <span className="ml-3 text-[10px] not-italic bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full border border-zinc-700 font-black tracking-[0.2em]">
                PRO
              </span>
            </h1>
          </div>
          <p className="text-zinc-500 text-sm font-medium ml-1">
            Análise inteligente via WhatsApp
          </p>
        </div>

        <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
          <button
            onClick={onPrevMonth}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white"
            aria-label="Mês anterior"
          >
            <ArrowDownRight className="w-4 h-4 rotate-90" />
          </button>
          <div className="px-4 text-center min-w-[140px]">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-500">
              {MONTH_NAMES[filtroData.mes]} {filtroData.ano}
            </span>
          </div>
          <button
            onClick={onNextMonth}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white"
            aria-label="Próximo mês"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Status e botão de conexão */}
        <div className="flex items-center gap-3">
          {/* Badge de status */}
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
              socketConnected
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
                : qrCode
                ? "bg-yellow-500/5 border-yellow-500/20 text-yellow-500"
                : "bg-zinc-900/50 border-zinc-800 text-zinc-500"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                socketConnected
                  ? "bg-emerald-500 animate-pulse"
                  : qrCode
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-zinc-700"
              }`}
            />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {socketConnected ? "Online" : qrCode ? "Aguardando Scan" : "Offline"}
            </span>
          </div>

          {/* Botão de ação */}
          {socketConnected ? (
            <button
              id="btn-disconnect-whatsapp"
              onClick={onDisconnect}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-[11px] font-black uppercase tracking-widest"
            >
              <WifiOff className="w-3.5 h-3.5" />
              Desconectar
            </button>
          ) : (
            <button
              id="btn-connect-whatsapp"
              onClick={onConnect}
              disabled={!!qrCode}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors text-[11px] font-black uppercase tracking-widest ${
                qrCode
                  ? "border-yellow-500/20 bg-yellow-500/5 text-yellow-500/50 cursor-not-allowed"
                  : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              {qrCode ? "Escaneie o QR" : "Conectar WhatsApp"}
            </button>
          )}
        </div>
      </div>

      {/* QR Code — aparece apenas quando aguardando escaneamento */}
      {!socketConnected && qrCode && (
        <div className="flex items-center gap-8 bg-zinc-900/60 border-2 border-yellow-500/20 p-6 rounded-[2rem]">
          <div className="bg-white p-3 rounded-2xl flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="WhatsApp QR Code" className="w-44 h-44" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-yellow-500">
              <QrCode className="w-5 h-5" />
              <h2 className="text-xl font-black uppercase tracking-tight">
                Vincule seu WhatsApp
              </h2>
            </div>
            <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
              Abra o WhatsApp no celular, vá em{" "}
              <span className="text-white font-semibold">Dispositivos Conectados</span> e
              escaneie o código ao lado para começar a registrar gastos.
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
              Aguardando escaneamento
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
