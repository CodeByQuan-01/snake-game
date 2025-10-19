const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const COLS = 20;
const ROWS = 20;
// Responsive sizing
let SIZE = 0; // canvas size in CSS px
let CELL = 0; // cell size in CSS px

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const target = Math.min(window.innerWidth * 0.94, window.innerHeight * 0.76, 540);
  const finalSize = Math.max(240, Math.floor(target));
  canvas.style.width = finalSize + 'px';
  canvas.style.height = finalSize + 'px';
  canvas.width = Math.floor(finalSize * dpr);
  canvas.height = Math.floor(finalSize * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  SIZE = finalSize;
  CELL = SIZE / COLS;
}
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let intervalId = null;
let running = false;
let score = 0;
let highScore = parseInt(localStorage.getItem('snake_highscore') || '0', 10);

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const toggleBtn = document.getElementById('toggle-btn');
const restartBtn = document.getElementById('restart-btn');
const speed = document.getElementById('speed');

let audioCtx = null;
let muted = false;
const soundBtn = document.getElementById('sound-btn');

function sliderToMs(val) {
  // Map 5..15 to ~200ms..80ms
  return Math.round(260 - val * 12);
}

function updateScoreUI() {
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;
}

async function playTone({ freq = 440, duration = 120, type = 'sine', volume = 0.08 } = {}) {
  if (muted) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration / 1000);
  } catch {}
}

function playEat() {
  playTone({ freq: 520, duration: 60, type: 'square', volume: 0.12 });
  setTimeout(() => playTone({ freq: 750, duration: 80, type: 'square', volume: 0.1 }), 70);
}

function playStart() {
  playTone({ freq: 300, duration: 60, type: 'triangle', volume: 0.08 });
  setTimeout(() => playTone({ freq: 500, duration: 80, type: 'triangle', volume: 0.08 }), 80);
}

function playPause(resuming) {
  playTone({ freq: resuming ? 700 : 280, duration: 80, type: 'triangle', volume: 0.08 });
}

function playGameOver() {
  playTone({ freq: 480, duration: 160, type: 'sawtooth', volume: 0.1 });
  setTimeout(() => playTone({ freq: 360, duration: 160, type: 'sawtooth', volume: 0.1 }), 170);
  setTimeout(() => playTone({ freq: 240, duration: 220, type: 'sawtooth', volume: 0.09 }), 330);
}

function isOnSnake(pos) {
  return snake.some(seg => seg.x === pos.x && seg.y === pos.y);
}

function spawnFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (isOnSnake(pos));
  food = pos;
}

function resetGame() {
  snake = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  spawnFood();
  draw();
  updateScoreUI();
}

function start() {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(step, sliderToMs(parseInt(speed.value, 10)));
  running = true;
  toggleBtn.textContent = 'Pause';
  try { playStart(); } catch {}
}

function stop() {
  running = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function pause() {
  stop();
  toggleBtn.textContent = 'Resume';
  try { playPause(false); } catch {}
}

function toggle() {
  if (!running && score === 0 && snake.length === 1) {
    start();
  } else {
    running ? pause() : start();
  }
}

function gameOver() {
  stop();
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('snake_highscore', String(highScore));
  }
  draw();
  drawGameOver();
  toggleBtn.textContent = 'Start';
  try { playGameOver(); } catch {}
}

function step() {
  // Apply next direction once per tick
  direction = nextDirection;

  const head = snake[0];
  const newHead = { x: head.x + direction.x, y: head.y + direction.y };

  // Wall collision
  if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
    gameOver();
    return;
  }

  // Self collision
  if (isOnSnake(newHead)) {
    gameOver();
    return;
  }

  snake.unshift(newHead);

  // Eat food
  if (newHead.x === food.x && newHead.y === food.y) {
    score += 1;
    spawnFood();
    updateScoreUI();
    try { playEat(); } catch {}
  } else {
    snake.pop();
  }

  draw();
}

function draw() {
  // Background
  ctx.fillStyle = '#111625';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Grid
  drawGrid();

  // Food
  ctx.fillStyle = '#ff5a5f';
  ctx.fillRect(food.x * CELL, food.y * CELL, CELL, CELL);

  // Snake
  ctx.fillStyle = '#6cf171';
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL, CELL);
  }
}

function drawGrid() {
  ctx.strokeStyle = '#1e2238';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(SIZE, y * CELL + 0.5);
    ctx.stroke();
  }
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#e7eaf6';
  ctx.textAlign = 'center';
  ctx.font = 'bold ' + Math.round(SIZE * 0.07) + 'px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText('Game Over', SIZE / 2, SIZE / 2 - Math.round(CELL * 0.3));
  ctx.font = Math.round(SIZE * 0.04) + 'px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText('Press Start or R to restart', SIZE / 2, SIZE / 2 + Math.round(CELL * 0.35));
  ctx.restore();
}

function opposite(a, b) { return a.x === -b.x && a.y === -b.y; }
function setNextDirection(dir) {
  if (opposite(dir, direction)) return; // prevent reverse into self
  nextDirection = dir;
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
  const k = e.key;
  if (k === ' ') { e.preventDefault(); toggle(); return; }
  if (k === 'r' || k === 'R') { e.preventDefault(); const wasRunning = running; stop(); resetGame(); if (wasRunning) start(); return; }
  if (k === 'ArrowUp') { e.preventDefault(); setNextDirection({ x: 0, y: -1 }); }
  else if (k === 'ArrowDown') { e.preventDefault(); setNextDirection({ x: 0, y: 1 }); }
  else if (k === 'ArrowLeft') { e.preventDefault(); setNextDirection({ x: -1, y: 0 }); }
  else if (k === 'ArrowRight') { e.preventDefault(); setNextDirection({ x: 1, y: 0 }); }
});

// Mobile controls
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

[btnUp, btnDown, btnLeft, btnRight].forEach(btn => {
  if (!btn) return;
  btn.addEventListener('click', () => {
    const id = btn.id;
    if (id === 'btn-up') setNextDirection({ x: 0, y: -1 });
    else if (id === 'btn-down') setNextDirection({ x: 0, y: 1 });
    else if (id === 'btn-left') setNextDirection({ x: -1, y: 0 });
    else if (id === 'btn-right') setNextDirection({ x: 1, y: 0 });
  });
});

// Buttons
toggleBtn.addEventListener('click', () => toggle());
restartBtn.addEventListener('click', () => {
  const wasRunning = running;
  stop();
  resetGame();
  if (wasRunning) start();
});

if (soundBtn) {
  soundBtn.addEventListener('click', () => {
    muted = !muted;
    soundBtn.textContent = muted ? '🔇' : '🔊';
    if (!muted) { try { playPause(true); } catch {} }
  });
  soundBtn.textContent = '🔊';
}

// Speed changes restart the timer if running
speed.addEventListener('input', () => {
  if (running) start();
});

// Init
window.addEventListener('resize', () => { resizeCanvas(); draw(); });
resizeCanvas();
resetGame();
updateScoreUI();