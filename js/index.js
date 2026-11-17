// Serpent snake game logic

const GRID        = 18;
const SPEED_MS    = 100;
const LS_KEY      = 'serpent_hiscore';
const LS_THEME    = 'serpent_theme';

// DOM element references
const boardEl         = document.getElementById('board');
const scoreBoxEl      = document.getElementById('scoreBox');
const hiscoreBoxEl    = document.getElementById('hiscoreBox');
const finalScoreEl    = document.getElementById('final-score');
const finalHiscoreEl  = document.getElementById('final-hiscore');
const startOverlay    = document.getElementById('start-overlay');
const pauseOverlay    = document.getElementById('pause-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const pauseBtn        = document.getElementById('pause-btn');
const statusBadge     = document.getElementById('status-badge');
const startBtn        = document.getElementById('start-btn');
const resumeBtn       = document.getElementById('resume-btn');
const restartBtn      = document.getElementById('restart-btn');
const boardWrap       = document.getElementById('board-wrap');
const themeToggle     = document.getElementById('theme-toggle');

// Theme switcher (dark and light mode)
(function initTheme() {
  const saved = localStorage.getItem(LS_THEME) || 'dark';
  applyTheme(saved, false);
})();

function applyTheme(theme, save = true) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('toggle-icon');
  const label = document.getElementById('toggle-label');
  if (theme === 'light') {
    icon.textContent  = '☀️';
    label.textContent = 'LIGHT';
  } else {
    icon.textContent  = '🌙';
    label.textContent = 'DARK';
  }
  if (save) localStorage.setItem(LS_THEME, theme);
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// Sound effects and background music
function makeAudio(src, fallbackSrc) {
  const a = new Audio(src);
  a.preload = 'auto';
  if (fallbackSrc) {
    a.addEventListener('error', () => {
      a.src = fallbackSrc;
    }, { once: true });
  }
  return a;
}
const sfxEat  = makeAudio('music/eating.mp3', 'music/gun.mp3');
const sfxMove = makeAudio('music/move.mp3');
const sfxDie  = makeAudio('music/gameover.mp3', 'music/daya.mp3');
const bgMusic = makeAudio('music/background.mp3');
bgMusic.loop   = true;
bgMusic.volume = 0.25;

let moveAudioCooldown = false;

function playEat() {
  sfxEat.currentTime = 0;
  sfxEat.play().catch(() => {});
}
function playMove() {
  if (moveAudioCooldown) return;
  sfxMove.currentTime = 0;
  sfxMove.play().catch(() => {});
  moveAudioCooldown = true;
  setTimeout(() => moveAudioCooldown = false, 90);
}
function playDie() {
  sfxDie.currentTime = 0;
  sfxDie.play().catch(() => {});
  bgMusic.pause();
  bgMusic.currentTime = 0;
}
function startMusic() {
  bgMusic.play().catch(() => {});
}

// Generate 18x18 grid cells
const cells = [];
(function buildGrid() {
  for (let i = 0; i < GRID * GRID; i++) {
    const c = document.createElement('div');
    c.className = 'cell';
    boardEl.appendChild(c);
    cells.push(c);
  }
})();

function idx(row, col) { return row * GRID + col; }
function clearCellClasses(el) { el.className = 'cell'; }

// Game state variables and initialization
let snake, dir, nextDir, food, score, hiscore, gameLoop;
let state = 'idle'; // idle | playing | paused | dead
let inputQueue = [];
let gameOverTimer = null;
let headBounceTicks = 0;

function initState() {
  const mid = Math.floor(GRID / 2);
  snake = [
    { r: mid, c: mid + 1 },
    { r: mid, c: mid },
    { r: mid, c: mid - 1 },
  ];
  dir             = { r: 0, c: 1 };
  nextDir         = { r: 0, c: 1 };
  inputQueue      = [];
  headBounceTicks = 0;
  score           = 0;
  hiscore         = parseInt(localStorage.getItem(LS_KEY) || '0', 10) || 0;
  boardWrap.querySelectorAll('.float-score').forEach(el => el.remove());
  placeFood();
}

function placeFood() {
  const totalCells = GRID * GRID;
  if (snake.length >= totalCells) {
    endGame(true);
    return;
  }

  const snakeSet = new Set(snake.map(s => idx(s.r, s.c)));

  if (snake.length < totalCells * 0.75) {
    let pos;
    do {
      pos = { r: Math.floor(Math.random() * GRID), c: Math.floor(Math.random() * GRID) };
    } while (snakeSet.has(idx(pos.r, pos.c)));
    food = pos;
  } else {
    const emptyCells = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (!snakeSet.has(idx(r, c))) {
          emptyCells.push({ r, c });
        }
      }
    }
    if (emptyCells.length === 0) {
      endGame(true);
      return;
    }
    food = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }
}

