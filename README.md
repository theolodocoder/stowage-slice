# Stowage plan editor: demo slice

A one-hour sample of a bulk carrier stowage editor, built for a job proposal.

- Drag cargo (iron ore, coal, grain) into five holds, or pick a cargo and use the buttons.
- Every change re-checks hold tonnage limits, hold volume (stowage factor), one cargo per hold, drafts against the load line, trim, and a simplified hull-bending indicator.
- The plan can't be saved while any check fails.
- Stack: React 19, Vite, TypeScript, Zustand, Tailwind CSS. The rules are unit-tested with Vitest (`npm test`).

The vessel and the maths are simplified and illustrative (constant hydrostatics, a rough bending check). They are not class-approved.

By Promise Okafor.
