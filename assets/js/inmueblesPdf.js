// ---------------------------------------------
// inmueblesPdf.js - Generador de brochure PDF con selección de columnas
// ---------------------------------------------

function proxify(url) {
  if (!url) return url;
  return `https://ekvilibrolab.netlify.app/.netlify/functions/proxy-image?url=${encodeURIComponent(url)}`;
}

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
  { key: "agentPhone",       label: "Teléfono",        index: 15 },
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

function renderColumnSelector() {
  if (document.getElementById("column-selector")) return;

  const container = document.createElement("div");
  container.id = "column-selector";
  container.style.marginTop = "10px";
  container.innerHTML = "<b>Selecciona campos a incluir:</b><br>";

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
      attribution: "&copy; OpenStreetMap",
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
async function generarBrochurePDF(seleccionados, modo = "landscape") {
  if (!seleccionados || seleccionados.length === 0) {
    alert("No hay inmuebles seleccionados para generar el PDF.");
    return;
  }

  try {
    showLoader();
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(modo === "mobile" ? "p" : "l", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título y fecha
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Comparativa de Inmuebles", pageWidth / 2, 15, { align: "center" });
    const fechaHoy = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text(fechaHoy, 15, 22);

    // Ordenar inmuebles por precio
    seleccionados.sort((a, b) => (parseFloat(a.precio) || 0) - (parseFloat(b.precio) || 0));

    // 🔹 Precargar imágenes con caché seguro
    for (let s of seleccionados) {
      if (s.foto) {
        try {
          const cacheKey = "fotoCache_" + s.foto;
          window.__fotoCache = window.__fotoCache || {};

          // buscar en localStorage o memoria
          let cached = localStorage.getItem(cacheKey) || window.__fotoCache[cacheKey];

          if (cached) {
            s.fotoBase64Cropped = cached;
          } else {
            const base64 = await urlToBase64(s.foto);

            // medir dimensiones
            const dims = await new Promise(resolve => {
              const img = new Image();
              img.onload = () => resolve({ w: img.width, h: img.height });
              img.onerror = () => resolve({ w: null, h: null });
              img.src = base64;
            });

            if (dims.w && dims.h) {
              s.fotoBase64Cropped = await cropToSquare(base64, dims.w, dims.h);

              // intentar guardar en localStorage con limpieza automática
              try {
                localStorage.setItem(cacheKey, s.fotoBase64Cropped);
                localStorage.setItem(cacheKey + "_ts", Date.now().toString());
                limpiarFotoCache(50); // conservar solo 50 últimas
              } catch (e) {
                if (e.name === "QuotaExceededError" || e.code === 22) {
                  console.warn("⚠️ localStorage lleno, usando caché en memoria para", s.foto);
                  window.__fotoCache[cacheKey] = s.fotoBase64Cropped;
                } else {
                  console.error("Error guardando foto en cache", e);
                }
              }
            }
          }
        } catch (e) {
          console.error("Error precargando foto", e);
          s.fotoBase64Cropped = null;
        }
      }
    }

    // Generar mapa
    const mapaImg = await generarMapaInmuebles(seleccionados, modo === "mobile");

    // Campos seleccionados
    let seleccionadas = camposDisponibles.filter(c => {
      const chk = document.getElementById("chk-" + c.key);
      return chk && chk.checked;
    });
    if (seleccionadas.length === 0) {
      alert("Debes seleccionar al menos un campo.");
      hideLoader(); return;
    }
    seleccionadas.sort((a, b) => a.index - b.index);

    // Helper para dibujar imágenes cuadradas de 3 cm (≈30 mm)
    function drawImageFromRaw(raw, cell, doc) {
      const base64 = raw.fotoBase64Cropped;
      if (!base64) return;
      const side = 30; // mm
      const x = cell.x + (cell.width - side) / 2;
      const y = cell.y + (cell.height - side) / 2;
      doc.addImage(base64, "JPEG", x, y, side, side);
    }

    // ---------------------------------------------
    // Landscape (tabla en segunda página)
    // ---------------------------------------------
    if (modo === "landscape") {
      const camposLimitados = seleccionadas.slice(0, 7);
      const headers = ["#", ...camposLimitados.map(c => c.label)];

      // Armar filas
      const rows = seleccionados.map((s, i) => {
        const fila = [`${i + 1}`];
        camposLimitados.forEach(campo => {
          if (campo.key === "des") fila.push(s.des || "-");
          else if (campo.key === "foto") fila.push(s.fotoBase64Cropped ? { content: "", ...s } : "-");
          else fila.push(
            ["precio","precio_m2","precioDelM2","precioM2","precioM2C","precioM2T"].includes(campo.key)
              ? formatCurrency(s[campo.key])
              : (s[campo.key] || "-")
          );
        });
        return fila;
      });

      // Insertar mapa en la primera página
      if (mapaImg) {
        doc.addImage(mapaImg.data, "PNG", 15, 28, 260, 160);
        doc.addPage(); // 👉 tabla arranca en la segunda página
      }

      // Dividir filas en bloques de 4
      const chunkSize = 5;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);

        doc.autoTable({
          head: [headers],
          body: chunk,
          startY: 10,
          margin: { bottom: 15 },
          styles: { fontSize: 9, cellPadding: 3, valign: "top" },
          columnStyles: {
            0: { cellWidth: 12 },   // índice
            1: { cellWidth: 30 }    // fotos fijo 30mm
          },
          headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: "center" },
          theme: "grid",
          didParseCell: function (data) {
            if (data.cell.raw && data.cell.raw.fotoBase64Cropped) {
              data.cell.styles.minCellHeight = 32;
            }
          },
          didDrawCell: function (data) {
            if (data.cell.raw && data.cell.raw.fotoBase64Cropped) {
              drawImageFromRaw(data.cell.raw, data.cell, doc);
            }
          }
        });

        if (i + chunkSize < rows.length) doc.addPage();
      }
    }

    // ---------------------------------------------
    // Mobile (máx. 5 inmuebles, con ajustes)
    // ---------------------------------------------
    if (modo === "mobile") {
      const inmueblesLimitados = seleccionados.slice(0, 5);
      const headers = ["Campo", ...inmueblesLimitados.map((s, i) => `#${i + 1}`)];
      const rows = seleccionadas.map(campo => {
        const fila = [campo.label];
        inmueblesLimitados.forEach(s => {
          if (campo.key === "des") fila.push(s.des || "-");
          else if (campo.key === "foto") fila.push(s.fotoBase64Cropped ? { content: "", ...s } : "-");
          else fila.push(
            ["precio","precio_m2","precioDelM2","precioM2","precioM2C","precioM2T"].includes(campo.key)
              ? formatCurrency(s[campo.key])
              : (s[campo.key] || "-")
          );
        });
        return fila;
      });

      const colAnchoFoto = 30;
      const tableWidth = doc.internal.pageSize.getWidth() - 10; // margen lateral
      let anchoCampo = tableWidth - (inmueblesLimitados.length * colAnchoFoto);
      anchoCampo = anchoCampo * 0.75; // reducir la primera columna

      if (mapaImg) doc.addImage(mapaImg.data, "PNG", 15, 30, 185, 80);

      doc.autoTable({
        head: [headers],
        body: rows,
        startY: mapaImg ? 100 : 30,
        styles: { fontSize: 9, cellPadding: 3, valign: "top" },
        headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: "center" },
        theme: "grid",
        columnStyles: Object.assign(
          { 0: { cellWidth: anchoCampo } },
          Object.fromEntries(inmueblesLimitados.map((_, i) => [i + 1, { cellWidth: colAnchoFoto }]))
        ),
        didParseCell: function (data) {
          if (data.cell.raw && data.cell.raw.fotoBase64Cropped) {
            data.cell.styles.minCellHeight = 32;
          }
        },
        didDrawCell: function (data) {
          if (data.cell.raw && data.cell.raw.fotoBase64Cropped) {
            drawImageFromRaw(data.cell.raw, data.cell, doc);
          }
        }
      });
    }

    // Pie
    let footerText = "";
    if (typeof na !== "undefined" && na) footerText += na;
    if (typeof ag !== "undefined" && ag) footerText += " | " + ag;
    if (typeof an !== "undefined" && an) footerText += " | " + an;
    if (footerText) {
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(footerText, 15, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save("brochure-inmuebles.pdf");
  } catch (err) {
    alert("Hubo un error al generar el PDF: " + (err && err.message ? err.message : err));
  } finally {
    hideLoader();
  }
}

