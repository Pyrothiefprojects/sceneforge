# SceneForge – Project Synopsis

## What It Is
SceneForge is a browser-based point-and-click puzzle game built entirely in JavaScript. The engine and game are one project – purpose-built for this specific game, not a generic engine for others to use.

## How It Works
- Single HTML page application – no page reloads, no server required
- Scenes are static AI-generated PNG backgrounds with interactive hotspot zones layered on top
- Clicking hotspots triggers actions: navigate to another scene, examine something, open a puzzle, pick up an item
- Each level consists of approximately 4 scenes that players navigate between
- All scene definitions, puzzle configs, and game data are written directly in JavaScript

## Puzzle Types Planned
- **Combination locks** – enter codes to unlock things
- **Rotating wheels / dials** – turn elements to correct positions
- **Hidden object / find and click** – locate specific items in a scene
- **Inventory system** – pick up items, combine them, use them on scene objects
- **Match grid (Bejeweled-style)** – align items to form groups, with animations (flashing, assets traveling across screen)

## Tech Stack
- **HTML** – single page shell
- **JavaScript** – engine, puzzle modules, all game logic, scene/puzzle definitions
- **CSS** – minimal UI styling (menus, dialogue boxes, inventory panels)
- **PNG / WebP** – AI-generated scene backgrounds, puzzle graphics, item icons
- **MP3 / OGG** – sound effects, music, ambient audio

## Project Structure
```
/sceneforge
├── index.html
├── /css
│   └── game.css
├── /js
│   ├── /engine
│   │   ├── core.js
│   │   ├── scene-manager.js
│   │   ├── input-handler.js
│   │   ├── state-manager.js
│   │   ├── audio-manager.js
│   │   ├── asset-loader.js
│   │   └── animation.js
│   ├── /puzzles
│   │   ├── combination-lock.js
│   │   ├── rotating-wheel.js
│   │   ├── hidden-object.js
│   │   ├── inventory.js
│   │   └── match-grid.js
│   ├── /scenes
│   │   ├── level1.js
│   │   └── level2.js
│   └── /ui
│       ├── inventory-panel.js
│       ├── dialogue-box.js
│       └── menu.js
├── /assets
│   ├── /scenes
│   ├── /puzzles
│   ├── /audio
│   ├── /items
│   └── /ui
└── README.md
```

## Graphics & Assets
- All scene art and most visuals are AI-generated
- Puzzle-specific animations (locks, wheels, match-grid effects) are hand-crafted in code
- Simple atmospheric animations possible (flickering lights, ambient effects)
- Cutscenes are static/stationary – no complex animation system needed

## Hosting
- GitHub Pages (static hosting, free)
- Repo: Pyrothiefprojects/sceneforge
- All client-side, no backend required
- Player saves via localStorage (browser-local only)

## Development Environment
- VS Code with Claude Code extension (primary)
- GitHub for version control and hosting
- Local dev server (Live Server extension or npx serve) for testing
- Browser for playtesting
