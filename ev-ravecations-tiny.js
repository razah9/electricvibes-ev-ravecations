/*! Electric Vibes — Ravecations (heatmap + EV-only markers + popups, debounced + cached) */
(function(){
  /* ---------- tiny CSS (scoped in #ev-rave-map) ---------- */
  (function(){
    const el = document.createElement("style");
    el.textContent = `
      #ev-rave-map .ev-card{background:#0f2326;color:#d9f7f1;border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,.35);overflow:hidden}
      #ev-rave-map .ev-head{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px 10px;border-bottom:1px solid #11353b}
      #ev-rave-map .ev-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
      #ev-rave-map .ev-title{font-weight:800}
      #ev-rave-map .pill{background:#10292e;color:#bfe7e0;border:1px solid #11353b;padding:6px 10px;border-radius:999px;font-size:12px;line-height:1;cursor:pointer;user-select:none;white-space:nowrap}
      #ev-rave-map .pill:hover{border-color:#33e0c3}
      #ev-rave-map .switch{display:flex;align-items:center;gap:6px}
      #ev-rave-map .switch input{accent-color:#33e0c3}
      #ev-rave-map .slider{appearance:none;width:120px;height:6px;border-radius:999px;background:#0a3234;outline:none}
      #ev-rave-map .slider::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:#33e0c3}
      #ev-rave-map .ev-stats{font-size:12px;color:#9dd1c8;margin-left:auto}
      #ev-rave-map .map{height:540px;background:#0b1b1e}
      #ev-rave-map .foot{display:flex;gap:8px;flex-wrap:wrap;padding:10px 12px;border-top:1px solid #11353b;background:#0f2326}
      #ev-rave-map .pop{position:absolute;left:12px;bottom:12px;max-width:min(560px,calc(100% - 24px));background:#0b1b1e;border:1px solid #11353b;border-radius:14px;padding:12px 12px 10px;box-shadow:0 10px 26px rgba(0,0,0,.45)}
      #ev-rave-map .pop h4{margin:0 0 6px;font-size:14px}
      #ev-rave-map .pop .list{display:flex;flex-direction:column;gap:8px;max-height:230px;overflow:auto}
      #ev-rave-map .pop a{color:#bfe7e0;text-decoration:none}
      #ev-rave-map .pop a:hover{color:#fff}
      #ev-rave-map .pop .row{display:flex;gap:10px;align-items:flex-start}
      #ev-rave-map .pop .row img{width:56px;height:56px;object-fit:cover;border-radius:8px}
      #ev-rave-map .pop .close{margin-top:10px}
      @media(max-width:640px){#ev-rave-map .map{height:420px}}
    `;
    document.head.appendChild(el);
  })();

  /* ---------- helpers ---------- */
  const BASE = (window.EV_BASE && window.EV_BASE.trim()) || (location && location.origin) || "https://www.electricvibesusa.com";
  const COLLECTIONS = Array.isArray(window.EV_COLLECTIONS) ? window.EV_COLLECTIONS : [];
  const ALLOW_SITE_FALLBACK = window.EV_ALLOW_SITE_WIDE_FALLBACK !== false;

  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

  // tiny cache (sessionStorage)
  const TTL = 24*60*60*1000;
  const sk = (k)=>`ev:${k}`;
  const get = (k)=>{ try{const v=JSON.parse(sessionStorage.getItem(sk(k))||"null"); if(!v) return null; if(Date.now()-v.t>TTL){sessionStorage.removeItem(sk(k));return null;} return v.d;}catch{return null;} };
  const set = (k,d)=>{ try{sessionStorage.setItem(sk(k),JSON.stringify({t:Date.now(),d}))}catch{} };

  // haversine
  function distKm(a,b){
    const R=6371, toRad=(x)=>x*Math.PI/180;
    const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
    const s1=Math.sin(dLat/2), s2=Math.sin(dLng/2);
    const q=s1*s1+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2*s2;
    return 2*R*Math.asin(Math.sqrt(q));
  }

  // deterministic tag -> city mapping keywords
  const TAG_TO_CITY = new Map([
    ["SXM Festival","Saint Martin"],
    ["Tomorrowland (Belgium)","Boom"],
    ["Ultra Miami","Miami"],
    ["EDC Las Vegas","Las Vegas"],
    ["EDC Orlando","Orlando"],
    ["EDC Mexico","Mexico City"],
    ["EDC China","Shanghai"],
    ["Mysteryland","Haarlemmermeer"],
    ["Transmission","Prague"],
    ["Creamfields","Daresbury"],
    ["Defqon.1","Biddinghuizen"],
    ["ZoukOut Singapore","Singapore"],
    ["Day Zero Tulum","Tulum"],
    ["Elrow","Barcelona"],
    ["EXIT Festival","Novi Sad"],
    ["Sonar Barcelona","Barcelona"],
    ["Dekmantel","Amsterdam"],
    ["Movement Detroit","Detroit"],
    ["Kappa FuturFestival","Turin"],
    ["Balaton Sound","Zamárdi"],
    ["Parookaville","Weeze"],
    ["Shambhala","Salmo"],
    ["Electric Forest","Rothbury"],
    ["S2O Bangkok","Bangkok"],
    ["Road to Ultra Thailand","Bangkok"],
    ["Full Moon Party","Ko Pha Ngan"],
    ["BOO!","Seattle"]
  ]);

  // main city seeds (name, query override, lat, lng)
  const CITIES = [
    ["Miami",null,25.7617,-80.1918],["New York",null,40.7128,-74.0060],["Los Angeles",null,34.0522,-118.2437],
    ["San Francisco","San Francisco",37.7749,-122.4194],["Chicago",null,41.8781,-87.6298],["Austin",null,30.2672,-97.7431],
    ["Detroit",null,42.3314,-83.0458],["Denver",null,39.7392,-104.9903],["Las Vegas",null,36.1699,-115.1398],
    ["Orlando",null,28.5384,-81.3789],["Mexico City","CDMX",19.4326,-99.1332],["Tulum",null,20.2114,-87.4654],
    ["Cancun","Cancún",21.1619,-86.8515],["Saint Martin","SXM Festival",18.0708,-63.0501],

    ["London",null,51.5074,-0.1278],["Manchester",null,53.4808,-2.2426],["Ibiza",null,38.9067,1.4206],
    ["Barcelona",null,41.3851,2.1734],["Madrid",null,40.4168,-3.7038],["Paris",null,48.8566,2.3522],
    ["Berlin",null,52.5200,13.4050],["Amsterdam",null,52.3676,4.9041],["Brussels",null,50.8503,4.3517],
    ["Boom", "Tomorrowland Belgium",51.0916,4.3717],["Prague",null,50.0755,14.4378],["Vienna",null,48.2082,16.3738],

    ["Tel Aviv",null,32.0853,34.7818],["Dubai",null,25.2048,55.2708],["Cairo",null,30.0444,31.2357],
    ["Cape Town",null,-33.9249,18.4241],["Johannesburg",null,-26.2041,28.0473],

    ["Bangkok",null,13.7563,100.5018],["Phuket",null,7.8804,98.3923],["Singapore",null,1.3521,103.8198],
    ["Tokyo",null,35.6762,139.6503],["Seoul",null,37.5665,126.9780],["Bali","Bali", -8.65,115.2167],

    ["Sydney",null,-33.8688,151.2093],["Melbourne",null,-37.8136,144.9631],["Auckland",null,-36.8485,174.7633],

    ["Rio de Janeiro","Rio",-22.9068,-43.1729],["São Paulo","Sao Paulo",-23.5505,-46.6333],["Buenos Aires",null,-34.6037,-58.3816],
    ["Santiago",null,-33.4489,-70.6693],["Lima",null,-12.0464,-77.0428],["Bogotá","Bogota",4.7110,-74.0721]
  ];

  const TAGS = [
    "Groove Cruise (Miami)","HOLY SHIP!","FRIENDSHIP Cruise","SXM Festival","BPM Festival","Tomorrowland (Belgium)",
    "Ultra Miami","EDC Las Vegas","EDC Orlando","EDC Mexico","EDC China",
    "Coachella","Time Warp","Awakenings","Amsterdam Dance Event",
    "Ibiza closing parties","Burning Man","Mysteryland","Transmission","Creamfields","Defqon.1",
    "ZoukOut Singapore","Creamfields Chile","Day Zero Tulum","Elrow","EXIT Festival","Sonar Barcelona",
    "Dekmantel","Electric Daisy Carnival","Movement Detroit","Kappa FuturFestival","Balaton Sound","Parookaville",
    "Shambhala","Electric Forest","S2O Bangkok","Road to Ultra Thailand","Full Moon Party","BOO!"
  ];

  /* ---------- safe fetch (debounced & serialized) ---------- */
  let queue = Promise.resolve();
  function queued(fn){ queue = queue.then(()=>fn()).catch(()=>{}); return queue; }

  const SEARCH_URL = (q, collectionId) =>
    `${BASE}/search?q=${encodeURIComponent(q)}&format=json${collectionId?`&collectionId=${collectionId}`:""}`;

  async function searchPosts(q, {preferCollections=true, limit=6}={}){
    const key = `posts:${preferCollections}:${q}`;
    const cached = get(key); if(cached) return cached;

    // try collections first (one-by-one until we hit)
    if(preferCollections && COLLECTIONS.length){
      for(const col of COLLECTIONS){
        const data = await fetchJson(SEARCH_URL(q,col));
        const list = normalize(data).slice(0,limit);
        if(list.length){ set(key,list); return list; }
      }
    }

    // site-wide fallback
    if(ALLOW_SITE_FALLBACK){
      const data2 = await fetchJson(SEARCH_URL(q, null));
      const list2 = normalize(data2).slice(0,limit);
      set(key,list2); return list2;
    }

    set(key,[]); return [];
  }

  async function fetchJson(url){
    // serialize + small gap to be nice to SS
    return queued(async()=>{
      await sleep(220);
      const r = await fetch(url, {credentials:"omit"});
      if(!r.ok){ return {results:[]}; }
      const ct = (r.headers.get("content-type")||"");
      if(!ct.includes("json")) return {results:[]};
      try{ return await r.json(); }catch{ return {results:[]}; }
    });
  }

  function normalize(api){
    const arr = Array.isArray(api?.results) ? api.results : [];
    return arr.map(x=>{
      const href = x?.fullUrl || x?.url || x?.assetUrl || "#";
      const title = (x?.title || x?.recordTypeLabel || "Untitled").toString();
      const img = (x?.assetUrl || x?.imageUrl || "").toString();
      const date = x?.publishOn || x?.createdOn || "";
      return {href, title, img, date};
    });
  }

  /* ---------- UI ---------- */
  let map, heat, density=.55, onlyEV=false, popEl=null, markers=[];

  function card(){
    const wrap = document.createElement("div");
    wrap.className = "ev-card";
    wrap.innerHTML = `
      <div class="ev-head">
        <div class="ev-row">
          <div class="ev-title">Explore Ravecations by City</div>
          <button class="pill" id="ev-reset">Reset view</button>
          <label class="pill switch"><input id="ev-only" type="checkbox"><span>Only Electric Vibes content</span></label>
          <label class="pill switch" title="Heat concentration">
            <input id="ev-heat" type="checkbox" checked><span>Heatmap</span>
            <input id="ev-density" class="slider" type="range" min="0" max="1" step="0.05" value="${density}">
            <span style="color:#9dd1c8">content</span>
          </label>
          <div class="ev-stats" id="ev-stats">Indexed 0/0. Matches: 0.</div>
        </div>
      </div>
      <div class="map" id="ev-map"></div>
      <div class="foot" id="ev-tags"></div>
    `;
    return wrap;
  }

  function hideRoadShieldsStyle(){
    // Hide highway shields/route markers + many POI icons
    return [
      {elementType:"geometry", stylers:[{color:"#0b1b1e"}]},
      {elementType:"labels.text.fill", stylers:[{color:"#9dd1c8"}]},
      {elementType:"labels.text.stroke", stylers:[{color:"#0b1b1e"}]},
      {featureType:"water", stylers:[{color:"#0e2a2d"}]},
      {featureType:"landscape", stylers:[{color:"#0f2326"}]},
      {featureType:"road", elementType:"geometry", stylers:[{color:"#13363a"}]},
      {featureType:"road", elementType:"labels.icon", stylers:[{visibility:"off"}]},          // <-- shields off
      {featureType:"transit", elementType:"labels.icon", stylers:[{visibility:"off"}]},
      {featureType:"poi", elementType:"labels.icon", stylers:[{visibility:"off"}]},
      {featureType:"administrative", elementType:"geometry", stylers:[{color:"#11353b"}]}
    ];
  }

  function renderTags(){
    const host = document.getElementById("ev-tags");
    TAGS.forEach(t=>{
      const b=document.createElement("button");
      b.className="pill"; b.type="button"; b.textContent=t;
      b.onclick=()=>{
        const key = TAG_TO_CITY.get(t) || t;
        const hit = CITIES.find(([name]) => name.toLowerCase()===key.toLowerCase());
        const target = hit ? {lat:hit[2],lng:hit[3]} : {lat:20,lng:0};
        map.panTo(target); map.setZoom(hit? 6 : 2);
        if(hit) showCityPopup(hit[0], hit[1] || hit[0], target);
      };
      host.appendChild(b);
    });
  }

  function closePop(){ if(popEl && popEl.parentNode){ popEl.parentNode.removeChild(popEl); } popEl=null; }
  function makePop(title, items, q){
    closePop();
    popEl = document.createElement("div"); popEl.className="pop";
    if(!items.length){
      popEl.innerHTML = `
        <h4>${title} • Latest</h4>
        <div style="opacity:.85;margin:4px 0 8px">No recent Electric Vibes posts for “${q}”.</div>
        <a class="pill" href="${BASE}/search?q=${encodeURIComponent(q)}" style="display:inline-block">Open site search</a>
        <button class="pill close" type="button">Close</button>
      `;
    }else{
      popEl.innerHTML = `
        <h4>${title} • Latest</h4>
        <div class="list">
          ${items.map(it=>`
            <div class="row">
              ${it.img?`<img src="${it.img}" alt="">`:`<div style="width:56px;height:56px;border-radius:8px;background:#123;"></div>`}
              <div>
                <a href="${it.href}">${it.title}</a>
                ${it.date?`<div style="opacity:.65;font-size:12px">${new Date(it.date).toLocaleDateString()}</div>`:""}
              </div>
            </div>
          `).join("")}
        </div>
        <div style="margin-top:8px">
          <a class="pill" href="${BASE}/search?q=${encodeURIComponent(q)}">More results</a>
          <button class="pill close" type="button" style="margin-left:8px">Close</button>
        </div>
      `;
    }
    popEl.querySelectorAll(".close").forEach(b=>b.onclick=closePop);
    document.getElementById("ev-rave-map").appendChild(popEl);
  }

  async function showCityPopup(name, q, center){
    const items = await searchPosts(q, {preferCollections:true, limit:6});
    makePop(`${name}`, items, q);
  }

  function nearestCity(latlng){
    let best=null, dMin=1e9;
    for(const [name,q,lat,lng] of CITIES){
      const d = distKm(latlng,{lat,lng});
      if(d<dMin){ dMin=d; best=[name,q,lat,lng]; }
    }
    return (dMin<=300)? best : null;  // within 300km
  }

  function addMarkers(){
    // “EV-only” markers (tiny glow dots), toggle via checkbox
    for(const m of markers){ m.setMap(null); }
    markers.length = 0;

    CITIES.forEach(([name,q,lat,lng])=>{
      const dot = document.createElement("div");
      dot.style.cssText="background:#33e0c3;box-shadow:0 0 16px #6af0d7;width:10px;height:10px;border-radius:50%;border:2px solid #08383a";
      let marker;
      if(google.maps.marker && google.maps.marker.AdvancedMarkerElement){
        marker = new google.maps.marker.AdvancedMarkerElement({ position:{lat,lng}, content:dot, title:name });
      }else{
        marker = new google.maps.Marker({ position:{lat,lng}, title:name, icon:{path:google.maps.SymbolPath.CIRCLE, scale:4, fillColor:"#33e0c3", fillOpacity:1, strokeWeight:0} });
      }
      marker.__name = name; marker.__q = q || name;
      marker.addListener("click",()=> showCityPopup(marker.__name, marker.__q, {lat,lng}));
      markers.push(marker);
    });
    updateMarkerVisibility();
  }

  function updateMarkerVisibility(){
    for(const m of markers){
      m.setMap(onlyEV ? map : null);
    }
  }

  /* ---------- boot ---------- */
  async function build(){
    const host = document.getElementById("ev-rave-map"); host.innerHTML="";
    const panel = card(); host.appendChild(panel);

    map = new google.maps.Map(document.getElementById("ev-map"), {
      center:{lat:20,lng:0}, zoom:2.6, minZoom:2, gestureHandling:"greedy",
      styles: hideRoadShieldsStyle(), mapTypeControl:true, streetViewControl:false, fullscreenControl:true
    });

    // heat
    const heatData = CITIES.map(([, ,lat,lng]) => new google.maps.LatLng(lat,lng));
    heat = new google.maps.visualization.HeatmapLayer({ data:heatData, dissipating:true, radius:30, opacity:.55 });
    heat.setMap(map);

    // controls
    const $only = document.getElementById("ev-only");
    const $heat = document.getElementById("ev-heat");
    const $dens = document.getElementById("ev-density");
    const $stats= document.getElementById("ev-stats");

    $only.onchange = ()=>{ onlyEV = $only.checked; updateMarkerVisibility(); };
    $heat.onchange = ()=>{ heat.setMap($heat.checked? map : null); };
    $dens.oninput = ()=>{ density=+$dens.value; heat.set("opacity", clamp(density,.15,1)); heat.set("radius", 20+Math.floor(40*density)); };
    document.getElementById("ev-reset").onclick = ()=>{ map.setZoom(2.6); map.panTo({lat:20,lng:0}); closePop(); };

    renderTags();
    addMarkers();

    // index counter (polite, serialized)
    let idx=0, hits=0;
    $stats.textContent = `Indexed ${idx}/${CITIES.length}. Matches: ${hits}.`;
    for(const [name,q] of CITIES){
      const list = await searchPosts(q||name, {preferCollections:true, limit:1});
      idx++; if(list.length) hits++;
      $stats.textContent = `Indexed ${idx}/${CITIES.length}. Matches: ${hits}.`;
    }

    // click anywhere -> nearest city popup
    map.addListener("click", (e)=>{
      const c = nearestCity({lat:e.latLng.lat(), lng:e.latLng.lng()});
      if(!c) return;
      const [name,q,lat,lng] = c;
      showCityPopup(name, q||name, {lat,lng});
    });
  }

  function loadMaps(){
    if(window.google && google.maps){ build(); return; }
    const s=document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(window.EV_GMAPS_KEY||"")}&callback=__evInit&libraries=visualization,marker`;
    s.async=true; s.defer=true; document.head.appendChild(s);
    window.__evInit = ()=> build();
  }

  // Create container if it doesn't exist (some editors strip empty divs)
  if(!document.getElementById("ev-rave-map")){
    const d=document.createElement("div"); d.id="ev-rave-map"; document.body.appendChild(d);
  }
  loadMaps();
})();
