// ---------------------------------------------
// acmPdf.js - Informe ACM imprimible (A4 vertical, multipágina)
// ---------------------------------------------
// Documento PROPIO del análisis automático (plan acm-buscador, D8): no es el
// brochure de inmueblesPdf.js. Consume window.__acmData (respuesta de
// POST /statetty/acm) y renderiza con jsPDF + autotable, cargados bajo
// demanda por CDN como hace inmueblesPdf.js.
//
// Uso: window.STT_ACM_PDF.imprimir(window.__acmData)

(function () {
  var JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  var AUTOTABLE_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js";

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + url + '"]')) { resolve(); return; }
      var s = document.createElement("script");
      s.src = url;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Error al cargar " + url)); };
      document.head.appendChild(s);
    });
  }

  function usd(n) { return n == null ? "—" : "USD " + Math.round(n).toLocaleString("en-US"); }
  function num(n) { return n == null ? "—" : Math.round(n).toLocaleString("en-US"); }
  function txt(s) { return (s == null ? "" : String(s)).replace(/\*\*/g, ""); }

  function pieDePagina(doc, data, pagina) {
    var w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120);
    var usuario = (window.STT && window.STT.getUsuario) ? window.STT.getUsuario() : null;
    var agente = usuario ? [usuario.nombre || [usuario.first_name, usuario.last_name].filter(Boolean).join(" "), usuario.agencia, usuario.waphone].filter(Boolean).join(" · ") : "";
    doc.text(agente, w - 10, h - 5, { align: "right" });
    doc.text("Statetty · " + (data.meta && data.meta.fecha ? data.meta.fecha.slice(0, 10) : "") + " · pág. " + pagina, 10, h - 5);
    doc.setTextColor(0);
  }

  function tituloSeccion(doc, t, y) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(t, 14, y);
    doc.setDrawColor(23, 186, 239); doc.setLineWidth(0.6);
    doc.line(14, y + 1.5, 196, y + 1.5);
    return y + 7;
  }

  function parrafo(doc, texto, y, alto) {
    if (!texto) return y;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    var lineas = doc.splitTextToSize(txt(texto), 182);
    doc.text(lineas, 14, y);
    return y + lineas.length * 4.6 + (alto || 2);
  }

  function tabla(doc, head, rows, y) {
    doc.autoTable({
      startY: y, head: [head], body: rows,
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: [23, 186, 239], textColor: 255 },
      margin: { left: 14, right: 14 }
    });
    return doc.lastAutoTable.finalY + 6;
  }

  function fichaRow(i) {
    return [
      txt(i.titulo || i.nombre || i.direccion || "").slice(0, 60),
      i.tipoInmueble || "-",
      usd(i.precio),
      i.m2c ? num(i.m2c) : (i.m2t ? num(i.m2t) : "-"),
      i.dormitorios != null ? i.dormitorios : "-",
      i.domDias != null ? i.domDias + " d" : (i.tOfertado != null ? i.tOfertado + " m" : "-")
    ];
  }

  async function imprimir(data) {
    if (!data || !data.ok) { alert("No hay datos de ACM para imprimir."); return; }
    try {
      if (typeof showLoader === "function") showLoader();
      await loadScript(JSPDF_URL);
      await loadScript(AUTOTABLE_URL);
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF("p", "mm", "a4");
      var s = data.sujeto || {}, z = data.zona || {}, e = data.estimacion || {},
        c = data.competencia || {}, h = data.historial || {}, i = data.ingreso || {},
        t = data.textos || {}, ti = data.tierra || {};

      // ── Portada / ficha del sujeto ──────────────────────────────────────
      doc.setFont("helvetica", "bold"); doc.setFontSize(20);
      doc.text("Análisis Comparativo de Mercado", 14, 22);
      doc.setFontSize(11); doc.setFont("helvetica", "normal");
      doc.text("Informe generado por Statetty · " + (data.meta && data.meta.fecha ? data.meta.fecha.slice(0, 10) : ""), 14, 30);

      var y = tituloSeccion(doc, "Inmueble evaluado", 40);
      var filaSujeto = [
        ["Tipo", s.tipo || "—"],
        ["Coordenadas", (s.lat != null ? s.lat.toFixed(5) + ", " + s.lng.toFixed(5) : "—") + (s.fuenteCoords ? " (" + s.fuenteCoords + ")" : "")],
        ["Operación", (s.operacion || "—") + (s.operacionInferida ? " (inferida del precio)" : "")],
        ["m² construcción", s.m2c != null ? num(s.m2c) : "—"],
        ["m² terreno", s.m2t != null ? num(s.m2t) : "—"],
        ["Dormitorios / baños", (s.dormitorios != null ? s.dormitorios : "—") + " / " + (s.banos != null ? s.banos : "—")],
        ["Precio pensado", s.precioSupuesto != null ? usd(s.precioSupuesto) + (s.rango ? "  ·  rango " + usd(s.rango[0]) + " – " + usd(s.rango[1]) : "") : "—"]
      ];
      y = tabla(doc, ["Dato", "Valor"], filaSujeto, y);

      y = parrafo(doc, t.resumen, y + 2);

      // ── La zona ─────────────────────────────────────────────────────────
      y = tituloSeccion(doc, "La zona", y + 4);
      var filasZona = [];
      if (z.nombre) filasZona.push(["Zona", z.nombre]);
      if (z.anillo != null) filasZona.push(["Anillo / distancia al centro", "Anillo " + z.anillo + " · " + (z.distanciaCentroKm || "—") + " km"]);
      if (z.ruido && z.ruido.index != null) filasZona.push(["Ruido", z.ruido.index + "/100 " + (z.ruido.etiqueta || "") + (z.ruido.pctCiudad != null ? " (percentil " + z.ruido.pctCiudad + " de la ciudad)" : "")]);
      if (z.micros && z.micros.mobilityScore != null) filasZona.push(["Movilidad", "score " + z.micros.mobilityScore + "/100 · " + (z.micros.lineas150m || 0) + " líneas a <150 m" + (z.micros.puntaMasCercanaM != null ? " · punta de ruta a " + z.micros.puntaMasCercanaM + " m" : "")]);
      if (z.verde && z.verde.greenIndex != null) filasZona.push(["Verde", "índice " + Math.round(z.verde.greenIndex) + "/100" + (z.verde.pctCiudad != null ? " (percentil " + z.verde.pctCiudad + ")" : "")]);
      if (z.nse && z.nse.nse != null) filasZona.push(["Nivel socioeconómico", z.nse.nse + "/100" + (z.nse.decil != null ? " · decil " + z.nse.decil : "") + (z.nse.ingresoEst != null ? " · ingreso est. Bs " + num(z.nse.ingresoEst) : "")]);
      if (ti.usdM2) filasZona.push(["Valor de la tierra", usd(ti.usdM2) + "/m² (" + (ti.activosN + ti.inactivosN) + " lotes)"]);
      if (z.mercado && z.mercado.medianPrice) filasZona.push(["Mercado de la celda", num(z.mercado.listingCount) + " ofertas · mediana " + usd(z.mercado.medianPrice) + (z.mercado.tendencia90dPct != null ? " · tendencia 90d " + (z.mercado.tendencia90dPct > 0 ? "+" : "") + z.mercado.tendencia90dPct + "%" : "")]);
      (z.referencias || []).slice(0, 3).forEach(function (r) { filasZona.push(["Referencia", r.nombre + " · " + r.distM + " m"]); });
      if (filasZona.length) y = tabla(doc, ["Indicador", "Valor"], filasZona, y);
      y = parrafo(doc, t.zona, y);

      // ── Nueva página: competencia ───────────────────────────────────────
      doc.addPage(); y = tituloSeccion(doc, "Competencia activa", 20);
      y = parrafo(doc, t.competencia, y);
      if (c.items && c.items.length) {
        y = tabla(doc, ["Inmueble", "Tipo", "Precio", "m²", "Dorm", "Ofertado"],
          c.items.map(fichaRow), y);
      }

      // ── Historial ───────────────────────────────────────────────────────
      y = tituloSeccion(doc, "Historial de retiradas (" + (h.ventanaMeses || 24) + " meses)", y + 4);
      y = parrafo(doc, t.historial, y);
      if (h.items && h.items.length) {
        y = tabla(doc, ["Inmueble", "Tipo", "Precio", "m²", "Dorm", "Días hasta retiro"],
          h.items.map(fichaRow), y);
      }
      y = parrafo(doc, t.notaDesactivacion, y);

      // ── Zonas comparables ───────────────────────────────────────────────
      if (data.zonasComparables && data.zonasComparables.length) {
        y = tituloSeccion(doc, "Zonas comparables de la ciudad", y + 4);
        y = tabla(doc, ["Zona", "Precio mediano", "USD/m²", "Dif. %", "Dist."],
          data.zonasComparables.map(function (zc) {
            return [zc.zona || zc.cellId, usd(zc.medianPrice), zc.pm2Mediano ? usd(zc.pm2Mediano) : "—",
              zc.diferenciaPct != null ? (zc.diferenciaPct > 0 ? "+" : "") + zc.diferenciaPct + "%" : "—",
              zc.distKm != null ? zc.distKm + " km" : "—"];
          }), y);
        y = parrafo(doc, t.comparativa, y);
      }

      // ── Estrategia de precio ────────────────────────────────────────────
      doc.addPage(); y = tituloSeccion(doc, "Estrategia de precio", 20);
      if (e.valor) {
        y = tabla(doc, ["Escenario", "Precio"],
          [["Venta rápida", usd(e.rapido)],
           ["Precio objetivo", usd(e.objetivo)],
           ["Posicionamiento alto", usd(e.agresivo)],
           ["Cierre realista estimado", usd(e.precioCierreEst)]], y);
      }
      y = parrafo(doc, t.estrategia, y);

      // ── Ingreso potencial ───────────────────────────────────────────────
      if (t.ingreso || i.alquilerIdeal) {
        y = tituloSeccion(doc, "Ingreso potencial", y + 4);
        var filasIng = [];
        if (i.alquilerIdeal) filasIng.push(["Alquiler ideal", usd(i.alquilerIdeal) + "/mes" + (i.alquilerRango ? " (rango " + usd(i.alquilerRango[0]) + "–" + usd(i.alquilerRango[1]) + ")" : "")]);
        if (i.capRateZona != null) filasIng.push(["Cap rate de la zona", "~" + i.capRateZona + "% anual"]);
        if (i.ingresoComercialMes) filasIng.push(["Uso comercial", "~" + usd(i.ingresoComercialMes) + "/mes (USD " + i.comercialPm2 + "/m²)" + (i.yieldComercial ? " · yield " + i.yieldComercial + "%" : "")]);
        if (filasIng.length) y = tabla(doc, ["Concepto", "Valor"], filasIng, y);
        y = parrafo(doc, t.ingreso, y);
      }

      // ── Metodología y limitaciones ──────────────────────────────────────
      y = tituloSeccion(doc, "Metodología y limitaciones", y + 4);
      y = parrafo(doc, t.metodologia, y);
      if (data.limitaciones && data.limitaciones.length) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
        data.limitaciones.forEach(function (l) {
          var ls = doc.splitTextToSize("• " + txt(l), 182);
          doc.text(ls, 14, y); y += ls.length * 4 + 1;
        });
        doc.setTextColor(0);
      }

      // Pie en todas las páginas
      var total = doc.internal.getNumberOfPages();
      for (var p = 1; p <= total; p++) { doc.setPage(p); pieDePagina(doc, data, p); }

      var nombre = "ACM_" + (s.tipo || "inmueble") + "_" + (data.meta && data.meta.fecha ? data.meta.fecha.slice(0, 10) : "informe") + ".pdf";
      doc.save(nombre.replace(/[^\w.-]+/g, "_"));
    } catch (err) {
      console.log("[Statetty] [error] STT_ACM_PDF.imprimir:", err);
      alert("No se pudo generar el PDF del ACM.");
    } finally {
      if (typeof hideLoader === "function") hideLoader();
    }
  }

  window.STT_ACM_PDF = { imprimir: imprimir };
})();
