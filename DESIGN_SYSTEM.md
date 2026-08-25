# NominaCore App — Design System

Visual language for the Electron renderer. All styles live in one global
sheet — [src/App.css](src/App.css) — no CSS modules, no Tailwind, no
per-component stylesheets (`Login.css` is the sole legacy exception). Add
new classes there; don't invent a second styling system.

Canonical reference implementations for the patterns below:
- [src/pages/WorkRecords.tsx](src/pages/WorkRecords.tsx) — employee-first
  flow, week-strip date picker, pill-tabs, quick-pick pills.
- [src/pages/Deductions.tsx](src/pages/Deductions.tsx) — same pattern
  applied to a simpler form (type pill-tabs, amount presets).

Copy one of these two files as the starting point for any new "pick an
employee, then enter records for them" screen. Don't reinvent the pattern
inline — reuse the CSS classes documented here.

## Color tokens

No CSS custom properties are defined — colors are literal hex values
repeated across `App.css`. When adding new rules, reuse these exact values
rather than introducing new ones:

| Role | Hex | Used for |
|---|---|---|
| Ink / primary text | `#1a1a2e` | headings, body text, sidebar bg |
| Navy (brand/primary action) | `#0f3460` | primary buttons, active pill state, focus border, links |
| Accent (danger/highlight) | `#e94560` | danger buttons, active nav link, required-field asterisk |
| Success | `#2ecc71` | success buttons, save-dot |
| Page background | `#f0f2f5` | `body` |
| Card background | `#fff` | `.card` |
| Muted text | `#555` / `#888` / `#666` | labels, sub-text, helper copy |
| Border | `#d0d5dd` | inputs, pill borders, dividers |
| Subtle fill | `#eef1f5` / `#f8f9fb` | table header bg, hover states, unselected chip bg |
| Tinted info fill | `#eef4ff` | `.total-row`, hover state on quick-pick pills |
| Error | `#c53030` on `#fde8e8` | `.alert-error`, `.field-error` |
| Success alert | `#276749` on `#e6fffa` | `.alert-success`, `.save-indicator` |

Font: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif` (set once on `body`).

## Layout primitives

- **`.card`** — white, `border-radius: 16px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`,
  `padding: 20px`, `margin-bottom: 20px`. The single container unit — every
  page is a vertical stack of `.card`s inside `.main-content`.
- **`.page-header`** — `<h1>` (24px/600) + `<p>` (14px, `#666`) subtitle,
  `margin-bottom: 24px`, sits above the first card.
- **`.form-row`** — flex row, `gap: 12px`, `flex-wrap: wrap`,
  `align-items: flex-end`. Groups sibling fields (and their submit button)
  on one line, wrapping on narrow widths.
- **`.form-group`** — flex column, `gap: 4px`. One label + one control.
  Label styling: 12px/600, uppercase, `letter-spacing: 0.5px`, `#555`.

## Buttons — two families, don't mix casually

**Legacy rectangular** (`.btn` + modifier) — still correct for dense,
secondary, or table-row actions:
- `.btn-primary` (navy fill), `.btn-danger` (accent fill), `.btn-success`
  (green fill), `.btn-secondary` (light gray fill, dark text)
- `.btn-sm` for compact/table-row buttons (e.g. the `✕` delete action)
- `.btn:disabled` → `opacity: 0.5`

**Pill** (rounded-full) — the current direction for primary actions on
entry-focused screens:
- `.btn-pill-primary` — navy fill, white text, `border-radius: 999px`,
  `padding: 12px 28px`. Use for the one main submit action per form
  (e.g. "Registrar horas", "Agregar descuento").
- `.btn-pill-outline` — white bg, bordered, `border-radius: 999px`,
  `padding: 9px 18px`. Use for a single secondary action near a pill
  primary (e.g. "Cambiar empleado").

Rule of thumb: a page's *main* submit button should be pill-style; utility
actions elsewhere on the page (filters, table row delete) stay on the
legacy `.btn` family. Don't retrofit every button to pill style — that was
tried and reverted; it read as noisy when every control competed for
attention.

Loading state: replace the button label with `<span className="spinner" />`
(14px, spinning ring) while a mutation is in flight, and `disabled` the
button — see any `isBusy` flag in the reference pages.

## Forms

- Legacy inputs (`.form-group input/select/textarea`): `padding: 8px 12px`,
  1px `#d0d5dd` border, `border-radius: 6px`, focus → navy border, no
  outline.
- **`.custom-input`** — the newer, slightly larger input used inside
  entry-focused cards (`padding: 10px 14px`, `border-radius: 10px`). Pair
  with **`.field-label`** (same visual spec as `.form-group label`, used
  standalone outside a `.form-group` wrapper) rather than a bare
  `<label>`. Add `.field-label-spaced` (`margin-top: 22px`) when a labeled
  block follows another control with no natural gap.
- Required-field marker: `<span className="required">*</span>` right after
  the label text (accent-colored asterisk) — don't just rely on the yup
  error message to signal required-ness.
- Validation errors: `.field-error` directly under the control (12px,
  `#c53030`). Cross-field/server errors: `.alert.alert-error` at the top of
  the card.
