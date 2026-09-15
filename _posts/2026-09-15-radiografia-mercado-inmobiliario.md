---
layout: page
title: "El Mercado Inmobiliario en Datos: Radiografía de +99,000 Propiedades Activas en Bolivia y Perú"
date: 2026-09-15
categories: mercado-inmobiliario, analisis-de-datos
comments: true
description: "Analizamos más de 99,000 anuncios inmobiliarios activos en Bolivia y Perú para entender qué se vende, dónde y a qué precio. Datos, gráficas y conclusiones para agentes inmobiliarios."
tags: [mercado inmobiliario, bienes raíces, datos, bolivia, peru, tendencias inmobiliarias, agentes inmobiliarios, precios inmobiliarios]
published: true
image: "posts/260915-grafica-01.png"
---

<!-- ¿Sin tiempo para leer? Escucha el artículo en [Statetty Podcast](AGREGAR-LINK-DEL-EPISODIO) -->

Todos los días se publican, actualizan y eliminan miles de anuncios inmobiliarios en Bolivia y Perú. Pero pocas veces nos detenemos a mirar ese mercado en conjunto: ¿qué tipo de inmueble domina el mercado?, ¿en qué ciudades se concentra la oferta?, ¿cuánto cuesta realmente comprar o alquilar según el tipo de propiedad?

Para responder estas preguntas, analizamos la base activa de inmuebles de Statetty: **99,236 propiedades activas**, de las cuales el 97.4% cuenta con ubicación válida. Este artículo resume los hallazgos más relevantes, con gráficas interactivas, para que agentes y agencias inmobiliarias tomen decisiones basadas en datos reales del mercado.

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>

## Radiografía general del mercado

Antes de entrar en el detalle, estos son los números que dan contexto a todo el análisis:

<div style="display:flex;flex-wrap:wrap;gap:16px;margin:24px 0;">
  <div style="flex:1;min-width:200px;background:#f5f7fa;border-radius:12px;padding:20px;text-align:center;">
    <div style="font-size:2rem;font-weight:700;color:#1a73e8;">99,236</div>
    <div style="color:#555;">Propiedades activas analizadas</div>
  </div>
  <div style="flex:1;min-width:200px;background:#f5f7fa;border-radius:12px;padding:20px;text-align:center;">
    <div style="font-size:2rem;font-weight:700;color:#1a73e8;">96,666</div>
    <div style="color:#555;">Con ubicación válida (97.4%)</div>
  </div>
  <div style="flex:1;min-width:200px;background:#f5f7fa;border-radius:12px;padding:20px;text-align:center;">
    <div style="font-size:2rem;font-weight:700;color:#1a73e8;">2,649</div>
    <div style="color:#555;">Precios descartados por inconsistentes</div>
  </div>
</div>

Ese último dato importa: antes de calcular cualquier estadística de precio, descartamos 2,649 registros con precios inválidos o inconsistentes (ceros, valores absurdamente bajos o campos mal cargados). Es un recordatorio de algo que vemos todos los días en el sector: **la calidad del dato es tan importante como el dato mismo**.

## ¿Qué tipo de inmueble domina el mercado?

El departamento sigue siendo, por lejos, el producto estrella del mercado: representa **45% de todos los anuncios activos**, seguido de casas (19.7%) y terrenos (17.9%). Entre estos tres tipos concentran más del 82% de toda la oferta.

<div style="max-width:700px;margin:24px auto;">
  <canvas id="chartTipoInmueble"></canvas>
</div>

Lo interesante está en la "cola larga": más de 40 categorías distintas de inmueble (oficinas, locales, quintas, hoteles, depósitos, propiedades agrícolas, etc.) se reparten apenas el 18% restante. Para un agente generalista, especializarse en departamentos y casas sigue siendo la apuesta de mayor volumen; para un nicho, hay espacio real en categorías como oficinas o locales comerciales, donde la competencia es mucho menor.

## Venta, alquiler y otras modalidades de negocio

<div style="max-width:600px;margin:24px auto;">
  <canvas id="chartTipoNegocio"></canvas>
</div>

