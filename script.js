const LANE_COUNT = 6;
const STORAGE_KEY = 'pjwd-chart-autosave-v2';
const BASE_CANVAS_HEIGHT = 1600;

const state = {
  songTitle: 'Untitled',
  bpm: 160,
  measures: 32,
  beatsPerMeasure: 4,
  notes: [],
  zoom: 1,
  snapDivisor: 4,
  noteType: 'tap',
  selectedNoteId: null,
  history: [],
  future: [],
};

let nextNoteId = 1;
let isDragging = false;

const el = {
  songTitle: document.getElementById('songTitle'),
  bpm: document.getElementById('bpm'),
  measures: document.getElementById('measures'),
  beatsPerMeasure: document.getElementById('beatsPerMeasure'),
  noteType: document.getElementById('noteType'),
  snapDivisor: document.getElementById('snapDivisor'),
  zoom: document.getElementById('zoom'),
  undoBtn: document.getElementById('undoBtn'),
  redoBtn: document.getElementById('redoBtn'),
  deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
  clearBtn: document.getElementById('clearBtn'),
  saveJsonBtn: document.getElementById('saveJsonBtn'),
  loadJsonInput: document.getElementById('loadJsonInput'),
  copyJsonBtn: document.getElementById('copyJsonBtn'),
  statsText: document.getElementById('statsText'),
  selectionText: document.getElementById('selectionText'),
  chartCanvas: document.getElementById('chartCanvas'),
};

const ctx = el.chartCanvas.getContext('2d');

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeConfig() {
  state.bpm = clamp(Number(state.bpm) || 160, 40, 300);
  state.measures = clamp(Number(state.measures) || 32, 4, 300);
  state.beatsPerMeasure = clamp(Number(state.beatsPerMeasure) || 4, 2, 12);
  state.zoom = clamp(Number(state.zoom) || 1, 0.5, 2);
  state.snapDivisor = clamp(Number(state.snapDivisor) || 4, 1, 16);
}

function totalBeats() {
  return state.measures * state.beatsPerMeasure;
}

function pushHistory() {
  state.history.push(JSON.stringify(state.notes));
  if (state.history.length > 200) state.history.shift();
  state.future = [];
}

function saveState() {
  const payload = {
    ...state,
    history: undefined,
    future: undefined,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function normalizeNotes(notes) {
  return notes
    .filter((n) => Number.isFinite(Number(n.lane)) && Number.isFinite(Number(n.beat)))
    .map((n) => ({
      id: Number(n.id || nextNoteId++),
      lane: clamp(Math.floor(Number(n.lane)), 0, LANE_COUNT - 1),
      beat: clamp(Number(n.beat), 0, totalBeats()),
      type: ['tap', 'flick', 'holdStart', 'holdEnd'].includes(n.type) ? n.type : 'tap',
    }))
    .sort((a, b) => a.beat - b.beat || a.lane - b.lane);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.songTitle = String(parsed.songTitle ?? state.songTitle);
    state.bpm = parsed.bpm ?? state.bpm;
    state.measures = parsed.measures ?? state.measures;
    state.beatsPerMeasure = parsed.beatsPerMeasure ?? state.beatsPerMeasure;
    state.zoom = parsed.zoom ?? state.zoom;
    state.snapDivisor = parsed.snapDivisor ?? state.snapDivisor;
    state.noteType = parsed.noteType ?? state.noteType;
    sanitizeConfig();
    state.notes = Array.isArray(parsed.notes) ? normalizeNotes(parsed.notes) : [];
    nextNoteId = Math.max(1, ...state.notes.map((n) => n.id + 1));
  } catch {
    // ignore
  }
}

function syncInputs() {
  el.songTitle.value = state.songTitle;
  el.bpm.value = String(state.bpm);
  el.measures.value = String(state.measures);
  el.beatsPerMeasure.value = String(state.beatsPerMeasure);
  el.noteType.value = state.noteType;
  el.snapDivisor.value = String(state.snapDivisor);
  el.zoom.value = String(state.zoom);
}

function laneWidth() {
  return el.chartCanvas.width / LANE_COUNT;
}

function noteColor(type) {
  if (type === 'flick') return '#ff9f43';
  if (type === 'holdStart') return '#4cd137';
  if (type === 'holdEnd') return '#00a8ff';
  return '#f5f6fa';
}

function beatToY(beat) {
  const padding = 24;
  const usable = el.chartCanvas.height - padding * 2;
  return padding + (beat / totalBeats()) * usable;
}

function yToBeat(y) {
  const padding = 24;
  const usable = el.chartCanvas.height - padding * 2;
  const rawBeat = ((y - padding) / usable) * totalBeats();
  const snapped = Math.round(rawBeat * state.snapDivisor) / state.snapDivisor;
  return clamp(snapped, 0, totalBeats());
}

function getPointerInfo(event) {
  const rect = el.chartCanvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * el.chartCanvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * el.chartCanvas.height;
  const lane = clamp(Math.floor(x / laneWidth()), 0, LANE_COUNT - 1);
  const beat = yToBeat(y);
  return { lane, beat, x, y };
}

function drawGrid() {
  ctx.clearRect(0, 0, el.chartCanvas.width, el.chartCanvas.height);

  const snapStep = 1 / state.snapDivisor;
  for (let beat = 0; beat <= totalBeats(); beat += snapStep) {
    const y = beatToY(beat);
    const isMeasureLine = Number.isInteger(beat / state.beatsPerMeasure);
    const isBeatLine = Number.isInteger(beat);
    ctx.strokeStyle = isMeasureLine ? '#6ea8ff' : isBeatLine ? '#2f3a4f' : '#202838';
    ctx.lineWidth = isMeasureLine ? 1.8 : 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(el.chartCanvas.width, y);
    ctx.stroke();

    if (isMeasureLine) {
      ctx.fillStyle = '#9fb0d1';
      ctx.font = '11px sans-serif';
      ctx.fillText(`M${Math.floor(beat / state.beatsPerMeasure) + 1}`, 8, y - 4);
    }
  }

  for (let lane = 0; lane <= LANE_COUNT; lane += 1) {
    ctx.strokeStyle = lane % 2 === 0 ? '#2e3646' : '#252b38';
    ctx.beginPath();
    ctx.moveTo(lane * laneWidth(), 0);
    ctx.lineTo(lane * laneWidth(), el.chartCanvas.height);
    ctx.stroke();
  }
}

function drawHoldGuides() {
  const laneNotes = Array.from({ length: LANE_COUNT }, () => []);
  for (const note of state.notes) laneNotes[note.lane].push(note);

  laneNotes.forEach((notesInLane, lane) => {
    notesInLane.sort((a, b) => a.beat - b.beat);
    let holdStart = null;
    for (const note of notesInLane) {
      if (note.type === 'holdStart') holdStart = note;
      if (note.type === 'holdEnd' && holdStart) {
        const x = lane * laneWidth() + laneWidth() / 2;
        ctx.strokeStyle = 'rgba(110, 168, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, beatToY(holdStart.beat));
        ctx.lineTo(x, beatToY(note.beat));
        ctx.stroke();
        holdStart = null;
      }
    }
  });
}

function drawNotes() {
  const w = laneWidth();
  const radius = Math.max(8, 10 * state.zoom);

  for (const note of state.notes) {
    const x = note.lane * w + w / 2;
    const y = beatToY(note.beat);

    ctx.beginPath();
    ctx.fillStyle = noteColor(note.type);
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (note.id === state.selectedNoteId) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.2;
    }
    ctx.stroke();
  }
}

