/** ArcherySchool — vista administrativa. Usuarios registrados, atributos, equipos y asignaciones. */
window.BuddyArcherySchoolViews = window.BuddyArcherySchoolViews || {};
(function (window, document) {
  'use strict';

  function styles(){
    if(document.getElementById('buddy-archery-school-admin-view-styles')) return;
    var s=document.createElement('style'); s.id='buddy-archery-school-admin-view-styles';
    s.textContent=[
      '.buddy-as-admin{font:inherit;display:grid;gap:18px;max-width:1150px}',
      '.buddy-as-admin section{border:1px solid #ddd;border-radius:12px;padding:18px}',
      '.buddy-as-admin form{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}',
      '.buddy-as-admin label{display:grid;gap:6px}',
      '.buddy-as-admin input,.buddy-as-admin select,.buddy-as-admin textarea,.buddy-as-admin button{font:inherit;padding:9px;border:1px solid #ccc;border-radius:8px}',
      '.buddy-as-admin textarea{min-height:70px;resize:vertical}',
      '.buddy-as-admin .wide,.buddy-as-admin .status,.buddy-as-admin .actions{grid-column:1/-1}',
      '.buddy-as-admin .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.buddy-as-admin .status{min-height:1.3em}',
      '.buddy-as-admin .cards{display:grid;gap:10px;margin-top:14px}',
      '.buddy-as-admin article{border:1px solid #eee;border-radius:10px;padding:12px;display:grid;gap:8px}',
      '.buddy-as-admin article h4{margin:0}',
      '.buddy-as-admin .hint{opacity:.75;font-size:.92em}',
      '.buddy-as-admin .loading{opacity:.7}',
      '.buddy-as-admin .summary{margin:10px 0;padding:10px;border-radius:8px;background:#f7f7f7}',
      '.buddy-as-admin .empty{opacity:.7;padding:10px 0}',
      '.buddy-as-admin .selection{display:grid;gap:10px;padding:12px;border:1px dashed #ccc;border-radius:10px;margin:12px 0}',
      '.buddy-as-admin .user-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}',
      '.buddy-as-admin .user-card{border:1px solid #ddd;border-radius:12px;padding:14px;display:grid;gap:8px}',
      '.buddy-as-admin .user-card h4{margin:0}',
      '.buddy-as-admin .equipment-list{margin:0;padding-left:18px}',
      '.buddy-as-admin .pill{display:inline-block;padding:3px 7px;border-radius:999px;background:#f0f0f0;font-size:.85em}',
      '.buddy-as-admin .toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}',
      '.buddy-as-admin .toolbar input{min-width:240px}',
      '.buddy-as-admin .danger{border-color:#c88}',
      '.buddy-as-admin .buddy-as-search{grid-column:1/-1;min-width:0}',
      '.buddy-as-admin .buddy-as-hint{opacity:.6;font-size:.85em}',
      '.buddy-as-admin .buddy-as-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:2px}',
      '.buddy-as-admin .buddy-as-tab-btn{padding:9px 14px;border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer;font:inherit}',
      '.buddy-as-admin .buddy-as-tab-btn.active{background:#222;color:#fff;border-color:#222}'
    ].join('');
    document.head.appendChild(s);
  }
  function add(form,label,name,value,type,required){
    var l=document.createElement('label');l.textContent=label;
    var i=document.createElement('input');i.name=name;i.type=type||'text';i.value=value==null?'':value;
    if(required)i.required=true;l.appendChild(i);form.appendChild(l);return i;
  }
  function sel(form,label,name,options,value,required){
    var l=document.createElement('label');l.textContent=label;
    var s=document.createElement('select');s.name=name;
    var e=document.createElement('option');e.value='';e.textContent='Selecciona';s.appendChild(e);
    (options||[]).forEach(function(o){var x=document.createElement('option');x.value=o.value||o;x.textContent=o.label||o;x.selected=x.value===String(value||'');s.appendChild(x);});
    if(required)s.required=true;l.appendChild(s);form.appendChild(l);return s;
  }
  /* searchableSelect: dropdown nativo de usuario con filtro de búsqueda dinámico.
   * Muestra un <input type=search> sobre el <select>. La lista de opciones se
   * reconstruye en cada tecla; el filtro matchea las keywords normalizadas del
   * mapper (nombre, apellido, nombre a mostrar, teléfono…). Devuelve el propio
   * <select> (para que .value/.addEventListener sigan funcionando) con
   * `setItems(lista, mapper)` y acceso al cuadro de búsqueda en `.search`. */
  function searchableSelect(form,label,name,opts){
    opts=opts||{};
    var l=document.createElement('label');l.textContent=label;
    var search=document.createElement('input');search.type='search';search.className='buddy-as-search';
    search.placeholder=opts.searchPlaceholder||'Buscar por nombre, apellido, nombre a mostrar o teléfono…';
    var s=document.createElement('select');s.name=name;if(opts.required)s.required=true;
    var hint=document.createElement('span');hint.className='buddy-as-hint';
    l.appendChild(search);l.appendChild(s);l.appendChild(hint);form.appendChild(l);
    var items=[],mapper=opts.mapper||function(x){return x && typeof x==='object'?{value:x.value,label:x.label||String(x.value),keywords:[]}:{value:x,label:String(x),keywords:[]};},
        maxShown=opts.maxShown||50;
    function kw(m){return (Array.isArray(m.keywords)?m.keywords:[m.keywords]).map(function(k){return String(k==null?'':k).toLowerCase();}).join('\u0001');}
    function build(it,current){var m=mapper(it),o=document.createElement('option');o.value=m.value;o.textContent=m.label;if(current!=null&&String(m.value)===String(current))o.selected=true;return o;}
    function render(){
      var current=s.value,query=search.value.trim().toLowerCase();
      s.innerHTML='';
      var p=document.createElement('option');p.value='';p.textContent=opts.placeholder||'Selecciona…';s.appendChild(p);
      var shown=items;
      if(query)shown=items.filter(function(it){return kw(mapper(it)).indexOf(query)!==-1;});
      var limited=shown.slice(0,maxShown);
      limited.forEach(function(it){s.appendChild(build(it,current));});
      if(!shown.length){var none=document.createElement('option');none.value='';none.disabled=true;none.textContent='Sin resultados';s.appendChild(none);}
      else if(shown.length>maxShown){hint.textContent='Mostrando '+maxShown+' de '+shown.length+' (afina la búsqueda).';}
      else hint.textContent='';
      s.value=current;
    }
    search.addEventListener('input',render);
    s.setItems=function(list,m){items=Array.isArray(list)?list:[];if(m)mapper=m;render();};
    s.setMapper=function(m){mapper=m;render();};
    s.search=search;
    render();
    return s;
  }
  function actions(form,text){
    var st=document.createElement('div');st.className='status';
    var a=document.createElement('div');a.className='actions';
    var b=document.createElement('button');b.type='submit';b.textContent=text;a.appendChild(b);
    form.appendChild(st);form.appendChild(a);return {status:st,button:b};
  }
  function value(item,key){return item&&item[key]!=null?item[key]:'';}
  function userId(user){return user&&(user.personaId||user.id||user._id);}
  function userName(user){return user&&(user.nombreCompleto||[user.nombre,user.apellido].filter(Boolean).join(' ')||user.name||user.email||userId(user));}
  function userKeywords(user){
    if(!user)return [];
    return [user.nombre,user.apellido,user.nombreCompleto,user.name,user.email,user.phone,user.telefono,user.mobile,user.celular,user.whatsapp,userName(user)]
      .filter(Boolean).map(function(v){return String(v).toLowerCase();});
  }
  function ownerKey(owner){return owner.type==='empresa'?'empresa:'+owner.value:'persona:'+owner.value;}
  function equipmentId(item){return item&&(item.id||item._id);}
  function equipmentLabel(item){return [item&&item.tipo,item&&item.marca,item&&item.modelo,item&&item.numeroSerie].filter(Boolean).join(' · ')||'Equipo sin descripción';}
  function dateValue(v){return v?String(v).slice(0,10):'';}
  function label(options,value){var o=(options||[]).find(function(x){return String(x.value||x)===String(value||'');});return o?(o.label||o.value||o):value||'—';}
  function escapeHtml(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  window.BuddyArcherySchoolViews.admin=function(context){
    styles();
    var target=context.target,api=context.api,state=context.state||{},config=context.config||{};
    target.innerHTML='';
    var root=document.createElement('div');root.className='buddy-as-admin';
    var h=document.createElement('h2');h.textContent='Administración de '+(config.appName||'🏹 ArcherySchool');root.appendChild(h);
    var hint=document.createElement('p');hint.className='hint';hint.textContent='Gestiona los usuarios registrados, sus atributos de arquería y la asignación de equipos.';root.appendChild(hint);
    var tabNav=document.createElement('div');tabNav.className='buddy-as-tabs';root.appendChild(tabNav);

    var users=[];
    var schoolCompany=config.schoolOwnerCompany||config.schoolName||(config.siteId?config.siteId+'.com':'escuela');
    var schoolOwner={type:'empresa',value:schoolCompany,label:'Escuela · '+schoolCompany};
    var selectedOwner=null,selectedEquipment=null,ownerEquipment=[];

    function userById(id){return users.find(function(u){return String(userId(u))===String(id);})||null;}
    // Identifica en la lista de usuarios al que corresponde `attrsUser.value`.
    // El selector de medidas usa el buddyUserId (único siempre) como valor, no el
    // personaId (que es null para usuarios sin perfil de arquería).
    function selectedUserById(v){v=String(v||'');if(!v)return null;return users.find(function(u){return String(u.buddyUserId)===v||String(userId(u))===v;})||null;}
    // Devuelve un personaId válido (perfil de arquería) para el usuario; si no
    // tiene perfil, lo crea vía API antes de guardar las medidas.
    function resolvePersonaId(user){
      if(!user)return Promise.resolve(null);
      if(user.personaId)return Promise.resolve(user.personaId);
      return api.createProfileForUser({buddyUserId:user.buddyUserId,nombreCompleto:user.nombreCompleto||user.name})
        .then(function(profile){var id=profile&&(profile._id||profile.id);return id||null;});
    }
    function ownerLabel(owner){return owner&&owner.label||'';}
    function buildOwnerOptions(){
      var owners=[schoolOwner],seen={};seen[ownerKey(schoolOwner)]=true;
      users.forEach(function(u){var id=userId(u);if(id){var o={type:'persona',value:id,label:userName(u)};if(!seen[ownerKey(o)]){seen[ownerKey(o)]=true;owners.push(o);}}});
      return owners;
    }
    function setOptions(select,items,placeholder,mapper){
      select.innerHTML='';var p=document.createElement('option');p.value='';p.textContent=placeholder;select.appendChild(p);
      (items||[]).forEach(function(item){var o=document.createElement('option');var m=mapper?mapper(item):item;o.value=m.value;o.textContent=m.label;select.appendChild(o);});
    }
    function findOwner(key){return buildOwnerOptions().find(function(o){return ownerKey(o)===key;})||null;}
    function getOwnerEquipment(owner){return !owner?Promise.resolve([]):owner.type==='persona'?api.getEquipment({personaId:owner.value}):api.getEquipment({empresa:owner.value});}
    function equipmentData(fields){return {tipo:fields.tipo.value,marca:fields.marca.value.trim()||null,modelo:fields.modelo.value.trim()||null,numeroSerie:fields.numeroSerie.value.trim()||null,fechaAdquisicion:fields.fechaAdquisicion.value||null,fechaBaja:fields.fechaBaja.value||null,estado:fields.estado.value,notas:fields.notas.value.trim()||null};}
    function makeEquipmentFields(form){
      var f={};f.id=document.createElement('input');f.id.type='hidden';f.id.name='equipoId';form.appendChild(f.id);
      f.tipo=sel(form,'Tipo','tipo',config.equipmentTypes||[],'',true);f.marca=add(form,'Marca','marca','','text',false);f.modelo=add(form,'Modelo','modelo','','text',false);f.numeroSerie=add(form,'Número de serie','numeroSerie','','text',false);
      f.fechaAdquisicion=add(form,'Fecha de adquisición','fechaAdquisicion','','date',false);f.fechaBaja=add(form,'Fecha de baja','fechaBaja','','date',false);f.estado=sel(form,'Estado','estado',config.equipmentStates||[],'activo',true);f.notas=add(form,'Notas','notas','','text',false);return f;
    }
    function fillFields(f,item){f.id.value=equipmentId(item)||'';f.tipo.value=value(item,'tipo');f.marca.value=value(item,'marca');f.modelo.value=value(item,'modelo');f.numeroSerie.value=value(item,'numeroSerie');f.fechaAdquisicion.value=dateValue(value(item,'fechaAdquisicion'));f.fechaBaja.value=dateValue(value(item,'fechaBaja'));f.estado.value=value(item,'estado')||'activo';f.notas.value=value(item,'notas');}
    function resetFields(f){f.id.value='';f.tipo.value='';f.marca.value='';f.modelo.value='';f.numeroSerie.value='';f.fechaAdquisicion.value='';f.fechaBaja.value='';f.estado.value='activo';f.notas.value='';}

    /* MEDIDAS Y CARACTERÍSTICAS */
    var attrsSection=document.createElement('section'),attrsTitle=document.createElement('h3');
    attrsTitle.textContent='Medidas y características';attrsSection.appendChild(attrsTitle);
    var attrsHint=document.createElement('p');attrsHint.className='hint';
    attrsHint.textContent='Selecciona un usuario para consultar y editar sus medidas y características de arquería.';
    attrsSection.appendChild(attrsHint);
    var attrsForm=document.createElement('form');
    var attrsUser=searchableSelect(attrsForm,'Usuario','personaId',{required:true,placeholder:'Selecciona un usuario'});
    var attrFields={};
    attrFields.altura=add(attrsForm,'Altura (cm)','altura','','number',false);
    attrFields.peso=add(attrsForm,'Peso (kg)','peso','','number',false);
    attrFields.lateralidad=sel(attrsForm,'Lateralidad','lateralidad',config.lateralidad||[],'',false);
    attrFields.genero=sel(attrsForm,'Género','genero',config.genero||[],'',false);
    attrFields.aperturaBrazos=add(attrsForm,'Apertura de brazos (cm)','aperturaBrazos','','number',false);
    attrFields.aperturaArco=add(attrsForm,'Apertura de arco (cm)','aperturaArco','','number',false);
    attrFields.librajeActual=add(attrsForm,'Libraje actual (lbs)','librajeActual','','number',false);
    attrFields.variacionBase=add(attrsForm,'Variación base','variacionBase','','text',false);
    attrFields.posibilidadAdquisicion=sel(attrsForm,'Posibilidad de adquisición','posibilidadAdquisicion',config.posibilidadAdquisicion||[],'',false);
    attrFields.fuente=sel(attrsForm,'Fuente de los datos','fuente',config.attributeSources||[],'registrado_por_administrador',false);
    var aa=actions(attrsForm,'Guardar medidas y características');attrsSection.appendChild(attrsForm);

    function latestAttribute(list,personaId,type){
      return (list||[]).filter(function(a){
        return a && String(a.personaId)===String(personaId) && a.tipo===type && !a.vigenteHasta;
      }).pop() || null;
    }
    function attrValue(list,personaId,type,key){
      var a=latestAttribute(list,personaId,type);return a && a[key]!=null ? a[key] : '';
    }
    function clearAttrFields(){
      Object.keys(attrFields).forEach(function(k){if(k==='fuente')return;attrFields[k].value='';});
      attrFields.fuente.value='registrado_por_administrador';
    }
    // Al seleccionar un usuario se piden sus personaatributos al backend y se
    // pueblan los inputs para poder verlos o actualizarlos.
    function loadUserAttributes(personaId){
      clearAttrFields();
      if(!personaId){aa.status.textContent='Este usuario no tiene perfil de arquería todavía.';return Promise.resolve();}
      return api.getAttributes({personaId:personaId}).then(function(list){
        attrFields.altura.value=attrValue(list,personaId,'altura','valorCm');
        attrFields.peso.value=attrValue(list,personaId,'peso','valorKg');
        attrFields.lateralidad.value=attrValue(list,personaId,'lateralidad','valor');
        attrFields.genero.value=attrValue(list,personaId,'genero','valor');
        attrFields.aperturaBrazos.value=attrValue(list,personaId,'aperturaBrazos','valorCm');
        attrFields.aperturaArco.value=attrValue(list,personaId,'aperturaArco','valorCm');
        attrFields.librajeActual.value=attrValue(list,personaId,'librajeActual','valorLbs');
        attrFields.variacionBase.value=attrValue(list,personaId,'variacionBase','valor');
        attrFields.posibilidadAdquisicion.value=attrValue(list,personaId,'posibilidadAdquisicion','valor');
        var sources=['altura','peso','lateralidad','genero','aperturaBrazos','aperturaArco','librajeActual','variacionBase','posibilidadAdquisicion'];
        var found=null;
        sources.some(function(type){var a=latestAttribute(list,personaId,type);if(a&&a.fuente){found=a.fuente;return true;}return false;});
        attrFields.fuente.value=found||'registrado_por_administrador';
        aa.status.textContent='';
      }).catch(function(err){aa.status.textContent='No se pudieron cargar los datos del usuario: '+err.message;});
    }
    attrsUser.addEventListener('change',function(){var u=selectedUserById(attrsUser.value);loadUserAttributes(u?(u.personaId||null):null);});
    attrsForm.addEventListener('submit',function(e){
      e.preventDefault();
      var user=selectedUserById(attrsUser.value);
      if(!user){aa.status.textContent='Selecciona un usuario.';return;}
      aa.button.disabled=true;aa.status.textContent='Guardando…';
      resolvePersonaId(user).then(function(personaId){
        if(!personaId){throw new Error('No se pudo obtener/crear el perfil de arquería del usuario.');}
        var source=attrFields.fuente.value||'registrado_por_administrador',jobs=[];
        function save(type,key,cast){
          var field=attrFields[type],v=field.value;
          if(v===null||v==='')return;
          var existing=latestAttribute(state.attributes,personaId,type);
          var d={personaId:personaId,tipo:type,fuente:source};
          d[key]=cast?cast(v):v;if(existing)d.id=existing.id||existing._id;
          jobs.push(api.setAttribute(d));
        }
        save('altura','valorCm',Number);save('peso','valorKg',Number);save('lateralidad','valor');save('genero','valor');
        save('aperturaBrazos','valorCm',Number);save('aperturaArco','valorCm',Number);save('librajeActual','valorLbs',Number);
        save('variacionBase','valor');save('posibilidadAdquisicion','valor');
        return Promise.all(jobs).then(function(results){
          if(results.length){
            results.forEach(function(r){var item=(r&&(r.attribute||r.data))||r;if(!item)return;var idx=(state.attributes||[]).findIndex(function(a){return String(a.id||a._id)===String(item.id||item._id);});if(idx>=0)state.attributes[idx]=item;else state.attributes.push(item);});
          }
          aa.status.textContent='Medidas y características guardadas.';
        });
      }).catch(function(err){aa.status.textContent=err.message;}).finally(function(){aa.button.disabled=false;});
    });
    root.appendChild(attrsSection);

    /* INVENTARIO DE LA ESCUELA */
    var schoolSection=document.createElement('section'),sh=document.createElement('h3');sh.textContent='Equipos de la escuela';schoolSection.appendChild(sh);
    var schoolHint=document.createElement('p');schoolHint.className='hint';schoolHint.textContent='Cada equipo de la escuela se registra una sola vez. Después puede quedar asignado a un usuario durante el tiempo que corresponda y solo se cambia cuando sea necesario.';schoolSection.appendChild(schoolHint);
    var schoolForm=document.createElement('form');
    var schoolS=searchableSelect(schoolForm,'Equipo de la escuela','schoolEquipo',{placeholder:'Busca o selecciona un equipo…'});
    var schoolFields=makeEquipmentFields(schoolForm),schoolActions=actions(schoolForm,'Registrar equipo de la escuela');schoolSection.appendChild(schoolForm);
    var schoolCards=document.createElement('div');schoolCards.className='cards';schoolSection.appendChild(schoolCards);root.appendChild(schoolSection);
    var schoolEquipmentList=[];
    function schoolEquipmentLabel(item){return [item&&item.tipo,item&&item.modelo,item&&item.marca].filter(Boolean).join('-')||equipmentLabel(item);}
    function schoolEquipmentMapper(item){return {value:String(equipmentId(item)),label:schoolEquipmentLabel(item),keywords:[item&&item.tipo,item&&item.marca,item&&item.modelo,item&&item.numeroSerie,item&&item.estado].filter(Boolean).map(function(v){return String(v).toLowerCase();})};}
    function selectSchoolEquipment(item){
      if(!item){resetFields(schoolFields);delete schoolForm.dataset.editingId;schoolActions.button.textContent='Registrar equipo de la escuela';schoolActions.status.textContent='Completa los datos para registrar un equipo nuevo.';return;}
      fillFields(schoolFields,item);schoolForm.dataset.editingId=equipmentId(item)||'';schoolActions.button.textContent='Guardar cambios';schoolActions.status.textContent='Editando equipo de la escuela. Guarda para aplicar los cambios.';
    }
    schoolS.addEventListener('change',function(){var v=schoolS.value;if(!v){selectSchoolEquipment(null);return;}var item=(schoolEquipmentList||[]).find(function(i){return String(equipmentId(i))===String(v);})||null;selectSchoolEquipment(item);});
    function renderSchool(list){schoolCards.innerHTML='';if(!list.length){schoolCards.innerHTML='<div class="empty">No hay equipos de la escuela registrados.</div>';return;}list.forEach(function(item){var a=document.createElement('article'),t=document.createElement('h4');t.textContent=equipmentLabel(item);a.appendChild(t);var d=document.createElement('div');d.textContent='Estado: '+label(config.equipmentStates,item.estado)+' · Adquisición: '+(dateValue(item.fechaAdquisicion)||'—');a.appendChild(d);schoolCards.appendChild(a);});}
    function loadSchool(){return getOwnerEquipment(schoolOwner).then(function(list){schoolEquipmentList=list||[];schoolS.setItems(schoolEquipmentList,schoolEquipmentMapper);return renderSchool(schoolEquipmentList);}).catch(function(err){schoolCards.innerHTML='<div class="empty">No se pudo cargar: '+err.message+'</div>';});}
    schoolForm.addEventListener('submit',function(e){e.preventDefault();schoolActions.button.disabled=true;schoolActions.status.textContent='Guardando…';var editing=schoolForm.dataset.editingId,data=equipmentData(schoolFields);if(editing)data.id=editing;var op=editing?api.updateEquipment(data):api.createEquipment(Object.assign({},data,{parteTipo:'empresa',empresa:schoolCompany,relationNotas:'Propiedad de la escuela'}));op.then(function(r){var saved=(r&&r.data)||r||data;var id=equipmentId(saved)||(saved&&saved.equipment&&equipmentId(saved.equipment))||editing;if(!id)throw new Error('No se recibió el identificador del equipo.');return {id:id,isNew:!editing};}).then(function(info){schoolActions.status.textContent=editing?'Equipo actualizado.':'Equipo registrado.';if(info&&info.isNew&&info.id)schoolS.pendingFocus=info.id;resetFields(schoolFields);delete schoolForm.dataset.editingId;schoolActions.button.textContent='Registrar equipo de la escuela';return loadSchool();}).then(function(){var fid=schoolS.pendingFocus;schoolS.pendingFocus=null;if(!fid)return;var item=(schoolEquipmentList||[]).find(function(i){return String(equipmentId(i))===String(fid);})||null;if(!item)return;schoolS.value=String(equipmentId(item));schoolS.setItems(schoolEquipmentList,schoolEquipmentMapper);selectSchoolEquipment(item);}).catch(function(err){schoolActions.status.textContent=err.message;}).finally(function(){schoolActions.button.disabled=false;});});

    /* ASIGNACIÓN DE EQUIPOS */
    var eqSection=document.createElement('section'),eqh=document.createElement('h3');eqh.textContent='Asignación de equipos';eqSection.appendChild(eqh);
    var eqHint=document.createElement('p');eqHint.className='hint';eqHint.textContent='Selecciona al propietario. Se muestran sus equipos propios y los equipos de la escuela o de terceros que tiene asignados. La asignación permanece vigente hasta que se cambie.';eqSection.appendChild(eqHint);
    var eqForm=document.createElement('form');
    var ownerS=searchableSelect(eqForm,'¿A quién pertenece el equipo?','owner',{required:true,placeholder:'Selecciona el propietario'});
    var equipL=document.createElement('label');equipL.textContent='Equipo de esa persona o empresa';var equipS=document.createElement('select');equipS.name='equipment';equipS.required=true;equipS.disabled=true;equipL.appendChild(equipS);eqForm.appendChild(equipL);
    var recS=searchableSelect(eqForm,'Usuario al que está asignado','recipient',{required:true,placeholder:'Selecciona un usuario'});
    var relNotes=add(eqForm,'Notas de la asignación','notasRelacion','','text',false);var relActions=actions(eqForm,'Asignar equipo');eqSection.appendChild(eqForm);
    var eqSelection=document.createElement('div');eqSelection.className='selection';eqSelection.innerHTML='<strong>Selecciona primero el propietario.</strong><span>Después aparecerán sus equipos registrados.</span>';eqSection.appendChild(eqSelection);
    var eqButtons=document.createElement('div');eqButtons.className='actions';var createOwnerBtn=document.createElement('button');createOwnerBtn.type='button';createOwnerBtn.textContent='Crear equipo para este propietario';var editOwnerBtn=document.createElement('button');editOwnerBtn.type='button';editOwnerBtn.textContent='Modificar equipo seleccionado';createOwnerBtn.disabled=editOwnerBtn.disabled=true;eqButtons.appendChild(createOwnerBtn);eqButtons.appendChild(editOwnerBtn);eqSection.appendChild(eqButtons);root.appendChild(eqSection);

    function loadOwner(owner){selectedOwner=owner;selectedEquipment=null;ownerEquipment=[];editOwnerBtn.disabled=true;createOwnerBtn.disabled=!owner;equipS.disabled=true;setOptions(equipS,[],'Cargando equipos…');if(!owner){eqSelection.innerHTML='<strong>Selecciona primero el propietario.</strong><span>Después aparecerán sus equipos registrados.</span>';return Promise.resolve();}eqSelection.innerHTML='<strong>'+ownerLabel(owner)+'</strong><span>Cargando inventario…</span>';return getOwnerEquipment(owner).then(function(list){ownerEquipment=list||[];setOptions(equipS,ownerEquipment,ownerEquipment.length?'Selecciona un equipo':'No hay equipos registrados',function(i){return {value:String(equipmentId(i)),label:equipmentLabel(i)};});equipS.disabled=false;eqSelection.innerHTML='<strong>'+ownerLabel(owner)+'</strong><span>'+ownerEquipment.length+' equipo(s) registrados.</span>';}).catch(function(err){eqSelection.innerHTML='<strong>'+ownerLabel(owner)+'</strong><span>No se pudo cargar: '+err.message+'</span>';});}
    ownerS.addEventListener('change',function(){loadOwner(findOwner(ownerS.value));});
    equipS.addEventListener('change',function(){selectedEquipment=ownerEquipment.find(function(i){return String(equipmentId(i))===String(equipS.value);})||null;editOwnerBtn.disabled=!selectedEquipment;});
    function openEquipmentEditor(owner,item){
      var old=document.getElementById('buddy-as-inline-equipment-editor');if(old)old.remove();var box=document.createElement('div');box.id='buddy-as-inline-equipment-editor';box.className='selection';var title=document.createElement('strong');title.textContent=(item?'Modificar':'Crear')+' equipo · '+ownerLabel(owner);box.appendChild(title);var form=document.createElement('form'),fields=makeEquipmentFields(form);if(item)fillFields(fields,item);var ac=actions(form,item?'Guardar cambios':'Registrar equipo');box.appendChild(form);eqSection.appendChild(box);
      form.addEventListener('submit',function(e){e.preventDefault();ac.button.disabled=true;var data=equipmentData(fields),editing=item&&equipmentId(item);if(editing)data.id=editing;var op=editing?api.updateEquipment(data):api.createEquipment(Object.assign({},data,{parteTipo:owner.type,personaId:owner.type==='persona'?owner.value:null,empresa:owner.type==='empresa'?owner.value:null,relationNotas:'Propietario'}));op.then(function(r){var saved=(r&&r.data)||r||data,id=equipmentId(saved)||(saved&&saved.equipment&&equipmentId(saved.equipment))||editing;if(!id)throw new Error('No se recibió el identificador del equipo.');return saved;}).then(function(){ac.status.textContent='Equipo guardado.';return loadOwner(owner);}).then(function(){box.remove();refreshUserList();}).catch(function(err){ac.status.textContent=err.message;}).finally(function(){ac.button.disabled=false;});});
    }
    createOwnerBtn.onclick=function(){if(selectedOwner)openEquipmentEditor(selectedOwner,null);};editOwnerBtn.onclick=function(){if(selectedOwner&&selectedEquipment)openEquipmentEditor(selectedOwner,selectedEquipment);};
    eqForm.addEventListener('submit',function(e){
      e.preventDefault();if(!selectedOwner){relActions.status.textContent='Selecciona el propietario.';return;}if(!selectedEquipment){relActions.status.textContent='Selecciona un equipo.';return;}if(!recS.value){relActions.status.textContent='Selecciona el usuario que usará el equipo.';return;}
      relActions.button.disabled=true;relActions.status.textContent='Guardando asignación…';
      api.getEquipmentRelations(equipmentId(selectedEquipment), {scope:'site'}).then(function(rels){
        var activeLoans=(rels||[]).filter(function(r){return r.tipo==='prestamo'&&!r.vigenteHasta;});
        var closes=activeLoans.filter(function(r){return String(r.personaId||'')!==String(recS.value);}).map(function(r){return api.closeEquipmentRelation(r.id||r._id,new Date().toISOString());});
        return Promise.all(closes);
      }).then(function(){
        return api.getEquipmentRelations(equipmentId(selectedEquipment),{personaId:recS.value});
      }).then(function(rels){
        var current=(rels||[]).find(function(r){return r.tipo==='prestamo'&&!r.vigenteHasta;});
        if(current)return current;
        return api.createEquipmentRelation({equipoId:equipmentId(selectedEquipment),tipo:'prestamo',parteTipo:'persona',personaId:recS.value,empresa:null,vigenteDesde:new Date().toISOString(),vigenteHasta:null,notas:relNotes.value.trim()||null});
      }).then(function(){relActions.status.textContent='Equipo asignado. La asignación permanecerá vigente hasta que sea necesario cambiarla.';relNotes.value='';return loadOwner(selectedOwner);}).then(function(){refreshUserList();}).catch(function(err){relActions.status.textContent=err.message;}).finally(function(){relActions.button.disabled=false;});
    });

    /* USUARIOS REGISTRADOS */
    var listSection=document.createElement('section'),lh=document.createElement('h3');lh.textContent='Usuarios registrados';listSection.appendChild(lh);
    var lhint=document.createElement('p');lhint.className='hint';lhint.textContent='Listado de todos los usuarios registrados en la página, con su equipo asignado.';listSection.appendChild(lhint);
    var toolbar=document.createElement('div');toolbar.className='toolbar';var search=document.createElement('input');search.type='search';search.placeholder='Buscar por nombre, apellido o correo…';var reload=document.createElement('button');reload.type='button';reload.textContent='Actualizar listado';toolbar.appendChild(search);toolbar.appendChild(reload);listSection.appendChild(toolbar);
    var userGrid=document.createElement('div');userGrid.className='user-grid';listSection.appendChild(userGrid);root.appendChild(listSection);
    var userRows=[];
    function relationText(rel){if(rel.tipo==='propietario')return 'Propio';if(rel.tipo==='prestamo')return rel.parteTipo==='empresa'?'Equipo de la escuela':'Equipo asignado';return rel.tipo||'—';}
    function renderUserRows(){
      userGrid.innerHTML='';var q=(search.value||'').trim().toLowerCase();var rows=userRows.filter(function(r){
        if(!q)return true;
        var u=r.user||{};
        var fields=[u.nombreCompleto,u.nombre,u.apellido,u.email,r.name].filter(Boolean);
        return fields.some(function(f){return f.toLowerCase().indexOf(q)!==-1;});
      });
      if(!rows.length){userGrid.innerHTML='<div class="empty">No hay usuarios que coincidan.</div>';return;}
      rows.forEach(function(row){var a=document.createElement('article');a.className='user-card';var title=document.createElement('h4');title.textContent=row.name;a.appendChild(title);var meta=document.createElement('div');meta.className='hint';var metaParts=['ID: '+row.id];if(row.user&&row.user.email)metaParts.push(row.user.email);meta.textContent=metaParts.join(' · ');a.appendChild(meta);var ul=document.createElement('ul');ul.className='equipment-list';if(!row.equipment.length){var none=document.createElement('li');none.textContent='Sin equipos asignados.';ul.appendChild(none);}else row.equipment.forEach(function(e){var li=document.createElement('li');li.textContent=e.label+' — '+e.relation;ul.appendChild(li);});a.appendChild(ul);var acts=document.createElement('div');acts.className='actions';var edit=document.createElement('button');edit.type='button';edit.textContent='Administrar equipos';edit.onclick=function(){ownerS.value='persona:'+row.id;loadOwner(findOwner(ownerS.value));switchTab('asignacion');};var ficha=document.createElement('button');ficha.type='button';ficha.textContent='Ver ficha';ficha.onclick=function(){openUserSheet(row);};acts.appendChild(edit);acts.appendChild(ficha);a.appendChild(acts);userGrid.appendChild(a);});
    }
    function refreshUserList(){return api.getUsers().then(function(list){users=Array.isArray(list)?list:[];return Promise.all(users.map(function(u){var id=userId(u);if(!id)return {user:u,items:[]};return api.getEquipment({personaId:id}).then(function(eq){eq=eq||[];return Promise.all(eq.map(function(item){return api.getEquipmentRelations(equipmentId(item), {scope:'site'}).then(function(rels){return {item:item,rels:rels||[]};});})).then(function(items){return {user:u,items:items};});});}));}).then(function(rows){userRows=rows.map(function(r){var id=userId(r.user);return {id:id,name:userName(r.user),user:r.user,equipment:(r.items||[]).map(function(entry){var item=entry.item,ir=(entry.rels||[]).filter(function(x){return !x.vigenteHasta;});var own=ir.find(function(x){return x.tipo==='propietario'&&x.parteTipo==='persona'&&String(x.personaId)===String(id);});var loan=ir.find(function(x){return x.tipo==='prestamo'&&x.parteTipo==='persona'&&String(x.personaId)===String(id);});return {label:equipmentLabel(item),relation:loan?relationText(loan):(own?relationText(own):'Asignado')};})};});renderUserRows();});}
    search.addEventListener('input',renderUserRows);reload.addEventListener('click',function(){reload.disabled=true;refreshUserList().finally(function(){reload.disabled=false;});});

    function openUserSheet(row){
      var u=row.user||{}, attrs=(state.attributes||[]).filter(function(a){return a&&String(a.personaId)===String(row.id)&&!a.vigenteHasta;});
      var attr=function(type,key){var a=attrs.find(function(x){return x.tipo===type;});return a&&a[key]!=null?a[key]:'—';};
      var lines=[];lines.push('<h1>Ficha del usuario</h1>');lines.push('<h2>'+escapeHtml(row.name)+'</h2>');lines.push('<p><strong>ID:</strong> '+escapeHtml(row.id||'—')+'</p>');lines.push('<p><strong>Correo:</strong> '+escapeHtml(u.email||'—')+'</p>');lines.push('<p><strong>Teléfono:</strong> '+escapeHtml(u.phone||u.telefono||'—')+'</p>');lines.push('');lines.push('<h3>Datos de arquería</h3><ul>');lines.push('<li>Altura: '+escapeHtml(attr('altura','valorCm'))+' cm</li>');lines.push('<li>Peso: '+escapeHtml(attr('peso','valorKg'))+' kg</li>');lines.push('<li>Lateralidad: '+escapeHtml(attr('lateralidad','valor'))+'</li>');lines.push('<li>Apertura de brazos: '+escapeHtml(attr('aperturaBrazos','valorCm'))+' cm</li>');lines.push('<li>Apertura de arco: '+escapeHtml(attr('aperturaArco','valorCm'))+' cm</li>');lines.push('<li>Libraje actual: '+escapeHtml(attr('librajeActual','valorLbs'))+' lbs</li>');lines.push('</ul><h3>Equipamiento</h3><ul>');(row.equipment||[]).forEach(function(e){lines.push('<li>'+escapeHtml(e.label)+' — '+escapeHtml(e.relation)+'</li>');});if(!row.equipment.length)lines.push('<li>Sin equipos asignados.</li>');lines.push('</ul>');
      var w=window.open('','_blank','width=800,height=900');if(!w){alert('El navegador bloqueó la ventana de la ficha. Permite ventanas emergentes para Buddy.');return;}w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Ficha - '+escapeHtml(row.name)+'</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;padding:20px;line-height:1.5}h1{margin-bottom:4px}h2{margin-top:0}li{margin:5px 0}.print{margin:20px 0;padding:8px 12px}@media print{.print{display:none}}</style></head><body>'+lines.join('')+'<button class="print" onclick="window.print()">Imprimir / guardar como PDF</button></body></html>');w.document.close();
    }

    function userMapper(u){return {value:String(userId(u)),label:userName(u),keywords:userKeywords(u)};}
    function ownerMapper(o){if(o.type==='persona'){return {value:ownerKey(o),label:ownerLabel(o),keywords:(o.user&&userKeywords(o.user))||[ownerLabel(o)]};}return {value:ownerKey(o),label:ownerLabel(o),keywords:[ownerLabel(o),String(o.value||'')]};}
    function attrsUserMapper(u){return {value:String(u.buddyUserId),label:userName(u),keywords:userKeywords(u)};}
    function fillUsers(){
      attrsUser.setItems(users,attrsUserMapper);
      recS.setItems(users,userMapper);
      ownerS.setItems([schoolOwner].concat(users.map(function(u){return {type:'persona',value:userId(u),user:u,label:userName(u)};})),ownerMapper);
    }

    api.getUsers().then(function(list){
      users=Array.isArray(list)?list:[];
      fillUsers();
      return Promise.all([api.getAttributes({scope:'site'}).catch(function(){return state.attributes||[];}),loadSchool(),refreshUserList()]);
    }).then(function(){
      if(attrsUser.value){var u=selectedUserById(attrsUser.value);if(u)return loadUserAttributes(u.personaId||null);}
    }).catch(function(err){userGrid.innerHTML='<div class="empty">No se pudo cargar la lista de usuarios: '+err.message+'</div>';});

    /* PESTAÑAS: una sola sección visible a la vez */
    var tabs=[
      {id:'medidas',label:'Medidas y características',section:attrsSection},
      {id:'equipos-escuela',label:'Equipos de la escuela',section:schoolSection},
      {id:'asignacion',label:'Asignación de equipos',section:eqSection},
      {id:'usuarios',label:'Usuarios registrados',section:listSection}
    ];
    function switchTab(id){
      tabs.forEach(function(t){var isActive=t.id===id;t.section.hidden=!isActive;t.btn.classList.toggle('active',isActive);});
    }
    tabs.forEach(function(t){
      var b=document.createElement('button');b.type='button';b.className='buddy-as-tab-btn';b.textContent=t.label;
      b.onclick=function(){switchTab(t.id);};t.btn=b;tabNav.appendChild(b);
    });
    switchTab(tabs[0].id);

    target.appendChild(root);return root;
  };
})(window, document);
