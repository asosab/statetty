# AGENTS.md — Statetty.com

## Workflow: PLAN.md first

Before editing any feature or content, read `PLAN.md` to understand current
state and planned work. After making changes, update `PLAN.md` to reflect
what was done, what changed, and any new gaps or next steps discovered.
Also add a line to `CHANGELOG.md` with date, category, and description.

## ⚠️ Conflictos de archivos: revisar existentes antes de crear

Antes de crear un archivo nuevo en una ruta, revisar SIEMPRE si ya existe
un archivo que pueda generar al mismo destino en `_site/`.

**Caso conocido:** Al crear `registro/index.html`, el viejo `registro.html`
(en la raíz) generaba al mismo destino `_site/registro/index.html` por cómo
Jekyll trata páginas root con nombre coincidente. La solución fue eliminar
el archivo viejo.

**Regla:** Antes de crear `foo/index.html`, verificar que no exista `foo.html`.
Igual con `foo/bar/index.html` vs `foo/bar.html`. Si existe, eliminarlo o
redirigirlo antes del build.