function findNearestNote(x, y, maxDist = 26) {
  let result = null;
  let bestDist = Infinity;

  state.notes.forEach((note, index) => {
    const nx = note.lane * laneWidth() + laneWidth() / 2;
    const ny = beatToY(note.beat);
    const dist = Math.hypot(nx - x, ny - y);
    if (dist < bestDist) {
      bestDist = dist;
      result = { note, index, dist };
    }
  });

  if (!result || result.dist > maxDist) return null;
  return result;
}

function refreshStats() {
  const taps = state.notes.filter((n) => n.type === 'tap').length;
  const flicks = state.notes.filter((n) => n.type === 'flick').length;
  const holds = state.notes.filter((n) => n.type.startsWith('hold')).length;
  el.statsText.textContent = `ノーツ: ${state.notes.length} (Tap: ${taps}, Flick: ${flicks}, Hold系: ${holds})`;

  const selected = state.notes.find((n) => n.id === state.selectedNoteId);
  el.selectionText.textContent = selected
    ? `選択: lane ${selected.lane + 1}, beat ${selected.beat.toFixed(3)}, type ${selected.type}`
    : '選択: なし';
}

function render() {
  sanitizeConfig();
  el.chartCanvas.height = Math.floor(BASE_CANVAS_HEIGHT * state.zoom);
  drawGrid();
  drawHoldGuides();
  drawNotes();
  refreshStats();
  saveState();
}

function addNote(lane, beat) {
  pushHistory();
  state.notes.push({ id: nextNoteId++, lane, beat, type: state.noteType });
  state.notes.sort((a, b) => a.beat - b.beat || a.lane - b.lane);
  state.selectedNoteId = state.notes[state.notes.length - 1]?.id ?? null;
  render();
}

function removeSelectedNote() {
  if (state.selectedNoteId == null) return;
  const idx = state.notes.findIndex((n) => n.id === state.selectedNoteId);
  if (idx < 0) return;
  pushHistory();
  state.notes.splice(idx, 1);
  state.selectedNoteId = null;
  render();
}

function removeNearestNote(x, y) {
  const nearest = findNearestNote(x, y);
  if (!nearest) return;
  pushHistory();
  state.notes.splice(nearest.index, 1);
  if (state.selectedNoteId === nearest.note.id) state.selectedNoteId = null;
  render();
}

