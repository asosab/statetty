---
layout: page
title: "Qué es el ACM y cómo te ayuda a vender más"
date: 2025-03-15
categories: herramientas, acm
comments: true
description: "El Análisis Comparativo de Mercado (ACM) es la herramienta clave para fijar precios competitivos. Aprendé a calcularlo paso a paso y descubrí cómo Statetty lo hace en segundos."
tags: [acm, análisis de mercado, precios, valoración de propiedades, herramientas]
published: true
image: "statetty_banner.jpg"
---

## El ACM: tu mejor aliado para poner precio a una propiedad

El **Análisis Comparativo de Mercado (ACM)** es el método más usado por agentes inmobiliarios para estimar el valor de una propiedad. Se basa en comparar inmuebles similares —activos, vendidos o en alquiler— ubicados en la misma zona, para derivar un rango de precio justo y defendible ante el cliente.

No es una tasación legal ni un avalúo pericial. Es una herramienta de trabajo cotidiano: rápida, práctica y suficientemente precisa para negociar con criterio.

---

## ¿Por qué es importante?

El precio de salida de una propiedad es, probablemente, la decisión más crítica de toda la operación. Un error en esa cifra tiene consecuencias directas:

- **Sobrevalorar** la propiedad genera un inmueble estancado: pocos contactos, visitas escasas y una negociación desgastante que termina bajando el precio de todas formas, pero después de meses perdidos.
- **Subvalorarla** perjudica al vendedor y erosiona tu credibilidad como asesor.
- **No tener argumentos sólidos** frente a un cliente que ya comparó con tres agencias diferentes te deja en posición débil desde el primer minuto.

Un ACM bien hecho es tu respaldo técnico. Pasás de decir *"creo que vale así"* a mostrar datos concretos del mercado.

---

## Los comparables: qué buscar y por qué

Un **comparable** (o *comp*) es cualquier inmueble suficientemente similar al que estás analizando. Los criterios mínimos para considerarlo válido:

- **Mismo tipo**: casa con casa, departamento con departamento, lote con lote.
- **Misma zona o radio acotado**: generalmente 500 m a 2 km dependiendo de la densidad del barrio.
- **Superficie similar**: margen razonable de ±20–30% respecto al inmueble sujeto.
- **Antigüedad del dato**: idealmente publicado o vendido en los últimos 6 a 12 meses.

Cuantos más comparables tenés, más robusto es el análisis. Con 3 ya podés trabajar; con 6 a 10, el rango es confiable.

---

## Las matemáticas del ACM

### 1. Precio por metro cuadrado (precio/m²)

Es la unidad de medida central del ACM. Normaliza los precios y permite comparar inmuebles de distinto tamaño.

```
precio/m² = precio_total ÷ superficie_construida
```

**Ejemplo:**

| Comparable | Precio total | Superficie | Precio/m² |
|------------|-------------|------------|-----------|
| A          | $95.000     | 120 m²     | $791,67   |
| B          | $82.000     | 100 m²     | $820,00   |
| C          | $110.000    | 135 m²     | $814,81   |

---

### 2. Rango y promedio

Una vez obtenidos los precios/m² de los comparables:

```
promedio = suma de todos los precios/m² ÷ cantidad de comparables
```

Con los datos del ejemplo:

```
promedio = (791,67 + 820,00 + 814,81) ÷ 3 = $808,83/m²
```

Para estimar el valor del inmueble sujeto (supongamos 115 m²):

```
valor_estimado = promedio/m² × superficie_sujeto
valor_estimado = $808,83 × 115 = $93.015
```

Ese es tu punto de partida para la negociación.

---

### 3. Rango mínimo–máximo

El promedio solo no es suficiente. El rango te da el piso y el techo:

```
rango = [precio/m²_mínimo × superficie_sujeto, precio/m²_máximo × superficie_sujeto]
rango = [$791,67 × 115, $820,00 × 115] = [$91.042 – $94.300]
```

Podés presentarle al cliente: *"el mercado actual de tu zona ubica la propiedad entre $91.000 y $94.000, con un centro de valor alrededor de $93.000"*.

---

### 4. Ajustes cualitativos

No todos los comparables son perfectos. Podés aplicar ajustes simples por características diferenciales:

| Factor              | Ajuste sugerido |
|---------------------|-----------------|
| Piscina             | +3 a +6%        |
| Sin garaje          | −5 a −8%        |
| Antigüedad > 20 años| −5 a −10%       |
| Vista privilegiada  | +3 a +5%        |
| Primer piso sin ascensor | −5 a −7%  |

