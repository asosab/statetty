/** Buddy User — formulario completo del perfil universal. */
window.BuddyUserViews = window.BuddyUserViews || {};
(function (window, document) {
  'use strict';
  function ensureStyles() {
    if (document.getElementById('buddy-user-view-styles')) return;
    var style=document.createElement('style');style.id='buddy-user-view-styles';
    style.textContent='.buddy-user-view{font:inherit;display:grid;gap:16px;max-width:760px}.buddy-user-view section{border:1px solid #ddd;border-radius:12px;padding:16px}.buddy-user-view form{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.buddy-user-view label{display:grid;gap:6px}.buddy-user-view input,.buddy-user-view select,.buddy-user-view textarea,.buddy-user-view button{font:inherit;padding:9px;border:1px solid #ccc;border-radius:8px}.buddy-user-view textarea{min-height:90px;resize:vertical}.buddy-user-view .wide{grid-column:1/-1}.buddy-user-view .actions{grid-column:1/-1;display:flex;gap:8px;align-items:center}.buddy-user-view .status{grid-column:1/-1;min-height:1.3em}.buddy-user-photo{display:flex;gap:12px;align-items:center}.buddy-user-view .hint{opacity:.75;font-size:.92em}.buddy-user-view .cards{display:grid;gap:8px;margin-top:14px}.buddy-user-view article{border:1px solid #eee;border-radius:10px;padding:12px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.buddy-user-view article .meta{display:grid;gap:3px}.buddy-user-view article button{padding:6px 9px;cursor:pointer}';
    document.head.appendChild(style);
  }
  function archerySchoolApi(){
    var buddy=window.Buddy;
    if(buddy&&buddy.modules&&typeof buddy.modules.isActive==='function'&&!buddy.modules.isActive('archerySchool'))return null;
    return (buddy&&buddy.archerySchool)||null;
  }
  function currentAttribute(list,type){
    var found=null;
    (list||[]).forEach(function(a){if(a&&a.tipo===type&&!a.vigenteHasta)found=a;});
    return found;
  }
  function attrValue(list,type,key){
    var a=currentAttribute(list,type);return a&&a[key]!=null?a[key]:'';
  }

  window.BuddyUserViews.profile=function(context){
    ensureStyles();
    var target=context.target,user=context.user||{},api=context.api,config=context.config||{};target.innerHTML='';
    var root=document.createElement('div');root.className='buddy-user-view';
    var title=document.createElement('h2');title.textContent='Mi perfil';root.appendChild(title);
    var intro=document.createElement('p');intro.className='hint';intro.textContent='Estos datos pertenecen a tu cuenta universal de Buddy y pueden ser utilizados por los sitios donde tengas una relación activa.';root.appendChild(intro);

    var identity=document.createElement('section');var ih=document.createElement('h3');ih.textContent='Identidad y contacto';identity.appendChild(ih);
    var form=document.createElement('form');
    function add(labelText,name,value,type,required,readonly){
      var l=document.createElement('label');l.textContent=labelText;var i=document.createElement('input');i.name=name;i.type=type||'text';i.value=value==null?'':value;if(required)i.required=true;if(readonly)i.readOnly=true;l.appendChild(i);form.appendChild(l);return i;
    }
    add('Nombre','firstName',user.firstName||'','text',false,false);
    add('Apellido','lastName',user.lastName||'','text',false,false);
    add('Nombre para mostrar','name',user.name||'','text',true,false);
    add('Correo electrónico','email',user.email||'','email',true,true);
    add('Número celular que usa en WhatsApp','phone',user.phone||'','tel',true,false);
    if(!config.fields||config.fields.locale!==false){
      var l=document.createElement('label');l.textContent='Idioma';var s=document.createElement('select');s.name='locale';
      (config.locales||[]).forEach(function(o){var x=document.createElement('option');x.value=o.value;x.textContent=o.label;x.selected=o.value===user.locale;s.appendChild(x);});l.appendChild(s);form.appendChild(l);
    }
    var actions=document.createElement('div');actions.className='actions';var status=document.createElement('div');status.className='status';var save=document.createElement('button');save.type='submit';save.textContent='Guardar cambios';actions.appendChild(save);form.appendChild(status);form.appendChild(actions);
    form.addEventListener('submit',function(e){e.preventDefault();save.disabled=true;status.textContent='Guardando…';var data={};Array.prototype.forEach.call(form.elements,function(el){if(el.name)data[el.name]=el.value;});api.updateProfile(data).then(function(){status.textContent='Cambios guardados.';}).catch(function(err){status.textContent=err.message;}).finally(function(){save.disabled=false;});});
    identity.appendChild(form);root.appendChild(identity);

    var photoSection=document.createElement('section');var ph=document.createElement('h3');ph.textContent='Foto de perfil';photoSection.appendChild(ph);
    var photo=document.createElement('div');photo.className='buddy-user-photo';photo.appendChild(api.avatar(user,'buddy-user-avatar'));
    var file=document.createElement('input');file.type='file';file.accept='image/*';file.addEventListener('change',function(){if(!file.files[0])return;api.uploadPhoto(file.files[0]).then(function(){return api.getCurrent();}).then(function(){return api.render({target:target,view:'profile'});}).catch(function(err){photoStatus.textContent=err.message;});});
    photo.appendChild(file);var photoStatus=document.createElement('span');photoStatus.className='hint';photo.appendChild(photoStatus);photoSection.appendChild(photo);root.appendChild(photoSection);

    /* SESIONES ACTIVAS */
    var authApi=window.Buddy&&window.Buddy.auth;
    if(authApi&&typeof authApi.listSessions==='function'){
      var sessSection=document.createElement('section');
      var sh=document.createElement('h3');sh.textContent='Sesiones activas';sessSection.appendChild(sh);
      var sHint=document.createElement('p');sHint.className='hint';sHint.textContent='Dispositivos donde tenés la sesión iniciada en este sitio. Podés cerrar los que no uses.';sessSection.appendChild(sHint);
      var sStatus=document.createElement('div');sStatus.className='status';sessSection.appendChild(sStatus);
      var sList=document.createElement('div');sList.className='cards';sessSection.appendChild(sList);
      var closeOthers=document.createElement('button');closeOthers.type='button';closeOthers.textContent='Cerrar las demás sesiones menos esta';closeOthers.className='buddy-close-others';sessSection.appendChild(closeOthers);
      function fmtDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleString():'—';}
      function shortDevice(d){d=d||'Dispositivo desconocido';return d.length>50?d.slice(0,50)+'…':d;}
      function loadSessions(){
        sStatus.textContent='Cargando…';
        authApi.listSessions().then(function(data){
          sStatus.textContent='';
          sList.innerHTML='';
          var sessions=(data&&data.sessions)||[];
          closeOthers.style.display=(sessions.length>1)?'':'none';
          if(!sessions.length){var none=document.createElement('p');none.className='hint';none.textContent='No hay otras sesiones activas.';sList.appendChild(none);return;}
          sessions.forEach(function(s){
            var art=document.createElement('article');
            var meta=document.createElement('div');meta.className='meta';
            var strong=document.createElement('strong');strong.textContent=shortDevice(s.deviceInfo);meta.appendChild(strong);
            var ip=document.createElement('span');ip.textContent='IP: '+(s.ip||'—');meta.appendChild(ip);
            var when=document.createElement('span');when.textContent='Desde: '+fmtDate(s.createdAt);meta.appendChild(when);
            art.appendChild(meta);
            if(s.isCurrent){
              var cur=document.createElement('span');cur.className='hint';cur.textContent='(esta sesión)';art.appendChild(cur);
            }else{
              var btn=document.createElement('button');btn.type='button';btn.textContent='Cerrar';
              btn.addEventListener('click',(function(id,b){return function(){b.disabled=true;sStatus.textContent='Cerrando sesión…';authApi.closeSession(id).then(function(){sStatus.textContent='Sesión cerrada.';loadSessions();}).catch(function(err){sStatus.textContent=err.message;b.disabled=false;});};})(s.id,btn));
              art.appendChild(btn);
            }
            sList.appendChild(art);
          });
        }).catch(function(err){
          sStatus.textContent=err.message;
        });
      }
      closeOthers.addEventListener('click',function(){
        if(!window.confirm('¿Deseás cerrar las demás sesiones (excepto esta) en todos los dispositivos?'))return;
        closeOthers.disabled=true;sStatus.textContent='Cerrando las demás sesiones…';
        authApi.closeOtherSessions().then(function(){sStatus.textContent='Se cerraron las demás sesiones.';loadSessions();}).catch(function(err){sStatus.textContent=err.message;}).finally(function(){closeOthers.disabled=false;});
      });
      loadSessions();
      root.appendChild(sessSection);
    }

    target.appendChild(root);

    var as=archerySchoolApi();
    if(!as)return root;

    var asc=as.config||{};
    var attributes=[];
    var equipment=[],relations=[],ownPersona=null,editingId=null;

    function ownName(){
      return user.name||[user.firstName,user.lastName].filter(Boolean).join(' ')||user.email||'Usuario';
    }
    function personaIdOf(profile){return profile&&(profile._id||profile.id)||null;}
    function addField(form2,labelText,name,value,type){
      var l=document.createElement('label');l.textContent=labelText;
      var i=document.createElement('input');i.name=name;i.type=type||'text';i.value=value==null?'':value;l.appendChild(i);form2.appendChild(l);return i;
    }
    function addSelect(form2,labelText,name,options,value){
      var l=document.createElement('label');l.textContent=labelText;var s=document.createElement('select');s.name=name;
      var e=document.createElement('option');e.value='';e.textContent='Selecciona';s.appendChild(e);
      (options||[]).forEach(function(o){var x=document.createElement('option');x.value=o.value||o;x.textContent=o.label||o;x.selected=(x.value===String(value==null?'':value));s.appendChild(x);});
      l.appendChild(s);form2.appendChild(l);return s;
    }
    function statusActions(form2,text){
      var st=document.createElement('div');st.className='status';
      var ac=document.createElement('div');ac.className='actions';
      var b=document.createElement('button');b.type='submit';b.textContent=text;ac.appendChild(b);
      form2.appendChild(st);form2.appendChild(ac);return {status:st,button:b};
    }
    function resolveOwnPersona(){
      return as.getProfile().then(function(p){return p;}).catch(function(err){
        if(err&&err.status===404)return as.createProfile({nombreCompleto:ownName()}).then(function(r){return r&&(r.profile||r.data||r)||r;});
        throw err;
      });
    }
    function ownPersonaIdAfter(profile){
      var id=personaIdOf(profile);
      if(!id)return Promise.reject(new Error('No se pudo determinar el perfil de arquería.'));
      return Promise.resolve(id);
    }
    function loadAttributes(){
      return as.getAttributes().then(function(list){
        var items=Array.isArray(list)?list:(list&&(list.attributes||list.data))||[];
        attributes=items.slice();
        fillAttrs();
      });
    }
    function obtainAttrs(statusEl){
      return loadAttributes().catch(function(err){
        if(err&&err.status===404){
          attributes=[];fillAttrs();
          if(statusEl)statusEl.textContent='Aún no tienes datos de arquería registrados. Completa el formulario y se crearán al guardar.';
          return;
        }
        throw err;
      });
    }
    function saveFields(statusEl,button,specs){
      button.disabled=true;statusEl.textContent='Guardando…';
      resolveOwnPersona().then(ownPersonaIdAfter).then(function(personaId){
        var jobs=[];
        specs.forEach(function(spec){spec.build(jobs,personaId);});
        return Promise.all(jobs);
      }).then(loadAttributes).then(function(){
        statusEl.textContent='Guardado.';
      }).catch(function(err){
        statusEl.textContent=err.message;
      }).finally(function(){button.disabled=false;});
    }

    /* MEDIDAS Y CARACTERÍSTICAS */
    var attrsSection=document.createElement('section');var ah=document.createElement('h3');ah.textContent='Medidas y características';attrsSection.appendChild(ah);
    var attrsHint=document.createElement('p');attrsHint.className='hint';attrsHint.textContent='Consulta y actualiza tus medidas y características de arquería.';attrsSection.appendChild(attrsHint);
    var af=document.createElement('form');
    var attrFields={};
    attrFields.altura=addField(af,'Altura (cm)','altura',attrValue(attributes,'altura','valorCm'),'number');
    attrFields.peso=addField(af,'Peso (kg)','peso',attrValue(attributes,'peso','valorKg'),'number');
    attrFields.lateralidad=addSelect(af,'Lateralidad','lateralidad',asc.lateralidad||[],attrValue(attributes,'lateralidad','valor'));
    attrFields.genero=addSelect(af,'Género','genero',asc.genero||[],attrValue(attributes,'genero','valor'));
    attrFields.aperturaBrazos=addField(af,'Apertura de brazos (cm)','aperturaBrazos',attrValue(attributes,'aperturaBrazos','valorCm'),'number');
    attrFields.aperturaArco=addField(af,'Apertura de arco (cm)','aperturaArco',attrValue(attributes,'aperturaArco','valorCm'),'number');
    attrFields.librajeActual=addField(af,'Libraje actual (lbs)','librajeActual',attrValue(attributes,'librajeActual','valorLbs'),'number');
    attrFields.variacionBase=addField(af,'Variación base','variacionBase',attrValue(attributes,'variacionBase','valor'),'text');
    attrFields.posibilidadAdquisicion=addSelect(af,'Posibilidad de adquisición','posibilidadAdquisicion',asc.posibilidadAdquisicion||[],attrValue(attributes,'posibilidadAdquisicion','valor'));
    var aSA=statusActions(af,'Guardar medidas');
    attrsSection.appendChild(af);
    af.addEventListener('submit',function(e){
      e.preventDefault();
      var specs=[
        {tipo:'altura',key:'valorCm',cast:Number},{tipo:'peso',key:'valorKg',cast:Number},
        {tipo:'lateralidad',key:'valor'},{tipo:'genero',key:'valor'},
        {tipo:'aperturaBrazos',key:'valorCm',cast:Number},{tipo:'aperturaArco',key:'valorCm',cast:Number},
        {tipo:'librajeActual',key:'valorLbs',cast:Number},{tipo:'variacionBase',key:'valor'},
        {tipo:'posibilidadAdquisicion',key:'valor'}
      ].map(function(spec){
        var field=attrFields[spec.tipo];
        return {build:function(jobs,personaId){
          var v=field.value;if(v===null||v==='')return;
          var payload={personaId:personaId,tipo:spec.tipo,fuente:'autorreportado'};
          payload[spec.key]=spec.cast?spec.cast(v):v;
          jobs.push(as.setAttribute(payload));
        }};
      });
      saveFields(aSA.status,aSA.button,specs);
    });
    root.appendChild(attrsSection);

    /* DOCUMENTO DE IDENTIDAD */
    var docSection=document.createElement('section');var dh=document.createElement('h3');dh.textContent='Documento de identidad';docSection.appendChild(dh);
    var docHint=document.createElement('p');docHint.className='hint';docHint.textContent='Tu documento de identidad para tu registro en la escuela.';docSection.appendChild(docHint);
    var df=document.createElement('form');
    var docTipo=addSelect(df,'Tipo de documento','tipoDocumento',asc.documentTypes||[],attrValue(attributes,'documentoIdentidad','tipoDocumento')||'CI');docTipo.required=true;
    var docNumero=addField(df,'Número','numero','','text');docNumero.required=true;
    var docPais=addSelect(df,'País emisor','paisEmisor',asc.countries||[],attrValue(attributes,'documentoIdentidad','paisEmisor'));docPais.required=true;
    var docPrincipalLabel=document.createElement('label');docPrincipalLabel.textContent='Es documento principal';
    var docPrincipal=document.createElement('input');docPrincipal.type='checkbox';docPrincipal.name='esPrincipal';docPrincipal.checked=true;
    docPrincipalLabel.appendChild(docPrincipal);df.appendChild(docPrincipalLabel);
    var dSA=statusActions(df,'Guardar documento');
    docSection.appendChild(df);
    df.addEventListener('submit',function(e){
      e.preventDefault();
      saveFields(dSA.status,dSA.button,[{build:function(jobs,personaId){
        jobs.push(as.setAttribute({personaId:personaId,tipo:'documentoIdentidad',tipoDocumento:docTipo.value.trim(),numero:docNumero.value.trim(),paisEmisor:docPais.value.trim(),esPrincipal:docPrincipal.checked,fuente:'autorreportado'}));
      }}]);
    });
    root.appendChild(docSection);

    /* CONDICIONES FÍSICAS PERMANENTES */
    var condSection=document.createElement('section');var ch=document.createElement('h3');ch.textContent='Condiciones físicas permanentes';condSection.appendChild(ch);
    var condHint=document.createElement('p');condHint.className='hint';condHint.textContent='Registra tus condiciones físicas permanentes (una por línea).';condSection.appendChild(condHint);
    var cf=document.createElement('form');
    var condLabel=document.createElement('label');condLabel.className='wide';condLabel.textContent='Condiciones';
    var condTa=document.createElement('textarea');condTa.name='condicionesFisicasPermanentes';
    var currentUser=context.user||(window.Buddy.user&&window.Buddy.user.getState&&window.Buddy.user.getState().user)||{};
    condTa.value=Array.isArray(currentUser.condicionesFisicasPermanentes)?currentUser.condicionesFisicasPermanentes.join('\n'):'';
    condLabel.appendChild(condTa);cf.appendChild(condLabel);
    var cSA=statusActions(cf,'Guardar condiciones');
    condSection.appendChild(cf);
    cf.addEventListener('submit',function(e){
      e.preventDefault();
      var conditions=condTa.value.split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);
      cSA.button.disabled=true;cSA.status.textContent='Guardando…';
      api.updateProfile({condicionesFisicasPermanentes:conditions}).then(function(){
        if(currentUser)currentUser.condicionesFisicasPermanentes=conditions;
        cSA.status.textContent='Condiciones guardadas.';
      }).catch(function(err){cSA.status.textContent=err.message;}).finally(function(){cSA.button.disabled=false;});
    });
    root.appendChild(condSection);

    /* MIS EQUIPOS */
    var eqSection=document.createElement('section');var qh=document.createElement('h3');qh.textContent='Mis equipos';eqSection.appendChild(qh);
    var eqHint=document.createElement('p');eqHint.className='hint';eqHint.textContent='Crea y modifica los equipos de los que eres propietario. Los equipos que la escuela u otra persona te presta aparecen como préstamo y no puedes modificar sus datos.';eqSection.appendChild(eqHint);
    var qf=document.createElement('form');
    function addEqSelect(form2,labelText,name,options,value,required){
      var l=document.createElement('label');l.textContent=labelText;var s=document.createElement('select');s.name=name;
      var e=document.createElement('option');e.value='';e.textContent='Selecciona';s.appendChild(e);
      (options||[]).forEach(function(o){var x=document.createElement('option');x.value=o.value||o;x.textContent=o.label||o;x.selected=(x.value===String(value==null?'':value));s.appendChild(x);});
      if(required)s.required=true;l.appendChild(s);form2.appendChild(l);return s;
    }
    addEqSelect(qf,'Tipo de equipo','tipo',asc.equipmentTypes||[],'',true);
    addField(qf,'Marca','marca','','text');
    addField(qf,'Modelo','modelo','','text');
    addField(qf,'Número de serie','numeroSerie','','text');
    addField(qf,'Fecha de adquisición','fechaAdquisicion','','date');
    addField(qf,'Fecha de baja','fechaBaja','','date');
    addEqSelect(qf,'Estado','estado',asc.equipmentStates||[],'activo',true);
    addField(qf,'Notas','notas','','text');
    var qSA=statusActions(qf,'Registrar mi equipo');
    eqSection.appendChild(qf);
    var cards=document.createElement('div');cards.className='cards';eqSection.appendChild(cards);
    function equipmentLabel(item){return [item.tipo,item.marca,item.modelo].filter(Boolean).join(' · ')||'Equipo';}
    function equipmentStateLabel(item){
      var list=asc.equipmentStates||[],i;for(i=0;i<list.length;i++){if((list[i].value||list[i])===item.estado)return list[i].label||list[i];}
      return item.estado||'';
    }
    function resetEquipmentForm(){
      qf.reset();qf.elements.estado.value='activo';editingId=null;qSA.button.textContent='Registrar mi equipo';
    }
    function fillEquipmentForm(item){
      editingId=item&&(item.id||item._id)||null;
      qf.elements.tipo.value=item&&item.tipo||'';qf.elements.marca.value=item&&item.marca||'';
      qf.elements.modelo.value=item&&item.modelo||'';qf.elements.numeroSerie.value=item&&item.numeroSerie||'';
      qf.elements.fechaAdquisicion.value=item&&item.fechaAdquisicion?String(item.fechaAdquisicion).slice(0,10):'';
      qf.elements.fechaBaja.value=item&&item.fechaBaja?String(item.fechaBaja).slice(0,10):'';
      qf.elements.estado.value=item&&item.estado||'activo';qf.elements.notas.value=item&&item.notas||'';
      qSA.button.textContent='Guardar cambios';qSA.status.textContent='Editando tu equipo.';qf.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
    function renderEquipment(){
      cards.innerHTML='';
      if(!ownPersona){cards.textContent='Aún no tienes perfil de arquería. Completa "Medidas y características" y vuelve a abrir esta sección.';return;}
      var rows=[];
      equipment.forEach(function(item){
        var id=item.id||item._id;
        var rels=relations.filter(function(r){return (r.equipoId==null||String(r.equipoId)===String(id))&&!r.vigenteHasta;});
        var owned=rels.some(function(r){return r.tipo==='propietario'&&r.parteTipo==='persona'&&String(r.personaId)===String(ownPersona);});
        var loaned=rels.some(function(r){return r.tipo==='prestamo'&&String(r.personaId)===String(ownPersona);});
        if(owned||loaned)rows.push({item:item,owned:owned,loaned:loaned});
      });
      if(!rows.length){cards.textContent='No tienes equipos registrados ni equipos en préstamo.';return;}
      rows.forEach(function(row){
        var item=row.item,article=document.createElement('article'),meta=document.createElement('div');meta.className='meta';
        var strong=document.createElement('strong');strong.textContent=equipmentLabel(item);meta.appendChild(strong);
        var line=document.createElement('span');line.textContent=['Serie: '+(item.numeroSerie||'—'),'Estado: '+equipmentStateLabel(item),'Adquisición: '+(item.fechaAdquisicion||'—')].join(' · ');meta.appendChild(line);
        var relText=document.createElement('span');relText.textContent=row.owned?'Propietario: tú':'En préstamo contigo';meta.appendChild(relText);article.appendChild(meta);
        if(row.owned){var edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.addEventListener('click',function(item){return function(){fillEquipmentForm(item);};}(item));article.appendChild(edit);}
        else {var note=document.createElement('span');note.className='hint';note.textContent='Equipo prestado: solo puede modificarlo su propietario o un administrador.';article.appendChild(note);}
        cards.appendChild(article);
      });
    }
    function loadEquipmentData(){
      return as.getProfile().then(function(p){return p;}).catch(function(err){
        if(err&&err.status===404)return null;
        throw err;
      }).then(function(p){
        ownPersona=p&&(p._id||p.id)||null;
        if(!ownPersona){equipment=[];relations=[];renderEquipment();return;}
        return Promise.all([as.getEquipment(),as.getEquipmentRelations()]).then(function(results){
          equipment=Array.isArray(results[0])?results[0]:[];
          relations=Array.isArray(results[1])?results[1]:[];
          renderEquipment();
        });
      });
    }
    qf.addEventListener('submit',function(e){
      e.preventDefault();qSA.button.disabled=true;qSA.status.textContent='Guardando…';
      function personaGuard(){
        if(ownPersona)return Promise.resolve(ownPersona);
        return as.getProfile().then(function(p){var id=p&&(p._id||p.id)||null;if(!id)throw new Error('No existe un perfil de arquería para asociar el equipo.');ownPersona=id;return id;});
      }
      personaGuard().then(function(personaId){
        var data={tipo:qf.elements.tipo.value,marca:qf.elements.marca.value.trim()||null,modelo:qf.elements.modelo.value.trim()||null,numeroSerie:qf.elements.numeroSerie.value.trim()||null,fechaAdquisicion:qf.elements.fechaAdquisicion.value||null,fechaBaja:qf.elements.fechaBaja.value||null,estado:qf.elements.estado.value,notas:qf.elements.notas.value.trim()||null};
        if(editingId)data.id=editingId;
        var op=editingId?as.updateEquipment(data):as.createEquipment(data);
        return op.then(function(result){
          var saved=(result&&result.data)||result||data,id=saved.id||saved._id||editingId;
          if(!id)throw new Error('No se recibió el identificador del equipo.');
          return editingId?saved:as.createEquipmentRelation({equipoId:id,tipo:'propietario',parteTipo:'persona',personaId:personaId,empresa:null,vigenteDesde:data.fechaAdquisicion||new Date().toISOString(),notas:'Equipo personal'});
        });
      }).then(function(){qSA.status.textContent=editingId?'Equipo actualizado.':'Equipo registrado.';resetEquipmentForm();return loadEquipmentData();}).catch(function(err){qSA.status.textContent=err.message;}).finally(function(){qSA.button.disabled=false;});
    });
    root.appendChild(eqSection);

    function ensureOption(sel,value){
      if(sel&&value){var found=false;for(var i=0;i<sel.children.length;i++){if(sel.children[i].value===String(value)){found=true;break;}}
        if(!found){var o=document.createElement('option');o.value=value;o.textContent=value;sel.appendChild(o);}}
    }
    function fillAttrs(){
      attrFields.altura.value=attrValue(attributes,'altura','valorCm');
      attrFields.peso.value=attrValue(attributes,'peso','valorKg');
      attrFields.lateralidad.value=attrValue(attributes,'lateralidad','valor');
      attrFields.genero.value=attrValue(attributes,'genero','valor');
      attrFields.aperturaBrazos.value=attrValue(attributes,'aperturaBrazos','valorCm');
      attrFields.aperturaArco.value=attrValue(attributes,'aperturaArco','valorCm');
      attrFields.librajeActual.value=attrValue(attributes,'librajeActual','valorLbs');
      attrFields.variacionBase.value=attrValue(attributes,'variacionBase','valor');
      attrFields.posibilidadAdquisicion.value=attrValue(attributes,'posibilidadAdquisicion','valor');
      var d=currentAttribute(attributes,'documentoIdentidad')||{};
      var dTipo=d.tipoDocumento||'CI';
      ensureOption(docTipo,dTipo);
      docTipo.value=dTipo;
      var dPais=d.paisEmisor||'Bolivia';
      ensureOption(docPais,dPais);
      docPais.value=dPais;
      docNumero.value=d.numero||'';
      docPrincipal.checked=d.esPrincipal!==false;
    }

    obtainAttrs(aSA.status);
    loadEquipmentData();

    return root;
  };
})(window, document);