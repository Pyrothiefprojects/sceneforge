# Inventory & Puzzles

## Inventory
- Define items with a name, icon image, and use count (1, 2, 3, or infinite)
- Items are picked up via hotspot actions and stored in the player's inventory
- Items can be selected from the inventory overlay or radial wheel and used on hotspots that accept them
- Uses are tracked — items are auto-removed from inventory when uses are exhausted

## Puzzles
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
