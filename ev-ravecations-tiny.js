<!-- ===== Ravecations tiny build (EV news only, roads hidden) ===== -->
<script>
(function(){
  const BASE   = (window.EV_BASE || location.origin || "").replace(/\/$/,"");
  const KEY    = window.EV_GMAPS_KEY || "";
  // 👉 only EV news for now (change/add later if you want)
  const SOURCES= [{ id:"68d4f9094d70f97945b14d6e", path:"/news" }];
  const DEFAULT_HEAT = window.EV_DEFAULT_HEATMAP !== false;
  const HIDE_HWY = true;            // force hide highways
  const CHIP_ZOOM = Number(window.EV_CHIP_ZOOM||6);

  const CITY_SYNONYMS = Object.fromEntries(
    Object.entries(window.EV_CITY_SYNONYMS||{}).map(([k,arr]) => [k.toLowerCase(), (arr||[]).map(s=>s.toLowerCase())])
  );

  // ---- scoped UI css (dark, EV-ish) ----
  const css = `
  #ev-rave-map .ev-card{background:#0b1620;color:#d9f1e3;border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,.35);overflow:hidden;border:1px solid #11353b}
  #ev-rave-map .ev-head{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px 10px;border-bottom:1px solid #133b3b}
  #ev-rave-map .ev-title{font-weight:800;letter-spacing:.02em}
  #ev-rave-map .ev-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  #ev-rave-map .ev-pill{background:#10292e;color:#bfe1db;border:1px solid #11353b;padding:6px 10px;border-radius:999px;font-size:12px;line-height:1;cursor:pointer;user-select:none;white-space:nowrap}
  #ev-rave-map .ev-pill:hover{background:#13373f}
  #ev-rave-map .ev-popup{position:absolute;left:16px;bottom:16px;max-width:min(560px, calc(100% - 32px));z-index:2}
  #ev-rave-map .ev-popup .ev-body{padding:14px 14px 12px}
  #ev-rave-map .ev-list{display:flex;flex-direction:column;gap:10px;margin-top:6px}
  #ev-rave-map .ev-item{display:flex;gap:8px;align-items:flex-start}
  #ev-rave-map .ev-item a{color:#9fe3ff;text-decoration:none}
  #ev-rave-map .ev-item a:hover{text-decoration:underline}
  #ev-rave-map .ev-muted{opacity:.75}
  #ev-rave-map .ev-meta{font-size:12px;opacity:.75}
  #ev-rave-map .ev-chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 4px 0}
  #ev-rave-map .ev-panel{position:relative;border-radius:16px;background:rgba(11,11,12,.90);backdrop-filter:blur(6px);padding:8px 10px;margin:0 0 8px;border:1px solid #11353b}
  #ev-rave-map .ev-top{display:flex;align-items:center;gap:10px;justify-content:space-between}
  `;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  const ROOT  = document.getElementById("ev-rave-map") || document.body.appendChild(Object.assign(document.createElement("div"),{id:"ev-rave-map"}));

  // ---- Cities (seed) ----
  const CITIES = [
    { name:"New York",   center:{lat:40.7128,lng:-74.0060} },
    { name:"Miami",      center:{lat:25.7617,lng:-80.1918} },
    { name:"Las Vegas",  center:{lat:36.1699,lng:-115.1398} },
    { name:"Berlin",     center:{lat:52.52,lng:13.405} },
    { name:"Brussels",   center:{lat:50.8503,lng:4.3517} },
    { name:"Amsterdam",  center:{lat:52.3676,lng:4.9041} },
    { name:"London",     center:{lat:51.5072,lng:-0.1276} },
    { name:"Ibiza",      center:{lat:38.9089,lng:1.4321} },
    { name:"Phuket",     center:{lat:7.8804,lng:98.3923} },
    { name:"Bangkok",    center:{lat:13.7563,lng:100.5018} },
  ];

  // ---- Map styles: hide all roads + provinces/localities; keep country borders ----
  const mapStyles = [
    {featureType:"administrative.province",stylers:[{visibility:"off"}]},
    {featureType:"administrative.locality",stylers:[{visibility:"off"}]},
    {featureType:"administrative.neighborhood",stylers:[{visibility:"off"}]},
    {featureType:"administrative.land_parcel",stylers:[{visibility:"off"}]},
    {featureType:"poi",stylers:[{visibility:"off"}]},
    {featureType:"transit",stylers:[{visibility:"off"}]},
    {featureType:"road",elementType:"all",stylers:[{visibility:"off"}]},
    // keep country outlines
    {featureType:"administrative.country",elementType:"geometry.stroke",stylers:[{color:"#7fa0a5"},{weight:1.0}]},
    // gentle water/land tints to match EV
    {featureType:"water",stylers:[{color:"#0e3a47"}]},
    {featureType:"landscape",stylers:[{color:"#0a2a30"}]},
  ];

  // debounce
  const debounce = (fn,ms=250)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(null,a),ms); }};

  // ===== Squarespace collection fetch =====
  async function fetchCollection(path){
    const url = `${BASE}${path.replace(/\/$/,"")}?format=json`;
    const r = await fetch(url, { credentials:"same-origin" });
    if (!r.ok) throw new Error("fetch fail "+r.status);
    return r.json();
  }

  async function loadAllItems(){
    const lists = await Promise.allSettled(SOURCES.map(s => fetchCollection(s.path)));
    const items = [];
    lists.forEach((res,i)=>{
      if (res.status==="fulfilled" && res.value && Array.isArray(res.value.items)){
        const col = SOURCES[i];
        res.value.items.forEach(it=>{
          items.push({
            collectionId: col.id,
            collectionPath: col.path,
            url: it.fullUrl || it.url || "",
            title: it.title || "",
            excerpt: (it.excerpt||"").replace(/<[^>]+>/g,"").trim(),
            tags: Array.isArray(it.tags)? it.tags.map(t=>String(t).toLowerCase()) : [],
            date: it.publishOn || it.updatedOn || it.createdOn || it.postDate || ""
          });
        });
      }
    });
    return items;
  }

  function matchesCity(item, city){
    const key = city.name.toLowerCase();
    const hay = `${item.title} ${item.excerpt} ${(item.tags||[]).join(" ")}`.toLowerCase();
    const syns = [key].concat(CITY_SYNONYMS[key]||[]);
    return syns.some(s => s && hay.includes(s));
  }

  function el(tag, cls, txt){ const e=document.createElement(tag); if(cls)e.className=cls; if(txt)e.textContent=txt; return e; }

  // top panel + chips
  const panel = el("div","ev-panel");
  const top = el("div","ev-top");
  panel.appendChild(top);
  const leftRow = el("div","ev-row");
  const rightRow= el("div","ev-row");
  top.append(leftRow, rightRow);
  leftRow.appendChild(el("div","ev-title","Explore Ravecations by City"));
  const chips = el("div","ev-chips"); panel.appendChild(chips);
  const popup = el("div","ev-popup");
  ROOT.append(panel,popup);

  // chips from EV_CHIPS (optional)
  (window.EV_CHIPS||["New York","Miami","Ibiza","Amsterdam","London"]).forEach(label=>{
    const p = el("div","ev-pill", label);
    p.addEventListener("click", ()=>{
      const city = CITIES.find(c => label.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(label.toLowerCase())) || CITIES[0];
      map.panTo(city.center); map.setZoom(CHIP_ZOOM); openCityPopup(city);
    });
    chips.appendChild(p);
  });

  // ===== Map =====
  let map, heatLayer, allItems = [];

  function buildMap(){
    map = new google.maps.Map(ROOT, {
      center: {lat: 25, lng:-20}, zoom: 2, styles: mapStyles,
      mapTypeControl: true, fullscreenControl:false, streetViewControl:false
    });

    // soft teal gradient for heat
    const gradient = [
      "rgba(0,0,0,0)",
      "rgba(51,224,195,0.25)",
      "rgba(51,224,195,0.45)",
      "rgba(51,224,195,0.70)",
      "rgba(255,255,255,0.85)"
    ];
    const pts = [];
    CITIES.forEach(c=>{ for(let i=0;i<5;i++) pts.push(new google.maps.LatLng(c.center.lat, c.center.lng)); });
    heatLayer = new google.maps.visualization.HeatmapLayer({
      data: pts, radius: 24, gradient, map: DEFAULT_HEAT ? map : null
    });

    map.addListener("idle", debounce(updateMatches, 200));
    map.addListener("click", (e)=>{ const city = nearestCity(e.latLng); if (city && distanceMeters(e.latLng, city.center) < 60000) openCityPopup(city); });
  }

  function distanceMeters(a,b){ const R=6371000,toR=x=>x*Math.PI/180; const dLat=toR(b.lat - a.lat()); const dLng=toR(b.lng - a.lng()); const lat1=toR(a.lat()),lat2=toR(b.lat); const s=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2; return 2*R*Math.asin(Math.sqrt(s)); }
  function nearestCity(ll){ let best=null,d=Infinity; CITIES.forEach(c=>{ const dd=distanceMeters(ll,c.center); if(dd<d){ d=dd; best=c; } }); return best; }

  function openCityPopup(city){
    const card = el("div","ev-card");
    const head = el("div","ev-head");
    head.append(el("div","ev-title", `${city.name} • Latest`));
    card.appendChild(head);
    const body = el("div","ev-body");
    body.appendChild(el("div","ev-muted","Searching recent Electric Vibes posts…"));
    const actions = el("div","ev-row"); actions.style.marginTop="8px";
    const openSearch = el("a","ev-pill","Open site search"); openSearch.target="_blank";
    openSearch.href = `${BASE}/search?q=${encodeURIComponent(city.name)}`;
    const closeBtn = el("div","ev-pill","Close"); closeBtn.addEventListener("click", ()=> popup.innerHTML="");
    actions.append(openSearch, closeBtn);
    card.appendChild(body);
    popup.innerHTML=""; popup.appendChild(card);

    // Build list
    const list = el("div","ev-list");
    const found = allItems
      .filter(it => matchesCity(it, city))
      .sort((a,b)=> (new Date(b.date||0)) - (new Date(a.date||0)))
      .slice(0,6);

    list.innerHTML="";
    if(found.length){
      body.firstChild.textContent="";
      found.forEach(it=>{
        const row = el("div","ev-item");
        const link = el("a",null,it.title || "(untitled)");
        link.href = it.url || (BASE + it.collectionPath); link.target="_blank";
        row.appendChild(link);
        if (it.collectionPath) row.appendChild(el("span","ev-meta"," • " + it.collectionPath.replace(/\//g," ").trim()));
        list.appendChild(row);
      });
      body.insertBefore(list, actions);
    } else {
      body.firstChild.textContent = `No recent Electric Vibes posts for “${city.name}”.`;
    }
    body.appendChild(actions);
  }

  function updateMatches(){
    const inView = CITIES.filter(c => { const b=map.getBounds(); return b && b.contains(new google.maps.LatLng(c.center.lat,c.center.lng)); }).length;
    if(!rightRow._counter){ const c=el("div","ev-muted"); rightRow._counter=c; rightRow.appendChild(c); }
    rightRow._counter.textContent = `Indexed EV news • Visible hotspots: ${inView}`;
  }

  // ---- Loader
  function loadGmaps(){
    return new Promise((resolve,reject)=>{
      if(!KEY) return reject(new Error("Missing EV_GMAPS_KEY"));
      const s=document.createElement("script");
      s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&libraries=visualization`;
      s.async=true; s.defer=true; s.onload=resolve; s.onerror=()=>reject(new Error("GMAPS load error")); document.head.appendChild(s);
    });
  }

  (async function boot(){
    try{
      await loadGmaps();
      allItems = await loadAllItems();
      buildMap(); updateMatches();
    }catch(err){
      console.error("[EV] init error", err);
      ROOT.innerHTML = `<div style="color:#fff;background:#300;padding:12px;border-radius:8px">EV Ravecations failed to load: ${err && err.message ? err.message : err}</div>`;
    }
  })();
})();
</script>
