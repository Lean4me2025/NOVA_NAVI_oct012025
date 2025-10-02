
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
  else if(h==='reflection') renderReflection()
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
        <div class="kicker">Step 2</div>
        <h2>Choose up to 2 Career Categories</h2>
      </div>
      <button class="btn secondary" id="backHome">← Home</button></div>
      <p class="muted small">Pick <strong>one</strong> or <strong>two</strong> categories that best describe where you want to focus. Two is the max so your results stay focused.</p>
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
  $('#backHome').onclick = ()=>location.reload()
  const grid = $('#catGrid')
  const list = Object.keys(window.NOVA_DATA)

  function updateSelCats(){ $('#selCats').textContent = state.chosenCategories.join(' • ') || '—' }
  function updateDisabled(){
    const atMax = state.chosenCategories.length >= 2
    document.querySelectorAll('#catGrid .badge').forEach(b=>{
      const name = b.getAttribute('data-name')
      const selected = state.chosenCategories.includes(name)
      if(!selected && atMax){
        b.classList.add('disabled')
        b.setAttribute('aria-disabled','true')
        b.style.pointerEvents = 'none'
      } else {
        b.classList.remove('disabled')
        b.removeAttribute('aria-disabled')
        b.style.pointerEvents = 'auto'
      }
    })
  }

  list.forEach(name=>{
    const b = el('div','badge',name)
    b.setAttribute('data-name', name)
    if(state.chosenCategories.includes(name)) b.classList.add('selected')
    b.onclick = ()=>{
      const i = state.chosenCategories.indexOf(name)
      if(i>=0){
        state.chosenCategories.splice(i,1); b.classList.remove('selected')
      } else {
        if(state.chosenCategories.length===2){
          alert('You can choose at most two categories.')
          return
        }
        state.chosenCategories.push(name); b.classList.add('selected')
      }
      updateSelCats(); updateDisabled()
    }
    grid.appendChild(b)
  })

  updateSelCats(); updateDisabled()
  $('#clearCats').onclick = ()=>{ state.chosenCategories=[]; renderCategories() }
  $('#toTraits').onclick = ()=>{
    if(state.chosenCategories.length===0) return alert('Pick at least one category.')
    state.activeCategory = state.chosenCategories[0]
    go('traits')
  }
}




