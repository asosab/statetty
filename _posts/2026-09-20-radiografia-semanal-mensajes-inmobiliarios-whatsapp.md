---
layout: page
title: "Radiografía semanal: lo que se pide y se ofrece en los grupos inmobiliarios de WhatsApp"
date: 2026-09-20
categories: mercado-inmobiliario, whatsapp, analisis-de-datos
comments: true
description: "Analizamos 2 mensajes de grupos inmobiliarios de WhatsApp entre el 13 de septiembre de 2026 y el 20 de septiembre de 2026, para entender qué buscan los clientes y qué está ofreciendo el mercado."
tags: [mercado inmobiliario, whatsapp, oferta y demanda, bolivia, agentes inmobiliarios, tendencias inmobiliarias]
published: true
---

Cada semana, cientos de personas piden y ofrecen casas, departamentos y terrenos en los grupos inmobiliarios de WhatsApp. Analizamos esa conversación entre el 13 de septiembre de 2026 y el 20 de septiembre de 2026 para entender hacia dónde se mueve realmente la demanda y qué está respondiendo el mercado.

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>

## La semana en números

<div style="display:flex;flex-wrap:wrap;gap:16px;margin:24px 0;">
  <div style="flex:1;min-width:200px;background:#f5f7fa;border-radius:12px;padding:20px;text-align:center;">
    <div style="font-size:2rem;font-weight:700;color:#1a73e8;">2</div>
    <div style="color:#555;">Mensajes analizados</div>
  </div>
  <div style="flex:1;min-width:200px;background:#f5f7fa;border-radius:12px;padding:20px;text-align:center;">
    <div style="font-size:2rem;font-weight:700;color:#1a73e8;">2</div>
    <div style="color:#555;">Requerimientos de clientes</div>
  </div>
  <div style="flex:1;min-width:200px;background:#f5f7fa;border-radius:12px;padding:20px;text-align:center;">
    <div style="font-size:2rem;font-weight:700;color:#1a73e8;">0</div>
    <div style="color:#555;">Ofertas publicadas</div>
  </div>
</div>

## Qué tipo de negocio predomina

<div style="max-width:600px;margin:24px auto;">
  <canvas id="chartTipoNegocio"></canvas>
</div>

## Qué tipo de inmueble se mueve más en las conversaciones

<div style="max-width:700px;margin:24px auto;">
  <canvas id="chartTipoInmueble"></canvas>
</div>

## Zonas donde piden versus zonas donde se ofrece

<div style="max-width:750px;margin:24px auto;">
  <canvas id="chartZonas"></canvas>
</div>

Estas son las zonas donde la diferencia entre lo que se pide y lo que se ofrece es más marcada:

- **Equipetrol**: 0 ofertas contra 1 requerimientos. demanda sin ninguna oferta registrada, oportunidad clara para captar.
- **Urubó**: 0 ofertas contra 1 requerimientos. demanda sin ninguna oferta registrada, oportunidad clara para captar.

## Conclusiones para agentes

- **Confianza en el dato**: el 50% de los mensajes de la semana trajo alguna alerta de calidad (precio ambiguo, ubicación sin resolver, etc.), un buen recordatorio de revisar el detalle antes de responder a un cliente.
- **Zona a priorizar**: Equipetrol muestra la mayor brecha entre oferta y demanda de la semana (demanda sin ninguna oferta registrada, oportunidad clara para captar).
- **Lo que más pide el cliente**: 3 dormitorios, garaje, amoblado.

## Nota metodológica

Este resumen se generó automáticamente a partir de 2 mensajes de grupos inmobiliarios de WhatsApp procesados entre el 13 de septiembre de 2026 y el 20 de septiembre de 2026. Los precios se calcularon solo con datos donde la moneda quedó identificada con claridad y con un mínimo de 3 registros por combinación de negocio, tipo de inmueble y zona.

<script>
(function() {
  const palette = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#a142f4', '#00acc1', '#ff7043', '#9e9d24', '#5c6bc0', '#26a69a'];
  const baseOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  };

  new Chart(document.getElementById('chartTipoNegocio'), {
    type: 'doughnut',
    data: {
      labels: ["venta","alquiler"],
      datasets: [{ data: [1,1], backgroundColor: palette }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Distribución por tipo de negocio' } } }
  });

  new Chart(document.getElementById('chartTipoInmueble'), {
    type: 'bar',
    data: {
      labels: ["casa","departamento"],
      datasets: [{ label: 'Menciones', data: [1,1], backgroundColor: palette }]
    },
    options: Object.assign({}, baseOptions, { plugins: { legend: { display: false }, title: { display: true, text: 'Tipo de inmueble más mencionado' } }, indexAxis: 'y' })
  });

  new Chart(document.getElementById('chartZonas'), {
    type: 'bar',
    data: {
      labels: ["Equipetrol","Urubó"],
      datasets: [
        { label: 'Ofertas', data: [0,0], backgroundColor: '#1a73e8' },
        { label: 'Requerimientos', data: [1,1], backgroundColor: '#ea4335' }
      ]
    },
    options: Object.assign({}, baseOptions, { plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Oferta vs. demanda por zona' } }, indexAxis: 'y' })
  });

})();
</script>
