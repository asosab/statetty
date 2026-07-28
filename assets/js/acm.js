// ---------------------------------------------
// acm.js - Análisis Comparativo de Mercado
// ---------------------------------------------


/** ------------------------------------------------------------------------------------------- initACMMapClickMarker
 * Marker ACM con mismo estilo de pines
 */
  function initACMMapClickMarker(map){ try {
    if(!map)return;
    window.__acmMarker=window.__acmMarker||null;
    window.__acmCoords=window.__acmCoords||null;

    const icon=L.divIcon({
      className:"custom-pin",
      html:`<div style="position:relative;">
              <img src="../../assets/images/pointers/pointer_acm.png" style="width:40px;height:60px;display:block;">
              <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
                          width:12px;height:6px;background:rgba(0,0,0,0.25);
                          border-radius:50%;filter:blur(2px);"></div>
            </div>`,
      iconSize:[40,60],
      iconAnchor:[20,60]
    });

    map.on("click",function(e){
      const lat=e.latlng.lat,lng=e.latlng.lng;
      window.__acmCoords={lat:lat,lng:lng};

      if(window.__acmMarker){map.removeLayer(window.__acmMarker);}
      window.__acmMarker=L.marker([lat,lng],{icon:icon,interactive:false}).addTo(map);

      if(window.STT_FND_INM && typeof window.STT_FND_INM.refreshACMPointer==='function'){
        window.STT_FND_INM.refreshACMPointer();
      }
    });

  } catch (e) {console.log('initACMMapClickMarker error',e);} }



/** ----------------------------------------------------------------------------------------- ensureSyncPDFACMVisibility
 * Garantiza disponibilidad de syncPDFACMVisibility cargando script si es necesario
 */
  function ensureSyncPDFACMVisibility(){ try {
    if(typeof syncPDFACMVisibility==="function"){syncPDFACMVisibility();return;}
    let s=document.querySelector('script[src*="inmueblesPdf.js"]');
    if(!s){
      s=document.createElement("script");
      s.src="inmueblesPdf.js";
      s.onload=function(){if(typeof syncPDFACMVisibility==="function"){syncPDFACMVisibility();}};
      s.onerror=function(){console.log("Error cargando inmueblesPdf.js");};
      document.head.appendChild(s);
    }
  } catch (e) {console.log('ensureSyncPDFACMVisibility error',e);} }

