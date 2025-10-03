/*! Electric Vibes — Ravecations tiny build */
(function(){
  const css = `
  :root{
    --ev-bg:#0f2326; --ev-bg-2:#0b1b1e; --ev-chip:#10292e; --ev-chip-ink:#bfe7e0;
    --ev-ink:#d9f7f1; --ev-ink-2:#9dd1c8; --ev-accent:#33e0c3; --ev-accent-2:#6af0d7; --ev-border:#11353b;
  }
  #ev-rave-map .ev-card{background:var(--ev-bg); color:var(--ev-ink); border-radius:16px; box-shadow:0 10px 28px rgba(0,0,0,.35); overflow:hidden}
  #ev-rave-map .ev-head{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px 10px;border-bottom:1px solid var(--ev-border)}
  #ev-rave-map .ev-title{font-weight:700}
  #ev-rave-map .ev-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  #ev-rave-map .ev-pill{background:var(--ev-chip); color:var(--ev-chip-ink); border:1px solid var(--ev-border); padding:6px 10px; border-radius:999px; font-size:12px; line-height:1; cursor:pointer; user-select:none; white-space:nowrap}
  #ev-rave-map .ev-pill:hover{border-color:var(--ev-accent)}
  #ev-rave-map .ev-switch{display:flex;align-items:center;gap:6px}
  #ev-rave-map .ev-switch input{accent-color:var(--ev-accent)}
  #ev-rave-map .ev-slider{appearance:none; width:120px; height:6px; border-radius:999px; background:#0a3234; outline:none}
  #ev-rave-map .ev-slider::-webkit-slider-thumb{appearance:none; width:16px;height:16px;border-radius:50%;background:var(--ev-accent)}
  #ev-rave-map .ev-foot{display:flex;gap:8px;flex-wrap:wrap; padding:10px 12px; border-top:1px solid var(--ev-border); background:var(--ev-bg)}
  #ev-rave-map .ev-stats{font-size:12px;color:var(--ev-ink-2);margin-left:auto}
  #ev-rave-map .ev-map{height:540px;background:var(--ev-bg-2)}
  @media(max-width:640px){ #ev-rave-map .ev-map{height:420px} }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const COLLECTION = window.EV_COLLECTION_ID || "";
  const BASE = (window.EV_BASE && window.EV_BASE.trim()) || (location && location.origin) || "https://www.electricvibesusa.com";
  const SEARCH_URL = (q) => `${BASE}/search?q=${encodeURIComponent(q)}&format=json&collectionId=${COLLECTION}`;

  const CITIES = [
    ["Miami",null,[25.7617,-80.1918]],["Orlando",null,[28.5384,-81.3789]],["New York",null,[40.7128,-74.006]],
    ["Philadelphia",null,[39.9526,-75.1652]],["Boston",null,[42.3601,-71.0589]],["Washington DC","Washington",[38.9072,-77.0369]],
    ["Atlanta",null,[33.749,-84.388]],["Chicago",null,[41.8781,-87.6298]],["Detroit",null,[42.3314,-83.0458]],
    ["Austin",null,[30.2672,-97.7431]],["Dallas",null,[32.7767,-96.797]],["Houston",null,[29.7604,-95.3698]],
    ["Denver",null,[39.7392,-104.9903]],["Phoenix",null,[33.4484,-112.074]],["Las Vegas",null,[36.1699,-115.1398]],
    ["Los Angeles",null,[34.0522,-118.2437]],["San Diego",null,[32.7157,-117.1611]],["San Francisco","San Francisco",[37.7749,-122.4194]],
    ["Seattle",null,[47.6062,-122.3321]],["Vancouver",null,[49.2827,-123.1207]],["Toronto",null,[43.6532,-79.3832]],
    ["Mexico City","CDMX",[19.4326,-99.1332]],["Cancún","Cancun",[21.1619,-86.8515]],["Tulum",null,[20.2114,-87.4654]],
    ["SXM Festival","Saint Martin",[18.0708,-63.0501]],
    ["London",null,[51.5074,-0.1278]],["Manchester",null,[53.4808,-2.2426]],["Ibiza",null,[38.9067,1.4206]],
    ["Barcelona",null,[41.3851,2.1734]],["Madrid",null,[40.4168,-3.7038]],["Valencia",null,[39.4699,-0.3763]],
    ["Paris",null,[48.8566,2.3522]],["Amsterdam",null,[52.3676,4.9041]],["Berlin",null,[52.52,13.405]],
    ["Hamburg",null,[53.5511,9.9937]],["Cologne",null,[50.9375,6.9603]],["Brussels",null,[50.8503,4.3517]],
    ["Antwerp",null,[51.2194,4.4025]],["Boom (Tomorrowland)","Tomorrowland Belgium",[51.0916,4.3717]],
    ["Copenhagen",null,[55.6761,12.5683]],["Stockholm",null,[59.3293,18.0686]],["Oslo",null,[59.9139,10.7522]],
    ["Zurich",null,[47.3769,8.5417]],["Milan",null,[45.4642,9.19]],["Rome",null,[41.9028,12.4964]],
    ["Prague",null,[50.0755,14.4378]],["Vienna",null,[48.2082,16.3738]],["Budapest",null,[47.4979,19.0402]],
    ["Warsaw",null,[52.2297,21.0122]],["Lisbon",null,[38.7223,-9.1393]],["Porto",null,[41.1579,-8.6291]],
    ["Athens",null,[37.9838,23.7275]],["Mykonos",null,[37.4467,25.3289]],
    ["Tel Aviv",null,[32.0853,34.7818]],["Dubai",null,[25.2048,55.2708]],["Doha",null,[25.2854,51.5310]],
    ["Cairo",null,[30.0444,31.2357]],["Marrakech","Marrakesh",[31.6295,-7.9811]],
    ["Cape Town",null,[-33.9249,18.4241]],["Johannesburg",null,[-26.2041,28.0473]],
    ["Tokyo",null,[35.6762,139.6503]],["Osaka",null,[34.6937,135.5023]],["Seoul",null,[37.5665,126.9780]],
    ["Shanghai",null,[31.2304,121.4737]],["Beijing",null,[39.9042,116.4074]],["Hong Kong",null,[22.3193,114.1694]],
    ["Singapore",null,[1.3521,103.8198]],["Bangkok",null,[13.7563,100.5018]],["Chiang Mai",null,[18.7883,98.9853]],
    ["Phuket",null,[7.8804,98.3923]],["Koh Phangan","Full Moon Party",[9.6897,100.0170]],
    ["Ho Chi Minh City","Saigon",[10.8231,106.6297]],["Hanoi",null,[21.0278,105.8342]],["Phnom Penh",null,[11.5564,104.9282]],
    ["Kuala Lumpur",null,[3.1390,101.6869]],["Manila",null,[14.5995,120.9842]],
    ["Bali (Denpasar)","Bali",[-8.65,115.2167]],["Jakarta",null,[-6.2088,106.8456]],
    ["Sydney",null,[-33.8688,151.2093]],["Melbourne",null,[-37.8136,144.9631]],["Auckland",null,[-36.8485,174.7633]],
    ["Rio de Janeiro","Rio",[-22.9068,-43.1729]],["São Paulo","Sao Paulo",[-23.5505,-46.6333]],
    ["Buenos Aires",null,[-34.6037,-58.3816]],["Santiago",null,[-33.4489,-70.6693]],
    ["Lima",null,[-12.0464,-77.0428]],["Bogotá","Bogota",[4.7110,-74.0721]],["Medellín","Medellin",[6.2476,-75.5658]]
  ];

  const TAGS = [
    "Groove Cruise (Miami)","HOLY SHIP!","FRIENDSHIP Cruise","SXM Festival","BPM Festival","Tomorrowland (Belgium)",
    "Ultra Miami","EDC Las Vegas","Coachella","Time Warp","Awakenings","Amsterdam Dance Event",
    "Ibiza closing parties","Burning Man","Mysteryland","Creamfields","Creamfields South","Defqon.1",
    "Sunburn Goa","ZoukOut Singapore","Creamfields Chile","Day Zero Tulum","Elrow","EXIT Festival",
    "Sonar Barcelona","Dekmantel","Electric Daisy Carnival","EDC Mexico","EDC Orlando","EDC Japan",
    "Beyond Wonderland","Nocturnal Wonderland","Escape Halloween","Dreamstate","Wasteland","Countdown NYE",
    "HARD Summer","Ultra Europe","Tomorrowland Winter","Rampage","Let It Roll","Parookaville",
    "Kappa FuturFestival","Balaton Sound","Movement Detroit","Shambhala","Electric Forest","Envision Costa Rica",
    "S2O Bangkok","Full Moon Party","Road to Ultra Thailand","Kolour in the Park","BOO!"
  ];

  const CACHE_TTL_MS = 24*60*60*1000;
  const MAX_PARALLEL = 1;
  const SPACING_MS = 1700;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const getCacheKey = (q) => `ev-search:${COLLECTION}:${q}`;
  const getCached = (k) => { try{const v=JSON.parse(sessionStorage.getItem(k)||"null"); if(!v) return null; if(Date.now()-v.t>CACHE_TTL_MS){sessionStorage.removeItem(k);return null;} return v.d;}catch{return null;} };
  const setCached = (k,d) => { try{sessionStorage.setItem(k, JSON.stringify({t:Date.now(), d}))}catch{} };
  let activeFetches = 0;

  async function fetchCount(q){
    const key = getCacheKey(q);
    const hit = getCached(key);
    if(hit!=null) return hit;
    while(activeFetches >= MAX_PARALLEL) await sleep(120);
    activeFetches++;
    try{
      const res = await fetch(SEARCH_URL(q), {credentials:"omit"});
      if(!res.ok){ setCached(key, 0); return 0; }
      const ct = res.headers.get("content-type") || "";
      if(!ct.includes("json")){ setCached(key, 0); return 0; }
      const data = await res.json();
      const count = (data?.pagination?.total || data?.results?.length || 0);
      setCached(key, count);
      return count;
    }catch(e){ setCached(key, 0); return 0; }
    finally{ activeFetches--; await sleep(SPACING_MS); }
  }

  let map, heat, onlyEV=false, density=0.55;
  const heatPoints = [];
  const evMarkers = [];

  function makeCard(){
    const wrap = document.createElement("div"); wrap.className="ev-card";
    wrap.innerHTML = `
      <div class="ev-head">
        <div class="ev-row">
          <div class="ev-title">Explore Ravecations by City</div>
          <button class="ev-pill" id="ev-reset">Reset view</button>
          <label class="ev-pill ev-switch" title="Only show markers where EV has content">
            <input id="ev-only" type="checkbox">
            <span>Only Electric Vibes content</span>
          </label>
          <label class="ev-pill ev-switch" title="Heat concentration">
            <input id="ev-heat" type="checkbox" checked>
            <span>Heatmap</span>
            <input id="ev-density" type="range" class="ev-slider" min="0" max="1" step="0.05" value="${density}">
            <span style="color:var(--ev-ink-2)">content</span>
          </label>
          <div class="ev-stats" id="ev-stats">Indexed 0/0. Matches: 0.</div>
        </div>
      </div>
      <div class="ev-map" id="ev-map"></div>
      <div class="ev-foot" id="ev-tags"></div>
    `;
    return wrap;
  }

  function googleStyleDark(){
    return [
      { elementType:"geometry", stylers:[{color:"#0b1b1e"}] },
      { elementType:"labels.text.fill", stylers:[{color:"#9dd1c8"}] },
      { elementType:"labels.text.stroke", stylers:[{color:"#0b1b1e"}] },
      { featureType:"water", stylers:[{color:"#0e2a2d"}]},
      { featureType:"landscape", stylers:[{color:"#0f2326"}]},
      { featureType:"road", elementType:"geometry", stylers:[{color:"#13363a"}]},
      { featureType:"road", elementType:"labels.text.fill", stylers:[{color:"#bfe7e0"}]},
      { featureType:"poi", elementType:"geometry", stylers:[{color:"#0e2a2d"}]},
      { featureType:"administrative", elementType:"geometry", stylers:[{color:"#11353b"}]}
    ];
  }

  function renderTags(){
    const bar = document.getElementById("ev-tags");
    TAGS.forEach(t=>{
      const b = document.createElement("button");
      b.className="ev-pill"; b.type="button"; b.textContent=t;
      b.onclick=()=>{
        const c = CITIES.find(c=>t.toLowerCase().includes(c[0].toLowerCase())) || CITIES[Math.floor(Math.random()*CITIES.length)];
        map.panTo({lat:c[2][0], lng:c[2][1]}); map.setZoom(5);
      };
      bar.appendChild(b);
    });
  }

  async function build(){
    const host = document.getElementById("ev-rave-map") || (function(){ const d=document.createElement("div"); d.id="ev-rave-map"; document.body.appendChild(d); return d; })();
    const card = makeCard(); host.appendChild(card);

    map = new google.maps.Map(document.getElementById("ev-map"), {
      center:{lat:20,lng:0}, zoom:2.3, minZoom:2, gestureHandling:"greedy",
      styles: googleStyleDark(), mapTypeControl:true, streetViewControl:false, fullscreenControl:true
    });

    heat = new google.maps.visualization.HeatmapLayer({ data: heatPoints, dissipating:true, radius:30, opacity:0.55 });
    heat.setMap(map);

    const $only=document.getElementById("ev-only");
    const $heat=document.getElementById("ev-heat");
    const $dens=document.getElementById("ev-density");
    const $stats=document.getElementById("ev-stats");
    document.getElementById("ev-reset").onclick=()=>{ map.setZoom(2.3); map.panTo({lat:20,lng:0}); };
    $only.onchange=()=>{ onlyEV=$only.checked; updateVisibility(); };
    $heat.onchange=()=>{ heat.setMap($heat.checked?map:null); };
    $dens.oninput=()=>{ density=+$dens.value; heat.set("opacity", Math.max(.15,density)); heat.set("radius", 20+Math.floor(40*density)); };

    renderTags();
    CITIES.forEach(([n,q,[lat,lng]])=> heatPoints.push(new google.maps.LatLng(lat,lng)));
    heat.setData(heatPoints);

    let indexed=0, matches=0;
    $stats.textContent = `Indexing ${indexed}/${CITIES.length}. Matches: ${matches}.`;
    for(const [name,q,[lat,lng]] of CITIES){
      const count = await fetchCount(q||name);
      indexed++; if(count>0) matches++;
      $stats.textContent = `Indexed ${indexed}/${CITIES.length}. Matches: ${matches}.`;
      const contentDot = (function(){ const d=document.createElement("div"); d.style.cssText="background:var(--ev-accent);box-shadow:0 0 16px var(--ev-accent-2);width:10px;height:10px;border-radius:50%;border:2px solid #08383a"; return d; })();
      let m;
      if(google.maps.marker && google.maps.marker.AdvancedMarkerElement){
        m = new google.maps.marker.AdvancedMarkerElement({ map: onlyEV? map:null, position:{lat,lng}, title:`${name} • ${count} article${count===1?"":"s"}`, content:contentDot });
      }else{
        m = new google.maps.Marker({ map: onlyEV? map:null, position:{lat,lng}, title:`${name} • ${count} article${count===1?"":"s"}` });
      }
      m.__evCount = count; m.__evName=name;
      if(m.addListener){ m.addListener("click", ()=> window.location.href = `${BASE}/search?q=${encodeURIComponent(q||name)}` ); }
      else if(m.addEventListener){ m.addEventListener("click", ()=> window.location.href = `${BASE}/search?q=${encodeURIComponent(q||name)}` ); }
      evMarkers.push(m);
    }
    updateVisibility();
  }

  function updateVisibility(){
    for(const m of evMarkers){
      const show = (onlyEV ? (m.__evCount>0) : false);
      if("map" in m){ m.map = show ? map : null; }
      else if(m.setMap){ m.setMap(show?map:null); }
    }
  }

  function injectScript(){
    if(window.google && google.maps){ build(); return; }
    const s=document.createElement("script");
    const libs="visualization,marker";
    const key = encodeURIComponent(window.EV_GMAPS_KEY||"");
    s.src=`https://maps.googleapis.com/maps/api/js?key=${key}&callback=__evInit&libraries=${libs}`;
    s.async=true; s.defer=true; document.head.appendChild(s);
    window.__evInit=()=>build();
  }
  injectScript();
})();
