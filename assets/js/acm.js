// ---------------------------------------------
// acm.js - Herramientas para análisis comparativo de mercado
// ---------------------------------------------

/**
 * Inicializa el bloque ACM en el toolbox
 */
function initACMTools() {
  if ($("#acm-tools").length === 0) return;

  // Renderizar botones
  $("#acm-tools").html(`
    <button id="btn-acm-precios" style="margin:5px 0; width:100%;">📊 Promedio de precios</button>
    <button id="btn-acm-m2" style="margin:5px 0; width:100%;">📏 Precio por m²</button>
    <button id="btn-acm-rango" style="margin:5px 0; width:100%;">📉 Rango de precios</button>
    <button id="btn-acm-export" style="margin:5px 0; width:100%;">⬇ Exportar comparativo</button>
  `);

  // Eventos
  $("#btn-acm-precios").off("click").on("click", mostrarPromedioPrecios);
  $("#btn-acm-m2").off("click").on("click", mostrarPromedioM2);
  $("#btn-acm-rango").off("click").on("click", mostrarRangoPrecios);
  $("#btn-acm-export").off("click").on("click", exportarACM);
}

/**
 * 📊 Promedio de precios
 */
function mostrarPromedioPrecios() {
  if (!seleccionados.length) return alert("No hay seleccionados.");
  const avg = calcularPromedio(seleccionados, "precio");
  alert(`📊 Promedio de precios: USD ${formatNumber(avg)}`);
}

/**
 * 📏 Precio por m²
 */
function mostrarPromedioM2() {
  if (!seleccionados.length) return alert("No hay seleccionados.");
  const avg = calcularPromedio(seleccionados, "precioM2");
  alert(`📏 Promedio por m²: USD ${formatNumber(avg)}`);
}

/**
 * 📉 Rango de precios (mínimo y máximo)
 */
function mostrarRangoPrecios() {
  if (!seleccionados.length) return alert("No hay seleccionados.");
  const precios = seleccionados.map(s => s.precio || 0).filter(p => p > 0);
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  alert(`📉 Rango de precios: USD ${formatNumber(min)} - USD ${formatNumber(max)}`);
}

/**
 * ⬇ Exportar comparativo (ejemplo: PDF usando tu generador)
 */
function exportarACM() {
  if (!seleccionados.length) return alert("No hay seleccionados.");
  generarBrochurePDF(seleccionados, "landscape");
}
