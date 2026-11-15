# 🐍 SERPENT — Retro Arcade Snake Game

A polished, responsive retro-arcade Snake game built with vanilla **HTML5**, **CSS3 (Grid & Custom Properties)**, and **JavaScript (ES6+)**. Featuring a cyberpunk neon aesthetic, smooth micro-interactions, dark/light theme switching, touch controls with mobile swipe detection, and robust game state architecture.

---

## 📸 Preview & Highlights

- **Aesthetic**: Cyberpunk retro arcade with neon emerald, cyan, and crimson accents.
- **Board**: Dynamic 18 × 18 CSS Grid embedded with custom background artwork (`bgi.jpg`).
- **Feedback**: Screen shake on death, head bounce on eating, floating `+1` popups, and score bump animations.
- **Responsive**: Adapts fluidly across mobile, tablet, and desktop viewports.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **HTML5** | Semantic structure, modal overlays, accessible buttons, and custom data attributes (`data-theme`, `data-dir`). |
| **CSS3** | CSS Variables (theming), CSS Grid (18×18 layout), Flexbox, CSS Keyframes (`shake`, `eatBounce`, `foodPulse`, `floatUp`), `clamp()`, and backdrop blur effects. |
| **JavaScript (Vanilla ES6+)** | Zero dependencies. Pure DOM manipulation, input queue buffer, directional vector math, collision detection, and audio management. |
| **Web Storage API** | `localStorage` persistence for high score tracking and user theme preferences. |
| **HTML5 Web Audio** | Low-latency audio cues for turns, eating, game over, and looping background music. |

---

## 🎮 Features

- 🌓 **Dark & Light Mode Toggle**: Real-time theme switcher powered by CSS custom properties and saved to `localStorage`.
- 🕹️ **Multi-Input Controls**:
  - **Keyboard**: Arrow keys for directional navigation; <kbd>Space</kbd> for Pause, Resume, and Restart.
  - **Touch D-Pad**: On-screen control buttons displayed on touch/coarse pointer devices.
  - **Swipe Gestures**: Built-in touch start/end vector calculation on the board for mobile play.
- ⚡ **Input Buffer Queue**: A 2-stage input buffer prevents missed turns and dropped keys during rapid succession (e.g., executing a quick U-turn).
- 🛡️ **Anti-Suicide Protection**: Prevents instant 180° turns into the snake's own neck from both idle and moving states.
- 🏆 **High Score Persistence**: Automatically updates and persists your personal best score across browser sessions.
- 🏁 **Adaptive Food Placement & Win Condition**: Instant food generation that switches to exact empty-cell sampling as the grid fills, with a dedicated win state when all 324 cells are occupied.

---

## 🕹️ Controls Guide

### Desktop
| Action | Key |
| :--- | :--- |
| **Move Up** | <kbd>↑</kbd> (Up Arrow) |
| **Move Down** | <kbd>↓</kbd> (Down Arrow) |
| **Move Left** | <kbd>←</kbd> (Left Arrow) |
| **Move Right** | <kbd>→</kbd> (Right Arrow) |
| **Start / Pause / Resume** | <kbd>Space</kbd> or On-Screen Button |
| **Play Again (After Game Over)** | <kbd>Space</kbd> or <kbd>PLAY AGAIN</kbd> Button |

### Mobile & Tablet
| Action | Gesture / Touch |
| :--- | :--- |
| **Steer Snake** | Tap on-screen **D-Pad** (▲, ▼, ◀, ▶) OR **Swipe** anywhere on the board |
| **Start / Resume** | Tap <kbd>START</kbd> or <kbd>RESUME</kbd> overlay button |

---

## ⚙️ Architecture & Core Working

### 1. Grid & Coordinate Mapping
The board is an 18 × 18 grid totaling 324 individual cells. Instead of redrawing a canvas context, the game maps 2D coordinates `(row, col)` to a 1D element array:
$$\text{index} = \text{row} \times 18 + \text{col}$$

### 2. State Machine
The game operates under four strictly defined states:
```
[ idle ] ──( Start / Arrow Key )──> [ playing ] ──( Collision )──> [ dead ]
                                         │  ▲
                               ( Pause ) │  │ ( Resume )
                                         ▼  │
                                     [ paused ]
```
- **`idle`**: Board initialized, waiting for player input.
- **`playing`**: `setInterval` tick loop running at 100ms intervals.
- **`paused`**: Interval paused, music halted, pause overlay visible.
- **`dead`**: Collision detected, death animation and sound triggered, game over overlay displayed.

### 3. Movement & Direction Vectors
Movement is modeled using directional delta objects:
```javascript
const DIR_MAP = {
  ArrowUp:    { r: -1, c:  0 },
  ArrowDown:  { r:  1, c:  0 },
  ArrowLeft:  { r:  0, c: -1 },
  ArrowRight: { r:  0, c:  1 },
};
```
Every 100ms tick, the new head position is calculated by adding the vector:
$$\text{newHead} = \{ r: \text{head}.r + \text{dir}.r,\; c: \text{head}.c + \text{dir}.c \}$$
The new head is added to the front of the snake array (`unshift`). If food was not eaten on this tick, the tail is removed (`pop`).

### 4. Input Queue Buffer
To guarantee responsive controls during rapid key presses, inputs are pushed to an `inputQueue`:
```javascript
if (inputQueue.length < 2) {
  const last = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : dir;
  if (!isOpposite(newDir, last)) inputQueue.push(newDir);
}
```
At every tick, the next move is shifted from the queue, preventing dropped inputs or self-collisions.

### 5. Adaptive Food Generator
Food position avoids infinite trial-and-error loops:
- **Sparse Board (< 75% occupied)**: Random generation with `do...while` re-rolls.
- **Dense Board (≥ 75% occupied)**: Scans and collects all empty cells, randomly selecting directly from the remaining free list.
- **Full Board (324 cells)**: Triggers the `YOU WIN!` sequence cleanly.

---

## 📁 Project Structure

```
SnakeGame/
├── css/
│   └── style.css          # Design system, themes, animations & responsive layout
├── img/
│   └── bgi.jpg            # Board background texture
├── js/
│   └── index.js           # Core game engine, tick loop, input & audio logic
├── music/
│   ├── move.mp3           # Turning & movement sound effect
│   ├── eating.mp3         # Food consumption sound effect (aliased with gun.mp3)
│   ├── gameover.mp3       # Death sound effect (aliased with daya.mp3)
│   └── background.mp3     # Ambient background music
├── index.html             # Markup structure, overlays, theme switch & touch D-Pad
└── README.md              # Project documentation
```

---

## 🚀 How to Run

### Method 1: Direct File Launch
Double-click [index.html](file:///c:/Users/LENOVO/OneDrive/Desktop/codes/SnakeGame/index.html) or run in your terminal:
```powershell
start index.html
```

### Method 2: Live Server (VS Code / Antigravity IDE)
1. Open the project in Antigravity or VS Code.
2. Right-click [index.html](file:///c:/Users/LENOVO/OneDrive/Desktop/codes/SnakeGame/index.html) and select **Open with Live Server** (or click **Go Live** on the status bar).
3. The game will open at `http://127.0.0.1:5500/index.html`.

### Method 3: Local HTTP Server
Using **Python**:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000` in your web browser.

Using **Node.js**:
```bash
npx serve .
```

---

## 📜 License
This project is open-source and available under the [MIT License](LICENSE). Feel free to customize, modify, and build upon it!