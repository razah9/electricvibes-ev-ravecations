/*! Electric Vibes — Ravecations tiny build (heatmap + EV-only markers + popups) */
(function(){
  /* --- tiny, scoped CSS --- */
  (function(){
    const css = `
#ev-rave-map .ev-card{background:#0f2326;color:#d9f7f1;border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,.35);overflow:hidden}
#ev-rave-map .ev-head{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px 10px;border-bottom:1px solid #11353b}
#ev-rave-map .ev-title{font-weight:800}
#ev-rave-map .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
#ev-rave-map .chip{background:#10292e;color:#bfe7e0;border:1px solid #11353b;padding:6px 10px;border-radius:999px;font-size:12px;line-height:1;cursor:pointer;user-select:none;white-space:nowrap}
#ev-rave-map .chip:hover{border-color:#33e0c3}
#ev-rave-map .switch{display:flex;align-items:center;gap:6px}
#ev-rave-map .switch input{accent-color:#33e0c3}
#ev-rave-map .slider{appearance:none;width:120px;height:6px;border-radius:999px;background:#0a3234;outline:none}
#ev-rave-map .slider::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:#33e0c3}
#ev-rave-map .ev-map{height:540px;background:#0b1b1e}
#ev-rave-map .ev-foot{display:flex;gap:8px;flex-wrap:wrap;padding:10px 12px;border-top:1px solid #11353b;background:#0f2326}
#ev-rave-map .stats{font-size:12px;color:#9dd1c8;margin-left:auto}
#ev-rave-pop{position:absolute;z-index:5;left:12px;bottom:12px;max-width:520px;background:#061416;border:1px solid #11353b;border-radius:14px;box-shadow:0 10px 28px rgba(0,0,0,.45);color:#d9f7f1}
#ev-rave-pop header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #11353b}
#ev-rave-pop .list{padding:8px 12px;display:grid;gap:8px}
#ev-rave-pop .item a{display:block;color:#bfe7e0;text-decoration:none;border:1px solid #11353b;border-radius:10px;padding:8px 10px}
#ev-rave-pop .item a:hover{border-color:#33e0c3;color:#eafff8}
#ev-rave-pop footer{display:flex;gap:10px;justify-content:flex-end;padding:10px 12px;border-top:1px solid #11353b}
#ev-rave-pop .btn{background:#10292e;color:#bfe7e0;border:1px solid #11353b;border-radius:999px;padding:6px 12px;cursor:pointer}
#ev-rave-pop .btn:hover{border-color:#33e0c3}
@media(max-width:640px){#ev-rave-map .ev-map{height:420px}}
    `;
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  })();

  /* --- config / helpers --- */
  const BASE = (window.EV_BASE && window.EV_BASE.trim()) || location.origin;
  const COLLECTION = window.EV_COLLECTION_ID || "";
  const SEARCH_URL = (q, inCollection=true) =>
    `${BASE}/search?q=${encodeURIComponent(q)}&format=json${inCollection && COLLECTION ? `&collectionId=${COLLECTION}`: ""}`;

  // City list: [name, [lat,lng]]
  const CITIES = [
    ["Miami",[25.7617,-80.1918]],["Orlando",[28.5384,-81.3789]],["New York",[40.7128,-74.006]],
    ["Los Angeles",[34.0522,-118.2437]],["San Francisco",[37.7749,-122.4194]],["San Diego",[32.7157,-117.1611]],
    ["Las Vegas",[36.1699,-115.1398]],["Denver",[39.7392,-104.9903]],["Austin",[30.2672,-97.7431]],
    ["Detroit",[42.3314,-83.0458]],["Chicago",[41.8781,-87.6298]],["Toronto",[43.6532,-79.3832]],
    ["Vancouver",[49.2827,-123.1207]],["Mexico City",[19.4326,-99.1332]],["Cancún",[21.1619,-86.8515]],
    ["Tulum",[20.2114,-87.4654]],
    ["London",[51.5074,-0.1278]],["Manchester",[53.4808,-2.2426]],["Ibiza",[38.9067,1.4206]],
    ["Amsterdam",[52.3676,4.9041]],["Berlin",[52.52,13.405]],["Brussels",[50.8503,4.3517]],
    ["Antwerp",[51.2194,4.4025]],["Boom",[51.0916,4.3717]],["Paris",[48.8566,2.3522]],["Barcelona",[41.3851,2.1734]],
    ["Madrid",[40.4168,-3.7038]],["Rome",[41.9028,12.4964]],["Milan",[45.4642,9.19]],
    ["Lisbon",[38.7223,-9.1393]],["Porto",[41.1579,-8.6291]],
    ["Tel Aviv",[32.0853,34.7818]],["Dubai",[25.2048,55.2708]],["Doha",[25.2854,51.5310]],
    ["Cairo",[30.0444,31.2357]],["Marrakesh",[31.6295,-7.9811]],
    ["Cape Town",[-33.9249,18.4241]],["Johannesburg",[-26.2041,28.0473]],
    ["Tokyo",[35.6762,139.6503]],["Seoul",[37.5665,126.9780]],["Bangkok",[13.7563,100.5018]],["Phuket",[7.8804,98.3923]],
    ["Singapore",[1.3521,103.8198]],["Bali",[ -8.65,115.2167 ]],
    ["Sydney",[-33.8688,151.2093]],["Melbourne",[-37.8136,144.9631]],["Auckland",[-36.8485,174.7633]],
    ["Rio",[ -22.9068,-43.1729 ]],["São Paulo",[ -23.5505,-46.6333 ]],
    ["Buenos Aires",[-34.6037,-58.3816]],["Santiago",[-33.4489,-70.6693]],["Bogota",[4.711,-74.0721]],
  ];

  // Aliases & event keywords per city (helps Berlin/Brussels/Boom/Tomorrowland hits)
  const CITY_ALIASES = {
    "Berlin": ["Germany","Berghain","Tresor","Sisyphos"],
    "Brussels": ["Bruxelles","Belgium","BE"],
    "Boom": ["Tomorrowland","Belgium","Antwerp"],
    "Amsterdam": ["ADE","Amsterdam Dance Event","Netherlands","NL"],
    "Ibiza": ["closing parties","Balearic","Spain"],
    "Bangkok": ["Thailand","BKK","Tomorrowland Thailand"],
    "Phuket": ["Thailand","EDC Thailand","Patong"],
    "Mexico City": ["CDMX","Mexico"],
    "Cancún": ["Cancun","Mexico"],
    "Tulum": ["Zamna","Day Zero","Mexico"],
    "Miami": ["Ultra Miami","Miami Music Week","MMW"],
    "Las Vegas": ["EDC Las Vegas","Electric Daisy Carnival","Insomniac"],
    "Orlando": ["EDC Orlando","Florida"],
    "Boom (Tomorrowland)": ["Tomorrowland","Belgium"], // if you add that city label later
  };

  // Quick tags (chips)
  const TAGS = [
    "Groove Cruise (Miami)","HOLY SHIP!","FRIENDSHIP Cruise","SXM Festival","BPM Festival","Tomorrowland (Belgium)",
    "Ultra Miami","EDC Las Vegas","EDC Orlando","EDC Mexico",
    "Coachella","Time Warp","Awakenings","Amsterdam Dance Event",
    "Ibiza closing parties","Burning Man","Mysteryland","Transmission",
    "Creamfields","Creamfields South","Defqon.1","Sunburn Goa","ZoukOut Singapore",
    "Day Zero Tulum","Elrow","EXIT Festival","Sonar Barcelona","Dekmantel",
    "Electric Daisy Carnival","Movement Detroit","Kappa FuturFestival","Balaton Sound","Parookaville",
    "Escape Halloween","Shambhala","Electric Forest","S2O Bangkok","Full Moon Party","Kolour in the Park","BOO!"
  ];

  // Throttle + cache to avoid 429s
  const CACHE_TTL_MS = 24*60*60*1000;
  const MAX_PARALLEL = 1;
  const SPACING_MS = 1400;
  let activeFetches = 0;

  const sleep = ms => new Promise(r=>setTimeout(r, ms));
  const k = (q,scope) => `ev-search:${scope}:${q}`;
  const getCache = (key) => {
    try{const v = JSON.parse(sessionStorage.getItem(key)||"null");
      if(!v) return null; if(Date.now()-v.t> CACHE_TTL_MS){sessionStorage.removeItem(key); return null;}
      return v.d;
    }catch{return null;}
  };
  const setCache = (key, data) => { try{sessionStorage.setItem(key, JSON.stringify({t:Date.now(), d:data}))}catch{} };

  async function fetchJSON(q, inCollection=true){
    // throttle
    while(activeFetches >= MAX_PARALLEL) await sleep(120);
    activeFetches++;
    try{
      const url = SEARCH_URL(q, inCollection);
      const res = await fetch(url, {credentials:"omit"});
      if(!res.ok) return {total:0, items:[]};
      const ct = res.headers.get("content-type")||"";
      if(!ct.includes("json")) return {total:0, items:[]};
      const data = await res.json();
      // Squarespace search JSON typically exposes either results[] or items[] + pagination.total
      const items = data.results || data.items || [];
      const total = (data.pagination && data.pagination.total) || items.length || 0;
      // Normalize to {url,title,date}
      const mapped = items.map(it => ({
        url: (it.fullUrl || it.url || it.assetUrl || "").replace(/\/\//g,"/"),
        title: it.title || it.itemTitle || it.seoTitle || "Untitled",
        date: it.publishOn || it.updatedOn || it.modifiedOn || it.createdOn || null
      }));
      return {total, items:mapped};
    }catch{ return {total:0, items:[]} }
    finally{ activeFetches--; await sleep(SPACING_MS); }
  }

  async function getCityResults(city){
    const baseKey = city.toLowerCase();
    const aliases = CITY_ALIASES[city] || [];
    const queries = [city, ...aliases];

    // 1) try collection first (cache across all aliases)
    for(const q of queries){
      const key = k(q,"col");
      const hit = getCache(key);
      if(hit) return hit;
      const r = await fetchJSON(q, true);
      if(r.total>0){ setCache(key,r); return r; }
    }
    // 2) fallback to site-wide
    for(const q of queries){
      const key = k(q,"site");
      const hit = getCache(key);
      if(hit) return hit;
      const r = await fetchJSON(q, false);
      if(r.total>0){ setCache(key,r); return r; }
    }
    // 3) nothing
    return {total:0, items:[]};
  }

  /* --- UI --- */
  let map, heat, density=.55, onlyEV=false;
  const heatPoints = [];
  const evMarkers = [];
  let popEl;

  function makeCard(){
    const wrap = document.createElement("div"); wrap.className="ev-card";
    wrap.innerHTML = `
      <div class="ev-head">
        <div class="row">
          <div class="ev-title">Explore Ravecations by City</div>
          <button class="chip" id="ev-reset">Reset view</button>
          <label class="chip switch" title="Show markers only where EV has content">
            <input id="ev-only" type="checkbox"><span>Only Electric Vibes content</span>
          </label>
          <label class="chip switch" title="Heat concentration">
            <input id="ev-heat" type="checkbox" checked>
            <span>Heatmap</span>
            <input id="ev-density" class="slider" type="range" min="0" max="1" step="0.05" value="${density}">
            <span style="color:#9dd1c8">content</span>
          </label>
          <div class="stats" id="ev-stats">Indexed 0/0. Matches: 0.</div>
        </div>
      </div>
      <div class="ev-map" id="ev-map"></div>
      <div class="ev-foot" id="ev-tags"></div>
    `;
    return wrap;
  }

  function styleDark(){
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
      b.className="chip"; b.type="button"; b.textContent=t;
      b.onclick = ()=>{
        const c = CITIES.find(c=> t.toLowerCase().includes(c[0].toLowerCase())) || CITIES[Math.floor(Math.random()*CITIES.length)];
        map.panTo({lat:c[1][0], lng:c[1][1]}); map.setZoom(5);
        showPopup(c[0]); // also try popup for that related city
      };
      bar.appendChild(b);
    });
  }

  function ensurePopup(){
    if(popEl) return popEl;
    popEl = document.createElement('div');
    popEl.id = "ev-rave-pop";
    popEl.style.display = "none";
    popEl.innerHTML = `
      <header><strong id="ev-pop-title">City</strong><button class="btn" id="ev-pop-close">Close</button></header>
      <div class="list" id="ev-pop-list"></div>
      <footer>
        <button class="btn" id="ev-pop-open">Open site search</button>
      </footer>
    `;
    document.getElementById('ev-rave-map').appendChild(popEl);
    document.getElementById('ev-pop-close').onclick = ()=> popEl.style.display="none";
    return popEl;
  }

  async function showPopup(city){
    const el = ensurePopup();
    document.getElementById('ev-pop-title').textContent = `${city} • Latest`;
    const list = document.getElementById('ev-pop-list');
    list.innerHTML = `<div style="opacity:.8">Searching…</div>`;

    const results = await getCityResults(city);
    list.innerHTML = "";
    if(results.total === 0){
      list.innerHTML = `<div style="opacity:.8">No recent Electric Vibes posts for “${city}”.</div>`;
    } else {
      results.items.slice(0,6).forEach(it=>{
        const a = document.createElement('div');
        a.className = "item";
        a.innerHTML = `<a href="${it.url.startsWith('http')? it.url : (BASE.replace(/\/$/,'') + (it.url.startsWith('/')? it.url : '/'+it.url))}" target="_top">
            ${it.title}
          </a>`;
        list.appendChild(a);
      });
    }

    document.getElementById('ev-pop-open').onclick = ()=>{
      const q = [city, ...(CITY_ALIASES[city]||[])][0];
      window.open(`${BASE}/search?q=${encodeURIComponent(q)}`, "_top");
    };

    el.style.display = "block";
  }

  /* --- Map build --- */
  async function build(){
    const host = document.getElementById("ev-rave-map");
    const card = makeCard(); host.appendChild(card);

    map = new google.maps.Map(document.getElementById("ev-map"), {
      center:{lat:20,lng:0}, zoom:2.3, minZoom:2, gestureHandling:"greedy",
      styles: styleDark(), mapTypeControl:true, streetViewControl:false, fullscreenControl:true
    });

    // Heatmap
    heat = new google.maps.visualization.HeatmapLayer({
      data: heatPoints, dissipating:true, radius:28, opacity:.55,
      gradient: [
        "rgba(0,0,0,0)",
        "rgba(0,255,255,1)",
        "rgba(0,191,255,1)",
        "rgba(0,127,255,1)",
        "rgba(0,63,255,1)",
        "rgba(127,0,255,1)",
        "rgba(191,0,191,1)",
        "rgba(255,0,127,1)",
        "rgba(255,0,63,1)"
      ]
    });
    heat.setMap(map);

    // Seed heat points
    CITIES.forEach(([name, [lat,lng]])=> heatPoints.push(new google.maps.LatLng(lat,lng)));
    heat.setData(heatPoints);

    // Controls
    const $only = document.getElementById("ev-only");
    const $heat = document.getElementById("ev-heat");
    const $dens = document.getElementById("ev-density");
    const $stats = document.getElementById("ev-stats");
    document.getElementById("ev-reset").onclick=()=>{map.setZoom(2.3);map.panTo({lat:20,lng:0})};
    $only.onchange = ()=>{ onlyEV = $only.checked; updateMarkers(); };
    $heat.onchange = ()=> heat.setMap($heat.checked? map : null);
    $dens.oninput = ()=>{ density = +$dens.value; heat.set("opacity",Math.max(.15,density)); heat.set("radius", 18 + Math.floor(40*density)); };

    renderTags();

    // Build EV markers slowly (so 429s are avoided)
    let indexed=0, matches=0;
    $stats.textContent = `Indexed ${indexed}/${CITIES.length}. Matches: ${matches}.`;

    for(const [name,[lat,lng]] of CITIES){
      // Use the *first alias* to widen the net for the marker count, but cache handles it anyway
      const q = [name, ...(CITY_ALIASES[name]||[])][0];
      const key = k(`count:${q}`,"col");
      let count = getCache(key);
      if(count==null){
        const res = await fetchJSON(q, true);
        count = res.total || 0;
        setCache(key, count);
      }
      indexed++; if(count>0) matches++;
      $stats.textContent = `Indexed ${indexed}/${CITIES.length}. Matches: ${matches}.`;

      // Marker (shown only when EV-only is ON & count>0)
      let m;
      if(google.maps.marker && google.maps.marker.AdvancedMarkerElement){
        const dot = document.createElement('div');
        dot.style.cssText="background:#33e0c3;box-shadow:0 0 14px #6af0d7;width:10px;height:10px;border-radius:50%;border:2px solid #08383a";
        m = new google.maps.marker.AdvancedMarkerElement({map:null,position:{lat,lng},content:dot,title:`${name} • ${count} post${count===1?"":"s"}`});
      }else{
        m = new google.maps.Marker({map:null,position:{lat,lng},title:`${name} • ${count} post${count===1?"":"s"}`});
      }
      m.__evCount = count;
      m.__evName = name;
      m.addListener("click", ()=> showPopup(name));
      evMarkers.push(m);
    }
    updateMarkers();

    // Heat click → nearest city popup
    map.addListener("click", (e)=>{
      // find nearest seeded point
      let best=CITIES[0], bd=Infinity;
      for(const c of CITIES){
        const d = Math.hypot(c[1][0]-e.latLng.lat(), c[1][1]-e.latLng.lng());
        if(d<bd){bd=d; best=c;}
      }
      showPopup(best[0]);
    });
  }

  function updateMarkers(){
    for(const m of evMarkers){
      const show = (onlyEV && m.__evCount>0);
      if('map' in m) m.map = show? map : null;
      else if(m.setMap) m.setMap(show? map : null);
    }
  }

  // Load Google Maps JS
  function inject(){
    if(window.google && google.maps) return build();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(window.EV_GMAPS_KEY||"")}&callback=__evInit&libraries=visualization,marker`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
    window.__evInit = ()=> build();
  }

  inject();
})();
