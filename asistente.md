---
layout: default
title: "Asistente Statetty"
description: "Asistencia inmobiliaria especializada por WhatsApp. Búsqueda, verificación, ACM, informes y material multimedia para agentes inmobiliarios en Bolivia y Perú."
permalink: /asistente
---

<style>
  .asistente-page {
    max-width: 1040px;
    margin: 0 auto;
    padding: 150px 24px 70px;
  }

  .asistente-hero {
    text-align: center;
    max-width: 820px;
    margin: 0 auto 55px;
  }

  .asistente-kicker {
    display: inline-block;
    margin-bottom: 18px;
    padding: 7px 14px;
    border-radius: 999px;
    background: #e8f7fc;
    color: #074f66;
    font-family: 'Montserrat', sans-serif;
    font-size: .78rem;
    font-weight: 800;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .asistente-hero h1 {
    margin: 0 0 18px;
    color: #074f66;
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(2.2rem, 5vw, 4rem);
    font-weight: 800;
    line-height: 1.08;
  }

  .asistente-hero p {
    max-width: 720px;
    margin: 0 auto;
    color: #444;
    font-size: clamp(1.05rem, 2vw, 1.3rem);
    line-height: 1.65;
  }

  .asistente-vacantes {
    max-width: 760px;
    margin: 0 auto 65px;
    padding: 28px 32px;
    border: 2px solid #eebf3f;
    border-radius: 18px;
    background: #fff9e8;
    text-align: center;
    box-shadow: 0 8px 30px rgba(0, 0, 0, .06);
  }

  .asistente-vacantes .badge {
    display: inline-block;
    margin-bottom: 12px;
    padding: 8px 16px;
    border-radius: 999px;
    background: #eebf3f;
    color: #333;
    font-family: 'Montserrat', sans-serif;
    font-size: .9rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .04em;
  }

  .asistente-vacantes p {
    margin: 0;
    color: #444;
    font-size: 1.05rem;
    line-height: 1.6;
  }

  .asistente-vacantes a {
    display: inline-block;
    margin-top: 16px;
    color: #074f66;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .asistente-section {
    margin: 0 auto 65px;
  }

  .asistente-section h2 {
    margin: 0 0 14px;
    color: #074f66;
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(1.7rem, 3vw, 2.3rem);
    font-weight: 800;
    text-align: center;
  }

  .asistente-section > p {
    max-width: 760px;
    margin: 0 auto 30px;
    color: #444;
    font-size: 1.05rem;
    line-height: 1.7;
    text-align: center;
  }

  .asistente-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }

  .asistente-card {
    padding: 26px 24px;
    border: 1px solid #e8e8e8;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 5px 20px rgba(0, 0, 0, .04);
  }

  .asistente-card .icon {
    font-size: 2rem;
    margin-bottom: 12px;
  }

  .asistente-card h3 {
    margin: 0 0 9px;
    color: #074f66;
    font-family: 'Montserrat', sans-serif;
    font-size: 1.15rem;
    font-weight: 800;
  }

  .asistente-card p {
    margin: 0;
    color: #555;
    line-height: 1.6;
  }

  .asistente-flow {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 10px;
    margin-top: 30px;
  }

  .asistente-step {
    position: relative;
    padding: 20px 12px;
    border-radius: 14px;
    background: #f6f8f9;
    text-align: center;
  }

  .asistente-step strong {
    display: block;
    margin-bottom: 7px;
    color: #074f66;
    font-family: 'Montserrat', sans-serif;
    font-size: .92rem;
  }

  .asistente-step span {
    color: #555;
    font-size: .88rem;
    line-height: 1.45;
  }

  .asistente-example {
    max-width: 820px;
    margin: 30px auto 0;
    padding: 28px 30px;
    border-left: 5px solid #eebf3f;
    border-radius: 0 14px 14px 0;
    background: #fafafa;
  }

  .asistente-example p {
    margin: 0;
    color: #444;
    font-size: 1.05rem;
    line-height: 1.7;
  }

  .asistente-delivery {
    max-width: 820px;
    margin: 30px auto 0;
    padding: 30px;
    border-radius: 18px;
    background: #074f66;
    color: #fff;
  }

  .asistente-delivery h3 {
    margin: 0 0 18px;
    font-family: 'Montserrat', sans-serif;
    font-size: 1.35rem;
  }

  .asistente-delivery ul {
    margin: 0;
    padding-left: 1.3rem;
  }

  .asistente-delivery li {
    margin-bottom: 9px;
    line-height: 1.55;
  }

  .asistente-cta {
    max-width: 820px;
    margin: 0 auto;
    padding: 42px 30px;
    border-radius: 22px;
    background: #f6f8f9;
    text-align: center;
  }

  .asistente-cta h2 {
    margin-bottom: 12px;
  }

  .asistente-cta p {
    margin-bottom: 25px;
  }

  .asistente-button {
    display: inline-block;
    padding: 14px 24px;
    border-radius: 999px;
    background: #17baef;
    color: #fff !important;
    font-family: 'Montserrat', sans-serif;
    font-weight: 800;
    text-decoration: none !important;
    box-shadow: 0 7px 20px rgba(23, 186, 239, .25);
  }

  .asistente-button:hover {
    opacity: .9;
  }

  @media (max-width: 800px) {
    .asistente-page {
      padding: 130px 18px 50px;
    }

    .asistente-grid {
      grid-template-columns: 1fr 1fr;
    }

    .asistente-flow {
      grid-template-columns: 1fr 1fr 1fr;
    }
  }

  @media (max-width: 560px) {
    .asistente-page {
      padding-top: 120px;
    }

    .asistente-vacantes {
      padding: 24px 20px;
    }

    .asistente-grid,
    .asistente-flow {
      grid-template-columns: 1fr;
    }

    .asistente-card {
      padding: 22px 20px;
    }
  }
