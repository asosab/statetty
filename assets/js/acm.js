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
    $("#acm-prom-m2c-terreno").text("0");
    $("#acm-prom-m2c-construccion").text("0");
    $("#acm-prom-m2d").text("0");
    $("#acm-rango").text("-");
    return;
  }

  const terrenos = seleccionados.filter(s => detectarTipoInmueble(s) === "terreno" && s.m2terreno > 0);
  const casas    = seleccionados.filter(s => detectarTipoInmueble(s) === "casa" && (s.m2terreno > 0 || s.m2construccion > 0));
  const deptos   = seleccionados.filter(s => detectarTipoInmueble(s) === "departamento" && s.m2construccion > 0);

  // Promedio general de precios
  const avgPrecio = calcularPromedio(seleccionados, "precio");
  $("#acm-prom-precio").text(`USD ${formatNumber(avgPrecio)} [${seleccionados.length}]`);

  // Precio por m² terrenos
  const valoresM2t = terrenos.filter(t => t.precio > 0 && t.m2terreno > 0).map(t => t.precio / t.m2terreno);
  const promM2t = valoresM2t.length ? valoresM2t.reduce((a,b)=>a+b,0) / valoresM2t.length : 0;
  $("#acm-prom-m2t").text(promM2t > 0 ? `USD ${formatNumber(promM2t)} [${valoresM2t.length}]` : "-");

  // Precio por m² departamentos (construcción)
  const valoresM2d = deptos.filter(d => d.precio > 0 && d.m2construccion > 0).map(d => d.precio / d.m2construccion);
  const promM2d = valoresM2d.length ? valoresM2d.reduce((a,b)=>a+b,0) / valoresM2d.length : 0;
  $("#acm-prom-m2d").text(promM2d > 0 ? `USD ${formatNumber(promM2d)} [${valoresM2d.length}]` : "-");

  // Precio por m² casas (separado terreno y construcción)
  const valoresM2CasasTerreno = casas.filter(c => c.precio > 0 && c.m2terreno > 0).map(c => c.precio / c.m2terreno);
  const valoresM2CasasConstruccion = casas.filter(c => c.precio > 0 && c.m2construccion > 0).map(c => c.precio / c.m2construccion);

  const promM2cTerreno = valoresM2CasasTerreno.length ? valoresM2CasasTerreno.reduce((a,b)=>a+b,0) / valoresM2CasasTerreno.length : 0;
  const promM2cConstruccion = valoresM2CasasConstruccion.length ? valoresM2CasasConstruccion.reduce((a,b)=>a+b,0) / valoresM2CasasConstruccion.length : 0;

  $("#acm-prom-m2c-terreno").text(promM2cTerreno > 0 ? `USD ${formatNumber(promM2cTerreno)} [${valoresM2CasasTerreno.length}]` : "-");
  $("#acm-prom-m2c-construccion").text(promM2cConstruccion > 0 ? `USD ${formatNumber(promM2cConstruccion)} [${valoresM2CasasConstruccion.length}]` : "-");

  // Rango de precios general
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
  const valores = lista
    .filter(x => (x[campo] || 0) > 0 && (x.precio || 0) > 0)
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
