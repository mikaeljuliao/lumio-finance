export function formatCurrency(value) {
  return (value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function formatDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  if (year && month && day) {
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
  return new Date(dateString).toLocaleDateString("pt-BR");
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
    acc[g.categoria] = (acc[g.categoria] || 0) + Number(g.valor);
    return acc;
  }, {});

  const dataCategoria = Object.entries(porCategoria)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const porData = gastosFiltrados.reduce((acc, g) => {
    const dia = new Date(g.data).toLocaleDateString("pt-BR", {
      day: "2-digit"
    });
    acc[dia] = (acc[dia] || 0) + Number(g.valor);
    return acc;
  }, {});

  const dataTimeline = Object.entries(porData)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => Number(a.name) - Number(b.name));

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
