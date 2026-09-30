---
layout: final-user
permalink: /como-funciona/
title: Cómo funciona Statetty | Encuentra tu inmueble con un agente a tu lado
description: Busca inmuebles en venta, alquiler o anticrético en el mapa y deja que un agente inmobiliario te acompañe hasta cerrar el trato. Bolivia y Perú.
---
<style>
:root{--tinta:#0e2238;--azul:#1d5fd0;--azul-osc:#164aa6;--fondo:#f6f8fb;--pizarra:#5a6b7d;--linea:#d9e1ea;--verde:#e3efe9;--ambar:#f2a33a;--blanco:#fff}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:5rem}
body{margin:0;padding-top:calc(64px + env(safe-area-inset-top,0px));font:400 1.0625rem/1.65 "Source Sans 3",system-ui,sans-serif;color:var(--tinta);background:var(--fondo)}
h1,h2,h3{font-family:"Bricolage Grotesque","Source Sans 3",sans-serif;line-height:1.12;margin:0 0 .6em;letter-spacing:-.01em}
h1{font-size:clamp(2.2rem,5.5vw,3.8rem);font-weight:700}
h2{font-size:clamp(1.7rem,3.6vw,2.5rem);font-weight:700}
h3{font-size:1.25rem;font-weight:500}
p{margin:0 0 1em;max-width:62ch}
a{color:var(--azul)}
:focus-visible{outline:3px solid var(--ambar);outline-offset:2px}
.wrap{width:min(1120px,100% - 2.5rem);margin-inline:auto}
section{padding:clamp(3rem,7vw,5.5rem) 0}
.btn{display:inline-block;padding:.75rem 1.3rem;border-radius:.5rem;font-weight:600;text-decoration:none;border:2px solid var(--azul);background:var(--azul);color:var(--blanco)}
.btn:hover{background:var(--azul-osc);border-color:var(--azul-osc)}
.btn.sec{background:transparent;color:var(--azul)}
.btn.sec:hover{background:var(--azul);color:var(--blanco)}

/* hero */
.hero{padding-top:clamp(2.5rem,6vw,4.5rem)}
.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:2.5rem;align-items:center}
.hero p.lead{font-size:1.2rem;color:var(--pizarra)}
.acciones{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1.5rem}
.mapa-demo{background:var(--verde);border:1px solid var(--linea);border-radius:1rem;padding:1rem}
.mapa-demo svg{display:block;width:100%;height:auto}
.mapa-demo figcaption{font-size:.92rem;color:var(--pizarra);margin-top:.6rem}
@media(max-width:860px){.hero .wrap{grid-template-columns:1fr}}

