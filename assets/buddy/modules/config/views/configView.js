/**
 * Buddy Config — renderizador de formularios desde un schema.json.
 *
 * Interpreta el "modelo de datos JSON" de cada módulo y genera un formulario
 * HTML editable (no se llena JSON a mano). Tipos soportados:
 *
 *   string  -> input text
 *   number  -> input number
 *   boolean -> checkbox
 *   select  -> select (options: array de strings u objetos {value,label})
 *   object  -> fieldset anidado (fields)
 *   array   -> lista repetible (items: object/scalar) con botón agregar/quitar
 *   secret  -> input password (se llena; no se muestra el valor guardado)
 *   json    -> textarea (para bloques libres)
 *
 * API pública:
 *   BuddyConfigView.renderForm(schema, values, opts) -> HTMLElement
 *   BuddyConfigView.collectFields(rootEl, fields, out) -> void (escribe en out)
 *   BuddyConfigView.valueForType(type, value) -> valor normalizado
 */
window.BuddyConfigView = window.BuddyConfigView || {};

(function (window, document) {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function labelFor(field) {
    if (field.label) return field.label;
    var pretty = String(field.key || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ');
    return pretty.charAt(0).toUpperCase() + pretty.slice(1);
  }

  function optionLabel(item) {
    if (item && typeof item === 'object' && ('label' in item)) {
      return String(item.label);
    }
    return String(item);
  }

  function optionValue(item) {
    if (item && typeof item === 'object' && ('value' in item)) {
      return String(item.value);
    }
    return String(item);
  }

  function defaultFor(field) {
    return field.default !== undefined ? field.default : defaultValueByType(field.type);
  }

  function defaultValueByType(type) {
    switch (type) {
      case 'boolean': return false;
      case 'number': return 0;
      case 'object': return {};
      case 'array': return [];
      default: return '';
    }
  }

  // Normaliza a string para los inputs; booleans/numbers se parsean al recoger.
  function displayValue(field, value) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') {
      try { return JSON.stringify(value, null, 2); } catch (_) { return ''; }
    }
    return String(value);
  }

  function collectScalar(field, el, out) {
    var name = field.key;
    var v = '';
    switch (field.type) {
      case 'boolean':
        v = !!el.querySelector('input[type="checkbox"]').checked;
        break;
      case 'number': {
        var raw = el.querySelector('input').value;
        v = raw === '' ? null : Number(raw);
        break;
      }
      case 'select': {
        var sel = el.querySelector('select');
        v = sel.multiple
          ? Array.prototype.slice.call(sel.selectedOptions).map(function (o) { return o.value; })
          : sel.value;
        break;
      }
      case 'secret':
        v = el.querySelector('input').value; // si está vacío, no se envía p.ej.
        break;
      default:
        v = el.querySelector('input, textarea').value;
        break;
    }
    out[name] = v;
  }

  function collectObject(field, el, out) {
    var subContainer = el.querySelector('[data-field-container]');
    var obj = {};
    collectFields(subContainer, field.fields || [], obj);
    out[field.key] = obj;
  }

  function collectArray(field, el, out) {
    var container = el.querySelector('[data-array-items]');
    var items = container ? container.querySelectorAll('[data-array-item]') : [];
    var list = [];
    items.forEach(function (itemEl) {
      if (field.items && field.items.type === 'object') {
        var obj = {};
        collectFields(itemEl, field.items.fields || [], obj);
        list.push(obj);
      } else {
        // Items escalares (string/number/boolean): se guardan como valor
        // simple, NO envueltos en {value: ...}. Antes se envolvían, lo que
        // en cada guardado iba anidando {value: {...}} y corrompía los
        // arrays de strings (p. ej. commands.on/off de hablar).
        var input = itemEl.querySelector('input, select, textarea');
        var raw = input ? input.value : '';
        if (field.items && field.items.type === 'number') {
          list.push(raw === '' ? null : Number(raw));
        } else if (field.items && field.items.type === 'boolean') {
          list.push(!!itemEl.querySelector('input[type="checkbox"]').checked);
        } else {
          list.push(raw);
        }
      }
    });
    out[field.key] = list;
  }

  function collectFields(root, fields, out) {
    if (!root) return;
    fields.forEach(function (field) {
      var holder = root.querySelector('[data-field-key="' + field.key + '"]');
      if (!holder) return;

      if (field.type === 'object') {
        collectObject(field, holder, out);
      } else if (field.type === 'array') {
        collectArray(field, holder, out);
      } else {
        collectScalar(field, holder, out);
      }
    });
  }

  function renderInput(field, value) {
    switch (field.type) {
      case 'boolean':
        return '<input type="checkbox" data-field-' + field.type + ' ' + (value ? 'checked' : '') + '>';
      case 'number':
        return '<input type="number" step="any" value="' + escapeHtml(displayValue(field, value)) + '">';
      case 'select': {
        var isMulti = field.multiple;
        var opts = field.options || [];
        var foundValue = value;
        var html = '<select' + (isMulti ? ' multiple' : '') + '>';
        opts.forEach(function (opt) {
          var v = optionValue(opt);
          var selAttr = String(value) === v ? ' selected' : '';
          html += '<option value="' + escapeHtml(v) + '"' + selAttr + '>' + escapeHtml(optionLabel(opt)) + '</option>';
        });
        // Si el valor actual no está en las opciones y no está vacío, lo añade
        // para no perderlo al volver a guardar.
        if (value && String(value) !== '' && !opts.some(function (o) { return optionValue(o) === String(value); })) {
          html += '<option value="' + escapeHtml(String(value)) + '" selected>' + escapeHtml(String(value)) + '</option>';
        }
        html += '</select>';
        return html;
      }
      case 'secret':
        return '<input type="password" placeholder="•••••• (se conserva si se deja vacío)" value="">';
      case 'json':
        return '<textarea rows="6" style="font-family:monospace">' + escapeHtml(displayValue(field, value)) + '</textarea>';
      default:
        return '<input type="text" value="' + escapeHtml(displayValue(field, value)) + '">';
    }
  }

  function renderField(field, value) {
    var hasDesc = field.description;
    var desc = hasDesc
      ? '<div style="font-size:.85em;color:#888;margin-top:2px">' + escapeHtml(field.description) + '</div>'
      : '';
    return '<div class="buddy-cfg-field" data-field-key="' + escapeHtml(field.key) + '"' +
      (field.required ? ' data-required="1"' : '') + '>' +
      '<label>' + escapeHtml(labelFor(field)) + '</label>' +
      renderInput(field, value) + desc +
      '</div>';
  }

  function renderObject(field, value) {
    var val = (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
    return '<fieldset class="buddy-cfg-group" data-field-key="' + escapeHtml(field.key) + '">' +
      '<legend>' + escapeHtml(labelFor(field)) + '</legend>' +
      '<div data-field-container>' +
      (field.fields || []).map(function (sub) { return renderNode(sub, val[sub.key]); }).join('') +
      '</div>' +
      '</fieldset>';
  }

  function renderArray(field, value) {
    var val = Array.isArray(value) ? value : [];
    var isObjectItems = field.items && field.items.type === 'object';
    var itemFields = isObjectItems ? (field.items.fields || []) : [];
    var scalarType = isObjectItems ? null : (field.items ? field.items.type : 'string');

    function renderItem(item, index) {
      var inner;
      if (isObjectItems) {
        inner = '<div style="display:grid;grid-template-columns:1fr auto;gap:6px;align-items:start">' +
          '<div>' + itemFields.map(function (sf) { return renderNode(sf, item[sf.key]); }).join('') + '</div>' +
          '<button type="button" class="buddy-cfg-remove" title="Quitar" data-remove>×</button>' +
          '</div>';
      } else {
        var input = scalarType === 'number'
          ? '<input type="number" step="any" value="' + escapeHtml(displayValue(null, item)) + '">'
          : '<input type="text" value="' + escapeHtml(displayValue(null, item)) + '">';
        inner = '<div style="display:flex;gap:6px;align-items:center">' + input +
          '<button type="button" class="buddy-cfg-remove" title="Quitar" data-remove>×</button></div>';
      }
      return '<div class="buddy-cfg-array-item" data-array-item="' + index + '">' + inner + '</div>';
    }

    // Codifica el schema del item para poder rendir "agregar" con la misma forma.
    var itemSchemaJson = escapeHtml(JSON.stringify(field.items || { type: 'string' }));
    return '<fieldset class="buddy-cfg-group" data-field-key="' + escapeHtml(field.key) + '">' +
      '<legend>' + escapeHtml(labelFor(field)) + '</legend>' +
      '<div data-array-items data-item-schema="' + itemSchemaJson + '" data-item-scalar="' + (isObjectItems ? '0' : '1') + '">' +
        val.map(renderItem).join('') +
      '</div>' +
      '<button type="button" class="buddy-cfg-add" data-add aria-label="Agregar ' + escapeHtml(labelFor(field)) + '">+ Agregar</button>' +
      '</fieldset>';
  }

  function renderEmptyItem(itemsSchema, scalar) {
    var isObjectItems = itemsSchema && itemsSchema.type === 'object';
    if (isObjectItems) {
      var fields = itemsSchema.fields || [];
      var inner = '<div style="display:grid;grid-template-columns:1fr auto;gap:6px;align-items:start">' +
        '<div>' + fields.map(function (sf) { return renderNode(sf, sf.default !== undefined ? sf.default : undefined); }).join('') + '</div>' +
        '<button type="button" class="buddy-cfg-remove" title="Quitar" data-remove>×</button>' +
        '</div>';
      return inner;
    }
    var scalarType = scalar ? (itemsSchema.type || 'string') : 'string';
    var input = scalarType === 'number'
      ? '<input type="number" step="any" value="">'
      : '<input type="text" value="">';
    return '<div style="display:flex;gap:6px;align-items:center">' + input +
      '<button type="button" class="buddy-cfg-remove" title="Quitar" data-remove>×</button></div>';
  }

  function renderNode(field, value) {
    var val = value === undefined || value === null ? defaultFor(field) : value;
    switch (field.type) {
      case 'object': return renderObject(field, val);
      case 'array': return renderArray(field, val);
      default: return renderField(field, val);
    }
  }

  function renderForm(schema, values, opts) {
    opts = opts || {};
    var fields = (schema && schema.fields) || [];
    var container = document.createElement('div');
    container.className = 'buddy-cfg-form';

    if (schema && schema.description) {
      var p = document.createElement('p');
      p.className = 'buddy-cfg-desc';
      p.textContent = schema.description;
      container.appendChild(p);
    }

    var inner = document.createElement('div');
    inner.innerHTML = fields.map(function (f) { return renderNode(f, (values || {})[f.key]); }).join('');
    container.appendChild(inner);

    container.addEventListener('click', function (event) {
      var addBtn = event.target.closest('[data-add]');
      var removeBtn = event.target.closest('[data-remove]');

      if (addBtn) {
        event.preventDefault();
        var items = addBtn.parentNode.querySelector('[data-array-items]');
        if (!items) return;
        var itemSchema = null;
        try { itemSchema = JSON.parse(items.getAttribute('data-item-schema') || '{}'); }
        catch (_) { itemSchema = { type: 'string' }; }
        var isScalar = items.getAttribute('data-item-scalar') === '1';

        var wrap = document.createElement('div');
        wrap.innerHTML = renderEmptyItem(itemSchema, isScalar);
        var newItem = wrap.firstChild;
        newItem.className = 'buddy-cfg-array-item';
        newItem.setAttribute('data-array-item', String(items.children.length));
        items.appendChild(newItem);
      }

      if (removeBtn) {
        event.preventDefault();
        var item = removeBtn.closest('[data-array-item]');
        if (item && item.parentNode && item.parentNode.children.length > 1) {
          item.parentNode.removeChild(item);
        }
      }
    });

    return container;
  }

  function collect(schema, rootEl) {
    var out = {};
    collectFields(rootEl, (schema && schema.fields) || [], out);
    return out;
  }

  function valueForType(type, value) {
    if (type === 'number') return value === '' || value === null ? 0 : Number(value);
    if (type === 'boolean') return !!value;
    return value;
  }

  // Guarda "secret": si el valor recogido está vacío, remueve la clave para
  // que el backend conserve lo guardado.
  function cleanSchemaForSave(schema, collected) {
    var out = {};
    var fields = (schema && schema.fields) || [];
    fields.forEach(function (f) {
      var v = collected[f.key];
      if (v === undefined) return;
      if (f.type === 'secret' && (v === '' || v == null)) return; // no enviar
      out[f.key] = v;
    });
    return out;
  }

  window.BuddyConfigView = {
    renderForm: renderForm,
    collect: collect,
    collectFields: collectFields,
    cleanSchemaForSave: cleanSchemaForSave,
    valueForType: valueForType,
    escapeHtml: escapeHtml
  };
})(window, document);