/** ------------------------------------------------------------------------------------------------------ actualizarACM
 * Recalcula los valores ACM y actualiza el HTML
 */
  function actualizarACM() {
    try {

      if ($("#acm-container").length===0) return;

      const terrenos=seleccionados.filter(s=>detectarTipoInmueble(s)==="terreno"&&s.m2terreno>0);
      const casas=seleccionados.filter(s=>detectarTipoInmueble(s)==="casa"&&(s.m2terreno>0||s.m2construccion>0));

      // Pool de "construcción sin terreno": departamentos, oficinas,
      // comercial/tiendas, y cualquier "otro" que estructuralmente no tenga
      // terreno propio (para no perder comparables por vocabulario que el
      // diccionario todavía no cubre, ej. "consultorio", "showroom" mal escrito).
      const construidos=seleccionados.filter(s=>{
        if(!(s.m2construccion>0))return false;
        const t=detectarTipoInmueble(s);
        if(t==="departamento"||t==="oficina"||t==="comercial")return true;
        if(t==="otro"&&!(s.m2terreno>0))return true;
        return false;
      });
      const subtiposConstruccion={
        departamento: construidos.filter(s=>detectarTipoInmueble(s)==="departamento"),
        oficina:      construidos.filter(s=>detectarTipoInmueble(s)==="oficina"),
        comercial:    construidos.filter(s=>detectarTipoInmueble(s)==="comercial")
      };

      const avgPrecio=seleccionados.length?calcularPromedio(seleccionados,"precio"):0;
      $("#acm-prom-precio").text(`Promedio de precios: USD ${formatNumber(avgPrecio)} [${seleccionados.length}]`);

      // --- USD/m² de terrenos, ajustado por tamaño (economías de escala) ---
      const modeloTerreno = regresionPotencialTerrenos(terrenos);
      const m2tActual = parseFloat($("#acm-m2t").val()) || 0;
      let promM2t = 0;
      let terrenoAjustadoPorTamano = false;

      if (modeloTerreno && m2tActual > 0) {
        promM2t = usdM2TerrenoSegunTamano(modeloTerreno, m2tActual);
        terrenoAjustadoPorTamano = true;
      } else {
        // Respaldo: sin modelo confiable (menos de 4 terrenos comparables) o
        // todavía no se ingresó el tamaño del terreno a estimar -> promedio
        // plano de USD/m², igual que antes.
        const valoresM2t=terrenos.filter(t=>t.precio>0&&t.m2terreno>20&&t.m2terreno<20000).map(t=>t.precio/t.m2terreno);
        promM2t=mediaPonderada(valoresM2t,15);
      }
      if(promM2t<=0&&window.M2T){const m2tManual=parseInt(window.M2T);if(!isNaN(m2tManual)&&m2tManual>0)promM2t=m2tManual;}
      if(terrenos.length===0&&window.ACM_INFO&&window.ACM_INFO.promM2T){const m2tInfo=parseFloat(window.ACM_INFO.promM2T);if(!isNaN(m2tInfo)&&m2tInfo>0)promM2t=m2tInfo;}

      const resultadoCasas = calcularValorConstruccionCasas(casas, modeloTerreno, promM2t);
      const promM2c = mediaPonderada(resultadoCasas.valores, 15);
      const casaNeta = resultadoCasas.metodo === "neto";

      const subtipoElegido = $("#acm-subtipo-construido").val() || "todos";
      const m2cActualDepto = parseFloat($("#acm-m2c").val()) || 0;
      const resultadoConstruido = calcularUsdM2Construccion(construidos, subtiposConstruccion, subtipoElegido, m2cActualDepto);
      const promM2d = resultadoConstruido.valor;

      const ajT=parseFloat($("#acm-ajuste-t").val())||15;
      const ajC=parseFloat($("#acm-ajuste-c").val())||7;
      const ajD=parseFloat($("#acm-ajuste-d").val())||5;

      const valT=promM2t;
      const valC=promM2c;
      const valD=promM2d;

      let tipTerreno;
      if (terrenoAjustadoPorTamano) {
        tipTerreno = `Ajustado por tamaño: para un terreno de ${formatNumber(m2tActual)} m², usando una regresión sobre ${modeloTerreno.n} terrenos comparables (exponente ${modeloTerreno.b.toFixed(2)}; ${modeloTerreno.b < 1 ? "a menor tamaño, mayor USD/m²" : "el USD/m² sube con el tamaño en esta muestra"}).`
          + ((m2tActual < modeloTerreno.m2min * 0.5 || m2tActual > modeloTerreno.m2max * 2)
            ? ` Atención: ${formatNumber(m2tActual)} m² está bastante fuera del rango de los comparables (${formatNumber(modeloTerreno.m2min)}-${formatNumber(modeloTerreno.m2max)} m²), el valor es una extrapolación.`
            : ``);
      } else if (modeloTerreno) {
        tipTerreno = `Promedio simple (todavía sin ajustar por tamaño): ingresá los m² de terreno (arriba) para ver el USD/m² ajustado según ese tamaño.`;
      } else {
        tipTerreno = `Promedio simple de USD/m² de los terrenos seleccionados. Se necesitan al menos 4 terrenos comparables con datos válidos para ajustar por tamaño (hay ${terrenos.length}).`;
      }

      let tipCasa;
      if (casaNeta) {
        tipCasa = `Valor de construcción aislado: a cada casa comparable se le restó su valor de terreno estimado (${formatNumber(promM2t)} USD/m² × m² de terreno de esa casa) y solo el resto se dividió por m² construidos. Así el USD/m² de construcción no queda mezclado con el de terreno, que ya se suma aparte al calcular el estimado.`
          + (resultadoCasas.descartadas>0 ? ` Se descartaron ${resultadoCasas.descartadas} casa(s) donde el terreno estimado superaba el precio total (dato inconsistente o fuera del rango de los comparables).` : ``)
          + (resultadoCasas.sinTerreno>0 ? ` ${resultadoCasas.sinTerreno} casa(s) sin m² de terreno cargado no se usaron en este promedio.` : ``);
      } else {
        tipCasa = `Sin terrenos seleccionados ni valor de referencia: no se pudo aislar el terreno, así que este valor es precio total / m² construidos (incluye terreno mezclado). Seleccioná algún terreno de la zona para que el cálculo sea más preciso.`;
      }

      $("#acm-prom-m2t").html(
        `<input type="number" step="0.01" value="${valT>0?valT.toFixed(2):""}" data-tippy-content="${tipTerreno}" style="max-width:12ch;"> `+
        (terrenoAjustadoPorTamano ? `<span data-tippy-content="${tipTerreno}">📐</span> ` : ``) +
        `<input id="acm-ajuste-t" type="number" value="${ajT}" style="max-width:5ch;" data-tippy-content="% de descuento aplicado a terrenos cuando se activa 'V. Rápida'.">`
      );

      $("#acm-prom-m2c-construccion").html(
        `<input type="number" step="0.01" value="${valC>0?valC.toFixed(2):""}" data-tippy-content="${tipCasa}" style="max-width:12ch;"> `+
        `<span data-tippy-content="${tipCasa}">${casaNeta ? "🧮" : "⚠️"}</span> `+
        `<input id="acm-ajuste-c" type="number" value="${ajC}" style="max-width:5ch;" data-tippy-content="% de descuento aplicado a casas cuando se activa 'V. Rápida'.">`
      );

      const subtipoLabel = { todos:"departamentos, oficinas y locales/tiendas", departamento:"departamentos", oficina:"oficinas", comercial:"locales/tiendas" };

      let tipDepto;
      if (resultadoConstruido.ajustadoPorTamano) {
        tipDepto = `Ajustado por tamaño: para ${formatNumber(m2cActualDepto)} m² construidos, usando una regresión sobre ${resultadoConstruido.modelo.n} comparables de ${subtipoLabel[resultadoConstruido.subtipoUsado]} (exponente ${resultadoConstruido.modelo.b.toFixed(2)}).`
          + (resultadoConstruido.mezclado && subtipoElegido!=="todos" ? ` No había suficientes comparables de "${subtipoLabel[subtipoElegido]}" seleccionados, así que se usó el pool combinado.` : ``);
      } else if (resultadoConstruido.mezclado && subtipoElegido!=="todos") {
        tipDepto = `No hay comparables de "${subtipoLabel[subtipoElegido]}" seleccionados suficientes (hace falta al menos 1, y ≥4 para ajustar por tamaño). Se usó el promedio combinado de ${subtipoLabel.todos} (${construidos.length} inmuebles). Elegí "Todos" si preferís ver siempre el combinado.`;
      } else if (subtipoElegido==="todos") {
        tipDepto = `Promedio combinado de ${subtipoLabel.todos} seleccionados (${construidos.length}). Elegí un subtipo específico arriba (Depto/Oficina/Comercial) si querés un valor propio de ese tipo de inmueble.`;
      } else {
        tipDepto = `Promedio simple de ${subtipoLabel[subtipoElegido]} seleccionados (${resultadoConstruido.n}). Se necesitan al menos 4 comparables de ese subtipo para ajustar por tamaño.`;
      }

      const iconoDepto = resultadoConstruido.ajustadoPorTamano ? "📐"
        : (resultadoConstruido.mezclado && subtipoElegido!=="todos" ? "⚠️" : "");

      $("#acm-prom-m2d").html(
        `<input type="number" step="0.01" value="${valD>0?valD.toFixed(2):""}" data-tippy-content="${tipDepto}" style="max-width:12ch;"> `+
        (iconoDepto ? `<span data-tippy-content="${tipDepto}">${iconoDepto}</span> ` : ``) +
        `<input id="acm-ajuste-d" type="number" value="${ajD}" style="max-width:5ch;" data-tippy-content="% de descuento aplicado a departamentos/oficinas/locales cuando se activa 'V. Rápida'.">`
      );

      $("#acm-count-t").text(terrenos.length?`[${terrenos.length}]`:"[-]");

      const descartesCasa = resultadoCasas.descartadas + resultadoCasas.sinTerreno;
      $("#acm-count-c").text(casas.length?`[${resultadoCasas.valores.length}${descartesCasa>0?"/"+casas.length:""}]`:"[-]")
        .attr("data-tippy-content", descartesCasa>0
          ? `${resultadoCasas.valores.length} de ${casas.length} casas seleccionadas se usaron para el USD/m² de construcción (${descartesCasa} descartada(s), ver detalle en "¿Cómo se calcula?").`
          : `Cantidad de casas seleccionadas usadas para este promedio.`);

      $("#acm-count-d").text(construidos.length?`[${resultadoConstruido.n}]`:"[-]")
        .attr("data-tippy-content", (resultadoConstruido.mezclado && subtipoElegido!=="todos")
          ? `Se muestra el pool combinado (${construidos.length}) porque no había suficientes comparables de "${subtipoLabel[subtipoElegido]}".`
          : `Cantidad de departamentos/oficinas/locales seleccionados usados para este promedio.`);

      // Estos inputs/atributos se recrean cada vez que se recalcula el ACM
      // (por eso no pueden inicializarse una sola vez como el resto del
      // panel); se hace al final para que tome el data-tippy-content ya
      // actualizado de #acm-count-c y #acm-count-d.
      if (typeof initPopupTooltips === "function") { initPopupTooltips(document.getElementById("acm-container")); }

      // Metadata para el modal explicativo (se abre bajo demanda desde el botón "¿Cómo se calcula?")
      window.__acmMeta = {
        terrenos: { n: terrenos.length, ajustadoPorTamano: terrenoAjustadoPorTamano, modelo: modeloTerreno, promM2t: promM2t, m2tActual: m2tActual },
        casas: { total: casas.length, usadas: resultadoCasas.valores.length, descartadas: resultadoCasas.descartadas, sinTerreno: resultadoCasas.sinTerreno, metodo: resultadoCasas.metodo, promM2c: promM2c },
        construccion: { total: construidos.length, porSubtipo: { departamento: subtiposConstruccion.departamento.length, oficina: subtiposConstruccion.oficina.length, comercial: subtiposConstruccion.comercial.length }, subtipoElegido: subtipoElegido, resultado: resultadoConstruido },
        totalSeleccionados: seleccionados.length
      };

      const precios=seleccionados.map(s=>s.precio||0).filter(p=>p>0);
      if(precios.length>0){
        const min=Math.min(...precios),max=Math.max(...precios);
        $("#acm-rango").text(`Rango de precios: USD ${formatNumber(min)} - USD ${formatNumber(max)}`);
      } else {$("#acm-rango").text("Rango de precios: -");}

      calcularEstimado();

    } catch (e) {console.log("Error actualizarACM:", e);}
  }

