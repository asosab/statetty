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

// Dibuja los checkboxes debajo del botón PDF (en grid de 4 columnas)
function renderColumnSelector() {
  if (document.getElementById("column-selector")) return;

  const container = document.createElement("div");
  container.id = "column-selector";
  container.style.marginTop = "10px";
  container.innerHTML = "<b>Selecciona campos a incluir:</b><br>";

  // grid de 4 columnas
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, 1fr)";
  grid.style.gap = "6px 12px";  // filas y columnas

  camposDisponibles.forEach(campo => {
    const id = "chk-" + campo.key;

    // 1. Valor guardado en localStorage (si existe)
    let saved = localStorage.getItem("col_" + campo.key);
    if (saved !== null) {saved = saved === "true"; }

    // 2. Si no hay en localStorage, usamos la config de mapa.js
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

    // 3. Guardar cambios cuando el usuario lo modifique
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
    const doc = new jsPDF("l", "mm", "a4"); // horizontal

    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Comparativa de Inmuebles", 148, 15, { align: "center" });

    // Leer columnas seleccionadas (foto primero, precio después)
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
      if (a.key === "foto") return -1; // foto siempre primero
      if (b.key === "foto") return 1;

      if (a.key === "precio" && b.key !== "foto") return -1; 
      if (b.key === "precio" && a.key !== "foto") return 1;

      return 0;
    });


    // Encabezados: primera columna = Inmueble
    const headers = ["Inmueble", ...seleccionadas.map(c => c.label)];

    // Filas: cada inmueble es una fila
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
          // Si es un campo de precio, formatear
          if (["precio", "precio_m2", "precioDelM2", "precioM2"].includes(campo.key)) {
            fila.push(formatCurrency(s[campo.key]));
          } else {
            fila.push(s[campo.key] || "-");
          }
        }
      });
      return fila;
    });

    // Generar tabla
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 25,
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

    // Pie de página con agente, agencia y número si existen
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

    // Guardar PDF
    doc.save("brochure-inmuebles.pdf");

  } catch (err) {
    alert("Hubo un error al generar el PDF: " + err.message);
  } finally {
    hideLoader();
  }
}