function moveSelectedNote(lane, beat) {
  const note = state.notes.find((n) => n.id === state.selectedNoteId);
  if (!note) return;
  note.lane = lane;
  note.beat = beat;
  state.notes.sort((a, b) => a.beat - b.beat || a.lane - b.lane);
  render();
}

function exportChartObject() {
  return {
    schemaVersion: 2,
    metadata: {
      songTitle: state.songTitle,
      bpm: state.bpm,
      measures: state.measures,
      beatsPerMeasure: state.beatsPerMeasure,
    },
    notes: state.notes,
  };
}

function importChartObject(data) {
  if (!data || !data.metadata || !Array.isArray(data.notes)) {
    throw new Error('invalid chart json');
  }
  pushHistory();
  state.songTitle = String(data.metadata.songTitle ?? 'Untitled');
  state.bpm = Number(data.metadata.bpm ?? 160);
  state.measures = Number(data.metadata.measures ?? 32);
  state.beatsPerMeasure = Number(data.metadata.beatsPerMeasure ?? 4);
  sanitizeConfig();
  state.notes = normalizeNotes(data.notes);
  state.selectedNoteId = null;
  nextNoteId = Math.max(1, ...state.notes.map((n) => n.id + 1));
  syncInputs();
  render();
}

el.chartCanvas.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  const info = getPointerInfo(event);
  const nearest = findNearestNote(info.x, info.y);

  if (nearest) {
    state.selectedNoteId = nearest.note.id;
    pushHistory();
    isDragging = true;
    render();
    return;
  }

  addNote(info.lane, info.beat);
});

window.addEventListener('mousemove', (event) => {
  if (!isDragging || state.selectedNoteId == null) return;
  const rect = el.chartCanvas.getBoundingClientRect();
  const withinCanvas = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (!withinCanvas) return;
  const { lane, beat } = getPointerInfo(event);
  moveSelectedNote(lane, beat);
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

el.chartCanvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const { x, y } = getPointerInfo(event);
  removeNearestNote(x, y);
});

el.songTitle.addEventListener('input', () => {
  state.songTitle = el.songTitle.value.trim() || 'Untitled';
  render();
});

for (const key of ['bpm', 'measures', 'beatsPerMeasure']) {
  el[key].addEventListener('input', () => {
    state[key] = Number(el[key].value);
    syncInputs();
    render();
  });
}

el.noteType.addEventListener('change', () => {
  state.noteType = el.noteType.value;
  saveState();
});

el.snapDivisor.addEventListener('change', () => {
  state.snapDivisor = Number(el.snapDivisor.value);
  syncInputs();
  render();
});

el.zoom.addEventListener('input', () => {
  state.zoom = Number(el.zoom.value);
  render();
});

el.undoBtn.addEventListener('click', () => {
  if (state.history.length === 0) return;
  state.future.push(JSON.stringify(state.notes));
  state.notes = JSON.parse(state.history.pop());
  state.selectedNoteId = null;
  render();
});

el.redoBtn.addEventListener('click', () => {
  if (state.future.length === 0) return;
  state.history.push(JSON.stringify(state.notes));
  state.notes = JSON.parse(state.future.pop());
  state.selectedNoteId = null;
  render();
});

el.deleteSelectedBtn.addEventListener('click', removeSelectedNote);

el.clearBtn.addEventListener('click', () => {
  pushHistory();
  state.notes = [];
  state.selectedNoteId = null;
  render();
});

el.saveJsonBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(exportChartObject(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.songTitle.replace(/\s+/g, '_') || 'chart'}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

el.copyJsonBtn.addEventListener('click', async () => {
  const text = JSON.stringify(exportChartObject(), null, 2);
  try {
    await navigator.clipboard.writeText(text);
    el.copyJsonBtn.textContent = 'コピー済み';
  } catch {
    el.copyJsonBtn.textContent = 'コピー失敗';
  }
  setTimeout(() => {
    el.copyJsonBtn.textContent = 'JSONをコピー';
  }, 1200);
});

el.loadJsonInput.addEventListener('change', async () => {
  const [file] = el.loadJsonInput.files || [];
  if (!file) return;
  try {
    const text = await file.text();
    importChartObject(JSON.parse(text));
  } catch {
    alert('JSONの読み込みに失敗しました');
  } finally {
    el.loadJsonInput.value = '';
  }
});

window.addEventListener('keydown', (event) => {
  const mod = event.ctrlKey || event.metaKey;
  if (mod && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    el.undoBtn.click();
    return;
  }
  if (mod && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    el.redoBtn.click();
    return;
  }
  if (event.key === 'Delete') {
    event.preventDefault();
    removeSelectedNote();
    return;
  }

  const map = { '1': 'tap', '2': 'flick', '3': 'holdStart', '4': 'holdEnd' };
  if (map[event.key]) {
    state.noteType = map[event.key];
    syncInputs();
    saveState();
  }
});

loadState();
syncInputs();
render();