Los ajustes son estimativos y dependen del mercado local. Lo importante es documentar el criterio usado.

---

## Casos de uso concretos

### Caso 1: Captar una propiedad con precio defendible

Un propietario quiere publicar su casa en $150.000. El mercado comparable de su barrio muestra un precio/m² promedio de $780 y la casa tiene 160 m².

```
valor_estimado = $780 × 160 = $124.800
```

Con ese dato podés tener una conversación honesta con el cliente, mostrarle los comparables y acordar un precio de salida realista. Sin el ACM, la discusión es subjetiva; con él, es técnica.

---

### Caso 2: Responder a un comprador que "ya vio algo más barato"

El comprador dice haber visto una propiedad similar $15.000 más barata. Con el ACM en mano podés analizar si ese comparable tiene las mismas características (superficie, estado, zona) o si el precio bajo responde a alguna condición particular. En muchos casos, el "más barato" es un inmueble con déficit que el comprador no vio todavía.

---

### Caso 3: Detectar oportunidades de inversión

Si el precio/m² de un inmueble está por debajo del promedio de su zona sin justificación aparente (no hay problemas legales, no está deteriorado), puede ser una oportunidad. El ACM te da el parámetro para identificarlo.

---

### Caso 4: Actualizar captaciones antiguas

Una propiedad captada hace 8 meses puede estar publicada a un precio que el mercado ya superó —hacia arriba o hacia abajo. Repetir el ACM periódicamente sobre tus captaciones activas te permite ajustar antes de que el cliente o el comprador te lo señalen.

---

## El problema: hacerlo manual toma horas

Para hacer un ACM tradicional tenés que:

1. Abrir varios portales (Infocasas, Ultracasas, páginas de agencias) y buscar manualmente.
2. Extraer datos de cada comparable: precio, metros, antigüedad, estado.
3. Cargar todo en una planilla de Excel.
4. Calcular los precios/m², promedios y rangos.
5. Armar una presentación que el cliente pueda entender.

Eso puede llevar **3 a 6 horas por propiedad**, sin contar que los datos de portales tienen distintos niveles de confiabilidad y no siempre están actualizados.

---

## Cómo Statetty resuelve esto

Statetty automatiza el proceso completo desde el bot en Telegram ([@statettybot](https://t.me/statettybot)):

**Búsqueda filtrada por zona y radio**
Configurás el punto central (la propiedad sujeto), el radio de búsqueda (recomendado: 1 km) y la antigüedad máxima del dato (recomendado: 12 meses). Statetty consulta inmobiliarias y fuentes propias —no solo portales— lo que mejora la calidad y completitud de los comparables.

**Pin ACM en el mapa**
Una vez que tenés los resultados en el mapa interactivo, podés colocar un pin en la ubicación exacta de la propiedad que estás analizando. Ese pin calcula automáticamente el ACM en función de los inmuebles visibles. Si lo movés, recalcula.

**Exportación a PDF**
El resultado del ACM se puede incluir directamente en el reporte PDF que Statetty genera. En *Seleccionados & PDF*, activás la opción *"Incluir resultado del ACM"* y queda listo para enviar al cliente.

Con Statetty, un ACM que antes te tomaba medio día ahora lo tenés en **menos de 5 minutos**.

### Videos: cómo hacer el ACM con Statetty

**Tutorial completo — ACM paso a paso:**
[![Tutorial ACM en Statetty](https://img.youtube.com/vi/0_wDeIei7Dc/0.jpg)](https://youtu.be/0_wDeIei7Dc)

> Parámetros recomendados para el ACM: función *Inmuebles*, radio 1 km, antigüedad 12 meses, búsqueda sobre activos **e** inactivos. Incluir inactivos es clave porque los inmuebles vendidos son los comparables más sólidos.

---

## Buenas prácticas para un ACM confiable

- **Usá inactivos además de activos.** Los precios de publicación son aspiracionales; los de venta efectiva son los reales.
- **No promedies comparables muy dispares.** Si uno de los datos está muy alejado del resto, analizá por qué antes de incluirlo.
- **Documentá tus fuentes.** Si después el cliente pregunta, tenés que poder mostrar de dónde salió cada número.
- **Repetí el análisis cada vez que el mercado se mueva.** En mercados volátiles, un ACM de hace tres meses puede estar desactualizado.
- **Combiná con tu criterio.** El ACM es una herramienta, no un oráculo. Tu conocimiento del barrio, del tipo de cliente y del momento del mercado siempre suma.

---

*¿Querés probarlo? [Iniciá tu prueba en @statettybot](https://t.me/statettybot) y hacé tu primer ACM hoy mismo.*
