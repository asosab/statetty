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
    $("#acm-prom-m2t").html(`<input type="number" step="0.01" value="" style="max-width:12ch;">`);
    $("#acm-prom-m2c-construccion").html(`<input type="number" step="0.01" value="" style="max-width:12ch;">`);
    $("#acm-prom-m2d").html(`<input type="number" step="0.01" value="" style="max-width:12ch;">`);
    $("#acm-rango").text("-");
    return;
  }

  const terrenos = seleccionados.filter(s => detectarTipoInmueble(s) === "terreno" && s.m2terreno > 0);
  const casas    = seleccionados.filter(s => detectarTipoInmueble(s) === "casa" && (s.m2terreno > 0 || s.m2construccion > 0));
  const deptos   = seleccionados.filter(s => detectarTipoInmueble(s) === "departamento" && s.m2construccion > 0);

  // Promedio general de precios (se mantiene promedio simple por ahora)
  const avgPrecio = calcularPromedio(seleccionados, "precio");
  $("#acm-prom-precio").text(`Promedio de precios: USD ${formatNumber(avgPrecio)} [${seleccionados.length}]`);

  // Precio por m² terrenos
  const valoresM2t = terrenos
    .filter(t => t.precio > 0 && t.m2terreno > 20 && t.m2terreno < 20000)
    .map(t => t.precio / t.m2terreno);

  const promM2t = mediaPonderada(valoresM2t, 15);
  if (promM2t <= 0 && window.M2T) {
    const m2tManual = parseInt(window.M2T);
    if (!isNaN(m2tManual) && m2tManual > 0) {promM2t = m2tManual;}
  }


  $("#acm-prom-m2t").html(
    `<input type="number" step="0.01" value="${promM2t > 0 ? promM2t.toFixed(2) : ""}" style="max-width:12ch;">` +
    ` Precio promedio por m² terrenos ` +
    (valoresM2t.length ? `[${valoresM2t.length}]` : "[-]")
  );
  $("#acm-prom-m2t input").on("input", calcularEstimado);

  // Precio por m² departamentos (construcción)
  const valoresM2d = deptos
    .filter(d => d.precio > 0 && d.m2construccion > 20 && d.m2construccion < 2000)
    .map(d => d.precio / d.m2construccion);

  const promM2d = mediaPonderada(valoresM2d, 15);
  $("#acm-prom-m2d").html(
    `<input type="number" step="0.01" value="${promM2d > 0 ? promM2d.toFixed(2) : ""}" style="max-width:12ch;">` +
    ` Precio promedio por m² departamentos ` +
    (valoresM2d.length ? `[${valoresM2d.length}]` : "[-]")
  );
  $("#acm-prom-m2d input").on("input", calcularEstimado);

  // Precio por m² casas (construcción ajustado con valor de terreno)
  let valoresM2cConstruccion = [];
  if (promM2t > 0) {
    valoresM2cConstruccion = casas
      .filter(c => c.precio > 0 && c.m2construccion > 20 && c.m2construccion < 2000)
      .map(c => {
        const valorTerreno = c.m2terreno * promM2t;
        const valorConstruccion = c.precio - valorTerreno;
        if (valorConstruccion > 0) {
          return valorConstruccion / c.m2construccion;
        }
        return null;
      })
      .filter(v => v !== null);
  }

  const promM2cConstruccion = mediaPonderada(valoresM2cConstruccion, 15);
  $("#acm-prom-m2c-construccion").html(
    `<input type="number" step="0.01" value="${promM2cConstruccion > 0 ? promM2cConstruccion.toFixed(2) : ""}" style="max-width:12ch;">` +
    ` Precio promedio por m² casas (construcción) ` +
    (valoresM2cConstruccion.length ? `[${valoresM2cConstruccion.length}]` : "[-]")
  );
  $("#acm-prom-m2c-construccion input").on("input", calcularEstimado);

  // Rango de precios general
  const precios = seleccionados.map(s => s.precio || 0).filter(p => p > 0);
  if (precios.length > 0) {
    const min = Math.min(...precios);
    const max = Math.max(...precios);
    $("#acm-rango").text(`Rango de precios: USD ${formatNumber(min)} - USD ${formatNumber(max)}`);
  } else {
    $("#acm-rango").text("Rango de precios: -");
  }
  calcularEstimado();
}


