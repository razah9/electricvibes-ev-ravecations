/*! Electric Vibes — Ravecations tiny build (click-for-latest) */
(function () {
  // ---------- tiny CSS (scoped by #ev-rave-map) ----------
  (function(){
    var el=document.createElement("style");
    el.textContent = `
#ev-rave-map .ev-card{background:var(--ev-bg);color:var(--ev-ink);border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,.35);overflow:hidden}
#ev-rave-map .ev-head{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px 10px;border-bottom:1px solid var(--ev-border)}
#ev-rave-map .ev-title{font-weight:800}
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
#ev-rave-map .sheet{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;max-width:980px;width:calc(100% - 28px);z-index:5000;background:#0c1c1f;color:var(--ev-ink);border:1px solid var(--ev-border);border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.4);display:none}
#ev-rave-map .sheet.show{display:block}
#ev-rave-map .sheet-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--ev-border)}
#ev-rave-map .sheet-body{padding:10px 14px}
#ev-rave-map .sheet a{color:#aef; text-decoration:none}
#ev-rave-map .sheet a:hover{text-decoration:underline}
#ev-rave-map .post{padding:8px 0;border-bottom:1px dashed var(--ev-border)}
#ev-rave-map .post:last-child{border-bottom:none}
@media(max-width:640px){#ev-rave-map .ev-map{height:420px}}
    `;
    document.head.appendChild(el);
  })();

  // ---------- Config ----------
  const COLLECTION = (window.EV_COLLECTION_ID || "").trim();
  const BASE = (window.EV_BASE && window.EV_BASE.trim()) || (location && location.origin) || "https://www.electricvibesusa.com";
  const SEARCH_URL = (q, page) => `${BASE}/search?q=${encodeURIComponent(q)}&format=json&collectionId=${COLLECTION}${page?`&page=${page}`:""}`;

  // Cities: [name, query(optional), [lat,lng]]
  // (trimmed to the most relevant to keep requests low; add freely)
  const CITIES = [
    // NA
    ["Miami",null,[25.7617,-80.1918]],["Orlando",null,[28.5384,-81.379]],["Tampa",null,[27.9506,-82.4572]],
    ["New York",null,[40.7128,-74.006]],["Chicago",null,[41.8781,-87.6298]],["Las Vegas",null,[36.1699,-115.1398]],
    ["Los Angeles",null,[34.0522,-118.2437]],["San Francisco",null,[37.7749,-122.4194]],["Denver",null,[39.7392,-104.9903]],
    ["Toronto",null,[43.6532,-79.3832]],["Vancouver",null,[49.2827,-123.1207]],["Mexico City","CDMX",[19.4326,-99.1332]],
    ["Tulum",null,[20.2114,-87.4654]],["Cancún","Cancun",[21.1619,-86.8515]],
    // EU
    ["London",null,[51.5074,-0.1278]],["Manchester",null,[53.4808,-2.2426]],["Ibiza",null,[38.9067,1.4206]],
    ["Amsterdam",null,[52.3676,4.9041]],["Paris",null,[48.8566,2.3522]],["Brussels",null,[50.8503,4.3517]],
    ["Berlin",null,[52.52,13.405]],["Barcelona",null,[41.3851,2.1734]],