- Success confirmation: `.alert.alert-success` for a persistent banner, or
  the lighter-weight **`.save-indicator`** (small green `.save-dot` +
  text) for a transient "saved" confirmation that self-clears after a
  couple seconds — see `justSaved` in either reference hook.

## Pill controls (the modern layer)

Three related components, all rounded-full, all following the same
selected/unselected visual contract — **unselected = white bg + gray
border, selected = navy fill + white text**:

- **`.pill-tabs`** — a button-group acting as a 2–3 way mode switch (e.g.
  "Entrada/Salida" vs "Horas directas", or the Comida/Vales/Otro type
  picker). Render one `<button type="button">` per option, toggle `.active`
  based on the current RHF value, drive it with `setValue(...)` — never
  raw `<input type="radio">` for this kind of choice anymore.
- **`.pill-grid` > `.time-pill`** — a wrap-flowing row of quick-pick chips
  that *set* a field's value on click (hour presets, common clock times,
  amount presets). These are one-shot setters, not persistent
  selection state — they never carry an `.active` class. Always pair with
  a real input (`.custom-input`) below/beside them so an exact/custom
  value stays reachable.
- **`.day-pill`** inside **`.week-strip`** — a 7-column grid of day
  buttons (weekday label + day number) for picking a date without opening
  a native date picker. `.active` = navy fill (the selected date).
  `.is-today` = navy border only (today, when not the active day). Pair
  with the **`.date-jump-pill`** + **`.icon-btn`** (‹ ›) row above it: the
  jump-pill shows "Month Year" and wraps a fully transparent
  `.date-jump-input` (a native `<input type="date">` positioned
  `inset: 0; opacity: 0`) so clicking it opens the native picker for
  jumping to an arbitrary date/month; the ‹ › `.icon-btn`s shift the
  visible week ±7 days. Generate the 7 days with `getWeekDates()` and the
  label with `formatMonthYear()` from [src/utils/time.ts](src/utils/time.ts).

Don't build a new date picker, mode switch, or preset-chip component from
scratch — these three cover it.

## Employee-first pattern

Any screen where every record belongs to exactly one employee (work hours,
deductions, rates, …) should scope the *entire* screen to one employee at a
time rather than showing an employee column/select repeated per row:

1. **No employee chosen** → render only `.employee-picker`: a
   `.search-input` (filters client-side) above `.employee-list`, a
   scrollable stack of `.employee-row` buttons (each an `.employee-avatar`
   initials-circle + name). Selecting one sets the employee in the
   *records* hook (not the form hook) and clears the search text.
2. **Employee chosen** → render `.employee-context` first: the
   `.employee-avatar.employee-avatar-lg` + name + a one-line description,
   with a `.btn-pill-outline` "Cambiar empleado" on the right that clears
   the selection (and any date-range filters). Then the entry form card,
   then a filters/summary card (`.report-summary` > `.summary-item` for
   record count / totals), then the records table — table columns drop the
   now-redundant "Empleado" column entirely.
3. State ownership: the selected employee id, search text, and the
   filtered employee list live in the *records* hook
   (`use-<resource>.ts`), not the page and not the form hook. The form hook
   takes `employeeId` as a parameter and resets its `employee_id` field via
   a `useEffect` whenever it changes — see `use-work-record-form.ts` /
   `use-deduction-form.ts`. This keeps the page a pure composition of two
   hooks, per the layer-stack rule in [CLAUDE.md](CLAUDE.md).

## Action menu

`.action-menu` — a pill trigger that opens a floating list of actions
(print/export type flows). Toggle the `.open` class on the wrapper for the
chevron-rotate; render `.action-menu-panel` (absolutely positioned card,
`.action-menu-item` rows, optional `.action-menu-divider`) only while open.
Close on outside-click via a `ref` + `mousedown` listener on `document` —
see `actionRef`/`actionOpen` in `use-payroll-report.ts` and its usage in
`PayrollReport.tsx`. Use this instead of a native `<select>` whenever the
options are *actions* (something happens on click) rather than a value
being chosen for the form.

Not every screen fits the employee-first gating pattern above — 
`PayrollReport.tsx` deliberately keeps its employee `<select>` ungated
(styled with `.custom-input`, not swapped for `.employee-picker`) because
its "Exportar Excel Todos" action runs across *all* employees and must
stay reachable with no employee selected. Apply the employee-first pattern
only when every action on the screen genuinely requires one employee.

## Tables

Plain `<table>` — `border-collapse: collapse`, 14px, header row
`background: #f8f9fb`, uppercase 12px `#555` header text, row hover
`background: #f8f9fb`. Actions column is narrow (`style={{ width: 60 }}`)
holding a single `.btn.btn-danger.btn-sm` `✕`.

## Status badges

`.status-badge` — small rounded pill (`border-radius: 10px`, 11px/600).
Background/color pairs are chosen per value and passed via inline
`style`, not a fixed set of modifier classes (see the `TYPE_BADGE` map in
`Deductions.tsx` or `.status-paid`/`.status-pending` in `App.css`) —
follow that convention for any new categorical badge rather than adding a
new `.status-*` class per value.

## Empty / loading states

`.empty-state` — centered, `padding: 40px 20px`, `#999` text. For a
loading table, show the `.spinner` (recolored via inline `style` to navy
on light-navy) above a "Cargando…" message, matching the pattern in both
reference pages — don't just show a blank table while loading.
