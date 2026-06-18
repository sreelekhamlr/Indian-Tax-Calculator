# Execution Plan — Indian Income Tax Calculator

**Source**: [indian_income_tax_calculator_prd.md](file:///c:/Users/smahenderker/OneDrive%20-%20FactSet/CTX-G-Drive/smahenderker/Indian%20Tax%20Calculator/indian_income_tax_calculator_prd.md)  
**Created**: June 11, 2026

---

## Guiding Constraints

- Every phase ends with a **working app you can open in a browser**.
- Phases are ordered so each one builds on the last without rewriting.
- No phase should take more than a single focused session (~2–3 hours).
- The tech stack (framework, styling, charting library) will be confirmed with you before Phase 1 begins.

---

## Phase 1 — Skeleton + Quick-Start Calculator

### What gets built
| Area | Detail |
|:---|:---|
| **Project scaffolding** | Vite + vanilla HTML/CSS/JS (or React — your call). Google Font (Inter or Outfit), CSS custom properties for the design system, dark color palette. |
| **Page layout** | Header with title & FY badge, single-column form area, two-column results area (stacked on mobile), footer with privacy notice & disclaimer. |
| **Input: Quick-Start mode** | One currency field — *"Enter your Annual Gross Salary (₹)"*. Real-time formatting with Indian comma grouping (₹12,50,000). |
| **Input: User profile** | Age group radio (Below 60 / 60–80 / 80+), City type radio (Metro / Non-Metro), Employer type radio (Private / Government). |
| **Tax engine v1** | New Regime slabs (7-tier), Old Regime slabs (3 age variants). Standard deduction auto-applied (₹75k New / ₹50k Old). Section 87A rebate with marginal relief. Surcharge tiers + marginal relief. 4% cess. |
| **Results panel** | Side-by-side cards: Gross Income → Deductions → Taxable Income → Slab-wise breakdown table → Basic Tax → Rebate → Surcharge → Cess → **Total Tax**. |

### What you can do when it's done
Open the page, type a salary like ₹25,00,000, pick an age group, and instantly see accurate Old vs. New tax numbers — slab by slab — with surcharge and cess computed correctly. Change the salary and watch everything recalculate live.

### PRD coverage
US-01, US-05, US-06, US-07, FR-1.1.1, FR-1.3, FR-3.2, FR-4.1, FR-4.2 (partial), §8.1–8.6, NFR-2.1, NFR-2.5, NFR-6.

---

## Phase 2 — Detailed Salary Breakup + Auto-Estimation

### What gets built
| Area | Detail |
|:---|:---|
| **"Show Detailed Breakup" toggle** | Expanding section revealing all 11 salary component fields (Basic, DA, HRA, Special Allowance, LTA, Bonus, Employee EPF, Employer EPF, Professional Tax, Gratuity, Other Allowances). |
| **Auto-estimation logic** | When the user only fills Gross Salary, the system derives: Basic = 40% of Gross, HRA = 50%/40% of Basic (metro/non-metro), EPF = 12% of Basic (capped at ₹15k/month basic), Professional Tax = ₹2,400. User can override any value. |
| **Custom allowances** | "Add Another" button for free-text label + amount rows. |
| **Computed Gross field** | Read-only sum of all components, updating in real time. |
| **Engine update** | Gross Total Income now respects the individual components (Employer EPF excluded from taxable income up to statutory limit). Professional Tax deducted under both regimes. |

### What you can do when it's done
Toggle between quick mode and detailed mode. In detailed mode, tweak Basic or HRA and see how the tax shifts. The auto-estimated breakup gives sensible defaults, but every field is editable.

### PRD coverage
US-02, FR-1.1.2, FR-1.1.3, FR-1.2, FR-2.16, §8.8.

---

## Phase 3 — Section 80C, HRA Exemption & Core Old-Regime Deductions

### What gets built
| Area | Detail |
|:---|:---|
| **Deductions accordion** | Collapsible sections for each deduction group; collapsed by default. |
| **Section 80C group** | Sub-fields: EPF (auto-linked from salary), PPF, ELSS, LIC, Tuition Fees, NSC, Home Loan Principal, SSY, 5-Year FD, Other 80C. Running total + animated progress bar (green → amber → red at cap). Soft warning when total > ₹1,50,000. |
| **HRA Exemption** | Monthly rent input. Auto-calculated exemption using `MIN(HRA received, Rent − 10%×(Basic+DA), CityFactor×(Basic+DA))`. Expandable breakdown showing all three values. Info message when no rent is paid. |
| **Section 80D** | Self/family premium, Parents' premium, Preventive health check-up. "Are your parents Senior Citizens?" checkbox toggling the ₹25k ↔ ₹50k limit. |
| **Regime-awareness** | All Old-only deduction fields are visually greyed out in the New Regime column with a "Not available under the New Regime" label. |

### What you can do when it's done
Enter ₹1,20,000 in PPF and ₹25,000 in health insurance. Watch the 80C progress bar fill. Enter a monthly rent and see HRA exemption auto-compute. The Old Regime tax drops; the New Regime stays the same. The comparison becomes meaningful.

### PRD coverage
US-03, US-04, US-19, FR-2.1, FR-2.2, FR-2.7, FR-2.13, FR-2.14, FR-3.1.

---

## Phase 4 — Remaining Deductions (NPS, Home Loan, 80E/G/TTA/TTB, LTA)

### What gets built
| Area | Detail |
|:---|:---|
| **80CCD(1)** | Manual input, within the 80C+80CCC+80CCD(1) aggregate ₹1,50,000 limit, further capped at 10% of Basic+DA. |
| **80CCC** | Manual input, within the same aggregate limit. |
| **80CCD(1B)** | Manual input, separate ₹50,000 additional limit. |
| **80CCD(2)** | Employer NPS. Clearly labeled as available in **both** regimes. Limit: 10% (Old/Private), 14% (Old/Govt & New/All). |
| **Section 24(b)** | Home loan interest, ₹2,00,000 cap. |
| **Section 80EEA** | First-time buyer interest, ₹1,50,000 cap + informational note about the March 2022 sunset. |
| **Section 80E** | Education loan interest, no cap. |
| **Section 80G** | Inputs for 100% and 50% deduction donations, with 10% of adjusted GTI qualifying limit computed. |
| **80TTA / 80TTB** | Age-aware: 80TTA (₹10k, non-seniors) auto-disables for 60+; 80TTB (₹50k, seniors) auto-disables for <60. |
| **LTA Exemption** | Manual entry for claimed amount. |
| **Take-home salary** | Annual and monthly net take-home: `Gross − Tax − Employee EPF − Professional Tax`. |

### What you can do when it's done
Every deduction field from the PRD is live. Enter employer NPS and see it reduce tax in *both* regimes. Toggle age to 60+ and watch 80TTA swap to 80TTB automatically. Monthly and annual take-home salary are now visible.

### PRD coverage
US-08, US-09, FR-2.3–2.6, FR-2.8–2.12, FR-2.14, FR-2.15, §8.7.

---

## Phase 5 — Recommendation Banner + Tax-Saving Suggestions

### What gets built
| Area | Detail |
|:---|:---|
| **Recommendation banner** | Prominent card at the top of results: *"✅ New Regime saves you ₹24,500 (12.3% less tax)"*. Winning regime column gets a subtle green accent. Equal-tax fallback message. |
| **Effective & marginal tax rates** | Displayed for each regime below the total tax. |
| **Tax-saving suggestions engine** | Dynamic rules: detect unused 80C headroom, unused 80CCD(1B), missing 80D for parents, missing 24(b), missing 80CCD(2). Each suggestion shows the ₹ saving at the user's marginal rate. Ranked by potential saving descending. "All maxed out" congratulations message when nothing is unused. |
| **Suggestions panel** | Dedicated section below the comparison, styled as actionable cards. Old Regime only label. |

### What you can do when it's done
The tool is no longer passive — it tells you which regime wins and why. It also highlights exactly how much more you could save if you invest in unused deduction slots. This is the "aha" moment for most users.

### PRD coverage
US-10, US-14, US-15, FR-5.1–5.5, FR-7.1–7.5.

---

## Phase 6 — Interactive Charts & Visualizations

### What gets built
| Area | Detail |
|:---|:---|
| **Charting library** | Integrate a library (e.g., Chart.js or Recharts). |
| **Regime comparison bar chart** | Grouped bars — Old vs. New total tax. Hover for exact values. |
| **Tax breakup donut charts** | One per regime: Base Tax / Surcharge / Cess slices. |
| **Slab distribution bars** | Stacked horizontal bar per regime showing income falling in each slab. |
| **Income allocation chart** | Stacked bar or Sankey: Gross Salary → Tax + Deductions + EPF + Take-Home. |
| **Accessibility** | All charts have a hidden data-table equivalent for screen readers. Colour-blind-safe palette. |

### What you can do when it's done
Scroll past the numbers and see beautiful, interactive charts that make the comparison intuitive. Hover over any segment to see exact amounts and percentages. Resize the browser — charts scale gracefully.

### PRD coverage
US-11, US-12, US-13, FR-6.1–6.3, NFR-3.4.

---

## Phase 7 — Tooltips, Validation & Accessibility Polish

### What gets built
| Area | Detail |
|:---|:---|
| **Tooltips** | Every deduction field gets a plain-English `ⓘ` tooltip (keyboard-accessible on focus, not just hover). Content sourced from the PRD's FR-2.x notes. |
| **Input validation** | Indian comma formatting on all currency fields. Soft warnings (80C > ₹1.5L, rent > salary). Inline error for negatives/non-numeric. Paste sanitization (strip non-numeric). |
| **Edge cases** | ₹0 salary → "No tax applicable". Marginal relief edge cases validated. Senior/super-senior slab switching. |
| **Accessibility audit** | `<label>` on every input, ARIA landmarks, skip-to-content link, focus indicators, colour contrast ≥ 4.5:1, tab order. |
| **Responsive polish** | Side-by-side → tabbed/stacked on mobile. Touch targets ≥ 44×44px. `<noscript>` fallback. Print stylesheet. |
| **SEO meta** | `<title>`, meta description, Open Graph / Twitter Card tags, semantic HTML5 (`<main>`, `<section>`, `<article>`). |

### What you can do when it's done
The app feels *finished*. Hover over any jargon term and get a clear explanation. Try pasting "abc" into a field — it's handled. Resize to mobile — the layout adapts cleanly. Run a Lighthouse audit — scores should be 90+.

### PRD coverage
US-18, US-19, NFR-1 through NFR-6, §9.1, §9.2.

---

## Phase 8 — PDF Export & Shareable Links

### What gets built
| Area | Detail |
|:---|:---|
| **PDF export** | "Download PDF" button. Client-side generation (jsPDF + html2canvas or equivalent). Report includes: inputs, deduction summary, slab breakdown for both regimes, comparison table, suggestions, charts as static images, disclaimer, FY branding. |
| **Shareable link** | "Share" button encodes all inputs into compressed URL query parameters (lz-string or Base64). Opening the link pre-fills the calculator. Corrupted parameters → graceful fallback to defaults with info toast. |
| **Privacy notice** | Visible badge: *"Your data stays in your browser. We do not store or transmit any financial information."* |
| **Final QA pass** | Cross-browser check (Chrome, Firefox, Edge, Safari). Mobile Safari + Chrome Android. End-to-end test with Persona 1–4 scenarios from PRD §2. |

### What you can do when it's done
Fill in a full calculation, download a professional PDF to share with your CA, or generate a link that lets a family member see your exact scenario. The app is production-ready.

### PRD coverage
US-16, US-17, FR-8.1, FR-8.2, NFR-2.2–2.4.

---

## Summary Matrix

| Phase | Key Deliverable | PRD Priorities Covered | Cumulative State |
|:---:|:---|:---:|:---|
| 1 | Skeleton + accurate tax engine | P0 | Basic calculator works |
| 2 | Detailed salary breakup | P0 | Full income input |
| 3 | 80C, HRA, 80D | P0 | Core deductions live |
| 4 | All remaining deductions + take-home | P0 + P1 | Complete deduction suite |
| 5 | Recommendation + suggestions | P0 + P1 | Intelligent advisor |
| 6 | Charts & visualizations | P1 | Visual storytelling |
| 7 | Tooltips, validation, a11y | P0 + P1 | Production-grade UX |
| 8 | PDF export + shareable links | P1 + P2 | Ship-ready |

---

## Decisions Needed Before Phase 1

| # | Question | Options |
|:---:|:---|:---|
| 1 | **Framework** | Plain HTML/CSS/JS (simplest) · Vite + React (component model) · Next.js (SSR, heavier) |
| 2 | **Styling** | Vanilla CSS (full control) · Tailwind CSS (rapid, utility-first — specify version) |
| 3 | **Charting library** (Phase 6) | Chart.js · Recharts (React only) · D3 (most flexible, steepest curve) |

*No code will be written until you confirm these choices and approve this plan.*