function guardarEstadoACM() {
  const estado = {
    tipo: $("#acm-tipo").val(),
    m2Terreno: $("#acm-m2-terreno").val(),
    m2Construccion: $("#acm-m2-construccion").val(),
    promM2t: $("#acm-prom-m2t input").val(),
    promM2d: $("#acm-prom-m2d input").val(),
    promM2c: $("#acm-prom-m2c-construccion input").val()
  };
  localStorage.setItem("estadoACM", JSON.stringify(estado));
}

function restaurarEstadoACM() {
  const data = localStorage.getItem("estadoACM");
  if (!data) return;
  const estado = JSON.parse(data);

  if (estado.tipo) {
    $("#acm-tipo").val(estado.tipo);
    renderACMInputs(estado.tipo);
  }

  if (estado.m2Terreno) $("#acm-m2-terreno").val(estado.m2Terreno);
  if (estado.m2Construccion) $("#acm-m2-construccion").val(estado.m2Construccion);

  if (estado.promM2t) $("#acm-prom-m2t input").val(estado.promM2t);
  if (estado.promM2d) $("#acm-prom-m2d input").val(estado.promM2d);
  if (estado.promM2c) $("#acm-prom-m2c-construccion input").val(estado.promM2c);

  calcularEstimado();
}

function mediaPonderada(valores, porcentaje = 10) {
  if (!valores || valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const n = ordenados.length;
  const recorte = Math.floor(n * (porcentaje / 100));
  if (n < 7 || recorte === 0) {return ordenados.reduce((s, v) => s + v, 0) / n;}
  const recortados = ordenados.slice(recorte, n - recorte);
  return recortados.reduce((s, v) => s + v, 0) / recortados.length;
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
    incluye: ["departamento", "dpto", "edificio", "apartamento", "flat", "mono" ],
    excluye: []
  },
  casa: {
    incluye: ["casa", "chalet", "quinta"],
    excluye: ["departamento", "dpto", "edificio", "apartamento", "flat", "mono"]
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


// ---------------------------------------------
// Formulario dinámico de cálculo ACM reducido
// ---------------------------------------------
function initACMTools() {
  if ($("#acm-form").length > 0) return; // evitar duplicar

  $("#acm-container").append(`
    <div id="acm-form" style="margin-top:8px; padding:4px; border-top:1px solid #ddd; font-size:13px;">
      <label>Tipo:</label><br>
      <select id="acm-tipo" style="max-width:12ch; margin-bottom:4px; font-size:13px;">
        <option value="">--</option>
        <option value="terreno">Terreno</option>
        <option value="departamento">Depto</option>
        <option value="casa">Casa</option>
      </select>
      <div id="acm-inputs"></div>
      <div id="acm-result" style="margin-top:4px; font-weight:bold;"></div>
    </div>
  `);

  // Escucha cambios
  restaurarEstadoACM();
  $("#acm-tipo").on("change", function() {renderACMInputs($(this).val());});
  $(document).on("input change", "#acm-form input, #acm-form select", function () {guardarEstadoACM();});
  return true;
}

function renderACMInputs(tipo) {
  const $inputs = $("#acm-inputs");

  // ⚡ Crear inputs una sola vez si no existen
  if ($inputs.children().length === 0) {
    const baseStyle = "max-width:12ch; font-size:13px; margin-bottom:3px;";
    $inputs.append(`
      <div id="grupo-terreno" style="display:none; margin-bottom:4px;">
        <label>m² Terreno:</label>
        <input type="number" id="acm-m2-terreno" min="1" maxlength="12" style="${baseStyle}">
      </div>
      <div id="grupo-construccion" style="display:none; margin-bottom:4px;">
        <label>m² Const.:</label>
        <input type="number" id="acm-m2-construccion" min="1" maxlength="12" style="${baseStyle}">
      </div>
    `);

    // ⚡ Atar eventos una sola vez
    $("#acm-m2-terreno, #acm-m2-construccion").on("input", calcularEstimado);
  }

  // Ocultar todo primero
  $("#grupo-terreno, #grupo-construccion").hide();

  // Mostrar solo lo que corresponde
  if (tipo === "terreno") {
    $("#grupo-terreno").show();
  }

  if (tipo === "departamento") {
    $("#grupo-construccion").show();
  }

  if (tipo === "casa") {
    $("#grupo-terreno, #grupo-construccion").show();
  }

  calcularEstimado(); // recalcular siempre al cambiar
}


function calcularEstimado() {
  const tipo = $("#acm-tipo").val();
  let total = 0;

  if (tipo === "terreno") {
    const m2 = parseFloat($("#acm-m2-terreno").val()) || 0;
    const promM2 = extraerValorPromedio("#acm-prom-m2t");
    total = m2 * promM2;
  }

  if (tipo === "departamento") {
    const m2 = parseFloat($("#acm-m2-construccion").val()) || 0;
    const promM2 = extraerValorPromedio("#acm-prom-m2d");
    total = m2 * promM2;
  }

  if (tipo === "casa") {
    const m2Terreno = parseFloat($("#acm-m2-terreno").val()) || 0;
    const m2Construccion = parseFloat($("#acm-m2-construccion").val()) || 0;

    const promTerreno = extraerValorPromedio("#acm-prom-m2t");
    const promConstruccion = extraerValorPromedio("#acm-prom-m2c-construccion");

    // Valor del terreno
    const valorTerreno = m2Terreno * promTerreno;

    // Valor de la construcción (solo si tiene sentido)
    let valorConstruccion = 0;
    if (promTerreno > 0 && promConstruccion > 0 && m2Construccion > 0) {
      valorConstruccion = m2Construccion * promConstruccion;
    }

    total = valorTerreno + valorConstruccion;
  }

  if (total > 0) {
    $("#acm-result").text(`Estimado: USD ${formatNumber(total)}`);
    const tipo = $("#acm-tipo").val();
    const m2Terreno = parseFloat($("#acm-m2-terreno").val()) || 0;
    const m2Construccion = parseFloat($("#acm-m2-construccion").val()) || 0;
    const meses = calcularTiempoOfertado(tipo, m2Terreno, m2Construccion, total);
    if (meses !== null) {$("#acm-result").append(` | Tiempo ofertado aprox: ${meses} meses`);}
  } else {$("#acm-result").text("");}


  //$("#acm-result").text(total > 0 ? `Estimado: USD ${formatNumber(total)}` : "");
}

function calcularTiempoOfertado(tipo, m2Terreno, m2Construccion, precioEstimado) {
  if (!Array.isArray(locations) || locations.length === 0) return null;

  // Filtrar por tipo de inmueble
  let comparables = locations.filter(loc => {
    return (loc.tipoInmueble || "").toLowerCase().includes(tipo);
  });

  if (comparables.length === 0) return null;

  // Calcular "distancia" respecto al inmueble en análisis
  comparables.forEach(loc => {
    let dTerreno = (m2Terreno && loc.m2terreno) ? Math.abs(loc.m2terreno - m2Terreno) / m2Terreno : 0;
    let dConstruccion = (m2Construccion && loc.m2construccion) ? Math.abs(loc.m2construccion - m2Construccion) / m2Construccion : 0;
    let dPrecio = (precioEstimado && loc.precio) ? Math.abs(loc.precio - precioEstimado) / precioEstimado : 0;
    loc._distancia = dTerreno + dConstruccion + dPrecio; // suma simple como métrica
  });

  // Ordenar por similitud (menor distancia primero)
  comparables.sort((a, b) => a._distancia - b._distancia);

  // Tomar los N más parecidos (ejemplo: 5 más cercanos)
  const N = 5;
  const top = comparables.slice(0, N);

  // Promediar tiempo ofertado
  const tiempos = top.map(x => parseInt(x.tiempoOfertado) || 0).filter(v => v > 0);
  if (!tiempos.length) return null;

  return Math.round(tiempos.reduce((s, v) => s + v, 0) / tiempos.length);
}


// Extrae el valor numérico de los <input> dentro de los spans de ACM
function extraerValorPromedio(selector) {
  const $input = $(selector).find("input");
  if ($input.length) {
    const val = parseFloat($input.val());
    return isNaN(val) ? 0 : val;
  }
  return 0;
}
