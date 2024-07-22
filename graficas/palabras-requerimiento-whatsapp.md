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
    var data = [{
  "count": 222,
  "word": "casa"
},
{
  "count": 205,
  "word": "norte"
},
{
  "count": 201,
  "word": "anillo"
},
{
  "count": 183,
  "word": "dormitorios"
},
{
  "count": 162,
  "word": "alquiler"
},
{
  "count": 153,
  "word": "venta"
},
{
  "count": 122,
  "word": "departamento"
},
{
  "count": 115,
  "word": "equipetrol"
},
{
  "count": 112,
  "word": "ppto"
},
{
  "count": 98,
  "word": "condominio"
},
{
  "count": 97,
  "word": "compra"
},
{
  "count": 80,
  "word": "terreno"
},
{
  "count": 69,
  "word": "dentro"
},
{
  "count": 65,
  "word": "monoambiente"
},
{
  "count": 64,
  "word": "dormitorio"
},
{
  "count": 61,
  "word": "anticretico"
},
{
  "count": 60,
  "word": "amoblado"
},
{
  "count": 53,
  "word": "4to"
},
{
  "count": 53,
  "word": "acorde"
},
{
  "count": 51,
  "word": "5to"
},
{
  "count": 45,
  "word": "dpto"
},
{
  "count": 44,
  "word": "parqueo"
},
{
  "count": 43,
  "word": "contado"
},
{
  "count": 42,
  "word": "beni"
},
{
  "count": 41,
  "word": "alemana"
},
{
  "count": 39,
  "word": "pago"
},
{
  "count": 39,
  "word": "solo"
},
{
  "count": 38,
  "word": "oeste"
},
{
  "count": 38,
  "word": "habitaciones"
},
{
  "count": 38,
  "word": "urubo"
},
{
  "count": 38,
  "word": "urgente"
},
{
  "count": 36,
  "word": "garaje"
},
{
  "count": 35,
  "word": "tipo"
},
{
  "count": 33,
  "word": "depto"
},
{
  "count": 33,
  "word": "oficial"
},
{
  "count": 30,
  "word": "8vo"
},
{
  "count": 30,
  "word": "requiero"
},
{
  "count": 29,
  "word": "máximo"
},
{
  "count": 28,
  "word": "preferencia"
},
{
  "count": 28,
  "word": "banzer"
},
{
  "count": 28,
  "word": "inmediata"
},
{
  "count": 25,
  "word": "usd"
},
{
  "count": 25,
  "word": "fuera"
},
{
  "count": 24,
  "word": "7mo"
},
{
  "count": 24,
  "word": "max"
},
{
  "count": 24,
  "word": "dorm"
},
{
  "count": 24,
  "word": "cualquier"
},
{
  "count": 24,
  "word": "avenida"
},
{
  "count": 23,
  "word": "maximo"
},
{
  "count": 23,
  "word": "radial"
},
{
  "count": 22,
  "word": "este"
},
{
  "count": 21,
  "word": "tenga"
},
{
  "count": 21,
  "word": "cerca"
},
{
  "count": 20,
  "word": "cambio"
},
{
  "count": 19,
  "word": "dependencias"
},
{
  "count": 19,
  "word": "piscina"
},
{
  "count": 18,
  "word": "nueva"
},
{
  "count": 18,
  "word": "mil"
},
{
  "count": 18,
  "word": "centro"
},
{
  "count": 18,
  "word": "busch"
},
{
  "count": 17,
  "word": "demás"
},
{
  "count": 17,
  "word": "superficie"
},
{
  "count": 17,
  "word": "comercial"
},
{
  "count": 17,
  "word": "amplio"
},
{
  "count": 16,
  "word": "sky"
},
{
  "count": 16,
  "word": "toma"
},
{
  "count": 16,
  "word": "zonas"
},
{
  "count": 16,
  "word": "patio"
},
{
  "count": 16,
  "word": "dólares"
},
{
  "count": 15,
  "word": "roca"
},
{
  "count": 15,
  "word": "coronado"
},
{
  "count": 15,
  "word": "sociales"
},
{
  "count": 15,
  "word": "edificio"
},
{
  "count": 15,
  "word": "palmas"
},
{
  "count": 15,
  "word": "vehículos"
},
{
  "count": 15,
  "word": "ser"
},
{
  "count": 15,
  "word": "mínimo"
},
{
  "count": 15,
  "word": "sur"
},
{
  "count": 15,
  "word": "nuevo"
},
{
  "count": 14,
  "word": "características"
},
{
  "count": 14,
  "word": "áreas"
},
{
  "count": 14,
  "word": "estado"
},
{
  "count": 14,
  "word": "contacto"
},
{
  "count": 13,
  "word": "independiente"
},
{
  "count": 13,
  "word": "mariana"
},
{
  "count": 13,
  "word": "6to"
},
{
  "count": 13,
  "word": "muebles"
},
{
  "count": 13,
  "word": "ideal"
},
{
  "count": 12,
  "word": "urubó"
},
{
  "count": 12,
  "word": "libre"
},
{
  "count": 11,
  "word": "cusis"
},
{
  "count": 11,
  "word": "puede"
},
{
  "count": 11,
  "word": "abierto"
},
{
  "count": 11,
  "word": "estrenar"
},
{
  "count": 11,
  "word": "doble"
},
{
  "count": 11,
  "word": "lujo"
},
{
  "count": 11,
  "word": "gravamen"
},
{
  "count": 11,
  "word": "efectivo"
},
{
  "count": 11,
  "word": "perrotta"
},
{
  "count": 11,
  "word": "buen"
},
{
  "count": 11,
  "word": "suite"
},
{
  "count": 11,
  "word": "local"
},
{
  "count": 10,
  "word": "pirai"
},
{
  "count": 10,
  "word": "anticrético"
},
{
  "count": 10,
  "word": "bancario"
},
{
  "count": 10,
  "word": "9no"
},
{
  "count": 10,
  "word": "años"
},
{
  "count": 10,
  "word": "expensas"
},
{
  "count": 10,
  "word": "2do"
},
{
  "count": 10,
  "word": "info"
},
{
  "count": 10,
  "word": "guardia"
},
{
  "count": 10,
  "word": "cocina"
},
{
  "count": 10,
  "word": "mejor"
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
    var sizes = normalize(values, 10, 150);
    //var sizes = values;

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

