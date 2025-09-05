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

// Campos disponibles en la hoja
const camposDisponibles = [
  { key: "Titulo", label: "Título" },
  { key: "lat", label: "Latitud" },
  { key: "lng", label: "Longitud" },
  { key: "dir", label: "Dirección" },
  { key: "URL", label: "URL" }, 
  { key: "des", label: "Descripción" }, 
  { key: "ambientes", label: "Ambientes" },
  { key: "dormitorios", label: "Dormitorios" },
  { key: "baños", label: "Baños" },
  { key: "m2construccion", label: "m2 construcción" },
  { key: "m2terreno", label: "m2 terreno" },
  { key: "nombre", label: "Nombre original" },
  { key: "precioM2", label: "Precio del m2" },
  { key: "broker", label: "Agencia" },
  { key: "foto", label: "Foto" },
  { key: "precio", label: "Precio" },
  { key: "agentName", label: "Agente" },  
  { key: "agentPhon", label: "Teléfono"} 
];

// Renderiza los checkboxes de selección de columnas
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

// ✅ Generar mapa en cliente con Leaflet + html2canvas y escala automática
async function generarMapaInmuebles(inmuebles) {
  return new Promise(resolve => {
    if (!inmuebles || inmuebles.length === 0) return resolve(null);

    const coords = inmuebles.filter(s => s.lat && s.lng);
    if (coords.length === 0) return resolve(null);

    const mapDiv = document.createElement("div");
    mapDiv.style.width = "800px";
    mapDiv.style.height = "400px";
    mapDiv.style.position = "absolute";
    mapDiv.style.left = "-9999px"; // oculto fuera de pantalla
    document.body.appendChild(mapDiv);

    const map = L.map(mapDiv);

    const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      crossOrigin: true
    }).addTo(map);

    // Añadir marcadores numerados y recolectar para bounds
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
      const marker = L.marker([s.lat, s.lng], { icon }).addTo(map);
      group.push(marker);
    });

    // Ajustar vista para que todos los pines entren con margen
    const bounds = L.featureGroup(group).getBounds();
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 16,
      minZoom: 12
    });

    // Esperar a que los tiles terminen de cargar antes de capturar
    tileLayer.on("load", () => {
      setTimeout(() => {
        html2canvas(mapDiv, { useCORS: true }).then(canvas => {
          const imgData = canvas.toDataURL("image/png");
          document.body.removeChild(mapDiv);
          resolve({ data: imgData, type: "image/png" });
        });
      }, 500); // delay corto para asegurar render completo
    });
  });
}



async function generarBrochurePDF(seleccionados) {
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
    const doc = new jsPDF("l", "mm", "a4");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Comparativa de Inmuebles", 148, 15, { align: "center" });

    const fechaHoy = new Date().toLocaleDateString("es-ES", {
      year: "numeric", month: "long", day: "numeric"
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`${fechaHoy}`, 15, 22);

    const mapaImg = await generarMapaInmuebles(seleccionados);
    if (mapaImg) {
      doc.addImage(mapaImg.data, "PNG", 15, 28, 260, 100);
    }

    let seleccionadas = camposDisponibles.filter(c => {
      const chk = document.getElementById("chk-" + c.key);
      return chk && chk.checked;
    });

    if (seleccionadas.length === 0) {
      alert("Debes seleccionar al menos un campo.");
      hideLoader();
      return;
    }

    seleccionadas = seleccionadas.sort((a, b) => {
      if (a.key === "foto") return -1;
      if (b.key === "foto") return 1;
      if (a.key === "precio" && b.key !== "foto") return -1; 
      if (b.key === "precio" && a.key !== "foto") return 1;
      return 0;
    });

    const headers = ["Inmueble", ...seleccionadas.map(c => c.label)];

    const rows = seleccionados.map((s, i) => {
      const fila = [`${i + 1}`];
      seleccionadas.forEach(campo => {
        if (campo.key === "des") {
          fila.push(s.des || "-");
        } else if (campo.key === "foto") {
          if (s.foto) {
            fila.push({ content: "", fotoUrl: s.foto });
          } else {
            fila.push("-");
          }
        } else {
          if (["precio", "precio_m2", "precioDelM2", "precioM2"].includes(campo.key)) {
            fila.push(formatCurrency(s[campo.key]));
          } else {
            fila.push(s[campo.key] || "-");
          }
        }
      });
      return fila;
    });

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: mapaImg ? 135 : 30,
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
              let cellWidth = data.cell.width - 2;
              let cellHeight = data.cell.height - 2;
              doc.addImage(img, "JPEG", data.cell.x + 1, data.cell.y + 1, cellWidth, cellHeight);
            };
            reader.readAsDataURL(imgData);
          } catch (e) {
            console.error("No se pudo cargar la imagen", e);
          }
        }
      }
    });

    let footerText = "";
    if (typeof na !== "undefined" && na) footerText += na;
    if (typeof ag !== "undefined" && ag) footerText += " | " + ag;
    if (typeof an !== "undefined" && an) footerText += " | " + an;

    if (footerText) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.text(footerText, 15, pageHeight - 10);
    }

    doc.save("brochure-inmuebles.pdf");

  } catch (err) {
    alert("Hubo un error al generar el PDF: " + err.message);
  } finally {
    hideLoader();
  }
}
