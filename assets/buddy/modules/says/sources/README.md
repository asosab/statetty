# Fuentes de Buddy Says

Las fuentes de `/says` son módulos independientes. Buddy las carga según
`../config.js`.

## Formatos admitidos

Una fuente puede registrar directamente un array:

```js
window.BuddyInformSources.mi_fuente = [
  'Mensaje 1',
  'Mensaje 2'
];
```

También puede registrar un proveedor para datos síncronos o asíncronos:

```js
window.BuddyInformSources.mi_fuente = {
  obtenerMensajes: function () {
    return ['Mensaje 1', 'Mensaje 2'];
  }
};
```

`obtenerMensajes()` también puede devolver una `Promise`.

## Fuentes actuales

- `consejos.js`: listado directo de consejos.
- `agenda.js`: consulta la agenda pública de Google Calendar.

## Configuración

La activación y el comportamiento de cada fuente se define en:

```text
modules/says/config.js
```

Ejemplo:

```js
{
  id: 'consejos',
  enabled: true,
  selection: 'shuffle',
  recurrence: 2,
  frequency: { min: 5, max: 12 }
}
```

Para no cargar una fuente:

```js
enabled: false
```

No hay ninguna dependencia con un archivo de agenda externo, Jekyll ni con los
módulos de habilidades.
