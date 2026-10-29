/* Shared by the desktop renderer and the single-file browser preview. */
(() => {
  const fromApp = typeof state !== 'undefined';
  const readTasks = () => fromApp ? state.tasks : tasks;
  const readTimer = () => fromApp ? state.timer : timer;
  const readMinutes = () => fromApp ? state.durations : minutes;
  const seconds = () => fromApp ? remaining(state.timer) : secondsLeft();
  const writeTasks = value => { if (fromApp) state.tasks = value; else tasks = value; };
  const startButton = () => document.getElementById(fromApp ? 'start' : 'toggleTimer');
  const isLocked = () => {
    const t = readTimer();
    const left = fromApp ? t.remaining : t.seconds;
    if (t.mode === 'focus' && t.running && !t.focusEngaged) { t.focusEngaged = true; save(); }
    return t.mode === 'focus' && (t.focusEngaged === true || t.running || left < readMinutes().focus * 60);
  };
  let visible = false, notes = true, lastDesktopLock;
  const widget = document.createElement('section');
  widget.id = 'mini-widget'; widget.hidden = true;
  widget.setAttribute('aria-label', 'Mini focus companion');
  widget.innerHTML = `<div class="mini-top"><strong>◷ Focus Dock</strong><div><button id="mini-main">Main app</button><button id="mini-close" aria-label="Close mini view">×</button></div></div>
    <div class="mini-modes"><button data-mini-mode="focus">Pomodoro</button><button data-mini-mode="short">Short break</button><button data-mini-mode="long">Long break</button></div>
    <div class="mini-clock" id="mini-clock" role="timer">25:00</div>
    <div class="mini-controls"><button id="mini-start">Start</button><button id="mini-notes" aria-expanded="true">Hide note</button></div>
    <p id="mini-lock" role="status"></p>
    <section id="mini-note"><div class="mini-note-heading">MY STICKY NOTE <span id="mini-count"></span></div><form id="mini-form"><input id="mini-input" aria-label="New sticky-note task" placeholder="Add a quick task…" maxlength="180" required><button aria-label="Add sticky-note task">+</button></form><div id="mini-tasks"></div></section>`;
  document.body.append(widget);
  const m = id => document.getElementById(id);
  function drawTasks() {
    const list = m('mini-tasks'); list.replaceChildren();
    m('mini-count').textContent = readTasks().filter(t => t.status !== 'done').length + ' left';
    for (const task of readTasks()) {
      const row = document.createElement('div'); row.className = 'mini-task';
      const label = document.createElement('label');
      const box = document.createElement('input'); box.type = 'checkbox'; box.checked = task.status === 'done';
      const title = document.createElement('span'); title.textContent = task.title;
      label.append(box, title);
      box.onchange = () => { task.status = box.checked ? 'done' : 'todo'; save(); render(); drawTasks(); };
      const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', 'Delete ' + task.title);
      remove.onclick = () => { writeTasks(readTasks().filter(t => t.id !== task.id)); save(); render(); drawTasks(); };
      row.append(label, remove); list.append(row);
    }
    if (!readTasks().length) { const empty = document.createElement('p'); empty.className = 'mini-empty'; empty.textContent = 'A small space for your next step.'; list.append(empty); }
  }
  async function resize() {
    if (window.desktop) await window.desktop.setMode(notes ? 'note' : 'compact');
  }
  async function openMini() {
    notes = true;
    if (window.desktop) await window.desktop.setMode('note');
    visible = true;
    document.body.classList.remove('compact');
    document.body.classList.add('mini-open'); document.body.classList.toggle('desktop-mini', !!window.desktop); widget.hidden = false;
    m('mini-note').hidden = false; m('mini-notes').textContent = 'Hide note'; m('mini-notes').setAttribute('aria-expanded', 'true');
    drawTasks(); update();
  }
  async function returnMain() {
    if (window.desktop) await window.desktop.setMode('full');
    visible = false; document.body.classList.remove('mini-open', 'compact', 'desktop-mini'); widget.hidden = true; render();
  }
  m('mini-main').onclick = returnMain;
  m('mini-close').onclick = () => { if (!isLocked()) returnMain(); };
  m('mini-notes').onclick = () => {
    notes = !notes; m('mini-note').hidden = !notes;
    m('mini-notes').textContent = notes ? 'Hide note' : 'Show note'; m('mini-notes').setAttribute('aria-expanded', String(notes));
    resize().catch(() => { m('mini-lock').textContent = 'Could not resize window.'; });
  };
  m('mini-form').onsubmit = e => {
    e.preventDefault(); const title = m('mini-input').value.trim(); if (!title) return;
    readTasks().push({ id: globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2), title, status: 'todo' });
    m('mini-input').value = ''; save(); render(); drawTasks();
  };
  m('mini-start').onclick = () => { startButton().click(); update(); };
  document.querySelectorAll('[data-mini-mode]').forEach(b => b.onclick = () => {
    if (isLocked()) return;
    const target = document.querySelector('[data-mode="' + b.dataset.miniMode + '"]');
    target.click(); update();
  });
  document.getElementById('compact').onclick = () => openMini().catch(() => { alert('Could not open mini view.'); });
  document.getElementById('compact').textContent = 'Mini sticky note ↗';
  function update() {
    const locked = isLocked();
    if (window.desktop?.setFocusLock && lastDesktopLock !== locked) {
      lastDesktopLock = locked;
      window.desktop.setFocusLock(locked).catch(() => { lastDesktopLock = undefined; });
    }
    if (!visible) return;
    const t = readTimer(), n = seconds();
    m('mini-clock').textContent = String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
    m('mini-start').textContent = t.running ? 'Ⅱ Pause' : locked ? '▶ Resume' : '▶ Start';
    m('mini-close').disabled = locked;
    m('mini-close').title = locked ? 'Return to Main app and reset the timer to stop focus.' : 'Dismiss mini view';
    m('mini-lock').textContent = locked ? 'Focus pinned · finish the session, or stop it in Main app.' : 'Your note, at your pace. Close it whenever you like.';
    document.querySelectorAll('[data-mini-mode]').forEach(b => { b.disabled = locked && b.dataset.miniMode !== t.mode; b.classList.toggle('active', b.dataset.miniMode === t.mode); });
  }
  // The original reset control is the explicit way to stop an active focus.
  const resetButton = document.getElementById(fromApp ? 'reset' : 'resetTimer');
  resetButton.textContent = 'Stop / reset'; resetButton.setAttribute('aria-label', 'Stop and reset timer');
  resetButton.addEventListener('click', update);
  setInterval(update, 250); update();
})();
