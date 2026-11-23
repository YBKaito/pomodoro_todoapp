const $ = id => document.getElementById(id);
const { durations, remaining, nextMode, validTask } = FocusCore;
const day = () => new Date().toLocaleDateString('en-CA');
const defaultReminderDays = timestamp => Number.isFinite(timestamp) && timestamp > 0 ? [new Date(timestamp).getDay()] : [];
const isOldWeekdayDefault = days => Array.isArray(days) && days.length === 5 && [1, 2, 3, 4, 5].every(value => days.includes(value));
let state = { tasks: [], active: null, sessions: 0, date: day(), durations: { ...durations }, view: 'list', viewCustomized: false, reminderAt: null, reminderCount: 1, reminderSent: 0, reminderDays: [], reminderDaysCustom: false, timer: { mode: 'focus', remaining: 1500, running: false, endsAt: null } };
function normalizeTask(task) {
 if (!task || typeof task !== 'object') return task;
 const normalized = task.status === 'doing' ? { ...task, status: 'todo' } : { ...task };
 if (normalized.status === 'done') { delete normalized.dueAt; delete normalized.reminderFired; delete normalized.reminderCount; delete normalized.reminderSent; delete normalized.reminderDays; delete normalized.reminderDaysCustom; }
 return normalized;
}
try {
 const data = JSON.parse(localStorage.getItem('focus-dock-v1'));
 if (data) {
  state.tasks = Array.isArray(data.tasks) ? data.tasks.map(normalizeTask).filter(validTask) : [];
  state.active = typeof data.active === 'string' ? data.active : null;
  state.sessions = Number.isInteger(data.sessions) && data.sessions >= 0 ? data.sessions : 0;
  state.date = typeof data.date === 'string' ? data.date : day();
  state.viewCustomized = data.viewCustomized === true; state.view = state.viewCustomized && data.view === 'board' ? 'board' : 'list';
  state.reminderAt = Number.isFinite(data.reminderAt) && data.reminderAt > 0 ? data.reminderAt : null;
  state.reminderCount = Number.isInteger(data.reminderCount) && data.reminderCount >= 1 && data.reminderCount <= 30 ? data.reminderCount : 1;
  state.reminderSent = Number.isInteger(data.reminderSent) && data.reminderSent >= 0 && data.reminderSent < state.reminderCount ? data.reminderSent : 0;
  state.reminderDays = Array.isArray(data.reminderDays) ? [...new Set(data.reminderDays.filter(d => Number.isInteger(d) && d >= 0 && d <= 6))] : defaultReminderDays(state.reminderAt);
  state.reminderDaysCustom = data.reminderDaysCustom === true;
  if (!state.reminderDaysCustom && isOldWeekdayDefault(state.reminderDays)) state.reminderDays = defaultReminderDays(state.reminderAt);
  for (const key of Object.keys(durations)) if (Number.isInteger(data.durations?.[key]) && data.durations[key] >= 1 && data.durations[key] <= 180) state.durations[key] = data.durations[key];
  const t = data.timer;
  if (t && Object.hasOwn(durations, t.mode) && Number.isFinite(t.remaining) && t.remaining >= 0 && t.remaining <= 10800 && typeof t.running === 'boolean' && (!t.running || Number.isFinite(t.endsAt))) state.timer = t;
 }
} catch { $('storage-error').hidden = false; }
function save() { try { localStorage.setItem('focus-dock-v1', JSON.stringify(state)); $('storage-error').hidden = true; } catch { $('storage-error').hidden = false; } }
function changeDay() { if (state.date !== day()) { state.date = day(); state.sessions = 0; save(); } }
function button(text, label, action) { const b = document.createElement('button'); b.textContent = text; b.title = label; b.setAttribute('aria-label', label); b.onclick = action; return b; }
const statuses = [['todo', 'To do'], ['done', 'Done']];
function changeTaskStatus(task, status) {
 task.status = status;
 if (status === 'done') { delete task.dueAt; delete task.reminderFired; delete task.reminderCount; delete task.reminderSent; delete task.reminderDays; }
 else if (!task.dueAt) { const dueAt = TaskImport.parseDueAt(task.title); if (dueAt) task.dueAt = dueAt; }
}
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
  col.ondrop = e => { e.preventDefault(); const task = state.tasks.find(t => t.id === e.dataTransfer.getData('text/plain')); if (task) { changeTaskStatus(task, status); save(); render(); } col.classList.remove('drag-over'); };
  if (!tasks.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = status === 'todo' ? 'A clear space. Add your first task above.' : 'Drop a task here, or use its status menu.'; col.append(p); }
  for (const task of tasks) {
   const card = document.createElement('article'); card.className = 'task' + (task.id === state.active ? ' selected' : ''); card.draggable = true; card.ondragstart = e => e.dataTransfer.setData('text/plain', task.id);
   const title = document.createElement('div'); title.className = 'task-title'; title.textContent = task.title;
   const actions = document.createElement('div'); actions.className = 'task-actions';
   const due = task.dueAt && status !== 'done' ? document.createElement('div') : null;
   if (due) { due.className = 'task-due'; due.textContent = `Due: ${TaskImport.formatDateTime(task.dueAt)}`; }
   const focus = button('◎', `Focus on ${task.title}`, () => { state.active = state.active === task.id ? null : task.id; save(); render(); }); focus.className = state.active === task.id ? 'focused' : '';
   const reminder = button('◷', `Edit reminder for ${task.title}`, () => openTaskReminder(task, reminder)); reminder.dataset.reminderTask = task.id;
   const select = document.createElement('select'); select.setAttribute('aria-label', `Status of ${task.title}`); for (const [value, text] of statuses) select.add(new Option(text, value)); select.value = status; select.onchange = () => { changeTaskStatus(task, select.value); save(); render(); };
   const done = button('\u2713', `Mark ${task.title} as done`, () => { changeTaskStatus(task, 'done'); save(); render(); });
   const remove = button('×', `Delete ${task.title}`, () => { if (!confirm(`Delete “${task.title}”?`)) return; state.tasks = state.tasks.filter(t => t.id !== task.id); if (state.active === task.id) state.active = null; save(); render(); });
   actions.append(focus, reminder, select, done, remove); card.append(title); if (due) card.append(due); card.append(actions); col.append(card);
  }
  board.append(col);
 }
 renderTimer();
}
function renderTimer() {
 const seconds = remaining(state.timer);
 $('time').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
 document.title = `${$('time').textContent} · ToDoY`;
 $('start').textContent = state.timer.running ? 'Ⅱ Pause' : seconds < state.durations[state.timer.mode] * 60 ? '▶ Resume' : '▶ Start session';
 $('timer-label').textContent = state.timer.mode === 'focus' ? 'TIME TO FOCUS' : 'TIME TO RECHARGE';
 $('timer-hint').textContent = state.timer.mode === 'focus' ? "You've got this." : 'Step away. Breathe. Reset.';
 document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === state.timer.mode));
}
function setTimer(mode) { state.timer = { mode, remaining: state.durations[mode] * 60, running: false, endsAt: null }; save(); renderTimer(); }
function chime() { try { const audio = new AudioContext(); const oscillator = audio.createOscillator(); const gain = audio.createGain(); oscillator.frequency.value = 660; gain.gain.setValueAtTime(.15, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .7); oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .7); oscillator.onended = () => audio.close(); } catch {} }
$('task-form').onsubmit = e => { e.preventDefault(); const title = $('task-input').value.trim(); if (!title) return; const task = { id: crypto.randomUUID(), title, status: 'todo' }; const dueAt = TaskImport.parseDueAt(title); if (dueAt) task.dueAt = dueAt; state.tasks.push(task); $('task-input').value = ''; save(); render(); };
for (const view of ['board', 'list']) $(view + '-view').onclick = () => { state.view = view; state.viewCustomized = true; save(); render(); };
function localDateTimeValue(timestamp) { const date = new Date(timestamp); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }
function renderReminderSummary() { $('reminderSummary').textContent = state.reminderAt ? `Check-in at ${TaskImport.formatDateTime(state.reminderAt)}${state.reminderCount > 1 ? ` · ${state.reminderSent}/${state.reminderCount} sent` : ''}` : 'No check-in set'; }
let reminderTargetId = null, reminderOrigin = null;
let reminderDaysTouched = false, previousReminderDayCount = 0;
function prepareReminderForm(at, count, days, custom = false) { reminderDaysTouched = custom; $('reminderFeedback').textContent = ''; $('reminderWhen').min = localDateTimeValue(Date.now() + 60000); $('reminderWhen').value = Number.isFinite(at) && at > 0 ? localDateTimeValue(at) : ''; $('reminderCount').value = count; document.querySelectorAll('[name="reminderDay"]').forEach(box => { box.checked = days.includes(Number(box.value)); }); previousReminderDayCount = document.querySelectorAll('[name="reminderDay"]:checked').length; }
function openReminder(event) { reminderTargetId = null; reminderOrigin = event?.currentTarget || $('reminderButton'); $('reminderEyebrow').textContent = 'CHECK-IN REMINDER'; $('reminderTitle').textContent = 'Check-in reminder'; $('removeReminder').textContent = 'Clear reminder'; $('reminderDescription').textContent = 'Choose when and how often ToDoY should remind you to review your To do list.'; prepareReminderForm(state.reminderAt, state.reminderCount, state.reminderAt ? state.reminderDays : [], state.reminderAt ? state.reminderDaysCustom : false); $('reminderDialog').hidden = false; $('reminderWhen').focus(); }
function openTaskReminder(task, opener) { reminderTargetId = task.id; reminderOrigin = opener; const firstAt = task.dueAt || TaskImport.parseDueAt(task.title); $('reminderEyebrow').textContent = 'TASK REMINDER'; $('reminderTitle').textContent = 'Task reminder'; $('removeReminder').textContent = 'Clear task reminder'; $('reminderDescription').textContent = task.title; prepareReminderForm(firstAt, task.reminderCount || 1, firstAt ? (isOldWeekdayDefault(task.reminderDays) && task.reminderDaysCustom !== true ? defaultReminderDays(firstAt) : task.reminderDays || defaultReminderDays(firstAt)) : [], !!firstAt && task.reminderDaysCustom === true); $('reminderDialog').hidden = false; $('reminderWhen').focus(); }
function closeReminder() { const taskId = reminderTargetId; $('reminderDialog').hidden = true; if (reminderOrigin?.isConnected) reminderOrigin.focus(); else if (taskId) document.querySelector(`[data-reminder-task="${CSS.escape(taskId)}"]`)?.focus(); else $('reminderButton').focus(); reminderTargetId = null; reminderOrigin = null; }
$('reminderWhen').onchange = () => { if (reminderDaysTouched) return; const value = $('reminderWhen').value; const weekday = value ? new Date(value).getDay() : null; document.querySelectorAll('[name="reminderDay"]').forEach(box => { box.checked = weekday !== null && Number(box.value) === weekday; }); previousReminderDayCount = document.querySelectorAll('[name="reminderDay"]:checked').length; };
document.querySelectorAll('[name="reminderDay"]').forEach(box => box.onchange = () => { reminderDaysTouched = true; const selectedDays = document.querySelectorAll('[name="reminderDay"]:checked').length; const change = Math.max(1, selectedDays) - Math.max(1, previousReminderDayCount); if (change) $('reminderCount').value = Math.min(30, Math.max(1, Number($('reminderCount').value) + change)); previousReminderDayCount = selectedDays; });
$('reminderButton').onclick = openReminder; $('cancelReminder').onclick = $('closeReminder').onclick = closeReminder;
$('reminderDialog').onclick = e => { if (e.target === $('reminderDialog')) closeReminder(); };
function nextCheckIn(previousAt, days) { const next = new Date(previousAt); for (let i = 0; i < 7; i++) { next.setDate(next.getDate() + 1); if (days.includes(next.getDay()) && next.getTime() > Date.now()) return next.getTime(); } return null; }
$('saveReminder').onclick = () => { const at = new Date($('reminderWhen').value).getTime(), count = Number($('reminderCount').value), days = [...document.querySelectorAll('[name="reminderDay"]:checked')].map(box => Number(box.value)); if (!Number.isFinite(at) || at <= Date.now()) { $('reminderFeedback').textContent = 'Choose a future date and time.'; return; } if (!Number.isInteger(count) || count < 1 || count > 30) { $('reminderFeedback').textContent = 'Choose between 1 and 30 reminders.'; return; } if (count > 1 && !days.length) { $('reminderFeedback').textContent = 'Choose at least one day for repeating reminders.'; return; } if (reminderTargetId) { const task = state.tasks.find(item => item.id === reminderTargetId); if (!task || task.status === 'done') { closeReminder(); return; } task.dueAt = at; task.reminderCount = count; task.reminderSent = 0; task.reminderDays = days; task.reminderDaysCustom = reminderDaysTouched; delete task.reminderFired; save(); render(); } else { state.reminderAt = at; state.reminderCount = count; state.reminderSent = 0; state.reminderDays = days; state.reminderDaysCustom = reminderDaysTouched; save(); renderReminderSummary(); } closeReminder(); };
$('removeReminder').onclick = () => { if (reminderTargetId) { const task = state.tasks.find(item => item.id === reminderTargetId); if (task) { delete task.dueAt; delete task.reminderFired; delete task.reminderCount; delete task.reminderSent; delete task.reminderDays; delete task.reminderDaysCustom; save(); render(); } } else { state.reminderAt = null; state.reminderCount = 1; state.reminderSent = 0; state.reminderDays = []; state.reminderDaysCustom = false; save(); renderReminderSummary(); } closeReminder(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('reminderDialog').hidden) closeReminder(); });
function notifyReminder(title, body, taskId = null) { $('announcement').textContent = `${title}: ${body}`; if (window.desktop?.notify) window.desktop.notify(title, body, taskId).catch(() => {}); else if (window.Notification?.permission === 'granted') new Notification(title, { body }); }
window.desktop?.onNotificationClick(taskId => { if (taskId && state.tasks.some(task => task.id === taskId && task.status !== 'done')) { state.active = taskId; save(); render(); } });
let lastReminderCheck = 0;
function checkReminders() {
 const now = Date.now(); if (now - lastReminderCheck < 1000) return; lastReminderCheck = now; let changed = false;
 if (state.reminderAt && state.reminderAt <= now) { const firedAt = state.reminderAt; state.reminderSent++; changed = true; notifyReminder('Time to check your To do list', 'Take a moment to review your tasks.'); if (state.reminderSent >= state.reminderCount) state.reminderAt = null; else state.reminderAt = nextCheckIn(firedAt, state.reminderDays); }
 for (const task of state.tasks) if (task.status !== 'done' && Number.isFinite(task.dueAt) && task.dueAt <= now && !task.reminderFired) { task.reminderSent = (task.reminderSent || 0) + 1; changed = true; notifyReminder('Task reminder', task.title, task.id); if (task.reminderSent >= (task.reminderCount || 1)) task.reminderFired = true; else { const next = nextCheckIn(task.dueAt, task.reminderDays || []); if (next) task.dueAt = next; else task.reminderFired = true; } }
 if (changed) { save(); renderReminderSummary(); }
}

