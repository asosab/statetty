/** Buddy User — vista administrativa de usuario. Solo presentación. */
window.BuddyUserViews = window.BuddyUserViews || {};
(function (window, document) {
  'use strict';
  function ensureStyles() {
    if (document.getElementById('buddy-user-admin-view-styles')) return;
    var style=document.createElement('style'); style.id='buddy-user-admin-view-styles'; style.textContent='.buddy-user-view--admin{font:inherit;display:grid;gap:14px;max-width:760px}.buddy-user-view--admin form{display:grid;gap:12px}.buddy-user-view--admin label{display:grid;gap:6px}.buddy-user-view--admin input,.buddy-user-view--admin button{font:inherit;padding:9px;border:1px solid #ccc;border-radius:8px}'; document.head.appendChild(style);
  }
  window.BuddyUserViews.admin = function (context) {
    ensureStyles();
    var target=context.target,user=context.user||{},api=context.api; target.innerHTML='';
    var root=document.createElement('section');root.className='buddy-user-view buddy-user-view--admin';
    var h=document.createElement('h2');h.textContent='Datos de usuario';root.appendChild(h);
    var form=document.createElement('form');
    [['firstName','Nombre'],['lastName','Apellido'],['name','Nombre para mostrar'],['email','Correo electrónico'],['phone','Número celular que usa en WhatsApp'],['locale','Idioma']].forEach(function(item){var label=document.createElement('label');label.textContent=item[1];var input=document.createElement('input');input.name=item[0];input.value=user[item[0]]||'';label.appendChild(input);form.appendChild(label);});
    var status=document.createElement('div');var save=document.createElement('button');save.type='submit';save.textContent='Guardar';form.appendChild(status);form.appendChild(save);
    form.addEventListener('submit',function(e){e.preventDefault();save.disabled=true;var data={};Array.prototype.forEach.call(form.elements,function(el){if(el.name)data[el.name]=el.value;});api.updateProfile(data).then(function(){status.textContent='Guardado.';}).catch(function(err){status.textContent=err.message;}).finally(function(){save.disabled=false;});});
    root.appendChild(form);target.appendChild(root);return root;
  };
})(window, document);
