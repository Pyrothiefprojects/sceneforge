# SceneForge

## What It Is
SceneForge is a browser-based point-and-click puzzle game editor and engine built entirely in vanilla JavaScript. It includes a visual editor for designing scenes, hotspots, inventory items, interactive puzzles, and game progression — and a built-in play mode for testing the whole thing as a player would experience it.

## Build Log
- **Session 1:** 2:00 AM – 5:00 AM, Feb 11 — Core engine (scenes, hotspots, inventory, puzzles, play mode, game state)
- **Session 2:** 4:00 PM – 10:00 PM, Feb 11 — Puzzle assets, combo lock, asset grouping, puzzle hotspots, action config unification, dialogue fixes, state change toggles, scene image generation (Sora), transition animation planning
- **Session 3:** 12:00 AM – 4:30 AM, Feb 12 — Transition animations (PNG sequences + video), loop animations with placement/scale/reverse, reverse frames for state transitions, edit scene backgrounds
- **Total build time:** ~13.5 hours (so far)

## How It Works
- Single HTML page — no frameworks, no bundler, no server required
- Visual editor with toolbar sections for Scenes, Hotspots, Inventory, Puzzles, and Game State
- Scenes are static backgrounds (PNG/WebP/JPEG) with polygon hotspot zones drawn on a canvas overlay
- Each scene supports multiple **states** — alternate backgrounds with independent hotspots (e.g. door closed vs open)
- Hotspots trigger actions: show a clue, navigate to another scene, pick up an item, accept an item, or open a puzzle
- Puzzles open in a full overlay with their own background, interactive assets (combo locks, etc.), and hotspots
- Puzzle assets can be grouped together — all members must be solved before the group action fires
- A unified action system is shared across scene hotspots, puzzle hotspots, and puzzle assets
- Hotspots and assets auto-generate progression flags based on their name and action type
- Progression system with ordered hint steps tied to those flags
- **Transition animations** — state changes can play stepped PNG frame sequences or embedded video clips as cinematic transitions
- **Loop animations** — hotspots can have continuously cycling frame animations overlaid on the scene or puzzle (e.g. flickering lights, flowing water)
- Projects save/load as self-contained JSON files (all images and videos embedded as data URLs)

## Tech Stack
- **HTML** — single page shell
- **JavaScript** — engine, editor modules, all game logic (IIFE modules, no build step)
- **CSS** — dark theme UI (pyrothief.ca aesthetic)
- **Canvas API** — scene rendering, hotspot polygon drawing and hit-testing
- **SVG** — puzzle hotspot rendering within puzzle overlays
- **PNG / WebP / JPEG** — scene backgrounds, puzzle graphics, item icons, animation frames (embedded as data URLs)
- **MP4 / WebM** — optional video transitions for state changes (embedded as data URLs)

## Project Structure
```
/sceneforge
├── index.html                  # Single page app shell
├── css/
│   └── editor.css              # All styling (dark theme, panels, overlays, animations)
├── js/
│   ├── app.js                  # Bootstrap and initialization
│   ├── canvas.js               # Canvas rendering, fit-to-screen, coordinate transforms
│   ├── scene-manager.js        # Scene CRUD, states, drag reorder, import/export
│   ├── hotspot-editor.js       # Polygon drawing, selection, drag handles, popover config
│   ├── inventory-editor.js     # Item management, item card UI, use counts
│   ├── puzzle-editor.js        # Puzzle management, states, rewards config, clue toggle
│   ├── puzzle-assets.js        # Asset type registry, placement, grouping, solve logic
│   ├── puzzle-hotspot-editor.js# Polygon hotspots within puzzle overlays (SVG)
│   ├── action-config.js        # Shared action dropdown, state change, and loop animation UI
│   ├── transition-player.js    # PNG frame sequence and video playback for state transitions
│   ├── loop-animator.js        # Continuous frame loop overlays (scene and puzzle modes)
│   ├── game-state.js           # Flags, inventory, scene/puzzle state, progression, overview
│   ├── play-mode.js            # Play mode runtime (actions, cursors, overlays, dialogue)
│   ├── toolbar.js              # Toolbar sections, panel rendering, mode switching, save/load
│   └── assets/
│       └── combo-lock.js       # Combo lock puzzle asset type
├── assets/
│   ├── scenes/                 # Scene background images (user-provided)
│   └── items/                  # Inventory item icons (user-provided)
├── data/                       # Project data files
└── README.md
```

