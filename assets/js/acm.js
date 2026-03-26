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
              <img src="../../assets/images/pointers/pointer_acm.png" style="width:26px;height:26px;display:block;">
              <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
                          width:12px;height:6px;background:rgba(0,0,0,0.25);
                          border-radius:50%;filter:blur(2px);"></div>
            </div>`,
      iconSize:[26,32],
      iconAnchor:[13,32]
    });

    map.on("click",function(e){
      const lat=e.latlng.lat,lng=e.latlng.lng;
      window.__acmCoords={lat:lat,lng:lng};

      if(window.__acmMarker){map.removeLayer(window.__acmMarker);}
      window.__acmMarker=L.marker([lat,lng],{icon:icon,interactive:false}).addTo(map);
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
      const deptos=seleccionados.filter(s=>detectarTipoInmueble(s)==="departamento"&&s.m2construccion>0);

      const avgPrecio=seleccionados.length?calcularPromedio(seleccionados,"precio"):0;
      $("#acm-prom-precio").text(`Promedio de precios: USD ${formatNumber(avgPrecio)} [${seleccionados.length}]`);

      const valoresM2t=terrenos.filter(t=>t.precio>0&&t.m2terreno>20&&t.m2terreno<20000).map(t=>t.precio/t.m2terreno);
      let promM2t=mediaPonderada(valoresM2t,15);
      if(promM2t<=0&&window.M2T){const m2tManual=parseInt(window.M2T);if(!isNaN(m2tManual)&&m2tManual>0)promM2t=m2tManual;}

      const valoresM2c=casas.map(c=>{
        if(c.m2construccion>0&&c.precio>0)return c.precio/c.m2construccion;
        if(c.m2terreno>0&&c.precio>0)return c.precio/c.m2terreno;
        return null;
      }).filter(v=>v!==null);

      const promM2c=mediaPonderada(valoresM2c,15);

      const valoresM2d=deptos.filter(d=>d.precio>0&&d.m2construccion>0).map(d=>d.precio/d.m2construccion);
      const promM2d=mediaPonderada(valoresM2d,15);

      const ajT=parseFloat($("#acm-ajuste-t").val())||15;
      const ajC=parseFloat($("#acm-ajuste-c").val())||7;
      const ajD=parseFloat($("#acm-ajuste-d").val())||5;

      const valT=promM2t;
      const valC=promM2c;
      const valD=promM2d;

      $("#acm-prom-m2t").html(
        `<input type="number" step="0.01" value="${valT>0?valT.toFixed(2):""}" title="Valor en dólares del metro cuadrado de terreno, también se usará para calcular valor de casas" style="max-width:12ch;"> `+
        `<input id="acm-ajuste-t" type="number" value="${ajT}" style="max-width:5ch;">`
      );

      $("#acm-prom-m2c-construccion").html(
        `<input type="number" step="0.01" value="${valC>0?valC.toFixed(2):""}" title="Valor en dólares del metro cuadrado de construcción para casas, se usa conjuntamente con el valor de USD/m² terrenos" style="max-width:12ch;"> `+
        `<input id="acm-ajuste-c" type="number" value="${ajC}" style="max-width:5ch;">`
      );

      $("#acm-prom-m2d").html(
        `<input type="number" step="0.01" value="${valD>0?valD.toFixed(2):""}" title="Valor en dólares del metro cuadrado de construcción para departamentos, tiendas o similares" style="max-width:12ch;"> `+
        `<input id="acm-ajuste-d" type="number" value="${ajD}" style="max-width:5ch;">`
      );

      $("#acm-count-t").text(terrenos.length?`[${terrenos.length}]`:"[-]");
      $("#acm-count-c").text(casas.length?`[${casas.length}]`:"[-]");
      $("#acm-count-d").text(deptos.length?`[${deptos.length}]`:"[-]");

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
    excluye: []
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


/** ---------------------------------------------------------------------------------------------------- initACMTools
 * Inicializa herramientas ACM y eventos asociados
 * @returns {void}
 */
  function initACMTools() {
    try {

      renderACMInputs();
      initACMFormPersistence();

      $('#acm-container').on('input', '#acm-prom-m2t input,#acm-prom-m2c-construccion input,#acm-prom-m2d input', function(){calcularEstimado();});
      $('#acm-container').on('input', '#acm-m2t,#acm-m2c', function(){calcularEstimado();});

      $('#acm-container').on('change','#acm-tipo',function(){
        const tipo=$(this).val();
        if(tipo==="terreno"){$("#acm-m2c-wrap").hide();$("#acm-m2t-wrap").show();}
        else if(tipo==="departamento"){$("#acm-m2t-wrap").hide();$("#acm-m2c-wrap").show();}
        else{$("#acm-m2t-wrap").show();$("#acm-m2c-wrap").show();}
        setPromDormBanio();
        calcularEstimado();
      });

      $('#acm-container').on('change', '#acm-venta-rapida', function(){actualizarACM();});
      $('#acm-container').on('input', '#acm-ajuste-t,#acm-ajuste-c,#acm-ajuste-d', function(){actualizarACM();});

      actualizarACM();

      const tipo=$("#acm-tipo").val();
      if(tipo==="terreno"){$("#acm-m2c-wrap").hide();$("#acm-m2t-wrap").show();}
      else if(tipo==="departamento"){$("#acm-m2t-wrap").hide();$("#acm-m2c-wrap").show();}
      else{$("#acm-m2t-wrap").show();$("#acm-m2c-wrap").show();}

    } catch (e) {console.log("Error initACMTools:", e);}
  }

/** --------------------------------------------------------------------------------------------- initACMFormPersistence
 * Persiste inputs ACM en localStorage
 */
  function initACMFormPersistence(){ try {
    const map=[
      {id:"acm-tipo",key:"acm_tipo",evt:"change"},
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

          <div id="acm-rango">Rango de precios: -</div>
          <div id="acm-prom-precio">Promedio de precios: USD 0 [0]</div>

          <div style="margin-top:6px;">
            <b>Promedio USD/m²</b>
            <label style="margin-left:12px;">
              <input type="checkbox" id="acm-venta-rapida"> V. Rápida
            </label>
          </div>

          <div style="display:grid;grid-template-columns:auto 1fr 1fr auto;gap:4px 8px;align-items:center;margin-top:6px;">
            <div>Terrenos:</div>
            <div id="acm-prom-m2t"></div>
            <div></div>
            <div id="acm-count-t">[-]</div>

            <div>Casas:</div>
            <div id="acm-prom-m2c-construccion"></div>
            <div></div>
            <div id="acm-count-c">[-]</div>

            <div>Deptos.:</div>
            <div id="acm-prom-m2d"></div>
            <div></div>
            <div id="acm-count-d">[-]</div>
          </div>

        </div>

        <div style="display:grid;grid-template-columns:auto auto auto auto;gap:4px 8px;align-items:center;">
          <div>Tipo:</div>
          <select id="acm-tipo">
            <option value="departamento">Depto</option>
            <option value="casa">Casa</option>
            <option value="terreno">Terreno</option>
          </select>

          <div id="acm-m2t-wrap">
            m² T.: <input type="number" id="acm-m2t" style="max-width:10ch;">
          </div>

          <div id="acm-m2c-wrap">
            m² C.: <input type="number" id="acm-m2c" style="max-width:10ch;">
          </div>

          <div style="grid-column:1;">Dormitorios:</div>
          <input type="number" id="acm-dorm" style="max-width:6ch;grid-column:2;">

          <div style="grid-column:3;">Baños:</div>
          <input type="number" id="acm-banio" style="max-width:6ch;grid-column:4;">
        </div>

        <div style="margin-top:6px;"> 
          <span id="acm-estimado">Estimado: -</span> 
          <span id="acm-tiempo-ofertado"> | Tiempo ofertado aprox: -</span> 
        </div>

      `;

      $("#acm-container").html(html);

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


// Extrae el valor numérico de los <input> dentro de los spans de ACM
function extraerValorPromedio(selector) {
  const $input = $(selector).find("input");
  if ($input.length) {
    const val = parseFloat($input.val());
    return isNaN(val) ? 0 : val;
  }
  return 0;
}
