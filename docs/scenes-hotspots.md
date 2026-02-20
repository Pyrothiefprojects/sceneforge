# Scenes & Hotspots

## Scenes
- Add scenes from PNG/WebP/JPEG images — each becomes a navigable location
- Drag-and-drop reordering in the scene list
- Inline rename by clicking the scene name
- Multiple **scene states**: add alternate backgrounds with independent hotspots (e.g. a room before and after solving a puzzle)
- State widget on each scene card to add, navigate, and remove states
- **Edit background** — replace the background image for any state without losing hotspots
- **Scene music** — click the music note on a scene card to assign a looping background track (highlights gold when set); music crossfades automatically when navigating between scenes

## Scene Assets
- Place persistent asset images on any scene — separate from the background
- **Per-state visibility** — toggle which states each asset appears in
- **Per-state positioning** — each asset can have different position and size per state
- **Layering** — control render order with layer values (higher layers draw on top)
- **Flip H / Flip V** — mirror assets horizontally or vertically per state
- **Fade transitions** — assets can fade in/out smoothly when shown or hidden at runtime
- **Linked items** — optionally associate an asset with an inventory item
- Assets are rendered on the canvas with the scene background, correctly scaled and positioned

## Hotspots
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

## Hotspot Connections
- **Connect mode** — click the Connect button, select 2+ hotspots (across any state), confirm to create a named connection group
- Visual SVG connector lines between connected hotspots (color-coded)
- Used by the **move asset** system to define valid drop targets
- Stored per-scene and preserved across save/load

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
