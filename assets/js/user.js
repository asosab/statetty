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

  document.addEventListener('DOMContentLoaded',async function captureAndVerifyUser(){
    try{
      var t0=Date.now();
      var url=new URL(location.href),k=url.searchParams.get('k')||readCookie(COOKIE_NAME)||localStorage.getItem(COOKIE_NAME);
      if(!k){document.dispatchEvent(new CustomEvent('statetty:key-ready',{detail:{key:null,usuario:null,error:null}}));return;}
      var base=window.STATETTY_CONFIG?STATETTY_CONFIG.WS_API_BASE:'';
      var res=await fetch(base+'statetty/getuser?publicKey='+encodeURIComponent(k),{credentials:'include'});
      var data=await res.json();
      if(data.usuario){writeCookie(COOKIE_NAME,k,data.expiresAt);localStorage.setItem(COOKIE_NAME,k);window.publicKey=k;}
      else{document.cookie=COOKIE_NAME+'=; Max-Age=0; Path='+COOKIE_PATH+'; Domain='+COOKIE_DOMAIN;localStorage.removeItem(COOKIE_NAME);}
      document.dispatchEvent(new CustomEvent('statetty:key-ready',{detail:{key:data.usuario?k:null,usuario:data.usuario||null,error:data&&data.error||null}}));
    }catch(e){console.log('[Statetty] [K] captureAndVerifyUser:',e.message);document.dispatchEvent(new CustomEvent('statetty:key-ready',{detail:{key:null,usuario:null,error:e.message||'Error de conexión'}}));}
  });
})();
