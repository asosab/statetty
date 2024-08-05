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
  "count": 884,
  "word": "casa"
},
{
  "count": 820,
  "word": "anillo"
},
{
  "count": 754,
  "word": "norte"
},
{
  "count": 671,
  "word": "dormitorios"
},
{
  "count": 656,
  "word": "alquiler"
},
{
  "count": 561,
  "word": "venta"
},
{
  "count": 424,
  "word": "departamento"
},
{
  "count": 421,
  "word": "compra"
},
{
  "count": 420,
  "word": "equipetrol"
},
{
  "count": 386,
  "word": "condominio"
},
{
  "count": 371,
  "word": "ppto"
},
{
  "count": 365,
  "word": "terreno"
},
{
  "count": 239,
  "word": "dentro"
},
{
  "count": 225,
  "word": "4to"
},
{
  "count": 208,
  "word": "acorde"
},
{
  "count": 204,
  "word": "5to"
},
{
  "count": 202,
  "word": "monoambiente"
},
{
  "count": 191,
  "word": "alemana"
},
{
  "count": 190,
  "word": "pago"
},
{
  "count": 174,
  "word": "dormitorio"
},
{
  "count": 168,
  "word": "anticretico"
},
{
  "count": 167,
  "word": "amoblado"
},
{
  "count": 161,
  "word": "contado"
},
{
  "count": 159,
  "word": "oficial"
},
{
  "count": 159,
  "word": "urubo"
},
{
  "count": 153,
  "word": "beni"
},
{
  "count": 147,
  "word": "avenida"
},
{
  "count": 142,
  "word": "fuera"
},
{
  "count": 140,
  "word": "parqueo"
},
{
  "count": 139,
  "word": "solo"
},
{
  "count": 139,
  "word": "urgente"
},
{
  "count": 138,
  "word": "dpto"
},
{
  "count": 137,
  "word": "máximo"
},
{
  "count": 131,
  "word": "tipo"
},
{
  "count": 128,
  "word": "requiero"
},
{
  "count": 124,
  "word": "habitaciones"
},
{
  "count": 119,
  "word": "garaje"
},
{
  "count": 118,
  "word": "oeste"
},
{
  "count": 118,
  "word": "sur"
},
{
  "count": 118,
  "word": "banzer"
},
{
  "count": 117,
  "word": "cerca"
},
{
  "count": 109,
  "word": "preferencia"
},
{
  "count": 107,
  "word": "comercial"
},
{
  "count": 106,
  "word": "inmediata"
},
{
  "count": 102,
  "word": "8vo"
},
{
  "count": 102,
  "word": "6to"
},
{
  "count": 100,
  "word": "superficie"
},
{
  "count": 98,
  "word": "puede"
},
{
  "count": 95,
  "word": "radial"
},
{
  "count": 93,
  "word": "usd"
},
{
  "count": 93,
  "word": "depto"
},
{
  "count": 88,
  "word": "ser"
},
{
  "count": 84,
  "word": "zonas"
},
{
  "count": 82,
  "word": "maximo"
},
{
  "count": 80,
  "word": "max"
},
{
  "count": 74,
  "word": "cambio"
},
{
  "count": 69,
  "word": "7mo"
},
{
  "count": 67,
  "word": "cualquier"
},
{
  "count": 67,
  "word": "local"
},
{
  "count": 66,
  "word": "tenga"
},
{
  "count": 66,
  "word": "toma"
},
{
  "count": 66,
  "word": "doble"
},
{
  "count": 63,
  "word": "dorm"
},
{
  "count": 63,
  "word": "isuto"
},
{
  "count": 60,
  "word": "contacto"
},
{
  "count": 59,
  "word": "amplio"
},
{
  "count": 59,
  "word": "piscina"
},
{
  "count": 58,
  "word": "efectivo"
},
{
  "count": 56,
  "word": "2do"
},
{
  "count": 55,
  "word": "canal"
},
{
  "count": 55,
  "word": "dependencias"
},
{
  "count": 54,
  "word": "este"
},
{
  "count": 54,
  "word": "guardia"
},
{
  "count": 54,
  "word": "ideal"
},
{
  "count": 54,
  "word": "busch"
},
{
  "count": 51,
  "word": "san"
},
{
  "count": 51,
  "word": "edificio"
},
{
  "count": 49,
  "word": "mínimo"
},
{
  "count": 48,
  "word": "oficina"
},
{
  "count": 48,
  "word": "dumont"
},
{
  "count": 48,
  "word": "frente"
},
{
  "count": 47,
  "word": "abierto"
},
{
  "count": 46,
  "word": "sirari"
},
{
  "count": 46,
  "word": "amoblar"
},
{
  "count": 46,
  "word": "características"
},
{
  "count": 45,
  "word": "santos"
},
{
  "count": 43,
  "word": "centro"
},
{
  "count": 43,
  "word": "vivienda"
},
{
  "count": 42,
  "word": "nueva"
},
{
  "count": 42,
  "word": "entrega"
},
{
  "count": 42,
  "word": "remax"
},
{
  "count": 41,
  "word": "coronado"
},
{
  "count": 41,
  "word": "sirve"
},
{
  "count": 41,
  "word": "roca"
},
{
  "count": 40,
  "word": "suite"
},
{
  "count": 40,
  "word": "dos"
},
{
  "count": 40,
  "word": "demás"
},
{
  "count": 40,
  "word": "palmas"
},
{
  "count": 40,
  "word": "mil"
},
{
  "count": 40,
  "word": "hoy"
},
{
  "count": 40,
  "word": "independiente"
},
{
  "count": 39,
  "word": "agente"
},
{
  "count": 39,
  "word": "sociales"
},
{
  "count": 38,
  "word": "expensas"
},
{
  "count": 37,
  "word": "dólares"
},
{
  "count": 36,
  "word": "sky"
},
{
  "count": 36,
  "word": "bolivianos"
},
{
  "count": 36,
  "word": "alrededores"
},
{
  "count": 35,
  "word": "vehículos"
},
{
  "count": 35,
  "word": "urubó"
},
{
  "count": 35,
  "word": "inmueble"
},
{
  "count": 35,
  "word": "3er"
},
{
  "count": 35,
  "word": "paragua"
},
{
  "count": 35,
  "word": "mariana"
},
{
  "count": 35,
  "word": "vía"
},
{
  "count": 34,
  "word": "dependencia"
},
{
  "count": 34,
  "word": "muebles"
},
{
  "count": 34,
  "word": "ver"
},
{
  "count": 34,
  "word": "estrenar"
},
{
  "count": 34,
  "word": "patio"
},
{
  "count": 33,
  "word": "perrotta"
},
{
  "count": 33,
  "word": "negocio"
},
{
  "count": 33,
  "word": "cocina"
},
{
  "count": 33,
  "word": "sólo"
},
{
  "count": 33,
  "word": "nuevo"
},
{
  "count": 33,
  "word": "amoblada"
},
{
  "count": 32,
  "word": "buen"
},
{
  "count": 32,
  "word": "bancario"
},
{
  "count": 32,
  "word": "financiamiento"
},
{
  "count": 32,
  "word": "ubicación"
},
{
  "count": 31,
  "word": "infinity"
},
{
  "count": 31,
  "word": "universidad"
},
{
  "count": 31,
  "word": "calle"
},
{
  "count": 31,
  "word": "áreas"
},
{
  "count": 31,
  "word": "detalle"
},
{
  "count": 30,
  "word": "pirai"
},
{
  "count": 29,
  "word": "oficinas"
},
{
  "count": 29,
  "word": "balcón"
},
{
  "count": 29,
  "word": "antigua"
},
{
  "count": 29,
  "word": "moderna"
},
{
  "count": 29,
  "word": "empresa"
},
{
  "count": 29,
  "word": "pre"
},
{
  "count": 29,
  "word": "info"
},
{
  "count": 29,
  "word": "mejor"
},
{
  "count": 29,
  "word": "cusis"
},
{
  "count": 29,
  "word": "udabol"
},
{
  "count": 29,
  "word": "estado"
},
{
  "count": 28,
  "word": "precio"
},
{
  "count": 28,
  "word": "mutualista"
},
{
  "count": 28,
  "word": "pto"
},
{
  "count": 28,
  "word": "preventa"
},
{
  "count": 27,
  "word": "amplia"
},
{
  "count": 27,
  "word": "parque"
},
{
  "count": 27,
  "word": "quiñones"
},
{
  "count": 27,
  "word": "fabiana"
},
{
  "count": 27,
  "word": "información"
},
{
  "count": 27,
  "word": "cotoca"
},
{
  "count": 26,
  "word": "operacion"
},
{
  "count": 26,
  "word": "aprox"
},
{
  "count": 26,
  "word": "planta"
},
{
  "count": 25,
  "word": "anticrÉtico"
},
{
  "count": 25,
  "word": "principal"
},
{
  "count": 25,
  "word": "tiene"
},
{
  "count": 25,
  "word": "servicio"
},
{
  "count": 25,
  "word": "lujo"
},
{
  "count": 24,
  "word": "colegas"
},
{
  "count": 24,
  "word": "galpon"
},
{
  "count": 24,
  "word": "baño"
},
{
  "count": 24,
  "word": "barrio"
},
{
  "count": 23,
  "word": "baños"
},
{
  "count": 23,
  "word": "anticrético"
},
{
  "count": 23,
  "word": "9no"
},
{
  "count": 23,
  "word": "directo"
},
{
  "count": 23,
  "word": "similar"
},
{
  "count": 23,
  "word": "enviar"
},
{
  "count": 22,
  "word": "restaurante"
},
{
  "count": 22,
  "word": "inmobiliaria"
},
{
  "count": 22,
  "word": "condominios"
},
{
  "count": 22,
  "word": "hacienda"
},
{
  "count": 22,
  "word": "escritorio"
},
{
  "count": 22,
  "word": "ambientes"
},
{
  "count": 22,
  "word": "propietario"
},
{
  "count": 21,
  "word": "trato"
},
{
  "count": 21,
  "word": "ref"
},
{
  "count": 21,
  "word": "churrasquera"
},
{
  "count": 21,
  "word": "remanso"
},
{
  "count": 21,
  "word": "mayor"
},
{
  "count": 21,
  "word": "carretera"
},
{
  "count": 21,
  "word": "santa"
},
{
  "count": 21,
  "word": "minimo"
},
{
  "count": 21,
  "word": "cerrado"
},
{
  "count": 20,
  "word": "century"
},
{
  "count": 20,
  "word": "crédito"
},
{
  "count": 20,
  "word": "construcción"
},
{
  "count": 20,
  "word": "c21"
},
{
  "count": 20,
  "word": "colinas"
},
{
  "count": 20,
  "word": "virgen"
},
{
  "count": 20,
  "word": "presup"
},
{
  "count": 20,
  "word": "mts2"
},
{
  "count": 20,
  "word": "comisión"
},
{
  "count": 20,
  "word": "sup"
},
{
  "count": 20,
  "word": "galpón"
},
{
  "count": 20,
  "word": "500"
},
{
  "count": 20,
  "word": "propiedad"
},
{
  "count": 19,
  "word": "paga"
},
{
  "count": 19,
  "word": "meses"
},
{
  "count": 19,
  "word": "cruz"
},
{
  "count": 19,
  "word": "años"
},
{
  "count": 19,
  "word": "operaciÓn"
},
{
  "count": 19,
  "word": "preferentemente"
},
{
  "count": 18,
  "word": "mañana"
},
{
  "count": 18,
  "word": "pasos"
},
{
  "count": 18,
  "word": "urbari"
},
{
  "count": 18,
  "word": "inversión"
},
{
  "count": 18,
  "word": "sevillas"
},
{
  "count": 18,
  "word": "garage"
},
{
  "count": 17,
  "word": "aprobado"
},
{
  "count": 17,
  "word": "colina"
},
{
  "count": 17,
  "word": "hectáreas"
},
{
  "count": 17,
  "word": "facturado"
},
{
  "count": 17,
  "word": "smart"
},
{
  "count": 17,
  "word": "plaza"
},
{
  "count": 17,
  "word": "inf"
},
{
  "count": 17,
  "word": "cliente"
},
{
  "count": 17,
  "word": "adelante"
},
{
  "count": 17,
  "word": "busco"
},
{
  "count": 17,
  "word": "villa"
},
{
  "count": 17,
  "word": "personas"
},
{
  "count": 17,
  "word": "habitaciónes"
},
{
  "count": 17,
  "word": "bush"
},
{
  "count": 16,
  "word": "inbox"
},
{
  "count": 16,
  "word": "esté"
},
{
  "count": 16,
  "word": "mas"
},
{
  "count": 16,
  "word": "dolares"
},
{
  "count": 16,
  "word": "aproximadamente"
},
{
  "count": 16,
  "word": "incluidas"
},
{
  "count": 16,
  "word": "piso"
},
{
  "count": 16,
  "word": "cond"
},
{
  "count": 16,
  "word": "pisos"
},
{
  "count": 16,
  "word": "libre"
},
{
  "count": 16,
  "word": "urbano"
},
{
  "count": 16,
  "word": "tres"
},
{
  "count": 15,
  "word": "gravamen"
},
{
  "count": 15,
  "word": "macororo"
},
{
  "count": 15,
  "word": "plan"
},
{
  "count": 15,
  "word": "requerimientos"
},
{
  "count": 15,
  "word": "maría"
},
{
  "count": 15,
  "word": "real"
},
{
  "count": 15,
  "word": "arriba"
},
{
  "count": 15,
  "word": "posible"
},
{
  "count": 15,
  "word": "visitar"
},
{
  "count": 15,
  "word": "visita"
},
{
  "count": 15,
  "word": "industrial"
},
{
  "count": 15,
  "word": "golf"
},
{
  "count": 15,
  "word": "moderno"
},
{
  "count": 15,
  "word": "asesora"
},
{
  "count": 14,
  "word": "cualquiera"
},
{
  "count": 14,
  "word": "menos"
},
{
  "count": 14,
  "word": "pequeña"
},
{
  "count": 14,
  "word": "living"
},
{
  "count": 14,
  "word": "casas"
},
{
  "count": 14,
  "word": "suelo"
},
{
  "count": 14,
  "word": "acepten"
},
{
  "count": 14,
  "word": "plantas"
},
{
  "count": 14,
  "word": "uso"
},
{
  "count": 14,
  "word": "ofertas"
},
{
  "count": 14,
  "word": "piraí"
},
{
  "count": 14,
  "word": "mínima"
},
{
  "count": 13,
  "word": "operación"
},
{
  "count": 13,
  "word": "500bs"
},
{
  "count": 13,
  "word": "1er"
},
{
  "count": 13,
  "word": "indistinta"
},
{
  "count": 13,
  "word": "mascotas"
},
{
  "count": 13,
  "word": "mantenido"
},
{
  "count": 13,
  "word": "conexion"
},
{
  "count": 13,
  "word": "estate"
},
{
  "count": 13,
  "word": "gimac"
},
{
  "count": 13,
  "word": "cerrar"
},
{
  "count": 13,
  "word": "sala"
},
{
  "count": 13,
  "word": "banco"
},
{
  "count": 13,
  "word": "irala"
},
{
  "count": 13,
  "word": "inmobiliario"
},
{
  "count": 13,
  "word": "mayo"
},
{
  "count": 13,
  "word": "mt2"
},
{
  "count": 12,
  "word": "studio"
},
{
  "count": 12,
  "word": "máx"
},
{
  "count": 12,
  "word": "credito"
},
{
  "count": 12,
  "word": "telf"
},
{
  "count": 12,
  "word": "porton"
},
{
  "count": 12,
  "word": "lote"
},
{
  "count": 12,
  "word": "centenario"
},
{
  "count": 12,
  "word": "tengan"
},
{
  "count": 12,
  "word": "colegio"
},
{
  "count": 12,
  "word": "httpslinktreeblurealtybolivia"
},
{
  "count": 12,
  "word": "puente"
},
{
  "count": 12,
  "word": "sevilla"
},
{
  "count": 12,
  "word": "jardín"
},
{
  "count": 12,
  "word": "requiere"
},
{
  "count": 12,
  "word": "rojas"
},
{
  "count": 12,
  "word": "aurelio"
},
{
  "count": 12,
  "word": "indispensable"
},
{
  "count": 12,
  "word": "cen"
},
{
  "count": 12,
  "word": "esquina"
},
{
  "count": 12,
  "word": "condiciones"
},
{
  "count": 11,
  "word": "servicios"
},
{
  "count": 11,
  "word": "hab"
},
{
  "count": 11,
  "word": "nota"
},
{
  "count": 11,
  "word": "electrica"
},
{
  "count": 11,
  "word": "media"
},
{
  "count": 11,
  "word": "500m2"
},
{
  "count": 11,
  "word": "jardin"
},
{
  "count": 11,
  "word": "hacer"
},
{
  "count": 11,
  "word": "tarde"
},
{
  "count": 11,
  "word": "energia"
},
{
  "count": 11,
  "word": "embardado"
},
{
  "count": 11,
  "word": "village"
},
{
  "count": 11,
  "word": "cuarto"
},
{
  "count": 11,
  "word": "informacion"
},
{
  "count": 11,
  "word": "cumavi"
},
{
  "count": 11,
  "word": "gas"
},
{
  "count": 11,
  "word": "cercano"
},
{
  "count": 11,
  "word": "mostrar"
},
{
  "count": 11,
  "word": "agua"
},
{
  "count": 11,
  "word": "aumentar"
},
{
  "count": 11,
  "word": "medidor"
},
{
  "count": 11,
  "word": "trifasica"
},
{
  "count": 11,
  "word": "agosto"
},
{
  "count": 11,
  "word": "habitable"
},
{
  "count": 11,
  "word": "departamentos"
},
{
  "count": 11,
  "word": "año"
},
{
  "count": 11,
  "word": "camiri"
},
{
  "count": 11,
  "word": "lejos"
},
{
  "count": 11,
  "word": "lugar"
},
{
  "count": 11,
  "word": "comedor"
},
{
  "count": 10,
  "word": "velarde"
},
{
  "count": 10,
  "word": "alto"
},
{
  "count": 10,
  "word": "saldo"
},
{
  "count": 10,
  "word": "fontana"
},
{
  "count": 10,
  "word": "vehículo"
},
{
  "count": 10,
  "word": "upsa"
},
{
  "count": 10,
  "word": "capacidad"
},
{
  "count": 10,
  "word": "prime"
},
{
  "count": 10,
  "word": "cel"
},
{
  "count": 10,
  "word": "mainter"
},
{
  "count": 10,
  "word": "vista"
},
{
  "count": 10,
  "word": "excelente"
},
{
  "count": 10,
  "word": "amplios"
},
{
  "count": 10,
  "word": "negociable"
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

