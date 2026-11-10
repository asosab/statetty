// assets/js/utilbox.js — «Dashboard Statetty»: contenedor de cajas de
// utilidades para el administrador, disponible en cualquier página.
//
// Este archivo solo dibuja el marco (botón flotante + panel lateral). El
// catálogo de cajas, la vista de cada una (html/css/js) y sus datos llegan por
// API: GET statetty/utilbox, GET statetty/utilbox/caja/<id> y
// statetty/utilbox/datos/<caja>/<accion>. Todo exige sesión Buddy con
// role 'admin'; sin sesión o sin rol el botón ni siquiera se monta.
//
// Se carga desde _includes/headBuddy.html (y las páginas standalone que
// replican sus etiquetas), después de auth.js. Depende de window.STT:
//   STT.getToken()   → Bearer JWT Buddy
//   STT.getUsuario() → usuario combinado (isAdmin / role)
//   STT.ready        → resuelve al terminar el flujo de auth.js
(function(){
  var ID_BTN='stt-ubx-btn', ID_PANEL='stt-ubx', ID_BACK='stt-ubx-back',
      ID_BODY='stt-ubx-body', ID_CSS='stt-ubx-css', ID_BACKBTN='stt-ubx-volver';
  var catalogo=null, cajaVista={};

  function apiBase(){return (window.STATETTY_CONFIG&&STATETTY_CONFIG.WS_API_BASE)||'https://api.statetty.com/api/';}
  function token(){return (window.STT&&STT.getToken&&STT.getToken())||window.publicKey||null;}
  function api(rel,opts){
    var t=token();
    if(!t) return Promise.resolve({ok:false,error:'sin_sesion'});
    opts=opts||{};
    opts.headers=Object.assign({'Authorization':'Bearer '+t},opts.headers||{});
    if(opts.body&&typeof opts.body!=='string'){
      opts.headers['Content-Type']='application/json';
      opts.body=JSON.stringify(opts.body);
    }
    return fetch(apiBase()+'statetty/utilbox/'+rel,opts).then(function(r){return r.json().catch(function(){return{ok:false,error:'respuesta_invalida'};});});
  }
  function esAdmin(){
    var u=(window.STT&&STT.getUsuario&&STT.getUsuario())||null;
    return !!(u&&(u.isAdmin===true||u.role==='admin'));
  }
  function esc(s){var d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML;}

  // ── estilos del marco ─────────────────────────────────────────────────────
  function inyectarCss(){
    if(document.getElementById(ID_CSS))return;
    var st=document.createElement('style');st.id=ID_CSS;
    st.textContent=
      '#'+ID_BTN+'{position:fixed;left:14px;bottom:14px;z-index:1180;width:44px;height:44px;border-radius:50%;border:none;background:#074f66;color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;padding:0}'+
      '#'+ID_BTN+':hover{background:#0a6a88}'+
      '#'+ID_BACK+'{position:fixed;inset:0;z-index:2147482988;background:rgba(7,52,63,.45)}'+
      '#'+ID_PANEL+'{position:fixed;top:0;right:0;bottom:0;width:min(400px,94vw);z-index:2147482989;background:#fff;box-shadow:-12px 0 40px rgba(0,0,0,.25);display:flex;flex-direction:column;font-family:Lato,Arial,sans-serif}'+
      '#'+ID_PANEL+' .ubx-head{display:flex;align-items:center;gap:8px;background:#074f66;color:#fff;padding:12px 14px;flex:0 0 auto}'+
      '#'+ID_PANEL+' .ubx-head h2{margin:0;font-size:16px;font-weight:700;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
      '#'+ID_PANEL+' .ubx-head button{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:2px 6px;line-height:1}'+
      '#'+ID_BACKBTN+'{visibility:hidden}'+
      '#'+ID_PANEL+' .ubx-body{flex:1;overflow-y:auto;padding:14px}'+
      '#'+ID_PANEL+' .ubx-caja-item{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:#f4fafd;border:1px solid #d9ecf5;border-radius:10px;padding:12px;margin-bottom:10px;cursor:pointer;font-family:Lato,Arial,sans-serif}'+
      '#'+ID_PANEL+' .ubx-caja-item:hover{background:#e6f5fc;border-color:#17baef}'+
      '#'+ID_PANEL+' .ubx-caja-ico{font-size:22px;line-height:1}'+
      '#'+ID_PANEL+' .ubx-caja-tit{font-weight:700;color:#074f66;font-size:15px}'+
      '#'+ID_PANEL+' .ubx-caja-desc{color:#43555d;font-size:12px;margin-top:2px}'+
      '#'+ID_PANEL+' .ubx-msg{color:#7b8f99;font-size:13px;padding:12px 2px}';
    document.head.appendChild(st);
  }

  function panel(){return document.getElementById(ID_PANEL);}
  function body(){return document.getElementById(ID_BODY);}

  // ── armado / desarmado ────────────────────────────────────────────────────
  function montar(){
    inyectarCss();
    if(document.getElementById(ID_BTN))return;
    var back=document.createElement('div');back.id=ID_BACK;back.hidden=true;
    back.addEventListener('click',cerrar);
    var p=document.createElement('aside');p.id=ID_PANEL;p.hidden=true;
    p.setAttribute('aria-label','Dashboard Statetty');
    p.innerHTML=
      '<div class="ubx-head">'+
        '<button id="'+ID_BACKBTN+'" type="button" aria-label="Volver al listado">‹</button>'+
        '<h2>Dashboard Statetty</h2>'+
        '<button id="stt-ubx-x" type="button" aria-label="Cerrar">✕</button>'+
      '</div><div class="ubx-body" id="'+ID_BODY+'"></div>';
    var b=document.createElement('button');b.id=ID_BTN;b.type='button';
    b.title='Dashboard Statetty';b.setAttribute('aria-label','Abrir Dashboard Statetty');
    b.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>';
    b.addEventListener('click',abrir);
    document.body.appendChild(back);
    document.body.appendChild(p);
    document.body.appendChild(b);
    p.querySelector('#stt-ubx-x').addEventListener('click',cerrar);
    p.querySelector('#'+ID_BACKBTN).addEventListener('click',mostrarCatalogo);
    document.addEventListener('keydown',onEsc);
  }

  function desmontar(){
    [ID_BTN,ID_PANEL,ID_BACK].forEach(function(id){var n=document.getElementById(id);if(n)n.remove();});
    document.removeEventListener('keydown',onEsc);
    catalogo=null;cajaVista={};
  }

  function onEsc(e){if(e.key==='Escape'&&!panel().hidden)cerrar();}

  // ── panel ─────────────────────────────────────────────────────────────────
  function abrir(){
    panel().hidden=false;
    document.getElementById(ID_BACK).hidden=false;
    if(catalogo===null){
      body().innerHTML='<div class="ubx-msg">Cargando…</div>';
      api('').then(function(r){
        catalogo=(r&&r.ok&&Array.isArray(r.cajas))?r.cajas:[];
        mostrarCatalogo();
      }).catch(function(){catalogo=[];mostrarCatalogo();});
    }else{mostrarCatalogo();}
  }
  function cerrar(){
    panel().hidden=true;
    document.getElementById(ID_BACK).hidden=true;
  }

  function mostrarCatalogo(){
    document.getElementById(ID_BACKBTN).style.visibility='hidden';
    if(!catalogo||!catalogo.length){
      body().innerHTML='<div class="ubx-msg">No hay cajas disponibles.</div>';
      return;
    }
    body().innerHTML=catalogo.map(function(c){
      return '<button type="button" class="ubx-caja-item" data-id="'+esc(c.id)+'">'+
        '<span class="ubx-caja-ico">'+esc(c.icono||'▣')+'</span>'+
        '<span><span class="ubx-caja-tit">'+esc(c.titulo||c.id)+'</span>'+
        (c.descripcion?'<div class="ubx-caja-desc">'+esc(c.descripcion)+'</div>':'')+
        '</span></button>';
    }).join('');
    body().querySelectorAll('.ubx-caja-item').forEach(function(item){
      item.addEventListener('click',function(){abrirCaja(item.dataset.id);});
    });
  }

  function abrirCaja(id){
    body().innerHTML='<div class="ubx-msg">Cargando…</div>';
    api('caja/'+encodeURIComponent(id)).then(function(r){
      if(!r||!r.ok||!r.caja){
        body().innerHTML='<div class="ubx-msg">No se pudo cargar la caja.</div>';
        return;
      }
      var caja=r.caja;
      if(caja.css&&!cajaVista[id+'_css']){
        var st=document.createElement('style');
        st.setAttribute('data-ubx',id);st.textContent=caja.css;
        document.head.appendChild(st);
        cajaVista[id+'_css']=true;
      }
      body().innerHTML=caja.html||'';
      document.getElementById(ID_BACKBTN).style.visibility='visible';
      if(caja.js){
        try{
          var fn=new Function('ctx','return ('+caja.js+');')();
          fn({el:body(),api:api,cerrar:cerrar,volver:mostrarCatalogo,
              usuario:(window.STT&&STT.getUsuario&&STT.getUsuario())||null});
        }catch(e){console.log('[Statetty] [error] utilbox caja '+id+':',e&&e.message||e);}
      }
    }).catch(function(){
      body().innerHTML='<div class="ubx-msg">No se pudo cargar la caja.</div>';
    });
  }

  // ── arranque: solo con sesión de admin ────────────────────────────────────
  function evaluar(){
    if(esAdmin()){montar();}
    else if(document.getElementById(ID_BTN)){desmontar();}
  }

  function listo(fn){
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);}
    else{fn();}
  }

  listo(function(){
    if(!window.STT)return; // página sin auth.js: nada que hacer
    var ready=window.STT.ready&&typeof window.STT.ready.then==='function'?window.STT.ready:Promise.resolve();
    ready.then(evaluar);
    // Login tardío (magic link / Buddy en otra pestaña) y logout.
    document.addEventListener('statetty:auth-ready',evaluar);
    document.addEventListener('statetty:key-ready',evaluar);
  });
})();
