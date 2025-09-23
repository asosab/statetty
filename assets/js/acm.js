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
    $("#acm-prom-m2t").text("0");
    $("#acm-prom-m2c").text("0");
    $("#acm-prom-m2d").text("0");
    $("#acm-rango").text("-");
    return;
  }

  // Clasificación
  const terrenos = seleccionados.filter(s => detectarTipoInmueble(s) === "terreno" && s.m2terreno > 0);
  const casas = seleccionados.filter(s => detectarTipoInmueble(s) === "casa" && s.m2construccion > 0);
  const deptos = seleccionados.filter(s => detectarTipoInmueble(s) === "departamento" && s.m2construccion > 0);

  // Promedio general de precios
  const avgPrecio = calcularPromedio(seleccionados, "precio");
  $("#acm-prom-precio").text(`USD ${formatNumber(avgPrecio)}`);

  // Precio por m² terrenos
  const promM2t = calcularPromedio(terrenos, "precioM2");
  $("#acm-prom-m2t").text(promM2t > 0 ? `USD ${formatNumber(promM2t)}` : "-");

  // Precio por m² casas
  const promM2c = calcularPromedio(casas, "precioM2");
  $("#acm-prom-m2c").text(promM2c > 0 ? `USD ${formatNumber(promM2c)}` : "-");

  // Precio por m² departamentos
  const promM2d = calcularPromedio(deptos, "precioM2");
  $("#acm-prom-m2d").text(promM2d > 0 ? `USD ${formatNumber(promM2d)}` : "-");

  // Rango general
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
    excluye: ["departamento", "dpto", "edificio", "apartamento", "flat"]
  },
  terreno: {
    incluye: ["lote", "terreno", "parcela"],
    excluye: ["dormit", "habitac", "cuarto", "piso", "Living", "Churrasquera", "lavanderia"  ] // si contiene esto, ya no es lote
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
