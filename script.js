
const BYPASS_PIN = 'FAMILY2025'; // change in production or externalize

function $(sel){return document.querySelector(sel)}
function el(tag, cls, text){const e=document.createElement(tag); if(cls) e.className=cls; if(text) e.textContent=text; return e}

function go(view){ location.hash = '#'+view }
function unlocked(){ return localStorage.getItem('NOVA_UNLOCK') === '1' }

function init(){
  window.addEventListener('hashchange', render)
  const pinBtn = document.getElementById('pinBtn')
  if(pinBtn){
    pinBtn.addEventListener('click', ()=>{
      const v = document.getElementById('pin').value.trim()
      if(!v) return alert('Enter a PIN.')
      if(v === BYPASS_PIN){ localStorage.setItem('NOVA_UNLOCK','1'); alert('Pro unlocked on this device.'); }
      else alert('Invalid PIN')
    })
  }
  const startBtn = document.getElementById('startBtn')
  if(startBtn) startBtn.addEventListener('click', ()=>go('categories'))
  render()
}

function render(){
  const h = location.hash.replace('#','')
  if(h==='categories') renderCategories()
  else if(h==='traits') renderTraits()
  else if(h==='results') renderResults()
  else if(h==='plans') renderPlans()
}

let state = {
  chosenCategories: [],
  chosenTraits: [],
  activeCategory: null,
  reflection: '',
  status: '',         // starting / switching / returning
  goals: [],          // checklist
  prompts: []         // quick-insert prompts chosen
}

function renderCategories(){
  document.body.innerHTML = `
  <main class="container">
    <section class="card">
      <div class="header"><div>
        <div class="kicker">Step 1</div>
        <h2>Choose 1–2 Career Categories</h2>
      </div>
      <button class="btn ghost right" id="backHome">← Home</button></div>
      <p class="muted small">These define which traits you'll see next.</p>
      <div class="grid cols-3" id="catGrid"></div>
      <div class="divider"></div>
      <div style="display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap">
        <div><span class="kicker">Selected:</span> <span id="selCats" class="small"></span></div>
        <div style="display:flex;gap:8px">
          <button id="clearCats" class="btn subtle">Clear</button>
          <button id="toTraits" class="btn primary">Continue → Traits</button>
        </div>
      </div>
    </section>
  </main>`
  document.getElementById('backHome').onclick = ()=>location.reload()
  const grid = document.getElementById('catGrid')
  const list = Object.keys(window.NOVA_DATA)
  list.forEach(name=>{
    const b = el('div','badge',name)
    b.onclick = ()=>{
      const i = state.chosenCategories.indexOf(name)
      if(i>=0){ state.chosenCategories.splice(i,1); b.classList.remove('selected') }
      else {
        if(state.chosenCategories.length===2) return alert('Choose at most two categories.')
        state.chosenCategories.push(name); b.classList.add('selected')
      }
      updateSelCats()
    }
    grid.appendChild(b)
  })
  function updateSelCats(){ document.getElementById('selCats').textContent = state.chosenCategories.join(' • ') || '—' }
  updateSelCats()
  document.getElementById('clearCats').onclick = ()=>{ state.chosenCategories=[]; renderCategories() }
  document.getElementById('toTraits').onclick = ()=>{
    if(state.chosenCategories.length===0) return alert('Pick at least one category.')
    state.activeCategory = state.chosenCategories[0] // start with first; user can switch
    go('traits')
  }
}

function renderTraits(){
  const data = window.NOVA_DATA
  document.body.innerHTML = `
  <main class="container">
    <section class="card">
      <div class="header">
        <div><div class="kicker">Step 2</div><h2>Select Traits (10 max)</h2></div>
        <div>
          <label class="small muted">Category</label>
          <select id="catSelect"></select>
        </div>
      </div>
      <div class="list" id="traitsList"></div>
      <div class="divider"></div>
      <div class="header" style="gap:8px;flex-wrap:wrap">
        <div><button id="clearTraits" class="btn subtle">Clear selections</button></div>
        <div style="display:flex;gap:8px">
          <button id="toCats" class="btn ghost">← Back</button>
          <button id="toResults" class="btn secondary">See My Results</button>
        </div>
      </div>
    </section>
  </main>`

  // populate category select
  const sel = document.getElementById('catSelect')
  state.chosenCategories.forEach(c=>{
    const opt = document.createElement('option')
    opt.value = c; opt.textContent = c
    sel.appendChild(opt)
  })
  sel.value = state.activeCategory
  sel.onchange = ()=>{ state.activeCategory = sel.value; state.chosenTraits=[]; drawTraits() }

  function drawTraits(){
    const traits = data[state.activeCategory].traits
    const box = document.getElementById('traitsList'); box.innerHTML=''
    traits.forEach(t=>{
      const b = el('div','badge',t)
      if(state.chosenTraits.includes(t)) b.classList.add('selected')
      b.onclick = ()=>{
        const i = state.chosenTraits.indexOf(t)
        if(i>=0){ state.chosenTraits.splice(i,1); b.classList.remove('selected') }
        else {
          if(state.chosenTraits.length>=10) return alert('Max 10 traits.')
          state.chosenTraits.push(t); b.classList.add('selected')
        }
      }
      box.appendChild(b)
    })
  }
  drawTraits()

  document.getElementById('clearTraits').onclick = ()=>{ state.chosenTraits=[]; renderTraits() }
  document.getElementById('toCats').onclick = ()=>go('categories')
  document.getElementById('toResults').onclick = ()=>{
    if(state.chosenTraits.length<3) return alert('Pick at least 3 traits for better matches.')
    go('results')
  }
}

