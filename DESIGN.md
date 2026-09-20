# Studio design plan

One design system for every public surface. Written before any markup, and
every token in `packages/design/src/tokens.css` traces back to this file.

## Calibration

**Utilitarian.** These are instruments and demos for people who evaluate
technical work. Polished and quiet: real hierarchy, generous space, restrained
palette, no flourish that does not carry information. The interface is the
argument.

## Material

The subject is access control and audit. Its own world supplies the vocabulary:
grant ledgers, capability matrices, severity grades, evidence citations,
monospace identifiers, review findings. Nothing decorative is imported from
outside that world.

## Type

| Role | Face | Use |
|---|---|---|
| Interface | IBM Plex Sans | Headings, body, controls |
| Utility | IBM Plex Mono | Identifiers, scopes, tool names, data, counts |

Plex is technical without being a costume, and the superfamily pairs by design.
Self-hosted through `@fontsource`, never a linked CDN, so the render cannot
silently fall back to something unplanned.

## Scale

One type scale, five steps: 12, 14, 16, 20, 28, 40 (px at root 16). One
spacing scale on a 4px grid: 4, 8, 12, 16, 24, 32, 48, 64. One radius set:
2 (subtle), 6 (default), 999 (pill). One elevation set, two levels, light from
above.

## Color

Named by role, never by appearance.

| Token | Light | Dark | Intent |
|---|---|---|---|
| `--paper` | `#F6F7F9` | `#0F1116` | Page ground, cool paper biased toward the accent |
| `--surface` | `#FFFFFF` | `#161922` | Raised panels |
| `--ink` | `#14161B` | `#E7E9EF` | Primary text |
| `--ink-muted` | `#5C6472` | `#9AA2B2` | Secondary text, checked for contrast |
| `--hairline` | `#E3E6EC` | `#262B36` | Boundaries, no shadow needed |
| `--accent` | `#2F3FB4` | `#93A0FF` | Links, focus, the one figure that must be found |
| `--risk` | `#B4232A` | `#FF8A80` | Critical, semantic only |
| `--warn` | `#8A5A00` | `#E3A008` | Warning, semantic only |
| `--ok` | `#1F6B47` | `#5BD39A` | Pass, semantic only |

Semantic colors are a separate channel and never serve as the accent. Dark mode
is re-picked, not inverted: the accent lightens, the text softens, and every
pair is re-checked against the new ground.

Deliberately avoided: cream with terracotta, near-black with an acid-green pop,
purple-to-blue gradient hero, Inter or Space Grotesk as the safe reflex.

## Layout

An input rail beside a results column on wide viewports, collapsing to a single
column with the input first once the measure gets too narrow. Reading order is
the hierarchy sentence made literal: the verdict is seen first, the dangerous
grants second, the full capability matrix third, method last. Wide content
(matrices, config) scrolls inside its own container so the page never pans
sideways.

Revised from an earlier single-column plan: pasting a manifest and reading the
verdict are two different tasks, and keeping the input in view while the results
change is worth more than the tidier single column.

## Components

Every interactive component ships default, hover, focus, active, disabled,
loading, empty, and error. Empty states are onboarding. Errors sit beside their
cause and name the repair. Focus is always visible. Motion is limited to state
change and is disabled under `prefers-reduced-motion`.

## Structure claims

Severity grades assert a consistent scale and appear identically everywhere.
Numbered markers are used only where order is real. No badge images, no emojis,
no em dashes.
