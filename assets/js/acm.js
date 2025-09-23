// ---------------------------------------------
// acm.js - Análisis Comparativo de Mercado
// ---------------------------------------------

/**
 * Recalcula los valores ACM y actualiza el HTML
 */
function actualizarACM() {
  if ($("#acm-container").length === 0) return;

  if (!seleccionados.length) {
    $("#acm-prom-precio").text("0");
    $("#acm-prom-m2c").text("0");
    $("#acm-prom-m2t").text("0");
    $("#acm-rango").text("-");
    return;
  }

  // Clasificación
  const terrenos = seleccionados.filter(s => detectarTipoInmueble(s) === "terreno");
  const casas     = seleccionados.filter(s => detectarTipoInmueble(s) === "casa");
  const deptos    = seleccionados.filter(s => detectarTipoInmueble(s) === "departamento");

  // Promedio precio general
  const avgPrecio = calcularPromedio(seleccionados, "precio");
  $("#acm-prom-precio").text(`USD ${formatNumber(avgPrecio)}`);

  // Precio por m² construcción (casas + departamentos)
  const inmueblesConM2c = casas.concat(deptos).filter(s => s.m2construccion > 0);
  const promM2c = calcularPromedio(inmueblesConM2c, "precioM2");
  $("#acm-prom-m2c").text(promM2c > 0 ? `USD ${formatNumber(promM2c)}` : "-");

  // Precio por m² terreno (terrenos + casas con lote)
  const inmueblesConM2t = terrenos.concat(casas).filter(s => s.m2terreno > 0);
  const promM2t = calcularPromedio(inmueblesConM2t, "precioM2");
  $("#acm-prom-m2t").text(promM2t > 0 ? `USD ${formatNumber(promM2t)}` : "-");

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


const tipoInmuebleDic = {
  departamento: {
    incluye: ["departamento", "dpto", "edificio", "apartamento", "flat"],
    excluye: []
  },
  casa: {
    incluye: ["casa", "chalet", "quinta"],
    excluye: []
  },
  terreno: {
    incluye: ["lote", "terreno", "parcela"],
    excluye: ["dormit", "habitac", "cuarto", "piso"] // si contiene esto, ya no es lote
  }
};

function detectarTipoInmueble(loc) {
  const texto = ((loc.Titulo || "") + " " + (loc.des || "")).toLowerCase();

  for (const [tipo, reglas] of Object.entries(tipoInmuebleDic)) {
    if (reglas.incluye.some(word => texto.includes(word))) {
      if (reglas.excluye.length && reglas.excluye.some(word => texto.includes(word))) {
        continue; // contradicción → no clasificar en este tipo
      }
      return tipo; // encontrado
    }
  }

  return "otro"; // si no encaja en ninguna categoría
}