$('start').onclick = () => { const t = state.timer; if (t.running) { t.remaining = remaining(t); t.running = false; t.endsAt = null; } else { if (t.remaining <= 0) t.remaining = state.durations[t.mode] * 60; t.endsAt = Date.now() + t.remaining * 1000; t.running = true; } $('announcement').textContent = ''; save(); renderTimer(); };
$('reset').onclick = () => { setTimer(state.timer.mode); $('announcement').textContent = ''; };
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { if (state.timer.running && !confirm('Switch modes and reset the current session?')) return; setTimer(b.dataset.mode); $('announcement').textContent = ''; });
for (const mode of Object.keys(durations)) { const input = $('duration-' + mode); input.value = state.durations[mode]; input.onchange = () => { const value = Number(input.value); if (!Number.isInteger(value) || value < 1 || value > 180) { input.value = state.durations[mode]; return; } state.durations[mode] = value; if (!state.timer.running && state.timer.mode === mode) setTimer(mode); save(); }; }
async function windowMode(mode) { if (!window.desktop) { $('announcement').textContent = 'Window controls are available in the desktop app.'; return; } try { const result = await window.desktop.setMode(mode); document.body.classList.toggle('compact', result.compact); $('expand').hidden = !result.compact; $('dock').value = result.dock; } catch { $('announcement').textContent = 'Could not change window mode.'; } }
$('compact').onclick = () => windowMode('compact'); $('expand').onclick = () => windowMode('full'); $('dock').onchange = e => windowMode(e.target.value);
$('export').onclick = () => { const blob = new Blob([JSON.stringify({ version: 1, tasks: state.tasks }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `todoy-tasks-${day()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
function closeImport() { $('importDialog').hidden = true; $('importButton').focus(); }
function openImport() { $('importFeedback').textContent = ''; $('importDialog').hidden = false; $('importText').focus(); }
$('importButton').onclick = openImport;
$('closeImport').onclick = $('cancelImport').onclick = closeImport;
$('importDialog').onclick = e => { if (e.target === $('importDialog')) closeImport(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('importDialog').hidden) closeImport(); });
$('confirmImport').onclick = () => {
 const result = TaskImport.parse($('importText').value);
 if (!result.tasks.length) { $('importFeedback').textContent = result.skipped ? 'No valid task lines found. Keep each task to 180 characters.' : 'Paste one task per line to import.'; return; }
 state.tasks.push(...result.tasks.map(task => ({ id: crypto.randomUUID(), ...task })));
 save(); render();
 const todo = result.tasks.filter(task => task.status === 'todo').length, done = result.tasks.length - todo;
 $('importStatus').textContent = `Imported ${result.tasks.length}: ${todo} to do, ${done} done${result.skipped ? `; skipped ${result.skipped} line(s)` : ''}.`;
 $('importText').value = ''; closeImport();
};
setInterval(() => { checkReminders(); if (state.date !== day()) render(); if (state.timer.running && remaining(state.timer) === 0) { changeDay(); const focus = state.timer.mode === 'focus'; if (focus) state.sessions++; setTimer(nextMode(state.timer.mode, state.sessions)); chime(); render(); $('announcement').textContent = focus ? 'Session complete. Your break is ready.' : 'Break complete. Ready for your next focus?'; } renderTimer(); }, 250);
render();
checkReminders();
