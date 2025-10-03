/*! Electric Vibes — Ravecations tiny build (heatmap + EV-only markers + popups) */
(function(){
  const BASE   = (window.EV_BASE || location.origin || "").replace(/\/$/,"");
  const KEY    = window.EV_GMAPS_KEY || "";
  const SOURCES= Array.isArray(window.EV_SOURCES) ? window.EV_SOURCES : [];
  const DEFAULT_HEAT = window.EV_DEFAULT_HEATMAP !== false;
  const ONLY_EV = window.EV_ONLY_EV_CONTENT !== false;
  const HIDE_HWY = !!window.EV_HIDE_HIGHWAYS;
  const CHIP_ZOOM = Number(window.EV_CHIP_ZOOM||6);

  const CITY_SYNONYMS = Object.fromEntries(
    Object.entries(window.EV_CITY_SYNONYMS||{}).map(([k,arr]) => [k.toLowerCase(), (arr||[]).map(s=>s.toLowerCase())])
  );

  // ---- minimal CSS (scoped) ----
  const css = `
  #ev-rave-map .ev-card{background:#0e2023;color:#d9f1e3;border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,.35);overflow:hidden}
  #ev-rave-map .ev-head{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px 10px;border-bottom:1px solid #133b3b}
  #ev-rave-map .ev-title{font-weight:800;letter-spacing:.02em}
  #ev-rave-map .ev-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  #ev-rave-map .ev-pill{background:#10292e;color:#bfe1db;border:1px solid #11353b;padding:6px 10px;border-radius:999px;font-size:12px;line-height:1;cursor:pointer;user-select:none;white-space:nowrap}
  #ev-rave-map .ev-pill:hover{background:#13373f}
  #ev-rave-map .ev-switch{display:flex;align-items:center;gap:6px}
  #ev-rave-map .ev-switch input{accent-color:#33e0c3}
  #ev-rave-map .ev-slider{appearance:none;width:120px;height:6px;border-radius:999px;background:#0a3254;outline:none}
  #ev-rave-map .ev-slider::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:#33e0c3;cursor:pointer}
  #ev-rave-map .ev-popup{position:absolute;left:16px;bottom:16px;max-width:min(560px, calc(100% - 32px));z-index:2}
  #ev-rave-map .ev-popup .ev-body{padding:14px 14px 12px}
  #ev-rave-map .ev-list{display:flex;flex-direction:column;gap:10px;margin-top:6px}
  #ev-rave-map .ev-item{display:flex;gap:10px;align-items:flex-start}
  #ev-rave-map .ev-item a{color:#9fe3ff;text-decoration:none}
  #ev-rave-map .ev-muted{opacity:.7}
  #ev-rave-map .ev-meta{font-size:12px;opacity:.75}
  #ev-rave-map .ev-chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 4px 0}
  #ev-rave-map .ev-panel{position:relative;border-radius:16px;background:#0a1719;padding:8px 10px;margin:0 0 8px}
  #ev-rave-map .ev-top{display:flex;align-items:center;gap:10px;justify-content:space-between}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const ROOT  = document.getElementById("ev-rave-map") || document.body.appendChild(Object.assign(document.createElement("div"),{id:"ev-rave-map"}));

  // ---- CITY DATA: center + heat points (add/adjust as you like) ----
  // A small seed set; chips/heat will still work if you only use some.
  const CITIES = [
    { name:"New York",   center:{lat:40.7128,lng:-74.0060} },
    { name:"Miami",      center:{lat:25.7617,lng:-80.1918} },
    { name:"Las Vegas",  center:{lat:36.1699,lng:-115.1398} },
    { name:"Berlin",     center:{lat:52.5200,lng:13.4050} },
    { name:"Brussels",   center:{lat:50.8503,lng:4.3517} },
    { name:"Amsterdam",  center:{lat:52.3676,lng:4.9041} },
    { name:"London",     center:{lat:51.5072,lng:-0.1276} },
    { name:"Ibiza",      center:{lat:38.9089,lng:1.4321} },
    { name:"Phuket",     center:{lat:7.8804,lng:98.3923} },
    { name:"Bangkok",    center:{lat:13.7563,lng:100.5018} },
  ];

  // quick map styles
  const mapStyles = [
    { featureType:"poi", stylers:[{ visibility:"off"}] },
    { featureType:"transit", stylers:[{ visibility:"off"}] },
    { featureType:"administrative.land_parcel", stylers:[{ visibility:"off"}] },
    { featureType:"road.local", elementType:"labels", stylers:[{ visibility:"simplified"}] },
  ];
  if (HIDE_HWY){
    mapStyles.push(
      { featureType:"road.highway", elementType:"labels.icon", stylers:[{ visibility:"off"}] },
      { featureType:"road.highway", elementType:"labels.text", stylers:[{ visibility:"off"}] },
      { featureType:"road.arterial", elementType:"labels.icon", stylers:[{ visibility:"off"}] }
    );
  }

  // debouncer
  const debounce = (fn,ms=250)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(null,a),ms);}};

  // ====== fetch helpers (Squarespace collection JSON) ======
  async function fetchCollection(path){
    const url = `${BASE}${path.replace(/\/$/,"")}?format=json`;
    const r = await fetch(url, { credentials:"same-origin" });
    if (!r.ok) throw new Error("fetch fail "+r.status);
    return r.json();
  }

  // Load both sources, flatten into items[]
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
            date: it.publishOn || it.updatedOn || it.createdOn || it.postDate || "",
          });
        });
      }
    });
    return items;
  }

  // simple matcher: title/tags/ excerpt contains city or its synonyms
  function matchesCity(item, city){
    const cityKey = city.name.toLowerCase();
    const hay = `${item.title} ${item.excerpt} ${(item.tags||[]).join(" ")}`.toLowerCase();
    const syns = [cityKey].concat(CITY_SYNONYMS[cityKey]||[]);
    return syns.some(s => s && hay.includes(s));
  }

  // compute matches by viewport & content filters
  function cityInView(map, city){
    const b = map.getBounds();
    return b && b.contains(new google.maps.LatLng(city.center.lat, city.center.lng));
  }

  // ====== UI scaffolding ======
  function el(tag, cls, txt){ const e=document.createElement(tag); if(cls)e.className=cls; if(txt)e.textContent=txt; return e; }

  const panel = el("div","ev-panel");
  const top = el("div","ev-top");
  panel.appendChild(top);

  const leftRow = el("div","ev-row");
  const rightRow= el("div","ev-row");
  top.append(leftRow, rightRow);

  const h1 = el("div","ev-title","Explore Ravecations by City");
  leftRow.appendChild(h1);

  // switches
  const onlyEvLbl = el("label","ev-switch");
  const onlyEv = el("input"); onlyEv.type="checkbox"; onlyEv.checked = ONLY_EV;
  onlyEvLbl.append(onlyEv, document.createTextNode("Only Electric Vibes content"));
  leftRow.appendChild(onlyEvLbl);

  const heatLbl = el("label","ev-switch");
  const heatToggle = el("input"); heatToggle.type="checkbox"; heatToggle.checked = DEFAULT_HEAT;
  heatLbl.append(heatToggle, document.createTextNode("Heatmap"));
  leftRow.appendChild(heatLbl);

  // slider (not used for throttling queries now; keep to show "content" thumb)
  const contentRow = el("div","ev-row");
  const contentLbl = el("span",null,"content");
  const slider = el("input","ev-slider"); slider.type="range"; slider.min=0; slider.max=10; slider.value=2;
  contentRow.append(contentLbl, slider);
  panel.appendChild(contentRow);

  // chips
  const chips = el("div","ev-chips");
  panel.appendChild(chips);

  ROOT.appendChild(panel);

  const popup = el("div","ev-popup");
  ROOT.appendChild(popup);

  // create chip elements
  (window.EV_CHIPS||[]).forEach(label=>{
    const p = el("div","ev-pill", label);
    p.addEventListener("click", ()=>{
      // best-effort city center by label
      let city = CITIES.find(c=> label.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(label.toLowerCase()));
      if(!city){
        // fall back to detect plausible
        city = CITIES[0];
      }
      map.panTo(city.center);
      map.setZoom(CHIP_ZOOM);
      openCityPopup(city);
    });
    chips.appendChild(p);
  });

  // ====== MAP ======
  let map, heatLayer, allItems = [];

  function buildMap(){
    map = new google.maps.Map(ROOT, {
      center: {lat: 33.0, lng:-20.0},
      zoom: 2,
      styles: mapStyles,
      mapTypeControl: true,
      fullscreenControl: false,
      streetViewControl: false,
    });

    // heat data is just the city centers repeated to give stronger glow
    const pts = [];
    CITIES.forEach(c=>{
      for(let i=0;i<5;i++) pts.push(new google.maps.LatLng(c.center.lat, c.center.lng));
    });
    heatLayer = new google.maps.visualization.HeatmapLayer({
      data: pts,
      map: DEFAULT_HEAT ? map : null,
      radius: 24
    });

    // update matches count after move
    map.addListener("idle", debounce(updateMatches, 200));

    // click near a hot spot => popup
    map.addListener("click", (e)=>{
      const city = nearestCity(e.latLng);
      if (city && distanceMeters(e.latLng, city.center) < 60000){
        openCityPopup(city);
      }
    });
  }

  function distanceMeters(a,b){
    const R=6371000, toR=x=>x*Math.PI/180;
    const dLat=toR(b.lat - a.lat());
    const dLng=toR(b.lng - a.lng());
    const lat1=toR(a.lat()), lat2=toR(b.lat);
    const s = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(s));
  }
  function nearestCity(ll){
    let best=null, d=Infinity;
    CITIES.forEach(c=>{
      const dd = distanceMeters(ll, c.center);
      if(dd<d){ d=dd; best=c; }
    });
    return best;
  }

  function setHeat(on){
    heatLayer.setMap(on ? map : null);
  }

  // ====== POPUP / MATCHING ======
  function openCityPopup(city){
    const card = el("div","ev-card");
    const head = el("div","ev-head");
    head.append(el("div","ev-title", `${city.name} • Latest`));
    card.appendChild(head);
    const body = el("div","ev-body");
    body.appendChild(el("div","ev-muted","Searching recent Electric Vibes posts…"));
    card.appendChild(body);

    // actions
    const actionRow = el("div","ev-row"); actionRow.style.marginTop="8px";
    const openSearch = el("a","ev-pill","Open site search"); openSearch.target="_blank";
    openSearch.href = `${BASE}/search?q=${encodeURIComponent(city.name)}`;
    const closeBtn = el("div","ev-pill","Close");
    closeBtn.addEventListener("click", ()=> popup.innerHTML="");
    actionRow.append(openSearch, closeBtn);
    body.appendChild(actionRow);

    popup.innerHTML = "";
    popup.appendChild(card);

    // compute matches from allItems
    const list = el("div","ev-list");
    const found = allItems
      .filter(it => matchesCity(it, city))
      .sort((a,b)=> (b.date||"").localeCompare(a.date||""))
      .slice(0,6);

    list.innerHTML = "";

    if (found.length){
      body.firstChild.textContent = ""; // clear "Searching..."
      found.forEach(it=>{
        const row = el("div","ev-item");
        const link = el("a",null,it.title || "(untitled)");
        link.href = it.url || (BASE + it.collectionPath);
        link.target="_blank";
        row.appendChild(link);
        if (it.collectionPath){
          row.appendChild(el("span","ev-meta"," • " + (it.collectionPath.replace(/\//g," ").trim())));
        }
        list.appendChild(row);
      });
      body.insertBefore(list, actionRow);
    } else {
      body.firstChild.textContent = `No recent Electric Vibes posts for “${city.name}”.`;
    }
  }

  function updateMatches(){
    // show how many city centers currently in view (just a friendly indicator)
    const inView = CITIES.filter(c => cityInView(map, c)).length;
    // put it on the right side of header
    if(!rightRow._counter){
      const c = el("div","ev-muted"); rightRow._counter = c; rightRow.appendChild(c);
    }
    rightRow._counter.textContent = `Indexed ${SOURCES.length? "✔":"0"}/${SOURCES.length}. Matches: ${inView}.`;
  }

  // ====== INIT ======
  onlyEv.addEventListener("change", ()=> {
    // kept for future filtering; for now we always use EV_SOURCES only.
    // (leaving toggle visible because users like it 🙂)
  });
  heatToggle.addEventListener("change", ()=> setHeat(heatToggle.checked));

  // Load Google Maps + Heatmap library, then items, then build UI.
  function loadGmaps(){
    return new Promise((resolve,reject)=>{
      if(!KEY){ reject(new Error("Missing EV_GMAPS_KEY")); return; }
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&libraries=visualization`;
      s.async = true; s.defer = true;
      s.onload = resolve; s.onerror = ()=>reject(new Error("GMAPS load error"));
      document.head.appendChild(s);
    });
  }

  (async function boot(){
    try{
      await loadGmaps();
      allItems = await loadAllItems();
      buildMap();
      updateMatches();
      setHeat(DEFAULT_HEAT);
    }catch(err){
      console.error("[EV] init error", err);
      ROOT.innerHTML = `<div style="color:#fff;background:#300;padding:12px;border-radius:8px">
        EV Ravecations failed to load: ${err && err.message ? err.message : err}
      </div>`;
    }
  })();
})();
