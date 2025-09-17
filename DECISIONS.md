# Design Decisions

Please fill out this document with your design decisions and rationale as you implement TinyGrid.

## Design Analysis

### V7 Labs Study

After reviewing [v7labs.com](https://v7labs.com):

**What I liked:**

- What aspects of their design appeal to you?
- Animations and microinteractions that enhance user experience
- Which specific UI patterns would work well for a spreadsheet?
- Card-like toolbars, and simple, scannable tables.
- What makes their data presentation effective?
- High contrast, generous spacing, and restrained color use.

**What I would adapt differently:**

- What doesn't translate well to spreadsheet UX?
- Heavy visuals and oversized imagery don’t fit dense grids.
- What would you change for this use case?
- More compact layouts, clearer cell boundaries, and a focus on data legibility.

### Paradigm Study

After reviewing [paradigm.co](https://paradigm.co):

**What I liked:**

- What design principles stand out?
- Clean, minimalistic design with a dark background.
- How do they handle information density?
- Clear hierarchy with bold typography and ample spacing.
- What about their typography/spacing system?
- Strong, consistent typography that guides the eye effectively.

**What I would adapt differently:**

- What's too much for a spreadsheet interface?
- Dark mode might reduce readability in a data-heavy context.
- Where would you simplify?
- Lighter hover effects, fewer font weights, and a more neutral color palette.

### My Design Synthesis

**How I'll blend both influences:**

- What will you take from each?
- From v7labs: Use of whitespace and clear data presentation.
- From paradigm: Strong typography and a clean, modern aesthetic.
- What will be uniquely yours?
- A balanced approach that prioritizes usability and clarity in a spreadsheet context.
- What's your color palette and why?
- A neutral palette with blue accents for interactivity, ensuring high contrast for readability.
- What's your typography strategy?
- Roboto for UI and data; compact sizes for density.

## Priority 1: Core Functionality Decisions

### Cell Selection

**How will selection work?**

- Single click behavior?
- Single click selects a cell.
- Visual feedback (border, background, both)?
- Accent outline plus a very light background fill.
- How will you show the active cell?
- Thicker selection ring on the active cell edge.

### Cell Editing

**Your editing strategy:**

- How does editing start? (double-click, F2, direct typing, all?)
- Double-click or pressing Enter when a cell is selected.
- What happens when user types directly?
- Enters edit mode and replaces cell content.
- How does editing end? (Enter, Tab, Esc, click away?)
- Enter commits and moves down; Tab commits and moves right; blur commits.
- Will you show different states for viewing vs editing?
- Editing shows an input overlay and text cursor.

### Keyboard Navigation

**Which keys do what?**

- Arrow keys behavior?
- Move selection when not editing; navigate text when editing.
- Tab/Shift+Tab?
- Tab moves right; Shift+Tab moves left.
- Enter key (commit and move down, or just commit)?
- Enter commits and moves down.
- Any shortcuts you're adding or skipping?
- Skipping multi-select and clipboard shortcuts for MVP.

### Technical Choices

**How will you implement this?**

- State management approach (useState, useReducer, context)?
- Local state with custom hooks for cell data and selection.
- How will you handle focus management?
- Controlled inputs and refs; explicit commit sources.
- Event handler strategy (bubbling vs individual)?
- Individual handlers for cells; global key listener for navigation.

## Priority 2: Visual Design Decisions

### Visual Hierarchy

**How will users understand the interface?**

- How do headers differ from data cells?
- Bold font weight and slightly larger size for headers.
- How does selected cell stand out?
- Accent border and light background fill.
- How do formulas vs values look different?
- Values in grid; raw formula shown in the formula bar.
- Error state appearance?
- Text inside cell.

### Spacing System

**Your grid dimensions:**

- Cell width and height?
- 104px width, 32px height.
- Padding inside cells?
- 8px horizontal padding.
- Grid gaps or borders?
- Subtle gaps between cells; thin border lines.
- Why these specific measurements?
- Balances density with readability.

### Color Palette

**Your chosen colors:**

```css
/* Fill in your actual color values */
--bg-primary: #ffffff; /* Cell background */
--bg-secondary: #f1f5f9; /* Page background */
--border-default: #e2e8f0; /* Grid lines */
--border-selected: #2563eb; /* Selection */
--text-primary: #1f2937; /* Main text */
--error: #dc2626; /* Error states */
--accent: #2563eb; /* Primary action */
--accent-hover: #1d4ed8; /* Action hover */
```

### Typography

**Your type choices:**

- Font for data cells (monospace or proportional)?
- Proportional Roboto for compactness and readability.
- Font for UI elements?
- Roboto for consistency.
- Size scale (how many sizes, what are they)?
- XS–XL token scale with small defaults in grid.
- Weight variations?
- Regular for data; Medium for headers; Bold for emphasis.

### Motion & Transitions

**How will things move?**

- Will you use transitions? On what?
- Subtle background and outline transitions.
- Animation duration if any?
- ~120–150ms ease for interactions.
- Hover states?
- Light surface tint on hover for cells and buttons.

## Priority 3: Formula Engine Decisions

### Formula Selection

**Which 3-5 formulas did you choose?**

1. Formula 1 - Why?

- SUM — core aggregation for totals.

2. Formula 2 - Why?

- AVG — averages and DIV/0 guard logic.

3. Formula 3 - Why?

- MIN — extremum scanning.

4. Formula 4 - Why?

- MAX — complements MIN for ranges.

5. Formula 5 - Why?

- IF — simple branching for display logic.

### Why These Formulas?

**Your rationale:**

- What do these formulas demonstrate about your engine?
- Cover arithmetic, aggregation, and conditional logic.
- How do they work together?
- Enable basic data analysis and reporting.
- What edge cases do they expose?
- Division by zero, empty cells, and nested formulas.
- What did you NOT choose and why?
- Skipped complex text functions and date handling for simplicity.

### Parser Implementation

**Your parsing approach:**

- Tokenizer/Lexer approach?
- Hand-written lexer emitting typed tokens.
- Parser type (recursive descent, Pratt, etc)?
- Pratt parser with a precedence table.
- How do you handle precedence?
- Precedence levels and right-assoc exponent.
- How do you handle errors?
- Throw tagged parse errors mapped to `PARSE`.

### Evaluation Strategy

**How formulas get calculated:**

- Dependency tracking method?
- Dependency graph built from AST references and ranges.
- Recalculation strategy (everything or just affected)?
- Recompute affected cells via topo order; fallback full pass.
- Cycle detection approach?
- Visited stack detection returning `CYCLE`.
- Error propagation?
- Bubble up error objects; show in cell without crashing.

## Trade-offs & Reflection

### What I Prioritized

1. Most important aspect?

- Correctness and predictable UX.

2. Second priority?

- Keyboard-first navigation.

3. Third priority?

- Maintainable, modular engine.

### What I Sacrificed

1. What did you skip and why?

- Multi-cell selection and clipboard support for time.

2. What would you add with more time?

- Lookup functions, formatting, and paste operations.

3. What was harder than expected?

- Formula parsing and dependency tracking complexity.

### Technical Debt

**Shortcuts taken:**

- What's not production-ready?
- Global recompute without fine-grained invalidation.
- What would need refactoring?
- More robust error handling and user feedback.
- Performance implications?
- Extra recomputation on large sheets.

### Proud Moments

**What worked well:**

- Best implementation detail?
- Function registry replacing switch-based dispatch.
- Clever solution?
- Pratt parser for flexible formula syntax.
- Clean abstraction?
- Address utilities for parsing/formatting.

### Learning Experience

**What you learned:**

- New technique discovered?
- Pratt parsing and dependency graph algorithms.
- What surprised you?
- The complexity of formula parsing and dependency tracking.
- What would you do differently?
- Better initial planning of state management and component structure.

## Time Breakdown

**How you spent your time:**

- Setup & Planning: ??? minutes
  - Draft: ~20–30 min
- Core Functionality: ??? minutes
  - Draft: ~1-1.5 hrs
- Visual Design: ??? minutes
  - Draft: ~30-45 min
- Formula Engine: ??? minutes
  - Draft: ~2–2.5 hrs
- Testing & Polish: ??? minutes
  - Draft: ~30-45 min
- Documentation: ??? minutes
  - Draft: ~20–40 min

**If you had 1 more hour:**

- What would you add/fix/improve?
- Implement multi-cell selection and clipboard operations.

## Final Notes

Any additional thoughts, explanations, or context you want to share?

- Focused on a tight MVP with clean paths for growth.
