---
layout: 			grafica
title:  			"Uso de palabras en mensajes de Requerimientos en WhatsApp"
date:   			2024-07-11
categories: 	graficas,datos
comments: 		true
description: 	"Nube de palabras (a más grandes, más usadas) en mensajes de requerimiento en más de 30 grupos de WhatsApp. Se recogen sólo palabras que se hayan repetido en al menos 10 mensajes, caracteres alfanuméricos, sólo números que formen parte de palabras (como '5to') y de los últimos 7 días. La muestra actual va del 7/7/2024 al 15/7/2024"
tags: 				[Whatsapp, estadística, chart, conteo, palabras, WordCloud, Requerimieno, casa, norte, alquiler, anillo]
published: 		true
image: 				wordCloud.png
---



  <canvas id="wordCloudChart"></canvas>

  <script>
    // Datos JSON
    var data = [
    		{
				  "count": 181,
				  "word": "casa"
				},
				{
				  "count": 175,
				  "word": "norte"
				},
				{
				  "count": 174,
				  "word": "alquiler"
				},
				{
				  "count": 168,
				  "word": "anillo"
				},
				{
				  "count": 163,
				  "word": "dormitorios"
				},
				{
				  "count": 131,
				  "word": "departamento"
				},
				{
				  "count": 121,
				  "word": "equipetrol"
				},
				{
				  "count": 118,
				  "word": "venta"
				},
				{
				  "count": 109,
				  "word": "compra"
				},
				{
				  "count": 90,
				  "word": "condominio"
				},
				{
				  "count": 88,
				  "word": "ppto"
				},
				{
				  "count": 63,
				  "word": "dormitorio"
				},
				{
				  "count": 60,
				  "word": "monoambiente"
				},
				{
				  "count": 54,
				  "word": "terreno"
				},
				{
				  "count": 53,
				  "word": "amoblado"
				},
				{
				  "count": 42,
				  "word": "fuera"
				},
				{
				  "count": 42,
				  "word": "contado"
				},
				{
				  "count": 41,
				  "word": "4to"
				},
				{
				  "count": 40,
				  "word": "pago"
				},
				{
				  "count": 40,
				  "word": "parqueo"
				},
				{
				  "count": 38,
				  "word": "dpto"
				},
				{
				  "count": 35,
				  "word": "garaje"
				},
				{
				  "count": 35,
				  "word": "anticretico"
				},
				{
				  "count": 32,
				  "word": "alemana"
				},
				{
				  "count": 32,
				  "word": "beni"
				},
				{
				  "count": 31,
				  "word": "7mo"
				},
				{
				  "count": 31,
				  "word": "dentro"
				},
				{
				  "count": 31,
				  "word": "inmediata"
				},
				{
				  "count": 30,
				  "word": "preferencia"
				},
				{
				  "count": 28,
				  "word": "urubo"
				},
				{
				  "count": 28,
				  "word": "solo"
				},
				{
				  "count": 28,
				  "word": "acorde"
				},
				{
				  "count": 27,
				  "word": "5to"
				},
				{
				  "count": 26,
				  "word": "banzer"
				},
				{
				  "count": 26,
				  "word": "máximo"
				},
				{
				  "count": 25,
				  "word": "tenga"
				},
				{
				  "count": 25,
				  "word": "habitaciones"
				},
				{
				  "count": 24,
				  "word": "depto"
				},
				{
				  "count": 24,
				  "word": "urgente"
				},
				{
				  "count": 23,
				  "word": "cerca"
				},
				{
				  "count": 23,
				  "word": "sur"
				},
				{
				  "count": 23,
				  "word": "avenida"
				},
				{
				  "count": 23,
				  "word": "tipo"
				},
				{
				  "count": 22,
				  "word": "estrenar"
				},
				{
				  "count": 22,
				  "word": "este"
				},
				{
				  "count": 20,
				  "word": "superficie"
				},
				{
				  "count": 19,
				  "word": "oeste"
				},
				{
				  "count": 19,
				  "word": "6to"
				},
				{
				  "count": 18,
				  "word": "cocina"
				},
				{
				  "count": 18,
				  "word": "8vo"
				},
				{
				  "count": 17,
				  "word": "dorm"
				},
				{
				  "count": 17,
				  "word": "cualquier"
				},
				{
				  "count": 17,
				  "word": "entrega"
				},
				{
				  "count": 16,
				  "word": "usd"
				},
				{
				  "count": 16,
				  "word": "dos"
				},
				{
				  "count": 16,
				  "word": "local"
				},
				{
				  "count": 16,
				  "word": "oficial"
				},
				{
				  "count": 15,
				  "word": "abierto"
				},
				{
				  "count": 15,
				  "word": "canal"
				},
				{
				  "count": 15,
				  "word": "sky"
				},
				{
				  "count": 15,
				  "word": "nuevo"
				},
				{
				  "count": 15,
				  "word": "mejor"
				},
				{
				  "count": 15,
				  "word": "requiero"
				},
				{
				  "count": 14,
				  "word": "independiente"
				},
				{
				  "count": 14,
				  "word": "cambio"
				},
				{
				  "count": 14,
				  "word": "minimo"
				},
				{
				  "count": 14,
				  "word": "mínimo"
				},
				{
				  "count": 14,
				  "word": "suite"
				},
				{
				  "count": 13,
				  "word": "piscina"
				},
				{
				  "count": 13,
				  "word": "max"
				},
				{
				  "count": 13,
				  "word": "toma"
				},
				{
				  "count": 13,
				  "word": "radial"
				},
				{
				  "count": 13,
				  "word": "sirari"
				},
				{
				  "count": 13,
				  "word": "dólares"
				},
				{
				  "count": 13,
				  "word": "info"
				},
				{
				  "count": 12,
				  "word": "palmas"
				},
				{
				  "count": 12,
				  "word": "financiamiento"
				},
				{
				  "count": 12,
				  "word": "sociales"
				},
				{
				  "count": 12,
				  "word": "maximo"
				},
				{
				  "count": 12,
				  "word": "3er"
				},
				{
				  "count": 12,
				  "word": "preventa"
				},
				{
				  "count": 12,
				  "word": "urbari"
				},
				{
				  "count": 12,
				  "word": "adelante"
				},
				{
				  "count": 12,
				  "word": "sólo"
				},
				{
				  "count": 12,
				  "word": "oficina"
				},
				{
				  "count": 12,
				  "word": "mil"
				},
				{
				  "count": 12,
				  "word": "muebles"
				},
				{
				  "count": 11,
				  "word": "doble"
				},
				{
				  "count": 11,
				  "word": "zonas"
				},
				{
				  "count": 11,
				  "word": "negocio"
				},
				{
				  "count": 11,
				  "word": "ideal"
				},
				{
				  "count": 11,
				  "word": "sirve"
				},
				{
				  "count": 11,
				  "word": "presup"
				},
				{
				  "count": 11,
				  "word": "nueva"
				},
				{
				  "count": 11,
				  "word": "comercial"
				},
				{
				  "count": 11,
				  "word": "patio"
				},
				{
				  "count": 10,
				  "word": "amoblada"
				},
				{
				  "count": 10,
				  "word": "puede"
				},
				{
				  "count": 10,
				  "word": "dumont"
				},
				{
				  "count": 10,
				  "word": "baño"
				},
				{
				  "count": 10,
				  "word": "isuto"
				}];

    // Convertir los datos JSON a la estructura requerida
    var labels = data.map(item => item.word);
    var values = data.map(item => item.count);

    // Función de normalización lineal para escalar los valores
    function normalize(values, newMin, newMax) {
      var min = Math.min(...values);
      var max = Math.max(...values);
      return values.map(value => ((value - min) * (newMax - newMin)) / (max - min) + newMin);
    }

    // Escalar los valores para que estén entre 9 y 90
    //var sizes = normalize(values, 10, 150);
    var sizes = values;

    // Configuración del gráfico
    const config = {
      type: 'wordCloud',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Importancia',
            data: sizes,
            backgroundColor: '#17BAEF' // Color de las palabras
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: false // Ocultar leyenda
          }
        },
        maintainAspectRatio: false, // No mantener la relación de aspecto
        responsive: true // Hacer que el gráfico sea responsive
      }
    };

    // Crear la instancia del gráfico de nube de palabras
    var ctx = document.getElementById('wordCloudChart').getContext('2d');
    new Chart(ctx, config);
  </script>

