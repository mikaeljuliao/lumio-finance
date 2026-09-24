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

export function calculateStats(filteredExpenses, previousMonthExpenses) {
  const total = filteredExpenses.reduce((acc, g) => acc + Number(g.valor), 0);
  const previousTotal = previousMonthExpenses.reduce((acc, g) => acc + Number(g.valor), 0);
  const average = filteredExpenses.length > 0 ? total / filteredExpenses.length : 0;
  const diff = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;

  const byCategory = filteredExpenses.reduce((acc, g) => {
    const cat = g.categoria || "outros";
    acc[cat] = (acc[cat] || 0) + Number(g.valor);
    return acc;
  }, {});

  const categoryData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const byDate = filteredExpenses.reduce((acc, g) => {
    const dateOnly = String(g.data).split("T")[0];
    const [year, month, day] = dateOnly.split("-");
    const label = day ? `${day}/${month}` : new Date(g.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    acc[label] = (acc[label] || 0) + Number(g.valor);
    return acc;
  }, {});

  const timelineData = Object.entries(byDate)
    .map(([name, total]) => ({ name, total }));

  return {
    total,
    totalAnterior: previousTotal,
    diff,
    media: average,
    dataCategoria: categoryData,
    dataTimeline: timelineData,
    porCategoria: byCategory,
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
