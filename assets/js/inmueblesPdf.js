// ---------------------------------------------
// inmueblesPdf.js - Generador de brochure PDF con selección de columnas
// ---------------------------------------------

function proxify(url) {
  if (!url) return url;
  return `https://ekvilibrolab.netlify.app/.netlify/functions/proxy-image?url=${encodeURIComponent(url)}`;
}

/** --------------------------------------------------------------------------------------------------- drawFooterAgente
 * Dibuja pie de página con datos del agente alineado a la derecha
 * @param {Object} doc
 */
  function drawFooterAgente(doc){ try {
    const params=new URLSearchParams(window.location.search);
    const na=params.get("na")||"",ag=params.get("ag")||"",an=params.get("an")||"";
    const txt=[na,ag,an].filter(Boolean).join(" · "); if(!txt)return;
    const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();
    doc.setFont("helvetica","normal"); doc.setFontSize(7);
    doc.text(txt,w-10,h-5,{align:"right"});
  } catch (e) {console.log('drawFooterAgente error',e);} }

async function urlToBase64(url) {
  const resp = await fetch(proxify(url));
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function cropToSquare(base64, w, h) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = function () {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = side;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, side, side, 0, 0, side, side);

      resolve(canvas.toDataURL("image/jpeg"));
    };
    img.src = base64;
  });
}

/**
 * Mantiene limpio el cache de fotos en localStorage
 * - Conserva solo las últimas N entradas
 * - Borra las más antiguas para evitar QuotaExceededError
 */
function limpiarFotoCache(max = 50) {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("fotoCache_")) {
      keys.push({ key: k, time: localStorage.getItem(k + "_ts") || 0 });
    }
  }

  // ordenar por timestamp ascendente (antiguos primero)
  keys.sort((a, b) => parseInt(a.time) - parseInt(b.time));

  if (keys.length > max) {
    const toDelete = keys.slice(0, keys.length - max);
    toDelete.forEach(obj => {
      localStorage.removeItem(obj.key);
      localStorage.removeItem(obj.key + "_ts");
    });
    console.log(`🧹 Cache fotos limpiado, eliminadas ${toDelete.length} entradas antiguas`);
  }
}


