/*! Electric Vibes — Ravecations tiny build (dark + heatmap + EV-only + throttled fetch) */
(function () {
  // ---------- CSS (scoped to #ev-rave-map) ----------
  (function(){
    var el = document.createElement("style");
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
#ev-rave-map .ev-foot{display:flex;gap:8px;flex-wrap:wrap;padding:10px 12px;border-top:1px solid #11353b;background:#0f2326}
#ev-rave-map .ev-stats{font-size:12px;color:#9dd1c8;margin-left:auto}
#ev-rave-map .ev-map{height:540px;background:#0b1b1e}
#ev-rave-map canvas{image-rendering:auto !important} /* avoid “red blocks” from pixelation */
@media(max-width:640px){#ev-rave-map .ev-map{height:420px}}
    `;
    document.head.appendChild(el);
  })();

  // ---------- config ----------
  var COLLECTION = (window.EV_COLLECTION_ID || "").trim();
  var BASE = (window.EV_BASE && window.EV_BASE.trim()) || (location && location.origin) || "https://www.electricvibesusa.com";
  function SEARCH_URL(q){ return BASE + "/search?q=" + encodeURIComponent(q) + "&format=json&collectionId=" + COLLECTION; }

  // Cities (name, optional query override, [lat,lng]) — includes Thailand focus
  var CITIES = [
    // North America
    ["Miami",null,[25.7617,-80.1918]],["New York",null,[40.7128,-74.0060]],["Orlando",null,[28.5384,-81.3789]],
    ["Los Angeles",null,[34.0522,-118.2437]],["San Francisco","San Francisco",[37.7749,-122.4194]],["Chicago",null,[41.8781,-87.6298]],
    ["Austin",null,[30.2672,-97.7431]],["Detroit",null,[42.3314,-83.0458]],["Denver",null,[39.7392,-104.9903]],
    ["Las Vegas",null,[36.1699,-115.1398]],["Toronto",null,[43.6532,-79.3832]],["Vancouver",null,[49.2827,-123.1207]],
    ["Mexico City","CDMX",[19.4326,-99.1332]],["Cancún","Cancun",[21.1619,-86.8515]],["Tulum",null,[20.2114,-87.4654]],
    // Europe
    ["London",null,[51.5074,-0.1278]],["Manchester",null,[53.4808,-2.2426]],["Ibiza",null,[38.9067,1.4206]],
    ["Barcelona",null,[41.3851,2.1734]],["Madrid",null,[40.4168,-3.7038]],["Paris",null,[48.8566,2.3522]],
    ["Lyon",null,[45.7640,-4.8357]],["Amsterdam",null,[52.3676,4.9041]],["Berlin",null,[52.5200,13.4050]],
    ["Munich",null,[48.1351,11.5820]],["Copenhagen",null,[55.6761,12.5683]],["Stockholm",null,[59.3293,18.0686]],
    ["Oslo",null,[59.9139,10.7522]],["Helsinki",null,[60.1699,24.9384]],["Prague",null,[50.0755,14.4378]],
    ["Vienna",null,[48.2082,16.3738]],["Budapest",null,[47.4979,19.0402]],["Warsaw",null,[52.2297,21.0122]],
    ["Lisbon",null,[38.7223,-9.1393]],["Porto",null,[41.1579,-8.6291]],["Zurich",null,[47.3769,8.5417]],
    ["Milan",null,[45.4642,9.1900]],["Rome",null,[41.9028,12.4964]],["Brussels",null,[50.8503,4.3517]],
    ["Antwerp",null,[51.2194,4.4025]],["Boom","Tomorrowland Belgium",[51.0916,4.3717]],
    // Middle East & Africa
    ["Tel Aviv",null,[32.0853,34.7818]],["Dubai",null,[25.2048,55.2708]],["Doha",null,[25.2854,51.5310]],
    ["Cairo",null,[30.0444,31.2357]],["Marrakech","Marrakesh",[31.6295,-7.9811]],
    ["Cape Town",null,[-33.9249,18.4241]],["Johannesburg",null,[-26.2041,28.0473]],
    // Asia-Pacific (Thailand emphasis)
    ["Bangkok",null,[13.7563,100.5018]],["Phuket",null,[7.8804,98.3923]],["Pattaya",null,[12.9236,100.8825]],
    ["Tokyo",null,[35.6762,139.6503]],["Osaka",null,[34.6937,135.5023]],["Seoul",null,[37.5665,126.9780]],
    ["Shanghai",null,[31.2304,121.4737]],["Beijing",null,[39.9042,116.4074]],["Hong Kong",null,[22.3193,114.1694]],
    ["Singapore",null,[1.3521,103.8198]],["Chiang Mai",null,[18.7883,98.9853]],
    ["Bali (Denpasar)","Bali",[-8.6500,115.2167]],["Sydney",null,[-33.8688,151.2093]],
    ["Melbourne",null,[-37.8136,144.9631]],["Auckland",null,[-36.8485,174.7633]],
    // South America
    ["Rio de Janeiro","Rio",[-22.9068,-43.1729]],["São Paulo","Sao Paulo",[-23.5505,-46.6333]],
    ["Buenos Aires",null,[-34.6037,-58.3816]],["Santiago",null,[-33.4489,-70.6693]],
    ["Lima",null,[-12.0464,-77.0428]],["Bogotá","Bogota",[4.7110,-74.0721]],["Medellín","Medellin",[6.2476,-75.5658]]
  ];

  // Festival chips (expanded; feel free to add/remove)
  var TAGS = [
    "Groove Cruise (Miami)","HOLY SHIP!","FRIENDSHIP Cruise","SXM Festival","BPM Festival","Tomorrowland (Belgium)",
    "Ultra Miami","EDC Las Vegas","EDC Orlando","EDC Mexico","EDC China","Electric Daisy Carnival",
    "Coachella","Time Warp","Awakenings","Amsterdam Dance Event",
    "Ibiza closing parties","Burning Man","Mysteryland","Transmission","Creamfields","Creamfields South",
    "Defqon.1","Sunburn Goa","ZoukOut Singapore","Day Zero Tulum","Elrow","EXIT Festival","Sonar Barcelona",
    "Dekmantel","Movement Detroit","Kappa FuturFestival","Balaton Sound","Parookaville",
    "Beyond Wonderland","Nocturnal Wonderland","Escape Halloween","Dreamstate","Wasteland","Countdown NYE",
    "Shambhala","Electric Forest","S20 Bangkok","Full Moon Party","Road to Ultra Thailand","Kolour in the Park","BOO!"
  ];

  // Throttling + caching to avoid 429s
  var CACHE_TTL_MS = 24*60*60*1000;
  var MAX_PARALLEL = 2;
  var SPACING_MS = 1400;
  var activeFetches = 0;

  var sleep = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  function cacheKey(q){ return "ev-search:" + COLLECTION + ":" + q; }
  function cacheGet(k){
    try{
      var v = JSON.parse(sessionStorage.getItem(k) || "null");
      if(!v) return null;
      if(Date.now() - v.t > CACHE_TTL_MS){ sessionStorage.removeItem(k); return null; }
      return v.d;
    }catch(_){ return null; }
  }
  function cacheSet(k,d){ try{ sessionStorage.setItem(k, JSON.stringify({t:Date.now(), d:d})); }catch(_){ } }

  async function fetchCount(q){
    var k = cacheKey(q);
    var hit = cacheGet(k);
    if(hit != null) return hit;

    while(activeFetches >= MAX_PARALLEL) await sleep(120);
    activeFetches++;
    try{
      var res = await fetch(SEARCH_URL(q), {credentials:"omit"});
      if(!res.ok) throw new Error("HTTP "+res.status);
      var ct = (res.headers.get("content-type") || "").toLowerCase();
      if(ct.indexOf("json") === -1){ cacheSet(k,0); return 0; }
      var data = await res.json();
      var count = (data && data.pagination && data.pagination.total) || (data && data.results && data.results.length) || 0;
      cacheSet(k,count);
      return count;
    } catch(_){
      return 0;
    } finally {
      activeFetches--;
      await sleep(SPACING_MS);
    }
  }

  // ---------- UI + Map ----------
  var map, heat, onlyEV=false, density=0.55;
  var heatPoints = [];
  var evMarkers = [];

  function makeCard(){
    var wrap = document.createElement("div"); wrap.className="ev-card";
    wrap.innerHTML = `
      <div class="ev-head">
        <div class="ev-row">
          <div class="ev-title">Explore Ravecations by City</div>
          <button class="ev-pill" id="ev-reset" type="button">Reset view</button>
          <label class="ev-pill ev-switch" title="Show markers only where EV has content">
            <input id="ev-only" type="checkbox">
            <span>Only Electric Vibes content</span>
          </label>
          <label class="ev-pill ev-switch" title="Heat concentration">
            <input id="ev-heat" type="checkbox" checked>
            <span>Heatmap</span>
            <input id="ev-density" type="range" class="ev-slider" min="0" max="1" step="0.05" value="${density}">
            <span style="color:#9dd1c8">content</span>
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
    var bar = document.getElementById("ev-tags");
    TAGS.forEach(function(t){
      var b = document.createElement("button");
      b.className="ev-pill"; b.type="button"; b.textContent = t;
      b.onclick = function(){
        var c = CITIES.find(function(c){ return t.toLowerCase().includes(c[0].toLowerCase()); }) || CITIES[(Math.random()*CITIES.length)|0];
        map.panTo({lat:c[2][0], lng:c[2][1]}); map.setZoom(5);
      };
      bar.appendChild(b);
    });
  }

  function setHeatmapVisuals(){
    // Smoother look and no “big red tiles”
    var gradient = [
      "rgba(0, 255, 255, 0)",
      "rgba(0, 255, 255, 1)",
      "rgba(0, 191, 255, 1)",
      "rgba(0, 127, 255, 1)",
      "rgba(0, 63, 255, 1)",
      "rgba(0, 0, 255, 1)",
      "rgba(127, 0, 255, 1)",
      "rgba(191, 0, 255, 1)",
      "rgba(255, 0, 191, 1)",
      "rgba(255, 0, 127, 1)",
      "rgba(255, 0, 63, 1)",
      "rgba(255, 0, 0, 1)"
    ];
    heat.set("gradient", gradient);
    heat.set("radius", 26);
    heat.set("opacity", 0.6);
    heat.set("dissipating", true);
  }

  async function build(){
    var host = document.getElementById("ev-rave-map");
    if(!host){ host = document.createElement("div"); host.id="ev-rave-map"; document.body.appendChild(host); }
    var card = makeCard(); host.appendChild(card);

    map = new google.maps.Map(document.getElementById("ev-map"), {
      center:{lat:20,lng:0}, zoom:2.3, minZoom:2, gestureHandling:"greedy",
      styles: googleStyleDark(), mapTypeControl:true, streetViewControl:false, fullscreenControl:true
    });

    // Heatmap
    heat = new google.maps.visualization.HeatmapLayer({ data: heatPoints });
    heat.setMap(map);
    setHeatmapVisuals();

    var $only = document.getElementById("ev-only");
    var $heat = document.getElementById("ev-heat");
    var $dens = document.getElementById("ev-density");
    var $stats= document.getElementById("ev-stats");

    document.getElementById("ev-reset").onclick = function(){ map.setZoom(2.3); map.panTo({lat:20,lng:0}); };

    $only.onchange = function(){ onlyEV = $only.checked; updateVisibility(); };
    $heat.onchange = function(){ heat.setMap($heat.checked ? map : null); };
    $dens.oninput = function(){
      density = +$dens.value;
      heat.set("opacity", Math.max(.15, 0.35 + density*0.5));
      heat.set("radius", 18 + Math.floor(30*density));
    };

    renderTags();

    // seed points (one per city so the heatmap has a global feel)
    CITIES.forEach(function(c){ heatPoints.push(new google.maps.LatLng(c[2][0], c[2][1])); });
    heat.setData(heatPoints);

    // crawl EV counts slowly (respect rate limits)
    var indexed=0, matches=0;
    $stats.textContent = "Indexing "+indexed+"/"+CITIES.length+". Matches: "+matches+".";
    for (var i=0;i<CITIES.length;i++){
      var name = CITIES[i][0], q = CITIES[i][1], lat=CITIES[i][2][0], lng=CITIES[i][2][1];
      var count = await fetchCount(q || name);
      indexed++; if(count>0) matches++;
      $stats.textContent = "Indexed "+indexed+"/"+CITIES.length+". Matches: "+matches+".";

      var markerContent = (function(){ var d=document.createElement("div");
        d.style.cssText="background:#33e0c3;box-shadow:0 0 16px #6af0d7;width:10px;height:10px;border-radius:50%;border:2px solid #08383a";
        return d;})();

      var m;
      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement){
        m = new google.maps.marker.AdvancedMarkerElement({
          map: onlyEV ? map : null,
          position:{lat:lat,lng:lng},
          title: name+" • "+count+" article"+(count===1?"":"s"),
          content: markerContent
        });
      } else {
        m = new google.maps.Marker({
          map: onlyEV ? map : null,
          position:{lat:lat,lng:lng},
          title: name+" • "+count+" article"+(count===1?"":"s")
        });
      }
      m.__evCount = count; m.__evName = name;
      (m.addListener ? m.addListener("click", function(){ location.href = BASE + "/search?q=" + encodeURIComponent(q||name); })
                     : m.addEventListener && m.addEventListener("click", function(){ location.href = BASE + "/search?q=" + encodeURIComponent(q||name); }));
      evMarkers.push(m);
    }
    updateVisibility();
  }

  function updateVisibility(){
    for (var i=0;i<evMarkers.length;i++){
      var m = evMarkers[i];
      var show = (onlyEV ? (m.__evCount>0) : false);
      if ("setMap" in m) m.setMap(show ? map : null);
      else m.map = show ? map : null;
    }
  }

  // ---------- load Google Maps once ----------
  (function inject(){
    if (window.google && google.maps){ build(); return; }
    if (document.getElementById("ev-maps-loader")) return;
    var libs = "visualization,marker";
    var s = document.createElement("script");
    s.id = "ev-maps-loader";
    s.src = "https://maps.googleapis.com/maps/api/js?key="+encodeURIComponent(window.EV_GMAPS_KEY||"")+"&callback=__evInit&libraries="+libs;
    s.async = true; s.defer = true;
    window.__evInit = function(){ build(); };
    document.head.appendChild(s);
  })();
})();
