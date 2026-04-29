// ============================================================
// IRON CIRCLE — app.js
// Main application logic + Exercise Memory System
// ============================================================

// ====== STORAGE KEYS ======
const KEYS = {
  sessions:    'ic-sessions',
  exercises:   'ic-exercises',    // { name: { count, lastUsed, isFav, lastWeight, lastSetsReps } }
  liftDraft:   'ic-lift-draft',
};

// ====== BASE EXERCISE LIST ======
const BASE_EXERCISES = [
  'Power Clean', 'Hang Clean', 'Hang Snatch', 'Power Snatch',
  'Squat', 'Box Squat', 'Belt Squat', 'Front Squat',
  'Deadlift', 'Romanian Deadlift', 'Hip Thrust',
  'Bench Press', 'Incline Bench', 'Push Press', 'Jerk', 'Overhead Press',
  'Pull-up', 'Barbell Row', 'Dumbbell Row', 'Lat Pulldown',
  'Trap Bar Deadlift', 'Farmer Carry',
  'Medicine Ball Slam', 'Medicine Ball Rotational', 'Medicine Ball Chest Pass',
  'Box Jump', 'Depth Jump', 'Broad Jump',
  'Single-leg Squat', 'Walking Lunge', 'Step Up',
  'Nordic Curl', 'Glute Ham Raise',
  'Core / Ab Work', 'Rotator Cuff', 'Band Work',
  'Plyometrics', 'Sprint / Speed Work',
];

// ====== STATE ======
let sessions   = JSON.parse(localStorage.getItem(KEYS.sessions)  || '[]');
let exercises  = JSON.parse(localStorage.getItem(KEYS.exercises) || '{}');
let currentThrows = [];
let addedLifts    = [];   // [{ id, name }]
let liftIdCounter = 0;

// ====== INIT ======
(function init() {
  const today = new Date();
  document.getElementById('session-date').value = today.toISOString().split('T')[0];
  document.getElementById('nav-date').textContent =
    today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  renderHistory();
  renderQuickAdd();
})();

// ====== TABS ======
function switchTab(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'stats') renderStats();
}

// ====== FEEL BUTTONS ======
function selectFeel(groupId, btn) {
  document.querySelectorAll('#' + groupId + ' .feel-btn')
    .forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}
function getFeelVal(groupId) {
  const sel = document.querySelector('#' + groupId + ' .feel-btn.selected');
  return sel ? parseInt(sel.dataset.val) : null;
}

// ====== THROWS ======
function addThrow() {
  const dist = parseFloat(document.getElementById('throw-dist').value);
  if (!dist || dist < 1 || dist > 30) { showToast('Enter a valid distance (1–30 m)'); return; }
  const type = document.getElementById('throw-type').value;
  const note = document.getElementById('throw-note').value.trim();
  currentThrows.push({ dist, type, note });
  document.getElementById('throw-dist').value = '';
  document.getElementById('throw-note').value = '';
  renderThrowList();
}

function renderThrowList() {
  const container = document.getElementById('throw-list');
  if (!currentThrows.length) { container.innerHTML = ''; return; }
  const best = Math.max(...currentThrows.map(t => t.dist));
  container.innerHTML = currentThrows.map((t, i) => `
    <div class="throw-entry">
      <div class="throw-num">${t.dist.toFixed(2)}<span style="font-size:13px;color:var(--text3)">m</span></div>
      <div class="throw-meta">
        ${capitalize(t.type)}${t.dist === best ? ' 🏆' : ''}
        ${t.note ? '<br>' + t.note : ''}
      </div>
      <button class="throw-delete" onclick="removeThrow(${i})">✕</button>
    </div>
  `).join('');
}

function removeThrow(i) {
  currentThrows.splice(i, 1);
  renderThrowList();
}

// ====== EXERCISE MEMORY SYSTEM ======

function getExerciseMeta(name) {
  return exercises[name] || { count: 0, lastUsed: null, isFav: false, lastWeight: '', lastSetsReps: '' };
}

function recordExerciseUse(name, weight, setsReps) {
  const meta = getExerciseMeta(name);
  exercises[name] = {
    ...meta,
    count: meta.count + 1,
    lastUsed: new Date().toISOString(),
    lastWeight: weight || meta.lastWeight,
    lastSetsReps: setsReps || meta.lastSetsReps,
  };
  saveExercises();
}

function toggleFavorite(name) {
  const meta = getExerciseMeta(name);
  exercises[name] = { ...meta, isFav: !meta.isFav };
  saveExercises();
}