La venta domina con el 62% de los anuncios, frente a un 22% de alquiler. Llama la atención que un 15% de los anuncios no tiene especificado el tipo de negocio, lo que sugiere una oportunidad de mejora en la carga de datos por parte de agencias y portales: un anuncio sin esta información básica pierde visibilidad en filtros de búsqueda y, probablemente, oportunidades de contacto.

## ¿Dónde está la oferta? Ciudades con más inmuebles activos

<div style="max-width:750px;margin:24px auto;">
  <canvas id="chartCiudades"></canvas>
</div>

Lima concentra el 46% de todos los anuncios de la muestra, y Santa Cruz de la Sierra el 26%, consolidándose como los dos mercados más activos de la región. Les siguen La Paz y Cochabamba en Bolivia, y Arequipa en Perú. Fuera de estas capitales y ciudades intermedias, la oferta cae rápidamente: ciudades como Warnes, Piura, Tarija, Porongo o Beni ya representan menos del 0.5% del total cada una, lo que confirma que el mercado inmobiliario formal sigue muy concentrado en un puñado de ciudades grandes.

## Precios: lo que se esconde al mezclar venta y alquiler

Aquí está uno de los hallazgos más útiles del análisis. Si calculamos el precio "promedio" de un tipo de inmueble sin separar venta de alquiler, el número resultante puede ser engañoso: mezcla el valor de una propiedad en venta (cientos de miles de dólares) con una cuota mensual de alquiler (cientos de dólares), y termina distorsionando el panorama.

Por eso separamos los precios por tipo de negocio. La diferencia es reveladora:

<div style="max-width:750px;margin:24px auto;">
  <canvas id="chartPreciosVentaAlquiler"></canvas>
</div>

Con esta separación, los números tienen mucho más sentido: comprar una oficina tiene una mediana cercana a $193,000, mientras que alquilarla ronda los $2,058 mensuales; un local comercial se vende en mediana por $480,000 pero se alquila por unos $2,528 al mes. Este tipo de segmentación es exactamente lo que recomendamos revisar antes de fijar el precio de un nuevo anuncio: comparar contra la mediana de su categoría *y* su modalidad de negocio, no contra el promedio general del tipo de inmueble.

## Precio de venta por tipo de inmueble

Enfocándonos solo en operaciones de venta, así se ordena el valor mediano por tipo de inmueble (usamos la mediana, no el promedio, porque los promedios están muy influenciados por unos pocos anuncios con precios extremos):

<div style="max-width:750px;margin:24px auto;">
  <canvas id="chartPrecioVentaPorTipo"></canvas>
</div>

Los edificios y locales industriales/galpones tienen el ticket promedio de venta más alto, coherente con su naturaleza de inversión o uso comercial/industrial a gran escala. Los departamentos, pese a ser el tipo más numeroso, tienen uno de los precios medianos de venta más bajos de la lista, lo que explica en parte por qué son el producto más transaccionado: mayor accesibilidad, mayor rotación.

## Conclusiones para agentes y agencias

- **El volumen está en departamentos y casas**, pero la diferenciación y el margen pueden estar en categorías menos saturadas como oficinas, locales comerciales o naves industriales.
- **Completar bien los campos de cada anuncio importa más de lo que parece**: un 15% del mercado no especifica tipo de negocio, y un 2.7% de los precios cargados son directamente inválidos. Cada campo vacío o mal cargado es una propiedad que compite en desventaja.
- **Lima y Santa Cruz de la Sierra siguen siendo los motores del mercado regional**, concentrando más de 7 de cada 10 anuncios activos.
- **Al fijar precios, comparar siempre contra la mediana de la misma modalidad de negocio** (venta o alquiler) y no contra el promedio general del tipo de inmueble, que puede estar distorsionado por outliers o por mezclar ambas modalidades.

## Nota metodológica

Este análisis se basa en 99,236 propiedades activas registradas en la base de Statetty al momento de la consulta. Para las estadísticas de precio se excluyeron 2,649 registros con valores inconsistentes (precios en cero, valores fuera de rango o no numéricos). Las categorías de tipo de inmueble reflejan la clasificación cargada por cada agencia o portal de origen, por lo que existen variaciones de nomenclatura (por ejemplo "Anticrético" y "Anticretico", o múltiples variantes de "Quinta") que fueron unificadas cuando correspondía para efectos de este artículo, sin alterar los conteos originales.

