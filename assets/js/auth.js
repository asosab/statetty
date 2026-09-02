(function(){
  // ─────────────────────────────────────────────────────────────────────────
  // assets/js/auth.js — Autenticación unificada Statetty vía Buddy (email JWT).
  //
  // Reemplaza al legacy user.js (publicKey de Telegram) manteniendo la MISMA
  // interfaz expuesta en window.STT para no romper mapa.js, menuUser.js,
  // inmueblesPdf.js, fndInm.js, registro/ y contacto.html.
  //
  // Flujo:
  //   1. Espera a que Buddy esté listo (window.Buddy.readyPromise / buddy:ready).
  //   2. Si Buddy tiene accessToken → GET statetty/auth/me con Bearer JWT.
  //   3. La respuesta trae { buddy, tg, linked } → expone usuario combinado.
  //   4. Difficulty: mantiene fallback legacy `?k=` publicKey durante transición.
  //
  // API pública (compat):
  //   window.STT.getKey()          → JWT Buddy (o publicKey legacy)
  //   window.STT.getToken()        → JWT Buddy (alias explícito)
  //   window.STT.getUsuario()      → usuario combinado (buddy+tg)
  //   window.STT.getBuddy()        → datos BuddyUser
  //   window.STT.getTg()           → datos tgUser
  //   window.STT.linked            → bool (si hay vínculo tg↔buddy)
  //   window.STT.ready             → Promise (se resuelve al terminar el flujo)
  //   window.STT.login(email)      → inicia magic link Buddy
  //   window.STT.startLogin()      → abre el form de login de Buddy
  //   window.STT.logout()          → cierra sesión
  //   evento 'statetty:key-ready' (detail {key, usuario, error}) — compat
  //   evento 'statetty:auth-ready' (detail {token, buddy, tg, linked, error})
  // ─────────────────────────────────────────────────────────────────────────

  var COOKIE_NAME='stt_pk',COOKIE_DOMAIN='.statetty.com',COOKIE_PATH='/';

  function readCookie(name){
    var m=document.cookie.match(new RegExp('(^| )'+name+'=([^;]+)'));
    return m?decodeURIComponent(m[2]):null;
  }
  function clearCookie(name){
    document.cookie=name+'=; Max-Age=0; Path='+COOKIE_PATH+'; Domain='+COOKIE_DOMAIN;
  }
  function getApiBase(){return (window.STATETTY_CONFIG&&STATETTY_CONFIG.WS_API_BASE)||'https://api.statetty.com/api/';}

  window.STT=window.STT||{};
  window.STT.usuario=null;
  window.STT.buddy=null;
  window.STT.tg=null;
  window.STT.linked=false;
  window.STT.token=null;
  window.STT.getKey=function(){return window.STT.token||window.publicKey||null;};
  window.STT.getToken=function(){return window.STT.token||null;};
  window.STT.getUsuario=function(){return window.STT.usuario;};
  window.STT.getBuddy=function(){return window.STT.buddy;};
  window.STT.getTg=function(){return window.STT.tg;};
  window.STT.ready=window.STT.ready||new Promise(function(resolve){window.STT._resolveReady=resolve;});

  function dispatch(detail, name){
    try{document.dispatchEvent(new CustomEvent(name||'statetty:key-ready',{detail:detail||{}}));}
    catch(e){}
  }

  // ── helpers de Buddy ───────────────────────────────────────────────────────

  function buddyAuth(){
    return (window.Buddy&&window.Buddy.auth)||null;
  }
  function getBuddyAccessToken(){
    var a=buddyAuth();
    if(a&&typeof a.getAccessToken==='function'){
      var t=a.getAccessToken();
      if(t) return t;
    }
    try{return sessionStorage.getItem('buddy_access_token')||null;}catch(e){return null;}
  }
  function waitBuddyReady(timeoutMs){
    timeoutMs=timeoutMs||5000;
    return new Promise(function(resolve){
      if(!window.Buddy){return resolve(false);} // página sin buddy.js → fallback legacy
      if(window.Buddy&&window.Buddy.ready){return resolve(true);}
      if(window.Buddy&&window.Buddy.readyPromise){
        window.Buddy.readyPromise.then(function(){resolve(true);}).catch(function(){resolve(false);});
      }else{
        var timer=null;
        var onReady=function(){cancel();resolve(true);};
        var onTimeout=function(){cancel();resolve(false);};
        function cancel(){
          window.removeEventListener('buddy:ready',onReady);
          if(timer)clearTimeout(timer);
        }
        window.addEventListener('buddy:ready',onReady);
        timer=setTimeout(onTimeout,timeoutMs);
      }
    });
  }

  function getBuddyUser(){
    var a=buddyAuth();
    if(a&&typeof a.getUser==='function') return a.getUser()||null;
    return null;
  }
  function getBuddyAuthenticated(){
    var a=buddyAuth();
    if(a&&typeof a.isAuthenticated==='function') return a.isAuthenticated();
    return false;
  }

  // ── consulta a statetty/auth/me ────────────────────────────────────────────

  async function fetchAuthMe(token){
    var base=getApiBase();
    var res=await fetch(base+'statetty/auth/me',{
      method:'GET',
      cache:'no-store',
      headers:{'Authorization':'Bearer '+token}
    });
    var data=await res.json();
    return data;
  }

  // ── construcción del usuario combinado ─────────────────────────────────────

  function buildUsuario(authMe){
    var buddy=authMe&&authMe.buddy?authMe.buddy:null;
    var tg=authMe&&authMe.tg?authMe.tg:null;
    if(!buddy&&!tg) return null;

    var u={};
    // De tg (preferido como fuente del perfil Statetty)
    if(tg){
      u._id=tg._id||null;
      u.id=tg.id||null;
      u.email=tg.email||(buddy&&buddy.email)||'';
      u.first_name=tg.first_name||(buddy&&buddy.firstName)||(buddy&&buddy.name)||'';
      u.last_name=tg.last_name||(buddy&&buddy.lastName)||'';
      u.name=((u.first_name+' '+u.last_name).trim())||(buddy&&buddy.name)||'';
      u.agencia=tg.agencia||'';
      u.ciudad=tg.ciudad||'';
      u.pais=tg.pais||'';
      u.waphone=tg.waphone||'';
      u.role=tg.role||'user';
      u.isAdmin=tg.isAdmin||false;
      u.hasTime=tg.hasTime||false;
      u.dias=tg.dias||0;
      u.usrIconURL=tg.usrIconURL||'';
      u.activo=tg.activo;
      u.emailVerificado=tg.emailVerificado;
      // Datos de trabajo que consumen mapa.js/fndInm.js u otros scripts:
      u.busquedas=tg.busquedas||null;
      u.seleccionados=tg.seleccionados||null;
      u.dfotos=tg.dfotos||null;
    }
    // Campos Buddy siempre presentes
    if(buddy){
      u.buddyId=buddy.id||null;
      u.buddyEmail=buddy.email||u.email||null;
      u.buddyName=buddy.name||null;
      if(!u.email) u.email=buddy.email||'';
      if(!u.first_name&&buddy.firstName) u.first_name=buddy.firstName;
      if(!u.last_name&&buddy.lastName) u.last_name=buddy.lastName;
      u.fotoUrl=buddy.fotoUrl||null;
      u.verificado=buddy.verificado||false;
    }
    u.linked=!!authMe.linked;
    return u;
  }

  // ── flujo de sesión ────────────────────────────────────────────────────────

  async function initAuth(){
    var token=null;
    var buddyUser=getBuddyUser();

    // 1) Ruta principal: JWT Buddy
    token=getBuddyAccessToken();
    if(token){
      try{
        var authMe=await fetchAuthMe(token);
        if(authMe&&authMe.ok){
          window.STT.token=token;
          window.publicKey=token; // compat: algunos scripts leen window.publicKey
          window.STT.buddy=authMe.buddy||buddyUser||null;
          window.STT.tg=authMe.tg||null;
          window.STT.linked=authMe.linked===true;
          window.STT.usuario=buildUsuario(authMe);
          dispatch({key:token,usuario:window.STT.usuario,error:null},'statetty:key-ready');
          dispatch({token:token,buddy:window.STT.buddy,tg:window.STT.tg,linked:window.STT.linked,error:null},'statetty:auth-ready');
          // Backfill automático statetty.com: si hay buddy sin cuenta tg vinculada,
          // intentar completar datos/vincular con un tgUser/agente del mismo email.
          if(window.STT.buddy&&!window.STT.linked){
            _maybeBackfill(token);
          }
          return;
        }else{
          console.log('[Statetty] [K] auth/me:',authMe&&authMe.error||'respuesta inválida');
        }
      }catch(e){
        console.log('[Statetty] [K] fetchAuthMe:',e.message);
      }
    }

    // 2) Fallback legacy `?k=` publicKey (transición)
    try{
      var url=new URL(location.href);
      var k=url.searchParams.get('k')||readCookie(COOKIE_NAME)||localStorage.getItem(COOKIE_NAME);
      if(k){
        var base=getApiBase();
        var res=await fetch(base+'statetty/getuser?publicKey='+encodeURIComponent(k));
        if(res.ok){
          var data=await res.json();
          var u=data&&data.ok&&data.data?data.data:null;
          if(u){
            window.publicKey=k;window.STT.token=k;window.STT.usuario=u;
            dispatch({key:k,usuario:u,error:null},'statetty:key-ready');
            dispatch({token:k,buddy:null,tg:u,linked:false,error:null},'statetty:auth-ready');
            return;
          }else{
            localStorage.removeItem(COOKIE_NAME);clearCookie(COOKIE_NAME);
          }
        }
      }
    }catch(e){
      console.log('[Statetty] [K] fallback publicKey:',e.message);
    }

    // 3) Sin sesión
    window.STT.usuario=null;window.STT.token=null;window.STT.buddy=null;window.STT.tg=null;window.STT.linked=false;
    dispatch({key:null,usuario:null,error:null},'statetty:key-ready');
    dispatch({token:null,buddy:null,tg:null,linked:false,error:null},'statetty:auth-ready');
  }

  // ── login / logout (delegan en Buddy) ──────────────────────────────────────

  window.STT.login=function(email){
    var a=buddyAuth();
    if(a&&typeof a.requestLogin==='function') return a.requestLogin(email);
    return Promise.reject(new Error('Buddy auth no disponible'));
  };
  window.STT.startLogin=function(){
    var a=buddyAuth();
    if(a&&typeof a.startAuthenticationPrompt==='function'){
      // startAuthenticationPrompt devuelve un booleano (true: form mostrado), no
      // una Promise. Envolvemos con Promise.resolve para poder encadenar sin
      // lanzar "....then is not a function" y así re-verificar la sesión tras
      // mostrar el form (requeryAfterLogin).
      return Promise.resolve(a.startAuthenticationPrompt()).then(function(){
        // Buddy mostró el form; re-verificar la sesión tras el login y mostrar
        // vinculación si aplica.
        return requeryAfterLogin();
      });
    }
    return Promise.resolve(false);
  };
  window.STT.logout=function(){
    var a=buddyAuth();
    if(a&&typeof a.logout==='function') return a.logout();
    return Promise.resolve(false);
  };

  // ── vinculo obligatorio (buddy logueado sin tgUser) ───────────────────────

  /** Según estado actual, retorna si el usuario requiere vincular con tgUser. */
  window.STT.needsLink=function(){
    return (!!window.STT.buddy)&&(!window.STT.tg)&&(!window.STT.linked);
  };
  /** check-tg-exists: verifica si existe tgUser por email/whatsapp del buddy. */
  window.STT.checkTgExists=async function(whatsapp){
    var base=getApiBase();var t=window.STT.getToken();
    if(!t) return {needsLink:true};
    var res=await fetch(base+'statetty/auth/check-tg-exists',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},
      body:JSON.stringify({whatsapp:whatsapp||null})
    });
    return await res.json();
  };
  /** create-tg: crea tgUser de respaldo y vincula (usuario nuevo). */
  window.STT.createTg=async function(datos){
    var base=getApiBase();var t=window.STT.getToken();
    if(!t) return {ok:false,error:'sin_sesion'};
    var res=await fetch(base+'statetty/auth/create-tg',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},
      body:JSON.stringify(datos||{})
    });
    var data=await res.json();
    if(data&&data.ok){
      window.STT.tg=data.tg||null;
      window.STT.linked=data.linked===true;
      window.STT.usuario=buildUsuario({linked:data.linked,buddy:window.STT.buddy,tg:data.tg});
    }
    return data;
  };
  /** link: vincula con tgUser existente (email/whatsapp verificado). */
  window.STT.link=async function(whatsapp){
    var base=getApiBase();var t=window.STT.getToken();
    if(!t) return {ok:false,error:'sin_sesion'};
    var res=await fetch(base+'statetty/auth/link',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},
      body:JSON.stringify({whatsapp:whatsapp||null})
    });
    var data=await res.json();
    if(data&&data.ok){
      window.STT.tg=data.tg||null;
      window.STT.linked=data.linked===true;
      window.STT.usuario=buildUsuario({linked:data.linked,buddy:window.STT.buddy,tg:data.tg});
    }
    return data;
  };

  // ── Pantalla de vinculación obligatoria (Fase 1.4) ────────────────────────
  // Después del primer login Buddy, si el usuario no tiene cuenta tgUser
  // vinculada, se muestra "¿Ya usaste statetty desde Telegram?":
  //   - "No, soy nuevo"          → check-tg-exists + create-tg (respaldo) → listo.
  //   - "Sí, ya usé Telegram"    → se le pide su WhatsApp/email; si existe un
  //                                tgUser verificado se linkea, si no se le
  //                                indica verificar desde @statettybot.

  var STT_LINK_CSS_ID='stt-link-css';
  function injectLinkStyles(){
    if(document.getElementById(STT_LINK_CSS_ID)) return;
    var css=document.createElement('style');css.id=STT_LINK_CSS_ID;
    css.textContent='#stt-link-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(7,52,63,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Lato,Arial,sans-serif;}'+
      '#stt-link-box{background:#fff;border-radius:14px;max-width:460px;width:100%;padding:26px 26px 20px;box-shadow:0 18px 50px rgba(0,0,0,.28);color:#1f2d33;}'+
      '#stt-link-box h3{margin:0 0 6px;font-size:20px;color:#074f66;}'+
      '#stt-link-box p{margin:6px 0 14px;font-size:14px;line-height:1.5;color:#43555d;}'+
      '#stt-link-actions{display:flex;flex-direction:column;gap:10px;}'+
      '#stt-link-actions button{font:600 15px/1 Lato,Arial,sans-serif;padding:13px 14px;border-radius:9px;border:1px solid #17baef;cursor:pointer;}'+
      '#stt-link-actions .stt-link-new{background:#17baef;color:#fff;}'+
      '#stt-link-actions .stt-link-note{background:#fff;color:#074f66;border-color:#9fd8ec;}'+
      '#stt-link-close{position:absolute;right:12px;top:12px;background:none;border:none;font-size:22px;color:#7b8f99;cursor:pointer;}'+
      '#stt-link-extra{margin-top:14px;display:none;}'+
      '#stt-link-extra label{display:block;font-size:13px;font-weight:700;color:#43555d;margin-bottom:6px;}'+
      '#stt-link-extra input{width:100%;padding:11px 12px;border:1px solid #c4d4da;border-radius:8px;font:15px Lato,Arial,sans-serif;}'+
      '#stt-link-status{margin-top:12px;font-size:13px;color:#43555d;display:none;}';
    document.head.appendChild(css);
  }

  function _linkBox(html){
    injectLinkStyles();
    var ov=document.createElement('div');ov.id='stt-link-overlay';
    ov.innerHTML='<div id="stt-link-box" style="position:relative;">'+html+'</div>';
    var cur=document.getElementById('stt-link-overlay');if(cur)cur.remove();
    document.body.appendChild(ov);
    return ov;
  }
  function _dismissLink(){
    var ov=document.getElementById('stt-link-overlay');if(ov)ov.remove();
  }
  window.__sttDismissLink=_dismissLink;

  function _setLinkStatus(ov,msg){
    var el=ov.querySelector('#stt-link-status');
    if(el){el.textContent=msg||'';el.style.display=msg?'block':'none';}
  }

  async function _flowNewUser(ov, form){
    _setLinkStatus(ov,'Creando tu cuenta…');
    var datos={};
    var inp=form&&form.querySelector('[data-stt-nombre]');
    var inpWa=form&&form.querySelector('[data-stt-wa]');
    if(inp&&inp.value) datos.nombres=inp.value.trim();
    if(inpWa&&inpWa.value) datos.whatsapp=inpWa.value.trim();
    var bud=window.STT.getBuddy&&window.STT.getBuddy();
    if(!datos.nombres&&bud&&(bud.name||bud.firstName)) datos.nombres=bud.name||bud.firstName;
    var res=await window.STT.createTg(datos);
    if(res&&res.ok){
      _dismissLink();
      dispatch({token:window.STT.getToken(),buddy:window.STT.buddy,tg:window.STT.tg,linked:window.STT.linked},'statetty:auth-ready');
    }else{
      _setLinkStatus(ov,'No se pudo crear tu cuenta: '+(res&&res.error||'error')+'.');
    }
  }

  async function _flowExisting(ov, form){
    var inpWa=form&&form.querySelector('[data-stt-wa]');
    var wa=inpWa&&inpWa.value?inpWa.value.trim():'';
    _setLinkStatus(ov,'Buscando tu cuenta…');
    var exists=await window.STT.checkTgExists(wa);
    if(exists&&exists.exists){
      if(exists.requiresEmailVerification){
        _setLinkStatus(ov,'Encontramos tu cuenta, pero tu email todavía no está verificado. Entrá a @statettybot en Telegram y verificá tu correo. Después volvé a intentar.');
        return;
      }
      var link=await window.STT.link(wa);
      if(link&&link.ok){
        _dismissLink();
        dispatch({token:window.STT.getToken(),buddy:window.STT.buddy,tg:window.STT.tg,linked:window.STT.linked},'statetty:auth-ready');
      }else{
        _setLinkStatus(ov,(link&&link.msg)||'No se pudo vincular la cuenta.');
      }
    }else{
      _setLinkStatus(ov,'No encontramos una cuenta de Telegram con esos datos. Si sos nuevo, elegí "No, soy nuevo".');
    }
  }

  /** Muestra la pantalla de vinculación si hace falta. Returns true si se mostró. */
  window.STT.ensureLink=function(){
    if(!window.STT.needsLink()) return false;
    var ov=_linkBox(
      '<button id="stt-link-close" type="button" aria-label="Cerrar">&times;</button>'+
      '<h3>¿Ya usaste statetty desde Telegram?</h3>'+
      '<p>Para terminar de crear tu cuenta con tu correo, contanos si tenés una cuenta previa en statetty.</p>'+
      '<div id="stt-link-actions">'+
        '<button type="button" class="stt-link-note" id="stt-link-existing">Sí, ya usé statetty desde Telegram</button>'+
        '<button type="button" class="stt-link-new" id="stt-link-new">No, soy nuevo</button>'+
      '</div>'+
      '<div id="stt-link-extra"><form id="stt-link-form">'+
        '<label>Tu nombre</label><input type="text" data-stt-nombre placeholder="Nombre y apellido">'+
        '<label>Tu WhatsApp</label><input type="tel" data-stt-wa placeholder="+591…">'+
      '</form></div>'+
      '<div id="stt-link-status"></div>'
    );
    var extra=ov.querySelector('#stt-link-extra');
    var form=ov.querySelector('#stt-link-form');
    ov.querySelector('#stt-link-close').addEventListener('click',_dismissLink);
    ov.addEventListener('click',function(e){if(e.target===ov)_dismissLink();});
    ov.querySelector('#stt-link-new').addEventListener('click',function(){_flowNewUser(ov,form);});
    ov.querySelector('#stt-link-existing').addEventListener('click',function(){
      extra.style.display='block';ov.querySelector('#stt-link-new').style.display='none';
      ov.querySelector('#stt-link-existing').style.display='none';
      ov.querySelector('#stt-link-status').textContent='';
    });
    form.addEventListener('submit',function(e){e.preventDefault();_flowExisting(ov,form);});
    // En el flujo "sí existente" el form pide solo WhatsApp + nombre (nombre se ignora aquí).
    form.querySelector('[data-stt-nombre]').closest('label').style.display='none';
    return true;
  };

  // Re-procesa la sesión tras un login Buddy en runtime (mismo flujo de initAuth).
  function requeryAfterLogin(){
    return initAuth().then(function(){
      if(window.STT.getToken()&&window.STT.needsLink&&window.STT.needsLink()&&window.STT.ensureLink){
        setTimeout(function(){window.STT.ensureLink();},250);
      }
      return true;
    });
  }

  // Backfill automático statetty.com: buddy sin tg vinculado → intentar completar
  // datos/vincular con un tgUser o agente del mismo email vía backend.
  async function _maybeBackfill(token){
    if(!token) return;
    try{
      var base=getApiBase();
      var res=await fetch(base+'statetty/auth/backfill-buddy',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body:'{}'
      });
      var data=await res.json();
      if(!data||!data.ok) return;
      if(data.linked&&data.tg&&data.tg._id){
        window.STT.linked=true;
        window.STT.tg=data.tg||null;
        window.STT.buddy=data.buddy||window.STT.buddy||null;
        window.STT.usuario=buildUsuario({linked:true,buddy:window.STT.buddy,tg:window.STT.tg});
        if(window.__sttDismissLink)window.__sttDismissLink();
        dispatch({key:token,usuario:window.STT.usuario,error:null},'statetty:key-ready');
        dispatch({token:token,buddy:window.STT.buddy,tg:window.STT.tg,linked:true,error:null},'statetty:auth-ready');
      }else if(data.backfilled&&data.buddy){
        window.STT.buddy=data.buddy||window.STT.buddy||null;
        window.STT.usuario=buildUsuario({linked:false,buddy:window.STT.buddy,tg:window.STT.tg});
      }
    }catch(e){
      console.log('[Statetty] [K] _maybeBackfill:',e.message);
    }
  }

  function ready(fn){
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);}
    else{fn();}
  }

  ready(function(){
    waitBuddyReady().then(function(buddyReady){
      if(buddyReady){
        // Buddy ya corrió su flujo (auth-ready emitido). Solo replicamos el estado.
        var auth=buddyAuth();
        if(auth&&typeof auth.getAccessToken==='function'){
          auth.getAccessToken(); // asegura restauración de tokens (checkSession ya corrió en Buddy)
        }
      }
      initAuth().finally(function(){
        if(window.STT._resolveReady)window.STT._resolveReady();
        // Fase 1.4: si hay sesión Buddy sin tgUser vinculado, mostrar la pantalla
        // de vinculación. Se hace tras resolver ready para no bloquear la página,
        // y solo si el usuario está logueado (needsLink exige buddy presente).
        if(window.STT.getToken()&&window.STT.needsLink&&window.STT.needsLink()&&window.STT.ensureLink){
          // Pequeño delay para que el DOM del header esté listo.
          setTimeout(function(){window.STT.ensureLink();},250);
        }
      });

      // Re-procesar si Buddy cambia de modo de auth (login/logout desde la UI
      // propia de Buddy) o autentica por magic link (verifyHash). Se escuchan
      // tanto buddy:auth-state-changed como buddy:auth-verified porque en la
      // ruta de verificación por hash buddy:auth-ready (solo emitido por
      // checkSession) nunca se dispara; sin estos listeners auth.js no
      // re-consultaba la sesión y hacía falta recargar la página.
      ['buddy:auth-mode-changed','buddy:auth-ready','buddy:auth-state-changed','buddy:auth-verified'].forEach(function(evt){
        window.addEventListener(evt,function(){
          // Solo releva si ya hay token nuevo y no lo reflejamos aún.
          requeryAfterLogin();
        });
      });
    });
  });
})();