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
  "count": 1219,
  "word": "casa"
},
{
  "count": 1111,
  "word": "anillo"
},
{
  "count": 1084,
  "word": "norte"
},
{
  "count": 932,
  "word": "alquiler"
},
{
  "count": 930,
  "word": "dormitorios"
},
{
  "count": 806,
  "word": "venta"
},
{
  "count": 662,
  "word": "compra"
},
{
  "count": 659,
  "word": "equipetrol"
},
{
  "count": 624,
  "word": "departamento"
},
{
  "count": 530,
  "word": "condominio"
},
{
  "count": 517,
  "word": "terreno"
},
{
  "count": 507,
  "word": "ppto"
},
{
  "count": 316,
  "word": "monoambiente"
},
{
  "count": 310,
  "word": "dentro"
},
{
  "count": 295,
  "word": "pago"
},
{
  "count": 290,
  "word": "dormitorio"
},
{
  "count": 282,
  "word": "acorde"
},
{
  "count": 280,
  "word": "4to"
},
{
  "count": 276,
  "word": "5to"
},
{
  "count": 271,
  "word": "contado"
},
{
  "count": 261,
  "word": "oficial"
},
{
  "count": 257,
  "word": "alemana"
},
{
  "count": 239,
  "word": "amoblado"
},
{
  "count": 234,
  "word": "urubo"
},
{
  "count": 216,
  "word": "urgente"
},
{
  "count": 213,
  "word": "dpto"
},
{
  "count": 209,
  "word": "beni"
},
{
  "count": 206,
  "word": "anticretico"
},
{
  "count": 202,
  "word": "parqueo"
},
{
  "count": 196,
  "word": "tipo"
},
{
  "count": 194,
  "word": "solo"
},
{
  "count": 192,
  "word": "avenida"
},
{
  "count": 190,
  "word": "preferencia"
},
{
  "count": 188,
  "word": "máximo"
},
{
  "count": 188,
  "word": "requiero"
},
{
  "count": 184,
  "word": "fuera"
},
{
  "count": 173,
  "word": "inmediata"
},
{
  "count": 167,
  "word": "banzer"
},
{
  "count": 166,
  "word": "habitaciones"
},
{
  "count": 161,
  "word": "garaje"
},
{
  "count": 157,
  "word": "oeste"
},
{
  "count": 155,
  "word": "cerca"
},
{
  "count": 151,
  "word": "sur"
},
{
  "count": 149,
  "word": "6to"
},
{
  "count": 146,
  "word": "comercial"
},
{
  "count": 144,
  "word": "8vo"
},
{
  "count": 135,
  "word": "depto"
},
{
  "count": 134,
  "word": "superficie"
},
{
  "count": 123,
  "word": "usd"
},
{
  "count": 122,
  "word": "radial"
},
{
  "count": 121,
  "word": "zonas"
},
{
  "count": 120,
  "word": "puede"
},
{
  "count": 111,
  "word": "cambio"
},
{
  "count": 109,
  "word": "ser"
},
{
  "count": 107,
  "word": "maximo"
},
{
  "count": 103,
  "word": "este"
},
{
  "count": 100,
  "word": "max"
},
{
  "count": 100,
  "word": "dorm"
},
{
  "count": 97,
  "word": "7mo"
},
{
  "count": 94,
  "word": "toma"
},
{
  "count": 94,
  "word": "isuto"
},
{
  "count": 94,
  "word": "tenga"
},
{
  "count": 92,
  "word": "cualquier"
},
{
  "count": 88,
  "word": "local"
},
{
  "count": 86,
  "word": "piscina"
},
{
  "count": 84,
  "word": "canal"
},
{
  "count": 82,
  "word": "doble"
},
{
  "count": 81,
  "word": "amplio"
},
{
  "count": 78,
  "word": "oficina"
},
{
  "count": 78,
  "word": "abierto"
},
{
  "count": 74,
  "word": "ideal"
},
{
  "count": 72,
  "word": "efectivo"
},
{
  "count": 72,
  "word": "mínimo"
},
{
  "count": 72,
  "word": "busch"
},
{
  "count": 71,
  "word": "entrega"
},
{
  "count": 70,
  "word": "amoblar"
},
{
  "count": 70,
  "word": "guardia"
},
{
  "count": 67,
  "word": "edificio"
},
{
  "count": 66,
  "word": "sirari"
},
{
  "count": 66,
  "word": "2do"
},
{
  "count": 65,
  "word": "contacto"
},
{
  "count": 65,
  "word": "bolivianos"
},
{
  "count": 64,
  "word": "dependencias"
},
{
  "count": 64,
  "word": "san"
},
{
  "count": 63,
  "word": "expensas"
},
{
  "count": 62,
  "word": "sociales"
},
{
  "count": 62,
  "word": "amoblada"
},
{
  "count": 61,
  "word": "palmas"
},
{
  "count": 61,
  "word": "agente"
},
{
  "count": 61,
  "word": "coronado"
},
{
  "count": 60,
  "word": "sky"
},
{
  "count": 60,
  "word": "roca"
},
{
  "count": 60,
  "word": "frente"
},
{
  "count": 59,
  "word": "inmueble"
},
{
  "count": 59,
  "word": "nueva"
},
{
  "count": 58,
  "word": "sirve"
},
{
  "count": 58,
  "word": "dumont"
},
{
  "count": 56,
  "word": "mil"
},
{
  "count": 56,
  "word": "suite"
},
{
  "count": 56,
  "word": "ver"
},
{
  "count": 55,
  "word": "santos"
},
{
  "count": 54,
  "word": "vivienda"
},
{
  "count": 54,
  "word": "dos"
},
{
  "count": 54,
  "word": "hoy"
},
{
  "count": 53,
  "word": "independiente"
},
{
  "count": 52,
  "word": "información"
},
{
  "count": 52,
  "word": "características"
},
{
  "count": 52,
  "word": "centro"
},
{
  "count": 51,
  "word": "3er"
},
{
  "count": 49,
  "word": "mutualista"
},
{
  "count": 48,
  "word": "demás"
},
{
  "count": 48,
  "word": "vía"
},
{
  "count": 48,
  "word": "estrenar"
},
{
  "count": 47,
  "word": "dólares"
},
{
  "count": 47,
  "word": "áreas"
},
{
  "count": 46,
  "word": "cotoca"
},
{
  "count": 46,
  "word": "remax"
},
{
  "count": 46,
  "word": "alrededores"
},
{
  "count": 46,
  "word": "precio"
},
{
  "count": 45,
  "word": "nuevo"
},
{
  "count": 45,
  "word": "info"
},
{
  "count": 45,
  "word": "patio"
},
{
  "count": 45,
  "word": "bancario"
},
{
  "count": 45,
  "word": "ubicación"
},
{
  "count": 44,
  "word": "dependencia"
},
{
  "count": 44,
  "word": "baños"
},
{
  "count": 44,
  "word": "financiamiento"
},
{
  "count": 44,
  "word": "muebles"
},
{
  "count": 43,
  "word": "cocina"
},
{
  "count": 43,
  "word": "urubó"
},
{
  "count": 42,
  "word": "estado"
},
{
  "count": 42,
  "word": "vehículos"
},
{
  "count": 42,
  "word": "calle"
},
{
  "count": 42,
  "word": "aprox"
},
{
  "count": 41,
  "word": "lujo"
},
{
  "count": 41,
  "word": "paragua"
},
{
  "count": 41,
  "word": "cusis"
},
{
  "count": 41,
  "word": "preventa"
},
{
  "count": 40,
  "word": "pto"
},
{
  "count": 40,
  "word": "sólo"
},
{
  "count": 40,
  "word": "mariana"
},
{
  "count": 40,
  "word": "balcón"
},
{
  "count": 39,
  "word": "negocio"
},
{
  "count": 38,
  "word": "tiene"
},
{
  "count": 38,
  "word": "udabol"
},
{
  "count": 38,
  "word": "cliente"
},
{
  "count": 38,
  "word": "enviar"
},
{
  "count": 38,
  "word": "perrotta"
},
{
  "count": 37,
  "word": "detalle"
},
{
  "count": 37,
  "word": "buen"
},
{
  "count": 37,
  "word": "universidad"
},
{
  "count": 37,
  "word": "empresa"
},
{
  "count": 37,
  "word": "pre"
},
{
  "count": 37,
  "word": "parque"
},
{
  "count": 36,
  "word": "arriba"
},
{
  "count": 36,
  "word": "moderna"
},
{
  "count": 36,
  "word": "mejor"
},
{
  "count": 35,
  "word": "planta"
},
{
  "count": 34,
  "word": "sup"
},
{
  "count": 34,
  "word": "infinity"
},
{
  "count": 34,
  "word": "inversión"
},
{
  "count": 34,
  "word": "escritorio"
},
{
  "count": 34,
  "word": "remanso"
},
{
  "count": 34,
  "word": "oficinas"
},
{
  "count": 33,
  "word": "presup"
},
{
  "count": 33,
  "word": "galpon"
},
{
  "count": 33,
  "word": "colinas"
},
{
  "count": 33,
  "word": "antigua"
},
{
  "count": 33,
  "word": "servicio"
},
{
  "count": 32,
  "word": "pirai"
},
{
  "count": 32,
  "word": "directo"
},
{
  "count": 32,
  "word": "macororo"
},
{
  "count": 32,
  "word": "amplia"
},
{
  "count": 32,
  "word": "fabiana"
},
{
  "count": 31,
  "word": "virgen"
},
{
  "count": 31,
  "word": "barrio"
},
{
  "count": 31,
  "word": "century"
},
{
  "count": 31,
  "word": "baño"
},
{
  "count": 31,
  "word": "mayor"
},
{
  "count": 31,
  "word": "operaciÓn"
},
{
  "count": 31,
  "word": "colegas"
},
{
  "count": 31,
  "word": "operacion"
},
{
  "count": 31,
  "word": "inmobiliaria"
},
{
  "count": 30,
  "word": "ambientes"
},
{
  "count": 30,
  "word": "principal"
},
{
  "count": 30,
  "word": "santa"
},
{
  "count": 30,
  "word": "ref"
},
{
  "count": 30,
  "word": "minimo"
},
{
  "count": 30,
  "word": "mts2"
},
{
  "count": 30,
  "word": "piso"
},
{
  "count": 30,
  "word": "cerrado"
},
{
  "count": 30,
  "word": "quiñones"
},
{
  "count": 30,
  "word": "carretera"
},
{
  "count": 29,
  "word": "anticrÉtico"
},
{
  "count": 29,
  "word": "años"
},
{
  "count": 29,
  "word": "crédito"
},
{
  "count": 28,
  "word": "comisión"
},
{
  "count": 28,
  "word": "indistinta"
},
{
  "count": 28,
  "word": "hacienda"
},
{
  "count": 27,
  "word": "similar"
},
{
  "count": 27,
  "word": "9no"
},
{
  "count": 27,
  "word": "adelante"
},
{
  "count": 27,
  "word": "anticrético"
},
{
  "count": 27,
  "word": "cruz"
},
{
  "count": 27,
  "word": "construcción"
},
{
  "count": 27,
  "word": "c21"
},
{
  "count": 27,
  "word": "acepten"
},
{
  "count": 26,
  "word": "condominios"
},
{
  "count": 26,
  "word": "galpón"
},
{
  "count": 26,
  "word": "dolares"
},
{
  "count": 26,
  "word": "incluidas"
},
{
  "count": 26,
  "word": "mañana"
},
{
  "count": 26,
  "word": "presupuestous"
},
{
  "count": 25,
  "word": "caracteristicas"
},
{
  "count": 25,
  "word": "trato"
},
{
  "count": 25,
  "word": "mas"
},
{
  "count": 25,
  "word": "500"
},
{
  "count": 24,
  "word": "bush"
},
{
  "count": 24,
  "word": "busco"
},
{
  "count": 24,
  "word": "restaurante"
},
{
  "count": 24,
  "word": "pisos"
},
{
  "count": 24,
  "word": "villa"
},
{
  "count": 24,
  "word": "industrial"
},
{
  "count": 24,
  "word": "meses"
},
{
  "count": 24,
  "word": "urbari"
},
{
  "count": 23,
  "word": "propietario"
},
{
  "count": 23,
  "word": "preferentemente"
},
{
  "count": 23,
  "word": "pasos"
},
{
  "count": 23,
  "word": "garage"
},
{
  "count": 23,
  "word": "cond"
},
{
  "count": 23,
  "word": "facturado"
},
{
  "count": 22,
  "word": "churrasquera"
},
{
  "count": 22,
  "word": "año"
},
{
  "count": 22,
  "word": "excelente"
},
{
  "count": 22,
  "word": "propiedad"
},
{
  "count": 22,
  "word": "casas"
},
{
  "count": 21,
  "word": "personas"
},
{
  "count": 21,
  "word": "esté"
},
{
  "count": 21,
  "word": "aprobado"
},
{
  "count": 21,
  "word": "posible"
},
{
  "count": 21,
  "word": "moderno"
},
{
  "count": 21,
  "word": "colina"
},
{
  "count": 21,
  "word": "cen"
},
{
  "count": 21,
  "word": "paga"
},
{
  "count": 20,
  "word": "uso"
},
{
  "count": 20,
  "word": "sevillas"
},
{
  "count": 20,
  "word": "banco"
},
{
  "count": 20,
  "word": "excelsior"
},
{
  "count": 20,
  "word": "visitar"
},
{
  "count": 20,
  "word": "requerimientos"
},
{
  "count": 20,
  "word": "hacer"
},
{
  "count": 20,
  "word": "abdul"
},
{
  "count": 20,
  "word": "hectáreas"
},
{
  "count": 20,
  "word": "rashid"
},
{
  "count": 19,
  "word": "comedor"
},
{
  "count": 19,
  "word": "dirección"
},
{
  "count": 19,
  "word": "visita"
},
{
  "count": 19,
  "word": "living"
},
{
  "count": 19,
  "word": "libre"
},
{
  "count": 19,
  "word": "jardín"
},
{
  "count": 18,
  "word": "balcon"
},
{
  "count": 18,
  "word": "plaza"
},
{
  "count": 18,
  "word": "buenas"
},
{
  "count": 18,
  "word": "cuarto"
},
{
  "count": 18,
  "word": "real"
},
{
  "count": 18,
  "word": "buena"
},
{
  "count": 18,
  "word": "colegio"
},
{
  "count": 18,
  "word": "jardin"
},
{
  "count": 18,
  "word": "urbano"
},
{
  "count": 18,
  "word": "500bs"
},
{
  "count": 18,
  "word": "golf"
},
{
  "count": 18,
  "word": "smart"
},
{
  "count": 18,
  "word": "menos"
},
{
  "count": 18,
  "word": "construir"
},
{
  "count": 17,
  "word": "inf"
},
{
  "count": 17,
  "word": "gravamen"
},
{
  "count": 17,
  "word": "lote"
},
{
  "count": 17,
  "word": "mínima"
},
{
  "count": 17,
  "word": "habitaciónes"
},
{
  "count": 17,
  "word": "comerciales"
},
{
  "count": 17,
  "word": "plan"
},
{
  "count": 17,
  "word": "tres"
},
{
  "count": 17,
  "word": "plantas"
},
{
  "count": 17,
  "word": "cerrar"
},
{
  "count": 17,
  "word": "piraí"
},
{
  "count": 17,
  "word": "maría"
},
{
  "count": 17,
  "word": "ofertas"
},
{
  "count": 17,
  "word": "mayo"
},
{
  "count": 16,
  "word": "cercano"
},
{
  "count": 16,
  "word": "inbox"
},
{
  "count": 16,
  "word": "telf"
},
{
  "count": 16,
  "word": "cualquiera"
},
{
  "count": 16,
  "word": "gimac"
},
{
  "count": 16,
  "word": "opcion"
},
{
  "count": 16,
  "word": "mostrar"
},
{
  "count": 16,
  "word": "baja"
},
{
  "count": 16,
  "word": "indispensable"
},
{
  "count": 16,
  "word": "sala"
},
{
  "count": 16,
  "word": "esquina"
},
{
  "count": 16,
  "word": "lejos"
},
{
  "count": 16,
  "word": "centenario"
},
{
  "count": 16,
  "word": "aproximadamente"
},
{
  "count": 16,
  "word": "alto"
},
{
  "count": 15,
  "word": "tiendas"
},
{
  "count": 15,
  "word": "irala"
},
{
  "count": 15,
  "word": "mantenido"
},
{
  "count": 15,
  "word": "agosto"
},
{
  "count": 15,
  "word": "anillos"
},
{
  "count": 15,
  "word": "lugar"
},
{
  "count": 15,
  "word": "operación"
},
{
  "count": 15,
  "word": "500m2"
},
{
  "count": 15,
  "word": "opciones"
},
{
  "count": 15,
  "word": "pequeña"
},
{
  "count": 15,
  "word": "asesora"
},
{
  "count": 15,
  "word": "tengan"
},
{
  "count": 15,
  "word": "movilidades"
},
{
  "count": 15,
  "word": "estate"
},
{
  "count": 15,
  "word": "sevilla"
},
{
  "count": 15,
  "word": "puente"
},
{
  "count": 15,
  "word": "inmobiliario"
},
{
  "count": 15,
  "word": "requerido"
},
{
  "count": 15,
  "word": "incluye"
},
{
  "count": 15,
  "word": "httpslinktreeblurealtybolivia"
},
{
  "count": 15,
  "word": "suelo"
},
{
  "count": 15,
  "word": "requisitos"
},
{
  "count": 14,
  "word": "hab"
},
{
  "count": 14,
  "word": "requiere"
},
{
  "count": 14,
  "word": "adelantado"
},
{
  "count": 14,
  "word": "remanzo"
},
{
  "count": 14,
  "word": "porfavor"
},
{
  "count": 14,
  "word": "metros"
},
{
  "count": 14,
  "word": "cumavi"
},
{
  "count": 14,
  "word": "similares"
},
{
  "count": 14,
  "word": "1er"
},
{
  "count": 14,
  "word": "vehículo"
},
{
  "count": 14,
  "word": "amplios"
},
{
  "count": 14,
  "word": "favor"
},
{
  "count": 14,
  "word": "urubÓ"
},
{
  "count": 14,
  "word": "mt2"
},
{
  "count": 14,
  "word": "aurelio"
},
{
  "count": 14,
  "word": "gas"
},
{
  "count": 14,
  "word": "mismo"
},
{
  "count": 14,
  "word": "máx"
},
{
  "count": 13,
  "word": "nota"
},
{
  "count": 13,
  "word": "solamente"
},
{
  "count": 13,
  "word": "pase"
},
{
  "count": 13,
  "word": "inversiÓn"
},
{
  "count": 13,
  "word": "mascotas"
},
{
  "count": 13,
  "word": "visitas"
},
{
  "count": 13,
  "word": "ubicado"
},
{
  "count": 13,
  "word": "zonanorte"
},
{
  "count": 13,
  "word": "fontana"
},
{
  "count": 13,
  "word": "renee"
},
{
  "count": 13,
  "word": "studio"
},
{
  "count": 13,
  "word": "informacion"
},
{
  "count": 13,
  "word": "saldo"
},
{
  "count": 13,
  "word": "Áreas"
},
{
  "count": 13,
  "word": "curupau"
},
{
  "count": 13,
  "word": "utepsa"
},
{
  "count": 13,
  "word": "cel"
},
{
  "count": 13,
  "word": "conexion"
},
{
  "count": 13,
  "word": "agua"
},
{
  "count": 13,
  "word": "pueda"
},
{
  "count": 13,
  "word": "medidor"
},
{
  "count": 12,
  "word": "gimnasio"
},
{
  "count": 12,
  "word": "ingresos"
},
{
  "count": 12,
  "word": "areas"
},
{
  "count": 12,
  "word": "servicios"
},
{
  "count": 12,
  "word": "rojas"
},
{
  "count": 12,
  "word": "semi"
},
{
  "count": 12,
  "word": "vista"
},
{
  "count": 12,
  "word": "ubicaciÓn"
},
{
  "count": 12,
  "word": "semana"
},
{
  "count": 12,
  "word": "condiciones"
},
{
  "count": 12,
  "word": "cerrada"
},
{
  "count": 12,
  "word": "martin"
},
{
  "count": 12,
  "word": "credito"
},
{
  "count": 12,
  "word": "prime"
},
{
  "count": 12,
  "word": "mercado"
},
{
  "count": 12,
  "word": "espacio"
},
{
  "count": 12,
  "word": "departamentos"
},
{
  "count": 12,
  "word": "habitable"
},
{
  "count": 12,
  "word": "parte"
},
{
  "count": 12,
  "word": "media"
},
{
  "count": 12,
  "word": "desarrollo"
},
{
  "count": 12,
  "word": "porton"
},
{
  "count": 12,
  "word": "ciudad"
},
{
  "count": 11,
  "word": "electrica"
},
{
  "count": 11,
  "word": "pequeño"
},
{
  "count": 11,
  "word": "molina"
},
{
  "count": 11,
  "word": "urbanización"
},
{
  "count": 11,
  "word": "galpÓn"
},
{
  "count": 11,
  "word": "renzo"
},
{
  "count": 11,
  "word": "opción"
},
{
  "count": 11,
  "word": "grande"
},
{
  "count": 11,
  "word": "envia"
},
{
  "count": 11,
  "word": "aumentar"
},
{
  "count": 11,
  "word": "trifasica"
},
{
  "count": 11,
  "word": "garantía"
},
{
  "count": 11,
  "word": "village"
},
{
  "count": 11,
  "word": "tarde"
},
{
  "count": 11,
  "word": "camiri"
},
{
  "count": 11,
  "word": "embardado"
},
{
  "count": 11,
  "word": "energia"
},
{
  "count": 11,
  "word": "brígida"
},
{
  "count": 11,
  "word": "mascota"
},
{
  "count": 11,
  "word": "Área"
},
{
  "count": 11,
  "word": "mes"
},
{
  "count": 11,
  "word": "alta"
},
{
  "count": 11,
  "word": "importante"
},
{
  "count": 11,
  "word": "bonita"
},
{
  "count": 10,
  "word": "capacidad"
},
{
  "count": 10,
  "word": "salón"
},
{
  "count": 10,
  "word": "noroeste"
},
{
  "count": 10,
  "word": "aire"
},
{
  "count": 10,
  "word": "rentabilidad"
},
{
  "count": 10,
  "word": "gracias"
},
{
  "count": 10,
  "word": "importa"
},
{
  "count": 10,
  "word": "vivian"
},
{
  "count": 10,
  "word": "mÁximo"
},
{
  "count": 10,
  "word": "domiciliario"
},
{
  "count": 10,
  "word": "clientes"
},
{
  "count": 10,
  "word": "equipado"
},
{
  "count": 10,
  "word": "cada"
},
{
  "count": 10,
  "word": "g77"
},
{
  "count": 10,
  "word": "luxia"
},
{
  "count": 10,
  "word": "maÑana"
},
{
  "count": 10,
  "word": "lavandería"
},
{
  "count": 10,
  "word": "500m"
},
{
  "count": 10,
  "word": "altura"
},
{
  "count": 10,
  "word": "upsa"
},
{
  "count": 10,
  "word": "200"
},
{
  "count": 10,
  "word": "avenidas"
},
{
  "count": 10,
  "word": "mainter"
},
{
  "count": 10,
  "word": "carlos"
},
{
  "count": 10,
  "word": "velarde"
},
{
  "count": 10,
  "word": "barranca"
},
{
  "count": 10,
  "word": "home"
},
{
  "count": 10,
  "word": "negociable"
},
{
  "count": 10,
  "word": "select"
},
{
  "count": 10,
  "word": "amplias"
},
{
  "count": 10,
  "word": "próximo"
},
{
  "count": 10,
  "word": "brigida"
},
{
  "count": 10,
  "word": "rubro"
},
{
  "count": 10,
  "word": "arteaga"
},
{
  "count": 10,
  "word": "persona"
},
{
  "count": 10,
  "word": "busca"
},
{
  "count": 10,
  "word": "únicamente"
},
{
  "count": 10,
  "word": "juan"
},
{
  "count": 10,
  "word": "duplex"
},
{
  "count": 10,
  "word": "300m2"
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

