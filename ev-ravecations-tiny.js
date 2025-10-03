/*! Electric Vibes — Ravecations tiny build (clickable heatmap + on-demand results) */
(function () {
  // ----- tiny CSS (scoped to our card) -----
  (function(){
    var el=document.createElement("style");
    el.textContent = `
#ev-rave-map .ev-card{background:#0f2326;color:#d9f7f1;border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,.35);overflow:hidden}
#ev-rave-map .ev-head{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px 10px;border-bottom:1px solid #11353b}
#ev-rave-map .ev-title{font-weight:800}
#ev-rave-map .ev-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
#ev-rave-map .ev-pill{background:#10292e;color:#bfe7e0;border:1px solid #11353b;padding:6px 10px;border-radius:999px;font-size:12px;line-height:1;cursor:pointer;user-select:none;white-space:nowrap}
#ev-rave-map .ev-pill:hover{border-color:#33e0c3}
#ev-rave-map .ev-switch{display:flex;align-items:center;gap:6px}
#ev-rave-map .ev-switch input{accent-color:#33e0c3}
#ev-rave-map .ev-slider{appearance:none;width:120px;height:6px;border-radius:999px;background:#0a3234;outline:none}
#ev-rave-map .ev-slider::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:#33e0c3}
#ev-rave-map .ev-map{height:540px;background:#0b1b1e}
#ev-rave-map .ev-foot{display:flex;gap:8px;flex-wrap:wrap;padding:10px 12px;border-top:1px solid #11353b;background:#0f2326}
#ev-rave-map .ev-chip{background:#10292e;color:#bfe7e0;border:1px solid #11353b;padding:7px 10px;border-radius:999px;font-size:12px;line-height:1;cursor:pointer}
#ev-rave-map .ev-chip:hover{border-color:#33e0c3}
#ev-rave-map .ev-stats{font-size:12px;color:#9dd1c8;margin-left:auto}
#ev-rave-map .ev-panel{position:absolute;left:12px;bottom:12px;max-width:420px;background:#0e1013;border:1px solid #11353b;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.35);padding:10px 10px 6px}
#ev-rave-map .ev-panel h4{margin:0 0 8px 6px;font-size:13px;letter-spacing:.04em;color:#bfe7e0}
#ev-rave-map .ev-list{display:flex;flex-direction:column;gap:6px}
#ev-rave-map .ev-item{display:flex;gap:10px;align-items:flex-start;background:#0b1b1e;border:1px solid #11353b;border-radius:10px;padding:8px 10px}
#ev-rave-map .ev-item a{color:#d9f7f1;text-decoration:none;font-weight:700}
#ev-rave-map .ev-item a:hover{color:#33e0c3}
#ev-rave-map .ev-close{margin-left:auto;border:0;background:#10292e;color:#bfe7e0;border:1px solid #11353b;padding:6px 10px;border-radius:999px;cursor:pointer}
#ev-rave-map .ev-empty{color:#9dd1c8;font-size:12px;padding:0 6px 6px}
@media(max-width:640px){#ev-rave-map .ev-map{height:420px} #ev-rave-map .ev-panel{right:12px;left:12px;max-width:none}}
    `;
    document.head.appendChild(el);
  })();

  // ----- Config + helpers -----
  const BASE = (window.EV_BASE && window.EV_BASE.trim()) || (location && location.origin) || "https://www.electricvibesusa.com";
  const COLLECTION = window.EV_COLLECTION_ID || "";
  const SEARCH_URL = (q) => `${BASE}/search?q=${encodeURIComponent(q)}&format=json&collectionId=${COLLECTION}`;
  const GMAPS_KEY = window.EV_GMAPS_KEY || "";

  const CACHE_TTL = 24*60*60*1000;
  const cacheGet = (k) => {
    try{const v=JSON.parse(sessionStorage.getItem(k)||"null"); if(!v) return null;
      if(Date.now()-v.t> CACHE_TTL){sessionStorage.removeItem(k);return null;} return v.d;
    }catch{return null;}
  };
  const cacheSet = (k,d) => { try{sessionStorage.setItem(k,JSON.stringify({t:Date.now(),d}))}catch{} };

  // Cities (biggish EV set; feel free to add)
  const CITIES = [
    // NA
    ["Miami",[25.7617,-80.1918]],["Orlando",[28.5384,-81.3789]],["New York",[40.7128,-74.006]],
    ["Los Angeles",[34.0522,-118.2437]],["San Francisco",[37.7749,-122.4194]],["San Diego",[32.7157,-117.1611]],
    ["Las Vegas",[36.1699,-115.1398]],["Chicago",[41.8781,-87.6298]],["Austin",[30.2672,-97.7431]],
    ["Denver",[39.7392,-104.9903]],["Detroit",[42.3314,-83.0458]],["Toronto",[43.6532,-79.3832]],
    ["Vancouver",[49.2827,-123.1207]],["Mexico City",[19.4326,-99.1332]],["Cancún",[21.1619,-86.8515]],
    // Europe
    ["London",[51.5074,-0.1278]],["Manchester",[53.4808,-2.2426]],["Ibiza",[38.9067,1.4206]],
    ["Amsterdam",[52.3676,4.9041]],["Berlin",[52.52,13.405]],["Paris",[48.8566,2.3522]],
    ["Lyon",[45.764,-4.8357]],["Barcelona",[41.3851,2.1734]],["Madrid",[40.4168,-3.7038]],
    ["Brussels",[50.8503,4.3517]],["Antwerp",[51.2194,4.4025]],["Milan",[45.4642,9.19]],
    ["Rome",[41.9028,12.4964]],["Vienna",[48.2082,16.3738]],["Budapest",[47.4979,19.0402]],
    ["Boom (Tomorrowland)",[51.0916,4.3717]],
    // MEA
    ["Tel Aviv",[32.0853,34.7818]],["Dubai",[25.2048,55.2708]],["Marrakech",[31.6295,-7.9811]],
    ["Cape Town",[-33.9249,18.4241]],["Johannesburg",[-26.2041,28.0473]],
    // APAC
    ["Tokyo",[35.6762,139.6503]],["Seoul",[37.5665,126.9780]],["Hong Kong",[22.3193,114.1694]],
    ["Singapore",[1.3521,103.8198]],["Bangkok",[13.7563,100.5018]],["Phuket",[7.8804,98.3923]],
    ["Chiang Mai",[18.7883,98.9853]],["Bali (Denpasar)",[-8.65,115.2167]],["Sydney",[-33.8688,151.2093]],
    ["Melbourne",[-37.8136,144.9631]],["Auckland",[-36.8485,174.7633]],
    // LATAM
    ["Rio de Janeiro",[-22.9068,-43.1729]],["São Paulo",[-23.5505,-46.6333]],
    ["Buenos Aires",[-34.6037,-58.3816]],["Santiago",[-33.4489,-70.6693]],
    ["Lima",[-12.0464,-77.0428]],["Bogotá",[4.7110,-74.0721]],["Medellín",[6.2476,-75.5658]]
  ];

  // Chips (3× more; tailored)
  const TAGS = [
    "Groove Cruise (Miami)","HOLY SHIP!","FRIENDSHIP Cruise","SXM Festival","BPM Festival",
    "Tomorrowland (Belgium)","Ultra Miami","EDC Las Vegas","EDC Orlando","EDC Mexico","EDC China",
    "Electric Daisy Carnival","Coachella","Time Warp","Awakenings","Amsterdam Dance Event",
    "Ibiza closing parties","Burning Man","Mysteryland","Transmission","Creamfields",
    "Creamfields South","Defqon.1","Sunburn Goa","ZoukOut Singapore","Day Zero Tulum",
    "Elrow","EXIT Festival","Sonar Barcelona","Dekmantel","Movement Detroit","Kappa FuturFestival",
    "Balaton Sound","Parookaville","Shambhala","Electric Forest","S2O Bangkok","Full Moon Party",
    "Road to Ultra Thailand","Kolour in the Park","BOO!"
  ];

  // ---- DOM ----
  function makeCard(){
    const wrap=document.createElement("div"); wrap.className="ev-card"; wrap.style.position="relative";
    wrap.innerHTML = `
      <div class="ev-head">
        <div class="ev-row">
          <div class="ev-title">Explore Ravecations by City</div>
          <button class="ev-pill" id="ev-reset">Reset view</button>
          <label class="ev-pill ev-switch" title="Show markers only where EV has content">
            <input id="ev-only" type="checkbox"><span>Only Electric Vibes content</span>
          </label>
          <label class="ev-pill ev-switch" title="Toggle heatmap">
            <input id="ev-heat" type="checkbox" checked><span>Heatmap</span>
          </label>
          <div class="ev-stats" id="ev-stats">Indexed 0/0. Matches: 0.</div>
        </div>
      </div>
      <div class="ev-map" id="ev-map"></div>
      <div class="ev-foot" id="ev-tags"></div>
      <div class="ev-panel" id="ev-panel" style="display:none"></div>
    `;
    return wrap;
  }

  function googleStyleDark(){
    return [
      {elementType:"geometry",stylers:[{color:"#0b1b1e"}]},
      {elementType:"labels.text.fill",stylers:[{color:"#9dd1c8"}]},
      {elementType:"labels.text.stroke",stylers:[{color:"#0b1b1e"}]},
      {featureType:"water",stylers:[{color:"#0e2a2d"}]},
      {featureType:"landscape",stylers:[{color:"#0f2326"}]},
      {featureType:"road",elementType:"geometry",stylers:[{color:"#13363a"}]},
      {featureType:"road",elementType:"labels.text.fill",stylers:[{color:"#bfe7e0"}]},
      {featureType:"poi",elementType:"geometry",stylers:[{color:"#0e2a2d"}]},
      {featureType:"administrative",elementType:"geometry",stylers:[{color:"#11353b"}]}
    ];
  }

  function renderTags(map){
    const bar=document.getElementById("ev-tags");
    TAGS.forEach(t=>{
      const b=document.createElement("button");
      b.className="ev-chip"; b.type="button"; b.textContent=t;
      b.onclick=()=>{
        const c=CITIES.find(c=>t.toLowerCase().includes(c[0].toLowerCase())) || CITIES[Math.floor(Math.random()*CITIES.length)];
        map.panTo({lat:c[1][0],lng:c[1][1]}); map.setZoom(5);
        openCity(c[0], c[1], true);
      };
      bar.appendChild(b);
    });
  }

  // ---- Search + panel (on demand) ----
  async function fetchLatest(q){
    const key=`ev:latest:${COLLECTION}:${q}`;
    const hit=cacheGet(key); if(hit) return hit;
    const res = await fetch(SEARCH_URL(q), {credentials:"omit"});
    if(!res.ok) return {items:[], total:0};
    const data = await res.json();
    const results = data.items || data.results || [];
    const items = results.slice(0,6).map(r=>({
      url: r.fullUrl || r.url || (r.assetUrl || ""),
      title: r.title || r.itemTitle || "Untitled",
      date: r.publishOn || r.publishDate || r.date || ""
    }));
    const total = (data.pagination && data.pagination.total) || results.length || 0;
    const payload = {items,total};
    cacheSet(key,payload);
    return payload;
  }

  function showPanel(city, payload){
    const panel=document.getElementById("ev-panel");
    if(!panel) return;
    if(!payload || !payload.items || payload.items.length===0){
      panel.innerHTML = `
        <h4>${city} • Latest</h4>
        <div class="ev-empty">No recent Electric Vibes posts for “${city}”.</div>
        <div style="display:flex;gap:8px;padding:0 6px 8px">
          <a class="ev-pill" href="${BASE}/search?q=${encodeURIComponent(city)}" target="_blank" rel="nofollow">Open site search</a>
          <button class="ev-close" id="ev-close">Close</button>
        </div>
      `;
      panel.style.display="block";
      panel.querySelector('#ev-close').onclick=()=>panel.style.display="none";
      return;
    }
    const list = payload.items.map(it=>`
      <div class="ev-item">
        <div style="font-size:12px;opacity:.8">${(new Date(it.date||Date.now())).toLocaleDateString()}</div>
        <a href="${it.url}" target="_blank" rel="noopener">${it.title}</a>
      </div>
    `).join("");
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <h4 style="margin:0">${city} • Latest (${payload.items.length}${payload.total>payload.items.length?` of ${payload.total}`:""})</h4>
        <a class="ev-pill" href="${BASE}/search?q=${encodeURIComponent(city)}" target="_blank" rel="nofollow">Open all</a>
        <button class="ev-close" id="ev-close">Close</button>
      </div>
      <div class="ev-list">${list}</div>
    `;
    panel.style.display="block";
    panel.querySelector('#ev-close').onclick=()=>panel.style.display="none";
  }

  // ---- Nearest city helper ----
  function nearestCity(latLng){
    let best=null, bestD=Infinity;
    for(const [name,[lat,lng]] of CITIES){
      const d = Math.hypot(latLng.lat()-lat, latLng.lng()-lng);
      if(d<bestD){bestD=d; best=[name,[lat,lng]];}
    }
    return best; // [name,[lat,lng]]
  }

  // ---- Markers (only when toggle ON; lazy fetch count per city) ----
  const markers=[];
  async function ensureMarker(map, name, pos){
    if(markers.find(m=>m.__name===name)) return;
    const m = (google.maps.marker && google.maps.marker.AdvancedMarkerElement)
      ? new google.maps.marker.AdvancedMarkerElement({
          map:null, position:{lat:pos[0],lng:pos[1]},
          title:`${name}`, content:(()=>{const d=document.createElement('div');
            d.style.cssText='background:#33e0c3;box-shadow:0 0 14px #6af0d7;width:10px;height:10px;border-radius:50%;border:2px solid #08383a'; return d;})()
        })
      : new google.maps.Marker({map:null, position:{lat:pos[0],lng:pos[1]}, title:`${name}`});
    m.__name=name;
    m.addListener("click",()=>openCity(name,pos,true));
    markers.push(m);
  }
  function setMarkersVisible(map, visible){
    for(const m of markers){ if(m.setMap) m.setMap(visible?map:null); else m.map = visible?map:null; }
  }

  // ---- Main build ----
  let map, heat, heatPoints=[];
  async function build(){
    const host = document.getElementById("ev-rave-map");
    const card = makeCard();
    host.appendChild(card);

    map = new google.maps.Map(document.getElementById("ev-map"),{
      center:{lat:20,lng:0}, zoom:2.8, minZoom:2,
      styles:googleStyleDark(), mapTypeControl:true, streetViewControl:false, fullscreenControl:true
    });

    heat = new google.maps.visualization.HeatmapLayer({
      data: heatPoints, dissipating:true, radius:28, opacity:0.55
    });
    heat.setMap(map);

    // seed heatmap (all cities)
    for(const [, [lat,lng]] of CITIES){ heatPoints.push(new google.maps.LatLng(lat,lng)); }
    heat.setData(heatPoints);

    // chips
    renderTags(map);

    // controls
    const $only=document.getElementById("ev-only");
    const $heat=document.getElementById("ev-heat");
    document.getElementById("ev-reset").onclick = ()=>{ map.setZoom(2.8); map.panTo({lat:20,lng:0}); };
    $heat.onchange = ()=> heat.setMap($heat.checked?map:null);
    $only.onchange = async ()=>{
      if($only.checked){
        // make/load markers lazily (no mass fetches)
        for(const [name,pos] of CITIES) await ensureMarker(map,name,pos);
        setMarkersVisible(map,true);
      } else {
        setMarkersVisible(map,false);
      }
    };

    // map clicks: open nearest city drawer
    map.addListener("click", async (ev)=>{
      const near = nearestCity(ev.latLng);
      if(!near) return;
      const [name,pos]=near;
      map.panTo({lat:pos[0],lng:pos[1]}); map.setZoom(Math.max(map.getZoom(),5));
      openCity(name,pos,true);
    });

    // stats (just cities count; no auto indexing to avoid 429)
    document.getElementById("ev-stats").textContent = `Indexed 0/${CITIES.length}. Matches: 0.`;
  }

  async function openCity(name,pos,focus){
    // fetch latest posts now (on demand)
    try{
      const payload = await fetchLatest(name);
      showPanel(name,payload);
      if(focus){ /* no-op for now */ }
    }catch(e){
      showPanel(name,{items:[],total:0});
    }
  }

  // ---- Load Google Maps once ----
  function injectScript(){
    if(window.google && google.maps){ build(); return; }
    const s=document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GMAPS_KEY)}&callback=__evInit&libraries=visualization,marker`;
    s.async=true; s.defer=true;
    document.head.appendChild(s);
    window.__evInit = ()=>build();
  }

  injectScript();
})();
