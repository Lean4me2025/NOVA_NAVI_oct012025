import { TRAITS } from './traits.js';

const panels = [...document.querySelectorAll('.panel')];
const links = [...document.querySelectorAll('[data-nav]')];
const startBtn = document.getElementById('startBtn');
const traitGrid = document.getElementById('traitGrid');
const clearBtn = document.getElementById('clearBtn');
const seeResultsBtn = document.getElementById('seeResultsBtn');
const selCountEl = document.getElementById('selCount');
const snapshotEl = document.getElementById('snapshot');
const reflectionEl = document.getElementById('reflection');

const MAX = 12;

function show(id){
  panels.forEach(p=>p.classList.toggle('active', p.id===id));
  window.scrollTo({top:0, behavior:'instant'});
}

links.forEach(el=> el.addEventListener('click', e => {
  show(el.dataset.nav);
  if (el.dataset.nav === 'traits') resetSessionIfEmpty();
}));

if (startBtn) startBtn.addEventListener('click', () => show('traits'));

function renderGrid(list){
  traitGrid.innerHTML = '';
  list.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.type = 'button';
    btn.setAttribute('aria-pressed','false');
    btn.dataset.id = t.id;
    btn.dataset.slug = t.slug;
    btn.textContent = t.name;
    btn.addEventListener('click', () => toggle(btn));
    traitGrid.appendChild(btn);
  });
}

function selected(){
  return [...traitGrid.querySelectorAll('.chip[aria-pressed="true"]')];
}

function toggle(btn){
  const isOn = btn.getAttribute('aria-pressed') === 'true';
  if (!isOn && selected().length >= MAX){
    btn.blur();
    btn.classList.add('shake');
    setTimeout(()=>btn.classList.remove('shake'),250);
    return;
  }
  btn.setAttribute('aria-pressed', String(!isOn));
  selCountEl.textContent = String(selected().length);
}

function clearSelections(){
  [...traitGrid.querySelectorAll('.chip')].forEach(b=> b.setAttribute('aria-pressed','false'));
  selCountEl.textContent = '0';
  localStorage.removeItem('nova_traits');
  reflectionEl.value = '';
}

function saveSession(){
  const picks = selected().map(b => ({ id: Number(b.dataset.id), name: b.textContent, slug: b.dataset.slug }));
  const note = reflectionEl.value || '';
  localStorage.setItem('nova_traits', JSON.stringify({ picks, note }));
}

function loadSession(){
  const raw = localStorage.getItem('nova_traits');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function resetSessionIfEmpty(){
  const s = loadSession();
  if (!s) clearSelections();
}

function buildSnapshot(){
  const picks = selected().map(b => b.textContent);
  if (!picks.length){
    snapshotEl.innerHTML = '<em>No traits selected yet.</em>';
    return;
  }
  const list = picks.map(t => `<li>${t}</li>`).join('');
  snapshotEl.innerHTML = `<ol>${list}</ol>`;
}

clearBtn.addEventListener('click', clearSelections);
seeResultsBtn.addEventListener('click', () => {
  buildSnapshot();
  saveSession();
  show('results');
});

// Init
renderGrid(TRAITS);
clearSelections();

