/*! Electric Vibes — Ravecations tiny build */
(function(){
  // ---------- tiny CSS safety for non-page injection ----------
  (function(){
    var el=document.createElement("style");
    el.textContent = `
      #ev-rave-map .ev-card{background:var(--ev-bg);color:var(--ev-ink);border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,.35);overflow:hidden}
      #ev-rave-map .ev-head{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px 10px;border-bottom:1px solid var(--ev-border)}
      #ev-rave-map .ev-title{font-weight:800;letter-spacing:.02em}
      #ev-rave-map .ev-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
      #ev-rave-map .ev-pill{background:var(--ev-chip);color:var(--ev-chip-ink);border:1px solid var(--ev-border);padding:6px 10px;border-radius:999px;font-size:12px;line-height:1;cursor:pointer;user-select:none;white-space:nowrap}
      #ev-rave-map .ev-pill:hover{border-color:var(--ev-accent)}
      #ev-rave-map .ev-switch{display:flex;align-items:center;gap:6px}
      #ev-rave-map .ev-switch input{accent-color:var(--ev-accent)}
      #ev-rave-map .ev-slider{appearance:none;width:120px;height:6px;border-radius:999px;background:#0a3234;outline:none}
      #ev-rave-map .ev-slider::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:var(--ev-accent)}
      #ev-rave-map .ev-foot{display:flex;gap:8px;flex-wrap:wrap;padding:10px 12px;border-top:1px solid var(--ev-border);background:var(--ev-bg)}
      #ev-rave-map .ev-stats{font-size:12px;color:var(--ev-ink-2);margin-left:auto}
      #ev-rave-map .ev-map{height:540px;background:var(--ev-bg-2)}
      @media(max-width:640px){ #ev-rave-map .ev-map{height:420px} }
    `;
    document.head.appendChild(el);
  })();

  // ---------- config ----------
  const COLLECTION = (window.EV_COLLECTION_ID||"").trim();
  const BASE = (window.EV_BASE && window.EV_BASE.trim()) || (location && location.origin) || "https://www.electricvibesusa.com";
  const SEARCH_URL = (q) => `${BASE}/search?q=${encodeURIComponent(q)}&format=json&collectionId=${COLLECTION}`;

  // ---------- Cities (name, qOverride?, [lat,lng]) ----------
  const CITIES = [
    // NA
    ["Miami",null,[25.7617,-80.1918]],["Orlando",null,[28.5384,-81.3789]],["New York",null,[40.7128,-74.0060]],
    ["Philadelphia",null,[39.9526,-75.1652]],["Washington DC","Washington", [38.9072,-77.0369]],["Atlanta",null,[33.749,-84.388]],
    ["Chicago",null,[41.8781,-87.6298]],["Detroit",null,[42.3314,-83.0458]],["Austin",null,[30.2672,-97.7431]],
    ["Denver",null,[39.7392,-104.9903]],["Houston",null,[29.7604,-95.3698]],["Saint Louis","St Louis",[38.627,-90.1994]],
    ["San Diego",null,[32.7157,-117.1611]],["San Francisco",null,[37.7749,-122.4194]],["Los Angeles",null,[34.0522,-118.2437]],
    ["Las Vegas",null,[36.1699,-115.1398]],["Toronto",null,[43.6532,-79.3832]],["Vancouver",null,[49.2827,-123.1207]],
    ["Mexico City","CDMX",[19.4326,-99.1332]],["Cancun","Cancún",[21.1619,-86.8515]],["Tulum",null,[20.2114,-87.4654]],
    ["SXM Festival","Saint Martin",[18.0708,-63.0501]],
    // EU mega
    ["London",null,[51.5074,-0.1278]],["Manchester",null,[53.4808,-2.2426]],["Ibiza",null,[38.9067,1.4206]],
    ["Barcelona",null,[41.3851,2.1734]],["Madrid",null,[40.4168,-3.7038]],["Paris",null,[48.8566,2.3522]],
    ["Amsterdam",null,[52.3676,4.9041]],["Berlin",null,[52.52,13.405]],["Munich",null,[48.1351,11.5820]],
    ["Copenhagen",null,[55.6761,12.5683]],["Stockholm",null,[59.3293,18.0686]],["Oslo",null,[59.9139,10.7522]],
    ["Prague",null,[50.0755,14.4378]],["Vienna",null,[48.2082,16.3738]],["Budapest",null,[47.4979,19.0402]],
    ["Warsaw",null,[52.2297,21.0122]],["Lisbon",null,[38.7223,-9.1393]],["Porto",null,[41.1579,-8.6291]],
    ["Zurich",null,[47.3769,8.5417]],["Milan",null,[45.4642,9.19]],["Rome",null,[41.9028,12.4964]],
    ["Brussels",null,[50.8503,4.3517]],["Antwerp",null,[51.2194,4.4025]],
    ["Boom (Tomorrowland)","Tomorrowland Belgium",[51.0916,4.3717]],
    // MEA
    ["Tel Aviv",null,[32.0853,34.7818]],["Dubai",null,[25.2048,55.2708]],["Doha",null,[25.2854,51.5310]],
    ["Cairo",null,[30.0444,31.2357]],["Marrakech","Marrakesh",[31.6295,-7.9811]],
    ["Cape Town",null,[-33.9249,18.4241]],["Johannesburg",null,[-26.2041,28.0473]],
    // APAC
    ["Tokyo",null,[35.6762,139.6503]],["Osaka",null,[34.6937,135.5023]],["Seoul",null,[37.5665,126.9780]],
    ["Shanghai",null,[31.2304,121.4737]],["Beijing",null,[39.9042,116.4074]],["Hong Kong",null,[22.3193,114.1694]],
    ["Singapore",null,[1.3521,103.8198]],["Bangkok",null,[13.7563,100.5018]],["Chiang Mai",null,[18.7883,98.9853]],
    ["Phuket",null,[7.8804,98.3923]],["Bali (Denpasar)","Bali",[-8.65,115.2167]],["Sydney",null,[-33.8688,151.2093]],
    ["Melbourne",null,[-37.8136,144.9631]],["Auckland",null,[-36.8485,174.7633]],
    // LATAM
    ["Rio de Janeiro","Rio",[-22.9068,-43.1729]],["São Paulo","Sao Paulo",[-23.5505,-46.6333]],
    ["Buenos Aires",null,[-34.6037,-58.3816]],["Santiago",null,[-33.4489,-70.6693]],
    ["Lima",null,[-12.0464,-77.0428]],["Bogotá","Bogota",[4.7110,-74.0721]],["Medellín","Medellin",[6.2476,-75.5658]]
  ];

  // ---------- Tags (3× more, EV-adjacent festivals) ----------
  const TAGS = [
    "Groove Cruise (Miami)","HOLY SHIP!","FRIENDSHIP Cruise","SXM Festival","BPM Festival","Tomorrowland (Belgium)",
    "Ultra Miami","EDC Las Vegas","Coachella","Time Warp","Awakenings","Amsterdam Dance Event",
    "Ibiza closing parties","Burning Man","Mysteryland","Creamfields","Defqon.1","Sunburn Goa",
    "ZoukOut Singapore","Creamfields Chile","Day Zero Tulum","Elrow","EXIT Festival","Sonar Barcelona",
    "Dekmantel","Electric Daisy Carnival","Movement Detroit","Kappa FuturFestival","Balaton Sound","Parookaville",
    "Shambhala","Electric Forest","520 Bangkok","Full Moon Party","Road to Ultra Thailand","Kolour in the Park","BOO!"
  ];

  // ---------- Throttle + cache to avoid 429 ----------
  const CACHE_TTL_MS = 24*60*60*1000;  // 24h
  const MAX_PARALLEL = 2;              // only 2 fetches at once
  const SPACING_MS = 1200;             // ~1.2s between fetches
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const keyFor = (q)=>`ev-search:${COLLECTION}:${q}`;
  const getCached = (k)=>{try{const v=JSON.parse(sessionStorage.getItem(k)||"null"); if(!v) return null; if(Date.now()-v.t>CACHE_TTL_MS){sessionStorage.removeItem(k);return null;} return v.d;}catch{return null;}};
  const setCached = (k,d)=>{try{sessionStorage.setItem(k,JSON.stringify({t:Date.now(),d}))}catch{}};
  let activeFetches=0;

  async function fetchCount(q){
    const k=keyFor(q), hit=getCached(k);
    if(hit!=null) return hit;

    // wait for a slot
    while(activeFetches>=MAX_PARALLEL) await sleep(120);
    activeFetches++;
    try{
      const res = await fetch(SEARCH_URL(q), {credentials:"omit"});
      if(!res.ok){ setCached(k,0); return 0; }             // throttle: assume 0 this round, will refill later
      const ct = res.headers.get("content-type")||"";
      if(!ct.includes("json")){ setCached(k,0); return 0; } // HTML fallback
      const data = await res.json();
      const count = (data?.pagination?.total || data?.results?.length || 0);
      setCached(k,count);
      return count;
    }catch{ setCached(k,0); return 0; }
    finally{ activeFetches--; await sleep(SPACING_MS); }
  }

  // ---------- UI ----------
  function mkCard(){
    const wrap=document.createElement("div"); wrap.className="ev-card";
    wrap.innerHTML = `
      <div class="ev-head">
        <div class="ev-row">
          <div class="ev-title">Explore Ravecations by City</div>
          <button type="button" class="ev-pill" id="ev-reset">Reset view</button>
          <label class="ev-pill ev-switch" title="Only show markers where EV has content">
            <input id="ev-only" type="checkbox"><span>Only Electric Vibes content</span>
          </label>
          <label class="ev-pill ev-switch" title="Heat concentration">
            <input id="ev-heat" type="checkbox" checked><span>Heatmap</span>
            <input id="ev-density" type="range" class="ev-slider" min="0" max="1" step="0.05" value="0.55">
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

  function darkStyle(){
    return [
      { elementType:"geometry", stylers:[{color:"#0b1b1e"}] },
      { elementType:"labels.text.fill", stylers:[{color:"#9dd1c8"}] },
      { elementType:"labels.text.stroke", stylers:[{color:"#0b1b1e"}] },
      { featureType:"water", stylers:[{color:"#0e2a]()
