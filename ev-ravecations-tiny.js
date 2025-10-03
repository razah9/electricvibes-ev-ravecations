/*! Electric Vibes — Ravecations tiny build (dark + heatmap + EV-only) */
(function () {
  // ---------- minimal CSS (scoped) ----------
  const css = `
  :root{
    --ev-bg:#0f2326; --ev-bg-2:#0b1b1e; --ev-chip:#10292e; --ev-chip-ink:#bfe7e0;
    --ev-ink:#d9f7f1; --ev-ink-2:#9dd1c8; --ev-accent:#33e0c3; --ev-border:#11353b;
  }
  #ev-rave-map .ev-card{background:var(--ev-bg); color:var(--ev-ink); border-radius:16px;
    box-shadow:0 10px 28px rgba(0,0,0,.35); overflow:hidden}
  #ev-rave-map .ev-head{display:flex;gap:10px;align-items:center;justify-content:space-between;
    padding:12px 14px 10px;border-bottom:1px solid var(--ev-border)}
  #ev-rave-map .ev-title{font-weight:800}
  #ev-rave-map .ev-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  #ev-rave-map .ev-pill{background:var(--ev-chip); color:var(--ev-chip-ink); border:1px solid var(--ev-border);
    padding:6px 10px; border-radius:999px; font-size:12px; line-height:1; cursor:pointer; user-select:none; white-space:nowrap}
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

  // ---------- config ----------
  const COLLECTION = (window.EV_COLLECTION_ID || "").trim();
  const locationOk = (location && location.origin);
  const BASE = (window.EV_BASE && String(window.EV_BASE).trim()) || (locationOk ? location.origin : "https://www.electricvibesusa.com");
  const SEARCH_URL = (q) => `${BASE}/search?q=${encodeURIComponent(q)}&format=json&collectionId=${COLLECTION}`;

  // ---------- cities (name, override query or null, [lat,lng]) ----------
  const CITIES = [
    // North America
    ["Miami",null,[25.7617,-80.1918]],["Orlando",null,[28.5384,-81.3789]],["New York",null,[40.7128,-74.0060]],
    ["Philadelphia",null,[39.9526,-75.1652]],["Washington DC","Washington",[38.9072,-77.0369]],
    ["Atlanta",null,[33.749,-84.388]],["Chicago",null,[41.8781,-87.6298]],["Detroit",null,[42.3314,-83.0458]],
    ["Austin",null,[30.2672,-97.7431]],["Dallas",null,[32.7767,-96.7970]],["Houston",null,[29.7604,-95.3698]],
    ["Denver",null,[39.7392,-104.9903]],["San Diego",null,[32.7157,-117.1611]],
    ["Los Angeles",null,[34.0522,-118.2437]],["San Francisco","San Francisco",[37.7749,-122.4194]],
    ["Las Vegas",null,[36.1699,-115.1398]],["Toronto",null,[43.6532,-79.3831]],["Vancouver",null,[49.2827,-123.1207]],
    ["Mexico City","CDMX",[19.4326,-99.1332]],["Cancun","Cancún",[21.1619,-86.8515]],["Tulum",null,[20.2114,-87.4654]],
    ["SXM Festival","Saint Martin",[18.0708,-63.0501]],
    // Europe
    ["London",null,[51.5074,-0.1278]],["Manchester",null,[53.4808,-2.2426]],["Ibiza",null,[38.9067,1.4206]],
    ["Barcelona",null,[41.3851,2.1734]],["Madrid",null,[40.4168,-3.7038]],
    ["Paris",null,[48.8566,2.3522]],["Lyon",null,[45.764,-4.8357]],["Amsterdam",null,[52.3676,4.9041]],
    ["Berlin",null,[52.52,13.405]],["Munich",null,[48.1351,11.5820]],["Copenhagen",null,[55.6761,12.5683]],
    ["Stockholm",null,[59.3293,18.0686]],["Oslo",null,[59.9139,10.7522]],["Helsinki",null,[60.1699,24.9384]],
    ["Prague",null,[50.0755,14.4378]],["Vienna",null,[48.2082,16.3738]],["Budapest",null,[47.4979,19.0402]],
    ["Warsaw",null,[52.2297,21.0122]],["Lisbon",null,[38.7223,-9.1393]],["Porto",null,[41.1579,-8.6291]],
    ["Zurich",null,[47.3769,8.5417]],["Milan",null,[45.4642,9.19]],["Rome",null,[41.9028,12.4964]],
    ["Brussels",null,[50.8503,4.3517]],["Antwerp",null,[51.2194,4.4025]],
    ["Boom (Tomorrowland)","Tomorrowland Belgium",[51.0916,4.3717]],
    // Middle East & Africa
    ["Tel Aviv",null,[32.0853,34.7818]],["Dubai",null,[25.2048,55.2708]],["Doha",null,[25.2854,51.5310]],
    ["Cairo",null,[30.0444,31.2357]],["Marrakech","Marrakesh",[31.6295,-7.9811]],
    ["Cape Town",null,[-33.9249,18.4241]],["Johannesburg",null,[-26.2041,28.0473]],
    // Asia-Pacific
    ["Tokyo",null,[35.6762,139.6503]],["Osaka",null,[34.6937,135.5023]],["Seoul",null,[37.5665,126.9780]],
    ["Shanghai",null,[31.2304,121.4737]],["Beijing",null,[39.9042,116.4074]],["Hong Kong",null,[22.3193,114.1694]],
    ["Singapore",null,[1.3521,103.8198]],["Bangkok",null,[13.7563,100.5018]],
    ["Chiang Mai",null,[18.7883,98.9853]],["Phuket",null,[7.8804,98.3923]],
    ["Bali (Denpasar)","Bali",[-8.65,115.2167]],["Sydney",null,[-33.8688,151.2093]],
    ["Melbourne",null,[-37.8136,144.9631]],["Auckland",null,[-36.8485,174.7633]],
    // South America
    ["Rio de Janeiro","Rio",[-22.9068,-43.1729]],["São Paulo","Sao Paulo",[-23.5505,-46.6331]],
    ["Buenos Aires",null,[-34.6037,-58.3816]],["Santiago",null,[-33.4489,-70.6693]],
    ["Lima",null,[-12.0464,-77.0421]],["Bogotá","Bogota",[4.7110,-74.0721]],["Medellín","Medellin",[6.2476,-75.5658]]
  ];

  // ---------- festival / topic chips (expanded) ----------
  const TAGS = [
    "Groove Cruise (Miami)","HOLY SHIP!","FRIENDSHIP Cruise","SXM Festival","BPM Festival","Tomorrowland (Belgium)",
    "Ultra Miami","EDC Las Vegas","Electric Daisy Carnival","Coachella","Time Warp","Awakenings","Amsterdam Dance Event",
    "Ibiza closing parties","Burning Man","Mysteryland","Creamfields","Creamfields Chile","Creamfields South","Defqon.1",
    "Sunburn Goa","ZoukOut Singapore","Day Zero Tulum","Elrow","EXIT Festival","Sonar Barcelona","Dekmantel",
    "Movement Detroit","Kappa FuturFestival","Balaton Sound","Parookaville","Hard Summer","Ultra Europe",
    "Tomorrowland Winter","EDC Japan","Beyond Wonderland","Nocturnal Wonderland","Escape Halloween","Dreamstate",
    "Wasteland","Countdown NYE","Shambhala","Electric Forest","S20 Bangkok","Full Moon Party",
    "Road to Ultra Thailand","Road to Ultra Mexico","Kolour in the Park","III Points","Hocus Pocus","Outlook Croatia","Dimensions Croatia"
  ];

  // ---------- request throttling & cache ----------
  const CACHE_TTL_MS = 24*60*60*1000;
  const MAX_PARALLEL = 1;     // be gentle to avoid 429s
  const SPACING_MS   = 2200;  // delay between calls

  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const cacheKey = (q)=>`ev-search:${COLLECTION}:${q}`;
  const getCached = (k)=>{
    try{
      const v = JSON.parse(sessionStorage.getItem(k) || "null");
      if(!v) return null;
      if(Date.now()-v.t > CACHE_TTL_MS){ sessionStorage.removeItem(k); return null; }
      return v.d;
    }catch{ return null; }
  };
  const setCached = (k,d)=>{ try{ sessionStorage.setItem(k, JSON.stringify({t:Date.now(), d})); }catch{} };

  async function fetchCount(q){
    const key = cacheKey(q);
    const hit = getCached(key);
    if(hit!=null) return hit;

    // simple parallel limiter
    while(activeFetches >= MAX_PARALLEL) await sleep(120);
    activeFetches++;
    try{
      const res = await fetch(SEARCH_URL(q), {credentials:"omit"});
      if(!res.ok){ setCached(key, 0); return 0; } // treat non-200 as 0 to avoid spinners
      const ct = res.headers.get("content-type") || "";
      if(!ct.includes("json")){ setCached(key, 0); return 0; }
      const data = await res.json();
      const count = (data?.pagination?.total || data?.results?.length || 0);
      setCached(key, count);
      return count;
    } catch {
      setCached(key, 0); return 0;
    } finally {
      activeFetches--;
      await sleep(SPACING_MS);
    }
  }

  // ---------- UI + Map ----------
  let map, heat, onlyEV=false, density=0.55, activeFetches=0;
  const heatPoints=[]; const evMarkers=[];

  function makeCard(){
    const wrap = document.createElement("div"); wrap.className="ev-card";
    wrap.innerHTML = `
      <div class="ev-head">
        <div class="ev-row">
          <div class="ev-title">Explore Ravecations by City</div>
          <button class="ev-pill" id="ev-reset" type="button">Reset view</button>
          <label class="ev-pill ev-switch" title="Show markers only where EV has content">
            <input id="ev-only" type="checkbox"><span>Only Electric Vibes content</span>
          </label>
          <label class="ev-pill ev-switch" title="Heat concentration">
            <input id="ev-heat" type="checkbox" checked><span>Heatmap</span>
            <input id="ev-density" class="ev-slider" type="range" min="0" max="1" step="0.05" value="${density}">
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
    const bar=document.getElementById("ev-tags");
    TAGS.forEach(t=>{
      const b=document.createElement("button");
      b.className="ev-pill"; b.type="button"; b.textContent=t;
      b.onclick=()=>{
        const c = CITIES.find(c => t.toLowerCase().includes(c[0].toLowerCase())) || CITIES[Math.floor(Math.random()*CITIES.length)];
        map.panTo({lat:c[2][0], lng:c[2][1]}); map.setZoom(5);
      };
      bar.appendChild(b);
    });
  }

  async function build(){
    // host container (use existing or create)
    const host = document.getElementById("ev-rave-map") || (function(){ const d=document.createElement("div"); d.id="ev-rave-map"; document.body.appendChild(d); return d;})();
    const card = makeCard(); host.appendChild(card);

    map = new google.maps.Map(document.getElementById("ev-map"), {
      center:{lat:20,lng:0}, zoom:2.3, minZoom:2, gestureHandling:"greedy",
      styles: googleStyleDark(), mapTypeControl:true, streetViewControl:false, fullscreenControl:true
    });

    heat = new google.maps.visualization.HeatmapLayer({ data:heatPoints, dissipating:true, radius:30, opacity:0.55 });
    heat.setMap(map);

    // controls
    const $only=document.getElementById("ev-only");
    const $heat=document.getElementById("ev-heat");
    const $dens=document.getElementById("ev-density");
    const $stats=document.getElementById("ev-stats");

    document.getElementById("ev-reset").onclick=()=>{ map.setZoom(2.3); map.panTo({lat:20,lng:0}); };
    $only.onchange=()=>{ onlyEV=$only.checked; updateVisibility(); };
    $heat.onchange=()=>{ heat.setMap($heat.checked?map:null); };
    $dens.oninput=()=>{ density=+$dens.value; heat.set("opacity", Math.max(.15,density)); heat.set("radius", 20+Math.floor(40*density)); };

    renderTags();

    // seed heatmap
    CITIES.forEach(([name,q,[lat,lng]])=> heatPoints.push(new google.maps.LatLng(lat,lng)));
    heat.setData(heatPoints);

    // index cities slowly to respect rate limits
    let indexed=0, matches=0;
    $stats.textContent=`Indexing ${indexed}/${CITIES.length}. Matches: ${matches}.`;
    for(const [name,q,[lat,lng]] of CITIES){
      const count = await fetchCount(q||name);
      indexed++; if(count>0) matches++;
      $stats.textContent=`Indexed ${indexed}/${CITIES.length}. Matches: ${matches}.`;

      // AdvancedMarker if available, else classic
      let m;
      if(google.maps.marker && google.maps.marker.AdvancedMarkerElement){
        const dot = document.createElement("div");
        dot.style.cssText="background:var(--ev-accent);box-shadow:0 0 16px #6af0d7;width:10px;height:10px;border-radius:50%;border:2px solid #08383a";
        m = new google.maps.marker.AdvancedMarkerElement({ map:null, position:{lat,lng}, title:`${name} • ${count} article${count===1?"":"s"}`, content:dot });
      } else {
        m = new google.maps.Marker({ map:null, position:{lat,lng}, title:`${name} • ${count} article${count===1?"":"s"}` });
      }
      m.__evCount = count; m.__evName = name;
      (m.addListener ? m.addListener("click", ()=> window.location.href = `${BASE}/search?q=${encodeURIComponent(q||name)}`) :
        m.addEventListener && m.addEventListener("click", ()=> window.location.href = `${BASE}/search?q=${encodeURIComponent(q||name)}`));
      evMarkers.push(m);
    }
    updateVisibility();
  }

  function updateVisibility(){
    for(const m of evMarkers){
      const show = (onlyEV ? (m.__evCount>0) : false); // we only show markers when “EV-only” is ON
      if("map" in m){ m.map = show?map:null; }
      else if(m.setMap){ m.setMap(show?map:null); }
    }
  }

  // load Google Maps JS (with visualization + marker)
  function injectScript(){
    if(window.google && google.maps){ build(); return; }
    const s = document.createElement("script");
    const libs = "visualization,marker";
    const key  = encodeURIComponent(window.EV_GMAPS_KEY||"");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=__evInit&libraries=${libs}`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
    window.__evInit = () => build();
  }

  injectScript();
})();
