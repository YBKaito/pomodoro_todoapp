const $ = id => document.getElementById(id);
const { durations, remaining, nextMode, validTask } = FocusCore;
const day = () => new Date().toLocaleDateString('en-CA');
let state = { tasks: [], active: null, sessions: 0, date: day(), durations: { ...durations }, view: 'board', timer: { mode: 'focus', remaining: 1500, running: false, endsAt: null } };
try {
 const data = JSON.parse(localStorage.getItem('focus-dock-v1'));
 if (data) {
  state.tasks = Array.isArray(data.tasks) ? data.tasks.filter(validTask) : [];
  state.active = typeof data.active === 'string' ? data.active : null;
  state.sessions = Number.isInteger(data.sessions) && data.sessions >= 0 ? data.sessions : 0;
  state.date = typeof data.date === 'string' ? data.date : day();
  state.view = data.view === 'list' ? 'list' : 'board';
  for (const key of Object.keys(durations)) if (Number.isInteger(data.durations?.[key]) && data.durations[key] >= 1 && data.durations[key] <= 180) state.durations[key] = data.durations[key];
  const t = data.timer;
  if (t && Object.hasOwn(durations, t.mode) && Number.isFinite(t.remaining) && t.remaining >= 0 && t.remaining <= 10800 && typeof t.running === 'boolean' && (!t.running || Number.isFinite(t.endsAt))) state.timer = t;
 }
} catch { $('storage-error').hidden = false; }
function save() { try { localStorage.setItem('focus-dock-v1', JSON.stringify(state)); $('storage-error').hidden = true; } catch { $('storage-error').hidden = false; } }
function changeDay() { if (state.date !== day()) { state.date = day(); state.sessions = 0; save(); } }
function button(text, label, action) { const b = document.createElement('button'); b.textContent = text; b.title = label; b.setAttribute('aria-label', label); b.onclick = action; return b; }
const statuses = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];
function render() {
 changeDay();
 $('today').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
 $('open-count').textContent = state.tasks.filter(t => t.status !== 'done').length;
 $('done-count').textContent = state.tasks.filter(t => t.status === 'done').length;
 $('sessions-count').textContent = state.sessions; $('rhythm-count').textContent = `${state.sessions} sessions`;
 $('session-dots').replaceChildren(...Array.from({ length: 4 }, (_, i) => { const dot = document.createElement('span'); dot.className = 'session-dot' + (i < (state.sessions % 4 || (state.sessions ? 4 : 0)) ? ' filled' : ''); return dot; }));
 $('active-task').textContent = state.tasks.find(t => t.id === state.active)?.title || 'Choose a task to give it your full attention.';
 const board = $('board'); board.replaceChildren(); board.className = 'board' + (state.view === 'list' ? ' list' : '');
 for (const view of ['board', 'list']) $(view + '-view').classList.toggle('active', state.view === view);
 for (const [status, label] of statuses) {
  const col = document.createElement('section'); col.className = `column ${status}`;
  const heading = document.createElement('div'); heading.className = 'column-head';
  const dot = document.createElement('span'); dot.className = 'status-dot';
  const count = document.createElement('span'); count.className = 'count';
  const tasks = state.tasks.filter(t => t.status === status); count.textContent = tasks.length;
  heading.append(dot, document.createTextNode(label), count); col.append(heading);
  col.ondragover = e => { e.preventDefault(); col.classList.add('drag-over'); };
  col.ondragleave = () => col.classList.remove('drag-over');
  col.ondrop = e => { e.preventDefault(); const task = state.tasks.find(t => t.id === e.dataTransfer.getData('text/plain')); if (task) { task.status = status; save(); render(); } col.classList.remove('drag-over'); };
  if (!tasks.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = status === 'todo' ? 'A clear space. Add your first task above.' : 'Drop a task here, or use its status menu.'; col.append(p); }
  for (const task of tasks) {
   const card = document.createElement('article'); card.className = 'task' + (task.id === state.active ? ' selected' : ''); card.draggable = true; card.ondragstart = e => e.dataTransfer.setData('text/plain', task.id);
   const title = document.createElement('div'); title.className = 'task-title'; title.textContent = task.title;
   const actions = document.createElement('div'); actions.className = 'task-actions';
   const focus = button('◎', `Focus on ${task.title}`, () => { state.active = state.active === task.id ? null : task.id; save(); render(); }); focus.className = state.active === task.id ? 'focused' : '';
   const select = document.createElement('select'); select.setAttribute('aria-label', `Status of ${task.title}`); for (const [value, text] of statuses) select.add(new Option(text, value)); select.value = status; select.onchange = () => { task.status = select.value; save(); render(); };
   const edit = button('✎', `Edit ${task.title}`, () => {
    const input = document.createElement('input'); input.value = task.title; input.maxLength = 180; input.setAttribute('aria-label', 'Edit task title'); title.replaceWith(input); input.focus(); let finished = false;
    const finish = cancel => { if (finished) return; finished = true; if (!cancel && input.value.trim()) task.title = input.value.trim(); save(); render(); };
    input.onblur = () => finish(false); input.onkeydown = e => { if (e.key === 'Enter') finish(false); if (e.key === 'Escape') finish(true); };
   });
   const remove = button('×', `Delete ${task.title}`, () => { if (!confirm(`Delete “${task.title}”?`)) return; state.tasks = state.tasks.filter(t => t.id !== task.id); if (state.active === task.id) state.active = null; save(); render(); });
   actions.append(focus, select, edit, remove); card.append(title, actions); col.append(card);
  }
  board.append(col);
 }
 renderTimer();
}
function renderTimer() {
 const seconds = remaining(state.timer);
 $('time').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
 document.title = `${$('time').textContent} · Focus Dock`;
 $('start').textContent = state.timer.running ? 'Ⅱ Pause' : seconds < state.durations[state.timer.mode] * 60 ? '▶ Resume' : '▶ Start session';
 $('timer-label').textContent = state.timer.mode === 'focus' ? 'TIME TO FOCUS' : 'TIME TO RECHARGE';
 $('timer-hint').textContent = state.timer.mode === 'focus' ? "You've got this." : 'Step away. Breathe. Reset.';
 document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === state.timer.mode));
}
function setTimer(mode) { state.timer = { mode, remaining: state.durations[mode] * 60, running: false, endsAt: null }; save(); renderTimer(); }
function chime() { try { const audio = new AudioContext(); const oscillator = audio.createOscillator(); const gain = audio.createGain(); oscillator.frequency.value = 660; gain.gain.setValueAtTime(.15, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .7); oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .7); oscillator.onended = () => audio.close(); } catch {} }
$('task-form').onsubmit = e => { e.preventDefault(); const title = $('task-input').value.trim(); if (!title) return; state.tasks.push({ id: crypto.randomUUID(), title, status: 'todo' }); $('task-input').value = ''; save(); render(); };
for (const view of ['board', 'list']) $(view + '-view').onclick = () => { state.view = view; save(); render(); };
$('start').onclick = () => { const t = state.timer; if (t.running) { t.remaining = remaining(t); t.running = false; t.endsAt = null; } else { if (t.remaining <= 0) t.remaining = state.durations[t.mode] * 60; t.endsAt = Date.now() + t.remaining * 1000; t.running = true; } $('announcement').textContent = ''; save(); renderTimer(); };
$('reset').onclick = () => { setTimer(state.timer.mode); $('announcement').textContent = ''; };
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { if (state.timer.running && !confirm('Switch modes and reset the current session?')) return; setTimer(b.dataset.mode); $('announcement').textContent = ''; });
for (const mode of Object.keys(durations)) { const input = $('duration-' + mode); input.value = state.durations[mode]; input.onchange = () => { const value = Number(input.value); if (!Number.isInteger(value) || value < 1 || value > 180) { input.value = state.durations[mode]; return; } state.durations[mode] = value; if (!state.timer.running && state.timer.mode === mode) setTimer(mode); save(); }; }
async function windowMode(mode) { if (!window.desktop) { $('announcement').textContent = 'Window controls are available in the desktop app.'; return; } try { const result = await window.desktop.setMode(mode); document.body.classList.toggle('compact', result.compact); $('expand').hidden = !result.compact; $('dock').value = result.dock; } catch { $('announcement').textContent = 'Could not change window mode.'; } }
$('compact').onclick = () => windowMode('compact'); $('expand').onclick = () => windowMode('full'); $('dock').onchange = e => windowMode(e.target.value);
$('export').onclick = () => { const blob = new Blob([JSON.stringify({ version: 1, tasks: state.tasks }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `focus-dock-tasks-${day()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
$('import').onchange = async e => { const file = e.target.files[0]; if (!file) return; try { if (file.size > 2_000_000) throw new Error('Choose a file smaller than 2 MB.'); const data = JSON.parse(await file.text()); if (!Array.isArray(data.tasks) || data.tasks.length > 5000 || !data.tasks.every(t => validTask(t) && t.title.length <= 180)) throw new Error('Not a valid Focus Dock task file.'); state.tasks.push(...data.tasks.map(t => ({ id: crypto.randomUUID(), title: t.title.trim(), status: t.status }))); save(); render(); $('announcement').textContent = `Imported ${data.tasks.length} tasks.`; } catch (error) { alert(error.message); } e.target.value = ''; };
setInterval(() => { if (state.date !== day()) render(); if (state.timer.running && remaining(state.timer) === 0) { changeDay(); const focus = state.timer.mode === 'focus'; if (focus) state.sessions++; setTimer(nextMode(state.timer.mode, state.sessions)); chime(); render(); $('announcement').textContent = focus ? 'Session complete. Your break is ready.' : 'Break complete. Ready for your next focus?'; } renderTimer(); }, 250);
render();
