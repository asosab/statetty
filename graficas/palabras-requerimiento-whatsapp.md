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
  "count": 9623,
  "word": "casa"
},
{
  "count": 7907,
  "word": "alquiler"
},
{
  "count": 7850,
  "word": "norte"
},
{
  "count": 7743,
  "word": "anillo"
},
{
  "count": 7438,
  "word": "dormitorios"
},
{
  "count": 5110,
  "word": "venta"
},
{
  "count": 4630,
  "word": "departamento"
},
{
  "count": 4061,
  "word": "equipetrol"
},
{
  "count": 3797,
  "word": "condominio"
},
{
  "count": 3768,
  "word": "compra"
},
{
  "count": 3466,
  "word": "ppto"
},
{
  "count": 2921,
  "word": "terreno"
},
{
  "count": 2323,
  "word": "dentro"
},
{
  "count": 1966,
  "word": "acorde"
},
{
  "count": 1898,
  "word": "4to"
},
{
  "count": 1792,
  "word": "dormitorio"
},
{
  "count": 1705,
  "word": "parqueo"
},
{
  "count": 1693,
  "word": "urubo"
},
{
  "count": 1673,
  "word": "amoblado"
},
{
  "count": 1668,
  "word": "anticretico"
},
{
  "count": 1647,
  "word": "5to"
},
{
  "count": 1617,
  "word": "urgente"
},
{
  "count": 1606,
  "word": "monoambiente"
},
{
  "count": 1585,
  "word": "alemana"
},
{
  "count": 1553,
  "word": "dpto"
},
{
  "count": 1477,
  "word": "contado"
},
{
  "count": 1447,
  "word": "pago"
},
{
  "count": 1446,
  "word": "beni"
},
{
  "count": 1400,
  "word": "requiero"
},
{
  "count": 1329,
  "word": "oficial"
},
{
  "count": 1321,
  "word": "habitaciones"
},
{
  "count": 1265,
  "word": "máximo"
},
{
  "count": 1255,
  "word": "6to"
},
{
  "count": 1165,
  "word": "fuera"
},
{
  "count": 1140,
  "word": "tipo"
},
{
  "count": 1139,
  "word": "solo"
},
{
  "count": 1138,
  "word": "preferencia"
},
{
  "count": 1116,
  "word": "sur"
},
{
  "count": 1093,
  "word": "inmediata"
},
{
  "count": 1090,
  "word": "banzer"
},
{
  "count": 1089,
  "word": "cerca"
},
{
  "count": 1071,
  "word": "avenida"
},
{
  "count": 1029,
  "word": "oeste"
},
{
  "count": 980,
  "word": "garaje"
},
{
  "count": 925,
  "word": "comercial"
},
{
  "count": 880,
  "word": "8vo"
},
{
  "count": 861,
  "word": "piscina"
},
{
  "count": 849,
  "word": "7mo"
},
{
  "count": 818,
  "word": "superficie"
},
{
  "count": 814,
  "word": "radial"
},
{
  "count": 755,
  "word": "puede"
},
{
  "count": 728,
  "word": "este"
},
{
  "count": 715,
  "word": "depto"
},
{
  "count": 702,
  "word": "max"
},
{
  "count": 697,
  "word": "toma"
},
{
  "count": 679,
  "word": "tenga"
},
{
  "count": 677,
  "word": "amplio"
},
{
  "count": 659,
  "word": "ser"
},
{
  "count": 651,
  "word": "contacto"
},
{
  "count": 646,
  "word": "dorm"
},
{
  "count": 628,
  "word": "usd"
},
{
  "count": 625,
  "word": "ideal"
},
{
  "count": 622,
  "word": "maximo"
},
{
  "count": 622,
  "word": "cambio"
},
{
  "count": 613,
  "word": "local"
},
{
  "count": 613,
  "word": "cualquier"
},
{
  "count": 611,
  "word": "mínimo"
},
{
  "count": 610,
  "word": "independiente"
},
{
  "count": 602,
  "word": "dependencias"
},
{
  "count": 601,
  "word": "doble"
},
{
  "count": 593,
  "word": "abierto"
},
{
  "count": 585,
  "word": "zonas"
},
{
  "count": 582,
  "word": "isuto"
},
{
  "count": 573,
  "word": "coronado"
},
{
  "count": 553,
  "word": "roca"
},
{
  "count": 550,
  "word": "edificio"
},
{
  "count": 546,
  "word": "amoblada"
},
{
  "count": 544,
  "word": "precio"
},
{
  "count": 521,
  "word": "canal"
},
{
  "count": 514,
  "word": "palmas"
},
{
  "count": 508,
  "word": "características"
},
{
  "count": 503,
  "word": "muebles"
},
{
  "count": 497,
  "word": "entrega"
},
{
  "count": 495,
  "word": "cocina"
},
{
  "count": 486,
  "word": "guardia"
},
{
  "count": 469,
  "word": "frente"
},
{
  "count": 465,
  "word": "patio"
},
{
  "count": 465,
  "word": "2do"
},
{
  "count": 463,
  "word": "oficina"
},
{
  "count": 457,
  "word": "sociales"
},
{
  "count": 440,
  "word": "información"
},
{
  "count": 430,
  "word": "busch"
},
{
  "count": 422,
  "word": "3er"
},
{
  "count": 422,
  "word": "expensas"
},
{
  "count": 411,
  "word": "demás"
},
{
  "count": 407,
  "word": "agente"
},
{
  "count": 406,
  "word": "suite"
},
{
  "count": 402,
  "word": "urubó"
},
{
  "count": 394,
  "word": "amoblar"
},
{
  "count": 389,
  "word": "info"
},
{
  "count": 387,
  "word": "bancario"
},
{
  "count": 383,
  "word": "bolivianos"
},
{
  "count": 382,
  "word": "sirari"
},
{
  "count": 381,
  "word": "san"
},
{
  "count": 379,
  "word": "sky"
},
{
  "count": 378,
  "word": "sirve"
},
{
  "count": 377,
  "word": "cotoca"
},
{
  "count": 375,
  "word": "dumont"
},
{
  "count": 373,
  "word": "dos"
},
{
  "count": 371,
  "word": "santos"
},
{
  "count": 369,
  "word": "inmueble"
},
{
  "count": 363,
  "word": "indistinta"
},
{
  "count": 357,
  "word": "amplia"
},
{
  "count": 346,
  "word": "estrenar"
},
{
  "count": 342,
  "word": "balcón"
},
{
  "count": 340,
  "word": "mil"
},
{
  "count": 336,
  "word": "ref"
},
{
  "count": 334,
  "word": "centro"
},
{
  "count": 332,
  "word": "planta"
},
{
  "count": 328,
  "word": "vía"
},
{
  "count": 326,
  "word": "ubicación"
},
{
  "count": 323,
  "word": "financiamiento"
},
{
  "count": 321,
  "word": "lujo"
},
{
  "count": 318,
  "word": "vivienda"
},
{
  "count": 318,
  "word": "mutualista"
},
{
  "count": 317,
  "word": "nueva"
},
{
  "count": 315,
  "word": "baño"
},
{
  "count": 310,
  "word": "ver"
},
{
  "count": 310,
  "word": "baños"
},
{
  "count": 309,
  "word": "preventa"
},
{
  "count": 303,
  "word": "efectivo"
},
{
  "count": 302,
  "word": "paragua"
},
{
  "count": 297,
  "word": "nuevo"
},
{
  "count": 292,
  "word": "áreas"
},
{
  "count": 292,
  "word": "dólares"
},
{
  "count": 291,
  "word": "pirai"
},
{
  "count": 290,
  "word": "dependencia"
},
{
  "count": 288,
  "word": "mejor"
},
{
  "count": 286,
  "word": "calle"
},
{
  "count": 284,
  "word": "escritorio"
},
{
  "count": 284,
  "word": "anticrÉtico"
},
{
  "count": 282,
  "word": "anticrético"
},
{
  "count": 272,
  "word": "minimo"
},
{
  "count": 272,
  "word": "pre"
},
{
  "count": 272,
  "word": "inmobiliaria"
},
{
  "count": 268,
  "word": "oficinas"
},
{
  "count": 263,
  "word": "hoy"
},
{
  "count": 260,
  "word": "moderna"
},
{
  "count": 259,
  "word": "enviar"
},
{
  "count": 259,
  "word": "empresa"
},
{
  "count": 257,
  "word": "mariana"
},
{
  "count": 254,
  "word": "buen"
},
{
  "count": 253,
  "word": "ambientes"
},
{
  "count": 252,
  "word": "remax"
},
{
  "count": 252,
  "word": "tiene"
},
{
  "count": 249,
  "word": "crédito"
},
{
  "count": 246,
  "word": "perrotta"
},
{
  "count": 246,
  "word": "9no"
},
{
  "count": 245,
  "word": "antigua"
},
{
  "count": 243,
  "word": "adelante"
},
{
  "count": 242,
  "word": "jardín"
},
{
  "count": 242,
  "word": "mayor"
},
{
  "count": 236,
  "word": "galpon"
},
{
  "count": 232,
  "word": "comedor"
},
{
  "count": 229,
  "word": "galpón"
},
{
  "count": 229,
  "word": "baja"
},
{
  "count": 229,
  "word": "aprox"
},
{
  "count": 228,
  "word": "remanso"
},
{
  "count": 228,
  "word": "construcción"
},
{
  "count": 227,
  "word": "estado"
},
{
  "count": 227,
  "word": "udabol"
},
{
  "count": 226,
  "word": "negocio"
},
{
  "count": 226,
  "word": "santa"
},
{
  "count": 225,
  "word": "virgen"
},
{
  "count": 225,
  "word": "colegas"
},
{
  "count": 225,
  "word": "arriba"
},
{
  "count": 224,
  "word": "cruz"
},
{
  "count": 224,
  "word": "cusis"
},
{
  "count": 222,
  "word": "cliente"
},
{
  "count": 220,
  "word": "hacienda"
},
{
  "count": 220,
  "word": "alrededores"
},
{
  "count": 219,
  "word": "churrasquera"
},
{
  "count": 217,
  "word": "acepten"
},
{
  "count": 216,
  "word": "barrio"
},
{
  "count": 215,
  "word": "piso"
},
{
  "count": 214,
  "word": "mas"
},
{
  "count": 213,
  "word": "colinas"
},
{
  "count": 211,
  "word": "sala"
},
{
  "count": 211,
  "word": "presup"
},
{
  "count": 210,
  "word": "vehículos"
},
{
  "count": 210,
  "word": "menos"
},
{
  "count": 207,
  "word": "cerrado"
},
{
  "count": 206,
  "word": "500"
},
{
  "count": 205,
  "word": "parque"
},
{
  "count": 204,
  "word": "urubÓ"
},
{
  "count": 202,
  "word": "century"
},
{
  "count": 202,
  "word": "macororo"
},
{
  "count": 199,
  "word": "detalle"
},
{
  "count": 197,
  "word": "mañana"
},
{
  "count": 196,
  "word": "servicio"
},
{
  "count": 195,
  "word": "preferentemente"
},
{
  "count": 195,
  "word": "pereira"
},
{
  "count": 194,
  "word": "plantas"
},
{
  "count": 194,
  "word": "amplios"
},
{
  "count": 193,
  "word": "villa"
},
{
  "count": 192,
  "word": "bush"
},
{
  "count": 187,
  "word": "inversión"
},
{
  "count": 185,
  "word": "indispensable"
},
{
  "count": 182,
  "word": "caracteristicas"
},
{
  "count": 176,
  "word": "500bs"
},
{
  "count": 175,
  "word": "posible"
},
{
  "count": 174,
  "word": "propiedad"
},
{
  "count": 172,
  "word": "cond"
},
{
  "count": 171,
  "word": "requisitos"
},
{
  "count": 171,
  "word": "condominios"
},
{
  "count": 171,
  "word": "sup"
},
{
  "count": 170,
  "word": "colegio"
},
{
  "count": 170,
  "word": "alto"
},
{
  "count": 170,
  "word": "sevillas"
},
{
  "count": 170,
  "word": "comisión"
},
{
  "count": 170,
  "word": "directo"
},
{
  "count": 168,
  "word": "favor"
},
{
  "count": 167,
  "word": "sevilla"
},
{
  "count": 164,
  "word": "operación"
},
{
  "count": 164,
  "word": "erwin"
},
{
  "count": 163,
  "word": "meses"
},
{
  "count": 163,
  "word": "visitas"
},
{
  "count": 163,
  "word": "living"
},
{
  "count": 158,
  "word": "balcon"
},
{
  "count": 155,
  "word": "c21"
},
{
  "count": 154,
  "word": "requerimientos"
},
{
  "count": 154,
  "word": "moderno"
},
{
  "count": 154,
  "word": "colina"
},
{
  "count": 153,
  "word": "uso"
},
{
  "count": 153,
  "word": "mascotas"
},
{
  "count": 152,
  "word": "puente"
},
{
  "count": 152,
  "word": "pto"
},
{
  "count": 152,
  "word": "metros"
},
{
  "count": 152,
  "word": "principal"
},
{
  "count": 150,
  "word": "bonita"
},
{
  "count": 149,
  "word": "incluidas"
},
{
  "count": 149,
  "word": "importante"
},
{
  "count": 149,
  "word": "dolares"
},
{
  "count": 146,
  "word": "vista"
},
{
  "count": 141,
  "word": "pueda"
},
{
  "count": 140,
  "word": "años"
},
{
  "count": 139,
  "word": "sólo"
},
{
  "count": 139,
  "word": "carretera"
},
{
  "count": 139,
  "word": "visitar"
},
{
  "count": 138,
  "word": "parqueos"
},
{
  "count": 138,
  "word": "urbari"
},
{
  "count": 136,
  "word": "espacio"
},
{
  "count": 135,
  "word": "facturado"
},
{
  "count": 135,
  "word": "visita"
},
{
  "count": 134,
  "word": "mes"
},
{
  "count": 134,
  "word": "esquina"
},
{
  "count": 133,
  "word": "casas"
},
{
  "count": 133,
  "word": "industrial"
},
{
  "count": 132,
  "word": "pisos"
},
{
  "count": 132,
  "word": "real"
},
{
  "count": 131,
  "word": "mainter"
},
{
  "count": 129,
  "word": "inmobiliario"
},
{
  "count": 128,
  "word": "ciudad"
},
{
  "count": 128,
  "word": "propietario"
},
{
  "count": 128,
  "word": "aprobado"
},
{
  "count": 128,
  "word": "agosto"
},
{
  "count": 127,
  "word": "pasos"
},
{
  "count": 127,
  "word": "mts2"
},
{
  "count": 126,
  "word": "hectáreas"
},
{
  "count": 123,
  "word": "operacion"
},
{
  "count": 122,
  "word": "privado"
},
{
  "count": 121,
  "word": "adelantado"
},
{
  "count": 121,
  "word": "pamelamoreno"
},
{
  "count": 121,
  "word": "departamentos"
},
{
  "count": 121,
  "word": "buena"
},
{
  "count": 121,
  "word": "propia"
},
{
  "count": 119,
  "word": "cualquiera"
},
{
  "count": 118,
  "word": "home"
},
{
  "count": 118,
  "word": "universidad"
},
{
  "count": 117,
  "word": "prime"
},
{
  "count": 117,
  "word": "opciones"
},
{
  "count": 117,
  "word": "Áreas"
},
{
  "count": 117,
  "word": "alta"
},
{
  "count": 115,
  "word": "grande"
},
{
  "count": 114,
  "word": "esté"
},
{
  "count": 114,
  "word": "mÁximo"
},
{
  "count": 114,
  "word": "cercano"
},
{
  "count": 113,
  "word": "semi"
},
{
  "count": 111,
  "word": "año"
},
{
  "count": 111,
  "word": "opcion"
},
{
  "count": 108,
  "word": "1er"
},
{
  "count": 108,
  "word": "gas"
},
{
  "count": 108,
  "word": "lote"
},
{
  "count": 107,
  "word": "construir"
},
{
  "count": 107,
  "word": "galpÓn"
},
{
  "count": 107,
  "word": "garantía"
},
{
  "count": 107,
  "word": "cel"
},
{
  "count": 106,
  "word": "plan"
},
{
  "count": 106,
  "word": "aumentar"
},
{
  "count": 105,
  "word": "comerciales"
},
{
  "count": 105,
  "word": "equipado"
},
{
  "count": 105,
  "word": "semana"
},
{
  "count": 103,
  "word": "tiendas"
},
{
  "count": 103,
  "word": "abdul"
},
{
  "count": 103,
  "word": "rashid"
},
{
  "count": 102,
  "word": "mercado"
},
{
  "count": 102,
  "word": "presupuestous"
},
{
  "count": 101,
  "word": "paga"
},
{
  "count": 101,
  "word": "excelente"
},
{
  "count": 101,
  "word": "cuarto"
},
{
  "count": 101,
  "word": "restaurante"
},
{
  "count": 100,
  "word": "baulera"
},
{
  "count": 100,
  "word": "aurelio"
},
{
  "count": 99,
  "word": "golf"
},
{
  "count": 99,
  "word": "lindas"
},
{
  "count": 98,
  "word": "inf"
},
{
  "count": 98,
  "word": "lavandería"
},
{
  "count": 98,
  "word": "infinity"
},
{
  "count": 98,
  "word": "mismo"
},
{
  "count": 97,
  "word": "tienda"
},
{
  "count": 95,
  "word": "opción"
},
{
  "count": 95,
  "word": "operaciÓn"
},
{
  "count": 94,
  "word": "tres"
},
{
  "count": 91,
  "word": "factura"
},
{
  "count": 91,
  "word": "porongo"
},
{
  "count": 90,
  "word": "similar"
},
{
  "count": 90,
  "word": "etc"
},
{
  "count": 90,
  "word": "habitación"
},
{
  "count": 90,
  "word": "excelsior"
},
{
  "count": 89,
  "word": "ingresos"
},
{
  "count": 89,
  "word": "plaza"
},
{
  "count": 89,
  "word": "aire"
},
{
  "count": 88,
  "word": "httpslinktreeblurealtybolivia"
},
{
  "count": 88,
  "word": "buenas"
},
{
  "count": 88,
  "word": "mostrar"
},
{
  "count": 87,
  "word": "estilo"
},
{
  "count": 87,
  "word": "fabiana"
},
{
  "count": 87,
  "word": "min"
},
{
  "count": 87,
  "word": "piraí"
},
{
  "count": 86,
  "word": "gracias"
},
{
  "count": 86,
  "word": "areas"
},
{
  "count": 86,
  "word": "mascota"
},
{
  "count": 85,
  "word": "httpsremaxdvelez"
},
{
  "count": 85,
  "word": "edificios"
},
{
  "count": 85,
  "word": "máx"
},
{
  "count": 85,
  "word": "avenidas"
},
{
  "count": 84,
  "word": "gravamen"
},
{
  "count": 84,
  "word": "requiere"
},
{
  "count": 84,
  "word": "quiñones"
},
{
  "count": 84,
  "word": "demas"
},
{
  "count": 84,
  "word": "banco"
},
{
  "count": 83,
  "word": "green"
},
{
  "count": 83,
  "word": "personas"
},
{
  "count": 83,
  "word": "gabriela"
},
{
  "count": 83,
  "word": "martin"
},
{
  "count": 83,
  "word": "fontana"
},
{
  "count": 83,
  "word": "village"
},
{
  "count": 82,
  "word": "pase"
},
{
  "count": 82,
  "word": "andrea"
},
{
  "count": 82,
  "word": "vieja"
},
{
  "count": 82,
  "word": "suelo"
},
{
  "count": 81,
  "word": "centenario"
},
{
  "count": 81,
  "word": "alquilar"
},
{
  "count": 81,
  "word": "similares"
},
{
  "count": 81,
  "word": "domiciliario"
},
{
  "count": 79,
  "word": "bonitas"
},
{
  "count": 79,
  "word": "ubicado"
},
{
  "count": 79,
  "word": "busca"
},
{
  "count": 79,
  "word": "cuenta"
},
{
  "count": 79,
  "word": "hamacas"
},
{
  "count": 79,
  "word": "pequeña"
},
{
  "count": 79,
  "word": "envia"
},
{
  "count": 79,
  "word": "cerrada"
},
{
  "count": 78,
  "word": "patricia"
},
{
  "count": 78,
  "word": "whatsapp"
},
{
  "count": 78,
  "word": "mt2"
},
{
  "count": 78,
  "word": "mayo"
},
{
  "count": 78,
  "word": "trato"
},
{
  "count": 78,
  "word": "ubicaciÓn"
},
{
  "count": 77,
  "word": "línea"
},
{
  "count": 77,
  "word": "todos"
},
{
  "count": 77,
  "word": "gimac"
},
{
  "count": 76,
  "word": "zonanorte"
},
{
  "count": 76,
  "word": "telf"
},
{
  "count": 76,
  "word": "cuente"
},
{
  "count": 75,
  "word": "acondicionado"
},
{
  "count": 75,
  "word": "garage"
},
{
  "count": 75,
  "word": "jardines"
},
{
  "count": 75,
  "word": "tarde"
},
{
  "count": 75,
  "word": "incluye"
},
{
  "count": 74,
  "word": "aires"
},
{
  "count": 74,
  "word": "mixto"
},
{
  "count": 74,
  "word": "bosques"
},
{
  "count": 74,
  "word": "credito"
},
{
  "count": 74,
  "word": "tengan"
},
{
  "count": 74,
  "word": "curupau"
},
{
  "count": 73,
  "word": "maría"
},
{
  "count": 73,
  "word": "equipada"
},
{
  "count": 72,
  "word": "irala"
},
{
  "count": 72,
  "word": "Únicamente"
},
{
  "count": 71,
  "word": "penthouse"
},
{
  "count": 71,
  "word": "dormítorios"
},
{
  "count": 71,
  "word": "pedro"
},
{
  "count": 71,
  "word": "germán"
},
{
  "count": 71,
  "word": "abierta"
},
{
  "count": 71,
  "word": "gimnasio"
},
{
  "count": 71,
  "word": "grock"
},
{
  "count": 71,
  "word": "tatiana"
},
{
  "count": 71,
  "word": "asesora"
},
{
  "count": 71,
  "word": "roperos"
},
{
  "count": 70,
  "word": "ucebol"
},
{
  "count": 70,
  "word": "3500bs"
},
{
  "count": 70,
  "word": "consta"
},
{
  "count": 69,
  "word": "mínima"
},
{
  "count": 69,
  "word": "solamente"
},
{
  "count": 69,
  "word": "parques"
},
{
  "count": 69,
  "word": "servicios"
},
{
  "count": 69,
  "word": "3000bs"
},
{
  "count": 68,
  "word": "incluya"
},
{
  "count": 68,
  "word": "utepsa"
},
{
  "count": 68,
  "word": "salle"
},
{
  "count": 68,
  "word": "300m2"
},
{
  "count": 68,
  "word": "warnes"
},
{
  "count": 68,
  "word": "quinta"
},
{
  "count": 68,
  "word": "acceso"
},
{
  "count": 67,
  "word": "poco"
},
{
  "count": 67,
  "word": "día"
},
{
  "count": 67,
  "word": "gemelas"
},
{
  "count": 67,
  "word": "saldo"
},
{
  "count": 67,
  "word": "importa"
},
{
  "count": 67,
  "word": "ubicacion"
},
{
  "count": 66,
  "word": "cuellar"
},
{
  "count": 66,
  "word": "wilber"
},
{
  "count": 65,
  "word": "500m2"
},
{
  "count": 65,
  "word": "busco"
},
{
  "count": 65,
  "word": "nota"
},
{
  "count": 65,
  "word": "privada"
},
{
  "count": 65,
  "word": "requerido"
},
{
  "count": 65,
  "word": "empotrados"
},
{
  "count": 65,
  "word": "suites"
},
{
  "count": 64,
  "word": "terra"
},
{
  "count": 64,
  "word": "urbano"
},
{
  "count": 64,
  "word": "martín"
},
{
  "count": 64,
  "word": "lejos"
},
{
  "count": 64,
  "word": "movilidades"
},
{
  "count": 64,
  "word": "habitacion"
},
{
  "count": 63,
  "word": "jardin"
},
{
  "count": 63,
  "word": "área"
},
{
  "count": 63,
  "word": "moreno"
},
{
  "count": 63,
  "word": "ingreso"
},
{
  "count": 63,
  "word": "bienes"
},
{
  "count": 63,
  "word": "hab"
},
{
  "count": 63,
  "word": "estate"
},
{
  "count": 63,
  "word": "valle"
},
{
  "count": 63,
  "word": "laura"
},
{
  "count": 63,
  "word": "alrededor"
},
{
  "count": 62,
  "word": "Área"
},
{
  "count": 62,
  "word": "luxia"
},
{
  "count": 62,
  "word": "torre"
},
{
  "count": 62,
  "word": "lugar"
},
{
  "count": 62,
  "word": "ambiente"
},
{
  "count": 61,
  "word": "acepte"
},
{
  "count": 61,
  "word": "barba"
},
{
  "count": 61,
  "word": "emiliano"
},
{
  "count": 60,
  "word": "libre"
},
{
  "count": 60,
  "word": "karla"
},
{
  "count": 60,
  "word": "pequeño"
},
{
  "count": 60,
  "word": "damnotti"
},
{
  "count": 60,
  "word": "parte"
},
{
  "count": 60,
  "word": "excluyente"
},
{
  "count": 59,
  "word": "ofertas"
},
{
  "count": 59,
  "word": "empleada"
},
{
  "count": 59,
  "word": "tamaño"
},
{
  "count": 59,
  "word": "indiferente"
},
{
  "count": 59,
  "word": "sierra"
},
{
  "count": 59,
  "word": "cuartos"
},
{
  "count": 58,
  "word": "soria"
},
{
  "count": 58,
  "word": "urbanización"
},
{
  "count": 58,
  "word": "ptto"
},
{
  "count": 58,
  "word": "sector"
},
{
  "count": 58,
  "word": "próximo"
},
{
  "count": 57,
  "word": "registrable"
},
{
  "count": 57,
  "word": "sean"
},
{
  "count": 57,
  "word": "00bs"
},
{
  "count": 57,
  "word": "otro"
},
{
  "count": 57,
  "word": "cerrar"
},
{
  "count": 57,
  "word": "instagram"
},
{
  "count": 57,
  "word": "4000bs"
},
{
  "count": 57,
  "word": "inversion"
},
{
  "count": 56,
  "word": "consultorio"
},
{
  "count": 56,
  "word": "maÑana"
},
{
  "count": 56,
  "word": "todas"
},
{
  "count": 56,
  "word": "qué"
},
{
  "count": 56,
  "word": "750"
},
{
  "count": 56,
  "word": "captaciones"
},
{
  "count": 56,
  "word": "cumavi"
},
{
  "count": 56,
  "word": "remanzo"
},
{
  "count": 55,
  "word": "contrato"
},
{
  "count": 55,
  "word": "trujillo"
},
{
  "count": 55,
  "word": "aproximadamente"
},
{
  "count": 55,
  "word": "linktree"
},
{
  "count": 55,
  "word": "salón"
},
{
  "count": 55,
  "word": "cen"
},
{
  "count": 54,
  "word": "aguilera"
},
{
  "count": 54,
  "word": "minimalista"
},
{
  "count": 54,
  "word": "800"
},
{
  "count": 54,
  "word": "g77"
},
{
  "count": 54,
  "word": "cambodromo"
},
{
  "count": 54,
  "word": "facebook"
},
{
  "count": 54,
  "word": "agua"
},
{
  "count": 54,
  "word": "2500bs"
},
{
  "count": 53,
  "word": "fin"
},
{
  "count": 53,
  "word": "viera"
},
{
  "count": 53,
  "word": "ropero"
},
{
  "count": 53,
  "word": "américas"
},
{
  "count": 53,
  "word": "otra"
},
{
  "count": 53,
  "word": "5000bs"
},
{
  "count": 53,
  "word": "hacer"
},
{
  "count": 53,
  "word": "compartido"
},
{
  "count": 52,
  "word": "depar"
},
{
  "count": 52,
  "word": "carmen"
},
{
  "count": 52,
  "word": "espacios"
},
{
  "count": 52,
  "word": "universidades"
},
{
  "count": 52,
  "word": "tengo"
},
{
  "count": 52,
  "word": "400m2"
},
{
  "count": 52,
  "word": "verde"
},
{
  "count": 51,
  "word": "ascensor"
},
{
  "count": 51,
  "word": "777188"
},
{
  "count": 51,
  "word": "demoler"
},
{
  "count": 51,
  "word": "rojas"
},
{
  "count": 51,
  "word": "pamela"
},
{
  "count": 50,
  "word": "antes"
},
{
  "count": 50,
  "word": "camiones"
},
{
  "count": 50,
  "word": "comida"
},
{
  "count": 50,
  "word": "idealmente"
},
{
  "count": 50,
  "word": "monoambientes"
},
{
  "count": 50,
  "word": "uno"
},
{
  "count": 49,
  "word": "urbarí"
},
{
  "count": 49,
  "word": "olivier"
},
{
  "count": 49,
  "word": "debe"
},
{
  "count": 49,
  "word": "condiciones"
},
{
  "count": 49,
  "word": "galería"
},
{
  "count": 49,
  "word": "ganadera"
},
{
  "count": 49,
  "word": "depósito"
},
{
  "count": 49,
  "word": "karina"
},
{
  "count": 49,
  "word": "nguyen"
},
{
  "count": 49,
  "word": "lado"
},
{
  "count": 48,
  "word": "clientes"
},
{
  "count": 48,
  "word": "0us"
},
{
  "count": 48,
  "word": "tower"
},
{
  "count": 48,
  "word": "necesita"
},
{
  "count": 48,
  "word": "barranca"
},
{
  "count": 48,
  "word": "ortiz"
},
{
  "count": 48,
  "word": "bonito"
},
{
  "count": 48,
  "word": "deposito"
},
{
  "count": 48,
  "word": "seguridad"
},
{
  "count": 48,
  "word": "altura"
},
{
  "count": 47,
  "word": "brigida"
},
{
  "count": 47,
  "word": "acordé"
},
{
  "count": 47,
  "word": "ventura"
},
{
  "count": 47,
  "word": "diego"
},
{
  "count": 47,
  "word": "equivalente"
},
{
  "count": 47,
  "word": "habitable"
},
{
  "count": 47,
  "word": "inversiÓn"
},
{
  "count": 47,
  "word": "mónica"
},
{
  "count": 47,
  "word": "terrenos"
},
{
  "count": 47,
  "word": "pinatar"
},
{
  "count": 47,
  "word": "75085"
},
{
  "count": 47,
  "word": "noreste"
},
{
  "count": 46,
  "word": "miranda"
},
{
  "count": 46,
  "word": "florida"
},
{
  "count": 46,
  "word": "antiguo"
},
{
  "count": 46,
  "word": "todo"
},
{
  "count": 46,
  "word": "ventas"
},
{
  "count": 46,
  "word": "pagar"
},
{
  "count": 46,
  "word": "luz"
},
{
  "count": 46,
  "word": "vehículo"
},
{
  "count": 46,
  "word": "hectareas"
},
{
  "count": 46,
  "word": "100"
},
{
  "count": 46,
  "word": "proyecto"
},
{
  "count": 45,
  "word": "empotrado"
},
{
  "count": 45,
  "word": "dependiendo"
},
{
  "count": 45,
  "word": "comision"
},
{
  "count": 45,
  "word": "segundo"
},
{
  "count": 45,
  "word": "referencia"
},
{
  "count": 45,
  "word": "fabricio"
},
{
  "count": 45,
  "word": "montero"
},
{
  "count": 45,
  "word": "flores"
},
{
  "count": 45,
  "word": "salazar"
},
{
  "count": 44,
  "word": "ocasión"
},
{
  "count": 44,
  "word": "bosque"
},
{
  "count": 44,
  "word": "joselin"
},
{
  "count": 44,
  "word": "tc7"
},
{
  "count": 44,
  "word": "marianela"
},
{
  "count": 44,
  "word": "wame"
},
{
  "count": 44,
  "word": "desarrollo"
},
{
  "count": 44,
  "word": "arq"
},
{
  "count": 44,
  "word": "ribera"
},
{
  "count": 44,
  "word": "americas"
},
{
  "count": 43,
  "word": "taller"
},
{
  "count": 43,
  "word": "carrillo"
},
{
  "count": 43,
  "word": "porfavor"
},
{
  "count": 43,
  "word": "adentro"
},
{
  "count": 43,
  "word": "inmuebles"
},
{
  "count": 43,
  "word": "poner"
},
{
  "count": 43,
  "word": "giovanna"
},
{
  "count": 43,
  "word": "trompillo"
},
{
  "count": 43,
  "word": "req"
},
{
  "count": 43,
  "word": "incluido"
},
{
  "count": 43,
  "word": "capital"
},
{
  "count": 43,
  "word": "500m"
},
{
  "count": 43,
  "word": "mérida"
},
{
  "count": 43,
  "word": "alejandra"
},
{
  "count": 43,
  "word": "pacheco"
},
{
  "count": 42,
  "word": "brígida"
},
{
  "count": 42,
  "word": "floresta"
},
{
  "count": 42,
  "word": "transitada"
},
{
  "count": 42,
  "word": "terraza"
},
{
  "count": 42,
  "word": "mano"
},
{
  "count": 42,
  "word": "informacion"
},
{
  "count": 42,
  "word": "estas"
},
{
  "count": 42,
  "word": "mtrs"
},
{
  "count": 42,
  "word": "mÁs"
},
{
  "count": 42,
  "word": "has"
},
{
  "count": 42,
  "word": "mÍnimo"
},
{
  "count": 41,
  "word": "mall"
},
{
  "count": 41,
  "word": "riviera"
},
{
  "count": 41,
  "word": "equipe"
},
{
  "count": 41,
  "word": "observaciones"
},
{
  "count": 41,
  "word": "avila"
},
{
  "count": 41,
  "word": "bella"
},
{
  "count": 41,
  "word": "sexto"
},
{
  "count": 41,
  "word": "dirección"
},
{
  "count": 41,
  "word": "ddrr"
},
{
  "count": 41,
  "word": "ramada"
},
{
  "count": 41,
  "word": "quinto"
},
{
  "count": 41,
  "word": "galpones"
},
{
  "count": 41,
  "word": "renee"
},
{
  "count": 41,
  "word": "americana"
},
{
  "count": 41,
  "word": "mandar"
},
{
  "count": 41,
  "word": "tener"
},
{
  "count": 40,
  "word": "alejado"
},
{
  "count": 40,
  "word": "smart"
},
{
  "count": 40,
  "word": "inicial"
},
{
  "count": 40,
  "word": "ovidio"
},
{
  "count": 40,
  "word": "plus"
},
{
  "count": 40,
  "word": "plata"
},
{
  "count": 40,
  "word": "listo"
},
{
  "count": 40,
  "word": "tope"
},
{
  "count": 40,
  "word": "elite"
},
{
  "count": 40,
  "word": "construccion"
},
{
  "count": 40,
  "word": "00m"
},
{
  "count": 40,
  "word": "nuevos"
},
{
  "count": 40,
  "word": "vaca"
},
{
  "count": 40,
  "word": "caracterÍsticas"
},
{
  "count": 40,
  "word": "demÁs"
},
{
  "count": 40,
  "word": "sheila"
},
{
  "count": 39,
  "word": "showroom"
},
{
  "count": 39,
  "word": "pasar"
},
{
  "count": 39,
  "word": "jefe"
},
{
  "count": 39,
  "word": "interno"
},
{
  "count": 39,
  "word": "brasil"
},
{
  "count": 39,
  "word": "justiniano"
},
{
  "count": 39,
  "word": "escalante"
},
{
  "count": 39,
  "word": "residencial"
},
{
  "count": 39,
  "word": "fachada"
},
{
  "count": 39,
  "word": "metro"
},
{
  "count": 39,
  "word": "billar"
},
{
  "count": 39,
  "word": "inmediato"
},
{
  "count": 39,
  "word": "6000bs"
},
{
  "count": 39,
  "word": "trasero"
},
{
  "count": 39,
  "word": "medidor"
},
{
  "count": 39,
  "word": "600m2"
},
{
  "count": 39,
  "word": "eventos"
},
{
  "count": 39,
  "word": "buenos"
},
{
  "count": 38,
  "word": "domingo"
},
{
  "count": 38,
  "word": "social"
},
{
  "count": 38,
  "word": "locales"
},
{
  "count": 38,
  "word": "según"
},
{
  "count": 38,
  "word": "acondicionados"
},
{
  "count": 38,
  "word": "comprar"
},
{
  "count": 38,
  "word": "atenciÓn"
},
{
  "count": 38,
  "word": "forma"
},
{
  "count": 38,
  "word": "cuadras"
},
{
  "count": 38,
  "word": "select"
},
{
  "count": 38,
  "word": "manzana"
},
{
  "count": 38,
  "word": "barbery"
},
{
  "count": 37,
  "word": "generando"
},
{
  "count": 37,
  "word": "lavadora"
},
{
  "count": 37,
  "word": "relativamente"
},
{
  "count": 37,
  "word": "primer"
},
{
  "count": 37,
  "word": "cada"
},
{
  "count": 37,
  "word": "tercer"
},
{
  "count": 37,
  "word": "permitan"
},
{
  "count": 37,
  "word": "700m2"
},
{
  "count": 37,
  "word": "perros"
},
{
  "count": 37,
  "word": "1ro"
},
{
  "count": 37,
  "word": "franquicia"
},
{
  "count": 37,
  "word": "kevincuellar"
},
{
  "count": 37,
  "word": "salas"
},
{
  "count": 36,
  "word": "clínica"
},
{
  "count": 36,
  "word": "joanna"
},
{
  "count": 36,
  "word": "diciembre"
},
{
  "count": 36,
  "word": "800bs"
},
{
  "count": 36,
  "word": "habitaciónes"
},
{
  "count": 36,
  "word": "chonta"
},
{
  "count": 36,
  "word": "rentabilidad"
},
{
  "count": 36,
  "word": "mercados"
},
{
  "count": 36,
  "word": "inversionista"
},
{
  "count": 36,
  "word": "anillos"
},
{
  "count": 36,
  "word": "duplex"
},
{
  "count": 36,
  "word": "lindo"
},
{
  "count": 36,
  "word": "calles"
},
{
  "count": 36,
  "word": "noroeste"
},
{
  "count": 36,
  "word": "lujan"
},
{
  "count": 36,
  "word": "sola"
},
{
  "count": 36,
  "word": "algo"
},
{
  "count": 35,
  "word": "opcional"
},
{
  "count": 35,
  "word": "httpslinktreemarianelarovira"
},
{
  "count": 35,
  "word": "inbox"
},
{
  "count": 35,
  "word": "concurrida"
},
{
  "count": 35,
  "word": "financiado"
},
{
  "count": 35,
  "word": "alquileres"
},
{
  "count": 35,
  "word": "tardes"
},
{
  "count": 35,
  "word": "link"
},
{
  "count": 35,
  "word": "josé"
},
{
  "count": 35,
  "word": "varios"
},
{
  "count": 35,
  "word": "tiktok"
},
{
  "count": 34,
  "word": "cristina"
},
{
  "count": 34,
  "word": "carlos"
},
{
  "count": 34,
  "word": "blacut"
},
{
  "count": 34,
  "word": "tambien"
},
{
  "count": 34,
  "word": "corde"
},
{
  "count": 34,
  "word": "lopez"
},
{
  "count": 34,
  "word": "mono"
},
{
  "count": 34,
  "word": "oferta"
},
{
  "count": 34,
  "word": "palacio"
},
{
  "count": 34,
  "word": "altos"
},
{
  "count": 34,
  "word": "molina"
},
{
  "count": 34,
  "word": "requisito"
},
{
  "count": 34,
  "word": "mantenido"
},
{
  "count": 34,
  "word": "aledañas"
},
{
  "count": 34,
  "word": "propias"
},
{
  "count": 34,
  "word": "oliver"
},
{
  "count": 34,
  "word": "corporación"
},
{
  "count": 34,
  "word": "httpswamemessagejdw7dczri554k1"
},
{
  "count": 34,
  "word": "caso"
},
{
  "count": 33,
  "word": "realtor"
},
{
  "count": 33,
  "word": "camila"
},
{
  "count": 33,
  "word": "techo"
},
{
  "count": 33,
  "word": "mar"
},
{
  "count": 33,
  "word": "justicia"
},
{
  "count": 33,
  "word": "macororó"
},
{
  "count": 33,
  "word": "sonia"
},
{
  "count": 33,
  "word": "registrar"
},
{
  "count": 33,
  "word": "pailon"
},
{
  "count": 33,
  "word": "hectÁreas"
},
{
  "count": 33,
  "word": "alemania"
},
{
  "count": 33,
  "word": "300"
},
{
  "count": 33,
  "word": "empresarial"
},
{
  "count": 33,
  "word": "otras"
},
{
  "count": 33,
  "word": "00us"
},
{
  "count": 33,
  "word": "únicamente"
},
{
  "count": 33,
  "word": "documentos"
},
{
  "count": 33,
  "word": "tiempo"
},
{
  "count": 33,
  "word": "estudio"
},
{
  "count": 33,
  "word": "arrien"
},
{
  "count": 32,
  "word": "dorms"
},
{
  "count": 32,
  "word": "principales"
},
{
  "count": 32,
  "word": "flor"
},
{
  "count": 32,
  "word": "vestidor"
},
{
  "count": 32,
  "word": "7008809"
},
{
  "count": 32,
  "word": "velez"
},
{
  "count": 32,
  "word": "guapay"
},
{
  "count": 32,
  "word": "bánzer"
},
{
  "count": 32,
  "word": "elena"
},
{
  "count": 32,
  "word": "fontanas"
},
{
  "count": 32,
  "word": "daniela"
},
{
  "count": 32,
  "word": "carrillomarianela"
},
{
  "count": 32,
  "word": "esa"
},
{
  "count": 32,
  "word": "asesor"
},
{
  "count": 32,
  "word": "pueden"
},
{
  "count": 32,
  "word": "emporio"
},
{
  "count": 32,
  "word": "200m2"
},
{
  "count": 32,
  "word": "referidos"
},
{
  "count": 32,
  "word": "ese"
},
{
  "count": 32,
  "word": "airbnb"
},
{
  "count": 32,
  "word": "roberto"
},
{
  "count": 32,
  "word": "spa"
},
{
  "count": 32,
  "word": "pozos"
},
{
  "count": 32,
  "word": "miguel"
},
{
  "count": 32,
  "word": "vÍa"
},
{
  "count": 32,
  "word": "instalar"
},
{
  "count": 32,
  "word": "abstenerse"
},
{
  "count": 31,
  "word": "construcciÓn"
},
{
  "count": 31,
  "word": "gustavo"
},
{
  "count": 31,
  "word": "2000bs"
},
{
  "count": 31,
  "word": "click"
},
{
  "count": 31,
  "word": "ariel"
},
{
  "count": 31,
  "word": "totalmente"
},
{
  "count": 31,
  "word": "laserna"
},
{
  "count": 31,
  "word": "dptos"
},
{
  "count": 31,
  "word": "polanco"
},
{
  "count": 31,
  "word": "cuadrado"
},
{
  "count": 31,
  "word": "cine"
},
{
  "count": 31,
  "word": "católica"
},
{
  "count": 31,
  "word": "genere"
},
{
  "count": 31,
  "word": "necesario"
},
{
  "count": 31,
  "word": "quiere"
},
{
  "count": 31,
  "word": "mucho"
},
{
  "count": 31,
  "word": "terrazas"
},
{
  "count": 31,
  "word": "amplias"
},
{
  "count": 31,
  "word": "camilo"
},
{
  "count": 31,
  "word": "estratégica"
},
{
  "count": 31,
  "word": "externo"
},
{
  "count": 30,
  "word": "m40"
},
{
  "count": 30,
  "word": "vivian"
},
{
  "count": 30,
  "word": "vehiculos"
},
{
  "count": 30,
  "word": "cod"
},
{
  "count": 30,
  "word": "cajonería"
},
{
  "count": 30,
  "word": "lavanderia"
},
{
  "count": 30,
  "word": "antigedad"
},
{
  "count": 30,
  "word": "colectora"
},
{
  "count": 30,
  "word": "completo"
},
{
  "count": 30,
  "word": "iglesia"
},
{
  "count": 30,
  "word": "manuel"
},
{
  "count": 30,
  "word": "kevin"
},
{
  "count": 30,
  "word": "moto"
},
{
  "count": 30,
  "word": "gabriel"
},
{
  "count": 30,
  "word": "inquilino"
},
{
  "count": 30,
  "word": "habitaciÓn"
},
{
  "count": 30,
  "word": "sanchez"
},
{
  "count": 30,
  "word": "1000m2"
},
{
  "count": 30,
  "word": "sánchez"
},
{
  "count": 30,
  "word": "suit"
},
{
  "count": 29,
  "word": "menor"
},
{
  "count": 29,
  "word": "equipamiento"
},
{
  "count": 29,
  "word": "bejarano"
},
{
  "count": 29,
  "word": "segura"
},
{
  "count": 29,
  "word": "7475579"
},
{
  "count": 29,
  "word": "chávez"
},
{
  "count": 29,
  "word": "grandes"
},
{
  "count": 29,
  "word": "persona"
},
{
  "count": 29,
  "word": "movilidad"
},
{
  "count": 29,
  "word": "agendar"
},
{
  "count": 29,
  "word": "pablo"
},
{
  "count": 29,
  "word": "200bs"
},
{
  "count": 29,
  "word": "garajes"
},
{
  "count": 29,
  "word": "subir"
},
{
  "count": 29,
  "word": "valeria"
},
{
  "count": 29,
  "word": "esas"
},
{
  "count": 29,
  "word": "consolidado"
},
{
  "count": 29,
  "word": "2dorm"
},
{
  "count": 29,
  "word": "linea"
},
{
  "count": 29,
  "word": "httpswame"
},
{
  "count": 29,
  "word": "upsa"
},
{
  "count": 28,
  "word": "paraguá"
},
{
  "count": 28,
  "word": "preferiblemente"
},
{
  "count": 28,
  "word": "00m2"
},
{
  "count": 28,
  "word": "keller"
},
{
  "count": 28,
  "word": "madero"
},
{
  "count": 28,
  "word": "descripción"
},
{
  "count": 28,
  "word": "pagados"
},
{
  "count": 28,
  "word": "4500bs"
},
{
  "count": 28,
  "word": "unicamente"
},
{
  "count": 28,
  "word": "work"
},
{
  "count": 28,
  "word": "const"
},
{
  "count": 28,
  "word": "compartir"
},
{
  "count": 28,
  "word": "altamente"
},
{
  "count": 28,
  "word": "cumpla"
},
{
  "count": 28,
  "word": "gym"
},
{
  "count": 28,
  "word": "350m2"
},
{
  "count": 28,
  "word": "siguientes"
},
{
  "count": 27,
  "word": "williams"
},
{
  "count": 27,
  "word": "contáctame"
},
{
  "count": 27,
  "word": "susan"
},
{
  "count": 27,
  "word": "dar"
},
{
  "count": 27,
  "word": "picochet"
},
{
  "count": 27,
  "word": "básicos"
},
{
  "count": 27,
  "word": "univalle"
},
{
  "count": 27,
  "word": "arteaga"
},
{
  "count": 27,
  "word": "lavadero"
},
{
  "count": 27,
  "word": "red"
},
{
  "count": 27,
  "word": "lópez"
},
{
  "count": 27,
  "word": "almacén"
},
{
  "count": 27,
  "word": "50m2"
},
{
  "count": 27,
  "word": "cortinas"
},
{
  "count": 27,
  "word": "cuadra"
},
{
  "count": 27,
  "word": "piotti"
},
{
  "count": 27,
  "word": "fortaleza"
},
{
  "count": 27,
  "word": "vivir"
},
{
  "count": 27,
  "word": "grigota"
},
{
  "count": 27,
  "word": "noviembre"
},
{
  "count": 27,
  "word": "hola"
},
{
  "count": 27,
  "word": "iii"
},
{
  "count": 27,
  "word": "400"
},
{
  "count": 27,
  "word": "sergio"
},
{
  "count": 27,
  "word": "preaprobado"
},
{
  "count": 27,
  "word": "saavedra"
},
{
  "count": 26,
  "word": "cristo"
},
{
  "count": 26,
  "word": "casi"
},
{
  "count": 26,
  "word": "suroeste"
},
{
  "count": 26,
  "word": "7000bs"
},
{
  "count": 26,
  "word": "tienes"
},
{
  "count": 26,
  "word": "accorde"
},
{
  "count": 26,
  "word": "portón"
},
{
  "count": 26,
  "word": "alguna"
},
{
  "count": 26,
  "word": "ambos"
},
{
  "count": 26,
  "word": "000sus"
},
{
  "count": 26,
  "word": "300bs"
},
{
  "count": 26,
  "word": "mirage"
},
{
  "count": 26,
  "word": "reuniones"
},
{
  "count": 26,
  "word": "debajo"
},
{
  "count": 26,
  "word": "monto"
},
{
  "count": 26,
  "word": "universitaria"
},
{
  "count": 26,
  "word": "requermiento"
},
{
  "count": 26,
  "word": "mendez"
},
{
  "count": 26,
  "word": "central"
},
{
  "count": 26,
  "word": "perez"
},
{
  "count": 26,
  "word": "blacutt"
},
{
  "count": 26,
  "word": "2800bs"
},
{
  "count": 26,
  "word": "incluyendo"
},
{
  "count": 26,
  "word": "completas"
},
{
  "count": 26,
  "word": "erika"
},
{
  "count": 26,
  "word": "disponible"
},
{
  "count": 26,
  "word": "mitad"
},
{
  "count": 26,
  "word": "referencias"
},
{
  "count": 26,
  "word": "captación"
},
{
  "count": 26,
  "word": "saucedo"
},
{
  "count": 26,
  "word": "oportunidad"
},
{
  "count": 26,
  "word": "isla"
},
{
  "count": 26,
  "word": "feria"
},
{
  "count": 26,
  "word": "nor"
},
{
  "count": 26,
  "word": "karen"
},
{
  "count": 26,
  "word": "ayala"
},
{
  "count": 26,
  "word": "céntrica"
},
{
  "count": 25,
  "word": "medio"
},
{
  "count": 25,
  "word": "lunes"
},
{
  "count": 25,
  "word": "yolanda"
},
{
  "count": 25,
  "word": "pocos"
},
{
  "count": 25,
  "word": "ducha"
},
{
  "count": 25,
  "word": "annelisse"
},
{
  "count": 25,
  "word": "arancibia"
},
{
  "count": 25,
  "word": "avalemana"
},
{
  "count": 25,
  "word": "asistente"
},
{
  "count": 25,
  "word": "madre"
},
{
  "count": 25,
  "word": "otros"
},
{
  "count": 25,
  "word": "paz"
},
{
  "count": 25,
  "word": "propio"
},
{
  "count": 25,
  "word": "alisson"
},
{
  "count": 25,
  "word": "velasco"
},
{
  "count": 25,
  "word": "crÉdito"
},
{
  "count": 25,
  "word": "partir"
},
{
  "count": 25,
  "word": "rep"
},
{
  "count": 25,
  "word": "italia"
},
{
  "count": 25,
  "word": "coordinar"
},
{
  "count": 25,
  "word": "sebastian"
},
{
  "count": 25,
  "word": "cparqueo"
},
{
  "count": 25,
  "word": "inmediaciones"
},
{
  "count": 25,
  "word": "200"
},
{
  "count": 24,
  "word": "300m"
},
{
  "count": 24,
  "word": "alondra"
},
{
  "count": 24,
  "word": "tienen"
},
{
  "count": 24,
  "word": "fondo"
},
{
  "count": 24,
  "word": "moscú"
},
{
  "count": 24,
  "word": "sabado"
},
{
  "count": 24,
  "word": "familiar"
},
{
  "count": 24,
  "word": "box"
},
{
  "count": 24,
  "word": "autos"
},
{
  "count": 24,
  "word": "familia"
},
{
  "count": 24,
  "word": "colega"
},
{
  "count": 24,
  "word": "0000"
},
{
  "count": 24,
  "word": "días"
},
{
  "count": 24,
  "word": "siguiente"
},
{
  "count": 24,
  "word": "natalia"
},
{
  "count": 24,
  "word": "800m2"
},
{
  "count": 24,
  "word": "avbanzer"
},
{
  "count": 24,
  "word": "raices"
},
{
  "count": 24,
  "word": "mensual"
},
{
  "count": 24,
  "word": "afuera"
},
{
  "count": 24,
  "word": "club"
},
{
  "count": 24,
  "word": "studio"
},
{
  "count": 23,
  "word": "paola"
},
{
  "count": 23,
  "word": "samaipata"
},
{
  "count": 23,
  "word": "group"
},
{
  "count": 23,
  "word": "proyectos"
},
{
  "count": 23,
  "word": "barroso"
},
{
  "count": 23,
  "word": "lesseur"
},
{
  "count": 23,
  "word": "preferible"
},
{
  "count": 23,
  "word": "urb"
},
{
  "count": 23,
  "word": "httpslinktreetatianahousebo"
},
{
  "count": 23,
  "word": "8000bs"
},
{
  "count": 23,
  "word": "rio"
},
{
  "count": 23,
  "word": "pereyra"
},
{
  "count": 23,
  "word": "alvarez"
},
{
  "count": 23,
  "word": "rosa"
},
{
  "count": 23,
  "word": "belleza"
},
{
  "count": 23,
  "word": "empresas"
},
{
  "count": 23,
  "word": "núñez"
},
{
  "count": 23,
  "word": "avbeni"
},
{
  "count": 23,
  "word": "baÑos"
},
{
  "count": 23,
  "word": "montecristo"
},
{
  "count": 23,
  "word": "70mil"
},
{
  "count": 23,
  "word": "ximena"
},
{
  "count": 23,
  "word": "0m2"
},
{
  "count": 23,
  "word": "resto"
},
{
  "count": 22,
  "word": "sábado"
},
{
  "count": 22,
  "word": "10us"
},
{
  "count": 22,
  "word": "raíces"
},
{
  "count": 22,
  "word": "tomar"
},
{
  "count": 22,
  "word": "media"
},
{
  "count": 22,
  "word": "7bs"
},
{
  "count": 22,
  "word": "jessica"
},
{
  "count": 22,
  "word": "colocar"
},
{
  "count": 22,
  "word": "semiamoblado"
},
{
  "count": 22,
  "word": "estos"
},
{
  "count": 22,
  "word": "leer"
},
{
  "count": 22,
  "word": "dimensión"
},
{
  "count": 22,
  "word": "preferente"
},
{
  "count": 22,
  "word": "garantia"
},
{
  "count": 22,
  "word": "fácil"
},
{
  "count": 22,
  "word": "restaurant"
},
{
  "count": 22,
  "word": "alcantarillado"
},
{
  "count": 22,
  "word": "1dormitorio"
},
{
  "count": 22,
  "word": "ossio"
},
{
  "count": 22,
  "word": "aledaños"
},
{
  "count": 22,
  "word": "ppt"
},
{
  "count": 22,
  "word": "suarez"
},
{
  "count": 22,
  "word": "balcÓn"
},
{
  "count": 22,
  "word": "1500m2"
},
{
  "count": 22,
  "word": "000m2"
},
{
  "count": 22,
  "word": "torno"
},
{
  "count": 22,
  "word": "julio"
},
{
  "count": 22,
  "word": "entrando"
},
{
  "count": 22,
  "word": "grupo"
},
{
  "count": 22,
  "word": "livingcomedor"
},
{
  "count": 22,
  "word": "cruces"
},
{
  "count": 22,
  "word": "capacidad"
},
{
  "count": 22,
  "word": "inmobiliariakw"
},
{
  "count": 22,
  "word": "acuerdo"
},
{
  "count": 22,
  "word": "india"
},
{
  "count": 21,
  "word": "sigma"
},
{
  "count": 21,
  "word": "farmacia"
},
{
  "count": 21,
  "word": "monica"
},
{
  "count": 21,
  "word": "mirian"
},
{
  "count": 21,
  "word": "uptown"
},
{
  "count": 21,
  "word": "informarles"
},
{
  "count": 21,
  "word": "españa"
},
{
  "count": 21,
  "word": "600bs"
},
{
  "count": 21,
  "word": "david"
},
{
  "count": 21,
  "word": "ahora"
},
{
  "count": 21,
  "word": "distribucion"
},
{
  "count": 21,
  "word": "ocasion"
},
{
  "count": 21,
  "word": "próxima"
},
{
  "count": 21,
  "word": "papeles"
},
{
  "count": 21,
  "word": "uagrm"
},
{
  "count": 21,
  "word": "parc"
},
{
  "count": 21,
  "word": "distribución"
},
{
  "count": 21,
  "word": "aproximado"
},
{
  "count": 21,
  "word": "cercanas"
},
{
  "count": 21,
  "word": "mutualistas"
},
{
  "count": 21,
  "word": "campo"
},
{
  "count": 21,
  "word": "adicionales"
},
{
  "count": 21,
  "word": "httpslinktreececiliahousebo"
},
{
  "count": 21,
  "word": "cuéllar"
},
{
  "count": 21,
  "word": "gonzales"
},
{
  "count": 21,
  "word": "septiembre"
},
{
  "count": 21,
  "word": "mantenida"
},
{
  "count": 21,
  "word": "250m2"
},
{
  "count": 21,
  "word": "requiera"
},
{
  "count": 21,
  "word": "azzero"
},
{
  "count": 21,
  "word": "78188"
},
{
  "count": 21,
  "word": "ojo"
},
{
  "count": 21,
  "word": "palmeras"
},
{
  "count": 21,
  "word": "tráfico"
},
{
  "count": 21,
  "word": "egez"
},
{
  "count": 21,
  "word": "requemiento"
},
{
  "count": 21,
  "word": "3ro"
},
{
  "count": 21,
  "word": "luján"
},
{
  "count": 21,
  "word": "herrera"
},
{
  "count": 21,
  "word": "excélsior"
},
{
  "count": 21,
  "word": "orden"
},
{
  "count": 21,
  "word": "contar"
},
{
  "count": 21,
  "word": "peña"
},
{
  "count": 21,
  "word": "completamente"
},
{
  "count": 21,
  "word": "calidad"
},
{
  "count": 21,
  "word": "cama"
},
{
  "count": 21,
  "word": "center"
},
{
  "count": 21,
  "word": "7511869"
},
{
  "count": 21,
  "word": "cañada"
},
{
  "count": 20,
  "word": "generar"
},
{
  "count": 20,
  "word": "barberi"
},
{
  "count": 20,
  "word": "2dormitorios"
},
{
  "count": 20,
  "word": "tcoficial"
},
{
  "count": 20,
  "word": "cexp"
},
{
  "count": 20,
  "word": "agricola"
},
{
  "count": 20,
  "word": "jiménez"
},
{
  "count": 20,
  "word": "pareja"
},
{
  "count": 20,
  "word": "disponibilidad"
},
{
  "count": 20,
  "word": "cambridge"
},
{
  "count": 20,
  "word": "mínimamente"
},
{
  "count": 20,
  "word": "ero"
},
{
  "count": 20,
  "word": "atrás"
},
{
  "count": 20,
  "word": "velarde"
},
{
  "count": 20,
  "word": "kevincuellarc21"
},
{
  "count": 20,
  "word": "alojamiento"
},
{
  "count": 20,
  "word": "envio"
},
{
  "count": 20,
  "word": "total"
},
{
  "count": 20,
  "word": "heybert"
},
{
  "count": 20,
  "word": "raÍces"
},
{
  "count": 20,
  "word": "torres"
},
{
  "count": 20,
  "word": "700"
},
{
  "count": 20,
  "word": "casita"
},
{
  "count": 20,
  "word": "rivas"
},
{
  "count": 20,
  "word": "instalación"
},
{
  "count": 20,
  "word": "6910390"
},
{
  "count": 20,
  "word": "centruy"
},
{
  "count": 20,
  "word": "hace"
},
{
  "count": 20,
  "word": "realizar"
},
{
  "count": 20,
  "word": "constructora"
},
{
  "count": 20,
  "word": "guarayos"
},
{
  "count": 20,
  "word": "full"
},
{
  "count": 20,
  "word": "cajoneria"
},
{
  "count": 20,
  "word": "judith"
},
{
  "count": 20,
  "word": "minutos"
},
{
  "count": 20,
  "word": "dimensiones"
},
{
  "count": 20,
  "word": "mudarse"
},
{
  "count": 20,
  "word": "abasto"
},
{
  "count": 20,
  "word": "dale"
},
{
  "count": 20,
  "word": "tinglado"
},
{
  "count": 20,
  "word": "pronta"
},
{
  "count": 20,
  "word": "conste"
},
{
  "count": 20,
  "word": "httpswalinka8yb5l"
},
{
  "count": 20,
  "word": "recepción"
},
{
  "count": 20,
  "word": "asta"
},
{
  "count": 20,
  "word": "presupuesto000bs"
},
{
  "count": 20,
  "word": "lotes"
},
{
  "count": 20,
  "word": "pequeÑa"
},
{
  "count": 20,
  "word": "presupuestoacorde"
},
{
  "count": 20,
  "word": "area"
},
{
  "count": 20,
  "word": "agenda"
},
{
  "count": 20,
  "word": "dor"
},
{
  "count": 20,
  "word": "jimena"
},
{
  "count": 19,
  "word": "dia"
},
{
  "count": 19,
  "word": "deptos"
},
{
  "count": 19,
  "word": "lucas"
},
{
  "count": 19,
  "word": "hospital"
},
{
  "count": 19,
  "word": "mateo"
},
{
  "count": 19,
  "word": "50mil"
},
{
  "count": 19,
  "word": "claudia"
},
{
  "count": 19,
  "word": "knijnenburg"
},
{
  "count": 19,
  "word": "rudolf"
},
{
  "count": 19,
  "word": "ubicada"
},
{
  "count": 19,
  "word": "requierimiento"
},
{
  "count": 19,
  "word": "comunes"
},
{
  "count": 19,
  "word": "podría"
},
{
  "count": 19,
  "word": "guardería"
},
{
  "count": 19,
  "word": "perrito"
},
{
  "count": 19,
  "word": "bastante"
},
{
  "count": 19,
  "word": "negociable"
},
{
  "count": 19,
  "word": "camino"
},
{
  "count": 19,
  "word": "abajo"
},
{
  "count": 19,
  "word": "elegante"
},
{
  "count": 19,
  "word": "extractor"
},
{
  "count": 19,
  "word": "hipoteca"
},
{
  "count": 19,
  "word": "asfalto"
},
{
  "count": 19,
  "word": "gran"
},
{
  "count": 19,
  "word": "santo"
},
{
  "count": 19,
  "word": "marcelo"
},
{
  "count": 19,
  "word": "5mil"
},
{
  "count": 19,
  "word": "alexsandra"
},
{
  "count": 19,
  "word": "separada"
},
{
  "count": 19,
  "word": "cancha"
},
{
  "count": 19,
  "word": "gutierrez"
},
{
  "count": 19,
  "word": "pampa"
},
{
  "count": 19,
  "word": "755755"
},
{
  "count": 19,
  "word": "paraguas"
},
{
  "count": 19,
  "word": "carla"
},
{
  "count": 18,
  "word": "50m"
},
{
  "count": 18,
  "word": "auto"
},
{
  "count": 18,
  "word": "berchatti"
},
{
  "count": 18,
  "word": "portachuelo"
},
{
  "count": 18,
  "word": "contactarse"
},
{
  "count": 18,
  "word": "dep"
},
{
  "count": 18,
  "word": "jireh"
},
{
  "count": 18,
  "word": "avalúo"
},
{
  "count": 18,
  "word": "completa"
},
{
  "count": 18,
  "word": "antemano"
},
{
  "count": 18,
  "word": "infraestructura"
},
{
  "count": 18,
  "word": "serca"
},
{
  "count": 18,
  "word": "radial26"
},
{
  "count": 18,
  "word": "allá"
},
{
  "count": 18,
  "word": "construidos"
},
{
  "count": 18,
  "word": "descripcion"
},
{
  "count": 18,
  "word": "juan"
},
{
  "count": 18,
  "word": "llanos"
},
{
  "count": 18,
  "word": "bitlyremaxassistant"
},
{
  "count": 18,
  "word": "lizeth"
},
{
  "count": 18,
  "word": "asfaltada"
},
{
  "count": 18,
  "word": "ubicaciÓnzona"
},
{
  "count": 18,
  "word": "visibilidad"
},
{
  "count": 18,
  "word": "semiusado"
},
{
  "count": 18,
  "word": "777188erwin"
},
{
  "count": 18,
  "word": "sauna"
},
{
  "count": 18,
  "word": "retorno"
},
{
  "count": 18,
  "word": "avpirai"
},
{
  "count": 18,
  "word": "aleman"
},
{
  "count": 18,
  "word": "techado"
},
{
  "count": 18,
  "word": "hectárea"
},
{
  "count": 18,
  "word": "700bs"
},
{
  "count": 18,
  "word": "octubre"
},
{
  "count": 18,
  "word": "porton"
},
{
  "count": 18,
  "word": "cocineta"
},
{
  "count": 18,
  "word": "adelanto"
},
{
  "count": 18,
  "word": "estén"
},
{
  "count": 18,
  "word": "rovira"
},
{
  "count": 18,
  "word": "camara"
},
{
  "count": 18,
  "word": "vásquez"
},
{
  "count": 18,
  "word": "leigue"
},
{
  "count": 18,
  "word": "disponibles"
},
{
  "count": 18,
  "word": "rafael"
},
{
  "count": 18,
  "word": "2000m2"
},
{
  "count": 17,
  "word": "jueves"
},
{
  "count": 17,
  "word": "mervin"
},
{
  "count": 17,
  "word": "valor"
},
{
  "count": 17,
  "word": "ramafa"
},
{
  "count": 17,
  "word": "cámaras"
},
{
  "count": 17,
  "word": "6910920"
},
{
  "count": 17,
  "word": "comodidades"
},
{
  "count": 17,
  "word": "torrez"
},
{
  "count": 17,
  "word": "fernanda"
},
{
  "count": 17,
  "word": "negocios"
},
{
  "count": 17,
  "word": "httpsremaxasistentenahir"
},
{
  "count": 17,
  "word": "piraÍ"
},
{
  "count": 17,
  "word": "curupaú"
},
{
  "count": 17,
  "word": "algún"
},
{
  "count": 17,
  "word": "httpsrbgyrazjrie"
},
{
  "count": 17,
  "word": "baÑo"
},
{
  "count": 17,
  "word": "450m2"
},
{
  "count": 17,
  "word": "muchas"
},
{
  "count": 17,
  "word": "12x30"
},
{
  "count": 17,
  "word": "salcedo"
},
{
  "count": 17,
  "word": "chiquitania"
},
{
  "count": 17,
  "word": "minima"
},
{
  "count": 17,
  "word": "3dormitorios"
},
{
  "count": 17,
  "word": "terrenocasa"
},
{
  "count": 17,
  "word": "salon"
},
{
  "count": 17,
  "word": "eurodesign"
},
{
  "count": 17,
  "word": "requerimento"
},
{
  "count": 17,
  "word": "brisas"
},
{
  "count": 17,
  "word": "camiri"
},
{
  "count": 17,
  "word": "cecilia"
},
{
  "count": 17,
  "word": "niños"
},
{
  "count": 17,
  "word": "5toanillo"
},
{
  "count": 16,
  "word": "plazuela"
},
{
  "count": 16,
  "word": "informaciÓn"
},
{
  "count": 16,
  "word": "potencial"
},
{
  "count": 16,
  "word": "lizette"
},
{
  "count": 16,
  "word": "comidas"
},
{
  "count": 16,
  "word": "5us"
},
{
  "count": 16,
  "word": "infantil"
},
{
  "count": 16,
  "word": "máxima"
},
{
  "count": 16,
  "word": "jose"
},
{
  "count": 16,
  "word": "igual"
},
{
  "count": 16,
  "word": "urgencia"
},
{
  "count": 16,
  "word": "petroleras"
},
{
  "count": 16,
  "word": "httpswwwinstagramcommrovirapropiedades"
},
{
  "count": 16,
  "word": "9vo"
},
{
  "count": 16,
  "word": "garcía"
},
{
  "count": 16,
  "word": "ramirez"
},
{
  "count": 16,
  "word": "paurito"
},
{
  "count": 16,
  "word": "enlace"
},
{
  "count": 16,
  "word": "httpswalinkl4u77d"
},
{
  "count": 16,
  "word": "dinero"
},
{
  "count": 16,
  "word": "permita"
},
{
  "count": 16,
  "word": "vidal"
},
{
  "count": 16,
  "word": "incluida"
},
{
  "count": 16,
  "word": "jorge"
},
{
  "count": 16,
  "word": "inquilinos"
},
{
  "count": 16,
  "word": "encimera"
},
{
  "count": 16,
  "word": "ropa"
},
{
  "count": 16,
  "word": "pinto"
},
{
  "count": 16,
  "word": "quiroga"
},
{
  "count": 16,
  "word": "apto"
},
{
  "count": 16,
  "word": "trifasica"
},
{
  "count": 16,
  "word": "poder"
},
{
  "count": 16,
  "word": "mueblería"
},
{
  "count": 16,
  "word": "trii"
},
{
  "count": 16,
  "word": "terminado"
},
{
  "count": 16,
  "word": "tranquila"
},
{
  "count": 16,
  "word": "lavado"
},
{
  "count": 16,
  "word": "608665"
},
{
  "count": 16,
  "word": "montar"
},
{
  "count": 16,
  "word": "apta"
},
{
  "count": 16,
  "word": "cocinas"
},
{
  "count": 16,
  "word": "fatyma"
},
{
  "count": 16,
  "word": "maria"
},
{
  "count": 16,
  "word": "ambiental"
},
{
  "count": 16,
  "word": "captacion"
},
{
  "count": 16,
  "word": "mesones"
},
{
  "count": 16,
  "word": "pavimentando"
},
{
  "count": 16,
  "word": "necesariamente"
},
{
  "count": 16,
  "word": "6158481"
},
{
  "count": 16,
  "word": "rodríguez"
},
{
  "count": 16,
  "word": "afluencia"
},
{
  "count": 16,
  "word": "conectar"
},
{
  "count": 16,
  "word": "avirala"
},
{
  "count": 16,
  "word": "savio"
},
{
  "count": 16,
  "word": "country"
},
{
  "count": 16,
  "word": "okinawa"
},
{
  "count": 16,
  "word": "pres"
},
{
  "count": 16,
  "word": "ambassador"
},
{
  "count": 16,
  "word": "renzo"
},
{
  "count": 16,
  "word": "comercios"
},
{
  "count": 16,
  "word": "200k"
},
{
  "count": 16,
  "word": "httpswame59"
},
{
  "count": 16,
  "word": "4054"
},
{
  "count": 16,
  "word": "perritos"
},
{
  "count": 15,
  "word": "churrasqueras"
},
{
  "count": 15,
  "word": "family"
},
{
  "count": 15,
  "word": "boutique"
},
{
  "count": 15,
  "word": "consolidados"
},
{
  "count": 15,
  "word": "79766"
},
{
  "count": 15,
  "word": "dpcias"
},
{
  "count": 15,
  "word": "alimentos"
},
{
  "count": 15,
  "word": "pavimento"
},
{
  "count": 15,
  "word": "trafico"
},
{
  "count": 15,
  "word": "maquinaria"
},
{
  "count": 15,
  "word": "instituto"
},
{
  "count": 15,
  "word": "respaldo"
},
{
  "count": 15,
  "word": "perfecto"
},
{
  "count": 15,
  "word": "pedraza"
},
{
  "count": 15,
  "word": "crecimiento"
},
{
  "count": 15,
  "word": "dormitórios"
},
{
  "count": 15,
  "word": "asai"
},
{
  "count": 15,
  "word": "pailas"
},
{
  "count": 15,
  "word": "residence"
},
{
  "count": 15,
  "word": "enero"
},
{
  "count": 15,
  "word": "salvatierra"
},
{
  "count": 15,
  "word": "4dormitorios"
},
{
  "count": 15,
  "word": "espinoza"
},
{
  "count": 15,
  "word": "comercio"
},
{
  "count": 15,
  "word": "elizabeth"
},
{
  "count": 15,
  "word": "supermercado"
},
{
  "count": 15,
  "word": "satélite"
},
{
  "count": 15,
  "word": "carne"
},
{
  "count": 15,
  "word": "luxury"
},
{
  "count": 15,
  "word": "blindex"
},
{
  "count": 15,
  "word": "fria"
},
{
  "count": 15,
  "word": "dental"
},
{
  "count": 15,
  "word": "toro"
},
{
  "count": 15,
  "word": "pasto"
},
{
  "count": 15,
  "word": "aguilar"
},
{
  "count": 15,
  "word": "reales"
},
{
  "count": 15,
  "word": "gomez"
},
{
  "count": 15,
  "word": "amoblados"
},
{
  "count": 15,
  "word": "melgarred"
},
{
  "count": 15,
  "word": "urbanizacion"
},
{
  "count": 15,
  "word": "cuadrados"
},
{
  "count": 15,
  "word": "1ero"
},
{
  "count": 15,
  "word": "isabel"
},
{
  "count": 15,
  "word": "plano"
},
{
  "count": 15,
  "word": "palmar"
},
{
  "count": 15,
  "word": "encuentre"
},
{
  "count": 15,
  "word": "chiquitos"
},
{
  "count": 15,
  "word": "50us"
},
{
  "count": 15,
  "word": "ninoska"
},
{
  "count": 15,
  "word": "6937783"
},
{
  "count": 15,
  "word": "Élite"
},
{
  "count": 15,
  "word": "entrada"
},
{
  "count": 15,
  "word": "remodelar"
},
{
  "count": 15,
  "word": "opciÓn"
},
{
  "count": 15,
  "word": "sureste"
},
{
  "count": 15,
  "word": "trifásica"
},
{
  "count": 15,
  "word": "cuadrante"
},
{
  "count": 14,
  "word": "metraje"
},
{
  "count": 14,
  "word": "almacenamiento"
},
{
  "count": 14,
  "word": "lista"
},
{
  "count": 14,
  "word": "eléctrico"
},
{
  "count": 14,
  "word": "incluído"
},
{
  "count": 14,
  "word": "balcones"
},
{
  "count": 14,
  "word": "capobianco"
},
{
  "count": 14,
  "word": "aporte"
},
{
  "count": 14,
  "word": "movimiento"
},
{
  "count": 14,
  "word": "única"
},
{
  "count": 14,
  "word": "aÑo"
},
{
  "count": 14,
  "word": "40m2"
},
{
  "count": 14,
  "word": "cartago"
},
{
  "count": 14,
  "word": "ana"
},
{
  "count": 14,
  "word": "llamar"
},
{
  "count": 14,
  "word": "100m2"
},
{
  "count": 14,
  "word": "radio"
},
{
  "count": 14,
  "word": "marzo"
},
{
  "count": 14,
  "word": "propiedades"
},
{
  "count": 14,
  "word": "10k"
},
{
  "count": 14,
  "word": "exclusive"
},
{
  "count": 14,
  "word": "Ángel"
},
{
  "count": 14,
  "word": "millones"
},
{
  "count": 14,
  "word": "rivero"
},
{
  "count": 14,
  "word": "walink5le6ny"
},
{
  "count": 14,
  "word": "electrica"
},
{
  "count": 14,
  "word": "necesito"
},
{
  "count": 14,
  "word": "fabrica"
},
{
  "count": 14,
  "word": "400m"
},
{
  "count": 14,
  "word": "690440"
},
{
  "count": 14,
  "word": "viernes"
},
{
  "count": 14,
  "word": "primera"
},
{
  "count": 14,
  "word": "pequeños"
},
{
  "count": 14,
  "word": "personal"
},
{
  "count": 14,
  "word": "usar"
},
{
  "count": 14,
  "word": "vélez"
},
{
  "count": 14,
  "word": "accesibilidad"
},
{
  "count": 14,
  "word": "urbanizar"
},
{
  "count": 14,
  "word": "rubro"
},
{
  "count": 14,
  "word": "3dorm"
},
{
  "count": 14,
  "word": "habitables"
},
{
  "count": 14,
  "word": "exclusivo"
},
{
  "count": 14,
  "word": "3dormitorio"
},
{
  "count": 14,
  "word": "juntos"
},
{
  "count": 14,
  "word": "zegada"
},
{
  "count": 14,
  "word": "piazza"
},
{
  "count": 14,
  "word": "rivera"
},
{
  "count": 14,
  "word": "adaptar"
},
{
  "count": 14,
  "word": "eduardo"
},
{
  "count": 14,
  "word": "pref"
},
{
  "count": 14,
  "word": "agentepaulo"
},
{
  "count": 14,
  "word": "holiday"
},
{
  "count": 14,
  "word": "platinium"
},
{
  "count": 14,
  "word": "pagos"
},
{
  "count": 14,
  "word": "carola"
},
{
  "count": 14,
  "word": "derechos"
},
{
  "count": 14,
  "word": "colonial"
},
{
  "count": 14,
  "word": "juegos"
},
{
  "count": 14,
  "word": "ancho"
},
{
  "count": 14,
  "word": "proximo"
},
{
  "count": 14,
  "word": "dando"
},
{
  "count": 14,
  "word": "excelentes"
},
{
  "count": 14,
  "word": "actualmente"
},
{
  "count": 14,
  "word": "70m"
},
{
  "count": 14,
  "word": "miércoles"
},
{
  "count": 14,
  "word": "benialemana"
},
{
  "count": 14,
  "word": "desarrollar"
},
{
  "count": 14,
  "word": "módulo"
},
{
  "count": 14,
  "word": "mecánico"
},
{
  "count": 14,
  "word": "captaciÓn"
},
{
  "count": 14,
  "word": "paraíso"
},
{
  "count": 13,
  "word": "conservada"
},
{
  "count": 13,
  "word": "problema"
},
{
  "count": 13,
  "word": "ganado"
},
{
  "count": 13,
  "word": "mendizada"
},
{
  "count": 13,
  "word": "gómez"
},
{
  "count": 13,
  "word": "restaurantes"
},
{
  "count": 13,
  "word": "rodrigo"
},
{
  "count": 13,
  "word": "presupuestos"
},
{
  "count": 13,
  "word": "cowork"
},
{
  "count": 13,
  "word": "walinkmnxgqh"
},
{
  "count": 13,
  "word": "annaliza"
},
{
  "count": 13,
  "word": "cercanos"
},
{
  "count": 13,
  "word": "johana"
},
{
  "count": 13,
  "word": "000us"
},
{
  "count": 13,
  "word": "sembrar"
},
{
  "count": 13,
  "word": "chavez"
},
{
  "count": 13,
  "word": "verdes"
},
{
  "count": 13,
  "word": "martes"
},
{
  "count": 13,
  "word": "inmobiliarios"
},
{
  "count": 13,
  "word": "alejandro"
},
{
  "count": 13,
  "word": "celular"
},
{
  "count": 13,
  "word": "invertir"
},
{
  "count": 13,
  "word": "sirva"
},
{
  "count": 13,
  "word": "ubicadas"
},
{
  "count": 13,
  "word": "sÓlo"
},
{
  "count": 13,
  "word": "puentes"
},
{
  "count": 13,
  "word": "posibilidad"
},
{
  "count": 13,
  "word": "heladera"
},
{
  "count": 13,
  "word": "septimo"
},
{
  "count": 13,
  "word": "playa"
},
{
  "count": 13,
  "word": "larrieu"
},
{
  "count": 13,
  "word": "alejada"
},
{
  "count": 13,
  "word": "imprescindible"
},
{
  "count": 13,
  "word": "viru"
},
{
  "count": 13,
  "word": "independientes"
},
{
  "count": 13,
  "word": "cajonerias"
},
{
  "count": 13,
  "word": "telfwilber"
},
{
  "count": 13,
  "word": "zoológico"
},
{
  "count": 13,
  "word": "morantes"
},
{
  "count": 13,
  "word": "marco"
},
{
  "count": 13,
  "word": "predio"
},
{
  "count": 13,
  "word": "cronenbold"
},
{
  "count": 13,
  "word": "pasando"
},
{
  "count": 13,
  "word": "silvana"
},
{
  "count": 13,
  "word": "posee"
},
{
  "count": 13,
  "word": "servir"
},
{
  "count": 13,
  "word": "paris"
},
{
  "count": 13,
  "word": "centralizado"
},
{
  "count": 13,
  "word": "xplace"
},
{
  "count": 13,
  "word": "tan"
},
{
  "count": 13,
  "word": "nuevas"
},
{
  "count": 13,
  "word": "7717710"
},
{
  "count": 13,
  "word": "zeballos"
},
{
  "count": 13,
  "word": "turquesa"
},
{
  "count": 13,
  "word": "km9"
},
{
  "count": 13,
  "word": "veruska"
},
{
  "count": 13,
  "word": "70609"
},
{
  "count": 13,
  "word": "linda"
},
{
  "count": 13,
  "word": "lomas"
},
{
  "count": 13,
  "word": "costanera"
},
{
  "count": 13,
  "word": "lauren"
},
{
  "count": 13,
  "word": "lujosa"
},
{
  "count": 13,
  "word": "noches"
},
{
  "count": 13,
  "word": "aqualina"
},
{
  "count": 13,
  "word": "exclusivamente"
},
{
  "count": 13,
  "word": "salek"
},
{
  "count": 13,
  "word": "rápida"
},
{
  "count": 13,
  "word": "ocasiÓn"
},
{
  "count": 13,
  "word": "nathalia"
},
{
  "count": 13,
  "word": "dato"
},
{
  "count": 13,
  "word": "bajos"
},
{
  "count": 13,
  "word": "delantero"
},
{
  "count": 13,
  "word": "conexion"
},
{
  "count": 13,
  "word": "69979"
},
{
  "count": 13,
  "word": "dormit"
},
{
  "count": 13,
  "word": "solicitud"
},
{
  "count": 13,
  "word": "jim"
},
{
  "count": 13,
  "word": "120m2"
},
{
  "count": 13,
  "word": "ignacio"
},
{
  "count": 13,
  "word": "cortez"
},
{
  "count": 12,
  "word": "360m2"
},
{
  "count": 12,
  "word": "salida"
},
{
  "count": 12,
  "word": "casona"
},
{
  "count": 12,
  "word": "lateral"
},
{
  "count": 12,
  "word": "fabiola"
},
{
  "count": 12,
  "word": "economica"
},
{
  "count": 12,
  "word": "céntrico"
},
{
  "count": 12,
  "word": "sara"
},
{
  "count": 12,
  "word": "bsse"
},
{
  "count": 12,
  "word": "mercantil"
},
{
  "count": 12,
  "word": "carolina"
},
{
  "count": 12,
  "word": "ubicaciones"
},
{
  "count": 12,
  "word": "productos"
},
{
  "count": 12,
  "word": "campestre"
},
{
  "count": 12,
  "word": "encuentra"
},
{
  "count": 12,
  "word": "económica"
},
{
  "count": 12,
  "word": "montaño"
},
{
  "count": 12,
  "word": "787687"
},
{
  "count": 12,
  "word": "medidas"
},
{
  "count": 12,
  "word": "pdf"
},
{
  "count": 12,
  "word": "perrogon"
},
{
  "count": 12,
  "word": "700m"
},
{
  "count": 12,
  "word": "mary"
},
{
  "count": 12,
  "word": "soho"
},
{
  "count": 12,
  "word": "legal"
},
{
  "count": 12,
  "word": "vargas"
},
{
  "count": 12,
  "word": "ing"
},
{
  "count": 12,
  "word": "vacío"
},
{
  "count": 12,
  "word": "znorte"
},
{
  "count": 12,
  "word": "embardado"
},
{
  "count": 12,
  "word": "rené"
},
{
  "count": 12,
  "word": "peredo"
},
{
  "count": 12,
  "word": "nord"
},
{
  "count": 12,
  "word": "menacho"
},
{
  "count": 12,
  "word": "corp"
},
{
  "count": 12,
  "word": "braniff"
},
{
  "count": 12,
  "word": "350m"
},
{
  "count": 12,
  "word": "brÍgida"
},
{
  "count": 12,
  "word": "argentina"
},
{
  "count": 12,
  "word": "redentor"
},
{
  "count": 12,
  "word": "colindantes"
},
{
  "count": 12,
  "word": "vehicular"
},
{
  "count": 12,
  "word": "35m2"
},
{
  "count": 12,
  "word": "hillman"
},
{
  "count": 12,
  "word": "alquile"
},
{
  "count": 12,
  "word": "ibañez"
},
{
  "count": 12,
  "word": "ingresar"
},
{
  "count": 12,
  "word": "construida"
},
{
  "count": 12,
  "word": "cuota"
},
{
  "count": 12,
  "word": "alemán"
},
{
  "count": 12,
  "word": "isela"
},
{
  "count": 12,
  "word": "ofrece"
},
{
  "count": 12,
  "word": "rubi"
},
{
  "count": 12,
  "word": "medico"
},
{
  "count": 12,
  "word": "romy"
},
{
  "count": 12,
  "word": "blurealty"
},
{
  "count": 12,
  "word": "feeney"
},
{
  "count": 12,
  "word": "platinum"
},
{
  "count": 12,
  "word": "7297266"
},
{
  "count": 12,
  "word": "zonaequipetrol"
},
{
  "count": 12,
  "word": "primero"
},
{
  "count": 12,
  "word": "buch"
},
{
  "count": 12,
  "word": "6500bs"
},
{
  "count": 12,
  "word": "wifi"
},
{
  "count": 12,
  "word": "mario"
},
{
  "count": 12,
  "word": "alameda"
},
{
  "count": 12,
  "word": "interesado"
},
{
  "count": 11,
  "word": "antiguos"
},
{
  "count": 11,
  "word": "pptous"
},
{
  "count": 11,
  "word": "estación"
},
{
  "count": 11,
  "word": "7737883"
},
{
  "count": 11,
  "word": "camioneta"
},
{
  "count": 11,
  "word": "condomio"
},
{
  "count": 11,
  "word": "4toanillo"
},
{
  "count": 11,
  "word": "10mo"
},
{
  "count": 11,
  "word": "tambiÉn"
},
{
  "count": 11,
  "word": "atte"
},
{
  "count": 11,
  "word": "0mil"
},
{
  "count": 11,
  "word": "room"
},
{
  "count": 11,
  "word": "siempre"
},
{
  "count": 11,
  "word": "conexión"
},
{
  "count": 11,
  "word": "claure"
},
{
  "count": 11,
  "word": "edifico"
},
{
  "count": 11,
  "word": "80m"
},
{
  "count": 11,
  "word": "jesus"
},
{
  "count": 11,
  "word": "avanti"
},
{
  "count": 11,
  "word": "condomino"
},
{
  "count": 11,
  "word": "andrés"
},
{
  "count": 11,
  "word": "dÓlares"
},
{
  "count": 11,
  "word": "contáctanos"
},
{
  "count": 11,
  "word": "69012"
},
{
  "count": 11,
  "word": "jardÍn"
},
{
  "count": 11,
  "word": "lazo"
},
{
  "count": 11,
  "word": "enviarme"
},
{
  "count": 11,
  "word": "cobre"
},
{
  "count": 11,
  "word": "753869"
},
{
  "count": 11,
  "word": "educativo"
},
{
  "count": 11,
  "word": "zurita"
},
{
  "count": 11,
  "word": "nicole"
},
{
  "count": 11,
  "word": "cerrados"
},
{
  "count": 11,
  "word": "operaciÓnalquiler"
},
{
  "count": 11,
  "word": "zabala"
},
{
  "count": 11,
  "word": "instituciÓn"
},
{
  "count": 11,
  "word": "presupuestobs"
},
{
  "count": 11,
  "word": "km10"
},
{
  "count": 11,
  "word": "tenis"
},
{
  "count": 11,
  "word": "fernando"
},
{
  "count": 11,
  "word": "control"
},
{
  "count": 11,
  "word": "alborta"
},
{
  "count": 11,
  "word": "solicitado"
},
{
  "count": 11,
  "word": "prÓximo"
},
{
  "count": 11,
  "word": "1dorm"
},
{
  "count": 11,
  "word": "agrÍcola"
},
{
  "count": 11,
  "word": "alquilados"
},
{
  "count": 11,
  "word": "6905808"
},
{
  "count": 11,
  "word": "dividir"
},
{
  "count": 11,
  "word": "40mil"
},
{
  "count": 11,
  "word": "plazas"
},
{
  "count": 11,
  "word": "mesa"
},
{
  "count": 11,
  "word": "energia"
},
{
  "count": 11,
  "word": "4200bs"
},
{
  "count": 11,
  "word": "octavo"
},
{
  "count": 11,
  "word": "httpswame59175528"
},
{
  "count": 11,
  "word": "50k"
},
{
  "count": 11,
  "word": "hermoso"
},
{
  "count": 11,
  "word": "rios"
},
{
  "count": 11,
  "word": "extranjero"
},
{
  "count": 11,
  "word": "73973"
},
{
  "count": 11,
  "word": "barceló"
},
{
  "count": 11,
  "word": "haya"
},
{
  "count": 11,
  "word": "buscan"
},
{
  "count": 11,
  "word": "cañeria"
},
{
  "count": 11,
  "word": "hermosa"
},
{
  "count": 11,
  "word": "monte"
},
{
  "count": 11,
  "word": "vehiculo"
},
{
  "count": 11,
  "word": "mercedes"
},
{
  "count": 11,
  "word": "angostura"
},
{
  "count": 11,
  "word": "george"
},
{
  "count": 11,
  "word": "1m2"
},
{
  "count": 11,
  "word": "alenana"
},
{
  "count": 11,
  "word": "rapida"
},
{
  "count": 11,
  "word": "durán"
},
{
  "count": 11,
  "word": "varias"
},
{
  "count": 11,
  "word": "calefón"
},
{
  "count": 11,
  "word": "pspto"
},
{
  "count": 11,
  "word": "pequeÑo"
},
{
  "count": 11,
  "word": "superf"
},
{
  "count": 11,
  "word": "walking"
},
{
  "count": 11,
  "word": "algun"
},
{
  "count": 11,
  "word": "radiales"
},
{
  "count": 11,
  "word": "educativa"
},
{
  "count": 11,
  "word": "httpswwwfacebookcomprofilephpid6565407544209mibextidzbwkwl"
},
{
  "count": 11,
  "word": "cafetería"
},
{
  "count": 11,
  "word": "show"
},
{
  "count": 11,
  "word": "documentación"
},
{
  "count": 11,
  "word": "pozo"
},
{
  "count": 10,
  "word": "60m2"
},
{
  "count": 10,
  "word": "hotel"
},
{
  "count": 10,
  "word": "económico"
},
{
  "count": 10,
  "word": "gutiérrez"
},
{
  "count": 10,
  "word": "preferencias"
},
{
  "count": 10,
  "word": "minimarket"
},
{
  "count": 10,
  "word": "pollo"
},
{
  "count": 10,
  "word": "requeriemiento"
},
{
  "count": 10,
  "word": "base"
},
{
  "count": 10,
  "word": "aÑos"
},
{
  "count": 10,
  "word": "2200bs"
},
{
  "count": 10,
  "word": "suárez"
},
{
  "count": 10,
  "word": "upb"
},
{
  "count": 10,
  "word": "bello"
},
{
  "count": 10,
  "word": "estructura"
},
{
  "count": 10,
  "word": "habitabilidad"
},
{
  "count": 10,
  "word": "brenda"
},
{
  "count": 10,
  "word": "semanas"
},
{
  "count": 10,
  "word": "desarrollos"
},
{
  "count": 10,
  "word": "baruc"
},
{
  "count": 10,
  "word": "construido"
},
{
  "count": 10,
  "word": "atractivas"
},
{
  "count": 10,
  "word": "vacio"
},
{
  "count": 10,
  "word": "francisco"
},
{
  "count": 10,
  "word": "6901"
},
{
  "count": 10,
  "word": "plagas"
},
{
  "count": 10,
  "word": "séptimo"
},
{
  "count": 10,
  "word": "you"
},
{
  "count": 10,
  "word": "galeria"
},
{
  "count": 10,
  "word": "nanotec"
},
{
  "count": 10,
  "word": "imbox"
},
{
  "count": 10,
  "word": "maese"
},
{
  "count": 10,
  "word": "urbary"
},
{
  "count": 10,
  "word": "691090"
},
{
  "count": 10,
  "word": "saint"
},
{
  "count": 10,
  "word": "10m"
},
{
  "count": 10,
  "word": "658482"
},
{
  "count": 10,
  "word": "luces"
},
{
  "count": 10,
  "word": "atención"
},
{
  "count": 10,
  "word": "aeropuerto"
},
{
  "count": 10,
  "word": "estacionamiento"
},
{
  "count": 10,
  "word": "mencionado"
},
{
  "count": 10,
  "word": "golden"
},
{
  "count": 10,
  "word": "400bs"
},
{
  "count": 10,
  "word": "requeriento"
},
{
  "count": 10,
  "word": "montacargas"
},
{
  "count": 10,
  "word": "equipetrolsirari"
},
{
  "count": 10,
  "word": "rodeado"
},
{
  "count": 10,
  "word": "especificaciones"
},
{
  "count": 10,
  "word": "depa"
},
{
  "count": 10,
  "word": "leidy"
},
{
  "count": 10,
  "word": "concepción"
},
{
  "count": 10,
  "word": "arana"
},
{
  "count": 10,
  "word": "cercana"
},
{
  "count": 10,
  "word": "7191991"
},
{
  "count": 10,
  "word": "variedad"
},
{
  "count": 10,
  "word": "capitalizar"
},
{
  "count": 10,
  "word": "estratÉgica"
},
{
  "count": 10,
  "word": "desarrolladores"
},
{
  "count": 10,
  "word": "moscu"
},
{
  "count": 10,
  "word": "saneamiento"
},
{
  "count": 10,
  "word": "transferencia"
},
{
  "count": 10,
  "word": "bimodal"
},
{
  "count": 10,
  "word": "prioridad"
},
{
  "count": 10,
  "word": "5500bs"
},
{
  "count": 10,
  "word": "km6"
},
{
  "count": 10,
  "word": "hospitales"
},
{
  "count": 10,
  "word": "teddy"
},
{
  "count": 10,
  "word": "httpsrbgyrazjri"
},
{
  "count": 10,
  "word": "mendoza"
},
{
  "count": 10,
  "word": "iluminado"
},
{
  "count": 10,
  "word": "satelite"
},
{
  "count": 10,
  "word": "nur"
},
{
  "count": 10,
  "word": "mensaje"
},
{
  "count": 10,
  "word": "agrícola"
},
{
  "count": 10,
  "word": "caÑada"
},
{
  "count": 10,
  "word": "triii"
},
{
  "count": 10,
  "word": "inversores"
},
{
  "count": 10,
  "word": "templario"
},
{
  "count": 10,
  "word": "150m2"
},
{
  "count": 10,
  "word": "bÁnzer"
},
{
  "count": 10,
  "word": "httpswamemessagejdw7dczri554k"
},
{
  "count": 10,
  "word": "alquilado"
},
{
  "count": 10,
  "word": "don"
},
{
  "count": 10,
  "word": "surtidor"
},
{
  "count": 10,
  "word": "usado"
},
{
  "count": 10,
  "word": "clinica"
},
{
  "count": 10,
  "word": "httpswamemessageoireuys44ozh"
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

