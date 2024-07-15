---
layout: 			grafica
title:  			"Uso de palabras en mensajes de Requerimientos en WhatsApp"
date:   			2024-07-11
categories: 	graficas,datos
comments: 		true
description: 	"Nube de palabras (a más grandes, más usadas) en mensajes de requerimiento en más de 30 grupos de WhatsApp. Se recogen sólo caracteres alfanuméricos, sólo números que formen parte de palabras (como '5to') y de los últimos 15 días. La muestra actual va del 1/7/2024 al 15/7/2024"
tags: 				[Whatsapp, estadística, chart, conteo, palabras, WordCloud, Requerimieno, casa, norte, alquiler, anillo]
published: 		true
image: 				wordCloud.png
---



  <canvas id="wordCloudChart"></canvas>

  <script>
    // Datos JSON
    var data = [{
  "count": 334,
  "word": "casa"
},
{
  "count": 302,
  "word": "norte"
},
{
  "count": 302,
  "word": "alquiler"
},
{
  "count": 285,
  "word": "anillo"
},
{
  "count": 283,
  "word": "dormitorios"
},
{
  "count": 195,
  "word": "departamento"
},
{
  "count": 184,
  "word": "venta"
},
{
  "count": 179,
  "word": "equipetrol"
},
{
  "count": 167,
  "word": "condominio"
},
{
  "count": 158,
  "word": "ppto"
},
{
  "count": 154,
  "word": "compra"
},
{
  "count": 102,
  "word": "terreno"
},
{
  "count": 95,
  "word": "amoblado"
},
{
  "count": 86,
  "word": "dormitorio"
},
{
  "count": 85,
  "word": "monoambiente"
},
{
  "count": 75,
  "word": "dentro"
},
{
  "count": 72,
  "word": "anticretico"
},
{
  "count": 69,
  "word": "urubo"
},
{
  "count": 67,
  "word": "dpto"
},
{
  "count": 66,
  "word": "parqueo"
},
{
  "count": 63,
  "word": "fuera"
},
{
  "count": 60,
  "word": "inmediata"
},
{
  "count": 60,
  "word": "4to"
},
{
  "count": 59,
  "word": "garaje"
},
{
  "count": 58,
  "word": "contado"
},
{
  "count": 55,
  "word": "pago"
},
{
  "count": 52,
  "word": "urgente"
},
{
  "count": 52,
  "word": "sur"
},
{
  "count": 51,
  "word": "alemana"
},
{
  "count": 50,
  "word": "acorde"
},
{
  "count": 45,
  "word": "beni"
},
{
  "count": 45,
  "word": "solo"
},
{
  "count": 45,
  "word": "7mo"
},
{
  "count": 44,
  "word": "5to"
},
{
  "count": 44,
  "word": "habitaciones"
},
{
  "count": 43,
  "word": "6to"
},
{
  "count": 43,
  "word": "cerca"
},
{
  "count": 42,
  "word": "preferencia"
},
{
  "count": 42,
  "word": "tenga"
},
{
  "count": 40,
  "word": "avenida"
},
{
  "count": 40,
  "word": "máximo"
},
{
  "count": 40,
  "word": "superficie"
},
{
  "count": 39,
  "word": "tipo"
},
{
  "count": 39,
  "word": "banzer"
},
{
  "count": 39,
  "word": "depto"
},
{
  "count": 36,
  "word": "8vo"
},
{
  "count": 36,
  "word": "este"
},
{
  "count": 34,
  "word": "requiero"
},
{
  "count": 33,
  "word": "toma"
},
{
  "count": 29,
  "word": "cualquier"
},
{
  "count": 29,
  "word": "oeste"
},
{
  "count": 29,
  "word": "estrenar"
},
{
  "count": 28,
  "word": "piscina"
},
{
  "count": 26,
  "word": "cocina"
},
{
  "count": 26,
  "word": "dólares"
},
{
  "count": 26,
  "word": "max"
},
{
  "count": 26,
  "word": "dorm"
},
{
  "count": 25,
  "word": "oficial"
},
{
  "count": 25,
  "word": "mínimo"
},
{
  "count": 25,
  "word": "radial"
},
{
  "count": 24,
  "word": "usd"
},
{
  "count": 24,
  "word": "doble"
},
{
  "count": 23,
  "word": "adelante"
},
{
  "count": 23,
  "word": "local"
},
{
  "count": 22,
  "word": "info"
},
{
  "count": 22,
  "word": "presup"
},
{
  "count": 22,
  "word": "muebles"
},
{
  "count": 22,
  "word": "abierto"
},
{
  "count": 22,
  "word": "maximo"
},
{
  "count": 21,
  "word": "entrega"
},
{
  "count": 21,
  "word": "mil"
},
{
  "count": 21,
  "word": "urbari"
},
{
  "count": 21,
  "word": "canal"
},
{
  "count": 21,
  "word": "cambio"
},
{
  "count": 21,
  "word": "3er"
},
{
  "count": 21,
  "word": "sociales"
},
{
  "count": 21,
  "word": "amoblada"
},
{
  "count": 20,
  "word": "comercial"
},
{
  "count": 20,
  "word": "nueva"
},
{
  "count": 20,
  "word": "suite"
},
{
  "count": 20,
  "word": "amoblar"
},
{
  "count": 20,
  "word": "puede"
},
{
  "count": 20,
  "word": "independiente"
},
{
  "count": 20,
  "word": "palmas"
},
{
  "count": 19,
  "word": "patio"
},
{
  "count": 19,
  "word": "isuto"
},
{
  "count": 19,
  "word": "oficina"
},
{
  "count": 19,
  "word": "sky"
},
{
  "count": 19,
  "word": "minimo"
},
{
  "count": 19,
  "word": "agente"
},
{
  "count": 18,
  "word": "anticrÉtico"
},
{
  "count": 18,
  "word": "guardia"
},
{
  "count": 18,
  "word": "baño"
},
{
  "count": 18,
  "word": "mejor"
},
{
  "count": 18,
  "word": "dos"
},
{
  "count": 18,
  "word": "nuevo"
},
{
  "count": 18,
  "word": "coronado"
},
{
  "count": 17,
  "word": "amplio"
},
{
  "count": 17,
  "word": "dependencias"
},
{
  "count": 17,
  "word": "roca"
},
{
  "count": 17,
  "word": "zonas"
},
{
  "count": 17,
  "word": "vía"
},
{
  "count": 16,
  "word": "precio"
},
{
  "count": 16,
  "word": "ser"
},
{
  "count": 16,
  "word": "vivienda"
},
{
  "count": 15,
  "word": "dumont"
},
{
  "count": 15,
  "word": "busch"
},
{
  "count": 15,
  "word": "preventa"
},
{
  "count": 15,
  "word": "9no"
},
{
  "count": 14,
  "word": "amplia"
},
{
  "count": 14,
  "word": "santa"
},
{
  "count": 14,
  "word": "sirve"
},
{
  "count": 14,
  "word": "sirari"
},
{
  "count": 14,
  "word": "ideal"
},
{
  "count": 14,
  "word": "moderna"
},
{
  "count": 14,
  "word": "santos"
},
{
  "count": 13,
  "word": "contacto"
},
{
  "count": 13,
  "word": "baños"
},
{
  "count": 13,
  "word": "inmobiliaria"
},
{
  "count": 13,
  "word": "ambientes"
},
{
  "count": 13,
  "word": "frente"
},
{
  "count": 13,
  "word": "demás"
},
{
  "count": 13,
  "word": "mas"
},
{
  "count": 13,
  "word": "financiamiento"
},
{
  "count": 12,
  "word": "buen"
},
{
  "count": 12,
  "word": "sólo"
},
{
  "count": 12,
  "word": "calle"
},
{
  "count": 12,
  "word": "aprox"
},
{
  "count": 12,
  "word": "ubicación"
},
{
  "count": 12,
  "word": "bancario"
},
{
  "count": 12,
  "word": "pirai"
},
{
  "count": 12,
  "word": "características"
},
{
  "count": 12,
  "word": "negocio"
},
{
  "count": 12,
  "word": "villa"
},
{
  "count": 11,
  "word": "efectivo"
},
{
  "count": 11,
  "word": "mañana"
},
{
  "count": 11,
  "word": "paga"
},
{
  "count": 11,
  "word": "Áreas"
},
{
  "count": 11,
  "word": "oficinas"
},
{
  "count": 11,
  "word": "planta"
},
{
  "count": 11,
  "word": "comida"
},
{
  "count": 11,
  "word": "cotoca"
},
{
  "count": 11,
  "word": "empresa"
},
{
  "count": 11,
  "word": "ref"
},
{
  "count": 11,
  "word": "hoy"
},
{
  "count": 11,
  "word": "cerrado"
},
{
  "count": 11,
  "word": "enviar"
},
{
  "count": 11,
  "word": "expensas"
},
{
  "count": 11,
  "word": "edificio"
},
{
  "count": 11,
  "word": "galpon"
},
{
  "count": 11,
  "word": "detalle"
},
{
  "count": 10,
  "word": "incluidas"
},
{
  "count": 10,
  "word": "vehículos"
},
{
  "count": 10,
  "word": "sala"
},
{
  "count": 10,
  "word": "balcón"
},
{
  "count": 10,
  "word": "utepsa"
},
{
  "count": 10,
  "word": "busco"
},
{
  "count": 10,
  "word": "san"
},
{
  "count": 10,
  "word": "udabol"
},
{
  "count": 10,
  "word": "equipado"
},
{
  "count": 10,
  "word": "año"
},
{
  "count": 10,
  "word": "asesora"
},
{
  "count": 10,
  "word": "pedro"
},
{
  "count": 10,
  "word": "propiedad"
},
{
  "count": 10,
  "word": "2do"
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