function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Error al cargar ${url}`));
    document.head.appendChild(script);
  });
}

function showLoader() {
  if (document.getElementById("pdf-loader")) return;
  const loader = document.createElement("div");
  loader.id = "pdf-loader";
  loader.innerHTML = `
    <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); 
                display:flex; justify-content:center; align-items:center; z-index:9999; font-size:18px; color:#333;">
      ⏳ Generando PDF, por favor espere...
    </div>
  `;
  document.body.appendChild(loader);
}

function hideLoader() {
  const loader = document.getElementById("pdf-loader");
  if (loader) loader.remove();
}

// ---------------------------------------------
// Campos disponibles para selección
// ---------------------------------------------
const camposDisponibles = [
  { key: "foto",            label: "Foto",            index: 1 },
  { key: "Titulo",          label: "Título",          index: 2 },
  { key: "nombre",          label: "Nombre",          index: 3 },
  { key: "precio",          label: "Precio",          index: 4 },
  { key: "dir",             label: "Dirección",       index: 5 },
  { key: "m2construccion",  label: "m² construc.",    index: 6 },
  { key: "m2terreno",       label: "m² terreno",      index: 7 },
  { key: "precioM2C",       label: "USD/m² constr.",  index: 8 },
  { key: "precioM2T",       label: "USD/m² terr.",    index: 9 },
  { key: "ambientes",       label: "Ambientes",       index: 10 },
  { key: "dormitorios",     label: "Dormitorios",     index: 11 },
  { key: "baños",           label: "Baños",           index: 12 },
  { key: "broker",          label: "Agencia",         index: 13 },
  { key: "agentName",       label: "Agente",          index: 14 },  
  { key: "agentPhone",      label: "Teléfono",        index: 15 },
  { key: "URL",             label: "URL",             index: 16 },
  { key: "lat",             label: "Latitud",         index: 17 },
  { key: "lng",             label: "Longitud",        index: 18 },
  { key: "des",             label: "Descripción",     index: 19 },
  { key: "fechaIngreso",    label: "Fecha ingreso",   index: 20 },
  { key: "tiempoOfertado",  label: "Meses ofertado",  index: 21 },
  { key: "tipoInmueble",    label: "Tipo inmueble",   index: 22 },
  { key: "tipoNegocio",     label: "Tipo negocio",    index: 23 },
  { key: "anoc",            label: "Año de construc.",index: 24 },
];

/** ------------------------------------------------------------------------------------------- initPDFACMImageToggle
 * Muestra u oculta el input de imagen ACM según el checkbox
 */
  function initPDFACMImageToggle() {
    try {

      $(document).on("change","#pdf-include-acm",function(){
        if($(this).prop("checked")){$("#pdf-acm-img-wrap").show();}
        else{$("#pdf-acm-img-wrap").hide();}
      });

    } catch (e) {console.log("Error initPDFACMImageToggle:", e);}
  }

/** -------------------------------------------------------------------------------------------- syncPDFACMVisibility
 * Muestra u oculta opciones PDF del ACM según exista estimado
 */
  function syncPDFACMVisibility() {
    try {

      const txt=$("#acm-estimado").text().trim();
      if(txt && txt!=="Estimado: -"){$("#pdf-acm-option").show();}
      else{$("#pdf-acm-option").hide();$("#pdf-include-acm").prop("checked",false);$("#pdf-acm-img-wrap").hide();}

    } catch (e) {console.log("Error syncPDFACMVisibility:", e);}
  }


function renderColumnSelector() {
  if (document.getElementById("column-selector")) return;

  const container = document.createElement("div");
  container.id = "column-selector";
  container.style.marginTop = "10px";
  const totalInmuebles = Array.isArray(locations) ? locations.length : 0;

  const params=new URLSearchParams(window.location.search);
  const na=params.get("na")||"",ag=params.get("ag")||"",an=params.get("an")||"";

  container.innerHTML = `
    <div style="margin-bottom:8px;">
      <b>Mostrar en PDF:</b><br>
      <label><input type="checkbox" id="pdf-show-all">Mostrar todos (${totalInmuebles})</label>
      <br>
      <label> Título <input type="text" id="pdf-title" value="Análisis comparativo de mercado" style="margin-left:6px;"></label>
      <br>

      Agente: <input type="text" id="pdf-agent" value="${na}" style="margin-left:6px;"><br>
      Agencia: <input type="text" id="pdf-agency" value="${ag}" style="margin-left:6px;"><br>
      Celular: <input type="text" id="pdf-cellphone" value="${an}" style="margin-left:6px;"><br>

      <div id="pdf-acm-option" style="display:none;">
        <label><input type="checkbox" id="pdf-include-acm"> Incluir resultado del ACM</label>

        <div id="pdf-acm-img-wrap" style="display:none;margin-top:4px;">
          Link imagen para inmueble ACM:
          <input type="text" id="pdf-acm-img" style="max-width:40ch;">
        </div>
      </div>
    </div>

    <b>Selecciona campos a incluir:</b><br>
  `;

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, 1fr)";
  grid.style.gap = "6px 12px";

  camposDisponibles.forEach(campo => {
    const id = "chk-" + campo.key;
    let saved = localStorage.getItem("col_" + campo.key);
    if (saved !== null) saved = saved === "true";

    const isChecked = saved !== null
      ? saved
      : (window.columnasConfig && campo.key in window.columnasConfig
          ? window.columnasConfig[campo.key]
          : true);

    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" id="${id}" data-key="${campo.key}" ${isChecked ? "checked" : ""}>
      ${campo.label}
    `;
    grid.appendChild(label);

    setTimeout(() => {
      const chk = document.getElementById(id);
      chk.addEventListener("change", function () {
        localStorage.setItem("col_" + campo.key, this.checked);
      });
    }, 0);
  });

  container.appendChild(grid);
  const box = document.getElementById("sel-box");
  if (box) box.appendChild(container);
}

function formatCurrency(value, currency = "USD") {
  if (value === null || value === undefined || value === "" || isNaN(value)) {
    return "-";
  }
  const number = Number(value);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
}

