// ---------------------------------------------
// acm.js - Análisis Comparativo de Mercado
// ---------------------------------------------

/**
 * Recalcula los valores ACM y actualiza el HTML
 */
function actualizarACM() {
  if ($("#acm-container").length === 0) return; // si no existe, no hacer nada

  if (!seleccionados.length) {
    $("#acm-prom-precio").text("0");
    $("#acm-prom-m2").text("0");
    $("#acm-rango").text("-");
    return;
  }

  // Promedio de precios
  const avgPrecio = calcularPromedio(seleccionados, "precio");
  $("#acm-prom-precio").text(`USD ${formatNumber(avgPrecio)}`);

  // Promedio por m²
  const avgM2 = calcularPromedio(seleccionados, "precioM2");
  $("#acm-prom-m2").text(`USD ${formatNumber(avgM2)}`);

  // Rango de precios
  const precios = seleccionados.map(s => s.precio || 0).filter(p => p > 0);
  if (precios.length > 0) {
    const min = Math.min(...precios);
    const max = Math.max(...precios);
    $("#acm-rango").text(`USD ${formatNumber(min)} - USD ${formatNumber(max)}`);
  } else {
    $("#acm-rango").text("-");
  }
}
