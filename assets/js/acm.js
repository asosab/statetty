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

  const terrenos = seleccionados.filter(s => detectarTipoInmueble(s) === "terreno" && s.m2terreno > 0);
  const casas    = seleccionados.filter(s => detectarTipoInmueble(s) === "casa" && s.m2terreno > 0 && s.m2construccion > 0);
  const deptos   = seleccionados.filter(s => detectarTipoInmueble(s) === "departamento" && s.m2construccion > 0);

  // Promedio general
  const avgPrecio = calcularPromedio(seleccionados, "precio");
  $("#acm-prom-precio").text(`USD ${formatNumber(avgPrecio)}`);

  // Precio por m² terrenos (solo terrenos)
  const promM2t = promedioPrecioM2(terrenos, "m2terreno");
  $("#acm-prom-m2t").text(promM2t > 0 ? `USD ${formatNumber(promM2t)}` : "-");

  // Precio por m² construcción (solo departamentos)
  const promM2d = promedioPrecioM2(deptos, "m2construccion");
  $("#acm-prom-m2d").text(promM2d > 0 ? `USD ${formatNumber(promM2d)}` : "-");

  // Precio por m² casas (ponderando terreno y construcción)
  const valoresM2Casas = [];
  casas.forEach(c => {
    const total = c.precio || 0;
    const mt = c.m2terreno || 0;
    const mc = c.m2construccion || 0;
    const suma = mt + mc;
    if (total > 0 && suma > 0) {
      // separar valor terreno y construcción
      const valorTerreno = (total * mt) / suma;
      const valorConstruccion = (total * mc) / suma;
      valoresM2Casas.push(valorTerreno / mt);
      valoresM2Casas.push(valorConstruccion / mc);
    }
  });
  const promM2c = valoresM2Casas.length ? (valoresM2Casas.reduce((a,b)=>a+b,0)/valoresM2Casas.length) : 0;
  $("#acm-prom-m2c").text(promM2c > 0 ? `USD ${formatNumber(promM2c)}` : "-");

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

/**
 * Calcula el promedio de precio por m² dado un campo (m2terreno o m2construccion).
 */
function promedioPrecioM2(lista, campo) {
  const valores = lista.filter(x => (x[campo] || 0) > 0 && (x.precio || 0) > 0)
                       .map(x => x.precio / x[campo]);
  return valores.length ? valores.reduce((a,b)=>a+b,0) / valores.length : 0;
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