// ✅ Generar mapa en cliente con Leaflet + html2canvas
async function generarMapaInmuebles(inmuebles, vertical = false) {
  return new Promise(resolve => {
    if (!inmuebles || inmuebles.length === 0) return resolve(null);
    const coords = inmuebles.filter(s => s.lat && s.lng);
    if (coords.length === 0) return resolve(null);

    const mapDiv = document.createElement("div");
    mapDiv.style.width = vertical ? "400px" : "800px";
    mapDiv.style.height = vertical ? "350px" : "400px";
    mapDiv.style.position = "absolute";
    mapDiv.style.left = "-9999px";
    mapDiv.style.transform = "none"; // 🔹 Evita transformaciones 3D
    mapDiv.style.perspective = "none"; // 🔹 Quita cualquier perspectiva
    mapDiv.style.webkitTransform = "none";
    mapDiv.style.webkitPerspective = "none";
    document.body.appendChild(mapDiv);

    const map = L.map(mapDiv, { zoomControl: !vertical, preferCanvas: true });
    const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; Statetty",
      crossOrigin: true
    }).addTo(map);

    const group = [];
    coords.forEach((s, i) => {
      const icon = L.divIcon({
        className: "custom-pin",
        html: `<div style="background:#ff5722; color:white; border-radius:50%; width:26px; height:26px; 
                display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:bold;">
                 ${i + 1}
               </div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26]
      });
      group.push(L.marker([s.lat, s.lng], { icon }).addTo(map));
    });

    const bounds = L.featureGroup(group).getBounds();
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, minZoom: 12 });

    tileLayer.on("load", () => {
      setTimeout(() => {
        html2canvas(mapDiv, { useCORS: true, backgroundColor: "#fff", removeContainer: true }).then(canvas => {
          const imgData = canvas.toDataURL("image/png");
          document.body.removeChild(mapDiv);
          resolve({ data: imgData, type: "image/png" });
        });
      }, 500);
    });
  });
}

// ---------------------------------------------
// Generar PDF (modo = "landscape" | "mobile")
// ---------------------------------------------
async function generarBrochurePDF(inmuebles, modo = "landscape", seleccionados = []) {

  if (!inmuebles || inmuebles.length === 0) {alert("No hay inmuebles para generar el PDF.");return;}

  // insertar inmueble generado desde ACM si corresponde
  if (typeof insertarInmuebleACM === "function") { inmuebles = insertarInmuebleACM(inmuebles);}

  try {

    const selectedSet = new Set((seleccionados || []).map(s => s.id || s.uid || s.URL));

    showLoader();
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(modo === "mobile" ? "p" : "l", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const titulo=$("#pdf-title").val()||"Análisis comparativo de mercado";
    doc.text(titulo, pageWidth/2, 15, {align:"center"});

    //console.table(inmuebles);

    const fechaHoy = new Date().toLocaleDateString("es-ES",{year:"numeric",month:"long",day:"numeric"});
    doc.setFont("helvetica","normal");
    doc.setFontSize(11);
    doc.text(fechaHoy,15,22);

    inmuebles.sort((a,b)=>(parseFloat(a.precio)||0)-(parseFloat(b.precio)||0));

    for (let s of inmuebles) {
      if (s.foto) {
        try {
          const cacheKey = "fotoCache_" + s.foto;
          window.__fotoCache = window.__fotoCache || {};
          let cached = localStorage.getItem(cacheKey) || window.__fotoCache[cacheKey];

          if (cached) {
            s.fotoBase64Cropped = cached;
          } else {
            const base64 = await urlToBase64(s.foto);

            const dims = await new Promise(resolve=>{
              const img=new Image();
              img.onload=()=>resolve({w:img.width,h:img.height});
              img.onerror=()=>resolve({w:null,h:null});
              img.src=base64;
            });

            if (dims.w && dims.h) {
              s.fotoBase64Cropped = await cropToSquare(base64,dims.w,dims.h);
              try {
                localStorage.setItem(cacheKey,s.fotoBase64Cropped);
                localStorage.setItem(cacheKey+"_ts",Date.now().toString());
                limpiarFotoCache(50);
              } catch(e) {
                window.__fotoCache[cacheKey]=s.fotoBase64Cropped;
              }
            }
          }

        } catch(e) {
          console.error("Error precargando foto",e);
          s.fotoBase64Cropped=null;
        }
      }
    }

    const mapaImg = await generarMapaInmuebles(inmuebles, modo==="mobile");

    let seleccionadas = camposDisponibles.filter(c=>{
      const chk=document.getElementById("chk-"+c.key);
      return chk && chk.checked;
    });

    if (seleccionadas.length===0) {
      alert("Debes seleccionar al menos un campo.");
      hideLoader();
      return;
    }

    seleccionadas.sort((a,b)=>a.index-b.index);

    function drawImageFromRaw(raw,cell,doc){
      const base64 = raw.fotoBase64Cropped;
      if(!base64) return;
      const side=30;
      const x=cell.x+(cell.width-side)/2;
      const y=cell.y+(cell.height-side)/2;
      doc.addImage(base64,"JPEG",x,y,side,side);
    }

    if (modo==="landscape") {

      const camposLimitados = seleccionadas.slice(0,7);
      const headers=["#",...camposLimitados.map(c=>c.label)];

      const rows = inmuebles.map((s,i)=>{

        const isSelected = selectedSet.has(s.id || s.uid || s.URL);

        const fila=[`${i+1}`];

        camposLimitados.forEach(campo=>{
          if(campo.key==="des") fila.push(s.des||"-");
          else if(campo.key==="foto") fila.push(s.fotoBase64Cropped ? {content:"",...s} : "-");
          else fila.push(
            ["precio","precio_m2","precioDelM2","precioM2","precioM2C","precioM2T"].includes(campo.key)
            ? formatCurrency(s[campo.key])
            : (s[campo.key]||"-")
          );
        });

        fila.__selected = isSelected;
        fila.__acm = s.__acm===true;
        return fila;

      });

      if(mapaImg){
        doc.addImage(mapaImg.data,"PNG",15,28,260,160);
        doc.addPage();
      }

      const chunkSize=5;

      for(let i=0;i<rows.length;i+=chunkSize){

        const chunk=rows.slice(i,i+chunkSize);

        doc.autoTable({

          head:[headers],
          body:chunk,
          startY:10,
          margin:{bottom:15},
          styles:{fontSize:9,cellPadding:3,valign:"top"},
          columnStyles:{0:{cellWidth:12},1:{cellWidth:30}},
          headStyles:{fillColor:[76,175,80],textColor:255,halign:"center"},
          theme:"grid",

          didParseCell:function(data){

            if(data.row.raw && data.row.raw.__selected){
              data.cell.styles.lineColor=[0,180,0];
              data.cell.styles.lineWidth=0.6;
            }

            if(data.row.raw && data.row.raw.__acm){
              data.cell.styles.lineColor=[0,102,255];
              data.cell.styles.lineWidth=0.8;
              data.cell.styles.fillColor=[235,243,255]; // fondo azul suave
            }

            if(data.cell.raw && data.cell.raw.fotoBase64Cropped){
              data.cell.styles.minCellHeight=32;
            }

          },

          didDrawCell:function(data){
            if(data.cell.raw && data.cell.raw.fotoBase64Cropped){
              drawImageFromRaw(data.cell.raw,data.cell,doc);
            }
          }
          didDrawPage:function(data){drawFooterAgente(doc);}
        });

        if(i+chunkSize<rows.length) doc.addPage();

      }

    }

    if(modo==="mobile"){

      const inmueblesLimitados=inmuebles.slice(0,5);
      const headers=["Campo",...inmueblesLimitados.map((s,i)=>`#${i+1}`)];

      const rows = seleccionadas.map(campo=>{

        const fila=[campo.label];

        inmueblesLimitados.forEach(s=>{
          if(campo.key==="des") fila.push(s.des||"-");
          else if(campo.key==="foto") fila.push(s.fotoBase64Cropped ? {content:"",...s} : "-");
          else fila.push(
            ["precio","precio_m2","precioDelM2","precioM2","precioM2C","precioM2T"].includes(campo.key)
            ? formatCurrency(s[campo.key])
            : (s[campo.key]||"-")
          );
        });

        return fila;

      });

      const colAnchoFoto=30;
      const tableWidth=doc.internal.pageSize.getWidth()-10;
      let anchoCampo=tableWidth-(inmueblesLimitados.length*colAnchoFoto);
      anchoCampo=anchoCampo*0.75;

      if(mapaImg) doc.addImage(mapaImg.data,"PNG",14,30,190,80);

      doc.autoTable({

        head:[headers],
        body:rows,
        startY:mapaImg?115:30,
        styles:{fontSize:9,cellPadding:3,valign:"top"},
        headStyles:{fillColor:[76,175,80],textColor:255,halign:"center"},
        theme:"grid",

        columnStyles:Object.assign(
          {0:{cellWidth:anchoCampo}},
          Object.fromEntries(inmueblesLimitados.map((_,i)=>[i+1,{cellWidth:colAnchoFoto}]))
        ),

        didParseCell:function(data){

          if(data.row.raw && data.row.raw.__selected){
            data.cell.styles.lineColor=[0,180,0];
            data.cell.styles.lineWidth=0.6;
          }

          if(data.row.raw && data.row.raw.__acm){
            data.cell.styles.lineColor=[0,102,255];
            data.cell.styles.lineWidth=0.8;
            data.cell.styles.fillColor=[235,243,255]; // fondo azul suave
          }

          if(data.cell.raw && data.cell.raw.fotoBase64Cropped){
            data.cell.styles.minCellHeight=32;
          }

        },

        didDrawCell:function(data){
          if(data.cell.raw && data.cell.raw.fotoBase64Cropped){
            drawImageFromRaw(data.cell.raw,data.cell,doc);
          }
        }
        didDrawPage:function(data){drawFooterAgente(doc);}
      });

    }

    doc.save("brochure-inmuebles.pdf");

  } catch(err) {

    alert("Hubo un error al generar el PDF: "+(err && err.message ? err.message : err));

  } finally {

    hideLoader();

  }

}

/** --------------------------------------------------------------------------------------------- insertarInmuebleACM
 * Crea e inserta el inmueble generado desde ACM para el PDF
 */
  function insertarInmuebleACM(inmuebles) {try {
    if (!$("#pdf-include-acm").prop("checked")) return inmuebles;
    const estimadoTxt = $("#acm-estimado").text().trim();
    if (!estimadoTxt) return inmuebles;

    // extraer número limpio
    const precio = parseFloat(estimadoTxt.replace(/[^\d.,]/g,"").replace(/\./g,"").replace(",","."));
    if (!precio || isNaN(precio)) return inmuebles;

    // evitar duplicado si ya existe
    if (inmuebles.some(i => i && i.__acm)) return inmuebles;

    // validar imagen
    let img = ($("#pdf-acm-img").val() || "").trim();
    const imgValida = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(img);

    const foto = imgValida
      ? img
      : "https://statetty.com/assets/images/ui/tuinmueble.jpg";

    const m2c = parseFloat($("#acm-m2c").val()) || null;
    const m2t = parseFloat($("#acm-m2t").val()) || null;

    const precioM2C = (precio && m2c) ? precio / m2c : null;
    const precioM2T = (precio && m2t) ? precio / m2t : null;

    const tipo = $("#acm-tipo").val() || null;

    // datos de agente desde URL
    const params = new URLSearchParams(window.location.search);
    const na = params.get("na") || null;
    const an = params.get("an") || null;
    const ag = params.get("ag") || null;

    const inmuebleACM = {

      __acm: true, // marca interna para evitar duplicados

      precio: precio,
      m2construccion: m2c,
      m2terreno: m2t,

      precioM2C: precioM2C,
      precioM2T: precioM2T,

      tipoInmueble: tipo,
      tipoNegocio: (precio >= 10000 ? "Venta" : "Alquiler"),

      Titulo: `Inmueble analizado por USD${formatNumber(precio)},00`,
      foto: foto,
      nombre: "Inmueble analizado",

      agentName: na,
      agentPhone: an,
      broker:     ag,

      des: "Inmueble estimado mediante Análisis Comparativo de Mercado (ACM).",

      uid: "ACM_" + Date.now(),
      fechaIngreso: new Date().toISOString(),
      tiempoOfertado: 0

    };

    const nuevaLista = [...inmuebles, inmuebleACM];

    // ordenar por precio ascendente
    nuevaLista.sort((a,b)=>(parseFloat(a.precio)||0)-(parseFloat(b.precio)||0));

    return nuevaLista;

  } catch (e) {console.log("Error insertarInmuebleACM:", e);return inmuebles;}}


$(document).ready(function(){
  initPDFACMImageToggle();
  syncPDFACMVisibility()
});