(function(){
  var COOKIE_NAME='stt_pk',COOKIE_DOMAIN='.statetty.com',COOKIE_PATH='/';

  function readCookie(name){
    var m=document.cookie.match(new RegExp('(^| )'+name+'=([^;]+)'));
    return m?decodeURIComponent(m[2]):null;
  }

  function writeCookie(name,value,maxAge){
    var c=[name+'='+encodeURIComponent(value),'Domain='+COOKIE_DOMAIN,'Path='+COOKIE_PATH,'Secure','SameSite=Lax'];
    if(maxAge)c.push('Max-Age='+maxAge);
    document.cookie=c.join('; ');
  }

  window.STT=window.STT||{};
  window.STT.getKey=function(){return window.publicKey||null;};
  window.STT.usuario=window.STT.usuario||null;
  window.STT.getUsuario=function(){return window.STT.usuario;};
  // Promesa idempotente: se resuelve una sola vez cuando termina el flujo (éxito o error),
  // incluso si user.js llegara a ejecutarse más de una vez en la página.
  window.STT.ready=window.STT.ready||new Promise(function(resolve){window.STT._resolveReady=resolve;});

  function ready(fn){
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);}
    else{fn();}
  }

  ready(async function captureAndVerifyUser(){
    try{
      var t0=Date.now();
      var url=new URL(location.href),k=url.searchParams.get('k')||readCookie(COOKIE_NAME)||localStorage.getItem(COOKIE_NAME);
      if(!k){document.dispatchEvent(new CustomEvent('statetty:key-ready',{detail:{key:null,usuario:null,error:null}}));if(window.STT._resolveReady)window.STT._resolveReady();return;}
      var base=window.STATETTY_CONFIG?STATETTY_CONFIG.WS_API_BASE:'';

      var res=await fetch(base+'statetty/getuser?publicKey='+encodeURIComponent(k));

      console.log('[Statetty] [K] status:',res.status,res.ok);

      if(!res.ok){
        throw new Error('HTTP '+res.status+' al consultar getuser');
      }

      var data=await res.json();
      console.log('[Statetty] [K] data recibida:',data);
      var usuario=data&&data.ok&&data.data?data.data:null;

      if(usuario){writeCookie(COOKIE_NAME,k,usuario.expiresAt||data.expiresAt);localStorage.setItem(COOKIE_NAME,k);window.publicKey=k;window.STT.usuario=usuario;}
      else{document.cookie=COOKIE_NAME+'=; Max-Age=0; Path='+COOKIE_PATH+'; Domain='+COOKIE_DOMAIN;localStorage.removeItem(COOKIE_NAME);window.STT.usuario=null;}
      document.dispatchEvent(new CustomEvent('statetty:key-ready',{detail:{key:usuario?k:null,usuario:usuario,error:data&&data.error||null}}));
      if(window.STT._resolveReady)window.STT._resolveReady();
    }catch(e){console.log('[Statetty] [K] captureAndVerifyUser:',e.message);document.dispatchEvent(new CustomEvent('statetty:key-ready',{detail:{key:null,usuario:null,error:e.message||'Error de conexión'}}));if(window.STT._resolveReady)window.STT._resolveReady();}
  });
})();
