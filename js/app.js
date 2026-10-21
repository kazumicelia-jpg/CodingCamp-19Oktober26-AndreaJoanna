/* ═══════════════════════════════════════════════════════════
   app.js — Personal Dashboard
   Sections: Dark Mode · Greeting · Focus Timer · To-Do List · Quick Links
═══════════════════════════════════════════════════════════ */

/* ── Utility: Local Storage helpers ─────────────────────── */
function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadLS(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw !== null ? JSON.parse(raw) : fallback;
}

/* ══════════════════════════════════════════════════════════
   0. DARK MODE TOGGLE
══════════════════════════════════════════════════════════ */
const btnTheme = document.getElementById('btn-theme');

// Apply saved preference on load
if (loadLS('darkMode', false)) {
  document.body.classList.add('dark');
  btnTheme.textContent = '☀️ Light Mode';
}

btnTheme.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  btnTheme.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
  saveLS('darkMode', isDark);
});

/* ══════════════════════════════════════════════════════════
   1. GREETING — time, date, and time-of-day message
══════════════════════════════════════════════════════════ */
const greetingMsg = document.getElementById('greeting-msg');
const datetimeEl  = document.getElementById('datetime');

function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return '☀️ Good morning!';
  if (hour >= 12 && hour < 17) return '🌤 Good afternoon!';
  if (hour >= 17 && hour < 21) return '🌇 Good evening!';
  return '🌙 Good night!';
}

function updateClock() {
  const now  = new Date();
  const hour = now.getHours();

  greetingMsg.textContent = getGreeting(hour);

  // Format: Monday, 19 October 2026 — 09:45:32
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-GB');
  datetimeEl.textContent = `${dateStr} — ${timeStr}`;
}

updateClock();
setInterval(updateClock, 1000);

/* ══════════════════════════════════════════════════════════
   2. FOCUS TIMER — customizable countdown
══════════════════════════════════════════════════════════ */
const PRESETS = [5, 10, 15, 25, 45, 60]; // available preset durations (minutes)

const timerDisplay     = document.getElementById('timer-display');
const btnStart         = document.getElementById('btn-start');
const btnStop          = document.getElementById('btn-stop');
const btnReset         = document.getElementById('btn-reset');
const durationInput    = document.getElementById('duration-input');
const btnApplyDuration = document.getElementById('btn-apply-duration');

let timerInterval = null;
let timerRunning  = false;
let focusMinutes  = 25;       // current duration in minutes
let focusSeconds  = 25 * 60; // current duration in seconds
let secondsLeft   = focusSeconds;

// ── Duration helpers ──────────────────────────────────────

function validateDuration(value) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= 1 && n <= 120;
}

function syncDurationUI(activeMinutes) {
  // Highlight matching preset button, clear others
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.minutes, 10) === activeMinutes);
  });
  durationInput.value = activeMinutes;
}

function setDuration(minutes) {
  focusMinutes = minutes;
  focusSeconds = minutes * 60;
  secondsLeft  = focusSeconds;
  saveLS('timerDuration', minutes);
  stopTimer();                  // reset running state
  timerDisplay.classList.remove('running', 'stopped');
  renderTimer();
  syncDurationUI(minutes);
}

function loadDuration() {
  const saved = loadLS('timerDuration', 25);
  // Guard against corrupt LocalStorage values
  focusMinutes = validateDuration(saved) ? saved : 25;
  focusSeconds = focusMinutes * 60;
  secondsLeft  = focusSeconds;
}

// ── Timer core ────────────────────────────────────────────

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(secondsLeft);
  timerDisplay.classList.toggle('running', timerRunning);
  timerDisplay.classList.toggle('stopped', !timerRunning && secondsLeft < focusSeconds);
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  renderTimer();
  timerInterval = setInterval(() => {
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerDisplay.textContent = '00:00';
      timerDisplay.classList.remove('running');
      alert('⏱ Focus session complete! Great work.');
      return;
    }
    secondsLeft--;
    renderTimer();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  renderTimer();
}

function resetTimer() {
  stopTimer();
  secondsLeft = focusSeconds;
  timerDisplay.classList.remove('running', 'stopped');
  renderTimer();
}

// ── Event handlers ────────────────────────────────────────

// Preset buttons — render from PRESETS array
const pickerEl = document.querySelector('.duration-picker');
PRESETS.forEach(min => {
  const btn = pickerEl.querySelector(`[data-minutes="${min}"]`);
  if (btn) {
    btn.addEventListener('click', () => {
      if (timerRunning) stopTimer();
      setDuration(min);
    });
  }
});

// Custom Apply button
function handleCustomApply() {
  const raw = durationInput.value;
  if (!validateDuration(raw)) {
    durationInput.classList.add('input-error');
    return;
  }
  durationInput.classList.remove('input-error');
  if (timerRunning) stopTimer();
  setDuration(parseInt(raw, 10));
}

btnApplyDuration.addEventListener('click', handleCustomApply);
durationInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleCustomApply(); });

btnStart.addEventListener('click', startTimer);
btnStop.addEventListener('click', stopTimer);
btnReset.addEventListener('click', resetTimer);

