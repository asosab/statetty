  var map, locations=[], markers=[];
  var resultIcon = new L.Icon({
    iconUrl:'../../assets/images/pointers/pointer_found.png',
    shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize:[40,60],iconAnchor:[20,60],popupAnchor:[1,-54],shadowSize:[60,60]
  });

  var urlParams = new URLSearchParams(window.location.search);
  let id = urlParams.get('id'), key = urlParams.get('key');
  if(!id||!key){ throw new Error("ID o key no proporcionados en la URL"); }

  // Leer hoja Agencias_Bolivia (A2:N = 14 columnas)
  var valores = 'Agencias_Bolivia!A2:N';
  var url = 'https://sheets.googleapis.com/v4/spreadsheets/'+id+'/values/'+valores+'?key='+key;

  $('#loading-indicator').show();

  $.getJSON(url, function (data) {
    $('#loading-indicator').hide();

    // Columnas esperadas (14):
    // 0 lat | 1 lon | 2 brocker | 3 nombre | 4 direccion | 5 pais | 6 cantidadAgentes
    // 7 Estado | 8 Activos | 9 Inactivos | 10 SinCuenta | 11 URL | 12 phone | 13 region
    (data.values||[]).forEach(function(row){
      if(!row || row.length<4) return;
      var a = {
        lat: parseFloat(row[0]), lng: parseFloat(row[1]),
        brocker: row[2]||'', nombre: row[3]||'',
        dir: row[4]||'', pais: row[5]||'',
        cantAg: parseInt(row[6])||0, estado: (row[7]||'').toLowerCase(),
        activos: parseInt(row[8])||0, inactivos: parseInt(row[9])||0,
        sinCuenta: parseInt(row[10])||0, URL: row[11]||'',
        phone: row[12]||'', region: row[13]||''
      };
      if(!isFinite(a.lat)||!isFinite(a.lng)) return;
      locations.push(a);
    });

    // Centroide y radio (si no llegan por URL)
    var lat = parseFloat(urlParams.get('lat')), lng = parseFloat(urlParams.get('lng')), radius = parseFloat(urlParams.get('r'));
    if(!isFinite(lat)||!isFinite(lng)||!isFinite(radius)){
      let latSum=0,lngSum=0; locations.forEach(l=>{latSum+=l.lat;lngSum+=l.lng;});
      lat = latSum/locations.length; lng = lngSum/locations.length;
      let maxD=0; locations.forEach(l=>{ const d=calculateDH(lat,lng,l.lat,l.lng); if(d>maxD) maxD=d; }); radius = maxD*1000;
    }

    // Crear mapa
    var mymap = L.map('mapid');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
    ).addTo(mymap);

    // Círculo y cruz centrales
    var center = L.latLng(lat,lng);
    L.circle(center,{color:'green',weight:1,fillOpacity:0,radius:radius}).addTo(mymap);
    var crossIcon = L.icon({iconUrl:'../../assets/images/cross_green.png',iconSize:[20,20],iconAnchor:[10,10],popupAnchor:[0,-10]});
    var crossMarker = L.marker(center,{icon:crossIcon}).addTo(mymap).bindPopup(`Centro aproximado`);

    // Marcadores
    locations.forEach(function(a){
      let fullUrl = a.URL; if(fullUrl && !/^https?:\/\//i.test(fullUrl)){ fullUrl = 'https://c21.com.bo'+fullUrl; }
      var brand;
           if((fullUrl||'').includes("c21.com")) brand='C21';
      else if((fullUrl||'').includes("remax")) brand='remax';
      else if((fullUrl||'').includes("bieninmuebles")) brand='bieni';
      else if((fullUrl||'').includes("elfaro")) brand='elfaro';
      else if((fullUrl||'').includes("dueodeinmueble")) brand='IDI';
      else if((fullUrl||'').includes("ultracasas")) brand='UC';
      else if((fullUrl||'').includes("uno.com")) brand='uno';
      else if((fullUrl||'').includes("infocasas.com")) brand='ic';
      else brand='statetty';

      var icon = new L.Icon({iconUrl:'../../assets/images/pointers/pointer_'+brand+'.png',
        shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize:[40,60],iconAnchor:[20,60],popupAnchor:[1,-54],shadowSize:[60,60]});

      var marker = L.marker([a.lat,a.lng],{icon}).addTo(mymap);

      var cel = (a.phone||'').replace(/\D/g,'');
      var waTxt = `Hola, me gustaría contactar con la agencia ${a.nombre}. (Enviado desde Statetty https://statetty.com)`;
      var wa = cel? 'https://wa.me/'+cel+'?text='+encodeURIComponent(waTxt) : '';
      var distance = Math.round(calculateDH(center.lat,center.lng,a.lat,a.lng)*1000);

      var popup = `
        <b>${escapeHtml(a.nombre)}</b> (${distance} m)<br>
        <b>Broker:</b> ${escapeHtml(a.brocker)}<br>
        <b>Región:</b> ${escapeHtml(a.region)} | <b>País:</b> ${escapeHtml(a.pais)}<br>
        <b>Dirección:</b> ${escapeHtml(a.dir)}<br>
        <b>Agentes:</b> ${a.cantAg} | ✅ ${a.activos} | ❌ ${a.inactivos} | 🚫 ${a.sinCuenta}<br>
        ${fullUrl? `<a href="${fullUrl}" target="_blank">Ver sitio de la agencia</a><br>`:''}
        ${wa? `<a href="${wa}" target="_blank">Contactar por WhatsApp</a>`:''}
      `;
      marker.bindPopup(popup);
      markers.push({marker,iconOriginal:icon,dato:a});
    });

    var group = new L.featureGroup(locations.map(l=> L.marker([l.lat,l.lng])));
    mymap.fitBounds(group.getBounds());
    actualizarEstadisticas(locations);
  });

  // ===== Utilidades y UI =====
  function calculateDH(lat1,lng1,lat2,lng2){
    const toRad=d=>d*Math.PI/180, dLat=toRad(lat2-lat1), dLng=toRad(lng2-lng1);
    const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return 6371*(2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))); // km
  }
  function escapeHtml(s){return (s||'').toString().replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}

  function actualizarEstadisticas(lista){
    if(!lista||!lista.length){
      $('#total-agencias').text(0); $('#prom-agentes').text(0);
      $('#cnt-activas').text(0); $('#cnt-inactivas').text(0); $('#cnt-sincuenta').text(0); return;
    }
    const total = lista.length;
    const promAg = Math.round(lista.reduce((a,b)=>a+(b.cantAg||0),0)/total);
    const act = lista.reduce((a,b)=>a+(b.estado==='activa'?1:0),0);
    const inact = lista.reduce((a,b)=>a+(b.estado==='inactiva'?1:0),0);
    const sin = lista.reduce((a,b)=>a+(b.sinCuenta||0),0);
    $('#total-agencias').text(total);
    $('#prom-agentes').text(promAg);
    $('#cnt-activas').text(act);
    $('#cnt-inactivas').text(inact);
    $('#cnt-sincuenta').text(sin);
  }

  $('#toolbox-btn').on('click', function(){ $('#toolbox').toggle(); });

  $('#search-input').on('input', function(){
    let q = ($(this).val()||'').toLowerCase().trim(), matchCount=0, filtrados=[];
    markers.forEach(obj=>{
      let t = [
        obj.dato.nombre,obj.dato.dir,obj.dato.region,obj.dato.brocker,
        obj.dato.pais,obj.dato.phone,obj.dato.estado
      ].join(' ').toLowerCase();
      if(q && t.includes(q)){ obj.marker.setIcon(resultIcon); obj.marker.setZIndexOffset(1000); matchCount++; filtrados.push(obj.dato); }
      else { obj.marker.setIcon(obj.iconOriginal); obj.marker.setZIndexOffset(0); }
    });
    if(q){ $('#search-count').text(matchCount).show(); actualizarEstadisticas(filtrados); }
    else { $('#search-count').hide(); actualizarEstadisticas(locations); }
  });