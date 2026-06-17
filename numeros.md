# Implementación — Sección de Números (Statetty / index.html)

Tokens del sistema: `theme-1.css`. Todo lo de abajo usa variables y clases ya existentes.

---

## Ubicación en la página

```
.Inicio  (--blue hero)
trust strip
► #numeros ◄        ← aquí, fondo var(--blue) igual que .funciones-section
.problema-section   (fondo #f5f5f5)
.funciones-section  (fondo var(--blue))
...
```

Usar `var(--blue)` como fondo evita que quede emparedado entre dos secciones grises
y le da el mismo peso visual que funciones y beneficios, que son las secciones "activas"
de la página. El contraste blanco sobre azul hace que los números sean los protagonistas.

---

## HTML — pegar entre el trust strip y .problema-section

```html
<section id="numeros" class="numeros-section section" aria-label="Statetty en números">
  <div class="container">
    <p class="numeros-eyebrow">Statetty en números</p>
    <div class="numeros-grid">

      <div class="numero-item">
        <span class="numero-valor" data-target="18000" data-prefix="+" data-suffix="">+18.000</span>
        <span class="numero-label">Inmuebles indexados</span>
      </div>

      <div class="numero-item">
        <span class="numero-valor" data-target="100" data-prefix="+" data-suffix="">+100</span>
        <span class="numero-label">Grupos de WhatsApp activos</span>
      </div>

      <div class="numero-item">
        <span class="numero-valor" data-target="280" data-prefix="+" data-suffix="">+280</span>
        <span class="numero-label">Agentes usando Statetty</span>
      </div>

      <div class="numero-item">
        <span class="numero-valor" data-target="66" data-prefix="~" data-suffix=" hs">~66 hs</span>
        <span class="numero-label">Ahorradas por agente al mes</span>
      </div>

    </div>
  </div>
</section>
```

---

## CSS — agregar al final de theme-1.css

```css
/* ============================================================
   NÚMEROS
   ============================================================ */
.numeros-section { background: var(--blue); }

.numeros-eyebrow {
  font-family: var(--font-head);
  font-size: .78rem;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--yellow);
  text-align: center;
  margin-bottom: 40px;
}

.numeros-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  max-width: 960px;
  margin: 0 auto;
}

.numero-item {
  padding: 8px 32px;
  text-align: center;
  border-right: 1px solid rgba(255,255,255,.15);
}
.numero-item:last-child { border-right: none; }

.numero-valor {
  display: block;
  font-family: var(--font-head);
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: -.02em;
  line-height: 1;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.numero-label {
  display: block;
  margin-top: 10px;
  font-size: .8rem;
  color: rgba(255,255,255,.55);
  line-height: 1.4;
  max-width: 140px;
  margin-left: auto;
  margin-right: auto;
}

/* Acento amarillo en el último número (estimación) */
.numero-item:last-child .numero-valor { color: var(--yellow); }

@media (max-width: 640px) {
  .numeros-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 32px 0;
  }
  .numero-item {
    padding: 8px 16px;
    border-right: none;
  }
  .numero-item:nth-child(odd) { border-right: 1px solid rgba(255,255,255,.15); }
}
```

---

## JS — count-up (pegar antes de `</body>`)

Se activa una sola vez al entrar en viewport. Sin loop, sin repetición.

```javascript
(function () {
  var section = document.getElementById('numeros');
  if (!section) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      entry.target.querySelectorAll('.numero-valor[data-target]').forEach(function (el) {
        var target   = parseInt(el.dataset.target, 10);
        var prefix   = el.dataset.prefix  || '';
        var suffix   = el.dataset.suffix  || '';
        var duration = 1400;
        var start    = performance.now();
        var fmt      = function (n) { return prefix + n.toLocaleString('es-BO') + suffix; };
        var tick     = function (now) {
          var elapsed  = now - start;
          var progress = Math.min(elapsed / duration, 1);
          var eased    = 1 - Math.pow(1 - progress, 3);
          el.textContent = fmt(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    });
  }, { threshold: 0.3 });
  observer.observe(section);
})();
```

---

## Decisiones de diseño

**Fondo `var(--blue)`.** Igual que `.funciones-section` y `.beneficios-section`.
La sección tiene el mismo peso que las secciones de producto, no parece un pie de página.

**Eyebrow en `var(--yellow)`.** Igual que `.funciones-label`. Consistente con el patrón
de labels sobre fondo azul del resto del sistema.

**Labels en `rgba(255,255,255,.55)`.** Los ojos leen el número primero, el contexto después.
El mismo tratamiento que `.funcion-card p` y `.feature-list li small`.

**Último número en `var(--yellow)`.** Las ~66 hs son una estimación derivada de testimonios,
no un conteo de base de datos. El color diferente señala eso sin asteriscos ni notas al pie.
También funciona como acento visual que rompe la monotonía de cuatro blancos iguales.

**Sin título H2.** El eyebrow alcanza. Un H2 compite con los números.

**Sin íconos.** Los números son suficientemente grandes. Agregar íconos fragmenta la atención.

---

## Actualización de valores

Los tres primeros son conteos de BD, deberían actualizarse dinámicamente o
manualmente cada primer lunes del mes.

El cuarto (~66 hs) es fijo. Fuente: testimonio de Gabriel Pérez (3 hs/día × 22 días).
No requiere actualización hasta que haya más testimonios que lo refinen.
