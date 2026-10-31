export function formatCurrency(value) {
  const numericValue = Number(value) || 0;
  return numericValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function parseCurrencyInput(value) {
  let normalized = String(value ?? "").trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!normalized) return null;

  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function extractDateOnly(dateString) {
  if (!dateString) return "";
  return String(dateString).split("T")[0];
}

export function getLocalDateInputValue(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(dateString) {
  if (!dateString) return "";
  const dateOnly = extractDateOnly(dateString);
  const [year, month, day] = dateOnly.split("-");
  if (year && month && day) {
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
  return new Date(dateString).toLocaleDateString("pt-BR");
}

export function formatRelativeDate(dateString) {
  if (!dateString) return "";
  const dateOnly = extractDateOnly(dateString);
  const today = getLocalDateInputValue();

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateInputValue(yesterdayDate);

  if (dateOnly === today) return "Hoje";
  if (dateOnly === yesterday) return "Ontem";

  return formatDate(dateString);
}

export function calculateStats(filteredExpenses, previousMonthExpenses) {
  const total = filteredExpenses.reduce((acc, g) => acc + Number(g.valor), 0);
  const previousTotal = previousMonthExpenses.reduce((acc, g) => acc + Number(g.valor), 0);
  const spendingDays = new Set(
    filteredExpenses
      .map((expense) => extractDateOnly(expense.data))
      .filter(Boolean)
  );
  const average = spendingDays.size > 0 ? total / spendingDays.size : 0;
  const diff = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;

  const byCategory = filteredExpenses.reduce((acc, g) => {
    const cat = g.categoria || "outros";
    acc[cat] = (acc[cat] || 0) + Number(g.valor);
    return acc;
  }, {});

  const categoryData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const byDate = filteredExpenses.reduce((acc, g) => {
    const dateOnly = extractDateOnly(g.data);
    if (!dateOnly) return acc;
    const [, month, day] = dateOnly.split("-");
    const label = day ? `${day}/${month}` : new Date(g.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    acc[dateOnly] = {
      name: label,
      total: (acc[dateOnly]?.total || 0) + Number(g.valor)
    };
    return acc;
  }, {});

  const timelineData = Object.entries(byDate)
    .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
    .map(([, dailyTotal]) => dailyTotal);

  return {
    total,
    previousTotal,
    diff,
    average,
    spendingDaysCount: spendingDays.size,
    categoryData,
    timelineData,
    byCategory,
    // Aliases para compatibilidade retroativa
    totalAnterior: previousTotal,
    media: average,
    diasComGastos: spendingDays.size,
    dataCategoria: categoryData,
    dataTimeline: timelineData,
    porCategoria: byCategory,
  };
}

export function groupTransactionsByDate(transactions) {
  const groups = {};
  for (const item of transactions) {
    const key = extractDateOnly(item.data) || "Sem data";
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