## Editor Features

### Scenes
- Add scenes from PNG/WebP/JPEG images — each becomes a navigable location
- Drag-and-drop reordering in the scene list
- Inline rename by clicking the scene name
- Multiple **scene states**: add alternate backgrounds with independent hotspots (e.g. a room before and after solving a puzzle)
- State widget on each scene card to add, navigate, and remove states
- **Edit background** — replace the background image for any state without losing hotspots

### Hotspots
- Draw polygon hotspots directly on the canvas by clicking to place vertices
- Close the polygon by clicking near the start point or double-clicking
- Right-click to cancel, Ctrl+Z to undo the last point
- Select hotspots to see drag handles on each vertex for reshaping
- Popover config with:
  - **Name** — used for auto-flag generation
  - **Action** — what happens when the player clicks (see Action System below)
  - **Requires** — prerequisite flags that must be set before this hotspot is interactive
  - **State Change** — optionally transition the scene to a different state, with optional PNG frame sequence or video transition, configurable speed, and reversible frame order
  - **Loop Animation** — attach a cycling frame sequence overlay to the hotspot (e.g. flickering light, spinning gear), with configurable speed, scale (5%–200%), reverse playback, and click-to-place positioning on the canvas

### Inventory
- Define items with a name, icon image, and use count (1, 2, 3, or infinite)
- Items are picked up via hotspot actions and stored in the player's inventory
- Items can be selected from the inventory overlay and used on hotspots that accept them
- Uses are tracked — items are auto-removed from inventory when uses are exhausted

### Puzzles
- Define puzzles with a name, background image, and optional rewards
- **Clue toggle** — mark a puzzle as a "clue" (visual-only, no interactive assets)
- **Reward item** — automatically added to inventory when the puzzle is solved
- **Reward scene state** — trigger a scene state change on completion (e.g. unlock a door)
- **Completion text** — dialogue shown when the puzzle is solved
- Click the preview button on a puzzle card to open the **puzzle overlay editor**:
  - Full overlay with the puzzle background image
  - **Asset placement**: select an asset type, click "+ Place", click on the background to position it
  - **Asset configuration**: click any asset to open its popover (name, action, requires, state change)
  - **Asset grouping**: click "Connect", select 2+ assets, name the group — linked assets must all be solved before the group action fires, shown with color-coded SVG connector lines
  - **Puzzle hotspots**: draw polygon hotspots inside the puzzle (same tool as scenes, rendered as SVG)
  - **Multi-state puzzles**: add states with different backgrounds and independent asset/hotspot layouts, navigate between them with the state widget

### Game State
- **Flags panel** — checkbox list of all auto-discovered flags across scenes and puzzles (useful for debugging)
- **Progression panel** — ordered list of hint steps, each tied to a flag; drag to reorder; in play mode, the Hint button reveals the next unsolved step
- **Level overview** — summary of all scenes, their hotspots and actions, items, and puzzles in one view

## Action System

Every interactive element (scene hotspot, puzzle hotspot, puzzle asset, asset group) shares the same action configuration via `ActionConfig`:

| Action | What it does | Auto-flag pattern |
|--------|-------------|-------------------|
| No Action | Does nothing (just sets the auto-flag) | `clicked_[name]` |
| Clue | Shows dialogue text, optionally opens a clue visual | `examined_[name]` |
| Navigate | Switches to another scene | `visited_[scene]` |
| Pick Up Item | Adds an item to the player's inventory | `has_[item]` |
| Accepts Item | Consumes the selected inventory item | `used_[item]_on_[name]` |
| Trigger Puzzle | Opens a puzzle overlay | `solved_[name]` |

