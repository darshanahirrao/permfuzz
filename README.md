# Labs

The public work surface for Darshan Ahirrao: agent instrumentation you can run
yourself, and interactive demos of the systems I build for clients.

## Structure

```
apps/       deployable surfaces, one per project
packages/   shared design system and components
```

Each app is a self-contained Next.js project. They share one design system so
the whole surface reads as one studio rather than a set of unrelated
experiments.

## Design system

Tokens live in `packages/design/src/tokens.css`. Components reference semantic
tokens only, never raw values, so a change to the plan propagates everywhere.
The written plan is in [DESIGN.md](DESIGN.md).

## Commands

```bash
npm install
npm run dev      # permfuzz at http://localhost:3000
npm test         # analysis engine test suite
```

## Rules

No em dashes, no emojis, no badge images. Simulated demos are labelled as
simulations. Analysis tools are genuinely real.
