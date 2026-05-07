"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Wallet, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  ListFilter, 
  Trash2, 
  Edit3, 
  X, 
  QrCode, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Download,
  Calendar,
  DollarSign
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import io from "socket.io-client";

type Gasto = {
  id: string;
  valor: number;
  categoria: string;
  descricao: string;
  data: string;
  created_at: string;
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];
const PREDEFINED_CATEGORIES = [
  { id: "alimentação", label: "🍔 Alimentação" },
  { id: "transporte", label: "🚗 Transporte" },
  { id: "lazer", label: "🎮 Lazer" },
  { id: "saúde", label: "🏥 Saúde" },
  { id: "moradia", label: "🏠 Moradia" },
  { id: "mercado", label: "🛒 Mercado" },
  { id: "educação", label: "🎓 Educação" },
  { id: "serviços", label: "💡 Serviços" },
  { id: "compras", label: "🛍️ Compras" },
  { id: "presentes", label: "🎁 Presentes" },
  { id: "viagem", label: "✈️ Viagem" },
  { id: "investimentos", label: "📈 Investimentos" },
  { id: "outros", label: "💰 Outros" }
];

const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function Home() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [limites, setLimites] = useState<Record<string, number>>({ geral: 2000 });
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  
  // Filtro Temporal
  const [filtroData, setFiltroData] = useState({
    mes: new Date().getMonth(),
    ano: new Date().getFullYear()
  });

  // Modais
  const [editModal, setEditModal] = useState<{ isOpen: boolean, gasto: Gasto | null }>({ isOpen: false, gasto: null });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, type: 'delete' | 'clear', gastoId?: string }>({ isOpen: false, type: 'delete' });
  const [limitModal, setLimitModal] = useState({ isOpen: false, categoria: 'geral', valor: 0 });

  useEffect(() => {
    const savedGastos = localStorage.getItem("gastos_v1");
    if (savedGastos) setGastos(JSON.parse(savedGastos));
    
    const savedLimites = localStorage.getItem("limites_v1");
    if (savedLimites) setLimites(JSON.parse(savedLimites));

    setLoading(false);

    const socket = io("http://localhost:3001");
    socket.on("qr", (qr) => { setQrCode(qr); setSocketConnected(false); });
    socket.on("connected", () => { setQrCode(null); setSocketConnected(true); });
    socket.on("disconnected", () => setSocketConnected(false));
    socket.on("novo_gasto", (g) => {
      setGastos(prev => {
        const novo = [g, ...prev];
        localStorage.setItem("gastos_v1", JSON.stringify(novo));
        return novo;
      });
    });
    return () => { socket.disconnect(); };
  }, []);

  // Gastos filtrados pelo período selecionado
  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      const d = new Date(g.data);
      return d.getMonth() === filtroData.mes && d.getFullYear() === filtroData.ano;
    });
  }, [gastos, filtroData]);

  // Gastos do mês anterior para comparação
  const gastosMesAnterior = useMemo(() => {
    const mesAnterior = filtroData.mes === 0 ? 11 : filtroData.mes - 1;
    const anoAnterior = filtroData.mes === 0 ? filtroData.ano - 1 : filtroData.ano;
    return gastos.filter(g => {
      const d = new Date(g.data);
      return d.getMonth() === mesAnterior && d.getFullYear() === anoAnterior;
    });
  }, [gastos, filtroData]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const total = gastosFiltrados.reduce((acc, g) => acc + Number(g.valor), 0);
    const totalAnterior = gastosMesAnterior.reduce((acc, g) => acc + Number(g.valor), 0);
    const media = gastosFiltrados.length > 0 ? total / gastosFiltrados.length : 0;
    const diff = totalAnterior > 0 ? ((total - totalAnterior) / totalAnterior) * 100 : 0;

    const porCategoria = gastosFiltrados.reduce((acc, g) => {
      acc[g.categoria] = (acc[g.categoria] || 0) + Number(g.valor);
      return acc;
    }, {} as Record<string, number>);

    const dataCategoria = Object.entries(porCategoria)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const porData = gastosFiltrados.reduce((acc, g) => {
      const data = new Date(g.data).toLocaleDateString('pt-BR', { day: '2-digit' });
      acc[data] = (acc[data] || 0) + Number(g.valor);
      return acc;
    }, {} as Record<string, number>);

    const dataTimeline = Object.entries(porData)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => Number(a.name) - Number(b.name));

    return { total, totalAnterior, diff, media, dataCategoria, dataTimeline, porCategoria };
  }, [gastosFiltrados, gastosMesAnterior]);

  const handleConfirmAction = () => {
    if (confirmModal.type === 'delete' && confirmModal.gastoId) {
      const novos = gastos.filter(g => g.id !== confirmModal.gastoId);
      setGastos(novos);
      localStorage.setItem("gastos_v1", JSON.stringify(novos));
    } else if (confirmModal.type === 'clear') {
      setGastos([]);
      localStorage.removeItem("gastos_v1");
    }
    setConfirmModal({ isOpen: false, type: 'delete' });
  };

  const salvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.gasto) return;
    const novos = gastos.map(g => g.id === editModal.gasto?.id ? editModal.gasto : g);
    setGastos(novos);
    localStorage.setItem("gastos_v1", JSON.stringify(novos));
    setEditModal({ isOpen: false, gasto: null });
  };

  const salvarLimite = (e: React.FormEvent) => {
    e.preventDefault();
    const novosLimites = { ...limites, [limitModal.categoria]: limitModal.valor };
    setLimites(novosLimites);
    localStorage.setItem("limites_v1", JSON.stringify(novosLimites));
    setLimitModal({ ...limitModal, isOpen: false });
  };

  const percentualLimite = Math.min((stats.total / (limites.geral || 1)) * 100, 100);

  return (
    <main className="min-h-screen bg-[#09090B] text-zinc-100 p-4 md:p-10 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-xl shadow-emerald-500/20">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white italic uppercase">
                Finan<span className="text-emerald-500">Bot</span>
                <span className="ml-3 text-[10px] not-italic bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full border border-zinc-700 font-black tracking-[0.2em]">PRO</span>
              </h1>
            </div>
            <p className="text-zinc-500 text-sm font-medium ml-1">Análise inteligente via WhatsApp</p>
          </div>
          
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
            <button 
              onClick={() => setFiltroData(prev => ({ ...prev, mes: prev.mes === 0 ? 11 : prev.mes - 1, ano: prev.mes === 0 ? prev.ano - 1 : prev.ano }))}
              className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white"
            >
              <ArrowDownRight className="w-4 h-4 rotate-90" />
            </button>
            <div className="px-4 text-center min-w-[140px]">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-500">
                {MESES_NOMES[filtroData.mes]} {filtroData.ano}
              </span>
            </div>
            <button 
              onClick={() => setFiltroData(prev => ({ ...prev, mes: prev.mes === 11 ? 0 : prev.mes + 1, ano: prev.mes === 11 ? prev.ano + 1 : prev.ano }))}
              className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${socketConnected ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'}`}>
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{socketConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </header>

        {/* QR Code */}
        {!socketConnected && qrCode && (
          <section className="bg-zinc-900/60 border-2 border-emerald-500/20 p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-10 animate-in zoom-in-95 duration-500">
            <div className="bg-white p-4 rounded-3xl">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
            <div className="text-center md:text-left space-y-4">
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Vincular</h2>
              <p className="text-zinc-400 text-lg max-w-sm font-medium">Escaneie para registrar seus gastos por voz.</p>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                <QrCode className="w-4 h-4" /> Aguardando Scan
              </span>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Fluxo do Mês</p>
            <h3 className="text-3xl font-black text-white">R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className={`text-[10px] mt-2 flex items-center gap-1 font-bold ${stats.diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {stats.diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(stats.diff).toFixed(1)}% vs mês anterior
            </p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Média Diária</p>
            <h3 className="text-3xl font-black text-white">R$ {stats.media.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-widest">Média por item</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Registros</p>
            <h3 className="text-3xl font-black text-white">{gastosFiltrados.length}</h3>
            <p className="text-[10px] text-emerald-500 mt-2 font-bold uppercase tracking-widest">Lançamentos no mês</p>
          </div>
          <div 
            onClick={() => setLimitModal({ isOpen: true, categoria: 'geral', valor: limites.geral || 0 })}
            className={`cursor-pointer p-6 rounded-3xl shadow-xl transition-all hover:scale-105 active:scale-95 ${percentualLimite >= 100 ? 'bg-red-600' : percentualLimite >= 80 ? 'bg-amber-600' : 'bg-emerald-600'}`}
          >
            <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex justify-between items-center">
              Meta Mensal
              <Plus className="w-3 h-3" />
            </p>
            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              {percentualLimite >= 100 ? 'Estourou' : percentualLimite >= 80 ? 'Cuidado' : 'No Alvo'}
            </h3>
            <div className="w-full bg-black/20 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-500" 
                style={{ width: `${percentualLimite}%` }}
              />
            </div>
            <p className="text-[10px] text-white/90 mt-2 font-black uppercase tracking-widest flex justify-between">
              <span>{percentualLimite.toFixed(0)}% USADO</span>
              <span>R$ {limites.geral?.toLocaleString('pt-BR')}</span>
            </p>
          </div>
        </section>

        {/* Charts and Categories Limits */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 p-8 rounded-[2.5rem]">
            <h2 className="text-xl font-black text-white italic uppercase mb-10 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Fluxo Diário
            </h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dataTimeline}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '16px' }} />
                  <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={4} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-[2.5rem] flex flex-col">
            <h2 className="text-xl font-black text-white italic uppercase mb-10 flex items-center gap-3">
              <PieChartIcon className="w-5 h-5 text-emerald-500" /> Limites por Categoria
            </h2>
            <div className="space-y-6 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {PREDEFINED_CATEGORIES.map(cat => {
                const gastoCat = stats.porCategoria[cat.id] || 0;
                const limiteCat = limites[cat.id] || 0;
                const perc = limiteCat > 0 ? Math.min((gastoCat / limiteCat) * 100, 100) : 0;
                
                return (
                  <div 
                    key={cat.id} 
                    className="space-y-2 cursor-pointer group"
                    onClick={() => setLimitModal({ isOpen: true, categoria: cat.id, valor: limiteCat })}
                  >
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-zinc-400 group-hover:text-white transition-colors">{cat.label}</span>
                      <span className={perc >= 100 ? 'text-red-500' : perc >= 80 ? 'text-amber-500' : 'text-emerald-500'}>
                        {limiteCat > 0 ? `R$ ${gastoCat.toFixed(0)} / ${limiteCat.toFixed(0)}` : 'S/ Limite'}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${perc >= 100 ? 'bg-red-500' : perc >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${limiteCat > 0 ? perc : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Transactions */}
        <section className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-white italic uppercase flex items-center gap-3">
              <ListFilter className="w-6 h-6 text-emerald-500" /> Histórico do Mês
            </h2>
            <button onClick={() => setConfirmModal({ isOpen: true, type: 'clear' })} className="p-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl text-red-500/40 hover:text-red-500 transition-all">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gastosFiltrados.length === 0 ? (
              <div className="md:col-span-2 text-center py-20 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[2rem]">
                <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Nenhum registro em {MESES_NOMES[filtroData.mes]}</p>
              </div>
            ) : (
              gastosFiltrados.map((g) => (
                <div key={g.id} className="group bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800 p-5 rounded-3xl transition-all flex items-center justify-between relative overflow-hidden">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {g.categoria === 'alimentação' ? '🍔' : g.categoria === 'transporte' ? '🚗' : g.categoria === 'lazer' ? '🎮' : g.categoria === 'educação' ? '🎓' : g.categoria === 'mercado' ? '🛒' : '💰'}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-zinc-100 capitalize">{g.descricao}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] font-black bg-zinc-800 px-2 py-1 rounded text-zinc-400 uppercase tracking-widest">{g.categoria}</span>
                        <span className="text-[10px] font-black text-zinc-600">{new Date(g.data).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-2xl font-black text-white tracking-tighter">R$ {Number(g.valor).toFixed(2)}</span>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button onClick={() => setEditModal({ isOpen: true, gasto: g })} className="p-2 bg-zinc-800 hover:text-emerald-500 rounded-lg border border-zinc-700"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmModal({ isOpen: true, type: 'delete', gastoId: g.id })} className="p-2 bg-zinc-800 hover:text-red-500 rounded-lg border border-zinc-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Modal Edit */}
      {editModal.isOpen && editModal.gasto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditModal({ isOpen: false, gasto: null })} />
          <div className="relative bg-[#0F0F12] border border-zinc-800 w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl">
            <h2 className="text-3xl font-black text-white italic uppercase mb-8">Ajustar Registro</h2>
            <form onSubmit={salvarEdicao} className="space-y-6">
              <input type="text" value={editModal.gasto.descricao} onChange={(e) => setEditModal({...editModal, gasto: {...editModal.gasto!, descricao: e.target.value}})} className="w-full bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 font-bold" />
              <input type="number" step="0.01" value={editModal.gasto.valor} onChange={(e) => setEditModal({...editModal, gasto: {...editModal.gasto!, valor: parseFloat(e.target.value)}})} className="w-full bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 font-black text-2xl" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {PREDEFINED_CATEGORIES.map(cat => (
                  <button key={cat.id} type="button" onClick={() => setEditModal({...editModal, gasto: {...editModal.gasto!, categoria: cat.id}})} className={`p-3 rounded-xl text-[10px] font-black uppercase border transition-all ${editModal.gasto?.categoria === cat.id ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>{cat.label}</button>
                ))}
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-5 rounded-2xl transition-all uppercase tracking-widest text-lg">Confirmar</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Limit */}
      {limitModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setLimitModal({ ...limitModal, isOpen: false })} />
          <div className="relative bg-[#0F0F12] border border-zinc-800 w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-white italic uppercase">Definir Limite</h2>
              <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20">{limitModal.categoria}</span>
            </div>
            <form onSubmit={salvarLimite} className="space-y-6">
              <div className="space-y-2">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest ml-1">Valor Máximo Mensal</p>
                <input 
                  type="number" 
                  step="1" 
                  value={limitModal.valor} 
                  onChange={(e) => setLimitModal({...limitModal, valor: parseFloat(e.target.value) || 0})} 
                  className="w-full bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 font-black text-3xl" 
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    const novosLimites = { ...limites };
                    delete novosLimites[limitModal.categoria];
                    setLimites(novosLimites);
                    localStorage.setItem("limites_v1", JSON.stringify(novosLimites));
                    setLimitModal({ ...limitModal, isOpen: false });
                  }} 
                  className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-xl transition-all uppercase tracking-widest text-sm">Salvar Limite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setConfirmModal({...confirmModal, isOpen: false})} />
          <div className="relative bg-[#18181B] border border-zinc-800 w-full max-w-sm rounded-[2.5rem] p-10 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-8 mx-auto"><Trash2 className="w-8 h-8 text-red-500" /></div>
            <h3 className="text-2xl font-black text-white uppercase italic mb-4">{confirmModal.type === 'clear' ? 'Limpar Tudo?' : 'Excluir?'}</h3>
            <p className="text-zinc-500 text-sm mb-10 leading-relaxed">Esta ação é permanente e não poderá ser desfeita.</p>
            <div className="space-y-3">
              <button onClick={handleConfirmAction} className="w-full py-4 bg-red-500 text-black font-black rounded-xl uppercase tracking-widest">Sim, Deletar</button>
              <button onClick={() => setConfirmModal({...confirmModal, isOpen: false})} className="w-full py-4 bg-zinc-800 text-zinc-400 font-bold rounded-xl uppercase tracking-widest text-xs">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272A; border-radius: 20px; }
      `}} />
    </main>
  );
}