function guardarEstadoACM() {
  const estado = {
    tipo: $("#acm-tipo").val(),
    m2Terreno: $("#acm-m2t").val(),
    m2Construccion: $("#acm-m2c").val(),
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

  if (estado.m2Terreno) $("#acm-m2t").val(estado.m2Terreno);
  if (estado.m2Construccion) $("#acm-m2c").val(estado.m2Construccion);

  if (estado.promM2t) $("#acm-prom-m2t input").val(estado.promM2t);
  if (estado.promM2d) $("#acm-prom-m2d input").val(estado.promM2d);
  if (estado.promM2c) $("#acm-prom-m2c-construccion input").val(estado.promM2c);

  calcularEstimado();
}

/** -------------------------------------------------------------------------------------------------- mediaPonderada
 * Calcula media ponderada eliminando extremos según tolerancia %
 */
  function mediaPonderada(valores, tolerancia) {
    try {

      if (!Array.isArray(valores) || !valores.length) return 0;

      const arr = valores.filter(v => !isNaN(v) && v > 0).sort((a,b)=>a-b);
      if (!arr.length) return 0;

      const med = arr[Math.floor(arr.length/2)];
      const min = med * (1 - tolerancia/100);
      const max = med * (1 + tolerancia/100);

      const filtrados = arr.filter(v => v >= min && v <= max);
      const base = filtrados.length ? filtrados : arr;

      let suma = 0;
      for (let i = 0; i < base.length; i++) suma += base[i];

      return base.length ? suma / base.length : 0;

    } catch (e) {console.log("Error mediaPonderada:", e);}
  }

/** ------------------------------------------------------------------------------------------------ regresionPotencialM2
 * Ajusta el USD/m² de un conjunto de inmuebles según su tamaño (economías de
 * escala: las unidades chicas suelen valer más por m² que las grandes,
 * aunque en algunos segmentos puede ser al revés). Usa una regresión
 * potencial precio = a·m²^b sobre los items (log-log OLS). Genérica: sirve
 * tanto para terrenos (campoM2="m2terreno") como para departamentos,
 * oficinas o locales (campoM2="m2construccion").
 * Devuelve null si no hay al menos 4 items con datos válidos: con menos
 * datos el ajuste por tamaño no es confiable y se debe usar el promedio
 * plano de respaldo.
 * @param {Array} items
 * @param {String} campoM2 - "m2terreno" | "m2construccion"
 * @param {Object} [opts] - { m2min, m2max } límites razonables para filtrar outliers de carga
 */
  function regresionPotencialM2(items, campoM2, opts) {
    opts = opts || {};
    const m2Min = opts.m2min != null ? opts.m2min : 10;
    const m2Max = opts.m2max != null ? opts.m2max : 20000;
    try {
      const pares = (items || [])
        .filter(it => it.precio > 0 && it[campoM2] > m2Min && it[campoM2] < m2Max)
        .map(it => ({ x: Math.log(it[campoM2]), y: Math.log(it.precio) }));

      if (pares.length < 4) return null;

      function ajustar(datos) {
        const n = datos.length;
        const mediaX = datos.reduce((s, p) => s + p.x, 0) / n;
        const mediaY = datos.reduce((s, p) => s + p.y, 0) / n;
        let num = 0, den = 0;
        datos.forEach(p => { num += (p.x - mediaX) * (p.y - mediaY); den += (p.x - mediaX) * (p.x - mediaX); });
        if (den === 0) return null; // todos los items tienen el mismo tamaño: no hay variación para ajustar
        const b = num / den;
        const a = Math.exp(mediaY - b * mediaX);
        return { a, b, n };
      }

      let modelo = ajustar(pares);
      if (!modelo) return null;

      // Segunda pasada: descarta outliers fuertes (posibles errores de carga)
      // y reajusta, solo si sigue quedando suficiente información.
      if (pares.length > 5) {
        const residuos = pares.map(p => p.y - (Math.log(modelo.a) + modelo.b * p.x));
        const mediaR = residuos.reduce((s, r) => s + r, 0) / residuos.length;
        const desv = Math.sqrt(residuos.reduce((s, r) => s + (r - mediaR) * (r - mediaR), 0) / residuos.length);
        if (desv > 0) {
          const limpio = pares.filter((p, i) => Math.abs(residuos[i] - mediaR) <= 2.5 * desv);
          if (limpio.length >= 4 && limpio.length < pares.length) {
            const modelo2 = ajustar(limpio);
            if (modelo2) modelo = modelo2;
          }
        }
      }

      if (!isFinite(modelo.a) || !isFinite(modelo.b) || modelo.a <= 0) return null;

      const m2s = pares.map(p => Math.exp(p.x));
      modelo.m2min = Math.min(...m2s);
      modelo.m2max = Math.max(...m2s);

      return modelo; // { a, b, n, m2min, m2max }

    } catch (e) { console.log("Error regresionPotencialM2:", e); return null; }
  }

/** USD/m² estimado para "m2" metros según el modelo potencial (precio = a·m²^b). */
  function usdM2SegunTamano(modelo, m2) {
    if (!modelo || !(m2 > 0)) return 0;
    return (modelo.a * Math.pow(m2, modelo.b)) / m2; // = a · m2^(b-1)
  }

/** ------------------------------------------------------------------------------------------ regresionPotencialTerrenos
 * Wrapper específico de terrenos sobre regresionPotencialM2, para no tener
 * que tocar el resto del código que ya llama a esta función por nombre.
 */
  function regresionPotencialTerrenos(terrenos) {
    return regresionPotencialM2(terrenos, "m2terreno", { m2min: 20, m2max: 20000 });
  }

/** Wrapper específico de terrenos sobre usdM2SegunTamano. */
  function usdM2TerrenoSegunTamano(modelo, m2) {
    return usdM2SegunTamano(modelo, m2);
  }

/** ---------------------------------------------------------------------------------- calcularValorConstruccionCasas
 * Para casas, el precio de venta incluye terreno + construcción. Antes se
 * calculaba USD/m² de construcción como precio/m2construccion directo, lo
 * que mezclaba ambos valores y hacía que calcularEstimado() sumara el
 * terreno dos veces (una explícita, otra escondida en ese promedio).
 *
 * Esta función aísla el valor de construcción: a cada casa comparable se le
 * resta el valor de terreno estimado (usando el modelo de terrenos ya
 * calculado, ajustado por el tamaño del lote de esa casa si hay modelo, o el
 * promedio plano si no) y solo el remanente se divide por m2construccion.
 *
 * @param {Array} casas - casas seleccionadas
 * @param {Object|null} modeloTerreno - modelo de regresión potencial de terrenos (o null)
 * @param {Number} promM2tPlano - USD/m² de terreno de respaldo (promedio simple)
 * @returns {Object} { valores, metodo, descartadas, sinTerreno }
 *   metodo: "neto" (se pudo restar terreno) | "legado" (no hay ninguna
 *   referencia de terreno disponible, se usa precio total / m2construccion
 *   como antes, marcado como baja confianza) | "sin-datos"
 */
  function calcularValorConstruccionCasas(casas, modeloTerreno, promM2tPlano) {
    const resultado = { valores: [], descartadas: 0, sinTerreno: 0, metodo: "sin-datos" };
    try {
      if (!Array.isArray(casas)) return resultado;

      const hayReferenciaTerreno = !!modeloTerreno || promM2tPlano > 0;

      casas.forEach(c => {
        const tieneAmbos = c.m2terreno > 0 && c.m2construccion > 0 && c.precio > 0;

        if (!tieneAmbos) {
          // Sin m2terreno no hay forma de aislar cuánto del precio corresponde
          // a construcción. Antes se usaba precio/m2terreno como comodín para
          // estos casos, pero eso no mide construcción sino otra cosa
          // distinta; se descarta del pool y se cuenta aparte para que quede
          // visible en la UI (no desaparece silenciosamente).
          if (c.m2construccion > 0 && c.precio > 0 && !(c.m2terreno > 0)) resultado.sinTerreno++;
          return;
        }

        if (hayReferenciaTerreno) {
          const usdM2tEstim = modeloTerreno
            ? usdM2TerrenoSegunTamano(modeloTerreno, c.m2terreno)
            : promM2tPlano;
          const valorTerrenoEstim = c.m2terreno * usdM2tEstim;
          const valorConstruccion = c.precio - valorTerrenoEstim;

          // Si el terreno estimado "se come" todo el precio (o más), el dato
          // es inconsistente (carga errónea) o el modelo de terreno está
          // extrapolando muy lejos de su rango: se descarta en vez de guardar
          // un USD/m² de construcción negativo o absurdo.
          if (valorConstruccion <= 0) { resultado.descartadas++; return; }

          resultado.valores.push(valorConstruccion / c.m2construccion);
        } else {
          // No hay ningún terreno seleccionado ni referencia manual: no hay
          // forma de aislar construcción. Se mantiene el comportamiento
          // legado (precio total / m2 construidos) para no dejar el campo
          // vacío, pero se marca como baja confianza en la UI.
          resultado.valores.push(c.precio / c.m2construccion);
        }
      });

      resultado.metodo = hayReferenciaTerreno ? "neto" : "legado";
      return resultado;

    } catch (e) { console.log("Error calcularValorConstruccionCasas:", e); return resultado; }
  }

/** --------------------------------------------------------------------------------------- calcularUsdM2Construccion
 * USD/m² para inmuebles "sin terreno propio" (departamento, oficina,
 * comercial/tienda y cualquier otro que estructuralmente no tenga terreno).
 * Oficina y tienda no valen lo mismo por m² que un departamento residencial,
 * así que si el usuario eligió un subtipo específico se intenta resolver
 * con ese subtipo antes de caer al pool combinado:
 *
 *   1) ≥4 comparables del subtipo exacto -> regresión potencial por tamaño
 *   2) 1-3 comparables del subtipo exacto -> promedio plano de ese subtipo
 *   3) 0 comparables del subtipo exacto (o subtipo "todos") -> promedio
 *      plano del pool combinado (departamento+oficina+comercial+otros),
 *      marcado como "mezclado" para que la UI lo deje claro
 *
 * @param {Array} construidos - pool combinado (todos los subtipos)
 * @param {Object} subtiposMap - { departamento:[...], oficina:[...], comercial:[...] }
 * @param {String} subtipoElegido - "todos" | "departamento" | "oficina" | "comercial"
 * @param {Number} m2cActual - m² construidos del inmueble a estimar (para el ajuste por tamaño)
 */
  function calcularUsdM2Construccion(construidos, subtiposMap, subtipoElegido, m2cActual) {
    const resultado = { valor: 0, n: 0, nTotal: (construidos||[]).length, subtipoUsado: "todos", ajustadoPorTamano: false, modelo: null, mezclado: true };
    try {
      const candidatos = (subtipoElegido && subtipoElegido !== "todos" && subtiposMap[subtipoElegido])
        ? subtiposMap[subtipoElegido]
        : [];

      const esSubtipoExacto = candidatos.length > 0;
      const pool = esSubtipoExacto ? candidatos : (construidos || []);

      const modelo = regresionPotencialM2(pool, "m2construccion", { m2min: 10, m2max: 20000 });

      if (modelo && m2cActual > 0) {
        resultado.valor = usdM2SegunTamano(modelo, m2cActual);
        resultado.ajustadoPorTamano = true;
        resultado.modelo = modelo;
      } else {
        const valores = pool.filter(d => d.precio > 0 && d.m2construccion > 0).map(d => d.precio / d.m2construccion);
        resultado.valor = mediaPonderada(valores, 15);
      }

      resultado.n = pool.length;
      resultado.subtipoUsado = esSubtipoExacto ? subtipoElegido : "todos";
      resultado.mezclado = !esSubtipoExacto; // true = se usó el pool combinado, no el subtipo pedido específicamente

      return resultado;

    } catch (e) { console.log("Error calcularUsdM2Construccion:", e); return resultado; }
  }

/** ------------------------------------------------------------------------------------------------ promedioPrecioM2
 * Calcula el promedio de precio por m² para una lista de inmuebles
 */
  function promedioPrecioM2(lista, campoM2) {
    try {

      if (!Array.isArray(lista) || !lista.length) return 0;

      const valores = [];
      for (let i = 0; i < lista.length; i++) {
        const it = lista[i];
        const m2 = parseFloat(it[campoM2]);
        const precio = parseFloat(it.precio);
        if (!isNaN(m2) && m2 > 0 && !isNaN(precio) && precio > 0) valores.push(precio / m2);
      }

      if (!valores.length) return 0;

      const prom = mediaPonderada(valores, 15);
      return prom > 0 ? prom : 0;

    } catch (e) {console.log("Error promedioPrecioM2:", e);}
  }

const tipoInmuebleDic = {
  departamento: {
    incluye: ["departamento", "dpto", "edificio", "apartamento", "flat", "mono" ],
    excluye: ["oficina", "coworking", "local comercial", "tienda", "galpón", "galpon"]
  },
  oficina: {
    incluye: ["oficina", "oficinas", "coworking", "consultorio"],
    excluye: []
  },
  comercial: {
    incluye: ["tienda", "local comercial", "local", "galpón", "galpon", "depósito", "deposito", "bodega", "showroom"],
    excluye: ["departamento", "dpto", "apartamento"] // "local" solo dentro de un depto (ej. "en la localidad") no debería clasificar
  },
  casa: {
    incluye: ["casa", "chalet", "quinta"],
    excluye: ["departamento", "dpto", "edificio", "apartamento", "flat", "mono"]
  },
  terreno: {
    incluye: ["lote", "terreno", "parcela"],
    excluye: ["dormit", "habitac", "cuarto", "piso", "Living", "Churrasquera", "lavanderia", "suite"  ] // si contiene esto, ya no es lote
  }
};

function detectarTipoInmueble(loc) {
  const tituloTexto = (loc.Titulo || "").toLowerCase();
  const desTexto = (loc.des || "").toLowerCase();

  const PESO_TITULO = 3;
  const PESO_DESCRIPCION = 1;

  let mejorTipo = "otro";
  let mejorScore = 0;

  for (const [tipo, reglas] of Object.entries(tipoInmuebleDic)) {
    let score = 0;

    reglas.incluye.forEach(word => {
      if (tituloTexto.includes(word)) score += PESO_TITULO;
      else if (desTexto.includes(word)) score += PESO_DESCRIPCION;
    });

    if (score === 0) continue; // sin coincidencias para este tipo

    const excluidoEnTitulo = reglas.excluye.some(word => tituloTexto.includes(word));
    const excluidoEnDescripcion = reglas.excluye.some(word => desTexto.includes(word));

    if (excluidoEnTitulo) continue; // contradicción fuerte en el título → descarta
    if (excluidoEnDescripcion) score -= PESO_DESCRIPCION; // contradicción débil → resta

    if (score > mejorScore) {
      mejorScore = score;
      mejorTipo = tipo;
    }
  }

  return mejorTipo;
}

function detectarTipoInmueble_old(loc) {
  const tituloTexto = (loc.Titulo || "").toLowerCase();
  const desTexto = (loc.des || "").toLowerCase();

  const PESO_TITULO = 3;
  const PESO_DESCRIPCION = 1;

  let mejorTipo = "otro";
  let mejorScore = 0;

  for (const [tipo, reglas] of Object.entries(tipoInmuebleDic)) {
    let score = 0;

    reglas.incluye.forEach(word => {
      if (tituloTexto.includes(word)) score += PESO_TITULO;
      else if (desTexto.includes(word)) score += PESO_DESCRIPCION;
    });

    if (score === 0) continue; // sin coincidencias para este tipo

    const excluidoEnTitulo = reglas.excluye.some(word => tituloTexto.includes(word));
    const excluidoEnDescripcion = reglas.excluye.some(word => desTexto.includes(word));

    if (excluidoEnTitulo) continue; // contradicción fuerte en el título → descarta
    if (excluidoEnDescripcion) score -= PESO_DESCRIPCION; // contradicción débil → resta

    if (score > mejorScore) {
      mejorScore = score;
      mejorTipo = tipo;
    }
  }

  return mejorTipo;
}


/** ---------------------------------------------------------------------------------------------------- initACMTools
 * Inicializa herramientas ACM y eventos asociados
 * @returns {void}
 */
  function initACMTools() {
    try {

      renderACMInputs();
      initACMFormPersistence();

      $('#acm-container').on('input', '#acm-prom-m2t input,#acm-prom-m2c-construccion input,#acm-prom-m2d input', function(){calcularEstimado();});
      $('#acm-container').on('input', '#acm-m2t', function(){
        // El USD/m² de terrenos depende del tamaño ingresado (regresión por
        // economías de escala), así que hay que recalcular todo el bloque,
        // no solo el estimado final.
        if ($("#acm-tipo").val()==="terreno") { actualizarACM(); } else { calcularEstimado(); }
      });
      $('#acm-container').on('input', '#acm-m2c', function(){calcularEstimado();});

      $('#acm-container').on('change','#acm-tipo',function(){
        const tipo=$(this).val();
        if(tipo==="terreno"){$("#acm-m2c-wrap").hide();$("#acm-m2t-wrap").show();}
        else if(tipo==="departamento"){$("#acm-m2t-wrap").hide();$("#acm-m2c-wrap").show();}
        else{$("#acm-m2t-wrap").show();$("#acm-m2c-wrap").show();}
        toggleDormBanioRow(tipo);
        toggleSubtipoRow(tipo);
        setPromDormBanio();
        actualizarACM();
      });

      // El subtipo (Depto/Oficina/Comercial) cambia qué pool de comparables
      // se usa, así que recalcula todo el bloque, no solo el estimado.
      $('#acm-container').on('change', '#acm-subtipo-construido', function(){actualizarACM();});

      $('#acm-container').on('change', '#acm-venta-rapida', function(){actualizarACM();});
      $('#acm-container').on('input', '#acm-ajuste-t,#acm-ajuste-c,#acm-ajuste-d', function(){actualizarACM();});
      $('#acm-container').on('click', '#acm-info-btn', function(){mostrarModalExplicacionACM();});

      actualizarACM();

      const tipo=$("#acm-tipo").val();
      if(tipo==="terreno"){$("#acm-m2c-wrap").hide();$("#acm-m2t-wrap").show();}
      else if(tipo==="departamento"){$("#acm-m2t-wrap").hide();$("#acm-m2c-wrap").show();}
      else{$("#acm-m2t-wrap").show();$("#acm-m2c-wrap").show();}
      toggleDormBanioRow(tipo);
      toggleSubtipoRow(tipo);

    } catch (e) {console.log("Error initACMTools:", e);}
  }

/** ------------------------------------------------------------------------------------------------- toggleSubtipoRow
 * Muestra/oculta la fila de Subtipo (Depto/Oficina/Comercial): solo aplica
 * cuando el tipo elegido es "departamento" (la categoría "sin terreno").
 */
  function toggleSubtipoRow(tipo){
    try {
      $("#acm-subtipo-row").css("display", tipo==="departamento" ? "contents" : "none");
    } catch (e) {console.log('toggleSubtipoRow error',e);}
  }

/** ----------------------------------------------------------------------------------------------- toggleDormBanioRow
 * Muestra/oculta la fila de Dormitorios y Baños (grid-column:1 a 4) según el
 * tipo de inmueble elegido: los terrenos no tienen dormitorios ni baños.
 * Se usa display:contents (no "none" directo en los hijos) para que, al
 * mostrarse de nuevo, los hijos sigan comportándose como ítems del grid
 * padre y no se desalinee la grilla.
 */
  function toggleDormBanioRow(tipo){
    try {
      $("#acm-dormbanio-row").css("display", tipo==="terreno" ? "none" : "contents");
    } catch (e) {console.log('toggleDormBanioRow error',e);}
  }

/** --------------------------------------------------------------------------------------------- initACMFormPersistence
 * Persiste inputs ACM en localStorage
 */
  function initACMFormPersistence(){ try {
    const map=[
      {id:"acm-tipo",key:"acm_tipo",evt:"change"},
      {id:"acm-subtipo-construido",key:"acm_subtipo_construido",evt:"change"},
      {id:"acm-m2t",key:"acm_m2t"},
      {id:"acm-m2c",key:"acm_m2c"},
      {id:"acm-dorm",key:"acm_dorm"},
      {id:"acm-banio",key:"acm_banio"}
    ];

    map.forEach(f=>{
      const el=document.getElementById(f.id);
      if(!el)return;

      const saved=localStorage.getItem(f.key);
      if(saved!==null)el.value=saved;

      const evt=f.evt||"input";
      el.addEventListener(evt,function(){
        localStorage.setItem(f.key,this.value||"");
      });
    });

  } catch (e) {console.log('initACMFormPersistence error',e);} }

/** ---------------------------------------------------------------------------------------------------- renderACMInputs
 * Renderiza los inputs ACM
 */
  function renderACMInputs() {
    try {

      const html=`
        <div id="acm-promedios">

          <div id="acm-rango" data-tippy-content="Rango de precios (mínimo y máximo) entre los inmuebles seleccionados.">Rango de precios: -</div>
          <div id="acm-prom-precio" data-tippy-content="Precio promedio (USD) de los inmuebles seleccionados.">Promedio de precios: USD 0 [0]</div>

          <div style="margin-top:6px;">
            <b data-tippy-content="Promedio de USD por metro cuadrado, calculado sobre los inmuebles seleccionados de cada tipo.">Promedio USD/m²</b>
            <button type="button" id="acm-info-btn" style="margin-left:8px;background:none;border:1px solid #ccc;border-radius:10px;padding:1px 8px;font-size:12px;cursor:pointer;color:#2563eb;" data-tippy-content="Ver cómo se calculan estos valores paso a paso.">ℹ️ ¿Cómo se calcula?</button>
            <label style="margin-left:12px;" data-tippy-content="Aplica el % de ajuste de cada tipo (columna derecha) para simular una venta rápida a precio más bajo.">
              <input type="checkbox" id="acm-venta-rapida"> V. Rápida
            </label>
          </div>

          <div style="display:grid;grid-template-columns:auto 1fr 1fr auto;gap:4px 8px;align-items:center;margin-top:6px;">
            <div data-tippy-content="Promedio USD/m² de terreno, calculado con los terrenos seleccionados. El segundo campo es el % de descuento para venta rápida.">Terrenos:</div>
            <div id="acm-prom-m2t"></div>
            <div></div>
            <div id="acm-count-t" data-tippy-content="Cantidad de terrenos seleccionados usados para este promedio.">[-]</div>

            <div data-tippy-content="Promedio USD/m² de construcción de casas, calculado con las casas seleccionadas. El segundo campo es el % de descuento para venta rápida.">Casas:</div>
            <div id="acm-prom-m2c-construccion"></div>
            <div></div>
            <div id="acm-count-c" data-tippy-content="Cantidad de casas seleccionadas usadas para este promedio.">[-]</div>

            <div data-tippy-content="Promedio USD/m² de construcción de departamentos, oficinas y locales/tiendas (inmuebles sin terreno propio). El segundo campo es el % de descuento para venta rápida.">Deptos/Ofic/Local:</div>
            <div id="acm-prom-m2d"></div>
            <div></div>
            <div id="acm-count-d" data-tippy-content="Cantidad de departamentos/oficinas/locales seleccionados usados para este promedio.">[-]</div>
          </div>

        </div>

        <div style="display:grid;grid-template-columns:auto auto auto auto;gap:4px 8px;align-items:center;">
          <div data-tippy-content="Tipo de inmueble a estimar: define qué promedios USD/m² se usan y qué campos aplican.">Tipo:</div>
          <select id="acm-tipo" data-tippy-content="Elegí el tipo de inmueble a estimar (departamento/oficina/local, casa o terreno).">
            <option value="departamento">Depto/Ofic/Local</option>
            <option value="casa">Casa</option>
            <option value="terreno">Terreno</option>
          </select>

          <div id="acm-m2t-wrap" data-tippy-content="Superficie de terreno (m²) del inmueble a estimar.">
            m² T.: <input type="number" id="acm-m2t" style="max-width:10ch;">
          </div>

          <div id="acm-m2c-wrap" data-tippy-content="Superficie construida (m²) del inmueble a estimar.">
            m² C.: <input type="number" id="acm-m2c" style="max-width:10ch;">
          </div>

          <div id="acm-subtipo-row" style="display:contents;">
            <div style="grid-column:1;" data-tippy-content="Subtipo dentro de 'sin terreno': si elegís uno específico, se usa el promedio USD/m² propio de ese subtipo (si hay suficientes comparables); si no, cae automáticamente al combinado.">Subtipo:</div>
            <select id="acm-subtipo-construido" style="grid-column:2;" data-tippy-content="Departamento, oficina y local/tienda valen distinto por m² construido, aunque los tres sean 'sin terreno'.">
              <option value="todos">Todos (mezclado)</option>
              <option value="departamento">Departamento</option>
              <option value="oficina">Oficina</option>
              <option value="comercial">Comercial/Tienda</option>
            </select>
          </div>

          <div id="acm-dormbanio-row" style="display:contents;">
            <div style="grid-column:1;" data-tippy-content="Dormitorios promedio de los inmuebles similares seleccionados (se completa automáticamente, se puede ajustar).">Dormitorios:</div>
            <input type="number" id="acm-dorm" style="max-width:6ch;grid-column:2;" data-tippy-content="Cantidad de dormitorios del inmueble a estimar.">

            <div id="acm-banio-wrap" style="grid-column:3;" data-tippy-content="Cantidad de baños del inmueble a estimar (baños promedio de los inmuebles similares seleccionados).">
              Baños: <input type="number" id="acm-banio" style="max-width:6ch;">
            </div>
          </div>
        </div>

        <div style="margin-top:6px;"> 
          <span id="acm-estimado" data-tippy-content="Valor estimado del inmueble, calculado con los promedios USD/m² y los m² ingresados arriba.">Estimado: -</span> 
          <span id="acm-tiempo-ofertado" data-tippy-content="Tiempo aproximado de venta según inmuebles similares seleccionados."> | Tiempo ofertado aprox: -</span> 
        </div>

      `;

      $("#acm-container").html(html);
      if (typeof initPopupTooltips === "function") { initPopupTooltips(document.getElementById("acm-container")); }

    } catch (e) {console.log("Error renderACMInputs:", e);}
  }

/** --------------------------------------------------------------------------------------------------- setPromDormBanio
 * Calcula promedio de dormitorios y baños según tipo seleccionado
 */
  function setPromDormBanio(){ try {
    const tipo=$("#acm-tipo").val();
    if(!tipo||!Array.isArray(seleccionados))return;

    const lista=seleccionados.filter(s=>detectarTipoInmueble(s)===tipo);

    const dorms=lista.map(s=>parseFloat(s.dormitorios)||0).filter(v=>v>0);
    const banios=lista.map(s=>parseFloat(s.baños)||0).filter(v=>v>0);

    const promDorm=dorms.length?(dorms.reduce((a,b)=>a+b,0)/dorms.length):0;
    const promBanio=banios.length?(banios.reduce((a,b)=>a+b,0)/banios.length):0;

    if(tipo==="casa"||tipo==="departamento"){
      if(promDorm>0)$("#acm-dorm").val(Math.round(promDorm));
      if(promBanio>0)$("#acm-banio").val(Math.round(promBanio));
    }else{
      $("#acm-dorm").val("");$("#acm-banio").val("");
    }

  } catch (e) {console.log('setPromDormBanio error',e);} }


/** --------------------------------------------------------------------------------------------------- calcularEstimado
 * Calcula el valor estimado según tipo seleccionado y m² ingresados
 */
  function calcularEstimado() { try {
    const tipo=$("#acm-tipo").val();
    if(!tipo) return;

    const m2t=parseFloat($("#acm-m2t").val())||0;
    const m2c=parseFloat($("#acm-m2c").val())||0;

    const vT=parseFloat($("#acm-prom-m2t input[type='number']").first().val())||0;
    const vC=parseFloat($("#acm-prom-m2c-construccion input[type='number']").first().val())||0;
    const vD=parseFloat($("#acm-prom-m2d input[type='number']").first().val())||0;

    let estimado=0;

    if(tipo==="terreno"){
      if(m2t>0&&vT>0) estimado=m2t*vT;
    } else if(tipo==="casa"){
      if(m2t>0&&vT>0) estimado+=m2t*vT;
      if(m2c>0&&vC>0) estimado+=m2c*vC;
    } else if(tipo==="departamento"){
      if(m2c>0&&vD>0) estimado=m2c*vD;
    }

    const chkRapida=$("#acm-venta-rapida").prop("checked");
    const ajT=parseFloat($("#acm-ajuste-t").val())||15;
    const ajC=parseFloat($("#acm-ajuste-c").val())||7;
    const ajD=parseFloat($("#acm-ajuste-d").val())||5;

    if(chkRapida){
      if(tipo==="terreno") estimado*=1-ajT/100;
      else if(tipo==="casa") estimado*=1-ajC/100;
      else if(tipo==="departamento") estimado*=1-ajD/100;
    }

    if(estimado>0){
      $("#acm-estimado").text(`Estimado: USD ${formatNumber(estimado)}`);
      if(typeof calcularTiempoOfertado==="function"){
        const meses=calcularTiempoOfertado(tipo,m2t,m2c,estimado);
        if(meses&&meses>0){$("#acm-tiempo-ofertado").text(` | Tiempo ofertado aprox: ${meses} meses`);}
        else{$("#acm-tiempo-ofertado").text(" | Tiempo ofertado aprox: -");}
      }
    } else {
      $("#acm-estimado").text("Estimado: -");
      $("#acm-tiempo-ofertado").text(" | Tiempo ofertado aprox: -");
    }

    //syncPDFACMVisibility();
    ensureSyncPDFACMVisibility();
  } catch (e) {console.log("Error calcularEstimado:", e);}}

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


/** ------------------------------------------------------------------------------------------ mostrarModalExplicacionACM
 * Ventana flotante con la explicación completa de cómo se calcula el ACM.
 * Se usa cuando la explicación no entra en los tooltips de la barra lateral.
 * El contenido se arma en base a window.__acmMeta, que actualizarACM() deja
 * actualizado en cada recálculo, para que lo que se explica coincida
 * siempre con los números que el usuario está viendo en ese momento.
 */
  function mostrarModalExplicacionACM() {
    try {
      if (document.getElementById('modal-acm-info-overlay')) return; // evitar duplicados

      const meta = window.__acmMeta || null;
      const tipo = $("#acm-tipo").val() || "departamento";

      const overlay = document.createElement('div');
      overlay.id = 'modal-acm-info-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;justify-content:center;align-items:center;';

      const box = document.createElement('div');
      box.style.cssText = 'background:#fff;border-radius:12px;padding:24px 28px;max-width:560px;width:90%;max-height:80vh;overflow-y:auto;margin:20px;box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:sans-serif;color:#333;line-height:1.5;font-size:14px;';

      const tipoLabel = { terreno:"Terreno", casa:"Casa", departamento:"Departamento / Oficina / Local" };
      const iconos = []; // se completa según lo que realmente aparece en el bloque mostrado
      let bloqueTipo = "";

      // ------------------------------------------------------------- TERRENO
      if (tipo === "terreno") {
        let seccionTerreno;
        if (!meta || meta.terrenos.n === 0) {
          seccionTerreno = `Todavía no seleccionaste terrenos en el mapa para este ACM, así que no hay base para calcular un USD/m².`;
        } else if (meta.terrenos.ajustadoPorTamano) {
          seccionTerreno = `Se toman los <b>${meta.terrenos.n} terrenos</b> que seleccionaste como comparables. Como el precio por m² varía según el tamaño del lote (economía de escala), se ajusta con una regresión potencial `
            + `<code>precio = a · m²^${meta.terrenos.modelo.b.toFixed(2)}</code> calculada sobre esos comparables. El USD/m² que ves arriba corresponde al tamaño que cargaste (${formatNumber(meta.terrenos.m2tActual)} m²).`;
          iconos.push('📐 ajustado por tamaño (regresión sobre los comparables)');
        } else {
          seccionTerreno = `Se toman los <b>${meta.terrenos.n} terrenos</b> que seleccionaste. Con menos de 4 comparables no se puede ajustar por tamaño de forma confiable, así que se usa un promedio simple de USD/m² (descartando automáticamente los valores muy alejados de la mediana).`;
        }
        bloqueTipo = `
          <p style="margin:14px 0 4px;"><b>🏞️ USD/m² de terreno</b></p>
          <p style="margin:0;">${seccionTerreno}</p>
          <p style="margin:8px 0 0;">El estimado final se calcula como:<br><code>Estimado = m² de terreno × USD/m² de terreno</code></p>
        `;

      // ------------------------------------------------------------- CASA
      } else if (tipo === "casa") {
        let seccionTerreno;
        if (!meta || meta.terrenos.n === 0) {
          seccionTerreno = `Todavía no hay terrenos seleccionados en el mapa, así que no hay un USD/m² de terreno propio de la zona.`;
        } else if (meta.terrenos.ajustadoPorTamano) {
          seccionTerreno = `Se toman los <b>${meta.terrenos.n} terrenos</b> seleccionados y se ajusta el USD/m² con una regresión potencial según el tamaño (<code>precio = a · m²^${meta.terrenos.modelo.b.toFixed(2)}</code>), para el tamaño de terreno que cargaste (${formatNumber(meta.terrenos.m2tActual)} m²).`;
          iconos.push('📐 ajustado por tamaño (regresión sobre los comparables)');
        } else {
          seccionTerreno = `Se toman los <b>${meta.terrenos.n} terrenos</b> seleccionados y se usa un promedio simple de USD/m² (hacen falta al menos 4 para ajustar por tamaño).`;
        }

        let seccionCasa;
        if (!meta || meta.casas.total === 0) {
          seccionCasa = `Todavía no seleccionaste casas en el mapa para este ACM.`;
        } else if (meta.casas.metodo === "neto") {
          seccionCasa = `Se toman las <b>${meta.casas.total} casas</b> seleccionadas. El precio de una casa incluye terreno + construcción, así que a cada una se le resta el valor de <i>su propio terreno</i> (m² de terreno de esa casa × USD/m² de terreno) y solo lo que queda se divide por los m² construidos. Así el USD/m² de construcción (${formatNumber(meta.casas.promM2c)}) no queda mezclado con el valor del terreno.`
            + (meta.casas.usadas < meta.casas.total
                ? ` De esas ${meta.casas.total}, se usan <b>${meta.casas.usadas}</b> para este promedio` +
                  ((meta.casas.descartadas>0 || meta.casas.sinTerreno>0)
                    ? `: ${meta.casas.descartadas>0?`${meta.casas.descartadas} porque el terreno estimado superaba el precio total`:``}`
                      + (meta.casas.descartadas>0 && meta.casas.sinTerreno>0 ? ` y ` : ``)
                      + `${meta.casas.sinTerreno>0?`${meta.casas.sinTerreno} porque no tenían m² de terreno cargado`:``}.`
                    : `.`)
                : ` Se usan las ${meta.casas.total} casas.`);
          iconos.push('🧮 construcción de casas neta de terreno');
        } else {
          seccionCasa = `Se seleccionaron <b>${meta.casas.total} casas</b>, pero no hay ningún terreno de referencia (ni seleccionado, ni cargado a mano), así que no se puede separar terreno de construcción. El valor mostrado es precio total / m² construidos, lo que sobreestima la construcción porque el terreno queda incluido. Seleccioná al menos un terreno de la zona para corregirlo.`;
          iconos.push('⚠️ valor de baja confianza (terreno sin aislar)');
        }

        bloqueTipo = `
          <p style="margin:14px 0 4px;"><b>🏞️ USD/m² de terreno</b></p>
          <p style="margin:0;">${seccionTerreno}</p>

          <p style="margin:14px 0 4px;"><b>🏠 USD/m² de construcción</b></p>
          <p style="margin:0;">${seccionCasa}</p>

          <p style="margin:8px 0 0;">El estimado final de una casa combina ambos valores:<br>
          <code>Estimado = (m² terreno × USD/m² terreno) + (m² construcción × USD/m² construcción)</code></p>
        `;

      // ------------------------------------------------------------- DEPARTAMENTO / OFICINA / COMERCIAL
      } else {
        const subtipoLabelModal = { todos:"departamentos, oficinas y locales/tiendas", departamento:"departamentos", oficina:"oficinas", comercial:"locales/tiendas" };
        let seccionDepto;
        if (!meta || meta.construccion.total === 0) {
          seccionDepto = `Todavía no seleccionaste departamentos, oficinas ni locales en el mapa para este ACM.`;
        } else {
          const rc = meta.construccion.resultado;
          const p = meta.construccion.porSubtipo;
          seccionDepto = `Se toman los <b>${meta.construccion.total} inmuebles</b> seleccionados sin terreno propio (${p.departamento} departamento(s), ${p.oficina} oficina(s), ${p.comercial} comercial(es), y el resto sin subtipo detectado). `
            + `Como oficina, local y departamento no valen lo mismo por m², arriba podés elegir un <b>subtipo específico</b>: si hay al menos 1 comparable de ese subtipo se usa ese grupo (y con ≥4 se ajusta por tamaño); si no hay ninguno, se usa el promedio combinado de los tres. `
            + `Ahora está en <b>"${subtipoLabelModal[meta.construccion.subtipoElegido]}"</b>`
            + (rc.mezclado && meta.construccion.subtipoElegido!=="todos"
                ? `, pero como no hay comparables propios de ese subtipo, se muestra el combinado (${rc.n}).`
                : `, usando ${rc.n} comparables${rc.ajustadoPorTamano?` con ajuste por tamaño`:``}.`);
          if (rc.ajustadoPorTamano) iconos.push('📐 ajustado por tamaño (regresión sobre los comparables)');
          if (rc.mezclado && meta.construccion.subtipoElegido!=="todos") iconos.push('⚠️ sin comparables propios del subtipo elegido, se muestra el combinado');
        }
        bloqueTipo = `
          <p style="margin:14px 0 4px;"><b>🏢 USD/m² de construcción</b></p>
          <p style="margin:0;">${seccionDepto}</p>
          <p style="margin:8px 0 0;">Este tipo de inmueble no tiene terreno propio que restar, así que el estimado final es directo:<br>
          <code>Estimado = m² construidos × USD/m² de construcción</code></p>
        `;
      }

      box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <h3 style="margin:0 0 4px;font-size:17px;">📊 ¿Cómo se calcula el ACM — ${tipoLabel[tipo]}?</h3>
          <span id="modal-acm-info-close" style="cursor:pointer;font-size:20px;line-height:1;color:#999;padding:2px 4px;">✕</span>
        </div>

        <p style="margin:8px 0;">
          El cálculo se arma <b>en base a los inmuebles que vos seleccionaste</b> en el mapa para este ACM
          (no es un promedio general de mercado): la calidad del estimado depende directamente de qué tan buenos
          comparables hayas elegido.
        </p>

        ${bloqueTipo}

        <p style="margin:14px 0 4px;"><b>✏️ Podés ajustar todo a mano</b></p>
        <p style="margin:0;">
          Cada valor de USD/m² es un input editable: si conocés mejor el mercado de la zona, podés pisar el número
          calculado y el estimado se recalcula al instante. El % que aparece al lado es el descuento que se aplica
          solo si activás "V. Rápida", para simular una venta más rápida a menor precio.
        </p>

        ${iconos.length ? `
        <p style="margin:14px 0 0;font-size:12px;color:#888;">
          Íconos: ${iconos.join(' · ')}.
        </p>` : ``}
      `;

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      if (typeof initPopupTooltips === "function") { initPopupTooltips(box); }

      document.getElementById('modal-acm-info-close').addEventListener('click', function(){ overlay.remove(); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });

    } catch (e) { console.log('mostrarModalExplicacionACM error', e); }
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
