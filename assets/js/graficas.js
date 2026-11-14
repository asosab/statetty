// assets/js/graficas.js — página /graficas/ (solo administrador).
// Espera window.STT.ready (auth.js), valida role 'admin' y pide los datos a
// /api/statetty/graficas. Dibuja con ECharts: barras apiladas para inmuebles
// nuevos y líneas apiladas con área para el stock de agentes por agencia.
(function(){
  var charts={};

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

  function etiquetaMes(ym){
    var p=String(ym).split('-');
    return (MESES[+p[1]-1]||p[1])+' '+String(p[0]).slice(2);
  }
  function nombreCorto(n){
    n=String(n||'—');
    return n.length>24?n.slice(0,23)+'…':n;
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

  function pintar(id,data,modo){
    var el=document.getElementById('chart-'+id);
    if(!el||!window.echarts)return;
    estado(id,'');
    el.hidden=false;
    if(charts[id])charts[id].dispose();
    charts[id]=echarts.init(el);
    charts[id].setOption(opciones(data,modo));
  }

  function cargar(id,modo){
    estado(id,'Cargando datos…');
    api(id).then(function(r){
      if(!r||!r.ok){estado(id,'No se pudieron cargar los datos.',true);return;}
      if(!r.data||!r.data.meses||!r.data.meses.length){estado(id,'Todavía no hay datos para mostrar.');return;}
      pintar(id,r.data,modo);
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
    bloqueVisible('inmuebles');
    bloqueVisible('agentes');
    if(pedido)return;
    pedido=true;
    cargar('inmuebles','barra');
    cargar('agentes','linea');
  }

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
