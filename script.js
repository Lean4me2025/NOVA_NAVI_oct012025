
// NOVA drop-in router + pages (ES5, safe for current repo).
// Exposes `go()` globally so inline onclick works. No syntax sugar.

(function(){
  // ---------- Helpers ----------
  function $(sel){ return document.querySelector(sel); }
  function el(tag, cls, text){
    var d=document.createElement(tag);
    if(cls) d.className=cls;
    if(text!=null) d.textContent=text;
    return d;
  }

  // ---------- State ----------
  var state = {
    chosenCategories: [],
    activeCategory: "",
    chosenTraits: [],
    status: "",
    goals: [],
    reflection: ""
  };

  // ---------- Router ----------
  window.go = function(view){
    location.hash = '#' + view;
    render();
  };

  function render(){
    var h = (location.hash || '#welcome').slice(1);
    if(h==='welcome') return renderWelcome();
    if(h==='categories') return renderCategories();
    if(h==='traits') return renderTraits();
    if(h==='results') return renderResults();
    if(h==='reflection') return renderReflection();
    if(h==='plans') return renderPlans();
    renderWelcome();
  }
  window.render = render;
  window.addEventListener('hashchange', render);

  // ---------- Pages ----------
  function host(){
    // Prefer a main container if present, else body
    return document.querySelector('#app') || document.querySelector('main.container') || document.body;
  }

  function renderWelcome(){
    // Leave your existing welcome markup as-is (index.html draws it).
    // If you want to re-render welcome here later, you can.
  }

  // Categories (max 2)
  function renderCategories(){
    var app = host();
    var data = window.NOVA_DATA || {};
    var cats = Object.keys(data);

    var html = '' +
      '<section class="card">' +
      '  <div class="header"><div><div class="kicker">Step 2</div><h2>Choose up to 2 Career Categories</h2></div>' +
      '  <button class="btn secondary" id="homeBtn">← Home</button></div>' +
      '  <p class="muted small">Pick one or two so your results stay focused.</p>' +
      '  <div class="list" id="catGrid"></div>' +
      '  <div class="divider"></div>' +
      '  <div class="header">' +
      '    <div class="small muted">Selected: <strong id="selCats">—</strong></div>' +
      '    <div>' +
      '      <button class="btn subtle" id="clearCats">Clear</button> ' +
      '      <button class="btn primary" id="toTraits">Continue → Traits</button>' +
      '    </div>' +
      '  </div>' +
      '</section>';

    app.innerHTML = html;

    var grid = document.getElementById('catGrid');
    cats.forEach(function(name){
      var b = el('div','badge',name); b.setAttribute('data-name', name);
      if(state.chosenCategories.indexOf(name)>=0) b.classList.add('selected');
      b.onclick = function(){
        var i = state.chosenCategories.indexOf(name);
        if(i>=0){ state.chosenCategories.splice(i,1); b.classList.remove('selected'); }
        else{
          if(state.chosenCategories.length===2){ alert('You can choose at most two categories.'); return; }
          state.chosenCategories.push(name); b.classList.add('selected');
        }
        updateCats();
      };
      grid.appendChild(b);
    });

    function updateCats(){
      var sel = document.getElementById('selCats');
      sel.textContent = state.chosenCategories.join(' • ') || '—';
      var atMax = state.chosenCategories.length>=2;
      var badges = grid.querySelectorAll('.badge');
      for(var i=0;i<badges.length;i++){
        var bd = badges[i]; var nm = bd.getAttribute('data-name');
        var selected = state.chosenCategories.indexOf(nm)>=0;
        if(!selected && atMax){ bd.classList.add('disabled'); bd.style.pointerEvents='none'; }
        else { bd.classList.remove('disabled'); bd.style.pointerEvents='auto'; }
      }
    }

    document.getElementById('homeBtn').onclick = function(){ location.hash='#welcome'; location.reload(); };
    document.getElementById('clearCats').onclick = function(){ state.chosenCategories=[]; renderCategories(); };
    document.getElementById('toTraits').onclick = function(){
      if(!state.chosenCategories.length) return alert('Pick at least one category.');
      state.activeCategory = state.chosenCategories[0];
      go('traits');
    };

    updateCats();
  }

  // Traits (merged; ≥5; <=12)
  function renderTraits(){
    if(!state.chosenCategories.length) return go('categories');
    var app = host();
    var data = window.NOVA_DATA || {};
    var set = {}; // union
    state.chosenCategories.forEach(function(c){
      var arr = (data[c] && data[c].traits) || [];
      for(var i=0;i<arr.length;i++) set[arr[i]] = true;
    });
    var combined = Object.keys(set).sort();

    var html = '' +
      '<section class="card">' +
      '  <div class="header"><div><div class="kicker">Step 3</div><h2>Pick Your Traits (5 or more)</h2></div>' +
      '  <div>' +
      '    <button class="btn secondary" id="backCats">← Back</button> ' +
      '    <button class="btn primary" id="toResults">See My Results</button>' +
      '  </div></div>' +
      '  <h3>Recommended Traits from Your Categories</h3>' +
      '  <p class="muted small">We combined traits from your selected categories so you can choose in one place.</p>' +
      '  <div class="list" id="traitList"></div>' +
      '  <div class="divider"></div>' +
      '  <div class="small muted">Selected: <strong id="selCount">0</strong></div>' +
      '</section>';

    app.innerHTML = html;

    var box = document.getElementById('traitList');
    combined.forEach(function(t){
      var b = el('div','badge',t);
      if(state.chosenTraits.indexOf(t)>=0) b.classList.add('selected');
      b.onclick = function(){
        var i = state.chosenTraits.indexOf(t);
        if(i>=0){ state.chosenTraits.splice(i,1); b.classList.remove('selected'); }
        else {
          if(state.chosenTraits.length>=12) return alert('Choose up to 12 traits.');
          state.chosenTraits.push(t); b.classList.add('selected');
        }
        document.getElementById('selCount').textContent = String(state.chosenTraits.length);
      };
      box.appendChild(b);
    });
    document.getElementById('selCount').textContent = String(state.chosenTraits.length);

    document.getElementById('backCats').onclick = function(){ go('categories'); };
    document.getElementById('toResults').onclick = function(){
      if(state.chosenTraits.length<5) return alert('Please select at least 5 traits.');
      go('results');
    };
  }

  // Scoring: percentages only; ≥30%; top 3–4
  function scoreRolesPercent(cat, traits){
    var data = window.NOVA_DATA || {};
    var rules = (data[cat] && data[cat].roles) || {};
    var tmp = [];
    Object.keys(rules).forEach(function(sig){
      var keys = sig.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
      var overlap = 0;
      for(var i=0;i<keys.length;i++){ if(traits.indexOf(keys[i])>=0) overlap++; }
      var pct = Math.round((overlap / (keys.length || 1)) * 100);
      var roles = rules[sig] || [];
      for(var j=0;j<roles.length;j++){ tmp.push({title: roles[j], percent: pct}); }
    });
    // keep best per role
    var best = {};
    for(var k=0;k<tmp.length;k++){
      var r = tmp[k];
      best[r.title] = Math.max(best[r.title]||0, r.percent);
    }
    var list = [];
    Object.keys(best).forEach(function(title){ list.push({title:title, percent:best[title]}); });
    list = list.filter(function(r){ return r.percent >= 30; });
    list.sort(function(a,b){ return (b.percent - a.percent) || (a.title<b.title?-1:1); });
    if(list.length>4) list = list.slice(0,4);
    return list;
  }

  function renderResults(){
    if(!state.chosenCategories.length) return go('categories');
    var app = host();
    var cat = state.activeCategory || state.chosenCategories[0];
    var list = scoreRolesPercent(cat, state.chosenTraits);
    var html = '' +
      '<section class="card">' +
      '  <div class="header"><div><div class="kicker">Step 4</div><h2>' + cat + ' • Top Matches</h2></div>' +
      '  <button class="btn secondary" id="editTraits">← Edit Traits</button></div>' +
      '  <p class="small">Based on your selected traits: <strong>' + (state.chosenTraits.join(', ')||'—') + '</strong></p>' +
      '  <div id="roles"></div>' +
      '  <div class="divider"></div>' +
      '  <div class="header"><span></span><button class="btn primary" id="toReflection">Continue → Reflection</button></div>' +
      '</section>';
    app.innerHTML = html;

    var box = document.getElementById('roles');
    if(!list.length){
      var d = el('div','role'); d.innerHTML = '<strong>No strong matches yet.</strong><div class="muted small">Try adding a few more traits.</div>'; box.appendChild(d);
    } else {
      for(var i=0;i<list.length;i++){
        var r = list[i];
        var d = el('div','role'); d.innerHTML = '<strong>'+r.title+'</strong><div class="muted small">Match: '+r.percent+'%</div>'; box.appendChild(d);
      }
    }
    document.getElementById('editTraits').onclick = function(){ go('traits'); };
    document.getElementById('toReflection').onclick = function(){ go('reflection'); };
  }

  function renderReflection(){
    var app = host();
    var html = '' +
      '<section class="card">' +
      '  <div class="header"><div><div class="kicker">Step 5</div><h2>Reflection</h2></div>' +
      '  <button class="btn secondary" id="backResults">← Back to Results</button></div>' +
      '  <div class="list" id="status"></div>' +
      '  <p class="muted small">Pick one that best describes you today.</p>' +
      '  <div class="divider"></div>' +
      '  <div class="grid cols-3" id="goals"></div>' +
      '  <p class="muted small">Choose 1–3 goals for the next two weeks.</p>' +
      '  <div class="divider"></div>' +
      '  <label class="small muted">Reflection notes</label>' +
      '  <textarea id="reflect" placeholder="Write your thoughts here…"></textarea>' +
      '  <div class="divider"></div>' +
      '  <div class="header"><span></span><button class="btn primary" id="toPlans">Continue → Plans</button></div>' +
      '</section>';
    app.innerHTML = html;

    document.getElementById('backResults').onclick = function(){ go('results'); };
    document.getElementById('toPlans').onclick = function(){ state.reflection = (document.getElementById('reflect').value||'').trim(); go('plans'); };

    var statuses = [
      ['starting','I’m starting my career'],
      ['switching','I’m switching careers'],
      ['returning','I’m returning to work']
    ];
    var sc = document.getElementById('status');
    for(var i=0;i<statuses.length;i++){
      (function(v,label){
        var b = el('div','badge',label);
        if(state.status===v) b.classList.add('selected');
        b.onclick = function(){
          state.status = (state.status===v) ? '' : v;
          var all = sc.querySelectorAll('.badge');
          for(var j=0;j<all.length;j++) all[j].classList.remove('selected');
          if(state.status) b.classList.add('selected');
        };
        sc.appendChild(b);
      })(statuses[i][0], statuses[i][1]);
    }

    var goals = [
      'Update / create resume',
      'Draft two cover letters',
      'Apply to 3 targeted roles',
      'Schedule an informational chat',
      'Enroll in one skills course',
      'Shadow or volunteer once'
    ];
    var gc = document.getElementById('goals');
    for(var g=0; g<goals.length; g++){
      (function(txt){
        var wrap = document.createElement('label');
        wrap.className='small'; wrap.style.display='flex'; wrap.style.gap='8px'; wrap.style.alignItems='center';
        var cb = document.createElement('input'); cb.type='checkbox';
        cb.checked = state.goals.indexOf(txt)>=0;
        cb.onchange = function(){
          if(cb.checked){ if(state.goals.indexOf(txt)<0) state.goals.push(txt); }
          else { state.goals = state.goals.filter(function(x){ return x!==txt; }); }
        };
        var span = el('span','',txt);
        wrap.appendChild(cb); wrap.appendChild(span); gc.appendChild(wrap);
      })(goals[g]);
    }
  }

  function renderPlans(){
    var app = host();
    var html = '' +
      '<section class="card">' +
      '  <div class="header"><div><div class="kicker">Step 6</div><h2>Your NOVA Plan</h2></div>' +
      '  <button class="btn secondary" id="backReflect">← Back</button></div>' +
      '  <div class="grid cols-4" id="plans"></div>' +
      '  <div class="divider"></div>' +
      '  <div class="card" style="background:#0f2740">' +
      '    <h3>Sign in & create a PIN</h3>' +
      '    <p class="small muted">Protect your data so you can return to it later.</p>' +
      '    <div class="grid cols-3">' +
      '      <input placeholder="Email" id="pinEmail" />' +
      '      <input placeholder="Create PIN" id="pin1" />' +
      '      <button class="btn primary" id="lockPlan">Confirm & Lock Plan</button>' +
      '    </div>' +
      '  </div>' +
      '</section>';
    app.innerHTML = html;

    document.getElementById('backReflect').onclick = function(){ go('reflection'); };

    var plans = document.getElementById('plans');
    function tile(title, itemsHtml, product){
      var card = document.createElement('div');
      card.className = 'card'; card.style.background='#0f2740';
      card.innerHTML = '<h3>'+title+'</h3><div class="small"><ul style="text-align:left;margin-left:16px">'+itemsHtml+'</ul></div>'
        + '<a href="https://payhip.com/b/'+product+'" class="payhip-buy-button" data-theme="green" data-product="'+product+'">Buy Now</a>';
      plans.appendChild(card);
    }
    tile('Starter — $29.99/mo','<li>PDF Snapshot</li><li>Resume Builder (basic)</li><li>Job Suggestions</li>','GdfU7');
    tile('Pro — $99/mo','<li>Everything in Starter</li><li>Resume Rewrite AI</li><li>Unlimited Cover Letters</li><li>Company Intel Reports</li>','knC1Z');
    tile('Mastery — $149/mo','<li>Everything in Pro</li><li>Coaching Library + Templates</li><li>Weekly Accountability</li>','re4Hy');
    tile('Purpose Book — $14.99','<li>How to Know Your Purpose</li>','N7Lvg');
  }

  // If the page initially loads on a deep link (e.g., #categories), render immediately.
  if(location.hash && location.hash !== '#welcome'){ render(); }

})();