// ── Init ──────────────────────────────────────────────────
loadDuration();
renderTimer();
syncDurationUI(focusMinutes);
btnStart.addEventListener('click', startTimer);
btnStop.addEventListener('click', stopTimer);
btnReset.addEventListener('click', resetTimer);

renderTimer();

/* ══════════════════════════════════════════════════════════
   3. TO-DO LIST
   Data shape: [{ id, text, done }]
══════════════════════════════════════════════════════════ */
const todoInput  = document.getElementById('todo-input');
const btnAddTask = document.getElementById('btn-add-task');
const todoListEl = document.getElementById('todo-list');

let tasks = loadLS('tasks', []);

function saveTasks() {
  saveLS('tasks', tasks);
}

function createTaskId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function renderTasks() {
  todoListEl.innerHTML = '';
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className  = 'todo-item' + (task.done ? ' done' : '');
    li.dataset.id = task.id;

    // Checkbox
    const checkbox     = document.createElement('input');
    checkbox.type      = 'checkbox';
    checkbox.checked   = task.done;
    checkbox.setAttribute('aria-label', 'Mark task done');
    checkbox.addEventListener('change', () => toggleTask(task.id));

    // Text span
    const span       = document.createElement('span');
    span.className   = 'task-text';
    span.textContent = task.text;

    // Edit button
    const btnEdit       = document.createElement('button');
    btnEdit.className   = 'btn-edit';
    btnEdit.textContent = 'Edit';
    btnEdit.setAttribute('aria-label', 'Edit task');
    btnEdit.addEventListener('click', () => startEditTask(task.id, li, span, btnEdit));

    // Delete button
    const btnDelete       = document.createElement('button');
    btnDelete.className   = 'btn-delete';
    btnDelete.textContent = '✕';
    btnDelete.setAttribute('aria-label', 'Delete task');
    btnDelete.addEventListener('click', () => deleteTask(task.id));

    li.append(checkbox, span, btnEdit, btnDelete);
    todoListEl.appendChild(li);
  });
}

function addTask() {
  const text = todoInput.value.trim();
  if (!text) return;
  tasks.push({ id: createTaskId(), text, done: false });
  saveTasks();
  renderTasks();
  todoInput.value = '';
  todoInput.focus();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) { task.done = !task.done; saveTasks(); renderTasks(); }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function startEditTask(id, li, span, btnEdit) {
  const editInput     = document.createElement('input');
  editInput.type      = 'text';
  editInput.className = 'edit-input';
  editInput.value     = span.textContent;
  editInput.maxLength = 120;

  const btnSave       = document.createElement('button');
  btnSave.className   = 'btn-save';
  btnSave.textContent = 'Save';
  btnSave.setAttribute('aria-label', 'Save task');

  li.replaceChild(editInput, span);
  li.replaceChild(btnSave, btnEdit);
  editInput.focus();

  function saveEdit() {
    const newText = editInput.value.trim();
    if (!newText) return;
    const task = tasks.find(t => t.id === id);
    if (task) { task.text = newText; saveTasks(); renderTasks(); }
  }

  btnSave.addEventListener('click', saveEdit);
  editInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveEdit(); });
}

btnAddTask.addEventListener('click', addTask);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

renderTasks();

/* ══════════════════════════════════════════════════════════
   4. QUICK LINKS
   Data shape: [{ id, label, url }]
══════════════════════════════════════════════════════════ */
const linkNameInput = document.getElementById('link-name-input');
const linkUrlInput  = document.getElementById('link-url-input');
const btnAddLink    = document.getElementById('btn-add-link');
const linksGrid     = document.getElementById('links-grid');

let links = loadLS('quickLinks', []);

function saveLinks() {
  saveLS('quickLinks', links);
}

function renderLinks() {
  linksGrid.innerHTML = '';
  links.forEach(link => {
    const chip     = document.createElement('div');
    chip.className = 'link-chip';

    const anchor   = document.createElement('a');
    anchor.href    = link.url;
    anchor.textContent = link.label;
    anchor.target  = '_blank';
    anchor.rel     = 'noopener noreferrer';

    const btnRemove       = document.createElement('button');
    btnRemove.className   = 'btn-remove-link';
    btnRemove.textContent = '×';
    btnRemove.setAttribute('aria-label', `Remove ${link.label}`);
    btnRemove.addEventListener('click', () => removeLink(link.id));

    chip.append(anchor, btnRemove);
    linksGrid.appendChild(chip);
  });
}

function addLink() {
  const label = linkNameInput.value.trim();
  let   url   = linkUrlInput.value.trim();

  if (!label || !url) return;

  // Auto-prepend https:// if missing
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  links.push({ id: createTaskId(), label, url });
  saveLinks();
  renderLinks();
  linkNameInput.value = '';
  linkUrlInput.value  = '';
  linkNameInput.focus();
}

function removeLink(id) {
  links = links.filter(l => l.id !== id);
  saveLinks();
  renderLinks();
}

btnAddLink.addEventListener('click', addLink);
linkUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });

renderLinks();
