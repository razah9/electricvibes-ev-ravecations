// 04_js.html: paste this right under the HTML (same Code Block) or Page Footer
(function(){
  const MT_KEY = (window.MAPTILER_KEY||"").trim();
  const STATUS = document.getElementById('ev-status');
  const chipsBox = document.getElementById('ev-chips');
  const listEV = document.getElementById('ev-list-ev');
  const listEDM = document.getElementById('ev-list-edm');

  const REGIONS = [
    {k:'na', n:'North America',   b:[[7,-169],[83,-52]]},
    {k:'latam', n:'Latin America', b:[[-56,-118],[33,-32]]},
    {k:'eu', n:'Europe',          b:[[34,-31],[72,45]]},
    {k:'me', n:'Middle East',     b:[[12,25],[42,63]]},
    {k:'af', n:'Africa',          b:[[-36,-20],[38,52]]},
    {k:'apac', n:'Asia-Pacific',  b:[[-49,63],[63,179]]},
  ];

  function fmtDate(s){ if(!s) return ''; return new Date(s).toLocaleDateString(); }

  // Create map
  const map = L.map('ev-map',{zoomControl:true, worldCopyJump:true, minZoom:2});
  const style = "https://api.maptiler.com/maps/backdrop-dark/256/{z}/{x}/{y}.png?key="+encodeURIComponent(MT_KEY||"");
  L.tileLayer(style, { attribution:'<a>Leaflet</a> | © MapTiler © OpenStreetMap' }).addTo(map);
  map.setView([20,0], 2);

  // Heatmaps
  const heatCfg = {
    radius: 24, maxOpacity: 0.55, minOpacity: 0.2, blur: 0.85,
    scaleRadius: true, useLocalExtrema: false,
    latField: 'lat', lngField:'lng', valueField:'count'
  };
  const evHeat = new HeatmapOverlay(heatCfg).addTo(map);
  const edmHeat = new HeatmapOverlay(heatCfg); // added when tab is switched

  // Data holders
  let EV_ITEMS = (window.EV_ITEMS||[]).slice();
  let EDM_ITEMS = (window.EDM_NEARBY||window.edm_nearby||[]).slice();
  let activeTab = 'ev'; // 'ev' | 'edm'

  // Expose public helpers
  window.EV_MAP = {
    setEV(arr){ EV_ITEMS = Array.isArray(arr)?arr:[]; refreshAll(); },
    setEDM(arr){ EDM_ITEMS = Array.isArray(arr)?arr:[]; refreshAll(); },
    refreshLists(){ refreshAll(); }
  };

  // Region chips
  function renderChips(){
    chipsBox.innerHTML = '';
    for(const r of REGIONS){
      const btn = document.createElement('button');
      btn.className = 'ev-chip'; btn.textContent = r.n;
      btn.addEventListener('click', ()=>{
        map.fitBounds(r.b);
        setActiveChip(r.k);
      });
      btn.dataset.k = r.k;
      chipsBox.appendChild(btn);
    }
    const reset = document.createElement('button');
    reset.className = 'ev-chip'; reset.textContent = 'Reset';
    reset.addEventListener('click', ()=>{ map.setView([20,0],2); setActiveChip(null); });
    chipsBox.appendChild(reset);
  }
  function setActiveChip(k){
    [...chipsBox.querySelectorAll('.ev-chip')].forEach(b=>{
      b.classList.toggle('active', b.dataset.k===k);
    });
  }

  // Tabs
  const tabEV = document.getElementById('ev-tab-ev');
  const tabEDM = document.getElementById('ev-tab-edm');
  tabEV.addEventListener('click', ()=>{ activeTab='ev'; tabEV.classList.add('active'); tabEDM.classList.remove('active'); map.removeLayer(edmHeat); if(!map.hasLayer(evHeat)) evHeat.addTo(map); refreshAll(); });
  tabEDM.addEventListener('click', ()=>{ activeTab='edm'; tabEDM.classList.add('active'); tabEV.classList.remove('active'); map.removeLayer(evHeat); if(!map.hasLayer(edmHeat)) edmHeat.addTo(map); refreshAll(); });

  // Geocode: if item has loc but no g, resolve via MapTiler
  async function geocodeIfNeeded(items){
    const out=[];
    for(const it of items){
      if(it.g && it.g.length===2){ out.push({...it, _lat:it.g[0], _lng:it.g[1]}); continue; }
      if(it.loc && MT_KEY){
        try {
          const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(it.loc)}.json?limit=1&key=${MT_KEY}`;
          const res = await fetch(url); if(!res.ok) throw new Error('geo http '+res.status);
          const js = await res.json();
          const f = (js.features||[])[0];
          if(f){ const [lng,lat] = f.center; out.push({...it, _lat:lat, _lng:lng}); continue; }
        }catch(e){ console.warn('geocode fail', it.loc, e); }
      }
      out.push(it); // still push; will be filtered later
    }
    return out;
  }

  function inBounds(lat,lng,b){ if(!b) return true; return b.contains([lat,lng]); }

  function itemsToHeat(items, bounds){
    const pts = [];
    for(const it of items){
      const lat = it._lat ?? (it.g?it.g[0]:undefined);
      const lng = it._lng ?? (it.g?it.g[1]:undefined);
      if(lat==null || lng==null) continue;
      if(bounds && !inBounds(lat,lng,bounds)) continue;
      pts.push({lat, lng, count: 1});
    }
    return { max: 8, data: pts };
  }

  function renderList(items, el, bounds){
    const frag = document.createDocumentFragment();
    let shown=0;
    for(const it of items){
      const lat = it._lat ?? (it.g?it.g[0]:undefined);
      const lng = it._lng ?? (it.g?it.g[1]:undefined);
      if(lat!=null && lng!=null && bounds && !inBounds(lat,lng,bounds)) continue;
      const div = document.createElement('div'); div.className='ev-item';
      const a = document.createElement('a'); a.href = it.u; a.textContent = it.t||'(no title)';
      a.target = it.u.startsWith('http')? '_blank':'_self';
      const small = document.createElement('small');
      const right = it.d? (' • '+fmtDate(it.d)) : (it.age? (' • '+it.age):'');
      small.textContent = (it.tag||it.loc||'') + right;
      div.appendChild(a); div.appendChild(document.createElement('br')); div.appendChild(small);
      frag.appendChild(div);
      shown++;
      if(shown>=20) break;
    }
    el.innerHTML=''; el.appendChild(frag);
  }

  async function refreshAll(){
    STATUS.textContent = `Ravecations Map • loading…`;
    // geocode as needed (cache per run)
    const e1 = await geocodeIfNeeded(EV_ITEMS);
    const e2 = await geocodeIfNeeded(EDM_ITEMS);
    const bounds = map.getBounds();
    // heatmaps
    evHeat.setData(itemsToHeat(e1, (activeTab==='ev')?bounds:bounds));
    edmHeat.setData(itemsToHeat(e2, (activeTab==='edm')?bounds:bounds));
    // lists
    renderList(e1, listEV, bounds);
    renderList(e2, listEDM, bounds);
    STATUS.textContent = `Electric Vibes • showing ${e1.length} EV • ${e2.length} Top sources`;
  }

  renderChips();
  map.on('moveend zoomend', refreshAll);
  // initial data from globals (or sample)
  if(!window.EV_ITEMS){ window.EV_ITEMS = []; }
  if(!window.EDM_NEARBY && window.edm_nearby){ window.EDM_NEARBY = window.edm_nearby; }
  EV_ITEMS = window.EV_ITEMS.slice();
  EDM_ITEMS = (window.EDM_NEARBY||[]).slice();

  refreshAll();
})();
