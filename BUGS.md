# Bug Documentation - Battleship Game

This document tracks bugs discovered during development and testing of the Battleship game.

## Bug #1: TypeScript Variable Initialization Error

**Description:** TypeScript compiler error when building the project - variables `targetRow` and `targetCol` were used before being assigned in the AI firing logic.

**How it was discovered:** During the initial build process (`npm run build`), TypeScript reported errors TS2454 indicating that variables were used before being assigned.

**Root cause:** In the `handleAiFire` function, the variables `targetRow` and `targetCol` were declared with type annotation but not initialized. The logic attempted to check if they were `undefined` after a while loop, but TypeScript's strict mode couldn't guarantee they would be assigned.

**Fix applied:** Initialized both variables with a sentinel value of `-1`:
```typescript
let targetRow: number = -1
let targetCol: number = -1
```
Then changed the undefined check to check for the sentinel value:
```typescript
if (targetRow === -1 || targetCol === -1) {
  // Fire randomly
}
```

---

## Bug #2: Pre-installed Component Build Error

**Description:** The pre-installed `resizable.tsx` component from shadcn/ui had TypeScript errors related to missing properties on the `react-resizable-panels` module.

**How it was discovered:** During the build process, TypeScript reported errors TS2339 indicating that properties `PanelGroup`, `PanelResizeHandle` did not exist on the imported module.

**Root cause:** The pre-installed component was incompatible with the version of `react-resizable-panels` in the project, likely due to API changes between versions.

**Fix applied:** Since the `resizable.tsx` component was not used in the Battleship game, it was removed from the project:
```bash
rm src/components/ui/resizable.tsx
```

---

## Testing Notes

The following features were tested and verified to work correctly:

1. **Ship Placement**
   - All 5 ships can be placed on the grid
   - Ships cannot overlap (validation works)
   - Ships cannot extend beyond grid boundaries
   - Horizontal/vertical orientation toggle works
   - Visual feedback shows placed ships in gray

2. **Turn-Based Gameplay**
   - Player can fire by clicking on enemy grid
   - AI fires automatically after player turn (1 second delay)
   - Turn indicator shows "Your Turn!" or "Enemy Firing..."

3. **Hit/Miss Detection**
   - Hits show red target icon
   - Misses show gray dot
   - Cannot fire on same cell twice

4. **AI Behavior**
   - AI places ships randomly at game start
   - AI fires randomly when no hits are active
   - AI targets adjacent cells after getting a hit (smart targeting)

5. **Ship Status Display**
   - Both player and enemy ship lists are displayed
   - Ships show their name and size

6. **Restart Functionality**
   - Restart button resets game to placement phase
   - All state is properly cleared

---

## Animation & Sound Enhancement (v2.0)

### Implementation Notes

The following animations and sounds were added to enhance the game experience:

**Animations Implemented:**
- Hit animation: Cell flashes and scales with explosion effect
- Miss animation: Ripple effect with water splash
- Sunk animation: Shake effect for all cells of the sunk ship
- AI thinking indicator: Pulsing "AI Thinking..." text during AI turn
- Sunk ship notification: Slide-in animation from the right

**Sounds Implemented:**
- Fire sound: Whoosh effect when firing
- Hit confirmation: Explosion-like sound
- Miss: Water splash sound
- Ship sunk: Dramatic descending tone sequence
- Win: Victory fanfare
- Loss: Defeat sound

**Sound System:**
- Uses Web Audio API for reliable cross-browser sound generation
- Procedurally generated tones (no external audio files needed)
- Mute/unmute toggle in top-right corner
- Respects browser autoplay restrictions

### Testing Results

All animations and sounds were tested and verified to work correctly:
- Animations trigger reliably without desyncing game state
- Sounds play at appropriate times
- Mute toggle works correctly
- No console errors related to audio or animation
- AI thinking indicator shows during AI turn delay

No bugs were discovered during animation/sound testing.

---

## Ship Sprites & Sinking Animation (v3.0)

### Implementation Notes

The following visual enhancements were added to improve ship representation:

**Ship Sprite Features:**
- Ships render as multi-cell visual objects (not separate squares)
- Each ship type has a unique color gradient:
  - Carrier (5): Dark gray
  - Battleship (4): Purple
  - Cruiser (3): Teal/green
  - Submarine (3): Brown/gold
  - Destroyer (2): Red
- Ships align exactly to grid cells
- Ships respect orientation (horizontal/vertical)
- Ships scale responsively with board size

**Fog of War:**
- Player board: Ships are always visible
- AI board: Ships hidden initially, revealed only when sunk

**Hit Markers:**
- Hit markers display on ship bodies (red pulsing circles)
- Smoke effect appears on hit positions
- Hits accumulate visually along the ship body

**Sinking Animation:**
- Triggers when all cells of a ship are hit
- Animation: Ship translates downward, fades opacity, and slightly rotates
- Duration: ~1000ms
- Ship remains visible until animation completes
- After animation: Ship becomes non-interactive

### Visual Bugs Section

No visual bugs were discovered during testing. The following potential issues were proactively addressed:

1. **Ship sprite alignment** - Ships align correctly to grid cells using absolute positioning with calculated offsets
2. **Sinking animation triggering** - Animation triggers exactly once per ship using isSinking state flag
3. **Hit markers syncing** - Hit markers sync correctly with game logic by reading cell state from grid
4. **Z-index layering** - Ship sprites render above grid cells but below UI elements

### Testing Results

All ship sprite features were tested and verified to work correctly:
- Ships visibly occupy correct cells
- Orientation matches logic
- Hits show correctly on ship bodies
- Sinking animation triggers exactly once
- Animation does not block gameplay
- No layout shift or board misalignment
- Fog of war works correctly (AI ships hidden until sunk)

---

## Potential Future Improvements

1. Add ship preview during placement (show where ship will be placed before clicking)
2. ~~Add sound effects for hits and misses~~ (DONE in v2.0)
3. ~~Add animation for ship sinking~~ (DONE in v2.0)
4. Implement difficulty levels for AI
5. Add local storage to save game progress
