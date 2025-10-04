<!-- 04_page_js.html: paste this immediately under 03_page_html.html (same Code Block) -->
<script>
(function(){
  const MT_KEY = (window.MAPTILER_KEY||"DNfkSierWr0aHJV98uHj").trim();
  const STATUS = document.getElementById('ev-status');
  const chipsBox = document.getElementById('ev-chips');
  const listEV = document.getElementById('ev-list-ev');
  const listEDM = document.getElementById('ev-list-edm');
  const tabEV = document.getElementById('ev-tab-ev');
  const tabEDM = document.getElementById('ev-tab-edm');

  // Regions (loose bounds)
  const REGIONS = [
    {k:'na',    n:'North America',   b:[[7,-169],[83,-52]]},
    {k:'latam', n:'Latin America',   b:[[-56,-118],[33,-32]]},
    {k:'eu',    n:'Europe',          b:[[34,-31],[72,45]]},
    {k:'me',    n:'Middle East',     b:[[12,25],[42,63]]},
    {k:'af',    n:'Africa',          b:[[-36,-20],[38,52]]},
    {k:'apac',  n:'Asia-Pacific',    b:[[-49,63],[63,179]]},
  ];

  // Map init (dark, minimal labels)
  const map = L.map('ev-map',{zoomControl:true, worldCopyJump:true, minZoom:2});
  const style = "https://api.maptiler.com/maps/backdrop-dark/256/{z}/{x}/{y}.png?key="+encodeURIComponent(MT_KEY||"");
  L.tileLayer(style, { attribution:'<a>Leaflet</a> | © MapTiler © OpenStreetMap' }).addTo(map);
  map.setView([22,0], 2);

  // Heatmap config — brighter and larger by default
  const heatCfg = {
    radius: 32, maxOpacity: 0.7, minOpacity: 0.25, blur: 0.85,
    scaleRadius: true, useLocalExtrema: false,
    latField: 'lat', lngField:'lng', valueField:'count'
  };
  const evHeat = new HeatmapOverlay(heatCfg).addTo(map);
  const edmHeat = new HeatmapOverlay(heatCfg); // only added in "All EDM" tab

  // Data (clone from globals or start empty)
  let EV_ITEMS = Array.isArray(window.EV_ITEMS) ? window.EV_ITEMS.slice() : [];
  let EDM_ITEMS = Array.isArray(window.EDM_NEARBY||window.edm_nearby) ? (window.EDM_NEARBY||window.edm_nearby).slice() : [];
  let activeTab = 'ev'; // 'ev' | 'edm'

  // Helpers
  const fmtDate = s => s ? new Date(s).toLocaleDateString() : '';
  const inBounds = (lat,lng,b) => b ? b.contains([lat,lng]) : true;
  const el = (t, c, txt) => { const e=document.createElement(t); if(c)e.className=c; if(txt!=null)e.textContent=txt; return e; };
  const debounce = (fn,ms=220)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(null,a),ms); }};

  // Build region chips
  function renderChips(){
    chipsBox.innerHTML = "";
    REGIONS.forEach(r => {
      const b = document.createElement('button');
      b.className = 'ev-chip';
      b.textContent = r.n;
      b.addEventListener('click', ()=> map.fitBounds(r.b));
      chipsBox.appendChild(b);
    });
    const reset = document.createElement('button');
    reset.className='ev-chip'; reset.textContent='Reset';
    reset.addEventListener('click', ()=> map.setView([22,0],2));
    chipsBox.appendChild(reset);
  }
  renderChips();

  // Tabs
  function activateEV(){
    activeTab='ev';
    tabEV.classList.add('active'); tabEDM.classList.remove('active');
    if(map.hasLayer(edmHeat)) map.removeLayer(edmHeat);
    if(!map.hasLayer(evHeat)) evHeat.addTo(map);
    refreshAll();
  }
  function activateEDM(){
    activeTab='edm';
    tabEDM.classList.add('active'); tabEV.classList.remove('active');
    if(map.hasLayer(evHeat)) map.removeLayer(evHeat);
    if(!map.hasLayer(edmHeat)) edmHeat.addTo(map);
    refreshAll();
  }
  tabEV.addEventListener('click', activateEV);
  tabEDM.addEventListener('click', activateEDM);

  // Geocode items that only have loc:"City, Country"
  async function geocodeIfNeeded(items){
    const out=[];
    for(const it of items){
      if(it && Array.isArray(it.g) && it.g.length===2){
        out.push({...it, _lat:it.g[0], _lng:it.g[1]}); continue;
      }
      if(it && it.loc && MT_KEY){
        try{
          const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(it.loc)}.json?limit=1&key=${MT_KEY}`;
          const r = await fetch(url); if(!r.ok) throw new Error("geo "+r.status);
          const js = await r.json();
          const f = (js.features||[])[0];
          if(f){ const [lng,lat] = f.center; out.push({...it, _lat:lat, _lng:lng}); continue; }
        }catch(err){ console.warn("Geocode failed:", it.loc, err); }
      }
      out.push(it);
    }
    return out;
  }

  function itemsToHeat(items, bounds){
    const pts=[];
    for(const it of items){
      const lat = it._lat ?? (Array.isArray(it.g)? it.g[0]: null);
      const lng = it._lng ?? (Array.isArray(it.g)? it.g[1]: null);
      if(lat==null || lng==null) continue;
      if(bounds && !inBounds(lat,lng,bounds)) continue;
      pts.push({lat, lng, count: 1});
    }
    // If very few points, still show gentle hint
    return { max: Math.max(6, pts.length||6), data: pts };
  }

  function renderList(items, target, bounds){
    const frag = document.createDocumentFragment();
    let shown=0;
    const sorted = items.slice().sort((a,b)=> (new Date(b.d||0)) - (new Date(a.d||0)));
    for(const it of sorted){
      const lat = it._lat ?? (Array.isArray(it.g)? it.g[0]: null);
      const lng = it._lng ?? (Array.isArray(it.g)? it.g[1]: null);
      if(lat!=null && lng!=null && bounds && !inBounds(lat,lng,bounds)) continue;
      const row = el('div','ev-item');
      const a = el('a',null,it.t||'(untitled)'); a.href = it.u||'#'; a.target = (it.u||'').startsWith('http')? '_blank':'_self';
      const meta = el('small',null, (it.tag||it.loc||'(location)') + (it.d? (' • '+fmtDate(it.d)) : (it.age? (' • '+it.age):'')));
      row.appendChild(a); row.appendChild(el('br')); row.appendChild(meta);
      frag.appendChild(row);
      shown++; if(shown>=24) break;
    }
    target.innerHTML=''; target.appendChild(frag);
    if(shown===0){
      target.innerHTML = '<small style="opacity:.8">No items in this view yet — zoom or pan the map, or add a few items.</small>';
    }
  }

  async function refreshAll(){
    STATUS.textContent = 'Ravecations • rendering…';
    const e1 = await geocodeIfNeeded(EV_ITEMS);
    const e2 = await geocodeIfNeeded(EDM_ITEMS);
    const b = map.getBounds();
    // heatmaps
    if(activeTab==='ev'){
      evHeat.setData(itemsToHeat(e1,b));
    }else{
      edmHeat.setData(itemsToHeat(e2,b));
    }
    // lists (always two columns, filtered by current bounds)
    renderList(e1, listEV, b);
    renderList(e2, listEDM, b);
    STATUS.textContent = `Electric Vibes • showing ${e1.length} EV • ${e2.length} Top sources`;
  }

  // Public helpers
  window.EV_MAP = {
    setEV(arr){ EV_ITEMS = Array.isArray(arr)? arr.slice(): []; refreshAll(); },
    setEDM(arr){ EDM_ITEMS = Array.isArray(arr)? arr.slice(): []; refreshAll(); },
    refreshLists(){ refreshAll(); },
    async seedFromSearch(queries=[]){
      const make = (q,u) => ({t:\`\${q} — search result\`, u, loc:q, d:new Date().toISOString().slice(0,10)});
      const add = [];
      for(const q of queries){
        try{
          const url = \`/search?q=\${encodeURIComponent(q)}\`;
          add.push(make(q, url));
        }catch(e){ console.warn('seedFromSearch', q, e); }
      }
      EV_ITEMS = EV_ITEMS.concat(add);
      refreshAll();
    }
  };

  // Initial render + listeners
  map.on('moveend zoomend', debounce(refreshAll, 120));
  refreshAll();
})();
</script>
