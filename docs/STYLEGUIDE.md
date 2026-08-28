# Online Burgenvölki — Visual Styleguide

> Single source of truth for the game's UI (menus, HUD, overlays, progression screens).
> Colours, typography and spacing defined here are **locked**. Every new screen must look
> like it was always part of the product. When in doubt, reuse a token — never invent a
> one-off colour or font size.

---

## 1. Design thesis

**Swiss International Typographic Style meets modern arcade sports.**

The game is a Swiss gym-hall sport, so the identity is built from that world:

- **Swiss precision** — grid-driven layout, strong neutral grotesque type, functional
  clarity, generous negative space, restrained ornament.
- **Arcade sport energy** — condensed jersey-style numerals for scores and timers, bold
  team colour blocks, punchy motion on key moments.
- **The gym hall itself** — warm beech-wood tones, and the painted multi-colour **court
  lines** on the floor as the recurring structural motif (dividers, panel edges, the HUD
  centre-line).

The UI base is a **warm-dark arena** (warm near-black, not neutral grey) so the vivid team
blues/reds and the pink ball read instantly. This is a deliberate rejection of the three
generic AI looks (cream+serif, black+single-acid-accent, broadsheet). Our accent system is
*plural and meaningful*: blue = your side, red = the enemy, pink = the ball, wood = the hall.

**Signature element:** the **court-line rule** — a thin painted floor-line (single or
multi-segment, in the court palette) used to frame panels, separate sections, and anchor the
HUD. Secondary motif: the **Keule** silhouette icon for objective UI.

---

## 2. Colour

All colours are exposed as CSS custom properties on `:root` and mirrored as Tailwind theme
tokens. **Never** hardcode a hex in a component — reference the token.

### 2.1 Arena base (warm dark)

| Token | Hex | Use |
|---|---|---|
| `--bg-900` | `#14110D` | App background, deepest layer |
| `--bg-850` | `#1A160F` | Canvas letterbox / behind-3D |
| `--bg-800` | `#1E1A15` | Primary panel surface |
| `--bg-700` | `#2A241C` | Raised surface, cards, inputs |
| `--bg-600` | `#3A3125` | Hover surface, subtle borders |
| `--bg-500` | `#4C4130` | Strong border / divider on dark |

### 2.2 Gym wood (warmth & texture accents)

| Token | Hex | Use |
|---|---|---|
| `--wood-light` | `#E7C08A` | Wood highlight, floor accent, subtle fills |
| `--wood` | `#C98F52` | Primary wood tone, decorative rules |
| `--wood-deep` | `#8A5A2C` | Wood shadow, deep accent |

### 2.3 Teams

