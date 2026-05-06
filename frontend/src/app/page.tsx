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

export default function Home() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  
  // Modais
  const [editModal, setEditModal] = useState<{ isOpen: boolean, gasto: Gasto | null }>({ isOpen: false, gasto: null });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, type: 'delete' | 'clear', gastoId?: string }>({ isOpen: false, type: 'delete' });

  useEffect(() => {
    // Carregar dados iniciais
    const saved = localStorage.getItem("gastos_v1");
    if (saved) {
      setGastos(JSON.parse(saved));
    }
    setLoading(false);

    // Socket.io
    const socket = io("http://localhost:3001");
    
    socket.on("connect", () => console.log("Socket conectado"));
    socket.on("qr", (qrDataUrl) => {
      setQrCode(qrDataUrl);
      setSocketConnected(false);
    });
    socket.on("connected", () => {
      setQrCode(null);
      setSocketConnected(true);
    });
    socket.on("disconnected", () => setSocketConnected(false));
    
    socket.on("novo_gasto", (gasto: Gasto) => {
      setGastos((prev) => {
        const novo = [gasto, ...prev];
        localStorage.setItem("gastos_v1", JSON.stringify(novo));
        return novo;
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const total = gastos.reduce((acc, g) => acc + Number(g.valor), 0);
    const media = gastos.length > 0 ? total / gastos.length : 0;
    
    // Agrupar por categoria
    const porCategoria = gastos.reduce((acc, g) => {
      acc[g.categoria] = (acc[g.categoria] || 0) + Number(g.valor);
      return acc;
    }, {} as Record<string, number>);

    const dataCategoria = Object.entries(porCategoria)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Agrupar por data para o gráfico de timeline (últimos 7 dias com dados)
    const porData = gastos.reduce((acc, g) => {
      const data = new Date(g.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      acc[data] = (acc[data] || 0) + Number(g.valor);
      return acc;
    }, {} as Record<string, number>);

    const dataTimeline = Object.entries(porData)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => {
        const [dayA, monthA] = a.name.split('/').map(Number);
        const [dayB, monthB] = b.name.split('/').map(Number);
        return (monthA * 100 + dayA) - (monthB * 100 + dayB);
      })
      .slice(-7);

    return { total, media, dataCategoria, dataTimeline };
  }, [gastos]);

  // Handlers
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

  const exportarCSV = () => {
    const headers = ["Data", "Descrição", "Categoria", "Valor"];
    const rows = gastos.map(g => [g.data, g.descricao, g.categoria, g.valor.toString()]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "meus_gastos_finanbot.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-[#09090B] text-zinc-100 p-4 md:p-10 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Decorative elements */}
        <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none -z-10" />
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-500/10">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white italic uppercase">
                Finan<span className="text-emerald-500">Bot</span>
                <span className="ml-3 text-[10px] not-italic bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full border border-zinc-700 font-black tracking-[0.2em]">PRO DASHBOARD</span>
              </h1>
            </div>
            <p className="text-zinc-500 text-sm font-medium ml-1">Análise inteligente de gastos via WhatsApp & Voz</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={exportarCSV}
              className="group flex items-center gap-2 px-4 py-2.5 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all text-xs font-bold"
            >
              <Download className="w-4 h-4 text-zinc-500 group-hover:text-emerald-500" />
              Exportar .CSV
            </button>
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all ${socketConnected ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'}`}>
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]' : 'bg-zinc-700'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{socketConnected ? 'Bot Online' : 'Bot Offline'}</span>
            </div>
          </div>
        </header>

        {/* QR Code Section (Only if disconnected) */}
        {!socketConnected && qrCode && (
          <section className="bg-zinc-900/60 border-2 border-emerald-500/20 p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-10 animate-in zoom-in-95 duration-500 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] pointer-events-none" />
            <div className="bg-white p-4 rounded-3xl shadow-2xl shadow-emerald-500/10 hover:scale-105 transition-transform duration-500">
              <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
            </div>
            <div className="text-center md:text-left space-y-4">
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">Vincular Conta</h2>
              <p className="text-zinc-400 text-lg max-w-sm font-medium leading-tight">Escaneie para começar a registrar seus gastos por áudio agora mesmo.</p>
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <QrCode className="w-4 h-4" />
                  Aguardando Scan
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm group hover:border-emerald-500/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Fluxo Total</p>
              <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-emerald-500" /></div>
            </div>
            <h3 className="text-3xl font-black text-white">R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1 font-bold">
              <ArrowUpRight className="w-3 h-3 text-emerald-500" /> +12.5% vs mês anterior
            </p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm group hover:border-emerald-500/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Média Diária</p>
              <div className="p-2 bg-blue-500/10 rounded-lg"><DollarSign className="w-4 h-4 text-blue-500" /></div>
            </div>
            <h3 className="text-3xl font-black text-white">R$ {stats.media.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-widest">Gasto médio p/ item</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm group hover:border-emerald-500/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Lançamentos</p>
              <div className="p-2 bg-amber-500/10 rounded-lg"><Calendar className="w-4 h-4 text-amber-500" /></div>
            </div>
            <h3 className="text-3xl font-black text-white">{gastos.length}</h3>
            <p className="text-[10px] text-emerald-500 mt-2 font-bold uppercase tracking-widest">Registros ativos</p>
          </div>
          <div className="bg-emerald-600 p-6 rounded-3xl shadow-xl shadow-emerald-900/20 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all">
            <div className="relative z-10">
              <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Status da Conta</p>
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Premium</h3>
              <p className="text-[10px] text-emerald-900 mt-2 font-black uppercase tracking-widest">SaaS Edition Active</p>
            </div>
            <Wallet className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-500 opacity-20 group-hover:scale-110 transition-transform duration-700" />
          </div>
        </section>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Area Chart */}
          <section className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 p-8 rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Evolução Semanal
                </h2>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Gastos agrupados por dia</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dataTimeline}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }} 
                    dy={15}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '16px', color: '#fff' }}
                    itemStyle={{ color: '#10b981', fontWeight: 900 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10b981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Category Pie Chart */}
          <section className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-[2.5rem] flex flex-col">
            <h2 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-3 mb-10">
              <PieChartIcon className="w-5 h-5 text-emerald-500" />
              Categorias
            </h2>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.dataCategoria}
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.dataCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Top</span>
                  <span className="text-xl font-black text-white capitalize">{stats.dataCategoria[0]?.name || '---'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-8 w-full px-4">
                {stats.dataCategoria.slice(0, 4).map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter truncate">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Transactions Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between mb-2 px-2">
            <div>
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                <ListFilter className="w-6 h-6 text-emerald-500" />
                Histórico de Fluxo
              </h2>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Registros processados por IA</p>
            </div>
            <button 
              onClick={() => setConfirmModal({ isOpen: true, type: 'clear' })}
              className="p-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl transition-all group"
            >
              <Trash2 className="w-5 h-5 text-red-500/40 group-hover:text-red-500" />
            </button>
          </div>
          
          {gastos.length === 0 ? (
            <div className="bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-[2.5rem] p-20 text-center animate-pulse">
              <Wallet className="w-16 h-16 text-zinc-800 mx-auto mb-6 opacity-20" />
              <h3 className="text-xl font-black text-zinc-600 uppercase italic tracking-tighter">Sem Lançamentos</h3>
              <p className="text-zinc-700 text-xs font-bold uppercase tracking-widest mt-2">Mande um áudio para ver a mágica</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gastos.map((g) => (
                <div 
                  key={g.id} 
                  className="group bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/30 p-5 rounded-3xl transition-all flex items-center justify-between relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/0 group-hover:bg-emerald-500 transition-all" />
                  
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      {g.categoria === 'alimentação' ? '🍔' : g.categoria === 'transporte' ? '🚗' : g.categoria === 'lazer' ? '🎮' : '💰'}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-zinc-100 capitalize leading-tight mb-1">{g.descricao}</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black bg-zinc-800 px-2 py-1 rounded text-zinc-400 uppercase tracking-widest border border-zinc-700">{g.categoria}</span>
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{new Date(g.data).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-xs font-black text-zinc-600 uppercase block mb-1">Valor</span>
                      <span className="text-2xl font-black text-white tracking-tighter">
                        R$ {Number(g.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    {/* Action Bar */}
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button 
                        onClick={() => setEditModal({ isOpen: true, gasto: g })}
                        className="p-2.5 bg-zinc-800 hover:bg-emerald-500/20 rounded-xl text-zinc-400 hover:text-emerald-500 transition-all border border-zinc-700 hover:border-emerald-500/30"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setConfirmModal({ isOpen: true, type: 'delete', gastoId: g.id })}
                        className="p-2.5 bg-zinc-800 hover:bg-red-500/20 rounded-xl text-zinc-400 hover:text-red-500 transition-all border border-zinc-700 hover:border-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* MODAL: Edit */}
      {editModal.isOpen && editModal.gasto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setEditModal({ isOpen: false, gasto: null })} />
          <div className="relative bg-[#0F0F12] border border-zinc-800 w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Editar Registro</h2>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Ajuste técnico do lançamento</p>
              </div>
              <button onClick={() => setEditModal({ isOpen: false, gasto: null })} className="p-3 hover:bg-white/5 rounded-2xl transition-colors border border-transparent hover:border-zinc-800">
                <X className="w-6 h-6 text-zinc-500" />
              </button>
            </div>
            
            <form onSubmit={salvarEdicao} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-1">Descrição</label>
                  <input 
                    type="text" 
                    value={editModal.gasto.descricao} 
                    onChange={(e) => setEditModal({ ...editModal, gasto: { ...editModal.gasto!, descricao: e.target.value } })}
                    className="w-full bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-emerald-500 outline-none transition-all font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editModal.gasto.valor} 
                    onChange={(e) => setEditModal({ ...editModal, gasto: { ...editModal.gasto!, valor: parseFloat(e.target.value) } })}
                    className="w-full bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-emerald-500 outline-none transition-all font-black text-xl tracking-tighter"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Selecione a Categoria</label>
                  <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded">Obrigatório</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {PREDEFINED_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEditModal({ ...editModal, gasto: { ...editModal.gasto!, categoria: cat.id } })}
                      className={`flex items-center justify-center p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200 active:scale-95 ${
                        editModal.gasto?.categoria === cat.id 
                          ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] mt-4 uppercase tracking-[0.2em] italic text-lg"
              >
                Confirmar Alterações
              </button>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: Confirmation */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} />
          <div className="relative bg-[#18181B] border border-zinc-800 w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-8 mx-auto rotate-3 group">
              <Trash2 className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-2xl font-black text-white text-center mb-4 uppercase italic tracking-tighter">
              {confirmModal.type === 'clear' ? 'Limpar Tudo?' : 'Excluir Item?'}
            </h3>
            <p className="text-zinc-500 text-sm text-center mb-10 font-medium leading-relaxed px-2">
              Esta ação é permanente e não poderá ser desfeita. Deseja prosseguir com a remoção dos dados?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleConfirmAction}
                className="w-full py-4 rounded-xl bg-red-500 hover:bg-red-600 text-black font-black text-sm transition-all shadow-lg shadow-red-500/20 uppercase tracking-widest"
              >
                Sim, Deletar
              </button>
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="w-full py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-xs transition-colors uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