function renderTraits(){
  const data = window.NOVA_DATA
  document.body.innerHTML = `
  <main class="container">
    <section class="card">
      <div class="header">
        <div><div class="kicker">Step 3</div><h2>Pick Your Traits (5 or more)</h2></div>
        <div id="catToggles" class="list"></div>
      </div>

      <h3 style="margin:6px 0">Recommended Traits from Your Categories</h3>
      <p class="muted small">We combined traits from your selected categories so you can choose in one place.</p>
      <div class="list" id="traitsCombined"></div>

      <div class="divider"></div>
      <div class="header" style="gap:8px;flex-wrap:wrap">
        <div class="small muted">Selected: <strong id="selCount">0</strong></div>
        <div style="display:flex;gap:8px">
          <button id="clearTraits" class="btn subtle">Clear selections</button>
          <button id="toCats" class="btn secondary">← Back</button>
          <button id="toResults" class="btn primary">See My Results</button>
        </div>
      </div>
    </section>
  </main>`

  // visible category toggles
  const ct = document.getElementById('catToggles')
  state.chosenCategories.forEach(c=>{
    const b = el('div','badge',c)
    if(state.activeCategory===c) b.classList.add('selected')
    b.onclick = ()=>{
      state.activeCategory = c
      // Just a visual toggle; combined list stays the same
      document.querySelectorAll('#catToggles .badge').forEach(x=>x.classList.remove('selected'))
      b.classList.add('selected')
    }
    ct.appendChild(b)
  })
  if(!state.activeCategory && state.chosenCategories.length){ state.activeCategory = state.chosenCategories[0] }

  // Build union of traits from selected categories (1 or 2)
  const combinedSet = new Set()
  state.chosenCategories.forEach(c=>{
    (data[c]?.traits||[]).forEach(t=> combinedSet.add(t))
  })
  // Edge case: if no chosenCategories (shouldn't happen), fall back to activeCategory
  if(!state.chosenCategories.length && state.activeCategory){
    (data[state.activeCategory]?.traits||[]).forEach(t=> combinedSet.add(t))
  }

  // Render combined trait chips
  const box = document.getElementById('traitsCombined')
  Array.from(combinedSet).forEach(t=>{
    const b = el('div','badge',t)
    if(state.chosenTraits.includes(t)) b.classList.add('selected')
    b.onclick = ()=>{
      const i = state.chosenTraits.indexOf(t)
      if(i>=0){ state.chosenTraits.splice(i,1); b.classList.remove('selected') }
      else {
        if(state.chosenTraits.length>=12) return alert('Let’s keep it focused. Choose up to 12 traits.')
        state.chosenTraits.push(t); b.classList.add('selected')
      }
      document.getElementById('selCount').textContent = state.chosenTraits.length
    }
    box.appendChild(b)
  })

  document.getElementById('selCount').textContent = state.chosenTraits.length
  document.getElementById('clearTraits').onclick = ()=>{ state.chosenTraits=[]; renderTraits() }
  document.getElementById('toCats').onclick = ()=>go('categories')
  document.getElementById('toResults').onclick = ()=>{
    if(state.chosenTraits.length<5) return alert('Please select at least 5 traits for accurate results.')
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
  const list = scoreRolesPercent(cat, state.chosenTraits)

  document.body.innerHTML = `
  <main class="container">
    <section class="card">
      <div class="header" style="gap:8px;flex-wrap:wrap">
        <div>
          <div class="kicker">Step 4</div>
          <h2>${cat} • Top Matches</h2>
        </div>
        <div style="display:flex;gap:8px">
          <button id="toTraits" class="btn secondary">← Edit Traits</button>
        </div>
      </div>

      <p class="small">Based on your selected traits: <strong>${state.chosenTraits.join(', ')}</strong></p>

      <div id="roles"></div>

      <div class="divider"></div>

      <div class="header">
        <span></span>
        <button id="toReflection" class="btn primary">Continue → Reflection</button>
      </div>
    </section>
  </main>`

  const box = document.getElementById('roles')
  if(list.length===0){
    const d = el('div','role')
    d.innerHTML = `<strong>No strong matches yet.</strong><div class="muted small">Try adding a few more traits or adjusting selections.</div>`
    box.appendChild(d)
  } else {
    list.forEach(r=>{
      const d = el('div','role')
      d.innerHTML = `<strong>${r.title}</strong><div class="muted small">Match: ${r.percent}%</div>`
      box.appendChild(d)
    })
  }

  document.getElementById('toTraits').onclick = ()=>go('traits')
  document.getElementById('toReflection').onclick = ()=>go('reflection')
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
  document.body.innerHTML = `
  <main class="container">
    <section class="card">
      <div class="header">
        <div><div class="kicker">Step 4</div><h2>Your NOVA Plan</h2></div>
        <button id="toResults" class="btn secondary">← Back</button>
      </div>
      <p class="small">Reflection saved locally${state.reflection?': ' + state.reflection:''}</p>

      <div class="grid cols-4">
        <div class="card">
          <h3>Starter <span class="muted small">— $29.99/mo</span></h3>
          <ul class="small">
            <li>PDF Snapshot</li>
            <li>Resume Builder (basic)</li>
            <li>Job Suggestions</li>
          </ul>
          <a href="https://payhip.com/b/GdfU7" class="payhip-buy-button" data-theme="green" data-product="GdfU7">Buy Now</a>
        </div>
        <div class="card">
          <h3>Pro <span class="muted small">— $99/mo</span></h3>
          <ul class="small">
            <li>Everything in Starter</li>
            <li>Resume Rewrite AI</li>
            <li>Unlimited Cover Letters</li>
            <li>Company Intel Reports</li>
          </ul>
          <a href="https://payhip.com/b/knC1Z" class="payhip-buy-button" data-theme="green" data-product="knC1Z">Buy Now</a>
        </div>
        <div class="card">
          <h3>Mastery <span class="muted small">— $149/mo</span></h3>
          <ul class="small">
            <li>Everything in Pro</li>
            <li>1:1 Coaching & Premium Support</li>
            <li>Career Roadmap PDF</li>
            <li>Quarterly Masterclass Invite</li>
          </ul>
          <a href="https://payhip.com/b/re4Hy" class="payhip-buy-button" data-theme="green" data-product="re4Hy">Buy Now</a>
        </div>
        <div class="card">
          <h3>Purpose Book <span class="muted small">— $14.99</span></h3>
          <p class="small">How to Know Your Purpose</p>
          <a href="https://payhip.com/b/N7Lvg" class="payhip-buy-button" data-theme="green" data-product="N7Lvg">Buy Now</a>
        </div>
      </div>

      <div class="divider"></div>

      <h3>Sign in and create a PIN to protect your data</h3>
      <p class="muted small">Your PIN secures your results so you can come back and find them later.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <input id="emailInput" type="email" placeholder="Email address" style="min-width:260px">
        <input id="pinInput" type="password" placeholder="Create PIN" style="min-width:200px">
        <button id="lockBtn" class="btn primary">Confirm & Lock Plan</button>
      </div>
    </section>
  </main>`

  document.getElementById('toResults').onclick = ()=>go('results')

  document.getElementById('lockBtn').onclick = ()=>{
    const email = document.getElementById('emailInput').value.trim()
    const pin = document.getElementById('pinInput').value.trim()
    if(!email){ return alert('Please enter your email.') }
    if(!pin){ return alert('Please create a PIN.') }
    localStorage.setItem('NOVA_UNLOCK','1')
    localStorage.setItem('NOVA_EMAIL', email)
    localStorage.setItem('NOVA_PLAN', 'selected_via_payhip')
    alert('Plan locked on this device.')
  }
}


init()


function renderReflection(){
  document.body.innerHTML = `
  <main class="container">
    <section class="card">
      <div class="header">
        <div><div class="kicker">Step 5</div><h2>Reflection</h2></div>
        <button id="toResults" class="btn secondary">← Back to Results</button>
      </div>

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
          <button id="saveDraft" class="btn subtle">Save Draft</button>
        </div>
        <div style="display:flex;gap:8px">
          <button id="toPlans" class="btn primary">Continue → Plans</button>
        </div>
      </div>
    </section>
  </main>`

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
    gc.appendChild(wrap)
  })

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

  const ta = document.getElementById('reflect')
  ta.value = state.reflection || ''
  ta.addEventListener('input', updateChar)
  function updateChar(){
    document.getElementById('charCount').textContent = `${ta.value.length} characters`
  }
  updateChar()

  document.getElementById('saveDraft').onclick = ()=>{
    state.reflection = ta.value.trim()
    localStorage.setItem('NOVA_DRAFT', JSON.stringify(state))
    alert('Saved locally.')
  }
  document.getElementById('toResults').onclick = ()=>go('results')
  document.getElementById('toPlans').onclick = ()=>{ state.reflection = ta.value.trim(); go('plans') }
}

