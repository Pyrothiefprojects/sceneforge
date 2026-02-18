# SceneForge

## What It Is
SceneForge is a browser-based point-and-click puzzle game editor and engine built entirely in vanilla JavaScript. It includes a visual editor for designing scenes, hotspots, inventory items, interactive puzzles, and game progression — and a built-in play mode for testing the whole thing as a player would experience it.

## How It Works
- Single HTML page — no frameworks, no bundler, no server required
- Visual editor with toolbar sections for Scenes, Hotspots, Inventory, Puzzles (with Ideogram sub-editor), Game State (with Blueprint sub-editor), and Image
- Scenes are static backgrounds (PNG/WebP/JPEG) with polygon hotspot zones drawn on a canvas overlay
- Each scene supports multiple **states** — alternate backgrounds with independent hotspots (e.g. door closed vs open)
- **Scene assets** — persistent images placed on scenes with per-state positioning, visibility, layering, and flip transforms
- Hotspots trigger actions: show a clue, navigate to another scene, pick up an item, accept an item, open a puzzle, or solve a puzzle
- Hotspots can show/hide scene assets, move assets to target locations, and clear sibling hotspots across states
- **Hotspot connections** — link hotspots together for coordinated actions like move-asset targeting
- Puzzles open in a full overlay with their own background, interactive assets (combo locks, etc.), and hotspots
- Puzzle assets can be grouped together — all members must be solved before the group action fires
- A unified action system is shared across scene hotspots, puzzle hotspots, and puzzle assets
- Hotspots and assets auto-generate progression flags based on their name and action type
- Progression system with ordered hint steps tied to those flags
- **Transition animations** — state changes can play stepped PNG frame sequences or embedded video clips as cinematic transitions
- **Loop animations** — hotspots can have continuously cycling frame animations overlaid on the scene or puzzle (e.g. flickering lights, flowing water)
- **Audio** — per-scene background music (looping, crossfades on scene change) and per-action sound effects on hotspots, puzzle assets, and puzzle hotspots
- **Play mode** — toolbar hides, floating transparent overlay buttons (Edit, Hint, Inventory) appear on-screen, right-click opens a radial inventory wheel for item selection
- Projects save/load as self-contained JSON files (images and videos embedded as data URLs)
- **Export** produces a deployment-ready `project-data.js` with path-based asset references (relative paths to files in `assets/`)
- **Asset preloader** — on startup, scans all asset URLs from the project data and preloads images, videos, and audio files in parallel with a progress bar before the game begins

## Tech Stack
- **HTML** — single page shell
- **JavaScript** — engine, editor modules, all game logic (IIFE modules, no build step)
- **CSS** — dark theme UI (pyrothief.ca aesthetic)
- **Canvas API** — scene rendering, asset compositing, hotspot polygon drawing and hit-testing, ideogram editor
- **SVG** — puzzle hotspot rendering within puzzle overlays, connection lines
- **PNG / WebP / JPEG** — scene backgrounds, puzzle graphics, item icons, animation frames
- **MP4 / WebM** — optional video transitions for state changes
- **MP3 / WAV / M4A / AAC** — background music and sound effects (HTML5 Audio)
- **File System Access API** — save ruin images directly to disk (Chrome/Edge)