| Token | Hex | Use |
|---|---|---|
| `--team-blue` | `#2B7CE9` | Blue team primary (the player's default side) |
| `--team-blue-deep` | `#144C9E` | Blue pressed / shadow |
| `--team-blue-glow` | `#5AA0FF` | Blue highlight / glow / focus on blue |
| `--team-red` | `#E23B3B` | Red team primary |
| `--team-red-deep` | `#A11F1F` | Red pressed / shadow |
| `--team-red-glow` | `#FF6B6B` | Red highlight / glow |

### 2.4 Ball (must be unmistakable)

| Token | Hex | Use |
|---|---|---|
| `--ball-pink` | `#FF3E9C` | The rubber ball, held-ball indicator, throw UI |
| `--ball-pink-deep` | `#C41E72` | Pink pressed / shadow |
| `--ball-pink-glow` | `#FF8AC4` | Pink glow / trail |

### 2.5 Court lines (signature multi-colour floor markings)

| Token | Hex | Use |
|---|---|---|
| `--court-yellow` | `#F2C14E` | Court line, XP/progress accent |
| `--court-green` | `#3FB27F` | Court line, success/SAFE state |
| `--court-cyan` | `#38B6C9` | Court line, neutral/info marking |
| `--court-magenta`| `#D84FA8` | Court line, rare rhythm accent |

> The court palette is for **structural line motifs and data accents**, never for large
> fills. Team colours own the large fills.

### 2.6 Text

| Token | Hex | Use |
|---|---|---|
| `--text-hi` | `#FBF3E7` | Primary text (warm white) |
| `--text-mid` | `#C9BCA8` | Secondary text, labels |
| `--text-lo` | `#8B7E6B` | Tertiary text, disabled, captions |
| `--text-ink` | `#14110D` | Text on light/coloured fills |

### 2.7 Semantic

| Token | Hex | Use |
|---|---|---|
| `--success` | `#3FB27F` | Success, SAFE Keule, positive delta |
| `--warning` | `#F2A93B` | Warning, low timer, caution |
| `--danger` | `#E23B3B` | Danger, OUT, STOLEN Keule (shares team-red) |
| `--info` | `#38B6C9` | Info, neutral notices |

### 2.8 Rarity (chests / cosmetics)

| Token | Hex |
|---|---|
| `--rarity-common` | `#9AA0A6` |
| `--rarity-rare` | `#38B6C9` |
| `--rarity-epic` | `#B15CFF` |
| `--rarity-legendary` | `#F2A93B` |

---

## 3. Typography

Loaded from Google Fonts. Three roles, each with a job. Every text element must map to one.

| Role | Family | Weights | Purpose |
|---|---|---|---|
| **Display** | `Archivo` | 600, 700, 800, 900 | Screen titles, menu headings, big moments |
| **UI / Body** | `Barlow` | 400, 500, 600, 700 | HUD, buttons, body copy, labels |
| **Data / Numeric** | `Barlow Semi Condensed` | 600, 700 | Scores, timers, stat numerals (jersey feel) |

Fallback stacks:
```
--font-display: 'Archivo', 'Arial Black', system-ui, sans-serif;
--font-ui:      'Barlow', system-ui, -apple-system, sans-serif;
--font-data:    'Barlow Semi Condensed', 'Barlow', system-ui, sans-serif;
```

### 3.1 Type scale

| Token | Size / Line | Weight | Family | Use |
|---|---|---|---|---|
| `display-xl` | 72 / 1.0 | 900 | Display | Hero / victory title |
| `display-lg` | 52 / 1.05 | 800 | Display | Screen titles |
| `display-md` | 36 / 1.1 | 800 | Display | Section headings |
| `heading` | 24 / 1.2 | 700 | Display | Card / panel titles |
| `subheading` | 18 / 1.3 | 600 | UI | Sub-titles |
| `body` | 16 / 1.5 | 400 | UI | Body copy |
| `body-sm` | 14 / 1.45 | 400 | UI | Secondary copy |
| `label` | 12 / 1.2 | 600 | UI | Eyebrows, tags — **uppercase, `0.08em` tracking** |
| `data-xl` | 56 / 1.0 | 700 | Data | Scoreboard numerals |
| `data-lg` | 32 / 1.0 | 700 | Data | Match timer, big stats |
| `data-md` | 20 / 1.0 | 700 | Data | Inline stats, counters |

**Rules**
- Titles use Display; anything numeric that changes at runtime (scores, timers, XP, counts)
  uses Data — with `font-variant-numeric: tabular-nums` so digits don't jitter.
- Eyebrow/labels are always uppercase with `0.08em`–`0.12em` letter-spacing.
- Body copy never uses the Display face.

---

## 4. Spacing, grid, radius, elevation

### 4.1 Spacing scale (4px base — Swiss grid)
`0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96` → tokens `space-0 … space-96`.
Default gap inside a panel is `16`; between major blocks `32`.

### 4.2 Layout
- Menu content max width **1120px**, centred, `padding: 32px` (24 on mobile).
- 12-column grid mental model; HUD is anchored to screen edges, not the grid.
- Mobile breakpoint at `768px`; everything must reflow to single-column and remain usable.

### 4.3 Radius
| Token | Value | Use |
|---|---|---|
| `radius-none` | 0 | Court-line panels, data chips (Swiss sharpness) |
| `radius-sm` | 4px | Inputs, small chips |
| `radius-md` | 8px | Buttons, cards |
| `radius-lg` | 14px | Modals, large panels |
| `radius-pill`| 999px | Toggles, avatars, tags |

### 4.4 Elevation (shadows on warm-dark)
| Token | Value |
|---|---|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,.4)` |
| `shadow-md` | `0 6px 20px rgba(0,0,0,.45)` |
| `shadow-lg` | `0 18px 50px rgba(0,0,0,.55)` |
| `glow-blue` | `0 0 24px rgba(90,160,255,.45)` |
| `glow-red` | `0 0 24px rgba(255,107,107,.45)` |
| `glow-pink` | `0 0 24px rgba(255,138,196,.55)` |

Panels sit on `--bg-800` with a `1px` top highlight (`rgba(255,255,255,.05)`) and
`shadow-md`. Focus glows use the relevant team/pink glow.

---

## 5. Signature: the court-line rule

The visual hook. A thin painted line drawn on/around UI, echoing gym-floor markings.

- **Simple rule:** a `2px` line, colour `--wood` or a court colour, used as a divider.
- **Segmented rule:** a horizontal band split into coloured segments
  (`blue → yellow → pink → red`) used under screen titles and above the primary CTA.
- **Panel court-frame:** a panel whose top edge is a `3px` court-coloured stripe.
- **HUD centre-line:** a faint vertical centre marker echoing the arena's centre line.

Utility classes provided in the client: `.court-rule`, `.court-rule--segmented`,
`.panel--court`. Do not draw ad-hoc dividers; use these.

---

## 6. Components

### 6.1 Buttons
- **Primary (team):** filled `--team-blue`, text `--text-hi`, `radius-md`, weight 700 UI,
  `padding: 12px 20px`. Hover: lift 1px + `glow-blue`. Active: `--team-blue-deep`.
- **Danger/enemy:** filled `--team-red` (used sparingly, e.g. leave match).
- **Ghost:** transparent, `1px` border `--bg-500`, text `--text-hi`. Hover: bg `--bg-700`.
- **Pink action:** filled `--ball-pink` for ball/throw-related affordances only.
- Disabled: `opacity .4`, no glow, `cursor: not-allowed`.
- Focus-visible: `2px` outline in the matching glow colour, `2px` offset. Always visible.

### 6.2 Panels / cards
- Surface `--bg-800`, border `1px --bg-600`, `radius-lg`, `shadow-md`, `padding 24`.
- Card variant on `--bg-700`, `radius-md`, `padding 16`.
- Objective/important panels use `.panel--court` (court-stripe top edge).

### 6.3 HUD chips
- `radius-none` or `radius-sm`, `--bg-800` at `.85` alpha, `1px` border of the relevant
  accent, Data font for numerals, `label` font for the caption above.
- Team score chips carry the team colour as a left `3px` bar.

### 6.4 Tags / badges
- `radius-pill`, `label` type, `padding 4px 10px`. State colours from semantic/rarity.

### 6.5 Inputs
- `--bg-700`, `1px --bg-500`, `radius-sm`, text `--text-hi`, placeholder `--text-lo`.
- Focus: border `--team-blue`, `glow-blue`.

### 6.6 Toggles / sliders (settings)
- Track `--bg-600`, filled portion `--team-blue`, knob `--text-hi`, `radius-pill`.

---

## 7. Interactive states (global)

| State | Treatment |
|---|---|
| Hover | +brightness, 1px lift, relevant glow (150ms ease-out) |
| Active/pressed | deep variant of colour, remove lift |
| Focus-visible | 2px glow outline, 2px offset — **never removed** |
| Disabled | opacity .4, no glow, `not-allowed` |
| Loading | skeleton on `--bg-700` with a slow shimmer, or a court-line spinner |
| Selected | accent border + subtle accent-tinted fill |

---

## 8. Motion

- **Durations:** micro 120ms, standard 200ms, entrance 320ms, celebratory 600–900ms.
- **Easing:** `cubic-bezier(.2,.8,.2,1)` for UI; springy overshoot only for reward reveals.
- **Key moments** get orchestrated motion, everything else stays quiet:
  - Round start: title wipes in over a court-line sweep.
  - Hit marker: quick scale-punch + fade (≤200ms).
  - OUT: red vignette pulse (single), respawn ring counts down.
  - Victory / capture: Keule flourish + court-line burst, ~800ms.
  - Chest open / rarity reveal: build-up → burst → item, ~900ms.
- **Reduced motion:** honour `prefers-reduced-motion`; replace transforms with cross-fades,
  kill ambient/loop animation. No essential info conveyed by motion alone.

---

## 9. HUD layout contract

- **Top-centre:** team score chips (blue left, red right) flanking the match timer (Data).
- **Top-left:** current objective line + Keule state (SAFE/STOLEN per team).
- **Top-right:** player status (level, name) + round indicator.
- **Bottom-left:** hit/kill feed (stacked, newest on top, auto-fade).
- **Bottom-centre:** held-ball indicator (pink) + charge meter when throwing.
- **Bottom-right:** minimal control hints (contextual: pick up `E`, dash `Space`).
- **Centre overlays:** OUT + respawn countdown; round-start / round-end banners.
- HUD text always has a subtle dark scrim or chip behind it for legibility over the arena.

---

## 10. Accessibility floor (non-negotiable)

- Text on its background meets WCAG AA (4.5:1 body, 3:1 large). Warm-white on `--bg-800`
  passes; never put `--text-lo` on `--bg-700` for essential copy.
- Team identity is never colour-only in critical UI — pair with a label/icon (BLUE / RED,
  Keule icon) so colour-blind players can distinguish sides.
- All interactive elements keyboard reachable with a visible focus ring.
- Respect `prefers-reduced-motion`.
- Minimum hit target 40×40px for menu controls.

---

## 11. Do / Don't

- **Do** anchor sections with the court-line rule; **don't** invent gradient dividers.
- **Do** use Data font for anything that counts; **don't** set timers in the Display face.
- **Do** keep large fills to team colours + wood; **don't** flood the screen with pink.
- **Do** let one moment be loud (victory, chest); **don't** animate everything at once.
- **Do** reference tokens; **don't** paste raw hex values into components.
