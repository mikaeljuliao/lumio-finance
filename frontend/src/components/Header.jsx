import { Wallet, ChevronLeft, ChevronRight, Wifi, WifiOff, Plus, QrCode } from "lucide-react";
import { MONTH_NAMES } from "../lib/constants";

export function Header({
  filterDate,
  socketConnected,
  qrCode,
  onPrevMonth,
  onNextMonth,
  onConnectWhatsApp,
  onDisconnectWhatsApp,
  onOpenAddModal
}) {
  return (
    <header className="sticky top-0 z-40 bg-[#09090B]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-4 md:px-8 mb-8 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Logo & Subtitle */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-emerald-600 to-emerald-400 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5 text-zinc-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
                  Lumio
                </h1>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Finance
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Gestão Inteligente de Gastos
              </p>
            </div>
          </div>

          {/* Mobile Action Button */}
          <button
            onClick={onOpenAddModal}
            className="md:hidden flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Gasto</span>
          </button>
        </div>

        {/* Month / Year Period Selector */}
        <div className="flex items-center bg-zinc-900/90 border border-zinc-800/90 p-1 rounded-2xl shadow-inner">
          <button
            onClick={onPrevMonth}
            className="p-2 hover:bg-zinc-800/80 rounded-xl transition-colors text-zinc-400 hover:text-white"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-1 text-center min-w-[130px]">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 block">
              {MONTH_NAMES[filterDate.mes]}
            </span>
            <span className="text-[10px] text-zinc-400 font-semibold block leading-none">
              {filterDate.ano}
            </span>
          </div>
          <button
            onClick={onNextMonth}
            className="p-2 hover:bg-zinc-800/80 rounded-xl transition-colors text-zinc-400 hover:text-white"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* WhatsApp Status Badge */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all text-[11px] font-bold ${
              socketConnected
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : qrCode
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-zinc-900/80 border-zinc-800 text-zinc-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                socketConnected
                  ? "bg-emerald-400 animate-pulse"
                  : qrCode
                  ? "bg-amber-400 animate-pulse"
                  : "bg-zinc-600"
              }`}
            />
            <span className="uppercase tracking-wider">
              {socketConnected ? "WhatsApp Online" : qrCode ? "Escaneie o QR" : "Desconectado"}
            </span>
          </div>

          {/* WhatsApp Toggle Button */}
          {socketConnected ? (
            <button
              id="btn-disconnect-whatsapp"
              onClick={onDisconnectWhatsApp}
              className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold"
              title="Desconectar WhatsApp"
            >
              <WifiOff className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="btn-connect-whatsapp"
              onClick={onConnectWhatsApp}
              disabled={Boolean(qrCode)}
              className={`p-2.5 rounded-xl border transition-all text-xs font-bold ${
                qrCode
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-400/50 cursor-not-allowed"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}
              title="Conectar WhatsApp"
            >
              {qrCode ? <QrCode className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            </button>
          )}

          {/* Desktop Add Expense Button */}
          <button
            onClick={onOpenAddModal}
            className="hidden md:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/15 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Gasto</span>
          </button>
        </div>
      </div>
    </header>
  );
}
