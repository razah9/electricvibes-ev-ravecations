/*! Electric Vibes — Ravecations tiny build (clickable heatmap + EV-only toggle + popups) */
(function () {
  /* ---------- minimal, scoped CSS ---------- */
  const css = `
    #ev-rave-map .ev-card{background:#0e2023;color:#d9f1ed;border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,.35);overflow:hidden}
    #ev-rave-map .ev-head{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #173237}
    #ev-rave-map .ev-title{font-weight:800;letter-spacing:.02em}
    #ev-rave-map .ev-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
    #ev-rave-map .ev-pill{background:#10292e;color:#bfe7e0;border:1px solid #173237;padding:6px 10px;border-radius:999px;font-size:12px;line-height:1;cursor:pointer;user-select:none}
    #ev-rave-map .ev-pill:hover{border-color:#33e0c3}
    #ev-rave-map .ev-switch{display:flex;align-items:center;gap:6px}
    #ev-rave-map .ev-switch input{accent-color:#33e0c3}
    #ev-rave-map .ev-slider{appearance:none;width:120px;height:6px;border-radius:999px;background:#08323a;outline:none}
    #ev-rave-map .ev-slider::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:#33e0c3;border:2px solid #0e2023}
    #ev-rave-map .ev-body{position:relative;min-height:460px}
    #ev-rave-map .ev-stats{font-size:12px;opacity:.7}
    #ev-rave-map .ev-panel{position:absolute;left:12px;right:12px;bottom:12px;background:#092126;border:1px solid #173237;border-radius:14px;max-width:520px}
    #ev-rave-map .ev-panel h4{margin:0;padding:10px 12px;border-bottom:1px solid #173237;font-size:14px}
    #ev-rave-map .ev-panel .ev-list{max-height:280px;overflow:auto}
    #ev-rave-map .ev-panel a{display:block;padding:10px 12px;border-top:1px solid #173237;color:#bfe7e0;text-decoration:none}
    #ev-rave-map .ev-panel a:hover{background:#0f2d34}
    @media (max-width:640px){#ev-rave-map .ev-panel{left:8px;right:8px}}
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- constants, data ---------- */
  const BASE = (window.EV_BASE || (location && location.origin)) || "https://www.electricvibesusa.com";
  const COLLECTIONS = Array.isArray(window.EV_COLLECTIONS) ? window.EV_COLLECTIONS : [];
  const SITE_WIDE_FALLBACK = window.EV_ALLOW_SITE_WIDE_FALLBACK !== false; // default true
  const GOOGLE_KEY = window.EV_GMAPS_KEY || "";

  // Cities (name, lat, lng). Add/remove as you like.
  // Keep these concise; the heatmap uses these anchors and we snap clicks to nearest.
  const CITIES = [
    ["Miami", 25.7617, -80.1918], ["Orlando", 28.5384, -81.3792], ["Las Vegas", 36.1699, -115.1398],
    ["Los Angeles", 34.0522, -118.2437], ["San Francisco", 37.7749, -122.4194], ["Denver",39.7392,-104.9903],
    ["Toronto", 43.6532, -79.3832], ["Mexico City",19.4326,-99.1332], ["Bogota",4.7110,-74.0721],
    ["Rio de Janeiro",-22.9068,-43.1729], ["Buenos Aires",-34.6037,-58.3816], ["Sao Paulo",-23.5505,-46.6333],
    ["Ibiza",38.9067,1.4206], ["Barcelona",41.3851,2.1734], ["Madrid",40.4168,-3.7038],
    ["Berlin",52.5200,13.4050], ["Brussels",50.8503,4.3517], ["Amsterdam",52.3676,4.9041],
    ["London",51.5074,-0.1278], ["Paris",48.8566,2.3522], ["Prague",50.0755,14.4378],
    ["Budapest",47.4979,19.0402], ["Vienna",48.2082,16.3738], ["Munich",48.1351,11.5820],
    ["Istanbul",41.0082,28.9784], ["Athens",37.9838,23.7275], ["Tel Aviv",32.0853,34.7818],
    ["Bangkok",13.7563,100.5018], ["Phuket",7.8804,98.3923], ["Seoul",37.5665,126.9780],
    ["Tokyo",35.6762,139.6503], ["Osaka",34.6937,135.5023], ["Singapore",1.3521,103.8198],
    ["Sydney",-33.8688,151.2093], ["Auckland",-36.8485,174.7633]
  ];

  // Chips → anchor city name (fixes “SXM chip jumps randomly”)
  const TAG_TO_CITY = {
    "SXM Festival":"Saint Martin", // if you later add Saint Martin coords, it’ll pan there
    "Groove Cruise (Miami)":"Miami",
    "Ultra Miami":"Miami",
    "Electric Daisy Carnival":"Las Vegas",
    "EDC Las Vegas":"Las Vegas",
    "Amsterdam Dance Event":"Amsterdam",
    "Tomorrowland (Belgium)":"Brussels",
    "Mysteryland":"Amsterdam",
    "Creamfields":"London",
    "Transmission":"Prague",
    "Balaton Sound":"Budapest",
    "Shambhala":"Vancouver",
    "BOO!":"Los Angeles",
    "S20 Bangkok":"Bangkok",
    "Day Zero Tulum":"Tulum",
    "ZoukOut Singapore":"Singapore",
    // add more chip → city mappings here as needed
  };

  // Hide roads/highway shields, de-clutter (and keep dark look)
  function googleStyleDarkNoRoads(){
    return [
      {elementType:'geometry',stylers:[{color:'#0b1e1f'}]},
      {elementType:'labels.text.fill',stylers:[{color:'#99d1c8'}]},
      {elementType:'labels.text.stroke',stylers:[{color:'#0b1e1f'}]},
      {featureType:'poi',stylers:[{visibility:'off'}]},
      {featureType:'transit',stylers:[{visibility:'off'}]},
      {featureType:'administrative',elementType:'geometry',stylers:[{color:'#11353b'}]},
      {featureType:'road',elementType:'geometry',stylers:[{visibility:'off'}]},
      {featureType:'road',elementType:'labels',stylers:[{visibility:'off'}]},
      {featureType:'road.highway',stylers:[{visibility:'off'}]}
    ];
  }

  /* ---------- tiny DOM helpers ---------- */
  const $ = (sel, root=document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const d = document.createElement(tag);
    if(cls) d.className = cls;
    if(html!=null) d.innerHTML = html;
    return d;
  };

  /* ---------- cache + throttling ---------- */
  const CACHE_TTL_MS = 24*60*60*1000;
  const MAX_PARALLEL = 4;
  let inFlight = 0;
  const queue = [];

  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
  function cacheKey(kind, key){ return `ev:${kind}:${key}`; }
  function getCached(kind, key){
    try{
      const raw = sessionStorage.getItem(cacheKey(kind,key));
      if(!raw) return null;
      const v = JSON.parse(raw);
      if(Date.now() - v.t > CACHE_TTL_MS){ sessionStorage.removeItem(cacheKey(kind,key)); return null; }
      return v.d;
    }catch(_){ return null; }
  }
  function setCached(kind, key, data){
    try{ sessionStorage.setItem(cacheKey(kind,key), JSON.stringify({t:Date.now(), d:data})); }catch(_){}
  }

  async function limitedFetch(url){
    return new Promise(async (resolve) => {
      const run = async () => {
        inFlight++;
        try {
          const res = await fetch(url, {credentials:"omit"});
          resolve(res);
        } catch(e) {
          resolve(null);
        } finally {
          inFlight--;
          const next = queue.shift();
          if(next) next();
        }
      };
      if(inFlight < MAX_PARALLEL) run();
      else queue.push(run);
    });
  }

  /* ---------- Squarespace search helpers ---------- */
  function siteSearchUrl(q, collectionId){
    const base = `${BASE}/search?q=${encodeURIComponent(q)}&format=json`;
    return collectionId ? `${base}&collectionId=${collectionId}` : base;
  }

  async function countPostsForCity(name){
    // First check collections (aggregate total)
    let total = 0;
    for(const id of COLLECTIONS){
      const ck = `count:${name}:${id}`;
      const c = getCached("count", ck);
      if(c!=null){ total += c; continue; }

      const res = await limitedFetch(siteSearchUrl(name, id));
      if(!res || !res.ok){ await sleep(120); continue; }
      const data = await res.json().catch(()=>null);
      const count = (data && data.pagination && data.pagination.total) ? data.pagination.total : 0;
      setCached("count", ck, count);
      total += count;
      await sleep(120);
    }

    // If nothing found and fallback allowed → site-wide
    if(total===0 && SITE_WIDE_FALLBACK){
      const ck = `count:${name}:site`;
      const cached = getCached("count", ck);
      if(cached!=null) return cached;
      const res = await limitedFetch(siteSearchUrl(name, ""));
      if(res && res.ok){
        const data = await res.json().catch(()=>null);
        const c = (data && data.pagination && data.pagination.total) ? data.pagination.total : 0;
        setCached("count", ck, c);
        return c;
      }
    }
    return total;
  }

  async function latestPostsForCity(name, limit=10){
    // Try each collection until we gather up to `limit`; if none, optionally site-wide
    const items = [];
    for(const id of COLLECTIONS){
      const ck = `list:${name}:${id}`;
      let list = getCached("list", ck);
      if(!list){
        const res = await limitedFetch(siteSearchUrl(name, id));
        if(res && res.ok){
          const data = await res.json().catch(()=>null);
          list = (data && data.items) ? data.items : [];
          setCached("list", ck, list);
        }else{
          list = [];
        }
        await sleep(120);
      }
      for(const it of list){
        items.push({
          url: it.fullUrl || it.clickthroughUrl || it.url || "#",
          title: it.title || it.pageTitle || "Untitled"
        });
        if(items.length>=limit) return items;
      }
    }
    if(items.length===0 && SITE_WIDE_FALLBACK){
      const ck = `list:${name}:site`;
      let list = getCached("list", ck);
      if(!list){
        const res = await limitedFetch(siteSearchUrl(name,""));
        if(res && res.ok){
          const data = await res.json().catch(()=>null);
          list = (data && data.items) ? data.items : [];
          setCached("list", ck, list);
        }else list=[];
      }
      return list.slice(0, limit).map(it => ({
        url: it.fullUrl || it.clickthroughUrl || it.url || "#",
        title: it.title || it.pageTitle || "Untitled"
      }));
    }
    return items.slice(0, limit);
  }

  /* ---------- UI: panel + chips ---------- */
  function makeCard(){
    const wrap = el("div","ev-card");
    wrap.innerHTML = `
      <div class="ev-head">
        <div class="ev-row">
          <span class="ev-title">Explore Ravecations by City</span>
          <span class="ev-switch"><input id="ev-only" type="checkbox" checked><label for="ev-only">Only Electric Vibes content</label></span>
          <span class="ev-switch"><input id="ev-heat" type="checkbox" checked><label for="ev-heat">Heatmap</label></span>
          <span class="ev-switch">content <input id="ev-density" class="ev-slider" type="range" min="0" max="1" step="0.05" value="0.6"></span>
        </div>
        <div class="ev-stats" id="ev-stats">Indexed 0/0. Matches: 0.</div>
      </div>
      <div class="ev-body" id="ev-body"></div>
      <div class="ev-foot" id="ev-tags"></div>
    `;
    return wrap;
  }

  const CHIPS = [
    "Groove Cruise (Miami)","HOLY SHIP!","FRIENDSHIP Cruise","SXM Festival","BPM Festival",
    "Tomorrowland (Belgium)","Ultra Miami","EDC Las Vegas","Electric Daisy Carnival",
    "Amsterdam Dance Event","Mysteryland","Transmission","Creamfields","Balaton Sound",
    "Shambhala","ZoukOut Singapore","S20 Bangkok","Day Zero Tulum","BOO!"
  ];

  function renderChips(){
    const bar = $("#ev-tags");
    bar.innerHTML = "";
    CHIPS.forEach(txt=>{
      const b = el("button","ev-pill",txt);
      b.onclick = () => {
        const target = TAG_TO_CITY[txt] || txt;
        const m = CITIES.find(([n]) => n.toLowerCase()===target.toLowerCase());
        if(m){ panToCity(m); showCityPanel(m[0]); }
      };
      bar.appendChild(b);
    });
  }

  /* ---------- Map + heatmap ---------- */
  let map, heat, markers=[], heatPoints=[];
  let onlyEV = true, density=0.6;

  function nearestCity(latLng){
    let best=null, bestD=1e9;
    for(const c of CITIES){
      const dlat=c[1]-latLng.lat(), dlng=c[2]-latLng.lng();
      const d = dlat*dlat+dlng*dlng;
      if(d<bestD){ bestD=d; best=c; }
    }
    return best; // [name,lat,lng]
  }

  function addHeat(){
    heatPoints = CITIES.map(([n,lat,lng]) => new google.maps.LatLng(lat, lng));
    heat = new google.maps.visualization.HeatmapLayer({
      data: heatPoints, dissipating:true, radius: 38, opacity: .55
    });
    heat.setMap(map);
    updateHeat();
  }
  function updateHeat(){ if(!heat) return; heat.set("radius", Math.floor(20 + 40*density)); heat.set("opacity", .35 + .45*density); }

  function addMarkers(){
    markers = [];
    for(const [name,lat,lng] of CITIES){
      const m = new google.maps.Marker({
        map, position: {lat,lng}, title: name, opacity: 0   // invisible click-targets
      });
      m.addListener("click", ()=> showCityPanel(name));
      markers.push(m);
    }
  }
  function showMarkers(flag){
    markers.forEach(m => m.setMap(flag? map : null));
  }
  function panToCity(city){
    map.panTo({lat:city[1], lng:city[2]}); map.setZoom(11);
  }

  let panel;
  async function showCityPanel(cityName){
    if(!panel){
      panel = el("div","ev-panel");
      $("#ev-body").appendChild(panel);
    }
    panel.innerHTML = `<h4>${cityName} • Latest</h4><div class="ev-list">Loading…</div>`;
    const listEl = $(".ev-list", panel);

    // Respect Only EV toggle by clearing fallback temporarily
    const originalFallback = SITE_WIDE_FALLBACK;
    const doFallback = SITE_WIDE_FALLBACK && !onlyEV ? true : SITE_WIDE_FALLBACK;

    const count = await countPostsForCity(cityName);
    const items = (count>0 || doFallback) ? await latestPostsForCity(cityName, 12) : [];

    if(!items || items.length===0){
      listEl.innerHTML = `
        <div style="padding:12px">No recent Electric Vibes posts for “${cityName}”.</div>
        <a href="${BASE}/search?q=${encodeURIComponent(cityName)}" target="_blank" rel="nofollow">Open site search</a>
      `;
    }else{
      listEl.innerHTML = items.map(it => `<a href="${it.url}">${it.title}</a>`).join("");
    }
  }

  /* ---------- build ---------- */
  async function build(){
    const host = document.getElementById("ev-rave-map");
    const card = makeCard(); host.appendChild(card);

    // Map
    map = new google.maps.Map($("#ev-body"), {
      center: {lat: 25, lng: 0}, zoom: 2.8, minZoom: 2,
      styles: googleStyleDarkNoRoads(),
      mapTypeControl: true, streetViewControl:false, fullscreenControl:true
    });

    addHeat();
    addMarkers();
    showMarkers(true);

    // UI wiring
    $("#ev-heat").onchange = e => heat.setMap(e.target.checked ? map : null);
    $("#ev-density").oninput = e => { density = +e.target.value; updateHeat(); };
    $("#ev-only").onchange = e => { onlyEV = e.target.checked; };

    map.addListener("click", (ev)=>{
      const near = nearestCity(ev.latLng);
      if(near){ showCityPanel(near[0]); }
    });

    renderChips();
    $("#ev-stats").textContent = `Indexed ${CITIES.length}/${CITIES.length}. Matches: 0.`;
  }

  /* ---------- google loader ---------- */
  function injectScript(){
    if(!GOOGLE_KEY){ console.error("EV: Missing Google Maps JS key"); return; }
    if(window.google && google.maps){ build(); return; }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}&callback=__evInit&libraries=visualization`;
    s.async = true; s.defer = true; document.head.appendChild(s);
    window.__evInit = () => build();
  }
  injectScript();
})();