function saveExercises() {
  localStorage.setItem(KEYS.exercises, JSON.stringify(exercises));
}

// Get sorted list: favs first, then by usage count
function getSortedExercises(filter = '') {
  const allNames = [...new Set([...BASE_EXERCISES, ...Object.keys(exercises)])];
  return allNames
    .filter(n => n.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      const ma = getExerciseMeta(a);
      const mb = getExerciseMeta(b);
      if (ma.isFav !== mb.isFav) return ma.isFav ? -1 : 1;
      return mb.count - ma.count;
    });
}

function getRecentExercises(limit = 8) {
  return Object.entries(exercises)
    .filter(([, m]) => m.lastUsed)
    .sort((a, b) => new Date(b[1].lastUsed) - new Date(a[1].lastUsed))
    .slice(0, limit)
    .map(([name]) => name);
}

// ====== QUICK ADD BAR ======
function renderQuickAdd() {
  const recents = getRecentExercises(8);
  const bar = document.getElementById('quick-add-bar');
  const chips = document.getElementById('quick-add-chips');
  if (!recents.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'block';
  chips.innerHTML = recents.map(name => {
    const meta = getExerciseMeta(name);
    const hint = meta.lastWeight ? ` · ${meta.lastWeight}lb` : '';
    return `<span class="quick-chip" onclick="quickAddExercise('${escapeName(name)}')">${name}${hint}</span>`;
  }).join('');
}

function quickAddExercise(name) {
  const meta = getExerciseMeta(name);
  addLiftCard(name, meta.lastWeight, meta.lastSetsReps);
  showToast(`${name} added`);
}

// ====== LIFT CARDS ======
function addLiftCard(name, weight = '', setsReps = '') {
  const id = liftIdCounter++;
  addedLifts.push({ id, name });

  const meta = getExerciseMeta(name);
  const isFav = meta.isFav;

  const card = document.createElement('div');
  card.className = 'lift-card';
  card.id = `lift-card-${id}`;
  card.innerHTML = `
    <div class="lift-card-header">
      <div class="lift-card-name">${name}</div>
      <button class="lift-card-fav ${isFav ? 'is-fav' : ''}"
        onclick="toggleFavFromCard('${escapeName(name)}', this)"
        title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">★</button>
    </div>
    <div class="lift-fields">
      <div>
        <label>Weight (lbs)</label>
        <input type="number" id="lift-wt-${id}" placeholder="${weight || 'e.g. 315'}" value="${weight}" min="0">
      </div>
      <div>
        <label>Sets × Reps</label>
        <input type="text" id="lift-sr-${id}" placeholder="${setsReps || 'e.g. 3×3'}" value="${setsReps}">
      </div>
    </div>
    <div class="lift-delete-row">
      <button class="lift-remove" onclick="removeLiftCard(${id})">Remove</button>
    </div>
  `;
  document.getElementById('lift-list').appendChild(card);
}

function removeLiftCard(id) {
  addedLifts = addedLifts.filter(l => l.id !== id);
  const el = document.getElementById('lift-card-' + id);
  if (el) el.remove();
}

function toggleFavFromCard(name, btn) {
  toggleFavorite(name);
  const meta = getExerciseMeta(name);
  btn.classList.toggle('is-fav', meta.isFav);
  // Also refresh picker if open
  renderExercisePicker('');
}

function getLifts() {
  return addedLifts.map(({ id, name }) => ({
    exercise: name,
    weight: document.getElementById('lift-wt-' + id)?.value || '',
    setsReps: document.getElementById('lift-sr-' + id)?.value || '',
  })).filter(l => l.exercise);
}

// ====== EXERCISE PICKER MODAL ======
let pickerFilter = '';

function openExercisePicker() {
  pickerFilter = '';
  document.getElementById('ex-search').value = '';
  document.getElementById('exercise-modal').classList.add('open');
  renderExercisePicker('');
}

function closeExercisePicker(event) {
  if (event.target === document.getElementById('exercise-modal')) {
    document.getElementById('exercise-modal').classList.remove('open');
  }
}

function closeExercisePickerDirect() {
  document.getElementById('exercise-modal').classList.remove('open');
}

function filterExercises(val) {
  pickerFilter = val;
  renderExercisePicker(val);
}

function renderExercisePicker(filter) {
  // Favorites
  const favEl = document.getElementById('fav-list');
  const favs = getSortedExercises(filter).filter(n => getExerciseMeta(n).isFav);
  if (favs.length) {
    favEl.innerHTML = favs.map(name => exItemHTML(name)).join('');
  } else {
    favEl.innerHTML = `<div style="font-size:12px;color:var(--text3);padding:6px 0;">
      Star exercises below to add favorites.</div>`;
  }

  // All
  const allEl = document.getElementById('ex-list');
  const all = getSortedExercises(filter);
  allEl.innerHTML = all.map(name => exItemHTML(name)).join('');
}

function exItemHTML(name) {
  const meta = getExerciseMeta(name);
  const isFav = meta.isFav;
  const hint = meta.count > 0
    ? `Used ${meta.count}×${meta.lastWeight ? ' · ' + meta.lastWeight + 'lb' : ''}`
    : '';
  return `
    <div class="ex-item">
      <div class="ex-item-name" onclick="pickExercise('${escapeName(name)}')">${name}</div>
      <div class="ex-item-count">${hint}</div>
      <button class="ex-item-star ${isFav ? 'is-fav' : ''}"
        onclick="toggleFavInPicker('${escapeName(name)}', this)">★</button>
    </div>
  `;
}

function pickExercise(name) {
  const meta = getExerciseMeta(name);
  addLiftCard(name, meta.lastWeight, meta.lastSetsReps);
  closeExercisePickerDirect();
  showToast(`${name} added`);
}

function toggleFavInPicker(name, btn) {
  toggleFavorite(name);
  const meta = getExerciseMeta(name);
  btn.classList.toggle('is-fav', meta.isFav);
  // Refresh both lists
  renderExercisePicker(pickerFilter);
}

function addCustomExercise() {
  const val = document.getElementById('ex-search').value.trim();
  if (!val) { showToast('Type a name first'); return; }
  pickExercise(val);
}

// ====== SAVE SESSION ======
function saveSession() {
  if (!currentThrows.length) { showToast('Add at least one throw'); return; }

  const lifts = getLifts();

  // Record exercise usage
  lifts.forEach(l => recordExerciseUse(l.exercise, l.weight, l.setsReps));

  const session = {
    id: Date.now(),
    date: document.getElementById('session-date').value,
    implement: document.getElementById('implement').value,
    sessionType: document.getElementById('session-type').value,
    sleepQuality: parseInt(document.getElementById('sleep-quality').value),
    cnsFatigue: parseInt(document.getElementById('cns-fatigue').value),
    arousalPre: parseInt(document.getElementById('arousal-pre').value),
    caffeine: parseInt(document.getElementById('caffeine').value) || 0,
    conditions: document.getElementById('conditions').value,
    throws: [...currentThrows],
    bestThrow: Math.max(...currentThrows.map(t => t.dist)),
    avgThrow: currentThrows.reduce((a, b) => a + b.dist, 0) / currentThrows.length,
    arousalInSession: getFeelVal('feel-arousal'),
    techniqueFeel: getFeelVal('feel-tech'),
    bodyFeel: getFeelVal('feel-body'),
    painLevel: parseInt(document.getElementById('pain-level').value),
    painLocation: document.getElementById('pain-location').value.trim(),
    notes: document.getElementById('session-notes').value.trim(),
    lifts,
  };

  sessions.unshift(session);
  localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));

  // Reset form
  currentThrows = [];
  addedLifts = [];
  liftIdCounter = 0;
  document.getElementById('throw-list').innerHTML = '';
  document.getElementById('lift-list').innerHTML = '';
  document.getElementById('session-notes').value = '';
  document.getElementById('pain-location').value = '';
  document.getElementById('caffeine').value = '';
  document.getElementById('pain-level').value = 0;
  document.getElementById('pain-val').textContent = '0';
  document.querySelectorAll('.feel-btn').forEach(b => b.classList.remove('selected'));

  renderHistory();
  renderQuickAdd();
  showToast('Session saved!');
}

