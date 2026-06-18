# Indian Income Tax Calculator

A comprehensive, client-side web application to compare the Old and New tax regimes for the Indian Income Tax (FY 2025-26 / AY 2026-27). This calculator is built to be lightning-fast, privacy-friendly, and highly detailed.

## Features

- **Accurate Engine**: Complete implementation of the FY 2025-26 tax slabs, standard deductions, 87A rebate (with marginal relief), and surcharges (with marginal relief).
- **Intelligent Auto-Estimation**: Enter your gross salary and the calculator will automatically estimate a standard salary breakup (Basic, HRA, EPF) to give you instant comparisons.
- **Detailed Breakdowns**: Fully editable salary components and deductions (80C, 80D, HRA Exemption, 24b Home Loan, NPS 80CCD, 80G, LTA, etc.).
- **Tax-Saving Advisor**: Dynamically analyzes your inputs and suggests the best ways to reduce your tax burden in the Old Regime (e.g., maximizing 80C, adding NPS).
- **Visual Analytics**: Interactive bar charts, donut charts, and slab distribution charts built with Chart.js to visually compare where your money goes.
- **Export & Share**: Generate a PDF report of your calculation or create a shareable URL to securely share your tax scenario.
- **100% Private**: All calculations run entirely in the browser. No financial data is ever stored or transmitted to a server.
- **Accessible & Responsive**: Keyboard navigable tooltips, ARIA labels, skip links, and a layout that adapts seamlessly from desktop to mobile.

## Tech Stack

- **HTML5 & CSS3**: Vanilla, semantic HTML with a robust CSS custom properties design system.
- **JavaScript (ES6+)**: Pure JS modular architecture (`taxEngine.js`, `formatter.js`, `main.js`). No heavy UI frameworks.
- **Vite**: Ultra-fast frontend build tool.
- **Chart.js**: For beautiful, responsive canvas-based charts.
- **html2pdf.js**: For client-side PDF generation.

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm

### Installation & Running

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Project Structure

- `index.html`: The main markup and layout.
- `css/style.css`: The complete design system and responsive styles.
- `js/taxEngine.js`: The pure, stateless tax computation engine.
- `js/formatter.js`: Utilities for Indian Rupee formatting and parsing.
- `js/main.js`: DOM interactions, event listeners, and charting logic.
- `indian_income_tax_calculator_prd.md`: The original Product Requirements Document.
- `execution_plan.md`: The phased development roadmap.

## Disclaimer

This calculator provides estimates based on the Income Tax Act provisions for FY 2025-26. It is designed for educational and informational purposes. Please consult a qualified tax professional or Chartered Accountant before making financial decisions or filing your income tax return.
