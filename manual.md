---
layout: default
title: "Manual de usuario"
short: "Manual de usuario · Statetty"
description: "Manual de uso de Statetty, paso a paso: buscar inmuebles con filtros, comparar resultados en el mapa, estimar valores con ACM, generar PDF, publicar tus captaciones y recibir alertas por WhatsApp. Web y bot de Telegram."
permalink: /manual/
---

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  :root{
    --navy:#14213D;
    --navy-2:#20325A;
    --blueprint:#5B8AA6;
    --blueprint-light:#E4EEF2;
    --paper:#F3F0E6;
    --card:#FFFFFF;
    --gold:#A9791F;
    --ink:#1E2230;
    --ink-soft:#5C6270;
    --line:rgba(20,33,61,.14);
    --radius:3px;
  }
  *{box-sizing:border-box;}
  html{scroll-behavior:smooth; scroll-padding-top:24px;}
  body{
    margin:0;
    background:var(--paper);
    color:var(--ink);
    font-family:'Inter',sans-serif;
    font-size:16px;
    line-height:1.6;
  }
  h1,h2,h3{
    font-family:'Fraunces',serif;
    color:var(--navy);
    line-height:1.15;
    margin:0 0 .5em;
  }
  code, .cmd{
    font-family:'IBM Plex Mono',monospace;
    font-size:.85em;
    background:var(--blueprint-light);
    color:var(--navy-2);
    padding:.1em .45em;
    border-radius:2px;
  }
  a{color:var(--navy-2);}
  a.cmd{text-decoration:none;}
  a.cmd:hover{background:var(--gold); color:#fff;}
  p{max-width:66ch;}
  ul,ol{padding-left:1.2em; max-width:64ch;}
  li{margin-bottom:.35em;}

  /* ---------- layout shell ---------- */
  .shell{display:flex; min-height:100vh;}
  nav.toc{
    width:290px; flex:0 0 290px;
    background:var(--navy);
    color:#EDEBE1;
    position:sticky; top:0; height:100vh; overflow-y:auto;
    padding:28px 22px 40px;
  }
  nav.toc .brand{
    font-family:'Fraunces',serif; font-size:1.4rem; color:#fff;
    display:flex; align-items:center; gap:.5em; margin-bottom:2px;
  }
  nav.toc .brand small{
    display:block; font-family:'Inter',sans-serif; font-size:.66rem;
    letter-spacing:.03em; color:#A9B4C9; font-weight:500; margin-top:2px;
  }
  nav.toc .toc-hint{
    font-size:.78rem; color:#8D9AB6; margin:14px 0 0; line-height:1.5;
  }
  nav.toc .group-label{
    font-size:.72rem; color:#8D9AB6; font-weight:600;
    margin:22px 0 6px; padding:0 10px;
  }
  nav.toc .group-label:first-of-type{margin-top:20px;}
  nav.toc ol{list-style:none; padding:0; margin:0; counter-reset:sec;}
  nav.toc ol li.item{margin-bottom:1px;}
  nav.toc ol a{
    counter-increment:sec;
    display:block; color:#C7CEDD; text-decoration:none;
    font-size:.89rem; padding:7px 10px; border-radius:2px;
    border-left:2px solid transparent;
  }
  nav.toc ol a::before{
    content:counter(sec,decimal-leading-zero) '  ';
    color:#6F7EA0; font-family:'IBM Plex Mono',monospace; font-size:.78em;
  }
  nav.toc ol a:hover{background:rgba(255,255,255,.06); color:#fff;}
  nav.toc ol a.active{border-left-color:var(--gold); color:#fff; background:rgba(255,255,255,.06);}

  main{flex:1; min-width:0;}

  /* ---------- hero ---------- */
  .hero{
    background:linear-gradient(180deg,var(--navy) 0%,var(--navy-2) 100%);
    color:#fff; padding:64px 56px 56px; position:relative; overflow:hidden;
  }
  .hero::after{
    content:''; position:absolute; inset:0;
    background-image:
      repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 64px),
      repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 64px);
    pointer-events:none;
  }
  .hero-inner{position:relative; max-width:720px;}
  .hero h1{color:#fff; font-size:clamp(2rem,4vw,2.7rem); font-weight:500;}
  .hero p{color:#CBD3E3; max-width:56ch; font-size:1.05rem;}
  .eyebrow{
    color:var(--gold); font-family:'IBM Plex Mono',monospace; font-size:.78rem;
    margin-bottom:14px; display:inline-block;
  }

  /* ---------- finder (buscador) ---------- */
  .finder{position:relative; flex:1 1 260px; min-width:220px; max-width:460px;}
  .finder input[type="search"]{
    width:100%; font:inherit; font-size:.92rem; color:var(--ink);
    background:#fff; border:1px solid var(--line); border-radius:20px;
    padding:9px 16px 9px 36px; outline:none;
  }
  .finder input[type="search"]:focus{border-color:var(--navy);}
  .finder input[type="search"]::-webkit-search-cancel-button{display:none;}
  .finder::before{
    content:'🔎'; position:absolute; left:13px; top:50%; transform:translateY(-50%);
    font-size:.85rem; pointer-events:none;
  }
  .search-results{
    list-style:none; margin:0; padding:6px; position:absolute; left:0; right:0; top:calc(100% + 6px);
    background:#fff; border:1px solid var(--line); border-radius:8px;
    box-shadow:0 10px 24px rgba(20,33,61,.14); max-height:340px; overflow-y:auto; z-index:10;
  }
  .search-results[hidden]{display:none;}
  .search-results li{margin:0;}
  .search-results a{
    display:flex; flex-direction:column; gap:1px; text-decoration:none;
    padding:9px 12px; border-radius:5px; color:var(--ink);
  }
  .search-results a small{color:var(--ink-soft); font-size:.76rem;}
  .search-results a:hover, .search-results a.is-active{background:var(--blueprint-light);}
  .search-empty{padding:10px 12px; color:var(--ink-soft); font-size:.88rem;}

  /* ---------- platform switch ---------- */
  .switch-bar{
    position:sticky; top:0; z-index:5;
    background:var(--paper); border-bottom:1px solid var(--line);
    padding:14px 56px; display:flex; align-items:center; gap:16px; flex-wrap:wrap;
  }
  .switch-bar span.lbl{font-size:.88rem; color:var(--ink-soft); white-space:nowrap;}
  .switch{display:inline-flex; border:1px solid var(--line); border-radius:20px; overflow:hidden; background:#fff;}
  .switch button{
    border:none; background:transparent; padding:8px 18px; font:inherit; font-size:.88rem;
    color:var(--ink-soft); cursor:pointer; font-weight:600;
  }
  .switch button.on{background:var(--navy); color:#fff;}

  /* ---------- sections ---------- */
  section{padding:52px 56px; border-bottom:1px solid var(--line); scroll-margin-top:20px;}
  section:last-of-type{border-bottom:none;}
  section h2{font-size:1.65rem; font-weight:500;}
  .kicker{
    font-family:'IBM Plex Mono',monospace; font-size:.72rem; letter-spacing:.02em;
    color:var(--blueprint); margin-bottom:8px; display:block;
  }
  .lede{color:var(--ink-soft); font-size:1.02rem; margin-bottom:20px;}

  .badge{
    display:inline-flex; align-items:center; gap:5px; font-size:.72rem; font-weight:600;
    padding:3px 9px; border-radius:20px; margin-left:8px; vertical-align:2px;
  }
  .badge-web{background:var(--blueprint-light); color:var(--navy-2);}
  .badge-tg{background:#EAF2E4; color:#3E6B2C;}
  .badge-both{background:#F3E9D2; color:var(--gold);}

  .plat{display:none;}
  .plat.show{display:block;}

  .card{
    background:var(--card); border:1px solid var(--line); border-radius:var(--radius);
    padding:20px 22px; margin-bottom:14px;
  }
  .card h4{margin:0 0 6px; font-family:'Inter',sans-serif; font-size:.98rem; font-weight:700; color:var(--navy);}
  .card p{margin:0; font-size:.93rem; color:var(--ink-soft); max-width:none;}

  .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:14px; margin-top:18px;}

  .steps{counter-reset:step; list-style:none; padding:0; margin:20px 0;}
  .steps > li{
    counter-increment:step; position:relative; padding:2px 0 20px 42px; margin:0;
    border-left:1px solid var(--line); margin-left:14px;
  }
  .steps > li:last-child{border-left-color:transparent; padding-bottom:0;}
  .steps > li::before{
    content:counter(step); position:absolute; left:-15px; top:0;
    width:29px; height:29px; border-radius:50%;
    background:var(--navy); color:#fff; font-family:'IBM Plex Mono',monospace; font-size:.8rem;
    display:flex; align-items:center; justify-content:center;
  }
  .steps h4{margin:0 0 4px; font-size:1rem; color:var(--navy);}
  .steps p{margin:0; color:var(--ink-soft); font-size:.93rem;}

  /* ---------- requirements block ---------- */
  .reqs{
    display:flex; align-items:center; gap:10px; flex-wrap:wrap;
    background:var(--blueprint-light); border:1px solid var(--line);
    border-radius:var(--radius); padding:12px 16px; margin-bottom:26px;
  }
  .reqs .reqs-label{
    font-family:'IBM Plex Mono',monospace; font-size:.7rem; color:var(--navy-2);
    font-weight:600; margin-right:2px;
  }
  .req-chip{
    display:inline-flex; align-items:center; gap:5px;
    background:#fff; border:1px solid var(--blueprint); color:var(--navy-2);
    text-decoration:none; font-size:.83rem; font-weight:600;
    padding:5px 11px; border-radius:16px;
  }
  .req-chip::after{content:'→'; color:var(--blueprint); font-weight:400;}
  .req-chip:hover{background:var(--navy); color:#fff; border-color:var(--navy);}
  .req-chip:hover::after{color:#fff;}
  .reqs .req-none{font-size:.85rem; color:var(--navy-2); font-style:italic;}

  table.matrix{width:100%; border-collapse:collapse; margin-top:16px; font-size:.9rem;}
  table.matrix th, table.matrix td{
    text-align:left; padding:10px 14px; border-bottom:1px solid var(--line);
  }
  table.matrix th{color:var(--navy); font-family:'IBM Plex Mono',monospace; font-size:.72rem; letter-spacing:.02em; text-transform:none;}
  table.matrix td.yes{color:#3E6B2C; font-weight:700;}
  table.matrix td.no{color:#B4491C;}

  .note{
    border-left:3px solid var(--gold); background:#FBF6EA; padding:12px 16px;
    font-size:.9rem; color:#7A5A17; margin:18px 0; max-width:64ch; border-radius:0 3px 3px 0;
  }

  details{
    background:#fff; border:1px solid var(--line); border-radius:var(--radius);
    padding:14px 18px; margin-bottom:10px;
  }
  details summary{cursor:pointer; font-weight:600; color:var(--navy); font-size:.96rem;}
  details p{margin:10px 0 0; color:var(--ink-soft); font-size:.92rem;}

  footer{padding:36px 56px; color:var(--ink-soft); font-size:.85rem;}

  .mobile-toggle{display:none;}

  @media (max-width:900px){
    .shell{display:block;}
    nav.toc{
      position:sticky; top:0; width:100%; height:auto; max-height:none;
      display:none; z-index:20;
    }
    nav.toc.open{display:block;}
    .mobile-toggle{
      display:flex; position:sticky; top:0; z-index:21; width:100%;
      background:var(--navy); color:#fff; border:none; padding:14px 20px;
      font:inherit; font-weight:600; align-items:center; justify-content:space-between;
    }
    .hero, .switch-bar, section, footer{padding-left:24px; padding-right:24px;}
    .switch-bar{position:static;}
  }
  /* ---------- integracion con el header fijo del sitio (64px) ---------- */
  body{padding-top:64px;}
  .shell{min-height:calc(100vh - 64px);}
  nav.toc{top:64px; height:calc(100vh - 64px);}
  .switch-bar{top:64px;}
  html{scroll-padding-top:130px;}
  .footer a{color:inherit;}
  .footer li{margin-bottom:0;}
  @media (max-width:900px){
    .mobile-toggle, nav.toc{top:64px;}
  }
  @media (prefers-reduced-motion:reduce){ html{scroll-behavior:auto;} }
</style>

<div class="shell">
  <button class="mobile-toggle" id="navBtn">Índice del manual <span>☰</span></button>

  <nav class="toc" id="tocNav">
    <div class="brand">Statetty <small>MANUAL DE USUARIO</small></div>
    <p class="toc-hint">Busca por lo que quieres lograr. Cada sección indica qué necesitas tener listo
    antes de empezar.</p>

    <p class="group-label">Empezar aquí</p>
    <ol>
      <li class="item"><a href="#que-es">Qué es Statetty</a></li>
      <li class="item"><a href="#sin-cuenta">Explorar sin crear una cuenta</a></li>
      <li class="item"><a href="#crear-cuenta">Crear mi cuenta</a></li>
      <li class="item"><a href="#iniciar-sesion">Iniciar sesión y vincular Web + Telegram</a></li>
    </ol>

    <p class="group-label">Lo que quieres lograr</p>
    <ol>
      <li class="item"><a href="#buscar-inmuebles">Buscar inmuebles según mis filtros</a></li>
      <li class="item"><a href="#ver-resultados">Ver y comparar resultados en el mapa</a></li>
      <li class="item"><a href="#estimar-valor">Estimar el valor de un inmueble (ACM)</a></li>
      <li class="item"><a href="#generar-pdf">Generar un PDF para compartir</a></li>
      <li class="item"><a href="#publicar-inmuebles">Publicar mis propios inmuebles</a></li>
      <li class="item"><a href="#recibir-alertas">Recibir alertas por WhatsApp</a></li>
      <li class="item"><a href="#encontrar-compradores">Encontrar compradores para mis captaciones</a></li>
      <li class="item"><a href="#buscar-agentes">Buscar y contactar agentes</a></li>
    </ol>

    <p class="group-label">Mi cuenta</p>
    <ol>
      <li class="item"><a href="#actualizar-datos">Actualizar mis datos</a></li>
      <li class="item"><a href="#mas-tiempo">Adquirir más tiempo de uso</a></li>
    </ol>

    <p class="group-label">Ayuda</p>
    <ol>
      <li class="item"><a href="#asistentes">Hablar con el asistente</a></li>
      <li class="item"><a href="#soporte">Preguntas frecuentes</a></li>
    </ol>
  </nav>

  <main>
    <header class="hero">
      <div class="hero-inner">
        <span class="eyebrow">MANUAL DE USUARIO</span>
        <h1>Cómo lograr lo que buscas en Statetty</h1>
        <p>Este manual está organizado por objetivo: encuentra tu meta en el índice —buscar inmuebles,
        estimar un valor, encontrar compradores para tus captaciones— y ve directo a esa sección.
        Cada una te dice qué necesitas tener listo antes de empezar, con un enlace directo para
        conseguirlo.</p>
      </div>
    </header>

    <div class="switch-bar">
      <div class="finder">
        <input type="search" id="manualSearch" placeholder="¿Qué quieres lograr? Ej: vender, ACM, alertas…" autocomplete="off" aria-label="Buscar en el manual">
        <ul class="search-results" id="searchResults" hidden></ul>
      </div>
      <span class="lbl">Estoy usando:</span>
      <div class="switch" id="platSwitch">
        <button data-p="web" class="on">🌐 Sitio web</button>
        <button data-p="tg">🤖 Bot de Telegram</button>
        <button data-p="both">Ver ambos</button>
      </div>
    </div>

    <!-- ============ QUÉ ES ============ -->
    <section id="que-es">
      <span class="kicker">EMPEZAR AQUÍ</span>
      <h2>Qué es Statetty</h2>
      <p class="lede">Un mismo servicio, dos puertas de entrada. Puedes usar Statetty desde tu navegador o
      desde Telegram, y en ambos casos tienes acceso a la misma base de inmuebles, tus búsquedas guardadas
      y tus datos de cuenta.</p>
      <div class="grid">
        <div class="card">
          <h4>🌐 statetty.com</h4>
          <p>Ideal para explorar el mapa de resultados, comparar inmuebles, generar PDF de brochure y
          publicar tus propios inmuebles.</p>
        </div>
        <div class="card">
          <h4>🤖 Bot de Telegram</h4>
          <p>Ideal para configurar búsquedas rápidas, recibir alertas de WhatsApp y consultar agentes desde
          el celular, con comandos y botones.</p>
        </div>
      </div>
    </section>

    <!-- ============ SIN CUENTA ============ -->
    <section id="sin-cuenta">
      <span class="kicker">EMPEZAR AQUÍ</span>
      <h2>Explorar sin crear una cuenta <span class="badge badge-web">Web</span></h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span><span class="req-none">Ninguno — puedes empezar aquí mismo</span></div>
      <p class="lede">No necesitas una cuenta para hacer lo siguiente en el sitio web:</p>
      <div class="grid">
        <div class="card"><h4>Ver una ficha de inmueble</h4><p>Cada inmueble tiene una página pública en
        <a class="cmd" href="https://statetty.com/inmueble/:id" target="_blank" rel="noopener">statetty.com/inmueble/:id</a> con toda su información.</p></div>
        <div class="card"><h4>Enviar una consulta</h4><p>Completa nombre, correo, teléfono y tu mensaje;
        te redirige directo al WhatsApp del agente.</p></div>
        <div class="card"><h4>Ver inmuebles similares</h4><p>Hasta 4 sugerencias relacionadas con la ficha
        que estás viendo.</p></div>
        <div class="card"><h4>Abrir un mapa compartido</h4><p>Si alguien te envía un enlace de
        <a class="cmd" href="https://statetty.com/maps/find" target="_blank" rel="noopener">statetty.com/maps/find</a>, verás un aviso para iniciar sesión y ver los resultados completos.</p></div>
        <div class="card"><h4>Enlaces cortos y WhatsApp</h4><p>Los enlaces tipo <a class="cmd" href="https://statetty.com/i/:codigo" target="_blank" rel="noopener">statetty.com/i/:codigo</a> y
        <a class="cmd" href="https://statetty.com/wa/:id" target="_blank" rel="noopener">statetty.com/wa/:id</a> te redirigen sin pedirte nada.</p></div>
      </div>
    </section>

    <!-- ============ CREAR CUENTA ============ -->
    <section id="crear-cuenta">
      <span class="kicker">EMPEZAR AQUÍ</span>
      <h2>Crear mi cuenta</h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span><span class="req-none">Ninguno — puedes empezar aquí mismo</span></div>
      <p class="lede">El registro es distinto según por dónde entres, pero ambos alimentan la misma cuenta:
      si ya te registraste en un canal, el otro puede vincularse a ella.</p>

      <div class="plat plat-web show">
        <ol class="steps">
          <li><h4>Abre "Mis datos"</h4><p>Desde el menú de usuario en statetty.com, entra a
          <a class="cmd" href="https://statetty.com/registro" target="_blank" rel="noopener">statetty.com/registro</a>. Si ya tienes datos (por ejemplo, de Telegram), aparecen precargados.</p></li>
          <li><h4>Completa los campos obligatorios</h4><p>Correo, nombres, apellidos, WhatsApp en formato
          internacional, fecha de nacimiento, país (Bolivia o Perú) y ciudad (Santa Cruz o Lima).</p></li>
          <li><h4>Agrega datos opcionales</h4><p>Sexo, agencia, nivel de experiencia, nivel de tecnología,
          foto de perfil, intereses, expectativas y un código de referencia, si tienes uno.</p></li>
          <li><h4>Envía el registro</h4><p>Con el botón <strong>Enviar registro</strong>. Según tu caso, esto
          actualiza tu cuenta, crea un pre-registro o avisa al bot de Telegram para completar la
          vinculación.</p></li>
        </ol>
      </div>

      <div class="plat plat-tg">
        <p class="lede" style="margin-top:0">El bot no te deja usar ninguna función hasta completar este
        registro obligatorio, uno por uno:</p>
        <ol class="steps">
          <li><h4>Acepta los términos legales</h4><p>Es el primer mensaje que verás al escribirle al bot.</p></li>
          <li><h4>Escribe tu WhatsApp</h4><p>En formato internacional (ej. +591...). Si ya te habías
          pre-registrado en la web, esto vincula ambas cuentas automáticamente.</p></li>
          <li><h4>Escribe tu nombre y apellido</h4><p>Uno por mensaje, cuando el bot te lo pida.</p></li>
          <li><h4>Elige tu país</h4><p>Con los botones 🇧🇴 Bolivia o 🇵🇪 Perú.</p></li>
          <li><h4>Elige tu ciudad</h4><p>Santa Cruz o Lima, según el país elegido.</p></li>
          <li><h4>Verifica tu correo</h4><p>Escribe tu correo y luego el código que te llega; puedes pedir
          que te lo reenvíen si no llega.</p></li>
        </ol>
        <div class="note">Mientras no completes estos seis pasos, el bot solo te va a pedir el siguiente
        dato pendiente, sin mostrarte el menú principal.</div>
      </div>
    </section>

    <!-- ============ INICIAR SESIÓN ============ -->
    <section id="iniciar-sesion">
      <span class="kicker">EMPEZAR AQUÍ</span>
      <h2>Iniciar sesión y vincular mis cuentas <span class="badge badge-web">Web</span></h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span>
        <a class="req-chip" href="#crear-cuenta">Tener una cuenta creada</a>
      </div>
      <p class="lede">En la web, Statetty acepta dos formas de identificarte, y usa la que ya tengas
      disponible:</p>
      <div class="grid">
        <div class="card"><h4>Enlace mágico por correo</h4><p>Escribe tu correo en "Ingresar" y recibirás un
        enlace de un solo uso para entrar sin contraseña.</p></div>
        <div class="card"><h4>Sesión de Telegram</h4><p>Si ya usaste el bot, la web puede reconocerte
        automáticamente con la llave que te dio Telegram.</p></div>
      </div>
      <p>Si usas ambos canales, el sitio te preguntará <em>"¿Ya usaste Statetty desde Telegram?"</em> para
      vincular las dos cuentas en una sola, y así tus búsquedas y tus datos quedan sincronizados.</p>
      <p>Para cerrar sesión, usa la opción del menú de usuario; esto invalida tu llave de acceso anterior en
      ese dispositivo.</p>
    </section>

    <!-- ============ BUSCAR INMUEBLES ============ -->
    <section id="buscar-inmuebles">
      <span class="kicker">OBJETIVO</span>
      <h2>Buscar inmuebles según mis filtros</h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span>
        <a class="req-chip" href="#crear-cuenta">Tener una cuenta creada</a>
        <a class="req-chip" href="#iniciar-sesion">Sesión iniciada</a>
      </div>
      <p class="lede">Configura los filtros de tu búsqueda y luego lánzala; el sistema revisa periódicamente
      las fuentes y te trae los inmuebles que calzan.</p>

      <div class="plat plat-web show">
        <p>Abre <strong>Buscar inmuebles</strong> desde el menú de usuario. Los filtros están organizados en
        un acordeón de cinco grupos, y se guardan automáticamente mientras los editas:</p>
        <div class="grid">
          <div class="card"><h4>📍 Ubicación y radio</h4><p>Coordenadas del centro de tu búsqueda (o tu
          ubicación, si la dejas vacía) y el radio en kilómetros.</p></div>
          <div class="card"><h4>💲 Precio y antigüedad</h4><p>Precio mínimo y máximo en USD, y antigüedad
          máxima de la publicación en meses.</p></div>
          <div class="card"><h4>🏡 Características</h4><p>Solo activos o inactivos, dormitorios, baños,
          ambientes y año de construcción mínimos.</p></div>
          <div class="card"><h4>📐 Superficies</h4><p>Metros cuadrados mínimos, o mayores/menores a un
          valor, tanto de terreno como de construcción.</p></div>
          <div class="card"><h4>📝 Términos de texto</h4><p>Palabras que el inmueble debe incluir, y
          palabras que debe excluir, separadas por coma.</p></div>
        </div>
        <p>Cuando termines, pulsa <strong>🔎 Buscar</strong>. Verás una barra de progreso mientras se procesa
        y luego te lleva directo al mapa de resultados. El botón <strong>↺ Limpiar</strong> borra todo lo
        configurado (te pide confirmación).</p>
      </div>

      <div class="plat plat-tg">
        <p>Desde el menú <strong>Inmuebles</strong> puedes ajustar cada filtro escribiendo el valor cuando el
        bot te lo pide, o eligiendo un botón:</p>
        <div class="grid">
          <div class="card"><h4>Nombre y lista</h4><p>Dale un nombre a tu búsqueda y consulta el número de
          resultados que tiene guardados.</p></div>
          <div class="card"><h4>Distancia y antigüedad</h4><p>Radio del área de búsqueda y antigüedad
          máxima en meses.</p></div>
          <div class="card"><h4>Estado, tipo y negocio</h4><p>Activos, inactivos o todos; casa, departamento,
          terreno u otro; venta, alquiler o anticrético.</p></div>
          <div class="card"><h4>Monto y m²</h4><p>Monto mínimo y máximo, y un submenú <code>/m2</code> para
          fijar metros de terreno o construcción, mayor o menor a un valor.</p></div>
          <div class="card"><h4>Listas de palabras</h4><p>Una lista de inclusión y otra de exclusión para
          filtrar por texto.</p></div>
          <div class="card"><h4>Ubicación</h4><p>Comparte tu ubicación de Telegram, pega coordenadas o un
          enlace de Google Maps.</p></div>
        </div>
        <p>Para lanzar la búsqueda, usa el botón correspondiente o simplemente escríbele al bot algo como
        <em>"ponte a buscar"</em> o <em>"búscalo"</em>. La búsqueda corre en segundo plano y el bot te
        responde con el mapa, los enlaces y una hoja de cálculo con los resultados.</p>
        <p>El botón con el ícono de advertencia vacía el primer espacio de búsqueda si quieres empezar de
        cero.</p>
      </div>
    </section>

    <!-- ============ VER RESULTADOS ============ -->
    <section id="ver-resultados">
      <span class="kicker">OBJETIVO</span>
      <h2>Ver y comparar resultados en el mapa <span class="badge badge-web">Principalmente web</span></h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span>
        <a class="req-chip" href="#buscar-inmuebles">Haber lanzado una búsqueda</a>
      </div>
      <p class="lede">Los resultados se muestran en
      <a class="cmd" href="https://statetty.com/maps/find" target="_blank" rel="noopener">statetty.com/maps/find</a>. Desde el ícono del engranaje accedes a estas herramientas:</p>
      <div class="grid">
        <div class="card"><h4>📊 Estadísticas y búsqueda</h4><p>Un buscador de texto para filtrar lo visible
        en pantalla, y estadísticas en vivo: total, precio promedio, más barato y más caro.</p></div>
        <div class="card"><h4>✅ Selección</h4><p>Marca inmuebles uno por uno o en bloque: agregar,
        quitar, mantener solo estos, agregar todos u "otros" (todos menos los filtrados).</p></div>
        <div class="card"><h4>🏢 Fuentes de datos</h4><p>Activa o desactiva qué fuentes o agencias quieres
        ver en el mapa; se recuerda para tu próxima visita.</p></div>
        <div class="card"><h4>🗺️ Marcador y ficha rápida</h4><p>Desde el pin de cada inmueble puedes
        seleccionarlo, ver sus fotos en pantalla completa, abrir su página oficial o la de Statetty, copiar
        su ficha para WhatsApp o contactar directo al agente.</p></div>
      </div>
      <p class="plat plat-tg">Desde Telegram no editas los resultados directamente: el bot te entrega el
      enlace al mismo mapa de resultados y una hoja de cálculo, y desde ahí abres la vista web para
      filtrar, comparar o seleccionar inmuebles.</p>
    </section>

    <!-- ============ ESTIMAR VALOR / ACM ============ -->
    <section id="estimar-valor">
      <span class="kicker">OBJETIVO</span>
      <h2>Estimar el valor de un inmueble (ACM) <span class="badge badge-web">Solo web</span></h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span>
        <a class="req-chip" href="#iniciar-sesion">Sesión iniciada</a>
        <a class="req-chip" href="#ver-resultados">Estar en el mapa de resultados</a>
      </div>
      <p class="lede">El Análisis Comparativo de Mercado (ACM) estima cuánto vale un inmueble comparándolo
      contra los resultados que ya tienes en el mapa. Ábrelo desde el engranaje del mapa, en la sección
      <strong>ACM</strong>.</p>
      <div class="grid">
        <div class="card"><h4>Describe el inmueble</h4><p>Tipo a estimar —departamento, oficina, local,
        casa o terreno—, subtipo, m² de terreno y construcción, dormitorios y baños.</p></div>
        <div class="card"><h4>Ajusta la comparación</h4><p>Un modo de "vista rápida" que aplica un
        porcentaje de descuento, y un ajuste manual de porcentaje por tipo de inmueble (terreno,
        construcción, departamento).</p></div>
        <div class="card"><h4>Fija la ubicación</h4><p>Haz clic en el mapa para marcar las coordenadas del
        inmueble que estás evaluando.</p></div>
        <div class="card"><h4>Revisa el resultado</h4><p>Verás el valor estimado en USD y el tiempo
        aproximado en que ese tipo de inmueble se suele vender u ofertar en la zona.</p></div>
      </div>
      <p>Si quieres entender el cálculo, el botón <strong>ℹ️ ¿Cómo se calcula?</strong> te explica el
      método paso a paso. Y si el estimado te sirve, puedes incluirlo como un inmueble más dentro del PDF
      que generes, junto con una imagen de referencia.</p>
    </section>

    <!-- ============ GENERAR PDF ============ -->
    <section id="generar-pdf">
      <span class="kicker">OBJETIVO</span>
      <h2>Generar un PDF para compartir <span class="badge badge-web">Solo web</span></h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span>
        <a class="req-chip" href="#ver-resultados">Tener inmuebles seleccionados en el mapa</a>
      </div>
      <p class="lede">Con tus inmuebles seleccionados en el mapa de resultados, arma un brochure listo
      para enviar a un cliente.</p>
      <div class="grid">
        <div class="card"><h4>Elige las columnas</h4><p>Hasta 24 datos disponibles para mostrar (7 vienen
        activos por defecto): precio, m², dormitorios, ubicación y más.</p></div>
        <div class="card"><h4>📄 PDF pantalla</h4><p>Formato horizontal, pensado para verse en computadora
        o proyector.</p></div>
        <div class="card"><h4>📱 PDF móvil</h4><p>Formato vertical, pensado para compartir por WhatsApp
        desde el celular.</p></div>
        <div class="card"><h4>Datos del encabezado</h4><p>Título, agente, agencia y celular se
        autocompletan con tus propios datos de cuenta.</p></div>
      </div>
      <p>Si prefieres los datos en bruto en vez de un PDF, también puedes <strong>descargarlos</strong>
      como archivo de texto (TSV) o <strong>copiarlos</strong> directo al portapapeles.</p>
      <div class="note">El PDF horizontal muestra como máximo las 7 primeras columnas que marques de las 24
      disponibles, y el PDF vertical (para celular) muestra como máximo los 5 primeros inmuebles.</div>
      <p class="plat plat-tg">Desde Telegram, abre el enlace al mapa que te envía el bot y genera el PDF
      desde ahí; esta herramienta vive en la web.</p>
    </section>

    <!-- ============ PUBLICAR INMUEBLES ============ -->
    <section id="publicar-inmuebles">
      <span class="kicker">OBJETIVO</span>
      <h2>Publicar mis propios inmuebles <span class="badge badge-web">Solo web</span></h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span>
        <a class="req-chip" href="#crear-cuenta">Tener una cuenta creada</a>
        <a class="req-chip" href="#iniciar-sesion">Sesión iniciada</a>
      </div>
      <p class="lede">Publica tus captaciones en
      <a class="cmd" href="https://statetty.com/inmueble/registro" target="_blank" rel="noopener">statetty.com/inmueble/registro</a>. Tu formulario se guarda como borrador local durante 30 días
      mientras lo completas.</p>
      <div class="grid">
        <div class="card"><h4>Datos generales</h4><p>Título, precio, tipo, tipo de negocio, descripción y
        dirección.</p></div>
        <div class="card"><h4>Medidas</h4><p>Metros cuadrados de construcción y de terreno, dormitorios,
        baños, ambientes y estacionamientos.</p></div>
        <div class="card"><h4>Ubicación</h4><p>Botón "Encontrar coordenadas" que abre un mapa para fijar la
        posición exacta.</p></div>
        <div class="card"><h4>Fotos</h4><p>Sube imágenes JPEG, PNG o WebP de hasta 1 MB; se optimizan
        automáticamente.</p></div>
        <div class="card"><h4>Datos de contacto</h4><p>Agente, agencia, teléfono y foto del agente que
        aparecerán en la ficha publicada.</p></div>
        <div class="card"><h4>Campos y enlaces extra</h4><p>Puedes agregar más URLs o atributos libres, y
        quitarlos si te equivocas.</p></div>
      </div>
      <p>Desde el panel <strong>Mis inmuebles</strong> ves todos los que publicaste y los editas cuando
      quieras. Cuando tengas al menos uno publicado, ya puedes usar
      <a href="#encontrar-compradores">Encontrar compradores para mis captaciones</a>.</p>
    </section>

    <!-- ============ RECIBIR ALERTAS ============ -->
    <section id="recibir-alertas">
      <span class="kicker">OBJETIVO</span>
      <h2>Recibir alertas por WhatsApp <span class="badge badge-tg">Telegram</span></h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span>
        <a class="req-chip" href="#crear-cuenta">Registro completo en Telegram</a>
        <a class="req-chip" href="#buscar-inmuebles">Tener una búsqueda configurada</a>
      </div>
      <p class="lede">Statetty puede avisarte por WhatsApp apenas aparezca un inmueble que coincide con tu
      búsqueda. Todo se configura desde el menú <strong>WhatsApp</strong> del bot:</p>
      <div class="grid">
        <div class="card"><h4>Ver tus búsquedas guardadas</h4><p>Y también tu búsqueda activa en este
        momento.</p></div>
        <div class="card"><h4>Agregar un grupo</h4><p>El bot te envía su propio contacto para que lo sumes
        al grupo de WhatsApp donde quieres recibir alertas.</p></div>
        <div class="card"><h4>Listar tus grupos</h4><p>Todos los grupos de Statetty en los que ya
        participas.</p></div>
        <div class="card"><h4>Palabras de inclusión y exclusión</h4><p>Define qué debe o no debe mencionar
        un mensaje para avisarte.</p></div>
        <div class="card"><h4>Activar o desactivar</h4><p>Prende o apaga el aviso sin borrar tu
        configuración.</p></div>
      </div>
      <p>El botón de limpiar (⚠) borra el primer espacio de configuración si quieres empezar de cero.</p>
    </section>

    <!-- ============ ENCONTRAR COMPRADORES ============ -->
    <section id="encontrar-compradores">
      <span class="kicker">OBJETIVO</span>
      <h2>Encontrar compradores para mis captaciones</h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span>
        <a class="req-chip" href="#publicar-inmuebles">Tener al menos un inmueble publicado</a>
        <a class="req-chip" href="#crear-cuenta">WhatsApp vinculado a tu cuenta</a>
      </div>
      <p class="lede">Statetty revisa los mensajes de los grupos de WhatsApp vinculados buscando personas
      que estén pidiendo algo parecido a lo que tú ya publicaste, para que encuentres compradores o
      inquilinos sin salir de la plataforma.</p>

      <div class="plat plat-web show">
        <p>Dentro de <strong>Mis inmuebles</strong>, cada uno de tus inmuebles tiene su propia bandeja de
        mensajes de WhatsApp relacionados. Por cada mensaje puedes marcarlo como:</p>
        <div class="grid">
          <div class="card"><h4>Comunicado</h4><p>Ya le avisaste a esa persona sobre tu inmueble.</p></div>
          <div class="card"><h4>De interés</h4><p>Parece un comprador o inquilino real.</p></div>
          <div class="card"><h4>Quitar</h4><p>No aplica a tu inmueble.</p></div>
        </div>
        <p>También puedes revisar el <strong>historial completo</strong> de mensajes relacionados con ese
        inmueble, y generar su ficha lista para reenviar por WhatsApp con un solo botón.</p>
      </div>

      <div class="plat plat-tg">
        <p>Usa <strong>Buscar entre mensajes</strong> dentro del menú WhatsApp para encontrar hasta 25
        coincidencias entre los mensajes de tus grupos que mencionen algo parecido a lo que ofreces.</p>
      </div>
    </section>

    <!-- ============ BUSCAR AGENTES ============ -->
    <section id="buscar-agentes">
      <span class="kicker">OBJETIVO</span>
      <h2>Buscar y contactar agentes <span class="badge badge-tg">Principalmente Telegram</span></h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span>
        <a class="req-chip" href="#crear-cuenta">Tener una cuenta creada en Telegram</a>
      </div>
      <p class="lede">Escríbele al bot <code>/getagent</code> seguido del nombre o el ID del agente que
      buscas.</p>
      <p>Si hay una sola coincidencia, el bot te muestra su ficha completa: foto, datos y forma de
      contacto. Si hay varias, te da una lista de hasta 25 para que elijas.</p>
      <p>También puedes pedirle al bot el mapa de captaciones de un agente específico para ver todos los
      inmuebles que ha subido.</p>
    </section>

    <!-- ============ ACTUALIZAR DATOS ============ -->
    <section id="actualizar-datos">
      <span class="kicker">MI CUENTA</span>
      <h2>Actualizar mis datos</h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span>
        <a class="req-chip" href="#crear-cuenta">Tener una cuenta creada</a>
      </div>
      <p class="lede">Puedes actualizar tu información desde cualquiera de los dos canales; los cambios se
      reflejan en la misma cuenta.</p>

      <div class="plat plat-web show">
        <p>En <a class="cmd" href="https://statetty.com/registro" target="_blank" rel="noopener">statetty.com/registro</a> tus datos aparecen precargados. Edita lo que necesites y pulsa
        <strong>Enviar registro</strong> para guardar los cambios.</p>
      </div>

      <div class="plat plat-tg">
        <p>Desde <strong>Mis datos</strong> puedes cambiar, uno a la vez: nombre, apellido, WhatsApp,
        agencia, país, ciudad y correo (con nuevo código de verificación).</p>
        <p>Si actualizaste tu registro en la web, usa <code>/actualizarMisDatos</code> para traer esos
        cambios al bot; luego confírmalos con <code>/aceptarActualizacion</code> o descártalos con
        <code>/rechazarActualizacion</code>.</p>
      </div>
    </section>

    <!-- ============ MÁS TIEMPO ============ -->
    <section id="mas-tiempo">
      <span class="kicker">MI CUENTA</span>
      <h2>Adquirir más tiempo de uso <span class="badge badge-tg">Telegram</span></h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span>
        <a class="req-chip" href="#crear-cuenta">Tener una cuenta creada en Telegram</a>
      </div>
      <p class="lede">El bot ofrece planes de 2, 30, 90 o 180 días. Al elegir uno, te muestra el monto y un
      código QR de pago.</p>
      <p>También puedes pagar directo dentro de Telegram mediante su pasarela de pagos integrada
      (invoice), sin salir del chat.</p>
      <p>Si se te acabó el tiempo, escribe <code>/abonar</code> para ver un plan de pago; esto avisa al
      equipo con tu número de teléfono. Y si necesitas que el equipo identifique tu cuenta puntualmente, usa
      <code>/idaccnt</code> para enviarles tu ID.</p>
    </section>

    <!-- ============ ASISTENTES ============ -->
    <section id="asistentes">
      <span class="kicker">AYUDA</span>
      <h2>Hablar con el asistente</h2>
      <div class="reqs"><span class="reqs-label">REQUISITOS</span>
        <a class="req-chip" href="#crear-cuenta">Registro completo / sesión iniciada</a>
      </div>
      <p class="lede">Cada canal tiene su propio asistente, con objetivos distintos.</p>
      <div class="grid">
        <div class="card">
          <h4>🤖 Igor <span class="badge badge-tg">Telegram</span></h4>
          <p>Escríbele cualquier mensaje empezando con la palabra <strong>"igor"</strong> y te entiende en
          lenguaje natural: puede iniciar una búsqueda de inmuebles por ti, mostrarte tu lista de búsquedas
          guardadas, o avisarte si tu pregunta no tiene que ver con Statetty.</p>
        </div>
        <div class="card">
          <h4>🧑‍💼 Buddy <span class="badge badge-web">Web</span></h4>
          <p>Es el avatar flotante del sitio. Desde su menú puedes editar tu perfil y foto, ver un
          <strong>Top 10</strong>, chatear con el personaje, cambiar el fondo de pantalla, activar o silenciar
          la voz, y jugar su minijuego de arquería (guarda medidas, equipo y puntajes).</p>
        </div>
      </div>
    </section>

    <!-- ============ SOPORTE ============ -->
    <section id="soporte">
      <span class="kicker">AYUDA</span>
      <h2>Preguntas frecuentes</h2>

      <details>
        <summary>¿Necesito registrarme igual en la web y en Telegram?</summary>
        <p>No. Si ya te registraste en uno de los dos, el otro canal puede reconocerte y vincular tu cuenta
        automáticamente al detectar tu WhatsApp o tu correo. Ver <a href="#crear-cuenta">Crear mi cuenta</a>.</p>
      </details>
      <details>
        <summary>¿Por qué el bot solo me pide un dato a la vez y no me deja usar el menú?</summary>
        <p>Porque tu registro está incompleto. El bot exige aceptar los términos, WhatsApp, nombre,
        apellido, país, ciudad y correo verificado antes de mostrarte el menú principal.</p>
      </details>
      <details>
        <summary>¿Dónde veo el resultado de una búsqueda que lancé desde Telegram?</summary>
        <p>El bot te envía un enlace al mapa de resultados en statetty.com/maps/find, más una hoja de
        cálculo; desde la web puedes seleccionar inmuebles y generar el PDF. Ver
        <a href="#ver-resultados">Ver y comparar resultados en el mapa</a>.</p>
      </details>
      <details>
        <summary>¿Puedo publicar un inmueble desde Telegram?</summary>
        <p>Por ahora, publicar y editar tus propios inmuebles solo está disponible desde el sitio web, en
        <a href="#publicar-inmuebles">Publicar mis propios inmuebles</a>.</p>
      </details>
      <details>
        <summary>¿Cómo encuentro a alguien interesado en lo que ya publiqué?</summary>
        <p>Statetty cruza tus captaciones con los mensajes de WhatsApp de tus grupos. Ver
        <a href="#encontrar-compradores">Encontrar compradores para mis captaciones</a>.</p>
      </details>
      <details>
        <summary>¿Qué pasa si se me acaba el tiempo de uso?</summary>
        <p>Puedes adquirir más tiempo desde el bot de Telegram eligiendo un plan (2, 30, 90 o 180 días) y
        pagando con QR o con la pasarela integrada, o pedir un plan de pago con <code>/abonar</code>.</p>
      </details>

      <table class="matrix">
        <tr><th>Función</th><th>Web</th><th>Telegram</th></tr>
        <tr><td>Buscar inmuebles</td><td class="yes">Sí</td><td class="yes">Sí</td></tr>
        <tr><td>Mapa, selección y PDF</td><td class="yes">Sí</td><td class="no">Solo enlace al mapa</td></tr>
        <tr><td>Estimar valor (ACM)</td><td class="yes">Sí</td><td class="no">No</td></tr>
        <tr><td>Publicar inmuebles propios</td><td class="yes">Sí</td><td class="no">No</td></tr>
        <tr><td>Alertas de WhatsApp por búsqueda</td><td class="no">No</td><td class="yes">Sí</td></tr>
        <tr><td>Encontrar compradores para tus captaciones</td><td class="yes">Sí</td><td class="yes">Sí</td></tr>
        <tr><td>Buscar agentes</td><td class="no">Limitado</td><td class="yes">Sí</td></tr>
        <tr><td>Adquirir tiempo de uso</td><td class="no">No</td><td class="yes">Sí</td></tr>
        <tr><td>Asistente conversacional</td><td class="yes">Buddy</td><td class="yes">Igor</td></tr>
      </table>
    </section>

    <footer>
      Manual de usuario de Statetty · statetty.com
    </footer>
  </main>
</div>

<script>
  // Índice de búsqueda del manual
  var searchIndex = [
    {title:"Qué es Statetty", id:"que-es", kw:"introducción presentación empezar"},
    {title:"Explorar sin crear una cuenta", id:"sin-cuenta", kw:"anónimo visitante sin registro sin login"},
    {title:"Crear mi cuenta", id:"crear-cuenta", kw:"registro registrarme signup cuenta nueva"},
    {title:"Iniciar sesión y vincular Web + Telegram", id:"iniciar-sesion", kw:"login entrar sesión vincular correo magic link"},
    {title:"Buscar inmuebles según mis filtros", id:"buscar-inmuebles", kw:"comprar filtros buscar propiedades búsqueda"},
    {title:"Ver y comparar resultados en el mapa", id:"ver-resultados", kw:"mapa resultados comparar seleccionar fuentes"},
    {title:"Estimar el valor de un inmueble (ACM)", id:"estimar-valor", kw:"tasación avalúo precio valor mercado acm"},
    {title:"Generar un PDF para compartir", id:"generar-pdf", kw:"brochure pdf compartir exportar tsv descargar"},
    {title:"Publicar mis propios inmuebles", id:"publicar-inmuebles", kw:"vender publicar captación registrar inmueble subir fotos"},
    {title:"Recibir alertas por WhatsApp", id:"recibir-alertas", kw:"notificaciones avisos alertas grupos whatsapp"},
    {title:"Encontrar compradores para mis captaciones", id:"encontrar-compradores", kw:"leads clientes interesados compradores captaciones"},
    {title:"Buscar y contactar agentes", id:"buscar-agentes", kw:"agente broker corredor getagent"},
    {title:"Actualizar mis datos", id:"actualizar-datos", kw:"perfil datos editar cambiar información"},
    {title:"Adquirir más tiempo de uso", id:"mas-tiempo", kw:"pagar plan suscripción tiempo qr abonar"},
    {title:"Hablar con el asistente", id:"asistentes", kw:"igor buddy asistente chatbot ia"},
    {title:"Preguntas frecuentes", id:"soporte", kw:"faq ayuda dudas soporte"}
  ];
  var searchInput = document.getElementById('manualSearch');
  var searchList = document.getElementById('searchResults');
  var activeIdx = -1;

  function norm(s){
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function renderResults(items){
    searchList.innerHTML = '';
    activeIdx = -1;
    if(items.length === 0){
      var li = document.createElement('li');
      li.className = 'search-empty';
      li.textContent = 'Sin resultados. Prueba con otra palabra.';
      searchList.appendChild(li);
    } else {
      items.slice(0,8).forEach(function(item){
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + item.id;
        a.innerHTML = '<span>' + item.title + '</span>';
        a.addEventListener('click', function(){ closeResults(); searchInput.value = ''; });
        li.appendChild(a);
        searchList.appendChild(li);
      });
    }
    searchList.hidden = false;
  }
  function closeResults(){ searchList.hidden = true; activeIdx = -1; }
  function runSearch(){
    var q = norm(searchInput.value.trim());
    if(q === ''){ closeResults(); return; }
    var matches = searchIndex.filter(function(item){
      return norm(item.title).indexOf(q) !== -1 || norm(item.kw).indexOf(q) !== -1;
    });
    renderResults(matches);
  }
  searchInput.addEventListener('input', runSearch);
  searchInput.addEventListener('focus', function(){ if(searchInput.value.trim() !== '') runSearch(); });
  searchInput.addEventListener('keydown', function(e){
    var opts = searchList.querySelectorAll('a');
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      if(opts.length){ activeIdx = (activeIdx + 1) % opts.length; }
    } else if(e.key === 'ArrowUp'){
      e.preventDefault();
      if(opts.length){ activeIdx = (activeIdx - 1 + opts.length) % opts.length; }
    } else if(e.key === 'Enter'){
      e.preventDefault();
      var target = opts[activeIdx >= 0 ? activeIdx : 0];
      if(target){ target.click(); }
      return;
    } else if(e.key === 'Escape'){
      closeResults(); searchInput.blur(); return;
    } else { return; }
    opts.forEach(function(o,i){ o.classList.toggle('is-active', i === activeIdx); });
  });
  document.addEventListener('click', function(e){
    if(!e.target.closest('.finder')) closeResults();
  });

  // Menú móvil
  var navBtn = document.getElementById('navBtn');
  var tocNav = document.getElementById('tocNav');
  if(navBtn){
    navBtn.addEventListener('click', function(){ tocNav.classList.toggle('open'); });
    tocNav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ tocNav.classList.remove('open'); });
    });
  }

  // Selector de plataforma
  var switchBar = document.getElementById('platSwitch');
  switchBar.addEventListener('click', function(e){
    var btn = e.target.closest('button');
    if(!btn) return;
    switchBar.querySelectorAll('button').forEach(function(b){ b.classList.remove('on'); });
    btn.classList.add('on');
    var p = btn.dataset.p;
    document.querySelectorAll('.plat').forEach(function(el){
      var show = p === 'both' || el.classList.contains('plat-' + p);
      el.classList.toggle('show', show);
    });
  });

  // Resaltar sección activa en el índice
  var links = Array.prototype.slice.call(document.querySelectorAll('nav.toc a'));
  var sections = links.map(function(l){ return document.querySelector(l.getAttribute('href')); });
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        var id = '#' + entry.target.id;
        links.forEach(function(l){ l.classList.toggle('active', l.getAttribute('href') === id); });
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  sections.forEach(function(s){ if(s) obs.observe(s); });
</script>
