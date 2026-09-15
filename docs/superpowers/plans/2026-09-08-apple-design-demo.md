# Apple Design Interaction Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained, clickable Web demo that demonstrates Apple-style fluid bottom-sheet interaction principles.

**Architecture:** Add one standalone example directory under `examples/apple-design-demo/` with an HTML entry point, a stylesheet, and a browser-native JavaScript controller. The controller owns pointer capture, live drag presentation, velocity sampling, momentum projection, snap-point selection, rubber-banding, interruptible spring settling, reduced-motion behavior, and accessible control state; no DSH runtime package or external dependency changes are required.

**Tech Stack:** Semantic HTML, CSS with system typography and translucent materials, Pointer Events, `requestAnimationFrame`, browser-native Web APIs.

**Spec:** The approved in-chat Apple Design demo direction: a central reading/playback scene with a draggable translucent bottom panel, collapsed and expanded snap points, momentum-aware settling, rubber-banding, interruptible re-grab, and reduced-motion comparison.

## Global Constraints

- Keep the demo independent of DSH runtime packages and third-party CDN assets.
- Render all interface text, controls, status indicators, and icons as HTML/CSS or inline code-owned SVG.
- Use Pointer Events with pointer capture and continuously update the panel during a drag.
- Start settling from the panel’s current presentation value and preserve release velocity.
- Use the Apple-style exponential momentum projection before choosing a snap point.
- Provide reduced-motion and reduced-transparency fallbacks through media queries and an explicit demo toggle.
- Keep touch targets at least 44px and expose panel state and controls to assistive technology.
- Do not add generated bitmap assets; the demo’s visual content is gradient/card geometry rendered in CSS.

---

### Task 1: Create the standalone demo structure and visual shell

**Files:**
- Create: `examples/apple-design-demo/index.html`
- Create: `examples/apple-design-demo/styles.css`

**Interfaces:**
- Produces semantic elements used by `app.js`: `#sheet`, `#sheet-grabber`, `#sheet-title`, `#sheet-state`, `#motion-toggle`, `#reset-button`, and `#status-live`.

- [ ] **Step 1: Add the semantic HTML shell**

Create a page with a main reading scene, a compact top bar, a live status region, an accessible bottom sheet, a grab handle, sheet content, a motion toggle, and a reset button. The sheet must expose `aria-expanded`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-label` on its draggable handle.

- [ ] **Step 2: Add the visual system**

Define system-font typography, light/dark color tokens, layered gradients, a translucent sheet using `backdrop-filter`, a soft scrim-free shadow, responsive layout sizing, focus-visible styles, and `@media` fallbacks for `prefers-reduced-motion`, `prefers-reduced-transparency`, and `prefers-contrast: more`. Keep the central reading card and playback controls code-rendered.

- [ ] **Step 3: Check the static shell**

Run: `node --check examples/apple-design-demo/index.html`
Expected: Node reports that HTML is not a JavaScript input and exits non-zero; this is not a useful HTML check. Instead validate the source with the browser smoke in Task 3 after the files exist, and use `git diff --check` for whitespace.

---

### Task 2: Implement direct manipulation, momentum, and interruptible settling

**Files:**
- Create: `examples/apple-design-demo/app.js`

**Interfaces:**
- Consumes: The element IDs and data attributes defined in `index.html`.
- Produces: A browser-native controller with `setSheetPosition(position)`, `settleTo(target, velocity)`, `project(position, velocity)`, `rubberband(overshoot, dimension)`, and `resetDemo()` behavior reachable through the page controls.

- [ ] **Step 1: Add geometry and state constants**

Use a normalized open progress from `0` (collapsed) to `1` (expanded), a two-point snap array `[0, 1]`, a 10px drag hysteresis threshold, and a bounded velocity sample history. Store `presentation`, `target`, `dragStart`, `pointerStart`, `lastPointer`, `lastTime`, `samples`, `pointerId`, `isDragging`, `reduceMotion`, and the active animation frame in one controller state.

- [ ] **Step 2: Add the projection and boundary helpers**

Implement the exponential projection from the Apple guidance:

```js
function project(position, velocity, deceleration = 0.998) {
  return position + (velocity / 1000) * deceleration / (1 - deceleration)
}

