# Stowage planner: demo slice

A small, working sample of a bulk carrier loading computer, built for a job proposal.

**Live:** https://theolodocoder.github.io/stowage-slice/

## What it does
- **Side profile** of an Ultramax bulk carrier: drag cargo (iron ore, bauxite, coal, wheat) onto a hold, or click a hold and use +/−. Fill levels follow each cargo's stowage factor, and the waterline tilts with the real drafts.
- **Longitudinal strength:** shear force and bending moment along the hull as % of allowable, with amber (85%) and red (100%) lines.
- **Departure / Arrival** conditions: arrival burns fuel and water, so drafts, trim and strength shift.
- **Checks** for hold mass and volume, drafts against the load line or a port draft limit, trim, GM, shear and bending. Clicking a check highlights the hold behind it. The plan can't be approved while a check fails.
- **Standard conditions** from a typical loading manual: homogeneous, alternate holds, block loading, plus an unsafe example.
- **Loading sequence** in four steps. Intermediate stages use harbour limits, the final stage uses sea limits.
- **Port draft limit** with "how much more cargo fits".
- **Share plan:** the plan, condition and port draft go into the link, so a planner can send it to the chief officer. Untrusted link input is validated.
- A 30-second guide strip for first-time visitors.
- Undo / redo for every plan edit (buttons or Ctrl/⌘+Z, Shift for redo).
- Editable hold table and a printable report. On phones the ship and checks come first.

Stack: React 19, Vite, TypeScript, Zustand, Tailwind CSS. The loading rules are unit-tested with Vitest (`npm test`) and run in CI before every deploy.

The vessel, hydrostatics and strength model are simplified and illustrative (constant hydrostatics, a coarse weight-minus-buoyancy model). They are not class-approved.

By Promise Okafor.
