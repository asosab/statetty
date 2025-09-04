// ---------------------------------------------
// inmueblesPdf.js - Generador de brochure PDF con loader
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

    // Construcción de la tabla comparativa
    const headers = ["Característica", ...seleccionados.map((s, i) => `Inmueble ${i + 1}`)];

    const rows = [
      ["Nombre", ...seleccionados.map(s => s.nombre || "-")],
      ["Dirección", ...seleccionados.map(s => s.dir || "-")],
      ["Descripción", ...seleccionados.map(s => s.des || "-")],
      ["Precio (USD)", ...seleccionados.map(s => s.precio ? s.precio.toLocaleString("es-BO") : "-")]
    ];

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 25,
      styles: { fontSize: 9, cellPadding: 3, valign: "top" },
      headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: "center" },
      columnStyles: { 0: { cellWidth: 35, fontStyle: "bold" } },
      theme: "grid",
    });

    doc.save("brochure-inmuebles.pdf");
  } catch (err) {
    alert("Hubo un error al generar el PDF: " + err.message);
  } finally {
    hideLoader();
  }
}
