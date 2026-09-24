export function formatCurrency(value) {
  const numericValue = Number(value) || 0;
  return numericValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function formatDate(dateString) {
  if (!dateString) return "";
  const dateOnly = String(dateString).split("T")[0];
  const [year, month, day] = dateOnly.split("-");
  if (year && month && day) {
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
  return new Date(dateString).toLocaleDateString("pt-BR");
}

export function formatRelativeDate(dateString) {
  if (!dateString) return "";
  const dateOnly = String(dateString).split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split("T")[0];

  if (dateOnly === today) return "Hoje";
  if (dateOnly === yesterday) return "Ontem";

  return formatDate(dateString);
}

export function calculateStats(gastosFiltrados, gastosMesAnterior) {
  const total = gastosFiltrados.reduce((acc, g) => acc + Number(g.valor), 0);
  const totalAnterior = gastosMesAnterior.reduce(
    (acc, g) => acc + Number(g.valor),
    0
  );
  const media = gastosFiltrados.length > 0 ? total / gastosFiltrados.length : 0;
  const diff =
    totalAnterior > 0 ? ((total - totalAnterior) / totalAnterior) * 100 : 0;

  const porCategoria = gastosFiltrados.reduce((acc, g) => {
    const cat = g.categoria || "outros";
    acc[cat] = (acc[cat] || 0) + Number(g.valor);
    return acc;
  }, {});

  const dataCategoria = Object.entries(porCategoria)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const porData = gastosFiltrados.reduce((acc, g) => {
    const dateOnly = String(g.data).split("T")[0];
    const [year, month, day] = dateOnly.split("-");
    const dia = day ? `${day}/${month}` : new Date(g.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    acc[dia] = (acc[dia] || 0) + Number(g.valor);
    return acc;
  }, {});

  const dataTimeline = Object.entries(porData)
    .map(([name, total]) => ({ name, total }));

  return {
    total,
    totalAnterior,
    diff,
    media,
    dataCategoria,
    dataTimeline,
    porCategoria
  };
}

export function groupTransactionsByDate(transactions) {
  const groups = {};
  for (const item of transactions) {
    const key = String(item.data || "").split("T")[0] || "Sem data";
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }

  return Object.entries(groups)
    .map(([date, items]) => ({
      date,
      formattedDate: formatRelativeDate(date),
      items: items.sort((a, b) => new Date(b.created_at || b.data) - new Date(a.created_at || a.data)),
      total: items.reduce((sum, item) => sum + Number(item.valor || 0), 0)
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}