// Render snake and food on the grid
function render() {
  cells.forEach(c => clearCellClasses(c));
  if (food) {
    cells[idx(food.r, food.c)].classList.add('food');
  }
  for (let i = snake.length - 1; i >= 0; i--) {
    const s  = snake[i];
    const el = cells[idx(s.r, s.c)];
    if (i === 0) {
      el.classList.add('snake-head');
      if (headBounceTicks > 0) {
        el.classList.add('eat-bounce');
      }
    } else if (i === snake.length - 1) {
      el.classList.add('snake-tail');
    } else {
      el.classList.add('snake-body');
    }
  }
}

// Update score display on screen
function updateScoreUI(bump) {
  scoreBoxEl.textContent   = score;
  hiscoreBoxEl.textContent = hiscore;
  if (bump) {
    scoreBoxEl.classList.remove('bump');
    void scoreBoxEl.offsetWidth;
    scoreBoxEl.classList.add('bump');
  }
}

// Floating +1 animation when food is eaten
function spawnFloatScore(r, c) {
  const boardRect = boardEl.getBoundingClientRect();
  const wrapRect  = boardWrap.getBoundingClientRect();
  const cellW = boardEl.clientWidth  / GRID;
  const cellH = boardEl.clientHeight / GRID;
  const x = (boardRect.left - wrapRect.left) + c * cellW + cellW / 2;
  const y = (boardRect.top  - wrapRect.top)  + r * cellH;
  const el = document.createElement('div');
  el.className = 'float-score';
  el.textContent = '+1';
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  el.style.transform = 'translateX(-50%)';
  boardWrap.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// Main game tick loop: move snake and check collisions
function tick() {
  const prevDir = dir;
  if (inputQueue.length > 0) {
    dir = inputQueue.shift();
  }
  nextDir = dir;

  if (prevDir.r !== dir.r || prevDir.c !== dir.c) {
    playMove();
  }

  const head    = snake[0];
  const newHead = { r: head.r + dir.r, c: head.c + dir.c };

  if (newHead.r < 0 || newHead.r >= GRID || newHead.c < 0 || newHead.c >= GRID) {
    return endGame(false);
  }
  if (snake.some(s => s.r === newHead.r && s.c === newHead.c)) {
    return endGame(false);
  }

  const ate = food && newHead.r === food.r && newHead.c === food.c;
  snake.unshift(newHead);
  if (!ate) snake.pop();

  if (headBounceTicks > 0) headBounceTicks--;

  render();

  if (ate) {
    score++;
    if (score > hiscore) {
      hiscore = score;
      localStorage.setItem(LS_KEY, hiscore);
    }
    updateScoreUI(true);
    spawnFloatScore(food.r, food.c);
    playEat();
    headBounceTicks = 3;
    render();
    placeFood();
  }
}

// Game flow: start, end, pause, and resume
function startGame() {
  if (gameLoop) clearInterval(gameLoop);
  if (gameOverTimer) clearTimeout(gameOverTimer);

  const titleEl = gameoverOverlay.querySelector('.overlay-title');
  if (titleEl) {
    titleEl.textContent = 'GAME OVER';
    titleEl.style.color = '';
  }

  initState();
  render();
  updateScoreUI(false);
  showOverlay(null);
  state = 'playing';
  pauseBtn.style.display = '';
  setStatusBadge('playing');
  startMusic();
  gameLoop = setInterval(tick, SPEED_MS);
}

function endGame(won = false) {
  if (gameLoop) clearInterval(gameLoop);
  if (gameOverTimer) clearTimeout(gameOverTimer);

  state = 'dead';
  pauseBtn.style.display = 'none';
  setStatusBadge('');

  const titleEl = gameoverOverlay.querySelector('.overlay-title');
  if (titleEl) {
    titleEl.textContent = won ? 'YOU WIN!' : 'GAME OVER';
    titleEl.style.color = won ? 'var(--accent)' : '';
  }

  if (!won) {
    playDie();
    boardEl.classList.remove('shake');
    void boardEl.offsetWidth;
    boardEl.classList.add('shake');
  }

  gameOverTimer = setTimeout(() => {
    finalScoreEl.textContent   = score;
    finalHiscoreEl.textContent = hiscore;
    showOverlay('gameover');
  }, won ? 100 : 480);
}

function pauseGame() {
  if (state !== 'playing') return;
  if (gameLoop) clearInterval(gameLoop);
  state = 'paused';
  showOverlay('pause');
  setStatusBadge('paused');
  bgMusic.pause();
}

function resumeGame() {
  if (state !== 'paused') return;
  showOverlay(null);
  state = 'playing';
  setStatusBadge('playing');
  bgMusic.play().catch(() => {});
  gameLoop = setInterval(tick, SPEED_MS);
}

function togglePause() {
  if (state === 'playing') pauseGame();
  else if (state === 'paused') resumeGame();
}

function showOverlay(which) {
  [startOverlay, pauseOverlay, gameoverOverlay].forEach(o => o.classList.remove('visible'));
  if (which === 'start')    startOverlay.classList.add('visible');
  if (which === 'pause')    pauseOverlay.classList.add('visible');
  if (which === 'gameover') gameoverOverlay.classList.add('visible');
}

function setStatusBadge(s) {
  statusBadge.className = '';
  if (s === 'playing')      { statusBadge.textContent = 'PLAYING'; statusBadge.classList.add('playing'); }
  else if (s === 'paused')  { statusBadge.textContent = 'PAUSED';  statusBadge.classList.add('paused'); }
  else                      { statusBadge.textContent = 'READY'; }
}

// Direction vectors and turn handling
const DIR_MAP = {
  ArrowUp:    { r: -1, c:  0 },
  ArrowDown:  { r:  1, c:  0 },
  ArrowLeft:  { r:  0, c: -1 },
  ArrowRight: { r:  0, c:  1 },
  UP:         { r: -1, c:  0 },
  DOWN:       { r:  1, c:  0 },
  LEFT:       { r:  0, c: -1 },
  RIGHT:      { r:  0, c:  1 },
};
function isOpposite(a, b) { return a.r === -b.r && a.c === -b.c; }

function handleDir(key) {
  const newDir = DIR_MAP[key];
  if (!newDir) return false;

  if (state === 'idle') {
    if (isOpposite(newDir, dir)) return false;
    startGame();
    inputQueue = [newDir];
    return true;
  }
  if (state === 'paused') {
    resumeGame();
    return true;
  }
  if (state === 'playing') {
    if (inputQueue.length < 2) {
      const last = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : dir;
      if (!isOpposite(newDir, last)) {
        inputQueue.push(newDir);
      }
    }
    return true;
  }
  return false;
}

// Keyboard controls (arrow keys and spacebar)
document.addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
    handleDir(e.key);
  } else if (e.code === 'Space') {
    e.preventDefault();
    if (state === 'idle') {
      startGame();
    } else if (state === 'dead') {
      if (gameOverTimer) clearTimeout(gameOverTimer);
      initState();
      render();
      showOverlay('start');
      state = 'idle';
    } else {
      togglePause();
    }
  }
});

// Button click handlers
startBtn.addEventListener('click',   () => startGame());
resumeBtn.addEventListener('click',  () => resumeGame());
restartBtn.addEventListener('click', () => startGame());
pauseBtn.addEventListener('click',   () => togglePause());

// Mobile on-screen touch D-pad
document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('touchstart', e => {
    e.preventDefault();
    handleDir(btn.dataset.dir);
  }, { passive: false });
  btn.addEventListener('click', () => handleDir(btn.dataset.dir));
});

// Mobile touch swipe gestures
let touchStartX = null, touchStartY = null;
boardEl.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });
boardEl.addEventListener('touchend', e => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    handleDir(dx > 0 ? 'RIGHT' : 'LEFT');
  } else {
    handleDir(dy > 0 ? 'DOWN' : 'UP');
  }
  touchStartX = null; touchStartY = null;
}, { passive: true });

// Initial setup on page load
hiscore = parseInt(localStorage.getItem(LS_KEY) || '0', 10) || 0;
hiscoreBoxEl.textContent = hiscore;
showOverlay('start');
initState();
render();