Each element can also have:
- **Requires** — a list of flags that must be set before the element is interactive (otherwise shows "Something needs to happen first...")
- **State Change** — independently transition the scene or puzzle to a different state (can combine with any action or use alone with "No Action"), with:
  - **Transition frames** — load a PNG sequence to play as a stepped animation during the state change (configurable speed, 30–500ms per frame)
  - **Transition video** — load an MP4/WebM clip to play instead of frames
  - **Reverse frames** — play the frame sequence in reverse order (reuse the same frames for forward/backward transitions)
- **Loop Animation** — attach a continuously cycling frame overlay to the hotspot, with configurable speed, scale, reverse, and visual placement tool

## Puzzle Asset Types

Assets are interactive elements placed inside puzzle overlays. Each type registers itself with `PuzzleAssets.registerType()`:

### Combo Lock
- Rotatable number dial (0–9) with left/right arrow buttons
- Configurable correct value per lock
- Green highlight when solved
- Multiple locks can be grouped — all must show the correct value to solve

### Adding New Asset Types
Register a type definition with these methods:
```js
PuzzleAssets.registerType({
    type: 'my_asset',
    label: 'My Asset',
    create(x, y) { /* return asset object */ },
    render(asset, editMode) { /* return HTML string */ },
    bindPlay(el, asset) { /* attach click handlers */ },
    checkSolved(asset) { /* return true/false */ },
    markSolved(el, asset) { /* visual feedback */ },
    resetRuntime(asset) { /* clear runtime state */ },
    popoverFields(asset) { /* return config HTML */ },
    bindPopover(popoverEl, asset, getEl) { /* bind config events */ }
});
```

## Play Mode

Press the **Play** button to enter play mode. The editor UI hides and the game becomes interactive:

- **Cursor feedback** — cursor changes based on what the player is hovering: magnifying glass for clues/puzzles, arrows for navigation, grab hand for pickups, pointer for item targets
- **Inventory overlay** — click the bag icon to open; click an item to select it (custom item cursor appears); click a hotspot that accepts that item to use it
- **Puzzle overlays** — open when a puzzle hotspot is clicked; interact with assets (rotate combo locks, etc.); click Continue to check the solution
- **Dialogue box** — appears at the bottom of the screen for clue text, pickup confirmations, and puzzle completion; auto-dismisses after 10 seconds or click to dismiss immediately
- **Hint system** — click the lightbulb icon to see the next hint from the progression list based on which flags the player has collected
- **State transitions** — hotspots and assets can trigger state changes with animated PNG frame sequences or embedded video transitions, swapping backgrounds and hotspot layouts
- **Loop animations** — continuously cycling frame overlays play on scene and puzzle hotspots, correctly scaled and positioned relative to the viewport
- **ESC** to return to edit mode

## Architecture
All modules use the IIFE revealing module pattern:
```js
const Module = (() => {
    // private state and functions
    return { /* public API */ };
})();
```
No build step, no imports — scripts load in dependency order via `<script>` tags. Module dependencies are resolved by load order in `index.html`.

## Animation Workflow
1. Create a transition video (e.g. cryo pod opening, door sliding) in any video tool or AI generator (Sora, etc.)
2. Rip the video into a PNG frame sequence using an external MP4-to-PNG converter (currently a local Java tool — planned as a built-in JS utility)
3. Use the **first frame** as the "before" state background and the **last frame** as the "after" state background — this keeps transitions visually seamless when navigating between states
4. Load the frame sequence into the state change transition panel and configure speed/reverse as needed
5. Optionally load the original video as an alternative to the PNG sequence (higher quality, larger file size)

This workflow ensures that state backgrounds match the transition endpoints exactly, so there's no visual pop when the animation starts or ends.

## Save / Load
- **Save** — downloads a `sceneforge-project.json` file containing all scenes, items, puzzles, progression steps, images, animation frames, and videos (as embedded data URLs)
- **Load** — upload a project JSON to restore the full editor state
- Includes backwards-compatible migration for older project formats

## Hosting
- GitHub Pages (static hosting)
- Repo: Pyrothiefprojects/sceneforge
- All client-side, no backend required

## Development
- VS Code with Claude Code extension
- GitHub for version control and hosting
- Local dev via Live Server or `npx serve`