function scoreRoles(cat, traits){
  const rules = window.NOVA_DATA[cat].roles
  const scored = {}
  Object.keys(rules).forEach(key=>{
    const need = key.split(',').map(s=>s.trim())
    const has = need.every(n=>traits.includes(n))
    rules[key].forEach(role=>{
      scored[role] = (scored[role]||0) + (has? need.length : 0)
    })
  })
  const arr = Object.entries(scored).sort((a,b)=>b[1]-a[1]).slice(0,10)
  return arr.map(([title,score])=>({title,score}))
}

function downloadSnapshot(obj){
  const text = JSON.stringify(obj, null, 2)
  const blob = new Blob([text], {type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'NOVA_Snapshot.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function renderResults(){
  const cat = state.activeCategory
  const list = scoreRoles(cat, state.chosenTraits)

  document.body.innerHTML = `
  <main class="container">
    <section class="card">
      <div class="header" style="gap:8px;flex-wrap:wrap">
        <div>
          <div class="kicker">Step 3</div>
          <h2>${cat} • Top Matches</h2>
        </div>
        <div style="display:flex;gap:8px">
          <button id="toTraits" class="btn ghost">← Edit Traits</button>
          <button id="saveDraft" class="btn subtle">Save Draft</button>
        </div>
      </div>

      <p class="small">Based on your selected traits: <strong>${state.chosenTraits.join(', ')}</strong></p>

      <div id="roles"></div>

      <div class="divider"></div>

      <div class="header"><div><span class="kicker">Reflection</span><h3>Capture Your Direction</h3></div></div>

      <div class="list" id="statusChips"></div>
      <p class="muted small">Pick one that best describes you today.</p>

      <div class="divider"></div>

      <div class="grid cols-3" id="goalsChecklist"></div>
      <p class="muted small">Choose 1–3 goals for the next two weeks.</p>

      <div class="divider"></div>

      <label class="small muted">Quick prompts</label>
      <div class="list" id="promptButtons"></div>

      <textarea id="reflect" placeholder="Write your thoughts here… (min 80 characters recommended)"></textarea>
      <div class="small muted" id="charCount">0 characters</div>

      <div class="divider"></div>

      <div class="header" style="gap:8px;flex-wrap:wrap">
        <div style="display:flex;gap:8px">
          <button id="download" class="btn subtle">Download Snapshot (.json)</button>
        </div>
        <div style="display:flex;gap:8px">
          <button id="toPlans" class="btn primary">Continue → Plans</button>
        </div>
      </div>
    </section>
  </main>`

  // roles list
  const box = document.getElementById('roles')
  list.forEach(r=>{
    const d = el('div','role')
    d.innerHTML = `<strong>${r.title}</strong><div class="muted small">Match score: ${r.score}</div>`
    box.appendChild(d)
  })

  // status chips
  const statuses = [
    ['starting','I’m starting my career'],
    ['switching','I’m switching careers'],
    ['returning','I’m returning to work']
  ]
  const sc = document.getElementById('statusChips')
  statuses.forEach(([val,label])=>{
    const chip = el('div','badge',label)
    if(state.status===val) chip.classList.add('selected')
    chip.onclick = ()=>{
      state.status = state.status===val ? '' : val
      document.querySelectorAll('#statusChips .badge').forEach(b=>b.classList.remove('selected'))
      if(state.status) chip.classList.add('selected')
    }
    sc.appendChild(chip)
  })

  // goals checklist
  const goals = [
    'Update / create resume',
    'Draft two cover letters',
    'Apply to 3 targeted roles',
    'Schedule an informational chat',
    'Enroll in one skills course',
    'Shadow or volunteer once'
  ]
  const gc = document.getElementById('goalsChecklist')
  goals.forEach(g=>{
    const wrap = el('label','small')
    wrap.style.display='flex'; wrap.style.gap='8px'; wrap.style.alignItems='center'
    const cb = document.createElement('input'); cb.type='checkbox'
    cb.checked = state.goals.includes(g)
    cb.onchange = ()=>{
      if(cb.checked){ if(!state.goals.includes(g)) state.goals.push(g) }
      else { state.goals = state.goals.filter(x=>x!==g) }
    }
    const span = el('span','',g)
    wrap.appendChild(cb); wrap.appendChild(span)
    document.getElementById('goalsChecklist').appendChild(wrap)
  })

  // quick prompts
  const prompts = [
    'The roles that excite me most are…',
    'My top 3 strengths I want to use are…',
    'One obstacle I’ll tackle first is…',
    'I will measure progress by…'
  ]
  const pb = document.getElementById('promptButtons')
  prompts.forEach(p=>{
    const b = el('div','badge',p)
    b.onclick = ()=>{
      const ta = document.getElementById('reflect')
      ta.value = (ta.value ? ta.value+'\n' : '') + p + ' '
      updateChar()
    }
    pb.appendChild(b)
  })

  // textarea + counter
  const ta = document.getElementById('reflect')
  ta.value = state.reflection || ''
  ta.addEventListener('input', updateChar)
  function updateChar(){
    document.getElementById('charCount').textContent = `${ta.value.length} characters`
  }
  updateChar()

  // actions
  document.getElementById('toTraits').onclick = ()=>go('traits')
  document.getElementById('toPlans').onclick = ()=>{ 
    state.reflection = ta.value.trim()
    go('plans') 
  }
  document.getElementById('download').onclick = ()=>{
    state.reflection = ta.value.trim()
    const payload = {
      category: cat,
      traits: state.chosenTraits,
      roles: list.map(r=>r.title),
      status: state.status,
      goals: state.goals,
      reflection: state.reflection,
      timestamp: new Date().toISOString()
    }
    downloadSnapshot(payload)
  }
  document.getElementById('saveDraft').onclick = ()=>{
    state.reflection = ta.value.trim()
    localStorage.setItem('NOVA_DRAFT', JSON.stringify(state))
    alert('Saved locally.')
  }
}

function renderPlans(){
  const isUnlocked = unlocked()
  document.body.innerHTML = `
  <main class="container">
    <section class="card">
      <div class="header">
        <div><div class="kicker">Step 4</div><h2>Your NOVA Plan</h2></div>
        <button id="toResults" class="btn ghost">← Back</button>
      </div>
      <p class="muted small">Reflection saved locally${state.reflection?': ' + state.reflection:''}</p>
      <div class="grid cols-3">
        <div class="card">
          <h3>Starter</h3>
          <ul class="small">
            <li>PDF Snapshot</li>
            <li>Resume Builder (basic)</li>
            <li>Job Suggestions</li>
          </ul>
          <a href="https://payhip.com/b/re4Hy" class="payhip-buy-button" data-theme="green" data-product="re4Hy">Buy Now</a>
        </div>
        <div class="card">
          <h3>Pro</h3>
          <ul class="small">
            <li>Everything in Starter</li>
            <li>Resume Rewrite AI</li>
            <li>Unlimited Cover Letters</li>
            <li>Company Intel Reports</li>
          </ul>
          <div id="proArea"></div>
        </div>
        <div class="card">
          <h3>Purpose Book</h3>
          <p class="small">How to Know Your Purpose</p>
          <a href="https://payhip.com/b/N7Lvg" class="payhip-buy-button" data-theme="green" data-product="N7Lvg">Buy Now</a>
        </div>
      </div>
      <footer>Pro unlocked on this device: <strong>${isUnlocked?'Yes':'No'}</strong>.</footer>
    </section>
  </main>`

  if(isUnlocked){
    document.getElementById('proArea').innerHTML = `<button class="btn secondary" id="enterPro">Enter Pro Tools</button>`
  } else {
    document.getElementById('proArea').innerHTML = `<a href="https://payhip.com/b/re4Hy" class="payhip-buy-button" data-theme="green" data-product="re4Hy">Buy Pro</a>`
  }
  document.getElementById('toResults').onclick = ()=>go('results')
}

init()
