---
layout: 			grafica
title:  			"Uso de palabras en mensajes de Requerimientos en WhatsApp"
date:   			2024-07-11
categories: 	graficas,datos
comments: 		true
description: 	"Nube de palabras (a más grandes, más usadas) en mensajes de requerimiento en más de 30 grupos de WhatsApp"
tags: 				[Whatsapp, estadística, chart, conteo, palabras, WordCloud, Requerimieno, casa, norte, alquiler, anillo]
published: 		true
image: 				wordCloud.png
---



  <canvas id="wordCloudChart"></canvas>

  <script>
    // Datos JSON
    var data = [
    				{
						  "count": 490,
						  "word": "casa"
						},
						{
						  "count": 421,
						  "word": "norte"
						},
						{
						  "count": 408,
						  "word": "alquiler"
						},
						{
						  "count": 402,
						  "word": "anillo"
						},
						{
						  "count": 393,
						  "word": "dormitorios"
						},
						{
						  "count": 257,
						  "word": "venta"
						},
						{
						  "count": 243,
						  "word": "condominio"
						},
						{
						  "count": 241,
						  "word": "departamento"
						},
						{
						  "count": 220,
						  "word": "equipetrol"
						},
						{
						  "count": 211,
						  "word": "ppto"
						},
						{
						  "count": 193,
						  "word": "compra"
						},
						{
						  "count": 169,
						  "word": "terreno"
						},
						{
						  "count": 139,
						  "word": "dentro"
						},
						{
						  "count": 126,
						  "word": "amoblado"
						},
						{
						  "count": 113,
						  "word": "anticretico"
						},
						{
						  "count": 95,
						  "word": "urubo"
						},
						{
						  "count": 89,
						  "word": "monoambiente"
						},
						{
						  "count": 85,
						  "word": "4to"
						},
						{
						  "count": 84,
						  "word": "dormitorio"
						},
						{
						  "count": 82,
						  "word": "contado"
						},
						{
						  "count": 81,
						  "word": "fuera"
						},
						{
						  "count": 81,
						  "word": "dpto"
						},
						{
						  "count": 81,
						  "word": "acorde"
						},
						{
						  "count": 80,
						  "word": "alemana"
						},
						{
						  "count": 79,
						  "word": "garaje"
						},
						{
						  "count": 78,
						  "word": "5to"
						},
						{
						  "count": 78,
						  "word": "urgente"
						},
						{
						  "count": 76,
						  "word": "beni"
						},
						{
						  "count": 76,
						  "word": "habitaciones"
						},
						{
						  "count": 74,
						  "word": "parqueo"
						},
						{
						  "count": 72,
						  "word": "superficie"
						},
						{
						  "count": 71,
						  "word": "pago"
						},
						{
						  "count": 67,
						  "word": "requiero"
						},
						{
						  "count": 66,
						  "word": "avenida"
						},
						{
						  "count": 66,
						  "word": "cerca"
						},
						{
						  "count": 65,
						  "word": "sur"
						},
						{
						  "count": 65,
						  "word": "inmediata"
						},
						{
						  "count": 63,
						  "word": "banzer"
						},
						{
						  "count": 62,
						  "word": "8vo"
						},
						{
						  "count": 61,
						  "word": "oeste"
						},
						{
						  "count": 59,
						  "word": "solo"
						},
						{
						  "count": 55,
						  "word": "este"
						},
						{
						  "count": 53,
						  "word": "7mo"
						},
						{
						  "count": 52,
						  "word": "tenga"
						},
						{
						  "count": 51,
						  "word": "preferencia"
						},
						{
						  "count": 51,
						  "word": "tipo"
						},
						{
						  "count": 50,
						  "word": "6to"
						},
						{
						  "count": 49,
						  "word": "máximo"
						},
						{
						  "count": 43,
						  "word": "depto"
						},
						{
						  "count": 42,
						  "word": "cualquier"
						},
						{
						  "count": 42,
						  "word": "radial"
						},
						{
						  "count": 41,
						  "word": "max"
						},
						{
						  "count": 40,
						  "word": "coronado"
						},
						{
						  "count": 39,
						  "word": "roca"
						},
						{
						  "count": 39,
						  "word": "toma"
						},
						{
						  "count": 37,
						  "word": "comercial"
						},
						{
						  "count": 36,
						  "word": "anticrÉtico"
						},
						{
						  "count": 36,
						  "word": "mínimo"
						},
						{
						  "count": 36,
						  "word": "dólares"
						},
						{
						  "count": 35,
						  "word": "usd"
						},
						{
						  "count": 34,
						  "word": "oficial"
						},
						{
						  "count": 33,
						  "word": "adelante"
						},
						{
						  "count": 32,
						  "word": "amoblar"
						},
						{
						  "count": 32,
						  "word": "doble"
						},
						{
						  "count": 32,
						  "word": "piscina"
						},
						{
						  "count": 31,
						  "word": "agente"
						},
						{
						  "count": 31,
						  "word": "dorm"
						},
						{
						  "count": 31,
						  "word": "presup"
						},
						{
						  "count": 30,
						  "word": "cambio"
						},
						{
						  "count": 30,
						  "word": "busch"
						},
						{
						  "count": 29,
						  "word": "estrenar"
						},
						{
						  "count": 29,
						  "word": "cocina"
						},
						{
						  "count": 29,
						  "word": "local"
						},
						{
						  "count": 28,
						  "word": "amoblada"
						},
						{
						  "count": 28,
						  "word": "nueva"
						},
						{
						  "count": 27,
						  "word": "muebles"
						},
						{
						  "count": 27,
						  "word": "contacto"
						},
						{
						  "count": 26,
						  "word": "canal"
						},
						{
						  "count": 26,
						  "word": "puede"
						},
						{
						  "count": 26,
						  "word": "3er"
						},
						{
						  "count": 26,
						  "word": "maximo"
						},
						{
						  "count": 26,
						  "word": "zonas"
						},
						{
						  "count": 26,
						  "word": "ser"
						},
						{
						  "count": 25,
						  "word": "moderna"
						},
						{
						  "count": 25,
						  "word": "mutualista"
						},
						{
						  "count": 25,
						  "word": "udabol"
						},
						{
						  "count": 25,
						  "word": "galpon"
						},
						{
						  "count": 25,
						  "word": "mil"
						},
						{
						  "count": 25,
						  "word": "amplio"
						},
						{
						  "count": 25,
						  "word": "suite"
						},
						{
						  "count": 24,
						  "word": "sociales"
						},
						{
						  "count": 24,
						  "word": "patio"
						},
						{
						  "count": 24,
						  "word": "info"
						},
						{
						  "count": 24,
						  "word": "precio"
						},
						{
						  "count": 24,
						  "word": "ideal"
						},
						{
						  "count": 23,
						  "word": "urbari"
						},
						{
						  "count": 23,
						  "word": "frente"
						},
						{
						  "count": 23,
						  "word": "abierto"
						},
						{
						  "count": 22,
						  "word": "dependencias"
						},
						{
						  "count": 22,
						  "word": "minimo"
						},
						{
						  "count": 22,
						  "word": "independiente"
						},
						{
						  "count": 22,
						  "word": "dumont"
						},
						{
						  "count": 22,
						  "word": "sirve"
						},
						{
						  "count": 22,
						  "word": "mejor"
						},
						{
						  "count": 21,
						  "word": "remanso"
						},
						{
						  "count": 21,
						  "word": "cotoca"
						},
						{
						  "count": 21,
						  "word": "palmas"
						},
						{
						  "count": 21,
						  "word": "vivienda"
						},
						{
						  "count": 21,
						  "word": "guardia"
						},
						{
						  "count": 21,
						  "word": "urubó"
						},
						{
						  "count": 20,
						  "word": "santos"
						},
						{
						  "count": 20,
						  "word": "inmobiliaria"
						},
						{
						  "count": 20,
						  "word": "ver"
						},
						{
						  "count": 20,
						  "word": "nuevo"
						},
						{
						  "count": 19,
						  "word": "antigua"
						},
						{
						  "count": 19,
						  "word": "rudolf"
						},
						{
						  "count": 19,
						  "word": "planta"
						},
						{
						  "count": 19,
						  "word": "knijnenburg"
						},
						{
						  "count": 19,
						  "word": "san"
						},
						{
						  "count": 19,
						  "word": "hoy"
						},
						{
						  "count": 19,
						  "word": "isuto"
						},
						{
						  "count": 19,
						  "word": "baño"
						},
						{
						  "count": 19,
						  "word": "buen"
						},
						{
						  "count": 19,
						  "word": "oficina"
						},
						{
						  "count": 19,
						  "word": "sirari"
						},
						{
						  "count": 18,
						  "word": "cerrado"
						},
						{
						  "count": 18,
						  "word": "mas"
						},
						{
						  "count": 18,
						  "word": "tiene"
						},
						{
						  "count": 18,
						  "word": "vía"
						},
						{
						  "count": 18,
						  "word": "vehículos"
						},
						{
						  "count": 17,
						  "word": "características"
						},
						{
						  "count": 17,
						  "word": "9no"
						},
						{
						  "count": 17,
						  "word": "enviar"
						},
						{
						  "count": 17,
						  "word": "detalle"
						},
						{
						  "count": 17,
						  "word": "2do"
						},
						{
						  "count": 17,
						  "word": "santa"
						},
						{
						  "count": 17,
						  "word": "baños"
						},
						{
						  "count": 17,
						  "word": "calle"
						},
						{
						  "count": 17,
						  "word": "dos"
						},
						{
						  "count": 16,
						  "word": "demás"
						},
						{
						  "count": 16,
						  "word": "empresa"
						},
						{
						  "count": 16,
						  "word": "estado"
						},
						{
						  "count": 16,
						  "word": "lujo"
						},
						{
						  "count": 16,
						  "word": "construcción"
						},
						{
						  "count": 15,
						  "word": "busco"
						},
						{
						  "count": 15,
						  "word": "indistinta"
						},
						{
						  "count": 15,
						  "word": "molina"
						},
						{
						  "count": 15,
						  "word": "propietario"
						},
						{
						  "count": 14,
						  "word": "ambientes"
						},
						{
						  "count": 14,
						  "word": "paragua"
						},
						{
						  "count": 14,
						  "word": "pirai"
						},
						{
						  "count": 14,
						  "word": "rojas"
						},
						{
						  "count": 14,
						  "word": "ref"
						},
						{
						  "count": 14,
						  "word": "lote"
						},
						{
						  "count": 14,
						  "word": "edificio"
						},
						{
						  "count": 14,
						  "word": "bush"
						},
						{
						  "count": 14,
						  "word": "oficinas"
						},
						{
						  "count": 14,
						  "word": "servicio"
						},
						{
						  "count": 13,
						  "word": "marco"
						},
						{
						  "count": 13,
						  "word": "bancario"
						},
						{
						  "count": 13,
						  "word": "menos"
						},
						{
						  "count": 13,
						  "word": "expensas"
						},
						{
						  "count": 13,
						  "word": "pedro"
						},
						{
						  "count": 13,
						  "word": "entrega"
						},
						{
						  "count": 13,
						  "word": "colina"
						},
						{
						  "count": 13,
						  "word": "utepsa"
						},
						{
						  "count": 12,
						  "word": "preventa"
						},
						{
						  "count": 12,
						  "word": "cruz"
						},
						{
						  "count": 12,
						  "word": "c21"
						},
						{
						  "count": 12,
						  "word": "remax"
						},
						{
						  "count": 12,
						  "word": "mercado"
						},
						{
						  "count": 12,
						  "word": "villa"
						},
						{
						  "count": 12,
						  "word": "principal"
						},
						{
						  "count": 12,
						  "word": "preferentemente"
						},
						{
						  "count": 12,
						  "word": "sala"
						},
						{
						  "count": 12,
						  "word": "Áreas"
						},
						{
						  "count": 12,
						  "word": "carretera"
						},
						{
						  "count": 12,
						  "word": "sólo"
						},
						{
						  "count": 12,
						  "word": "galpón"
						},
						{
						  "count": 12,
						  "word": "libre"
						},
						{
						  "count": 11,
						  "word": "jhonny"
						},
						{
						  "count": 11,
						  "word": "ubicación"
						},
						{
						  "count": 11,
						  "word": "sky"
						},
						{
						  "count": 11,
						  "word": "aprox"
						},
						{
						  "count": 11,
						  "word": "anticrético"
						},
						{
						  "count": 11,
						  "word": "alrededores"
						},
						{
						  "count": 11,
						  "word": "julio"
						},
						{
						  "count": 11,
						  "word": "negocio"
						},
						{
						  "count": 11,
						  "word": "barrio"
						},
						{
						  "count": 11,
						  "word": "esquina"
						},
						{
						  "count": 11,
						  "word": "sevillas"
						},
						{
						  "count": 11,
						  "word": "gravamen"
						},
						{
						  "count": 11,
						  "word": "inf"
						},
						{
						  "count": 11,
						  "word": "operaciÓn"
						},
						{
						  "count": 11,
						  "word": "crédito"
						},
						{
						  "count": 11,
						  "word": "cliente"
						},
						{
						  "count": 11,
						  "word": "hacer"
						},
						{
						  "count": 11,
						  "word": "baja"
						},
						{
						  "count": 11,
						  "word": "thoalina"
						},
						{
						  "count": 11,
						  "word": "jardín"
						},
						{
						  "count": 10,
						  "word": "favor"
						},
						{
						  "count": 10,
						  "word": "equipado"
						},
						{
						  "count": 10,
						  "word": "propiedad"
						},
						{
						  "count": 10,
						  "word": "asesora"
						},
						{
						  "count": 10,
						  "word": "parque"
						},
						{
						  "count": 10,
						  "word": "virgen"
						},
						{
						  "count": 10,
						  "word": "amplia"
						},
						{
						  "count": 10,
						  "word": "bellored"
						},
						{
						  "count": 10,
						  "word": "mañana"
						},
						{
						  "count": 10,
						  "word": "trato"
						},
						{
						  "count": 10,
						  "word": "plantas"
						},
						{
						  "count": 10,
						  "word": "salle"
						},
						{
						  "count": 10,
						  "word": "balcón"
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
            backgroundColor: '#007bff' // Color de las palabras
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
