// ---------------------------------------------
// inmueblesPdf.js - Generador de brochure PDF con selección de columnas
// ---------------------------------------------

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
// index => define posición relativa
// ---------------------------------------------
const camposDisponibles = [
  { key: "foto",            label: "Foto",            index: 1 },
  { key: "Titulo",          label: "Título",          index: 2 },
  { key: "nombre",          label: "Nombre",          index: 3 },
  { key: "precio",          label: "Precio",          index: 4 },
  { key: "dir",             label: "Dirección",       index: 5 },
  { key: "des",             label: "Descripción",     index: 6 },
  { key: "m2construccion",  label: "m2 construcción", index: 7 },
  { key: "m2terreno",       label: "m2 terreno",      index: 8 },
  { key: "precioM2",        label: "Precio del m2",   index: 9 },
  { key: "ambientes",       label: "Ambientes",       index: 10 },
  { key: "dormitorios",     label: "Dormitorios",     index: 11 },
  { key: "baños",           label: "Baños",           index: 12 },
  { key: "broker",          label: "Agencia",         index: 13 },
  { key: "agentName",       label: "Agente",          index: 14 },  
  { key: "agentPhon",       label: "Teléfono",        index: 15 },
  { key: "URL",             label: "URL",             index: 16 },
  { key: "lat",             label: "Latitud",         index: 17 },
  { key: "lng",             label: "Longitud",        index: 18 },
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
    mapDiv.style.height = vertical ? "600px" : "400px";
    mapDiv.style.position = "absolute";
    mapDiv.style.left = "-9999px";
    document.body.appendChild(mapDiv);

    const map = L.map(mapDiv, { zoomControl: !vertical });
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
        html2canvas(mapDiv, { useCORS: true }).then(canvas => {
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

    // Título y fecha
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Comparativa de Inmuebles", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
    const fechaHoy = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text(fechaHoy, 15, 22);

    // Ordenar inmuebles por precio
    seleccionados.sort((a, b) => (parseFloat(a.precio) || 0) - (parseFloat(b.precio) || 0));

    // Generar mapa
    const mapaImg = await generarMapaInmuebles(seleccionados, modo === "mobile");
    if (mapaImg) {
      if (modo === "mobile") {
        doc.addImage(mapaImg.data, "PNG", 15, 30, 180, 120);
      } else {
        doc.addImage(mapaImg.data, "PNG", 15, 28, 260, 100);
      }
    }

    // Campos seleccionados
    let seleccionadas = camposDisponibles.filter(c => {
      const chk = document.getElementById("chk-" + c.key);
      return chk && chk.checked;
    });
    if (seleccionadas.length === 0) {
      alert("Debes seleccionar al menos un campo.");
      hideLoader(); return;
    }

    // ✅ Ordenar por index
    seleccionadas.sort((a, b) => a.index - b.index);

    // ✅ Landscape → tabla normal
    if (modo === "landscape") {
      const headers = ["Inmueble", ...seleccionadas.map(c => c.label)];
      const rows = seleccionados.map((s, i) => {
        const fila = [`${i + 1}`];
        seleccionadas.forEach(campo => {
          if (campo.key === "des") fila.push(s.des || "-");
          else if (campo.key === "foto") fila.push(s.foto ? { content: "", fotoUrl: s.foto } : "-");
          else fila.push(["precio","precio_m2","precioDelM2","precioM2"].includes(campo.key) ? formatCurrency(s[campo.key]) : (s[campo.key] || "-"));
        });
        return fila;
      });

      doc.autoTable({
        head: [headers], body: rows, startY: mapaImg ? 135 : 30,
        styles: { fontSize: 9, cellPadding: 3, valign: "top" },
        headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: "center" },
        theme: "grid",
        didDrawCell: async function (data) {
          if (data.cell.raw && data.cell.raw.fotoUrl) {
            try {
              const imgData = await fetch(data.cell.raw.fotoUrl).then(r => r.blob());
              const reader = new FileReader();
              reader.onload = function () {
                const img = reader.result;
                doc.addImage(img, "JPEG", data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2);
              };
              reader.readAsDataURL(imgData);
            } catch (e) { console.error("No se pudo cargar la imagen", e); }
          }
        }
      });
    }

    // ✅ Mobile → tabla girada (máx 5 inmuebles como columnas)
    if (modo === "mobile") {
      const inmueblesLimitados = seleccionados.slice(0, 5);
      const headers = ["Campo", ...inmueblesLimitados.map((s, i) => `#${i + 1}`)];
      const rows = seleccionadas.map(campo => {
        const fila = [campo.label];
        inmueblesLimitados.forEach(s => {
          if (campo.key === "des") fila.push(s.des || "-");
          else if (campo.key === "foto") fila.push(s.foto ? { content: "", fotoUrl: s.foto } : "-");
          else fila.push(["precio","precio_m2","precioDelM2","precioM2"].includes(campo.key) ? formatCurrency(s[campo.key]) : (s[campo.key] || "-"));
        });
        return fila;
      });

      doc.autoTable({
        head: [headers], body: rows, startY: mapaImg ? 160 : 30,
        styles: { fontSize: 9, cellPadding: 3, valign: "top" },
        headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: "center" },
        theme: "grid",
        didDrawCell: async function (data) {
          if (data.cell.raw && data.cell.raw.fotoUrl) {
            try {
              const imgData = await fetch(data.cell.raw.fotoUrl).then(r => r.blob());
              const reader = new FileReader();
              reader.onload = function () {
                const img = reader.result;
                doc.addImage(img, "JPEG", data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2);
              };
              reader.readAsDataURL(imgData);
            } catch (e) { console.error("No se pudo cargar la imagen", e); }
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
    alert("Hubo un error al generar el PDF: " + err.message);
  } finally {
    hideLoader();
  }
}
