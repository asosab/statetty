// ---------------------------------------------
// inmueblesPdf.js - Generador de brochure PDF con selección de columnas
// ---------------------------------------------

function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve(); // ya está cargado
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
  { key: "nombre", label: "Título" },
  { key: "lat", label: "Latitud" },
  { key: "lng", label: "Longitud" },
  { key: "dir", label: "Dirección" },
  { key: "des", label: "Descripción" }, // ya sanitizada
  { key: "ambientes", label: "Ambientes" },
  { key: "dormitorios", label: "Dormitorios" },
  { key: "baños", label: "Baños" },
  { key: "m2construccion", label: "m2 construcción" },
  { key: "m2terreno", label: "m2 terreno" },
  { key: "precioM2", label: "Precio del m2" },
  { key: "foto", label: "Foto (URL)" },
  { key: "precio", label: "Precio" },
  { key: "broker", label: "Broker" }
  { key: "URL", label: "URL" },           
  { key: "agentName", label: "Agente" },  
  { key: "agentPhone", label: "Teléfono"} 
];

// Dibuja los checkboxes debajo del botón PDF
function renderColumnSelector() {
  if (document.getElementById("column-selector")) return;

  const container = document.createElement("div");
  container.id = "column-selector";
  container.style.marginTop = "10px";
  container.innerHTML = "<b>Selecciona campos a incluir:</b><br>";

  camposDisponibles.forEach(campo => {
    const id = "chk-" + campo.key;
    container.innerHTML += `
      <label style="margin-right:10px;">
        <input type="checkbox" id="${id}" data-key="${campo.key}" checked>
        ${campo.label}
      </label>
    `;
  });

  const box = document.getElementById("sel-box");
  if (box) box.appendChild(container);
}

async function generarBrochurePDF(seleccionados) {
  if (!seleccionados || seleccionados.length === 0) {
    alert("No hay inmuebles seleccionados para generar el PDF.");
    return;
  }

  try {
    showLoader();

    // Cargar librerías si no están disponibles
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("l", "mm", "a4"); // horizontal para más columnas

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Brochure Comparativo de Inmuebles", 148, 15, { align: "center" });

    // Leer columnas seleccionadas
    const seleccionadas = camposDisponibles.filter(c => {
      const chk = document.getElementById("chk-" + c.key);
      return chk && chk.checked;
    });

    if (seleccionadas.length === 0) {
      alert("Debes seleccionar al menos un campo.");
      hideLoader();
      return;
    }

    // Construcción de la tabla comparativa
    const headers = ["Característica", ...seleccionados.map((s, i) => `Inmueble ${i + 1}`)];

    const rows = seleccionadas.map(campo => {
      return [campo.label, ...seleccionados.map(s => {
        if (campo.key === "des") return s.des || "-"; // usar descripción sanitizada
        if (campo.key === "foto") { if (s.foto) { return { content: "", fotoUrl: s.foto }; }return "-";}
        return s[campo.key] || "-";
      })];
    });

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 25,
      styles: { fontSize: 9, cellPadding: 3, valign: "top" },
      headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: "center" },
      columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } },
      theme: "grid",
      didDrawCell: async function (data) {
        if (data.cell.raw && data.cell.raw.fotoUrl) {
          try {
            const imgData = await fetch(data.cell.raw.fotoUrl).then(r => r.blob());
            const reader = new FileReader();
            reader.onload = function () {
              let img = reader.result;
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


    doc.save("brochure-inmuebles.pdf");
  } catch (err) {
    alert("Hubo un error al generar el PDF: " + err.message);
  } finally {
    hideLoader();
  }
}