/* caminos */
.caminos{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:2rem}
.camino{background:var(--blanco);border:1px solid var(--linea);border-radius:1rem;padding:1.75rem}
.camino.destacado{background:var(--tinta);color:var(--blanco);border-color:var(--tinta)}
.camino.destacado p{color:#d5dfea}
.camino ol{padding-left:1.2rem;margin:1rem 0 1.5rem}
.camino li{margin-bottom:.6rem;padding-left:.2rem}
.camino li::marker{font-weight:700;color:var(--azul)}
.camino.destacado li::marker{color:var(--ambar)}
.camino.destacado .btn{background:var(--ambar);border-color:var(--ambar);color:var(--tinta)}
@media(max-width:860px){.caminos{grid-template-columns:1fr}}

/* por que agente */
#por-que-un-agente{background:var(--blanco);border-block:1px solid var(--linea)}
.razones{display:grid;grid-template-columns:repeat(2,1fr);gap:0;margin-top:2rem;border-top:1px solid var(--linea)}
.razon{padding:1.5rem 1.5rem 1.5rem 0;border-bottom:1px solid var(--linea)}
.razon:nth-child(even){padding-left:1.5rem;padding-right:0;border-left:1px solid var(--linea)}
.razon p{margin:0;color:var(--pizarra)}
@media(max-width:860px){.razones{grid-template-columns:1fr}.razon,.razon:nth-child(even){padding:1.25rem 0;border-left:0}}

/* propietarios */
.duo{display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;align-items:start}
.duo ul{padding-left:1.1rem;margin:0 0 1.5rem}
.duo li{margin-bottom:.5rem}
@media(max-width:860px){.duo{grid-template-columns:1fr}}

/* faq */
details{border-bottom:1px solid var(--linea);padding:1rem 0}
summary{cursor:pointer;font:500 1.15rem "Bricolage Grotesque",sans-serif;list-style:none;display:flex;justify-content:space-between;gap:1rem}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";font-size:1.4rem;line-height:1;color:var(--azul)}
details[open] summary::after{content:"\2212"}
details p{margin:.8rem 0 0;color:var(--pizarra)}

/* cierre */
.cierre{background:var(--azul);color:var(--blanco);text-align:center}
.cierre p{margin-inline:auto;color:#dbe7fb}
.cierre .acciones{justify-content:center}
.cierre .btn{background:var(--blanco);color:var(--azul);border-color:var(--blanco)}
.cierre .btn.sec{background:transparent;color:var(--blanco)}
.cierre .btn.sec:hover{background:var(--blanco);color:var(--azul)}

footer{background:var(--tinta);color:#b9c6d4;padding:2.5rem 0;font-size:.95rem}
footer .wrap{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:2rem}
footer a{color:#e8eef5;text-decoration:none;display:block;margin-bottom:.4rem}
footer a:hover{text-decoration:underline}
footer h4{margin:0 0 .6rem;color:var(--blanco);font:500 1rem "Bricolage Grotesque",sans-serif}
.credito{margin:1.5rem 0 0;font-size:.9rem;color:#9fb0c2}
.credito a{color:#e8eef5;display:inline;margin:0}
@media(max-width:860px){footer .wrap{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
<main>

<section class="hero">
  <div class="wrap">
    <div>
      <h1>Encuentra tu inmueble en el mapa. Un agente te acompaña hasta la llave.</h1>
      <p class="lead">Busca casas, departamentos y terrenos en venta, alquiler o anticrético en Bolivia y Perú. Cuando encuentres uno que te guste, un agente inmobiliario te lo muestra y te ayuda a conseguirlo.</p>
      <div class="acciones">
        <a class="btn" href="/">Buscar en el mapa</a>
        <a class="btn sec" href="#dos-caminos">Ver cómo funciona</a>
      </div>
    </div>
    <figure class="mapa-demo" style="margin:0">
      <svg viewBox="0 0 400 300" role="img" aria-label="Mapa con diez inmuebles marcados">
        <rect width="400" height="300" fill="#e3efe9"/>
        <path d="M0 210 C90 180 150 240 240 200 S360 150 400 170 V300 H0Z" fill="#cfe1f3"/>
        <g stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round"><path d="M0 90H400"/><path d="M120 0V300"/><path d="M270 0V300"/><path d="M0 40L400 150"/></g>
        <g fill="#1d5fd0" stroke="#fff" stroke-width="3">
          <circle cx="60" cy="60" r="9"/><circle cx="170" cy="45" r="9"/><circle cx="330" cy="70" r="9"/>
          <circle cx="90" cy="130" r="9"/><circle cx="215" cy="120" r="9"/><circle cx="350" cy="130" r="9"/>
          <circle cx="150" cy="180" r="9"/><circle cx="300" cy="200" r="9"/><circle cx="70" cy="240" r="9"/>
        </g>
        <circle cx="215" cy="120" r="9" fill="#f2a33a" stroke="#0e2238" stroke-width="3"/>
        <circle cx="215" cy="120" r="18" fill="none" stroke="#f2a33a" stroke-width="3"/>
      </svg>
      <figcaption>Cada búsqueda te muestra hasta 10 inmuebles en el mapa.</figcaption>
    </figure>
  </div>
</section>

<section id="dos-caminos">
  <div class="wrap">
    <h2>Dos formas de encontrar tu próximo hogar</h2>
    <p>Elige la que se ajuste a tu tiempo. Puedes usar las dos.</p>
    <div class="caminos">
      <article class="camino">
        <h3>Busco yo mismo</h3>
        <p>Explora el mapa a tu ritmo.</p>
        <ol>
          <li>Escribe lo que necesitas: zona, tipo de inmueble, presupuesto y si es venta, alquiler o anticrético.</li>
          <li>Mira en el mapa los 10 inmuebles más nuevos que coinciden.</li>
          <li>Pulsa contactar en el inmueble que te interesa.</li>
          <li>Statetty te conecta con un profesional de su red que te muestra el inmueble y te acompaña de forma eficiente hasta el final.</li>
          <li>Si ese inmueble no resulta el mejor, el mismo profesional sigue la búsqueda del ideal contigo.</li>
        </ol>
        <a class="btn" href="/">Abrir el mapa</a>
      </article>
      <article class="camino destacado">
        <h3>Que me busquen a mí</h3>
        <p>Cuéntanos qué quieres y un agente se encarga.</p>
        <ol>
          <li>Escríbenos por WhatsApp con lo que buscas.</li>
          <li>Te conectamos con un agente inmobiliario de tu ciudad.</li>
          <li>El agente hace una búsqueda más profunda y personalizada, incluso entre inmuebles que aún no están publicados.</li>
          <li>Recibes opciones filtradas y visitas coordinadas.</li>
        </ol>
        <p><strong>Esta búsqueda personalizada no tiene costo para ti.</strong></p>
        <a class="btn" href="https://wa.me/59178447518?text=Hola%20Statetty%2C%20quiero%20que%20un%20agente%20me%20ayude%20a%20buscar%20un%20inmueble">Pedir mi búsqueda</a>
      </article>
    </div>
  </div>
</section>

<section id="por-que-un-agente">
  <div class="wrap">
    <h2>Por qué conviene comprar, vender o alquilar con un agente inmobiliario</h2>
    <p>Un inmueble suele ser la decisión económica más grande de una familia. Un agente pone experiencia y respaldo en cada paso.</p>
    <div class="razones">
      <div class="razon">
        <h3>Transparencia y solidez legal</h3>
        <p>Revisa que la documentación esté en orden, que el vendedor sea quien dice ser y que las condiciones queden claras por escrito antes de firmar.</p>
      </div>
      <div class="razon">
        <h3>Filtra a los interesados</h3>
        <p>Conversa con todos los prospectos y atiende solo a quienes realmente pueden avanzar. Los propietarios reciben visitas útiles y pierden menos tiempo.</p>
      </div>
      <div class="razon">
        <h3>Investiga a compradores e inquilinos</h3>
        <p>Verifica la capacidad de pago y la seriedad de quien quiere el inmueble, para que el propietario decida con información.</p>
      </div>
      <div class="razon">
        <h3>Conoce el precio real de la zona</h3>
        <p>Compara con inmuebles similares para que pagues, o cobres, un valor justo y no te lleves sorpresas después.</p>
      </div>
      <div class="razon">
        <h3>Negocia por ti</h3>
        <p>Cuida tu interés en la conversación de precio, plazos y condiciones, y evita que la relación personal se tense.</p>
      </div>
      <div class="razon">
        <h3>Te acompaña hasta el final</h3>
        <p>Coordina visitas, trámites y firma. Tienes una persona de contacto desde la primera visita hasta la entrega de llaves.</p>
      </div>
    </div>
  </div>
</section>

<section id="propietarios">
  <div class="wrap duo">
    <div>
      <h2>¿Quieres vender, alquilar o dar en anticrético?</h2>
      <p>Un agente publica tu inmueble donde lo ven los compradores adecuados y se encarga del contacto con los interesados.</p>
    </div>
    <div>
      <ul>
        <li>Atiende llamadas y mensajes de los prospectos por ti.</li>
        <li>Filtra y verifica antes de coordinar cada visita.</li>
        <li>Te ayuda a fijar un precio acorde al mercado.</li>
        <li>Cuida la parte legal y la documentación del trato.</li>
      </ul>
      <a class="btn" href="https://wa.me/59178447518?text=Hola%20Statetty%2C%20quiero%20que%20un%20agente%20me%20ayude%20a%20publicar%20mi%20inmueble">Hablar con un agente</a>
    </div>
  </div>
</section>

<section id="faq" style="background:var(--blanco);border-block:1px solid var(--linea)">
  <div class="wrap">
    <h2>Preguntas frecuentes</h2>
    <details><summary>¿Cuántos inmuebles me muestra cada búsqueda?</summary><p>Hasta 10, los más nuevos que coinciden con lo que escribiste. Puedes hacer todas las búsquedas que quieras.</p></details>
    <details><summary>¿En qué países funciona?</summary><p>Bolivia y Perú. La cobertura más amplia está en Santa Cruz de la Sierra, y en Perú comienza por Lima.</p></details>
    <details><summary>¿Qué es el anticrético?</summary><p>Es una modalidad boliviana en la que entregas una suma de dinero al propietario y usas el inmueble durante un plazo. Al terminar, te devuelve ese monto. Puedes buscarlo en el mapa igual que una venta o un alquiler.</p></details>
    <details><summary>¿De dónde vienen los inmuebles?</summary><p>De los sitios de agencias inmobiliarias reconocidas. Al contactar por un inmueble, Statetty te conecta con un profesional de su red que te lo muestra y te acompaña hasta el cierre de la compra, la venta o el alquiler.</p></details>
    <details><summary>¿Tiene costo hablar con un agente?</summary><p>La búsqueda personalizada no tiene costo para ti. Cada agente te explica las condiciones de su servicio antes de avanzar con cualquier operación.</p></details>
    <details><summary>¿Necesito crear una cuenta?</summary><p>No. Abre el mapa y empieza a buscar.</p></details>
  </div>
</section>

<section class="cierre">
  <div class="wrap">
    <h2>Empieza por donde prefieras</h2>
    <p>Explora el mapa ahora o cuéntale a un agente qué necesitas.</p>
    <div class="acciones">
      <a class="btn" href="/">Buscar en el mapa</a>
      <a class="btn sec" href="https://wa.me/59178447518?text=Hola%20Statetty%2C%20quiero%20que%20un%20agente%20me%20ayude%20a%20buscar%20un%20inmueble">Hablar con un agente</a>
    </div>
  </div>
</section>

</main>