// ====== HISTORY ======
function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if (!sessions.length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">📋</div>No sessions logged yet.</div>';
    return;
  }
  const feelLabels = ['', 'Poor', 'Off', 'Okay', 'Sharp', 'Locked'];
  const typeLabels = {
    competition: 'Competition', technical: 'Technical', volume: 'Volume',
    power: 'Power', speed: 'Speed', meet_sim: 'Meet Sim', recovery: 'Recovery'
  };

  container.innerHTML = sessions.map(s => {
    const chips = [];
    if (s.techniqueFeel) chips.push(
      `<span class="chip ${s.techniqueFeel >= 4 ? 'good' : s.techniqueFeel <= 2 ? 'bad' : ''}">${feelLabels[s.techniqueFeel]} tech</span>`
    );
    if (s.sleepQuality >= 8) chips.push('<span class="chip good">Good sleep</span>');
    if (s.sleepQuality <= 4) chips.push('<span class="chip warn">Poor sleep</span>');
    if (s.cnsFatigue >= 7) chips.push('<span class="chip bad">High fatigue</span>');
    if (s.caffeine >= 200) chips.push(`<span class="chip warn">${s.caffeine}mg caff</span>`);
    if (s.painLevel >= 4) chips.push(`<span class="chip bad">Pain ${s.painLevel}/10</span>`);

    const liftStr = s.lifts && s.lifts.length
      ? s.lifts.map(l => `${l.exercise}${l.weight ? ' ' + l.weight + 'lb' : ''}${l.setsReps ? ' ' + l.setsReps : ''}`).join(' · ')
      : '';

    return `
      <div class="history-item">
        <div class="history-header">
          <div>
            <div class="history-date">${formatDate(s.date)}</div>
            <div class="history-sub">
              ${typeLabels[s.sessionType] || s.sessionType} · ${s.throws.length} throws · ${s.implement.replace('_', ' ')}
            </div>
          </div>
          <div style="text-align:right;">
            <div class="history-best">${s.bestThrow.toFixed(2)}<span style="font-size:14px;color:var(--text3)">m</span></div>
            <div style="font-size:11px;color:var(--text3)">avg ${s.avgThrow.toFixed(2)}m</div>
          </div>
        </div>
        ${chips.length ? `<div>${chips.join('')}</div>` : ''}
        ${s.notes ? `<div style="margin-top:10px;font-size:12px;color:var(--text3);border-top:1px solid var(--border);padding-top:8px;">${s.notes.substring(0, 140)}${s.notes.length > 140 ? '…' : ''}</div>` : ''}
        ${liftStr ? `<div style="margin-top:8px;font-size:11px;color:var(--text3)">Lifts: ${liftStr}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ====== STATS ======
let chartInstance = null;

function renderStats() {
  if (!sessions.length) {
    ['stat-pr', 'stat-avg'].forEach(id => document.getElementById(id).textContent = '—');
    document.getElementById('stat-sessions').textContent = '0';
    document.getElementById('stat-throws').textContent = '0';
    document.getElementById('trend-analysis').textContent = 'Log sessions to see trend analysis.';
    return;
  }
  const allBests = sessions.map(s => s.bestThrow);
  const pr = Math.max(...allBests);
  const totalThrows = sessions.reduce((a, s) => a + s.throws.length, 0);
  const recentAvg = allBests.slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(allBests.length, 10);

  document.getElementById('stat-pr').textContent = pr.toFixed(2) + 'm';
  document.getElementById('stat-sessions').textContent = sessions.length;
  document.getElementById('stat-avg').textContent = recentAvg.toFixed(2) + 'm';
  document.getElementById('stat-throws').textContent = totalThrows;

  // Chart
  const recent = [...sessions].reverse().slice(-10);
  const labels = recent.map(s => formatDate(s.date).split(',')[0]);
  const bests = recent.map(s => s.bestThrow);
  const ctx = document.getElementById('progress-chart').getContext('2d');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: bests,
        borderColor: '#e8501a',
        backgroundColor: 'rgba(232,80,26,0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#e8501a',
        pointRadius: 4,
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#555', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#555', font: { size: 10 }, callback: v => v.toFixed(1) + 'm' }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });

  // Trend
  let trend = '';
  if (sessions.length >= 3) {
    const last3 = sessions.slice(0, 3).map(s => s.bestThrow);
    trend += last3[0] > last3[2]
      ? '↑ Last 3 sessions trending up. '
      : '↓ Last 3 sessions trending down — consider recovery. ';
    const avgSleep = sessions.slice(0, 5).reduce((a, s) => a + s.sleepQuality, 0) / Math.min(5, sessions.length);
    if (avgSleep < 6) trend += 'Sleep averaging below 6/10. ';
    const avgFatigue = sessions.slice(0, 5).reduce((a, s) => a + s.cnsFatigue, 0) / Math.min(5, sessions.length);
    if (avgFatigue > 6) trend += 'CNS fatigue consistently elevated. ';
  }
  document.getElementById('trend-analysis').textContent = trend || 'Add more sessions for trend analysis.';
}

// ====== HELPERS ======
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escapeName(n) { return n.replace(/'/g, "\\'"); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
