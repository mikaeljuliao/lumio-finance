export const CHART_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#6366f1"
];

export const CATEGORIES = [
  { id: "alimentação", label: "🍔 Alimentação", icon: "🍔" },
  { id: "transporte", label: "🚗 Transporte", icon: "🚗" },
  { id: "lazer", label: "🎮 Lazer", icon: "🎮" },
  { id: "saúde", label: "🏥 Saúde", icon: "🏥" },
  { id: "moradia", label: "🏠 Moradia", icon: "🏠" },
  { id: "mercado", label: "🛒 Mercado", icon: "🛒" },
  { id: "educação", label: "🎓 Educação", icon: "🎓" },
  { id: "serviços", label: "💡 Serviços", icon: "💡" },
  { id: "compras", label: "🛍️ Compras", icon: "🛍️" },
  { id: "presentes", label: "🎁 Presentes", icon: "🎁" },
  { id: "viagem", label: "✈️ Viagem", icon: "✈️" },
  { id: "investimentos", label: "📈 Investimentos", icon: "📈" },
  { id: "outros", label: "💰 Outros", icon: "💰" }
];

export const CATEGORY_ICON_MAP = CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = cat.icon;
  return acc;
}, {});

export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

export const LUMIO_WHATSAPP = {
  raw: "5585987237662",
  formatted: "+55 (85) 9887237662",
  link: "https://wa.me/5585987237662"
};
