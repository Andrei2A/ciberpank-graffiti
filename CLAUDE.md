# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cyber Graffiti: Clean-up Logic** — a browser-based educational game where the player uses a cyberpunk water cannon to wash away WRONG multiplication answers (graffiti) from a wall, leaving only the correct answer. 10 levels covering multiplication tables x2–x10 plus a final mixed exam.

## Running the Game

No build step. Open `index.html` directly in a browser. No dependencies, no package manager, no server required.

## Architecture

Pure HTML5/CSS/JS — three files, no frameworks:

- **index.html** — All screen DOM containers (Loading, Menu, Level Select, Gameplay, Victory, Game Over, Settings, Help, Pause overlay). Gameplay uses a `<canvas>` element with DOM HUD overlay and a DOM water cannon element.
- **style.css** — Full design system with CSS custom properties. Screen switching via `.screen.active` classes. Includes scanlines/rain/vignette overlays, glass-panel effects, neon glows, responsive breakpoints.
- **game.js** — All game logic in a single file. Key classes:

| Class | Purpose |
|---|---|
| `Game` | Main controller, state machine (`loading`→`menu`→`levels`→`gameplay`→`victory`/`gameover`), render loop, screen transitions |
| `GraffitiAnswer` | Core mechanic — renders graffiti text to offscreen canvas, uses `Uint8Array` pixel mask for gradual wash erosion. Wash threshold at 85%. |
| `WaterSystem` | Bezier water stream from cannon to cursor, spray particles, paint-color drips |
| `WallRenderer` | Procedural brick wall on offscreen canvas |
| `LevelManager` | Generates multiplication questions, positions 3 answers on wall, produces plausible wrong answers |
| `InputManager` | Mouse aim + LMB shooting, mobile virtual joystick + fire button |
| `AudioManager` | Web Audio API procedural sounds (filtered white noise for water, tone sequences for victory/error). No external audio files. |
| `ProgressManager` | localStorage wrapper for unlocked levels, stars, scores, settings |

### Graffiti Wash Mechanic (critical path)

Each answer has an offscreen canvas (rendered text) and a parallel `Uint8Array` mask (255=painted, 0=washed). When water hits a graffiti zone, mask pixels are eroded based on distance from spray center. When 85% of visible text pixels are washed, `maskData.fill(0)` clears the rest. The output canvas composites graffiti pixels with mask values per-frame. This replaced an earlier Canvas compositing approach (`destination-out`) that was unreliable.

Key tuning parameters in `GraffitiAnswer`: spray radius (`18 + sensitivity * 2`), erosion strength (`150 * (1 - dist * 0.6)`), snap-to-zero threshold (mask < 30 → 0), text pixel alpha threshold (> 80), `shadowBlur` on graffiti text (10).

## Reference Files

- `1.html` through `4.html` — Static HTML mockups (Tailwind-based) showing the target visual design for Menu, Gameplay, Victory, and Level Select screens. These are design references only, not part of the game.
- `тз.md` — Original game specification in Russian.

## Language

The user communicates in Russian. Game UI text is in English.
