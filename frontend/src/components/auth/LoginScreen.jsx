import { useState } from "react";
import { Wallet, Smartphone, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { getApiBaseUrl, saveSessionToken } from "../../lib/config";

export function LoginScreen({ onLoginSuccess }) {
  const API_BASE = getApiBaseUrl();
  const [phoneInput, setPhoneInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartLogin = async (e) => {
    e.preventDefault();
    setError("");

    const digitsOnly = phoneInput.replace(/\D/g, "");
    if (digitsOnly.length < 8) {
      setError("Informe um número de WhatsApp válido com DDD");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: digitsOnly }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        // Salvar token no localStorage para uso como Bearer em todas as chamadas
        if (data.token) {
          saveSessionToken(data.token);
        }
        onLoginSuccess(data.user);
      } else {
        setError(data.error || "Erro ao acessar a conta");
      }
    } catch (err) {
      setError("Falha ao conectar com o servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center p-4 selection:bg-emerald-500/30">
      <div className="w-full max-w-md bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8 backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-emerald-400 p-3 rounded-2xl mx-auto shadow-xl shadow-emerald-500/20 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-zinc-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-black uppercase tracking-tight text-white italic">
                Lumio
              </h1>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Finance
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Gestão Financeira Inteligente via WhatsApp
            </p>
          </div>
        </div>

        {/* Direct Login Form */}
        <form onSubmit={handleStartLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" /> Seu Número de WhatsApp
            </label>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Ex: (11) 99999-9999"
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/80 font-bold tracking-wide transition-colors"
              required
              autoFocus
            />
            <p className="text-[11px] text-zinc-500">
              Informe seu número com DDD para acessar diretamente seu painel de controle.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-4 rounded-2xl transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 cursor-pointer active:scale-[0.99]"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Footer */}
        <div className="pt-4 border-t border-zinc-800/80 text-center flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Sessão segura e privada • Lumio Multi-User</span>
        </div>
      </div>
    </div>
  );
}
