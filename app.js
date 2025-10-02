// SPA logic with robust data parsing
const panels = [...document.querySelectorAll('.panel')];
const navs = [...document.querySelectorAll('[data-nav]')];

function show(id){
  panels.forEach(p => p.classList.toggle('active', p.id === id));
  window.scrollTo({top:0, behavior:'instant'});
}
navs.forEach(n => n.addEventListener('click', () => show(n.dataset.nav)));

// Trait logic
const MAX = 12;
let traits = [];
let ooh = null;
let occupations = null;

const traitGrid = document.getElementById('traitGrid');
const clearBtn = document.getElementById('clearBtn');
const toDiscoverBtn = document.getElementById('toDiscoverBtn');
const selCountEl = document.getElementById('selCount');
const catList = document.getElementById('catList');
const reflectionEl = document.getElementById('reflection');

function selectedButtons(){
  return [...traitGrid.querySelectorAll('.chip[aria-pressed="true"]')];
}

function selectedTraitNames(){
  return selectedButtons().map(b => b.textContent);
}

function saveSession(){
  const picks = selectedButtons().map(b => ({ id:Number(b.dataset.id), name:b.textContent, slug:b.dataset.slug }));
  const note = (reflectionEl && reflectionEl.value) || '';
  const stage = document.querySelector('input[name="stage"]:checked')?.value || null;
  localStorage.setItem('nova_session', JSON.stringify({ picks, note, stage }));
}

function loadSession(){
  try{
    return JSON.parse(localStorage.getItem('nova_session') || 'null');
  }catch{return null}
}

function renderTraits(){
  traitGrid.innerHTML = '';
  (traits || []).forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.type = 'button';
    btn.setAttribute('aria-pressed','false');
    btn.dataset.id = t.id ?? t.ID ?? '';
    btn.dataset.slug = t.slug ?? t.name?.toLowerCase().replace(/[^a-z0-9]+/g,'-') ?? '';
    btn.textContent = t.name ?? t.title ?? String(t);
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') === 'true';
      if(!on && selectedButtons().length >= MAX){ btn.blur(); return; }
      btn.setAttribute('aria-pressed', String(!on));
      selCountEl.textContent = String(selectedButtons().length);
      saveSession();
    });
    traitGrid.appendChild(btn);
  });
  selCountEl.textContent = '0';
}

function clearSelections(){
  [...traitGrid.querySelectorAll('.chip')].forEach(b => b.setAttribute('aria-pressed','false'));
  selCountEl.textContent = '0';
  saveSession();
}

clearBtn?.addEventListener('click', clearSelections);

// Discover: categories + jobs
function inferTitle(item){
  return item.title || item.occupation_name_full || item.occupation || item.name || item.occupation_title || 'Untitled';
}
function inferSoc(item){
  return item.soc_code || item.SOC || item.soc || item.code || null;
}
function inferCategory(item){
  // Try common fields
  return item.category || item.ooh_category || item.industry || item.field || null;
}
function inferPay(item){
  return item.median_pay || item.qf_median_pay_annual?.value || item.pay || null;
}
function inferOutlook(item){
  return item.outlook || item.qf_employment_outlook?.description || item.growth || null;
}

function groupByCategory(list){
  const groups = new Map();
  list.forEach(item => {
    const cat = inferCategory(item) || 'General';
    if(!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(item);
  });
  return [...groups.entries()].map(([category, items]) => ({category, items}));
}

function jobMatchesTraits(item, traitNames){
  // Simple heuristic: match on keywords in title vs. traits (can be expanded later).
  const title = inferTitle(item).toLowerCase();
  return traitNames.some(t => title.includes(t.toLowerCase().split(' ')[0]));
}

function buildDiscover(){
  const traitNames = selectedTraitNames();
  let items = [];

  if (Array.isArray(occupations)) items = occupations;
  else if (occupations && typeof occupations === 'object') items = Object.values(occupations);
  else if (Array.isArray(ooh)) items = ooh;
  else if (ooh && typeof ooh === 'object') items = (ooh.occupations || Object.values(ooh));

  // Fallback: empty
  items = Array.isArray(items) ? items : [];

  // If no categories exist in data, we will present an "All Jobs" group
  let groups = groupByCategory(items);

  // Lightweight ranking: put items that roughly match trait keywords first in each category
  groups = groups.map(g => ({
    category: g.category,
    items: g.items.slice().sort((a,b) => Number(jobMatchesTraits(b,traitNames)) - Number(jobMatchesTraits(a,traitNames)))
  }));

  // Render
  catList.innerHTML = '';
  groups.forEach(g => {
    const wrap = document.createElement('div');
    wrap.className = 'cat';
    const h = document.createElement('h3');
    h.textContent = g.category;
    wrap.appendChild(h);
    const top = g.items.slice(0, 12); // keep UI tight
    top.forEach(item => {
      const row = document.createElement('div');
      row.className = 'job';
      const title = inferTitle(item);
      const pay = inferPay(item);
      const outlook = inferOutlook(item);
      row.innerHTML = `<div>${title}${inferSoc(item) ? ' <small>(' + inferSoc(item) + ')</small>' : ''}</div><div><small>${pay ? '$'+String(pay).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} ${outlook ? ' • ' + outlook : ''}</small></div>`;
      wrap.appendChild(row);
    });
    catList.appendChild(wrap);
  });

  if(groups.length === 0){
    const p = document.createElement('p');
    p.textContent = 'No jobs data available in the dataset. Upload OOH JSON to /assets/data/. ';
    catList.appendChild(p);
  }
}

toDiscoverBtn?.addEventListener('click', () => {
  show('discover');
  buildDiscover();
});

// Persist reflection choice
document.querySelectorAll('input[name="stage"]').forEach(r => {
  r.addEventListener('change', saveSession);
});
reflectionEl?.addEventListener('input', saveSession);

// Load data
async function loadJSON(path){
  try{
    const res = await fetch(path);
    if(!res.ok) throw new Error(res.statusText);
    return await res.json();
  }catch(e){ return null; }
}

(async function init(){
  traits = await loadJSON('./assets/data/traits.json') || [];
  occupations = await loadJSON('./assets/data/occupations.json');
  ooh = await loadJSON('./assets/data/ooh.json');

  // Normalize traits if object wrapper
  if(!Array.isArray(traits) && traits && Array.isArray(traits.traits)){
    traits = traits.traits;
  }
  renderTraits();

  // restore session
  const saved = loadSession();
  if(saved){
    reflectionEl && (reflectionEl.value = saved.note || '');
    if(saved.stage){
      const radio = document.querySelector(`input[name="stage"][value="${saved.stage}"]`);
      if(radio) radio.checked = true;
    }
  }
})();