<script>
(function() {
  const palette = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#a142f4', '#00acc1', '#ff7043', '#9e9d24', '#5c6bc0', '#26a69a'];

  const baseOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  };

  new Chart(document.getElementById('chartTipoInmueble'), {
    type: 'bar',
    data: {
      labels: ['Departamento', 'Casa', 'Terreno', 'Oficina', 'Local Comercial', 'Local Ind./Galpón', 'Local', 'Quinta o campo', 'Edificio', 'Otro'],
      datasets: [{
        label: 'Cantidad de anuncios',
        data: [44698, 19503, 17722, 6200, 6110, 1558, 1093, 306, 269, 254],
        backgroundColor: palette
      }]
    },
    options: Object.assign({}, baseOptions, {
      plugins: { legend: { display: false }, title: { display: true, text: 'Top 10 tipos de inmueble por cantidad de anuncios' } },
      indexAxis: 'y'
    })
  });

  new Chart(document.getElementById('chartTipoNegocio'), {
    type: 'doughnut',
    data: {
      labels: ['Venta', 'Alquiler', 'Sin especificar', 'Anticrético', 'Alquiler Temporal'],
      datasets: [{
        data: [61685, 22025, 14823, 661, 42],
        backgroundColor: palette
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: 'Distribución por tipo de negocio' }
      }
    }
  });

  new Chart(document.getElementById('chartCiudades'), {
    type: 'bar',
    data: {
      labels: ['Lima (PE)', 'Santa Cruz (BO)', 'Sin especificar (PE)', 'La Paz (BO)', 'Cochabamba (BO)', 'Arequipa (PE)', 'Warnes (BO)', 'Piura (PE)', 'Tarija (BO)', 'Porongo (BO)'],
      datasets: [{
        label: 'Cantidad de anuncios',
        data: [45941, 26294, 14682, 3186, 2170, 948, 471, 432, 402, 353],
        backgroundColor: palette
      }]
    },
    options: Object.assign({}, baseOptions, {
      plugins: { legend: { display: false }, title: { display: true, text: 'Top 10 ciudades por cantidad de anuncios' } },
      indexAxis: 'y'
    })
  });

  new Chart(document.getElementById('chartPreciosVentaAlquiler'), {
    type: 'bar',
    data: {
      labels: ['Departamento', 'Casa', 'Terreno', 'Oficina', 'Local Comercial'],
      datasets: [
        {
          label: 'Mediana Alquiler (mensual, USD)',
          data: [911.64, 2000, 5800, 2057.94, 2528],
          backgroundColor: '#34a853',
          yAxisID: 'y'
        },
        {
          label: 'Mediana Venta (USD)',
          data: [195193.76, 232371.39, 175395.10, 193000, 480000],
          backgroundColor: '#1a73e8',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: 'Precio mediano: Alquiler vs. Venta por tipo de inmueble' }
      },
      scales: {
        y: { type: 'linear', position: 'left', title: { display: true, text: 'Alquiler mensual (USD)' } },
        y1: { type: 'linear', position: 'right', title: { display: true, text: 'Venta (USD)' }, grid: { drawOnChartArea: false } }
      }
    }
  });

  new Chart(document.getElementById('chartPrecioVentaPorTipo'), {
    type: 'bar',
    data: {
      labels: ['Departamento', 'Terreno', 'Oficina', 'Casa', 'Local', 'Local Comercial', 'Edificio', 'Local Ind./Galpón'],
      datasets: [{
        label: 'Precio mediano de venta (USD)',
        data: [195193.76, 175395.10, 193000, 232371.39, 300000, 480000, 528187, 982566],
        backgroundColor: palette
      }]
    },
    options: Object.assign({}, baseOptions, {
      plugins: { legend: { display: false }, title: { display: true, text: 'Precio mediano de venta por tipo de inmueble (USD)' } }
    })
  });
})();
</script>