function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}
```

Project the release point before selecting the nearest snap point. Apply rubber-banding whenever the live drag progress exceeds either snap boundary.

- [ ] **Step 3: Add pointer capture and continuous drag tracking**

On `pointerdown`, call `setPointerCapture`, preserve the grab offset, cancel any active spring from the current `presentation`, initialize a short timestamped velocity history, and provide immediate pressed feedback. On `pointermove`, calculate 1:1 progress from the pointer delta, apply rubber-banding outside the range, update the sheet transform immediately, and update the live accessible value. On `pointerup` or `pointercancel`, compute release velocity from recent samples, project the resting point, select the target snap, and call `settleTo` with the raw velocity.

- [ ] **Step 4: Add interruptible spring settling**

Animate `presentation` with a `requestAnimationFrame` spring integrator. Each frame must start from the current presentation value, update velocity toward the target, render the new transform, and stop only when both displacement and velocity are below thresholds. A new pointer-down cancels the current frame without resetting the rendered position, allowing the user to reverse the motion mid-flight. Use critically damped settling by default and a slight under-damped response when a non-zero release velocity indicates a flick.

- [ ] **Step 5: Add controls and accessibility synchronization**

Wire the motion toggle to update `reduceMotion`, `data-reduced-motion`, and the visible explanatory label. When reduced motion is active, settle with a short opacity/position interpolation without overshoot. Wire reset to cancel the frame, return to the collapsed snap point, and announce the new state in `#status-live`. Update `aria-expanded`, `aria-valuenow`, and the state label after every rendered frame.

---

### Task 3: Add a runnable browser smoke and verify the demo

**Files:**
- Create: `examples/apple-design-demo/README.md`
- Create: `examples/apple-design-demo/smoke.mjs`

**Interfaces:**
- Consumes: `index.html`, `styles.css`, and `app.js` as local files.
- Produces: A deterministic Node smoke that asserts required UI hooks and interaction implementation markers without adding a test dependency.

- [ ] **Step 1: Add the usage README**

Document the demo entry file, supported interactions, the Apple principles demonstrated, and the local verification command. Keep it concise and describe current behavior rather than implementation history.

- [ ] **Step 2: Add source-level smoke assertions**

Read the three demo files and assert that the HTML includes the sheet and controls, the CSS includes `backdrop-filter` and reduced-motion/transparency media queries, and the JavaScript includes `setPointerCapture`, `requestAnimationFrame`, momentum projection, rubber-banding, and the reduced-motion toggle. Exit non-zero with a named assertion when a required marker is missing.

- [ ] **Step 3: Run the smoke**

Run: `node examples/apple-design-demo/smoke.mjs`
Expected: the command prints a concise pass summary and exits `0`.

- [ ] **Step 4: Run whitespace and repository-status checks**

Run: `git diff --check`
Expected: no output and exit `0`.

- [ ] **Step 5: Open the demo for visual verification**

Open `examples/apple-design-demo/index.html` in a browser or serve the repository with a static server. Verify that the sheet can be dragged continuously, a quick upward release settles open, a quick downward release settles closed, dragging beyond either edge resists progressively, grabbing during settling reverses from the visible position, reset returns to collapsed, and reduced motion removes spring overshoot while keeping feedback.

---

## Plan Self-Review

- Spec coverage: the standalone shell is Task 1; direct manipulation, velocity handoff, momentum projection, rubber-banding, interruptibility, materials, typography, accessibility, and reduced-motion behavior are Task 2; source smoke and visual verification are Task 3.
- Placeholder scan: no implementation step depends on an unspecified file, function, or future decision; all paths and required markers are named.
- Interface consistency: Task 1 defines every DOM identifier consumed by Task 2, and Task 3 reads the exact three files created by Tasks 1 and 2.