## Project Structure
```
/sceneforge
├── index.html                  # Single page app shell
├── css/
│   └── editor.css              # All styling (dark theme, panels, overlays, animations)
├── js/
│   ├── app.js                  # Bootstrap, preloader, auto-load
│   ├── canvas.js               # Canvas rendering, fit-to-screen, coordinate transforms, scene assets
│   ├── scene-manager.js        # Scene CRUD, states, drag reorder, import/export, hotspot connections
│   ├── hotspot-editor.js       # Polygon drawing, selection, drag handles, popover config, connections
│   ├── inventory-editor.js     # Item management, item card UI, use counts
│   ├── puzzle-editor.js        # Puzzle management, states, rewards config, clue toggle
│   ├── puzzle-assets.js        # Asset type registry, placement, grouping, solve logic
│   ├── puzzle-hotspot-editor.js# Polygon hotspots within puzzle overlays (SVG)
│   ├── action-config.js        # Shared action dropdown, state change, loop, sound, asset change, move asset UI
│   ├── transition-player.js    # PNG frame sequence and video playback for state transitions
│   ├── loop-animator.js        # Continuous frame loop overlays (scene and puzzle modes)
│   ├── audio-manager.js        # Background music and sound effect playback (HTML5 Audio)
│   ├── game-state.js           # Flags, inventory, scene/puzzle state, progression, asset/hotspot clearing
│   ├── play-mode.js            # Play mode runtime (actions, cursors, overlays, dialogue, radial wheel)
│   ├── blueprint-editor.js     # Blueprint spatial planning canvas (grid, tools, scene inheritance, item drag)
│   ├── ideogram-editor.js      # Ideogram ruin puzzle editor (placement, rotation, color, cut, resize, text)
│   ├── image-editor.js         # Image loading, preview, and 16:9 crop tool
│   ├── preloader.js            # Asset preloader with progress bar
│   ├── toolbar.js              # Toolbar sections, panel rendering, mode switching, save/load/export
│   └── assets/
│       ├── combo-lock.js       # Combo lock puzzle asset type
│       └── console-terminal.js # Console terminal puzzle asset type
├── assets/                     # All game assets (images, frames, videos, audio)
│   ├── scenes/                 # Scene background images
│   ├── items/                  # Inventory item icons
│   ├── puzzles/                # Puzzle background images
│   ├── transitions/            # PNG frame sequences and video clips
│   └── audio/                  # Background music and sound effect files
├── data/
│   └── project-data.js         # Exported project data (path-based asset references)
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
- **Scene music** — click the music note on a scene card to assign a looping background track (highlights gold when set); music crossfades automatically when navigating between scenes

### Scene Assets
- Place persistent asset images on any scene — separate from the background
- **Per-state visibility** — toggle which states each asset appears in
- **Per-state positioning** — each asset can have different position and size per state
- **Layering** — control render order with layer values (higher layers draw on top)
- **Flip H / Flip V** — mirror assets horizontally or vertically per state
- **Fade transitions** — assets can fade in/out smoothly when shown or hidden at runtime
- **Linked items** — optionally associate an asset with an inventory item
- Assets are rendered on the canvas with the scene background, correctly scaled and positioned

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
  - **Sound Effect** — attach an audio file that plays when the hotspot is clicked
  - **Asset Change** — show or hide a scene asset when the hotspot is activated
  - **Move Asset** — reposition a scene asset by dragging it to a connected target hotspot
  - **Clear after click** — hotspot becomes invisible and inactive after first interaction
  - **Clear group** — when activated, also clears all sibling hotspots that share the same item or asset and are spatially overlapping (prevents duplicate collection across states)

### Hotspot Connections
- **Connect mode** — click the Connect button, select 2+ hotspots (across any state), confirm to create a named connection group
- Visual SVG connector lines between connected hotspots (color-coded)
- Used by the **move asset** system to define valid drop targets
- Stored per-scene and preserved across save/load

### Inventory
- Define items with a name, icon image, and use count (1, 2, 3, or infinite)
- Items are picked up via hotspot actions and stored in the player's inventory
- Items can be selected from the inventory overlay or radial wheel and used on hotspots that accept them
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
- **Blueprint mode** — toggles a spatial planning canvas for organizing game structure and scene relationships

### Blueprint Editor
- Visual spatial planning tool for organizing how scenes, items, and game elements connect
- Toggle between normal Game State view and Blueprint mode
- **Grid-based canvas** — 40px grid snapping for consistent spatial layout
- **Right-side tools panel** — popout panel with 6 placement tools:
  - **Room** — drag to create rectangular room boundaries, link to scenes, assign colors
  - **Door** — drag to place doors between rooms, auto-detects touching rooms, links to scenes and puzzles
  - **Window** — drag to place window overlays, links to scenes and puzzles
  - **Asset** — drag to place scene asset references inside rooms, inherits scene from parent room
  - **Perspective** — click to place alternate viewpoints inside rooms, inherits scene from parent room
  - **Item** — click to open radial menu of game items, place anywhere, drag to reposition after placement
- **Tool toggle behavior** — click a tool to activate, click again to deselect and return to select mode
- **Spatial detection** — rooms auto-detect which elements are inside them (assets, perspectives, windows, items)
- **Scene inheritance** — perspectives and assets automatically inherit their scene from the parent room
- **Config popovers** — click any element to configure properties:
  - Smart positioning avoids collision with left panel (game state) and right panel (tools)
  - Auto-repositions to stay visible within viewport
  - Type-specific fields for linking scenes, puzzles, and assets
- **Categorized list view** — "By Room" structure showing:
  - Each room with its contained elements (assets, perspectives, windows, items)
  - Doors section (positioned between/outside rooms)
  - Out of bounds section (items placed outside any room)
  - Click any list item to select and highlight that element on the canvas
- **Item dragging** — placed items can be repositioned by clicking and dragging (grid-snapped)
- **Data persistence** — blueprint saved with project JSON and exported with deployment data
- **Use cases:**
  - Map out spatial relationships between scenes before building them
  - Plan multi-room puzzles and item placement
  - Visualize door/window connections and scene flow
  - Organize collectible item locations across rooms

### Ideogram Editor
A standalone ruin-based puzzle editor for creating alien symbol layouts. Accessed via the **Ideogram** toggle button at the top of the Puzzle panel (swaps between puzzle cards and ideogram cards, same pattern as Game State / Blueprint).

- **Shared canvas** — uses the same canvas as Blueprint editor; activating one deactivates the other
- **White canvas** with optional grey reference gridlines (toggle in tools panel)
- **Asset Codex** — load PNG images as reusable ruin symbols via the "+ Add" button (multi-file select)
- **Radial wheel placement** — select the Asset tool, click the canvas, pick a ruin from the radial wheel; places at the image's natural pixel dimensions (not grid-constrained)
- **Rotation dial** — select a placed ruin or drawn shape to show circular rotation buttons (0°, 90°, 180°, 270°), mirror toggle, and delete button
- **Select mode resize** — selecting any element (ruin, text, or box) shows 8 drag handles (corners + edges); drag to resize with no grid constraint (snaps to grid only when grid is visible); "Lock Aspect" checkbox (default ON) constrains resize to maintain the original width/height ratio; handles and selection border rotate with the element
- **Color tool** — click a ruin with the Color tool active to open a popover with:
  - Native color picker
  - 5 modes: None, Transparency (opacity slider), Background (colored rect behind image), Tint (multiply blend), Full Color (silhouette replacement)
  - Live preview on every change
- **Ideogram tool** — drawing tool for constructing ideogram geometry from basic shapes:
  - **Sub-tools**: Line and Circle, selectable from a sub-tool row that appears when the tool is active; clicking an active sub-tool deselects it
  - **Grid auto-show** — activating the tool automatically enables the grid; restores previous grid state when switching away
  - **Line tool** — click two points on the canvas to draw a straight line; constrained to horizontal, vertical, or 45° diagonal angles; 2 grid cells thick; grid-snapped endpoints
  - **Circle tool** — click a center point and drag outward to draw a ring (stroke only, not filled); 2 grid cells thick; radius expands from the clicked center
  - **Default color** — all shapes draw in black; recolor later with the existing Color tool
  - **Shape selection** — drawn shapes can be selected, repositioned, and resized using the Select tool (same 8-handle resize as ruins and text)
  - **Shape color/thickness** — click a shape with the Color tool to adjust its color and stroke thickness via popover
  - **Delete** — press Delete/Backspace to remove the selected shape, or use the delete button on the rotation dial
- **Cut tool** — two-phase cut workflow with interactive selection:
  - **Rectangle mode** — click and drag to draw a selection box (dashed orange outline while drawing, solid when finalized)
  - **Polygon mode** — click individual points to build an N-sided polygon; close by clicking near the first point; supports triangles, pentagons, or any shape; grid-snapped when grid is on
  - On finalization, a **Move / Cut** context menu appears at the cursor
  - **Move** — reposition the selection (box or polygon) by dragging; menu reappears on release
  - **Cut** — captures the content inside the selection (ruins, text, drawn shapes — no grid lines) via offscreen canvas rendering on a transparent background; polygon cuts use canvas clipping
  - Cut stamp follows the cursor as a semi-transparent ghost; click to place — prompts for a name that appears in the Asset Codex and radial wheel
  - Click outside the selection to discard it and start a new one
  - Non-destructive: original content remains after cutting
- **Text tool** — click or drag an area on the canvas to create a text box:
  - Inline editor with textarea, font size control, color picker
  - Word-wrapping within the defined box
  - Text elements are movable in select mode (click to select, click again to drag)
  - Supports delete from the text editor panel
- **Save Asset** — select a placed ruin or drawn shape, click "Save" in the tools panel to export as a PNG:
  - For ruins: renders with all color effects, rotation, and mirror applied
  - For shapes: captures everything within the selected shape's bounding box (all overlapping shapes, ruins, and text) — content-aware export
  - File System Access API save-as dialog (Chrome/Edge) or fallback download
  - Prompts for a name; the saved asset is automatically added to the Asset Codex
- **Zoom** — slider in the tools panel (25%–400%) scales the entire canvas uniformly:
  - Grid lines, ruins, text, boxes, selection previews all scale together
  - Mouse interactions remain accurate at all zoom levels
  - Grid lines stay visually thin at any zoom level
  - Popovers and rotation dial position correctly relative to zoomed elements
  - Zoom level persists per ideogram
- **Custom scrollbars** — dark-themed scrollbar tracks appear on the canvas edges when content extends beyond the viewport:
  - Horizontal and vertical scrollbar thumbs for panning the viewport
  - Drag thumbs or click the track to jump
  - Mouse wheel / trackpad panning support
  - Content-aware: scrollbar range expands to cover all placed elements (ruins, text, shapes) plus padding
  - Styled to match the editor's dark theme (rust/orange hover accents)
- **Grid toggle** — "Show Grid" checkbox in tools panel; when ON, resize/move/cut/text snap to the 40px grid; when OFF (default), everything is free-form; Add Ruin never snaps
- **IsoMark compositor** — panel-based tool for compositing ruins onto a static plate background image:
  - Upload a plate image via the "Set Plate" button (persists as the background for all composites)
  - Click any placed ruin on the canvas to overlay it centered on the plate in a live preview
  - Ruin appears at proportional size relative to the plate — resize the ruin on canvas to adjust its size on the plate
  - All ruin effects are preserved in the composite (color, rotation, mirror, opacity)
  - "Save Plate" exports the flattened composite as a PNG and adds it to the Asset Codex
  - Requires a local HTTP server for PNG export (`python3 -m http.server`)
- **Right-click deselect** — right-clicking anywhere on the ideogram canvas deselects the active tool and returns to select mode
- **Tool locking** — when a tool (Color, Cut, Text, Ideogram) is active, the rotation dial is suppressed; switching tools or clicking the active tool again cleans up all tool-specific UI
- **Ideogram cards** — each ideogram appears as a card in the sidebar with click-to-switch, inline rename, delete, and click-to-set thumbnail (white background, displays associated PNG); cards show asset and ideogram counts
- **Multiple ideograms** — create separate ideogram layouts, each with its own placed ruins, text, drawn shapes, cut areas, and viewport position/zoom
- **Data persistence** — all ideogram data (ruin library, placed ruins with color/size/rotation, text elements, drawn shapes, cut rects, viewport with zoom) is included in project save/load/export

### Image Editor
- Load multiple images for preview and editing
- Display loaded images in a card list with dimensions and thumbnails
- **16:9 crop tool** — interactive crop selection with constrained aspect ratio, corner handles, drag to move/resize, and live dimension display
- Download cropped images as PNG files
- Load any image to the canvas for preview

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
| Solve Puzzle | Attempts to solve the active puzzle, with optional success text | `solved_[name]` |

Each element can also have:
- **Requires** — a list of flags that must be set before the element is interactive (otherwise shows "Something needs to happen first...")
- **State Change** — independently transition the scene or puzzle to a different state (can combine with any action or use alone with "No Action"), with:
  - **Transition frames** — load a PNG sequence to play as a stepped animation during the state change (configurable speed, 30–500ms per frame)
  - **Transition video** — load an MP4/WebM clip to play instead of frames
  - **Reverse frames** — play the frame sequence in reverse order (reuse the same frames for forward/backward transitions)
- **Loop Animation** — attach a continuously cycling frame overlay to the hotspot, with configurable speed, scale, reverse, and visual placement tool
- **Sound Effect** — attach an audio file (MP3/WAV/M4A/AAC) that plays as a one-shot when the element is activated
- **Asset Change** — show or hide a scene asset (with optional fade transition)
- **Move Asset** — enter pick mode to drag a scene asset to a connected target hotspot

## Puzzle Asset Types

Assets are interactive elements placed inside puzzle overlays. Each type registers itself with `PuzzleAssets.registerType()`:

### Combo Lock
- Rotatable number dial (0–9) with left/right arrow buttons
- Configurable correct value per lock
- Green highlight when solved
- Multiple locks can be grouped — all must show the correct value to solve

### Console Terminal
- Retro green-on-black terminal screen with blinking cursor
- Player types commands and presses Enter
- Configurable correct command (e.g. `UNLOCK`, `OVERRIDE`, `1234`)
- Wrong commands display configurable error text (default: "ACCESS DENIED")
- Correct command displays success text and marks the asset as solved
- Configurable: prompt character, error text, success text
- Green glow border on solve

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

Press the **Play** button to enter play mode. The toolbar slides away and the game fills the full window:

- **Floating overlay buttons** — transparent Edit, Hint, and Inventory buttons float at the top-right corner of the game viewport
- **Radial inventory wheel** — right-click anywhere to open a circular wheel of collected inventory items; left-click an item to select it (cursor changes to item icon), click outside to dismiss; works in both the main scene and inside puzzle overlays
- **Cursor feedback** — default cursor for non-interactive areas, grab hand for interactive hotspots, item cursor when an item is selected
- **Inventory overlay** — click the inventory button to open a full grid panel; click an item to select it; click a hotspot that accepts that item to use it
- **Pick mode** — hotspots with move-asset actions enter pick mode: a ghost image follows the cursor, click a connected target hotspot to drop the asset there, ESC to cancel
- **Puzzle overlays** — open when a puzzle hotspot is clicked; interact with assets (rotate combo locks, type terminal commands, etc.); right-click to open the radial wheel inside puzzles
- **Dialogue box** — typewriter-animated text with frosted glass backdrop; click once to skip animation, click again to dismiss; action dialogues (pickup, accept item, move asset) auto-dismiss after 3 seconds, other dialogues auto-dismiss after 10 seconds; new dialogues immediately replace the current one
- **Hint system** — click the hint button to see the next hint from the progression list based on which flags the player has collected
- **State transitions** — hotspots and assets can trigger state changes with animated PNG frame sequences or embedded video transitions, swapping backgrounds and hotspot layouts
- **Loop animations** — continuously cycling frame overlays play on scene and puzzle hotspots, correctly scaled and positioned relative to the viewport
- **Background music** — scene music starts looping on the player's first click (browser autoplay restriction); crossfades smoothly when navigating to a scene with different music; stops when exiting play mode
- **Sound effects** — one-shot or looping audio plays when clicking hotspots, puzzle assets, or puzzle hotspots that have a sound assigned; looping sounds auto-stop on scene change or puzzle close
- **Clear after click** — one-time hotspots disappear after interaction (cursor no longer shows grab hand)
- **Clear group** — collecting an item clears all sibling hotspots across states that share the same item and spatially overlap, preventing duplicate collection
- **ESC** to close the radial wheel, exit pick mode, or return to edit mode (in that priority order)

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

## Save / Load / Export
- **Save** — downloads a `sceneforge-project.json` file containing all scenes, items, puzzles, progression steps, images, animation frames, and videos (embedded as data URLs for portability)
- **Load** — upload a project JSON to restore the full editor state
- **Export** — generates `project-data.js` with path-based asset references instead of data URLs, ready for deployment alongside the asset files in `assets/`
- Includes backwards-compatible migration for older project formats

## Deployment
The exported game is fully static — no server-side code required.

1. **Export** the project from the editor (Export button in toolbar)
2. Place the exported `project-data.js` in `data/`
3. Place all asset files in the `assets/` folder structure matching the paths in the export
4. Host the entire folder on any static host (GitHub Pages, Netlify, etc.)

On load, the preloader scans all asset URLs from `window.SCENEFORGE_PROJECT`, preloads every image, video, and audio file in parallel with a progress bar, then auto-starts play mode.

### Live
- **Site:** [pyrothief.ca/sceneforge](https://pyrothief.ca/sceneforge/)
- **Repo:** [Pyrothiefprojects/sceneforge](https://github.com/Pyrothiefprojects/sceneforge)
- Hosted via GitHub Pages

## Development
- VS Code with Claude Code extension
- GitHub for version control and hosting
- Local dev via `python3 -m http.server`, Live Server, or `npx serve` (required for PNG export features like IsoMark compositor and Save Ruin)

## Known Issues
- **Allow Delete checkboxes share state** — all Allow Delete toggles (Scenes, Inventory, Puzzles, Ideograms) control the same `delete-enabled` class on the panel body. Checking one enables delete buttons across all sections. Works in practice since only one section is visible at a time, but the puzzle/ideogram views share a panel — checking Allow Delete in one persists when toggling to the other.

## TODO
- [ ] Custom mouse cursors — replace default browser cursors with themed artwork (hand, magnifying glass, crosshair, etc.)
- [ ] Expand puzzle overlay theme — style the puzzle panel and background to match the game's atmosphere (frosted glass, glow effects, themed borders)
- [ ] Expand dialogue box theme — richer styling, character portraits or speaker names, multiple dialogue styles per context
- [ ] Sound effects: cryo pod lid opening — attach audio to the cryo pod state change transition
- [ ] Sound effects: console puzzle — keyboard typing sounds, error beep, success chime for the terminal asset
- [ ] **Ideogram Puzzle System** — the map puzzle is now the **Ideogram Puzzle**, built using the ideogram editor. Two workspace modes accessed via ideogram cards:
  - **Blank workspace** (current) — freeform canvas for building ideogram geometry, placing ruins, cutting, compositing, and general design work
  - [ ] **IsoMark Workspace** — a pre-organized workspace with designated areas for each puzzle component; selecting a card opens this structured layout where the puzzle components live together. The workflow: build an ideogram → cut ruins out of it → stamp ruin plates on the press → clear plates on the lathe → reference the codex → use the spindial to cycle/flip/rotate ruins into position
  - Puzzle components (registered as puzzle asset types, similar to combo lock):
    - [ ] **IsoMark Plate Press** — mostly built via the IsoMark compositor (applies a ruin onto an empty plate to create an isomarked plate); needs puzzle scene and asset type registration
    - [ ] **IsoMark Plate Lathe** — clears the ruin from an isomarked plate (resets it to blank); needs puzzle scene and asset type registration
    - [ ] **Spindial Mechanism** — cycles through ruins and flips/rotates them to match a target orientation
    - [ ] **Codex Display** — displays the ideogram geometry for the player to reference while working
  - Plate images already exist as assets; press and lathe just need puzzle scenes and registration as puzzle parts

## Build Log
- **Session 1:** 2:00 AM – 5:00 AM, Feb 11 — Core engine (scenes, hotspots, inventory, puzzles, play mode, game state)
- **Session 2:** 4:00 PM – 10:00 PM, Feb 11 — Puzzle assets, combo lock, asset grouping, puzzle hotspots, action config unification, dialogue fixes, state change toggles, scene image generation (Sora), transition animation planning
- **Session 3:** 12:00 AM – 6:00 AM, Feb 12 — Transition animations (PNG sequences + video), loop animations with placement/scale/reverse, reverse frames for state transitions, edit scene backgrounds, cleaned up export method and setup website.
- **Session 4:** 6:30 AM - 9:00 AM, Feb 12 — Export system with path-based asset references, asset preloader with progress bar, deployment to GitHub Pages
- **Session 5:** 9:00 AM - 1:00 PM, Feb 12 — Audio system (per-scene background music, per-action sound effects, looping sounds), cursor fixes, puzzle ID fix, music save/export fix, play mode toolbar redesign, typewriter dialogue box, console terminal puzzle asset type
- **Session 6:** Feb 13–14, ~14 hours — Scene assets system (per-state positioning, visibility, layering, flip H/V, fade transitions), hotspot connections, move asset with pick mode, asset show/hide actions, clear after click and clear group (sibling hotspot clearing), solve puzzle action type, image editor with 16:9 crop tool, dialogue timing overhaul (configurable duration, immediate replacement), play mode UI overhaul (hidden toolbar, floating overlay buttons, right-click radial inventory wheel with puzzle overlay support), canvas ResizeObserver
- **Session 7:** Feb 16, ~7 hours — Blueprint spatial editor (grid canvas, 6 placement tools with tool toggle behavior, spatial detection, scene inheritance, smart config popover positioning, categorized list view, item drag-to-reposition, panel integration), puzzle component prototyping
- **Session 8:** Feb 17–18, ~13 hours — Ideogram editor (ruin library with multi-file select, radial wheel placement at natural image size, rotation dial with mirror/delete, free-form resize with 8 handles and aspect ratio lock, color tool with 5 modes and popover, two-phase cut tool with move/cut context menu and offscreen capture, text tool with inline editor and word-wrap, save ruin as PNG with File System Access API, zoom slider with ctx.scale transform, custom dark-themed scrollbars with content-aware panning and mouse wheel support, grid toggle controlling snap behavior, tool locking, movable text elements, ideogram cards with CRUD, data persistence in save/load/export, puzzle panel view swapping, IsoMark preview fix, Create Ideogram tool with Line and Circle sub-tools (angle-constrained lines, ring circles, shape selection/drag/resize/delete, color/thickness popover, Save Ideogram as PNG), polygon cut tool (N-point polygon selection with grid snap, canvas clipping for non-rectangular cuts), removed Ruin Box tool)
- **Total build time:** ~55.5 hours (so far)
