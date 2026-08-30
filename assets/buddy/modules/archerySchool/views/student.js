/** ArcherySchool — vista del estudiante. Presentación + interacción con el servicio. */
window.BuddyArcherySchoolViews = window.BuddyArcherySchoolViews || {};
(function (window, document) {
  'use strict';

  function styles() {
    if (document.getElementById('buddy-archery-school-student-styles')) return;
    var s=document.createElement('style');s.id='buddy-archery-school-student-styles';
    s.textContent=[
      '.buddy-as-student{font:inherit;display:grid;gap:18px;max-width:900px}',
      '.buddy-as-student section{border:1px solid #ddd;border-radius:12px;padding:18px}',
      '.buddy-as-student form{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}',
      '.buddy-as-student label{display:grid;gap:6px}',
      '.buddy-as-student input,.buddy-as-student select,.buddy-as-student textarea,.buddy-as-student button{font:inherit;padding:9px;border:1px solid #ccc;border-radius:8px}',
      '.buddy-as-student textarea{min-height:80px;resize:vertical}',
      '.buddy-as-student .wide{grid-column:1/-1}',
      '.buddy-as-student .actions{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
      '.buddy-as-student .status{grid-column:1/-1;min-height:1.3em}',
      '.buddy-as-student .cards{display:grid;gap:8px;margin-top:14px}',
      '.buddy-as-student article{border:1px solid #eee;border-radius:10px;padding:12px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}',
      '.buddy-as-student article .meta{display:grid;gap:3px}',
      '.buddy-as-student article button{padding:6px 9px;cursor:pointer}',
      '.buddy-as-student .hint{opacity:.75;font-size:.92em}'
    ].join('');
    document.head.appendChild(s);
  }
  function current(state,type){
    var a=(state.attributes||[]).filter(function(x){return x&&x.tipo===type&&!x.vigenteHasta;});
    return a.length?a[a.length-1]:null;
  }
  function value(state,type,key){
    var a=current(state,type);return a&&a[key]!=null?a[key]:'';
  }
  function label(options,value){
    for(var i=0;i<(options||[]).length;i++){
      if((options[i].value||options[i])===value) return options[i].label||options[i];
    }
    return value||'';
  }
  function input(form,labelText,name,value,type,required){
    var l=document.createElement('label');l.textContent=labelText;
    var i=document.createElement('input');i.name=name;i.type=type||'text';i.value=value==null?'':value;
    if(required)i.required=true;l.appendChild(i);form.appendChild(l);return i;
  }
  function select(form,labelText,name,options,value,required){
    var l=document.createElement('label');l.textContent=labelText;
    var s=document.createElement('select');s.name=name;
    var empty=document.createElement('option');empty.value='';empty.textContent='Selecciona';s.appendChild(empty);
    (options||[]).forEach(function(o){var x=document.createElement('option');x.value=o.value||o;x.textContent=o.label||o;x.selected=(x.value===String(value||''));s.appendChild(x);});
    if(required)s.required=true;l.appendChild(s);form.appendChild(l);return s;
  }
  function statusAndButton(form,text){
    var st=document.createElement('div');st.className='status';var actions=document.createElement('div');actions.className='actions';
    var b=document.createElement('button');b.type='submit';b.textContent=text;actions.appendChild(b);form.appendChild(st);form.appendChild(actions);return {status:st,button:b};
  }

  window.BuddyArcherySchoolViews.student=function(context){
    styles();
    var target=context.target,api=context.api,state=context.state||{},config=context.config||{};
    target.innerHTML='';
    var root=document.createElement('div');root.className='buddy-as-student';

    var title=document.createElement('h2');title.textContent=config.appName||config.schoolName||'🏹 ArcherySchool';root.appendChild(title);
    var intro=document.createElement('p');intro.className='hint';intro.textContent='Aquí puedes consultar y actualizar los datos de '+(config.appName||'ArcherySchool')+' que te corresponde administrar, así como tus equipos.';root.appendChild(intro);

    /* CONDICIONES FÍSICAS PERMANENTES */
    var health=document.createElement('section');var hh=document.createElement('h3');hh.textContent='Condiciones físicas permanentes';health.appendChild(hh);
    var hf=document.createElement('form');
    var hl=document.createElement('label');hl.className='wide';hl.textContent='Condiciones (una por línea)';
    var ta=document.createElement('textarea');ta.name='condicionesFisicasPermanentes';
    var currentUser=context.user||(window.Buddy.user&&window.Buddy.user.getState&&window.Buddy.user.getState().user)||{};
    ta.value=Array.isArray(currentUser.condicionesFisicasPermanentes)?currentUser.condicionesFisicasPermanentes.join('\n'):'';
    hl.appendChild(ta);hf.appendChild(hl);
    var hs=statusAndButton(hf,'Guardar condiciones');health.appendChild(hf);
    hf.addEventListener('submit',function(e){
      e.preventDefault();hs.button.disabled=true;hs.status.textContent='Guardando…';
      var conditions=ta.value.split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);
      var userApi=window.Buddy.user;
      if(!userApi||typeof userApi.updateProfile!=='function'){hs.status.textContent='El módulo User no está disponible.';hs.button.disabled=false;return;}
      userApi.updateProfile({condicionesFisicasPermanentes:conditions}).then(function(){
        if(currentUser) currentUser.condicionesFisicasPermanentes=conditions;
        hs.status.textContent='Condiciones guardadas.';
      }).catch(function(err){hs.status.textContent=err.message;}).finally(function(){hs.button.disabled=false;});
    });
    root.appendChild(health);


    /* ATRIBUTOS */
    var attrs=document.createElement('section');var ah=document.createElement('h3');ah.textContent='Medidas y características de arquería';attrs.appendChild(ah);
    var af=document.createElement('form');
    input(af,'Altura (cm)','altura',value(state,'altura','valorCm'),'number',false);
    input(af,'Peso (kg)','peso',value(state,'peso','valorKg'),'number',false);
    select(af,'Lateralidad','lateralidad',config.lateralidad||[],value(state,'lateralidad','valor'),false);
    select(af,'Género','genero',config.genero||[],value(state,'genero','valor'),false);
    input(af,'Apertura de brazos (cm)','aperturaBrazos',value(state,'aperturaBrazos','valorCm'),'number',false);
    input(af,'Apertura de arco (cm)','aperturaArco',value(state,'aperturaArco','valorCm'),'number',false);
    input(af,'Libraje actual (lbs)','librajeActual',value(state,'librajeActual','valorLbs'),'number',false);
    input(af,'Variación base','variacionBase',value(state,'variacionBase','valor'),'text',false);
    select(af,'Posibilidad de adquisición','posibilidadAdquisicion',config.posibilidadAdquisicion||[],value(state,'posibilidadAdquisicion','valor'),false);
    var source=select(af,'Fuente de los datos','fuente',config.attributeSources||[],'autorreportado',false);
    var as=statusAndButton(af,'Guardar medidas');attrs.appendChild(af);
    af.addEventListener('submit',function(e){
      e.preventDefault();as.button.disabled=true;as.status.textContent='Guardando…';
      var jobs=[];
      function add(type,key,cast){
        var v=af.elements[type]&&af.elements[type].value;if(v==null||v==='')return;
        var d={personaId:state.profile&&(state.profile.id||state.profile._id),tipo:type,sitio:config.siteId||((window.BuddyConfig||{}).app||{}).siteId||null,fuente:source.value||'autorreportado'};
        d[key]=cast?cast(v):v;jobs.push(api.setAttribute(d));
      }
      add('altura','valorCm',Number);add('peso','valorKg',Number);add('lateralidad','valor');add('genero','valor');
      add('aperturaBrazos','valorCm',Number);add('aperturaArco','valorCm',Number);add('librajeActual','valorLbs',Number);
      add('variacionBase','valor');add('posibilidadAdquisicion','valor');
      Promise.all(jobs).then(function(){as.status.textContent='Medidas guardadas.';}).catch(function(err){as.status.textContent=err.message;}).finally(function(){as.button.disabled=false;});
    });
    root.appendChild(attrs);

    /* DOCUMENTO */
    var doc=document.createElement('section');var dh=document.createElement('h3');dh.textContent='Documento de identidad';doc.appendChild(dh);
    var d=current(state,'documentoIdentidad')||{};var df=document.createElement('form');
    input(df,'Tipo de documento','tipoDocumento',d.tipoDocumento||'CI','text',true);
    input(df,'Número','numero',d.numero||'','text',true);
    input(df,'País emisor','paisEmisor',d.paisEmisor||'','text',true);
    var principal=input(df,'Es documento principal','esPrincipal','','checkbox',false);principal.checked=d.esPrincipal!==false;
    var ds=statusAndButton(df,'Guardar documento');doc.appendChild(df);
    df.addEventListener('submit',function(e){
      e.preventDefault();ds.button.disabled=true;
      api.setAttribute({personaId:state.profile&&(state.profile.id||state.profile._id),tipo:'documentoIdentidad',tipoDocumento:df.elements.tipoDocumento.value.trim(),numero:df.elements.numero.value.trim(),paisEmisor:df.elements.paisEmisor.value.trim(),esPrincipal:df.elements.esPrincipal.checked,fuente:'autorreportado'})
        .then(function(){ds.status.textContent='Documento guardado.';}).catch(function(err){ds.status.textContent=err.message;}).finally(function(){ds.button.disabled=false;});
    });
    root.appendChild(doc);

    /* EQUIPOS */
    var eq=document.createElement('section');var qh=document.createElement('h3');qh.textContent='Mis equipos';eq.appendChild(qh);
    var qhint=document.createElement('p');qhint.className='hint';qhint.textContent='Puedes crear y modificar los equipos de los que eres propietario. Los equipos que la escuela u otra persona te presta aparecen como préstamo y no puedes modificar sus datos.';eq.appendChild(qhint);
    var qf=document.createElement('form');
    select(qf,'Tipo de equipo','tipo',config.equipmentTypes||[],'',true);
    input(qf,'Marca','marca','','text',false);input(qf,'Modelo','modelo','','text',false);input(qf,'Número de serie','numeroSerie','','text',false);
    input(qf,'Fecha de adquisición','fechaAdquisicion','','date',false);input(qf,'Fecha de baja','fechaBaja','','date',false);
    select(qf,'Estado','estado',config.equipmentStates||[],'activo',true);input(qf,'Notas','notas','','text',false);
    var qs=statusAndButton(qf,'Registrar mi equipo');eq.appendChild(qf);
    var cards=document.createElement('div');cards.className='cards';eq.appendChild(cards);

    var currentOwnerId=state.profile&&(state.profile.id||state.profile._id);
    var editingId=null;
    function resetEquipmentForm(){
      qf.reset();qf.elements.estado.value='activo';editingId=null;qs.button.textContent='Registrar mi equipo';
    }
    function fillEquipment(item){
      editingId=item&&(item.id||item._id)||null;qf.elements.tipo.value=item&&item.tipo||'';qf.elements.marca.value=item&&item.marca||'';qf.elements.modelo.value=item&&item.modelo||'';qf.elements.numeroSerie.value=item&&item.numeroSerie||'';
      qf.elements.fechaAdquisicion.value=item&&item.fechaAdquisicion?String(item.fechaAdquisicion).slice(0,10):'';qf.elements.fechaBaja.value=item&&item.fechaBaja?String(item.fechaBaja).slice(0,10):'';qf.elements.estado.value=item&&item.estado||'activo';qf.elements.notas.value=item&&item.notas||'';
      qs.button.textContent='Guardar cambios';qs.status.textContent='Editando tu equipo.';qf.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
    function renderEquipment(){
      cards.innerHTML='';
      var all=state.equipment||[],relations=state.equipmentRelations||[];
      var rows=[];
      all.forEach(function(item){
        var id=item.id||item._id;
        var rels=relations.filter(function(r){return String(r.equipoId)===String(id)&&!r.vigenteHasta;});
        var owned=rels.some(function(r){return r.tipo==='propietario'&&r.parteTipo==='persona'&&String(r.personaId)===String(currentOwnerId);});
        var loaned=rels.some(function(r){return r.tipo==='prestamo'&&r.parteTipo==='persona'&&String(r.personaId)===String(currentOwnerId);});
        if(owned||loaned)rows.push({item:item,owned:owned,loaned:loaned,rels:rels});
      });
      if(!rows.length){cards.textContent='No tienes equipos registrados ni equipos en préstamo.';return;}
      rows.forEach(function(row){
        var item=row.item,article=document.createElement('article'),meta=document.createElement('div');meta.className='meta';
        var strong=document.createElement('strong');strong.textContent=[item.tipo,item.marca,item.modelo].filter(Boolean).join(' · ')||'Equipo';meta.appendChild(strong);
        var line=document.createElement('span');line.textContent=['Serie: '+(item.numeroSerie||'—'),'Estado: '+label(config.equipmentStates,item.estado),'Adquisición: '+(item.fechaAdquisicion||'—')].join(' · ');meta.appendChild(line);
        var relText=document.createElement('span');relText.textContent=row.owned?'Propietario: tú':'En préstamo contigo';meta.appendChild(relText);article.appendChild(meta);
        if(row.owned){var edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.addEventListener('click',function(){fillEquipment(item);});article.appendChild(edit);}
        else {var note=document.createElement('span');note.className='hint';note.textContent='Equipo prestado: solo puede modificarlo su propietario o un administrador.';article.appendChild(note);}
        cards.appendChild(article);
      });
    }
    qf.addEventListener('submit',function(e){
      e.preventDefault();qs.button.disabled=true;qs.status.textContent='Guardando…';
      var data={tipo:qf.elements.tipo.value,marca:qf.elements.marca.value.trim()||null,modelo:qf.elements.modelo.value.trim()||null,numeroSerie:qf.elements.numeroSerie.value.trim()||null,fechaAdquisicion:qf.elements.fechaAdquisicion.value||null,fechaBaja:qf.elements.fechaBaja.value||null,estado:qf.elements.estado.value,notas:qf.elements.notas.value.trim()||null};
      if(editingId)data.id=editingId;
      var op=editingId?api.updateEquipment(data):api.createEquipment(data);
      op.then(function(result){
        var saved=(result&&result.data)||result||data,eq=saved&&saved.equipment;
        var id=saved.id||saved._id||(eq&&(eq.id||eq._id))||editingId;
        if(!id)throw new Error('No se recibió el identificador del equipo.');
        return saved;
      }).then(function(){qs.status.textContent=editingId?'Equipo actualizado.':'Equipo registrado.';resetEquipmentForm();return api.getEquipment({personaId:currentOwnerId});}).then(function(){renderEquipment();}).catch(function(err){qs.status.textContent=err.message;}).finally(function(){qs.button.disabled=false;});
    });
    root.appendChild(eq);renderEquipment();

    target.appendChild(root);return root;
  };
})(window, document);
