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
  "count": 723,
  "word": "casa"
},
{
  "count": 588,
  "word": "alquiler"
},
{
  "count": 587,
  "word": "norte"
},
{
  "count": 566,
  "word": "dormitorios"
},
{
  "count": 564,
  "word": "anillo"
},
{
  "count": 424,
  "word": "venta"
},
{
  "count": 371,
  "word": "equipetrol"
},
{
  "count": 355,
  "word": "departamento"
},
{
  "count": 337,
  "word": "compra"
},
{
  "count": 284,
  "word": "condominio"
},
{
  "count": 283,
  "word": "ppto"
},
{
  "count": 230,
  "word": "terreno"
},
{
  "count": 176,
  "word": "dentro"
},
{
  "count": 166,
  "word": "acorde"
},
{
  "count": 150,
  "word": "4to"
},
{
  "count": 148,
  "word": "pago"
},
{
  "count": 148,
  "word": "alemana"
},
{
  "count": 144,
  "word": "contado"
},
{
  "count": 142,
  "word": "monoambiente"
},
{
  "count": 141,
  "word": "amoblado"
},
{
  "count": 138,
  "word": "parqueo"
},
{
  "count": 138,
  "word": "urubo"
},
{
  "count": 132,
  "word": "dormitorio"
},
{
  "count": 128,
  "word": "beni"
},
{
  "count": 126,
  "word": "5to"
},
{
  "count": 123,
  "word": "dpto"
},
{
  "count": 121,
  "word": "urgente"
},
{
  "count": 106,
  "word": "anticretico"
},
{
  "count": 104,
  "word": "oficial"
},
{
  "count": 102,
  "word": "habitaciones"
},
{
  "count": 100,
  "word": "banzer"
},
{
  "count": 100,
  "word": "requiero"
},
{
  "count": 99,
  "word": "cerca"
},
{
  "count": 94,
  "word": "fuera"
},
{
  "count": 91,
  "word": "solo"
},
{
  "count": 86,
  "word": "máximo"
},
{
  "count": 85,
  "word": "tipo"
},
{
  "count": 84,
  "word": "preferencia"
},
{
  "count": 81,
  "word": "comercial"
},
{
  "count": 77,
  "word": "6to"
},
{
  "count": 77,
  "word": "avenida"
},
{
  "count": 74,
  "word": "sur"
},
{
  "count": 68,
  "word": "puede"
},
{
  "count": 67,
  "word": "radial"
},
{
  "count": 66,
  "word": "superficie"
},
{
  "count": 66,
  "word": "canal"
},
{
  "count": 66,
  "word": "piscina"
},
{
  "count": 66,
  "word": "amplio"
},
{
  "count": 66,
  "word": "ser"
},
{
  "count": 64,
  "word": "isuto"
},
{
  "count": 63,
  "word": "maximo"
},
{
  "count": 63,
  "word": "garaje"
},
{
  "count": 62,
  "word": "ideal"
},
{
  "count": 62,
  "word": "7mo"
},
{
  "count": 60,
  "word": "tenga"
},
{
  "count": 59,
  "word": "depto"
},
{
  "count": 57,
  "word": "max"
},
{
  "count": 57,
  "word": "inmediata"
},
{
  "count": 56,
  "word": "este"
},
{
  "count": 55,
  "word": "local"
},
{
  "count": 55,
  "word": "oeste"
},
{
  "count": 54,
  "word": "8vo"
},
{
  "count": 52,
  "word": "sirari"
},
{
  "count": 52,
  "word": "patio"
},
{
  "count": 51,
  "word": "edificio"
},
{
  "count": 51,
  "word": "dorm"
},
{
  "count": 49,
  "word": "busch"
},
{
  "count": 49,
  "word": "cualquier"
},
{
  "count": 49,
  "word": "contacto"
},
{
  "count": 48,
  "word": "san"
},
{
  "count": 48,
  "word": "entrega"
},
{
  "count": 48,
  "word": "zonas"
},
{
  "count": 47,
  "word": "precio"
},
{
  "count": 46,
  "word": "balcón"
},
{
  "count": 45,
  "word": "mínimo"
},
{
  "count": 44,
  "word": "abierto"
},
{
  "count": 44,
  "word": "cocina"
},
{
  "count": 44,
  "word": "cambio"
},
{
  "count": 44,
  "word": "doble"
},
{
  "count": 42,
  "word": "oficina"
},
{
  "count": 42,
  "word": "bancario"
},
{
  "count": 41,
  "word": "lujo"
},
{
  "count": 39,
  "word": "urubó"
},
{
  "count": 39,
  "word": "frente"
},
{
  "count": 38,
  "word": "usd"
},
{
  "count": 37,
  "word": "3er"
},
{
  "count": 37,
  "word": "mil"
},
{
  "count": 37,
  "word": "independiente"
},
{
  "count": 36,
  "word": "pereira"
},
{
  "count": 36,
  "word": "amoblada"
},
{
  "count": 36,
  "word": "sociales"
},
{
  "count": 34,
  "word": "dos"
},
{
  "count": 34,
  "word": "muebles"
},
{
  "count": 34,
  "word": "cotoca"
},
{
  "count": 34,
  "word": "pirai"
},
{
  "count": 34,
  "word": "toma"
},
{
  "count": 34,
  "word": "financiamiento"
},
{
  "count": 33,
  "word": "erwin"
},
{
  "count": 33,
  "word": "coronado"
},
{
  "count": 33,
  "word": "minimo"
},
{
  "count": 33,
  "word": "indistinta"
},
{
  "count": 32,
  "word": "suite"
},
{
  "count": 32,
  "word": "dependencias"
},
{
  "count": 32,
  "word": "baños"
},
{
  "count": 32,
  "word": "guardia"
},
{
  "count": 31,
  "word": "sky"
},
{
  "count": 31,
  "word": "2do"
},
{
  "count": 31,
  "word": "palmas"
},
{
  "count": 31,
  "word": "mutualista"
},
{
  "count": 31,
  "word": "ref"
},
{
  "count": 31,
  "word": "baño"
},
{
  "count": 31,
  "word": "agente"
},
{
  "count": 30,
  "word": "vivienda"
},
{
  "count": 30,
  "word": "sirve"
},
{
  "count": 29,
  "word": "tiene"
},
{
  "count": 29,
  "word": "anticrético"
},
{
  "count": 29,
  "word": "planta"
},
{
  "count": 29,
  "word": "roca"
},
{
  "count": 29,
  "word": "características"
},
{
  "count": 28,
  "word": "piso"
},
{
  "count": 28,
  "word": "preventa"
},
{
  "count": 28,
  "word": "estrenar"
},
{
  "count": 27,
  "word": "preferentemente"
},
{
  "count": 27,
  "word": "dependencia"
},
{
  "count": 27,
  "word": "vía"
},
{
  "count": 27,
  "word": "ubicación"
},
{
  "count": 26,
  "word": "ver"
},
{
  "count": 26,
  "word": "amplia"
},
{
  "count": 26,
  "word": "adelante"
},
{
  "count": 26,
  "word": "amoblar"
},
{
  "count": 25,
  "word": "moderna"
},
{
  "count": 25,
  "word": "hoy"
},
{
  "count": 25,
  "word": "galpon"
},
{
  "count": 25,
  "word": "expensas"
},
{
  "count": 25,
  "word": "inmobiliaria"
},
{
  "count": 24,
  "word": "info"
},
{
  "count": 24,
  "word": "equipado"
},
{
  "count": 24,
  "word": "jardín"
},
{
  "count": 24,
  "word": "bolivianos"
},
{
  "count": 24,
  "word": "calle"
},
{
  "count": 24,
  "word": "centro"
},
{
  "count": 24,
  "word": "inmueble"
},
{
  "count": 24,
  "word": "crédito"
},
{
  "count": 24,
  "word": "mariana"
},
{
  "count": 23,
  "word": "presupuestous"
},
{
  "count": 23,
  "word": "efectivo"
},
{
  "count": 23,
  "word": "remax"
},
{
  "count": 23,
  "word": "información"
},
{
  "count": 23,
  "word": "demás"
},
{
  "count": 23,
  "word": "dólares"
},
{
  "count": 23,
  "word": "menos"
},
{
  "count": 22,
  "word": "metros"
},
{
  "count": 22,
  "word": "indispensable"
},
{
  "count": 22,
  "word": "perrotta"
},
{
  "count": 22,
  "word": "dumont"
},
{
  "count": 22,
  "word": "nuevo"
},
{
  "count": 22,
  "word": "santos"
},
{
  "count": 22,
  "word": "áreas"
},
{
  "count": 21,
  "word": "9no"
},
{
  "count": 21,
  "word": "paragua"
},
{
  "count": 21,
  "word": "pre"
},
{
  "count": 21,
  "word": "anticrÉtico"
},
{
  "count": 21,
  "word": "amplios"
},
{
  "count": 21,
  "word": "servicio"
},
{
  "count": 20,
  "word": "cusis"
},
{
  "count": 20,
  "word": "alto"
},
{
  "count": 20,
  "word": "martin"
},
{
  "count": 20,
  "word": "mainter"
},
{
  "count": 19,
  "word": "posible"
},
{
  "count": 19,
  "word": "negocio"
},
{
  "count": 18,
  "word": "ambientes"
},
{
  "count": 18,
  "word": "esquina"
},
{
  "count": 18,
  "word": "baja"
},
{
  "count": 18,
  "word": "aprox"
},
{
  "count": 18,
  "word": "importante"
},
{
  "count": 18,
  "word": "alrededores"
},
{
  "count": 18,
  "word": "churrasquera"
},
{
  "count": 18,
  "word": "plantas"
},
{
  "count": 18,
  "word": "mañana"
},
{
  "count": 17,
  "word": "año"
},
{
  "count": 17,
  "word": "barrio"
},
{
  "count": 17,
  "word": "propiedad"
},
{
  "count": 17,
  "word": "virgen"
},
{
  "count": 17,
  "word": "bonita"
},
{
  "count": 17,
  "word": "detalle"
},
{
  "count": 16,
  "word": "visita"
},
{
  "count": 16,
  "word": "cliente"
},
{
  "count": 16,
  "word": "presup"
},
{
  "count": 16,
  "word": "mas"
},
{
  "count": 16,
  "word": "living"
},
{
  "count": 16,
  "word": "arriba"
},
{
  "count": 16,
  "word": "mayor"
},
{
  "count": 16,
  "word": "opción"
},
{
  "count": 16,
  "word": "httpslinktreeblurealtybolivia"
},
{
  "count": 16,
  "word": "requiere"
},
{
  "count": 15,
  "word": "oficinas"
},
{
  "count": 15,
  "word": "mes"
},
{
  "count": 15,
  "word": "hectáreas"
},
{
  "count": 15,
  "word": "mónica"
},
{
  "count": 15,
  "word": "cel"
},
{
  "count": 15,
  "word": "macororo"
},
{
  "count": 15,
  "word": "visitas"
},
{
  "count": 15,
  "word": "comisión"
},
{
  "count": 15,
  "word": "escritorio"
},
{
  "count": 15,
  "word": "colegas"
},
{
  "count": 15,
  "word": "construcción"
},
{
  "count": 15,
  "word": "penthouse"
},
{
  "count": 15,
  "word": "baulera"
},
{
  "count": 15,
  "word": "mejor"
},
{
  "count": 14,
  "word": "century"
},
{
  "count": 14,
  "word": "vista"
},
{
  "count": 14,
  "word": "fabiana"
},
{
  "count": 14,
  "word": "quiñones"
},
{
  "count": 14,
  "word": "villa"
},
{
  "count": 14,
  "word": "directo"
},
{
  "count": 14,
  "word": "tiendas"
},
{
  "count": 14,
  "word": "urubÓ"
},
{
  "count": 14,
  "word": "colegio"
},
{
  "count": 14,
  "word": "comedor"
},
{
  "count": 14,
  "word": "laura"
},
{
  "count": 14,
  "word": "años"
},
{
  "count": 14,
  "word": "urbari"
},
{
  "count": 14,
  "word": "infinity"
},
{
  "count": 13,
  "word": "green"
},
{
  "count": 13,
  "word": "buen"
},
{
  "count": 13,
  "word": "hamacas"
},
{
  "count": 13,
  "word": "requerimientos"
},
{
  "count": 13,
  "word": "dolares"
},
{
  "count": 13,
  "word": "bush"
},
{
  "count": 13,
  "word": "vehículos"
},
{
  "count": 13,
  "word": "inversión"
},
{
  "count": 13,
  "word": "areas"
},
{
  "count": 13,
  "word": "carretera"
},
{
  "count": 13,
  "word": "hacienda"
},
{
  "count": 13,
  "word": "mts2"
},
{
  "count": 13,
  "word": "empresa"
},
{
  "count": 13,
  "word": "c21"
},
{
  "count": 13,
  "word": "estado"
},
{
  "count": 13,
  "word": "lote"
},
{
  "count": 13,
  "word": "puente"
},
{
  "count": 12,
  "word": "colina"
},
{
  "count": 12,
  "word": "real"
},
{
  "count": 12,
  "word": "visitar"
},
{
  "count": 12,
  "word": "busca"
},
{
  "count": 12,
  "word": "equipada"
},
{
  "count": 12,
  "word": "avenidas"
},
{
  "count": 12,
  "word": "ciudad"
},
{
  "count": 12,
  "word": "bonito"
},
{
  "count": 12,
  "word": "enviar"
},
{
  "count": 12,
  "word": "departamentos"
},
{
  "count": 12,
  "word": "paga"
},
{
  "count": 12,
  "word": "contrato"
},
{
  "count": 12,
  "word": "udabol"
},
{
  "count": 12,
  "word": "restaurante"
},
{
  "count": 12,
  "word": "buena"
},
{
  "count": 12,
  "word": "cerrado"
},
{
  "count": 12,
  "word": "semi"
},
{
  "count": 12,
  "word": "privado"
},
{
  "count": 12,
  "word": "requisitos"
},
{
  "count": 12,
  "word": "garantía"
},
{
  "count": 12,
  "word": "casas"
},
{
  "count": 11,
  "word": "meses"
},
{
  "count": 11,
  "word": "grande"
},
{
  "count": 11,
  "word": "salle"
},
{
  "count": 11,
  "word": "propietario"
},
{
  "count": 11,
  "word": "mercado"
},
{
  "count": 11,
  "word": "prime"
},
{
  "count": 11,
  "word": "martín"
},
{
  "count": 11,
  "word": "zonanorte"
},
{
  "count": 11,
  "word": "operación"
},
{
  "count": 11,
  "word": "sólo"
},
{
  "count": 11,
  "word": "inmobiliario"
},
{
  "count": 11,
  "word": "sala"
},
{
  "count": 11,
  "word": "esté"
},
{
  "count": 11,
  "word": "village"
},
{
  "count": 11,
  "word": "construir"
},
{
  "count": 11,
  "word": "balcon"
},
{
  "count": 11,
  "word": "sup"
},
{
  "count": 11,
  "word": "nueva"
},
{
  "count": 10,
  "word": "edificios"
},
{
  "count": 10,
  "word": "kevincuellarc21"
},
{
  "count": 10,
  "word": "pase"
},
{
  "count": 10,
  "word": "bosques"
},
{
  "count": 10,
  "word": "req"
},
{
  "count": 10,
  "word": "acepten"
},
{
  "count": 10,
  "word": "plaza"
},
{
  "count": 10,
  "word": "mÁximo"
},
{
  "count": 10,
  "word": "gas"
},
{
  "count": 10,
  "word": "uso"
},
{
  "count": 10,
  "word": "operaciÓn"
},
{
  "count": 10,
  "word": "sevillas"
},
{
  "count": 10,
  "word": "bonitas"
},
{
  "count": 10,
  "word": "parque"
},
{
  "count": 10,
  "word": "alta"
},
{
  "count": 10,
  "word": "antigua"
},
{
  "count": 10,
  "word": "777188"
},
{
  "count": 10,
  "word": "condominios"
},
{
  "count": 10,
  "word": "mérida"
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