</style>

<div class="asistente-page">

  <section class="asistente-hero">
    <span class="asistente-kicker">Nuevo servicio de Statetty</span>
    <h1>Tu asistente inmobiliario por WhatsApp</h1>
    <p>
      Contanos qué necesitás. Una persona de nuestro equipo utiliza Statetty
      para buscar, verificar y preparar la información inmobiliaria que necesitás
      para trabajar.
    </p>
  </section>

  <section class="asistente-vacantes" aria-label="Disponibilidad del servicio">
    <span class="badge">No hay vacantes</span>
    <p>
      Todos nuestros humanos están ocupados este mes.
      Si deseas entrar en la lista de espera, hacé click aquí:
    </p>
    <a href="https://wa.me/59157396954?text=Deseo%20trabajar%20con%20un%20asistente%20de%20Statetty%2C%20por%20favor%20agr%C3%A9game%20a%20la%20lista%20de%20espera" target="_blank" rel="noopener noreferrer">
      Quiero entrar en la lista de espera
    </a>
  </section>

  <section class="asistente-section">
    <h2>¿Qué puede hacer tu asistente?</h2>
    <p>
      El servicio combina la información de Statetty con trabajo humano.
      Recibimos tu requerimiento, hacemos la investigación y te entregamos
      información lista para tomar decisiones y trabajar con tus clientes.
    </p>

    <div class="asistente-grid">
      <article class="asistente-card">
        <div class="icon">🔎</div>
        <h3>Búsqueda de inmuebles</h3>
        <p>
          Buscamos propiedades según tus criterios en Bolivia y Perú:
          ubicación, precio, tipo, dormitorios, superficie, características
          y condiciones específicas.
        </p>
      </article>

      <article class="asistente-card">
        <div class="icon">📞</div>
        <h3>Verificación con el captador</h3>
        <p>
          Contactamos a cada captador para confirmar la disponibilidad,
          características y condiciones actuales del inmueble.
        </p>
      </article>

      <article class="asistente-card">
        <div class="icon">🎯</div>
        <h3>Requerimientos especiales</h3>
        <p>
          Comunicamos tus condiciones al captador y registramos las respuestas
          que determinan si el inmueble cumple con tu objetivo.
        </p>
      </article>

      <article class="asistente-card">
        <div class="icon">📊</div>
        <h3>Informes ACM</h3>
        <p>
          Preparamos Análisis Comparativos de Mercado con la información
          disponible y los criterios que definas.
        </p>
      </article>

      <article class="asistente-card">
        <div class="icon">📋</div>
        <h3>Informes de inmuebles</h3>
        <p>
          Organizamos la información relevante de cada propiedad y elaboramos
          un informe completo para tu análisis o presentación.
        </p>
      </article>

      <article class="asistente-card">
        <div class="icon">📁</div>
        <h3>Fotos y videos</h3>
        <p>
          Organizamos el material multimedia disponible y creamos una carpeta
          individual en Google Drive para cada inmueble ofrecido.
        </p>
      </article>
    </div>
  </section>

  <section class="asistente-section">
    <h2>Especialmente útil para campañas inmobiliarias</h2>
    <p>
      Definí el perfil de los inmuebles que querés promocionar y nuestro
      asistente encuentra las propiedades que mejor responden a esas
      características.
    </p>

    <div class="asistente-example">
      <p>
        <strong>Ejemplo:</strong>
        “Necesito departamentos de 2 dormitorios hasta USD 150.000 en
        Equipetrol para una campaña. Quiero propiedades disponibles,
        con buenas fotografías y autorización del captador para promocionarlas”.
      </p>
    </div>
  </section>

  <section class="asistente-section">
    <h2>Del requerimiento al informe</h2>

    <div class="asistente-flow">
      <div class="asistente-step">
        <strong>1. Pedís</strong>
        <span>Explicás lo que necesitás por WhatsApp.</span>
      </div>
      <div class="asistente-step">
        <strong>2. Buscamos</strong>
        <span>Localizamos inmuebles en Statetty.</span>
      </div>
      <div class="asistente-step">
        <strong>3. Verificamos</strong>
        <span>Contactamos a los captadores.</span>
      </div>
      <div class="asistente-step">
        <strong>4. Filtramos</strong>
        <span>Seleccionamos los inmuebles adecuados.</span>
      </div>
      <div class="asistente-step">
        <strong>5. Documentamos</strong>
        <span>Preparamos informes y material.</span>
      </div>
      <div class="asistente-step">
        <strong>6. Entregamos</strong>
        <span>Recibís todo organizado.</span>
      </div>
    </div>
  </section>

  <section class="asistente-section">
    <div class="asistente-delivery">
      <h3>¿Qué recibís por cada inmueble?</h3>
      <ul>
        <li>Información del inmueble y sus características.</li>
        <li>Estado y disponibilidad confirmados con el captador.</li>
        <li>Respuestas a los requerimientos especiales.</li>
        <li>Informe completo del inmueble.</li>
        <li>Fotografías disponibles.</li>
        <li>Videos disponibles.</li>
        <li>Carpeta individual en Google Drive con el material multimedia.</li>
      </ul>
    </div>
  </section>

  <section class="asistente-cta">
    <h2>Contanos qué necesitás</h2>
    <p>
      Nuestro equipo utiliza la tecnología y los datos de Statetty para
      convertir tu requerimiento en información inmobiliaria útil y verificada.
    </p>
    <a class="asistente-button" href="https://wa.me/59157396954?text=Deseo%20trabajar%20con%20un%20asistente%20de%20Statetty%2C%20por%20favor%20agr%C3%A9game%20a%20la%20lista%20de%20espera" target="_blank" rel="noopener noreferrer">
      Entrar en la lista de espera por WhatsApp
    </a>
  </section>

</div>
