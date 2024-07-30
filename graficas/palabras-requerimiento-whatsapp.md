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
  "count": 565,
  "word": "casa"
},
{
  "count": 546,
  "word": "anillo"
},
{
  "count": 504,
  "word": "norte"
},
{
  "count": 443,
  "word": "dormitorios"
},
{
  "count": 423,
  "word": "alquiler"
},
{
  "count": 362,
  "word": "venta"
},
{
  "count": 281,
  "word": "equipetrol"
},
{
  "count": 272,
  "word": "departamento"
},
{
  "count": 252,
  "word": "ppto"
},
{
  "count": 244,
  "word": "compra"
},
{
  "count": 242,
  "word": "condominio"
},
{
  "count": 231,
  "word": "terreno"
},
{
  "count": 162,
  "word": "dentro"
},
{
  "count": 149,
  "word": "4to"
},
{
  "count": 138,
  "word": "monoambiente"
},
{
  "count": 136,
  "word": "acorde"
},
{
  "count": 133,
  "word": "5to"
},
{
  "count": 126,
  "word": "anticretico"
},
{
  "count": 122,
  "word": "dormitorio"
},
{
  "count": 115,
  "word": "alemana"
},
{
  "count": 110,
  "word": "amoblado"
},
{
  "count": 102,
  "word": "beni"
},
{
  "count": 102,
  "word": "pago"
},
{
  "count": 101,
  "word": "parqueo"
},
{
  "count": 100,
  "word": "avenida"
},
{
  "count": 91,
  "word": "fuera"
},
{
  "count": 89,
  "word": "garaje"
},
{
  "count": 89,
  "word": "urubo"
},
{
  "count": 87,
  "word": "habitaciones"
},
{
  "count": 85,
  "word": "tipo"
},
{
  "count": 83,
  "word": "contado"
},
{
  "count": 83,
  "word": "urgente"
},
{
  "count": 82,
  "word": "dpto"
},
{
  "count": 82,
  "word": "oficial"
},
{
  "count": 81,
  "word": "requiero"
},
{
  "count": 77,
  "word": "superficie"
},
{
  "count": 77,
  "word": "banzer"
},
{
  "count": 77,
  "word": "solo"
},
{
  "count": 76,
  "word": "máximo"
},
{
  "count": 75,
  "word": "oeste"
},
{
  "count": 73,
  "word": "cerca"
},
{
  "count": 73,
  "word": "depto"
},
{
  "count": 72,
  "word": "sur"
},
{
  "count": 67,
  "word": "comercial"
},
{
  "count": 66,
  "word": "preferencia"
},
{
  "count": 65,
  "word": "8vo"
},
{
  "count": 64,
  "word": "inmediata"
},
{
  "count": 64,
  "word": "6to"
},
{
  "count": 63,
  "word": "radial"
},
{
  "count": 57,
  "word": "maximo"
},
{
  "count": 57,
  "word": "zonas"
},
{
  "count": 57,
  "word": "puede"
},
{
  "count": 56,
  "word": "ser"
},
{
  "count": 54,
  "word": "usd"
},
{
  "count": 51,
  "word": "max"
},
{
  "count": 47,
  "word": "local"
},
{
  "count": 47,
  "word": "cambio"
},
{
  "count": 46,
  "word": "este"
},
{
  "count": 44,
  "word": "contacto"
},
{
  "count": 44,
  "word": "doble"
},
{
  "count": 44,
  "word": "tenga"
},
{
  "count": 44,
  "word": "7mo"
},
{
  "count": 43,
  "word": "busch"
},
{
  "count": 42,
  "word": "dependencias"
},
{
  "count": 42,
  "word": "cualquier"
},
{
  "count": 41,
  "word": "isuto"
},
{
  "count": 41,
  "word": "amplio"
},
{
  "count": 40,
  "word": "canal"
},
{
  "count": 40,
  "word": "san"
},
{
  "count": 40,
  "word": "dorm"
},
{
  "count": 39,
  "word": "toma"
},
{
  "count": 36,
  "word": "piscina"
},
{
  "count": 36,
  "word": "abierto"
},
{
  "count": 35,
  "word": "edificio"
},
{
  "count": 35,
  "word": "centro"
},
{
  "count": 34,
  "word": "guardia"
},
{
  "count": 34,
  "word": "sirari"
},
{
  "count": 33,
  "word": "dólares"
},
{
  "count": 32,
  "word": "sirve"
},
{
  "count": 32,
  "word": "ideal"
},
{
  "count": 32,
  "word": "dumont"
},
{
  "count": 32,
  "word": "efectivo"
},
{
  "count": 31,
  "word": "vivienda"
},
{
  "count": 31,
  "word": "dos"
},
{
  "count": 30,
  "word": "sociales"
},
{
  "count": 30,
  "word": "2do"
},
{
  "count": 30,
  "word": "coronado"
},
{
  "count": 29,
  "word": "santos"
},
{
  "count": 29,
  "word": "suite"
},
{
  "count": 28,
  "word": "nuevo"
},
{
  "count": 28,
  "word": "independiente"
},
{
  "count": 28,
  "word": "roca"
},
{
  "count": 28,
  "word": "hoy"
},
{
  "count": 28,
  "word": "mínimo"
},
{
  "count": 27,
  "word": "mil"
},
{
  "count": 27,
  "word": "frente"
},
{
  "count": 27,
  "word": "nueva"
},
{
  "count": 27,
  "word": "entrega"
},
{
  "count": 27,
  "word": "demás"
},
{
  "count": 26,
  "word": "patio"
},
{
  "count": 26,
  "word": "detalle"
},
{
  "count": 26,
  "word": "características"
},
{
  "count": 26,
  "word": "palmas"
},
{
  "count": 25,
  "word": "udabol"
},
{
  "count": 25,
  "word": "dependencia"
},
{
  "count": 25,
  "word": "vehículos"
},
{
  "count": 25,
  "word": "buen"
},
{
  "count": 25,
  "word": "3er"
},
{
  "count": 25,
  "word": "negocio"
},
{
  "count": 24,
  "word": "áreas"
},
{
  "count": 24,
  "word": "principal"
},
{
  "count": 24,
  "word": "estrenar"
},
{
  "count": 24,
  "word": "ver"
},
{
  "count": 24,
  "word": "amoblar"
},
{
  "count": 24,
  "word": "empresa"
},
{
  "count": 23,
  "word": "cocina"
},
{
  "count": 23,
  "word": "mariana"
},
{
  "count": 23,
  "word": "estado"
},
{
  "count": 22,
  "word": "expensas"
},
{
  "count": 22,
  "word": "vía"
},
{
  "count": 22,
  "word": "cusis"
},
{
  "count": 22,
  "word": "alrededores"
},
{
  "count": 22,
  "word": "oficinas"
},
{
  "count": 22,
  "word": "balcón"
},
{
  "count": 22,
  "word": "oficina"
},
{
  "count": 22,
  "word": "agente"
},
{
  "count": 22,
  "word": "financiamiento"
},
{
  "count": 22,
  "word": "parque"
},
{
  "count": 22,
  "word": "bancario"
},
{
  "count": 21,
  "word": "mejor"
},
{
  "count": 21,
  "word": "baño"
},
{
  "count": 21,
  "word": "amoblada"
},
{
  "count": 21,
  "word": "planta"
},
{
  "count": 21,
  "word": "cotoca"
},
{
  "count": 21,
  "word": "muebles"
},
{
  "count": 21,
  "word": "perrotta"
},
{
  "count": 21,
  "word": "anticrético"
},
{
  "count": 20,
  "word": "calle"
},
{
  "count": 20,
  "word": "servicio"
},
{
  "count": 20,
  "word": "lujo"
},
{
  "count": 20,
  "word": "urubó"
},
{
  "count": 19,
  "word": "paragua"
},
{
  "count": 19,
  "word": "preventa"
},
{
  "count": 19,
  "word": "9no"
},
{
  "count": 18,
  "word": "sólo"
},
{
  "count": 18,
  "word": "ambientes"
},
{
  "count": 18,
  "word": "aprox"
},
{
  "count": 18,
  "word": "mañana"
},
{
  "count": 18,
  "word": "universidad"
},
{
  "count": 18,
  "word": "sky"
},
{
  "count": 17,
  "word": "carretera"
},
{
  "count": 17,
  "word": "info"
},
{
  "count": 17,
  "word": "enviar"
},
{
  "count": 17,
  "word": "hectáreas"
},
{
  "count": 17,
  "word": "amplia"
},
{
  "count": 17,
  "word": "anticrÉtico"
},
{
  "count": 17,
  "word": "precio"
},
{
  "count": 17,
  "word": "pre"
},
{
  "count": 17,
  "word": "galpon"
},
{
  "count": 17,
  "word": "moderna"
},
{
  "count": 17,
  "word": "antigua"
},
{
  "count": 17,
  "word": "remax"
},
{
  "count": 17,
  "word": "bolivianos"
},
{
  "count": 16,
  "word": "comisión"
},
{
  "count": 16,
  "word": "propiedad"
},
{
  "count": 16,
  "word": "habitaciónes"
},
{
  "count": 16,
  "word": "mutualista"
},
{
  "count": 16,
  "word": "churrasquera"
},
{
  "count": 15,
  "word": "escritorio"
},
{
  "count": 15,
  "word": "libre"
},
{
  "count": 15,
  "word": "piso"
},
{
  "count": 15,
  "word": "operaciÓn"
},
{
  "count": 15,
  "word": "urbano"
},
{
  "count": 15,
  "word": "ubicación"
},
{
  "count": 15,
  "word": "operacion"
},
{
  "count": 15,
  "word": "aproximadamente"
},
{
  "count": 15,
  "word": "virgen"
},
{
  "count": 15,
  "word": "pirai"
},
{
  "count": 15,
  "word": "remanso"
},
{
  "count": 14,
  "word": "santa"
},
{
  "count": 14,
  "word": "preferentemente"
},
{
  "count": 14,
  "word": "visita"
},
{
  "count": 14,
  "word": "busco"
},
{
  "count": 14,
  "word": "minimo"
},
{
  "count": 14,
  "word": "baños"
},
{
  "count": 14,
  "word": "colegas"
},
{
  "count": 14,
  "word": "gravamen"
},
{
  "count": 14,
  "word": "restaurante"
},
{
  "count": 14,
  "word": "crédito"
},
{
  "count": 14,
  "word": "paga"
},
{
  "count": 14,
  "word": "tiene"
},
{
  "count": 14,
  "word": "años"
},
{
  "count": 14,
  "word": "inmueble"
},
{
  "count": 14,
  "word": "c21"
},
{
  "count": 14,
  "word": "cruz"
},
{
  "count": 13,
  "word": "cond"
},
{
  "count": 13,
  "word": "plaza"
},
{
  "count": 13,
  "word": "piraí"
},
{
  "count": 13,
  "word": "barrio"
},
{
  "count": 13,
  "word": "propietario"
},
{
  "count": 13,
  "word": "colinas"
},
{
  "count": 13,
  "word": "urbari"
},
{
  "count": 13,
  "word": "infinity"
},
{
  "count": 13,
  "word": "pto"
},
{
  "count": 12,
  "word": "500"
},
{
  "count": 12,
  "word": "galpón"
},
{
  "count": 12,
  "word": "hacienda"
},
{
  "count": 12,
  "word": "presup"
},
{
  "count": 12,
  "word": "mts2"
},
{
  "count": 12,
  "word": "industrial"
},
{
  "count": 12,
  "word": "esquina"
},
{
  "count": 12,
  "word": "personas"
},
{
  "count": 12,
  "word": "villa"
},
{
  "count": 12,
  "word": "cualquiera"
},
{
  "count": 12,
  "word": "1er"
},
{
  "count": 12,
  "word": "operación"
},
{
  "count": 12,
  "word": "inbox"
},
{
  "count": 12,
  "word": "mantenido"
},
{
  "count": 12,
  "word": "meses"
},
{
  "count": 12,
  "word": "ref"
},
{
  "count": 11,
  "word": "visitar"
},
{
  "count": 11,
  "word": "sup"
},
{
  "count": 11,
  "word": "adelante"
},
{
  "count": 11,
  "word": "smart"
},
{
  "count": 11,
  "word": "colegio"
},
{
  "count": 11,
  "word": "mayo"
},
{
  "count": 11,
  "word": "indispensable"
},
{
  "count": 11,
  "word": "habitable"
},
{
  "count": 11,
  "word": "aurelio"
},
{
  "count": 11,
  "word": "trato"
},
{
  "count": 11,
  "word": "colina"
},
{
  "count": 11,
  "word": "century"
},
{
  "count": 11,
  "word": "construcción"
},
{
  "count": 11,
  "word": "hab"
},
{
  "count": 11,
  "word": "lote"
},
{
  "count": 11,
  "word": "conexion"
},
{
  "count": 11,
  "word": "real"
},
{
  "count": 11,
  "word": "posible"
},
{
  "count": 11,
  "word": "inmobiliaria"
},
{
  "count": 11,
  "word": "mascotas"
},
{
  "count": 10,
  "word": "cliente"
},
{
  "count": 10,
  "word": "plantas"
},
{
  "count": 10,
  "word": "pisos"
},
{
  "count": 10,
  "word": "directo"
},
{
  "count": 10,
  "word": "mayor"
},
{
  "count": 10,
  "word": "bush"
},
{
  "count": 10,
  "word": "vista"
},
{
  "count": 10,
  "word": "irala"
},
{
  "count": 10,
  "word": "ofertas"
},
{
  "count": 10,
  "word": "rojas"
},
{
  "count": 10,
  "word": "tres"
},
{
  "count": 10,
  "word": "garage"
},
{
  "count": 10,
  "word": "hacer"
},
{
  "count": 10,
  "word": "500bs"
},
{
  "count": 10,
  "word": "pasos"
},
{
  "count": 10,
  "word": "aprobado"
},
{
  "count": 10,
  "word": "velarde"
},
{
  "count": 10,
  "word": "inversión"
},
{
  "count": 10,
  "word": "prime"
},
{
  "count": 10,
  "word": "sevillas"
},
{
  "count": 10,
  "word": "centenario"
},
{
  "count": 10,
  "word": "dolares"
},
{
  "count": 10,
  "word": "porton"
},
{
  "count": 10,
  "word": "vehículo"
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

