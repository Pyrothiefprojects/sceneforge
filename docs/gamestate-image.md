# Game State & Image Editor

## Game State
- **Flags panel** — checkbox list of all auto-discovered flags across scenes and puzzles (useful for debugging)
- **Progression panel** — ordered list of hint steps, each tied to a flag; drag to reorder; in play mode, the Hint button reveals the next unsolved step
- **Level overview** — summary of all scenes, their hotspots and actions, items, and puzzles in one view
- **Blueprint mode** — toggles a spatial planning canvas for organizing game structure and scene relationships

## Blueprint Editor
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

## Image Editor
- Load multiple images for preview and editing
- Display loaded images in a card list with dimensions and thumbnails
- **16:9 crop tool** — interactive crop selection with constrained aspect ratio, corner handles, drag to move/resize, and live dimension display
- Download cropped images as PNG files
- Load any image to the canvas for preview
