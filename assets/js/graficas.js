// assets/js/graficas.js — página /graficas/ (solo administrador).
// Espera window.STT.ready (auth.js), valida role 'admin' y pide los datos a
// /api/statetty/graficas. Dibuja con ECharts: barras apiladas para inmuebles
// nuevos y líneas apiladas con área para el stock de agentes por agencia.
//
// Filtros jerárquicos país → inmobiliaria → agencia. La serie del gráfico es
// siempre el nivel hijo del filtro más profundo elegido:
//   nada elegido      → una serie por país
//   país elegido      → una serie por inmobiliaria
//   inmobiliaria elegida → una serie por agencia
//   agencia elegida   → serie única
(function(){
  var charts={};
  var DATA={inmuebles:null,agentes:null};      // {meses,filas}
  var DIM={paises:new Set(),inmobs:new Set(),ags:new Map()}; // ag→{nombre,pais,inmobiliaria}
  var sel={pais:'todos',inmob:'todas',agencia:'todas'};

  function apiBase(){return (window.STATETTY_CONFIG&&STATETTY_CONFIG.WS_API_BASE)||'https://api.statetty.com/api/';}
  function token(){return (window.STT&&STT.getToken&&STT.getToken())||window.publicKey||null;}
  function api(rel){
    var t=token();
    if(!t) return Promise.resolve({ok:false,error:'sin_sesion'});
    return fetch(apiBase()+'statetty/graficas/'+rel,{headers:{'Authorization':'Bearer '+t}})
      .then(function(r){return r.json().catch(function(){return{ok:false,error:'respuesta_invalida'};});});
  }
  function esAdmin(){
    var u=(window.STT&&STT.getUsuario&&STT.getUsuario())||null;
    return !!(u&&(u.isAdmin===true||u.role==='admin'));
  }

  var PALETA=['#17baef','#eebf3f','#0e8fb8','#6dd0f5','#d4a82e','#7bc96f','#f2784b','#9b7ede','#4ecdc4','#e0688a','#95a5a6'];
  var MESES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var TOP_N=10;
  var SIN_PAIS='__sin_pais__', SIN_INMOB='__sin_inmob__', SIN_AG='__sin__';
  var PAISES={BO:'Bolivia',PE:'Perú'};
  var MARCAS={remax:'RE/MAX',c21:'Century 21',uc:'Ultra Casas',ic:'InfoCasas',kw:'Keller Williams',bieni:'Bien Inmuebles',bien:'Bien Inmuebles',idi:'IDI',sce:'Santa Cruz Estate',capital:'Capital Corporación',si:'Sin Intermediarios',laenc:'La Encontré',nexoi:'Nexo Inmobiliario',houstyle:'Houstyle',uno:'Uno',elfaro:'El Faro',statetty:'Statetty'};

  function etiquetaMes(ym){
    var p=String(ym).split('-');
    return (MESES[+p[1]-1]||p[1])+' '+String(p[0]).slice(2);
  }
  function nombreCorto(n){
    n=String(n||'—');
    return n.length>24?n.slice(0,23)+'…':n;
  }
  function etiquetaPais(p){return PAISES[p]||p||'Sin país';}
  function etiquetaMarca(m){return MARCAS[m]||(m?m.charAt(0).toUpperCase()+m.slice(1):'Sin inmobiliaria');}
  function etiquetaAgencia(f){return (f&&f.nombre)||'Sin agencia';}

  // Índice de dimensiones (unión de ambas fuentes) para las listas.
  function indexar(filas){
    (filas||[]).forEach(function(f){
      var p=f.pais||SIN_PAIS, m=f.inmobiliaria||SIN_INMOB;
      DIM.paises.add(p);DIM.inmobs.add(p+'|'+m);
      var prev=DIM.ags.get(f.ag);
      DIM.ags.set(f.ag,{nombre:(prev&&prev.nombre)||f.nombre||null,pais:p,inmobiliaria:m});
    });
  }

  function pasaFiltrosPaisInmob(p,m){
    return (sel.pais==='todos'||p===sel.pais)&&(sel.inmob==='todas'||m===sel.inmob);
  }
  function paisDeFila(f){return f.pais||SIN_PAIS;}
  function inmobDeFila(f){return f.inmobiliaria||SIN_INMOB;}

  // Opciones de cada <select> según el nivel ya filtrado (cascada).
  function llenarSelect(el,opciones,valor){
    el.innerHTML='';
    opciones.forEach(function(o){
      var op=document.createElement('option');
      op.value=o.v;op.textContent=o.t;
      el.appendChild(op);
    });
    el.value=opciones.some(function(o){return o.v===valor;})?valor:opciones[0].v;
    return el.value;
  }
  function refrescarSelects(){
    var paisOpts=[{v:'todos',t:'Todos'}];
    [...DIM.paises].sort().forEach(function(p){paisOpts.push({v:p,t:etiquetaPais(p==='__sin_pais__'?null:p)});});
    sel.pais=llenarSelect(document.getElementById('f-pais'),paisOpts,sel.pais);

    var inmobs=new Set();
    DIM.inmobs.forEach(function(k){
      var p=k.split('|')[0],m=k.split('|')[1];
      if(sel.pais==='todos'||p===sel.pais)inmobs.add(m);
    });
    var inmobOpts=[{v:'todas',t:'Todas'}];
    [...inmobs].sort(function(a,b){return etiquetaMarca(a===SIN_INMOB?null:a).localeCompare(etiquetaMarca(b===SIN_INMOB?null:b),'es');})
      .forEach(function(m){inmobOpts.push({v:m,t:etiquetaMarca(m===SIN_INMOB?null:m)});});
    sel.inmob=llenarSelect(document.getElementById('f-inmob'),inmobOpts,sel.inmob);

    var ags=[];
    DIM.ags.forEach(function(v,ag){
      if(pasaFiltrosPaisInmob(v.pais,v.inmobiliaria))ags.push({v:ag,t:v.nombre||'Sin agencia'});
    });
    ags.sort(function(a,b){return a.t.localeCompare(b.t,'es');});
    var agOpts=[{v:'todas',t:'Todas'}].concat(ags);
    sel.agencia=llenarSelect(document.getElementById('f-agencia'),agOpts,sel.agencia);
  }

  // Agrupa las filas según el filtro más profundo elegido → {meses,series}.
  function agrupar(data){
    var filas=(data.filas||[]).filter(function(f){
      return pasaFiltrosPaisInmob(paisDeFila(f),inmobDeFila(f))
        &&(sel.agencia==='todas'||f.ag===sel.agencia);
    });
    var dim=(sel.agencia!=='todas'||sel.inmob!=='todas')?'ag'
          :(sel.pais!=='todos')?'inmobiliaria':'pais';
    function claveYLabel(f){
      if(dim==='pais'){var p=paisDeFila(f);return[p,p===SIN_PAIS?'Sin país':etiquetaPais(p)];}
      if(dim==='inmobiliaria'){var m=inmobDeFila(f);return[m,m===SIN_INMOB?'Sin inmobiliaria':etiquetaMarca(m)];}
      return[f.ag,etiquetaAgencia(f)];
    }
    var grupos={};
    filas.forEach(function(f){
      var cl=claveYLabel(f),g=grupos[cl[0]]||(grupos[cl[0]]={nombre:cl[1],datos:new Array(data.meses.length).fill(0),total:0});
      f.datos.forEach(function(n,i){g.datos[i]+=n;g.total+=n;});
    });
    var orden=Object.keys(grupos).sort(function(a,b){return grupos[b].total-grupos[a].total;});
    var series=orden.slice(0,TOP_N).map(function(k){return{nombre:grupos[k].nombre,datos:grupos[k].datos};});
    if(orden.length>TOP_N){
      var otras=new Array(data.meses.length).fill(0);
      orden.slice(TOP_N).forEach(function(k){grupos[k].datos.forEach(function(n,i){otras[i]+=n;});});
      series.push({nombre:'Otras',datos:otras});
    }
    return{meses:data.meses,series:series};
  }

  function tooltipDetalle(){
    return function(params){
      params=(params||[]).slice().sort(function(a,b){return (b.value||0)-(a.value||0);});
      var total=0,lineas='';
      params.forEach(function(p){
        total+=p.value||0;
        lineas+=p.marker+' '+nombreCorto(p.seriesName)+': <b>'+(p.value||0)+'</b><br/>';
      });
      return '<div style="font-weight:700;margin-bottom:4px">'+(params[0]?params[0].axisValueLabel:'')+'</div>'
        +lineas
        +'<div style="border-top:1px solid #eee;margin-top:5px;padding-top:5px">Total: <b>'+total+'</b></div>';
    };
  }

  function opciones(data,modo){
    var esBarra=(modo==='barra');
    return {
      color:PALETA,
      textStyle:{fontFamily:'Lato,sans-serif'},
      animationDuration:600,
      tooltip:{
        trigger:'axis',
        axisPointer:{type:esBarra?'shadow':'line'},
        formatter:tooltipDetalle(),
        backgroundColor:'#fff',
        borderColor:'#e6e6e6',
        textStyle:{color:'#444',fontSize:12},
        extraCssText:'box-shadow:0 8px 26px rgba(7,79,102,.16);border-radius:10px;padding:10px 12px;max-height:60vh;overflow:auto;'
      },
      legend:{type:'scroll',bottom:0,icon:'roundRect',itemWidth:12,itemHeight:12,itemGap:14,textStyle:{color:'#555',fontSize:12},pageIconColor:'#17baef',pageTextStyle:{color:'#777'}},
      grid:{top:44,left:10,right:18,bottom:86,containLabel:true},
      toolbox:{right:6,top:0,itemSize:15,iconStyle:{borderColor:'#888'},feature:{saveAsImage:{title:'Guardar imagen',name:'grafica'}}},
      dataZoom:[
        {type:'inside',zoomOnMouseWheel:true,moveOnMouseMove:true},
        {type:'slider',height:20,bottom:48,borderColor:'#e6e6e6',fillerColor:'rgba(23,186,239,.14)',handleStyle:{color:'#17baef'},moveHandleStyle:{color:'#17baef'},dataBackground:{lineStyle:{color:'#ccc'},areaStyle:{color:'#eee'}},textStyle:{color:'#999',fontSize:10}}
      ],
      xAxis:{type:'category',data:data.meses.map(etiquetaMes),axisTick:{show:false},axisLine:{lineStyle:{color:'#ddd'}},axisLabel:{color:'#777',fontSize:11}},
      yAxis:{type:'value',minInterval:1,axisLabel:{color:'#777',fontSize:11},splitLine:{lineStyle:{color:'#eee'}}},
      series:data.series.map(function(s){
        var base={name:nombreCorto(s.nombre),data:s.datos,emphasis:{focus:'series'}};
        if(esBarra){
          base.type='bar';base.stack='total';base.barMaxWidth=36;
        }else{
          base.type='line';base.stack='total';base.smooth=true;base.symbol='none';base.lineStyle={width:1.6};base.areaStyle={opacity:.28};
        }
        return base;
      })
    };
  }

  function estado(id,txt,esError){
    var el=document.getElementById('estado-'+id);
    if(!el)return;
    el.textContent=txt;
    el.classList.toggle('error',!!esError);
    el.hidden=!txt;
  }
  function bloqueVisible(id){
    var b=document.getElementById('bloque-'+id);
    if(b)b.hidden=false;
  }

  function repintar(id,modo){
    var data=DATA[id];
    if(!data)return;
    var el=document.getElementById('chart-'+id);
    if(!el||!window.echarts)return;
    var agrupado=agrupar(data);
    estado(id,agrupado.series.length?'':'Sin datos para este filtro.');
    el.hidden=!agrupado.series.length;
    if(!agrupado.series.length)return;
    if(charts[id])charts[id].dispose();
    charts[id]=echarts.init(el);
    charts[id].setOption(opciones(agrupado,modo),true);
  }
  function repintarTodo(){
    repintar('inmuebles','barra');
    repintar('agentes','barra');
  }

  function cargar(id){
    estado(id,'Cargando datos…');
    return api(id).then(function(r){
      if(!r||!r.ok){estado(id,'No se pudieron cargar los datos.',true);return;}
      if(!r.data||!r.data.meses||!r.data.meses.length){estado(id,'Todavía no hay datos para mostrar.');return;}
      DATA[id]=r.data;
      indexar(r.data.filas);
      estado(id,'');
    }).catch(function(){estado(id,'No se pudieron cargar los datos.',true);});
  }

  function gate(titulo,texto,conBoton){
    var g=document.getElementById('graf-gate');
    document.getElementById('graf-gate-titulo').textContent=titulo;
    document.getElementById('graf-gate-texto').textContent=texto;
    document.getElementById('graf-gate-btn').hidden=!conBoton;
    g.hidden=false;
  }

  var pedido=false;
  function init(){
    if(!esAdmin()){
      var u=window.STT&&STT.getUsuario&&STT.getUsuario();
      if(u) gate('Acceso restringido','Tu cuenta no tiene permiso para ver esta página.',false);
      else gate('Acceso restringido','Esta página es solo para el administrador. Iniciá sesión para continuar.',true);
      return;
    }
    document.getElementById('graf-gate').hidden=true;
    document.getElementById('graf-filtros').hidden=false;
    bloqueVisible('inmuebles');
    bloqueVisible('agentes');
    if(pedido)return;
    pedido=true;
    Promise.all([cargar('inmuebles'),cargar('agentes')]).then(function(){
      refrescarSelects();
      repintarTodo();
    });
  }

  // Cambios en los filtros: cascada hacia abajo y repintado sin refetch.
  document.getElementById('f-pais').addEventListener('change',function(e){
    sel.pais=e.target.value;sel.inmob='todas';sel.agencia='todas';
    refrescarSelects();repintarTodo();
  });
  document.getElementById('f-inmob').addEventListener('change',function(e){
    sel.inmob=e.target.value;sel.agencia='todas';
    refrescarSelects();repintarTodo();
  });
  document.getElementById('f-agencia').addEventListener('change',function(e){
    sel.agencia=e.target.value;repintarTodo();
  });

  document.getElementById('graf-gate-btn').addEventListener('click',function(){
    if(window.STT&&STT.startLogin)STT.startLogin();
  });
  window.addEventListener('resize',function(){
    Object.keys(charts).forEach(function(k){charts[k].resize();});
  });

  // STT.ready resuelve una vez terminado el flujo de auth; statetty:auth-ready
  // cubre el login tardío (el usuario se loguea desde esta misma página).
  if(window.STT&&STT.ready&&STT.ready.then){STT.ready.then(init);}
  else{init();}
  document.addEventListener('statetty:auth-ready',init);
})();
