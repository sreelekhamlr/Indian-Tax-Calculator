/* ═══════════════════════════════════════════════════════
   Main Application — Event Wiring & DOM Rendering
   Phase 2: Detailed Salary Breakup + Auto-Estimation
   ═══════════════════════════════════════════════════════ */

import { computeTax } from './taxEngine.js';
import {
  formatIndian,
  formatRupee,
  formatSlabBound,
  formatPercent,
  parseIndian,
} from './formatter.js';


// ─── SIDEBAR NAVIGATION ───
document.querySelectorAll('.sidebar__link').forEach(link => {
  link.addEventListener('click', (e) => {
    if (link.id === 'sidebar-download') return; // Handled separately
    
    // Update active class
    document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    
    // Switch view
    const targetView = link.getAttribute('data-view');
    document.querySelectorAll('.view').forEach(v => {
      v.hidden = true;
      v.classList.remove('view--active');
    });
    
    const viewEl = document.getElementById('view-' + targetView);
    if (viewEl) {
      viewEl.hidden = false;
      viewEl.classList.add('view--active');
    }
  });
});

// ─── DOM REFERENCES ───

const grossSalaryInput  = document.getElementById('gross-salary');
const breakupToggle     = document.getElementById('breakup-toggle');
const breakupSection    = document.getElementById('breakup-section');
const computedGrossEl   = document.getElementById('computed-gross-value');
const computedGrossWrap = computedGrossEl.closest('.computed-gross');
const btnAddAllowance   = document.getElementById('btn-add-allowance');
const customRowsContainer = document.getElementById('custom-allowance-rows');

const recoBanner        = document.getElementById('overview-reco-banner');
const recoBannerContent = document.getElementById('reco-banner-content');
const panelOld          = document.getElementById('panel-old');
const panelNew          = document.getElementById('panel-new');
const bodyOld           = document.getElementById('body-old');
const bodyNew           = document.getElementById('body-new');
const tagOld            = document.getElementById('tag-old');
const tagNew            = document.getElementById('tag-new');

// ─── DEDUCTIONS UI ELEMENTS ───
const dedEpfInput = document.getElementById('ded-epf');
const ded80cInputs = document.querySelectorAll('.ded-80c');
const ded80dInputs = document.querySelectorAll('.ded-80d');
const rentPaidInput = document.getElementById('rent-paid');
const parentsSeniorCheckbox = document.getElementById('parents-senior');

const progress80cFill = document.getElementById('progress-80c');
const total80cValue = document.getElementById('total-80c-value');
const warning80c = document.getElementById('warning-80c');

// Salary component input IDs → field references
const COMPONENT_IDS = [
  'salary-basic', 'salary-da', 'salary-hra', 'salary-special',
  'salary-lta', 'salary-bonus', 'salary-epf-employee', 'salary-epf-employer',
  'salary-pt', 'salary-gratuity',
];

const componentInputs = {};
for (const id of COMPONENT_IDS) {
  componentInputs[id] = document.getElementById(id);
}


// ─── STATE ───

let debounceTimer = null;
let isDetailedMode = false;
let isAutoEstimating = false;  // Flag to prevent loops during auto-estimation
let userOverrides = {};        // Tracks which fields the user has manually edited
let customAllowanceCounter = 0;




// ─── BREAKUP TOGGLE ───

breakupToggle.addEventListener('click', () => {
  isDetailedMode = !isDetailedMode;

  breakupToggle.setAttribute('aria-expanded', isDetailedMode.toString());
  breakupSection.hidden = !isDetailedMode;

  // Update toggle text
  breakupToggle.querySelector('.breakup-toggle__text').textContent =
    isDetailedMode ? 'Hide Detailed Salary Breakup' : 'Show Detailed Salary Breakup';

  if (isDetailedMode) {
    // Auto-estimate breakup from gross salary (if we have one)
    const gross = parseIndian(grossSalaryInput.value);
    if (gross > 0) {
      autoEstimate(gross);
    }
  } else {
    // Switching back to quick mode: clear overrides and hide custom rows
    userOverrides = {};
    const customRows = customRowsContainer.querySelectorAll('.custom-allowance-row');
    customRows.forEach(row => row.remove());
    customAllowanceCounter = 0;
  }

  scheduleCompute();
});


// ─── INITIALIZATION ───

const radios = document.querySelectorAll('input[type="radio"]');
radios.forEach(r => r.addEventListener('change', () => {
  scheduleCompute();
  updateDeductionsUI();
}));

// Add listener to the new deduction inputs
const allDeductions = [...ded80cInputs, ...ded80dInputs, rentPaidInput];
allDeductions.forEach(input => {
  input.addEventListener('input', handleCurrencyInput);
  input.addEventListener('keydown', handleCurrencyKeydown);
  input.addEventListener('paste', handleCurrencyPaste);
});

parentsSeniorCheckbox.addEventListener('change', () => {
  scheduleCompute();
  updateDeductionsUI();
});

// Initial estimate and render
if (grossSalaryInput.value) {
  autoEstimate(parseIndian(grossSalaryInput.value));
  updateDeductionsUI();
}
scheduleCompute();


// ─── AUTO-ESTIMATION LOGIC ───
// When user enters Gross Salary and opens detailed mode,
// fill in sensible defaults per PRD FR-1.1.2

function autoEstimate(gross) {
  if (isAutoEstimating) return;
  isAutoEstimating = true;

  const cityType = getRadioValue('city-type') || 'metro';
  const hraFactor = cityType === 'metro' ? 0.50 : 0.40;

  const basic = Math.round(gross * 0.40);
  const hra = Math.round(basic * hraFactor);
  const special = Math.max(gross - basic - hra, 0);

  // EPF: 12% of Basic, capped at Basic of ₹15,000/month (₹1,80,000/year)
  const epfBasicCap = Math.min(basic, 180000);
  const epfEmployee = Math.round(epfBasicCap * 0.12);
  const epfEmployer = Math.round(epfBasicCap * 0.12);

  const pt = 2400;

  const estimates = {
    'salary-basic': basic,
    'salary-da': 0,
    'salary-hra': hra,
    'salary-special': special,
    'salary-lta': 0,
    'salary-bonus': 0,
    'salary-epf-employee': epfEmployee,
    'salary-epf-employer': epfEmployer,
    'salary-pt': pt,
    'salary-gratuity': 0,
  };

  for (const [id, value] of Object.entries(estimates)) {
    // Only fill if user hasn't manually overridden this field
    if (!userOverrides[id]) {
      const input = componentInputs[id];
      input.value = value > 0 ? formatIndian(value) : '';
      input.classList.add('field__input--estimated');
    }
  }

  updateComputedGross(false);
  isAutoEstimating = false;

  // Since components changed, sync EPF to deductions and update 80C UI
  dedEpfInput.value = componentInputs['salary-epf-employee'].value;
  updateDeductionsUI();
}


// ─── CURRENCY INPUT HANDLER (GENERIC) ───

function handleCurrencyInput(e) {
  const input = e.target;
  const raw = input.value.replace(/[^0-9]/g, '');
  const num = parseInt(raw, 10);

  if (raw === '' || isNaN(num)) {
    input.value = '';
  } else {
    const caretPos = input.selectionStart;
    const oldLen = input.value.length;
    const formatted = formatIndian(num);
    input.value = formatted;
    const newLen = formatted.length;
    const diff = newLen - oldLen;
    const newCaret = Math.max(0, caretPos + diff);
    input.setSelectionRange(newCaret, newCaret);
  }

  // If this is a component field, mark it as user-overridden
  if (COMPONENT_IDS.includes(input.id)) {
    if (input.value !== '') {
      userOverrides[input.id] = true;
      input.classList.remove('field__input--estimated');
    } else {
      delete userOverrides[input.id];
    }
  }

  // If user edits the gross salary while in detailed mode, re-estimate non-overridden fields
  if (input.id === 'gross-salary' && isDetailedMode) {
    const gross = parseIndian(input.value);
    if (gross > 0) {
      autoEstimate(gross);
    }
  }

  // If user edits a component field, update computed gross and sync to main input
  const isComponent = COMPONENT_IDS.includes(input.id) || input.classList.contains('custom-allowance-amount');
  if (isComponent) {
    updateComputedGross(true);
    
    // Sync EPF to the 80C section
    if (input.id === 'salary-epf-employee') {
      dedEpfInput.value = input.value;
      updateDeductionsUI();
    }
  }

  // Update deductions UI if a deduction field changed
  if (input.classList.contains('ded-80c') || input.classList.contains('ded-80d') || input.id === 'rent-paid') {
    updateDeductionsUI();
  }

  scheduleCompute();
}

function handleCurrencyKeydown(e) {
  const allowed = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End',
  ];
  if (allowed.includes(e.key)) return;
  if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
}

function handleCurrencyPaste(e) {
  e.preventDefault();
  const pasted = (e.clipboardData || window.clipboardData).getData('text');
  const cleaned = pasted.replace(/[^0-9]/g, '');
  if (cleaned) {
    const num = parseInt(cleaned, 10);
    e.target.value = formatIndian(num);

    if (COMPONENT_IDS.includes(e.target.id)) {
      userOverrides[e.target.id] = true;
      e.target.classList.remove('field__input--estimated');
    }

    // Sync EPF to the 80C section
    if (e.target.id === 'salary-epf-employee') {
      dedEpfInput.value = e.target.value;
      updateDeductionsUI();
    }

    // Update deductions UI if a deduction field changed
    if (e.target.classList.contains('ded-80c') || e.target.classList.contains('ded-80d') || e.target.id === 'rent-paid') {
      updateDeductionsUI();
    }

    const isComponent = COMPONENT_IDS.includes(e.target.id) || e.target.classList.contains('custom-allowance-amount');
    if (isComponent) {
      updateComputedGross(true);
    }

    scheduleCompute();
  }
}


// ─── COMPUTED GROSS ───

function getComponentsTotal() {
  let total = 0;
  
  // Only sum components that are actually part of Gross Salary
  const incomeComponentIds = [
    'salary-basic', 'salary-da', 'salary-hra', 'salary-special',
    'salary-lta', 'salary-bonus'
  ];
  
  for (const id of incomeComponentIds) {
    total += parseIndian(componentInputs[id].value);
  }

  // Add custom allowances
  const customRows = customRowsContainer.querySelectorAll('.custom-allowance-row');
  for (const row of customRows) {
    const amountInput = row.querySelector('.field__input--sm');
    if (amountInput) {
      total += parseIndian(amountInput.value);
    }
  }

  return total;
}

function updateComputedGross(syncToGross = false) {
  const total = getComponentsTotal();
  computedGrossEl.textContent = formatRupee(total);

  const mainGross = parseIndian(grossSalaryInput.value);

  // Sync back to the main gross salary input so the tax engine uses the aggregated value
  if (isDetailedMode && syncToGross) {
    if (mainGross !== total) {
      grossSalaryInput.value = formatIndian(total);
    }
  } else {
    // Highlight mismatch with the main gross salary field if we didn't sync
    const mismatch = mainGross > 0 && total > 0 && Math.abs(mainGross - total) > 1;
    computedGrossWrap.classList.toggle('computed-gross--mismatch', mismatch);
  }
}


// ─── CUSTOM ALLOWANCES ───

function addCustomAllowanceRow() {
  customAllowanceCounter++;
  const rowId = `custom-allowance-${customAllowanceCounter}`;

  const row = document.createElement('div');
  row.className = 'custom-allowance-row';
  row.id = rowId;
  row.innerHTML = `
    <input
      type="text"
      class="custom-allowance-row__name"
      placeholder="Allowance name"
      maxlength="50"
      aria-label="Custom allowance name"
    />
    <div class="field__currency-wrap field__currency-wrap--sm">
      <span class="field__currency-symbol field__currency-symbol--sm" aria-hidden="true">₹</span>
      <input
        type="text"
        class="field__input field__input--sm custom-allowance-amount"
        inputmode="numeric"
        autocomplete="off"
        placeholder="0"
        aria-label="Custom allowance amount"
      />
    </div>
    <button type="button" class="btn-remove" aria-label="Remove this allowance" data-row="${rowId}">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  `;

  customRowsContainer.appendChild(row);

  // Wire events
  const amountInput = row.querySelector('.custom-allowance-amount');
  amountInput.addEventListener('input', handleCurrencyInput);
  amountInput.addEventListener('keydown', handleCurrencyKeydown);
  amountInput.addEventListener('paste', handleCurrencyPaste);

  const removeBtn = row.querySelector('.btn-remove');
  removeBtn.addEventListener('click', () => {
    row.remove();
    updateComputedGross(true);
    scheduleCompute();
  });

  // Focus the name input
  row.querySelector('.custom-allowance-row__name').focus();
}

btnAddAllowance.addEventListener('click', addCustomAllowanceRow);


// ─── READ / SET RADIO VALUES ───

function getRadioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

function setRadioValue(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) {
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}


// ─── DEBOUNCED COMPUTE ───

function scheduleCompute() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runCompute, 300);
}


// ─── COLLECT SALARY COMPONENTS ───

function collectSalaryComponents() {
  if (!isDetailedMode) return null;

  const customTotal = (() => {
    let sum = 0;
    const rows = customRowsContainer.querySelectorAll('.custom-allowance-amount');
    for (const input of rows) {
      sum += parseIndian(input.value);
    }
    return sum;
  })();

  return {
    basic: parseIndian(componentInputs['salary-basic'].value),
    da: parseIndian(componentInputs['salary-da'].value),
    hra: parseIndian(componentInputs['salary-hra'].value),
    special: parseIndian(componentInputs['salary-special'].value),
    lta: parseIndian(componentInputs['salary-lta'].value),
    bonus: parseIndian(componentInputs['salary-bonus'].value),
    epfEmployee: parseIndian(componentInputs['salary-epf-employee'].value),
    epfEmployer: parseIndian(componentInputs['salary-epf-employer'].value),
    professionalTax: parseIndian(componentInputs['salary-pt'].value),
    gratuity: parseIndian(componentInputs['salary-gratuity'].value),
    otherAllowances: customTotal,
  };
}


// ─── DEDUCTIONS LOGIC ───

function updateDeductionsUI() {
  // 1. Section 80C Progress Bar
  const epf = parseIndian(dedEpfInput.value);
  let other80c = 0;
  ded80cInputs.forEach(input => {
    other80c += parseIndian(input.value);
  });
  
  const total80c = epf + other80c;
  const cap80c = 150000;
  
  total80cValue.textContent = `${formatRupee(total80c)} / ₹1.5L`;
  
  const pct = Math.min((total80c / cap80c) * 100, 100);
  progress80cFill.style.width = `${pct}%`;
  
  // Colors: < 80% green, 80-99% amber, 100% red
  progress80cFill.className = 'progress-bar__fill';
  if (pct >= 100) {
    progress80cFill.classList.add('progress-bar__fill--red');
  } else if (pct >= 80) {
    progress80cFill.classList.add('progress-bar__fill--amber');
  }
  
  warning80c.hidden = total80c <= cap80c;

  // 2. Rent Warning
  const rentPaid = parseIndian(rentPaidInput.value);
  const basic = parseIndian(componentInputs['salary-basic'].value);
  const da = parseIndian(componentInputs['salary-da'].value);
  const warningRent = document.getElementById('warning-rent');
  if (warningRent) {
    warningRent.hidden = !(rentPaid > 0 && rentPaid > (basic + da));
  }
}

function collectDeductions() {
  const epf = parseIndian(dedEpfInput.value);
  let other80c = 0;
  ded80cInputs.forEach(input => {
    other80c += parseIndian(input.value);
  });
  
  // 80D Logic
  const selfPremium = parseIndian(document.getElementById('ded-80d-self').value);
  const parentsPremium = parseIndian(document.getElementById('ded-80d-parents').value);
  const healthCheck = parseIndian(document.getElementById('ded-80d-health').value);
  const parentsSenior = parentsSeniorCheckbox.checked;
  
  const selfLimit = 25000;
  const parentsLimit = parentsSenior ? 50000 : 25000;
  
  // Health checkup has a sub-limit of 5k, shared across self and parents, but we'll apply it simply
  // For precise rules: total health check <= 5000, and it's within the overall limits
  // We'll distribute health check to self first, then parents if self is full
  let remainingHealthCheck = Math.min(healthCheck, 5000);
  
  let eligibleSelf = Math.min(selfPremium + remainingHealthCheck, selfLimit);
  remainingHealthCheck -= Math.max(0, eligibleSelf - selfPremium);
  
  let eligibleParents = Math.min(parentsPremium + remainingHealthCheck, parentsLimit);
  
  // New Deductions
  const nps1b = parseIndian(document.getElementById('ded-80ccd1b').value);
  const nps2 = parseIndian(document.getElementById('ded-80ccd2').value);
  const homeLoanInterest = parseIndian(document.getElementById('ded-24b').value);
  const homeLoanEEA = parseIndian(document.getElementById('ded-80eea').value);
  const eduLoanInterest = parseIndian(document.getElementById('ded-80e').value);
  const donation100 = parseIndian(document.getElementById('ded-80g-100').value);
  const donation50 = parseIndian(document.getElementById('ded-80g-50').value);
  const savingsInterest = parseIndian(document.getElementById('ded-80tta').value);
  const ltaClaimed = parseIndian(document.getElementById('ded-lta').value);

  return {
    sec80c: epf + other80c, // includes 80C, 80CCC, 80CCD(1) aggregate
    sec80d: eligibleSelf + eligibleParents,
    nps1b,
    nps2,
    homeLoanInterest,
    homeLoanEEA,
    eduLoanInterest,
    donation100,
    donation50,
    savingsInterest,
    ltaClaimed
  };
}

function collectExemptions() {
  return {
    rentPaid: parseIndian(rentPaidInput.value)
  };
}

// ─── RENDER DASHBOARD ───


function renderDashboard(oldResult, newResult) {
  try {
    // Destroy existing charts
    if (window.chartDonut) window.chartDonut.destroy();
    if (window.chartBar) window.chartBar.destroy();

    // 1. Income Distribution (Donut)
    const ctxDonut = document.getElementById('income-donut-chart').getContext('2d');
    const basic = oldResult.salaryComponents ? oldResult.salaryComponents.basic : 0;
    const hra = oldResult.salaryComponents ? oldResult.salaryComponents.hra : 0;
    const special = oldResult.salaryComponents ? oldResult.salaryComponents.special : 0;
    const other = oldResult.grossTotalIncome - (basic + hra + special);
    
    window.chartDonut = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: ['Basic Salary', 'Special Allowance', 'HRA', 'Others'],
        datasets: [{
          data: [basic, special, hra, other],
          backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#f59e0b'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#f1f5f9' } }
        }
      }
    });

    // 2. Regime Comparison (Bar)
    const ctxBar = document.getElementById('regime-bar-chart').getContext('2d');
    window.chartBar = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: ['Gross Income', 'Total Tax', 'Take Home'],
        datasets: [
          {
            label: 'Old Regime',
            data: [oldResult.grossTotalIncome, oldResult.totalTax, oldResult.netTakeHomeAnnual],
            backgroundColor: '#6366f1',
            borderRadius: 4
          },
          {
            label: 'New Regime',
            data: [newResult.grossTotalIncome, newResult.totalTax, newResult.netTakeHomeAnnual],
            backgroundColor: '#34d399',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: '#f1f5f9' } } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#9ca3af', callback: (val) => '₹' + (val/100000).toFixed(1) + 'L' } },
          x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
        }
      }
    });

    // 3. Salary Details Summary
    const sumEl = document.getElementById('salary-summary-content');
    if (sumEl) {
      sumEl.innerHTML = `
        <div class="result-row"><span>Annual Gross Salary</span><strong>₹${formatIndian(oldResult.grossTotalIncome)}</strong></div>
        <div class="result-row"><span>Basic Salary</span><strong>₹${formatIndian(basic)}</strong></div>
        <div class="result-row"><span>HRA</span><strong>₹${formatIndian(hra)}</strong></div>
        <div class="result-row"><span>Special Allowance</span><strong>₹${formatIndian(special)}</strong></div>
        <div class="result-row"><span>Professional Tax</span><strong>₹2,400</strong></div>
      `;
    }

    // 4. Move panels into dashboard
    const dashPanels = document.getElementById('dashboard-panels-container');
    const oldPanel = document.getElementById('panel-old');
    const newPanel = document.getElementById('panel-new');
    if (dashPanels && oldPanel && newPanel) {
      dashPanels.appendChild(oldPanel);
      dashPanels.appendChild(newPanel);
    }
    
    // 5. Render Tax-Saving Suggestions
    renderTaxSuggestions(oldResult);

  } catch (e) {
    console.error("Dashboard render error:", e);
  }
}



// ─── INITIALIZATION ───

function runCompute() {
  const grossSalary = parseIndian(grossSalaryInput.value);
  const ageGroup = getRadioValue('age-group');
  const cityType = getRadioValue('city-type');
  const employerType = 'private'; // Hardcoded for now based on previous UI

  const salaryComponents = isDetailedMode ? collectSalaryComponents() : null;
  const deductionsInputs = collectDeductions();
  const exemptionsInputs = collectExemptions();

  const oldResult = computeTax({
    grossSalary,
    regime: 'old',
    ageGroup,
    cityType,
    employerType,
    salaryComponents,
    deductionsInputs,
    exemptionsInputs
  });

  const newResult = computeTax({
    grossSalary,
    regime: 'new',
    ageGroup,
    cityType,
    employerType,
    salaryComponents,
    deductionsInputs,
    exemptionsInputs
  });

  renderDashboard(oldResult, newResult);
  renderPanel('old', oldResult, document.getElementById('panel-old'), document.getElementById('body-old'), document.getElementById('tag-old'));
  renderPanel('new', newResult, document.getElementById('panel-new'), document.getElementById('body-new'), document.getElementById('tag-new'));
  renderRecommendation(oldResult, newResult);
}

function renderPanel(regime, result, panelEl, bodyEl, tagEl) {
  let html = '<div class="animate-in">';
  html += resultRow('Gross Total Income', formatRupee(result.grossTotalIncome));

  if (result.hraExemption > 0) {
    html += resultRow('HRA Exemption', `− ${formatRupee(result.hraExemption)}`);
    html += resultRow('Gross Income (After Exemptions)', formatRupee(result.grossTotalIncomeAfterExemptions));
  }

  html += resultRow('Standard Deduction', `− ${formatRupee(result.standardDeduction)}`);
  
  if (regime === 'old' && result.professionalTax > 0) {
    html += resultRow('Professional Tax', `− ${formatRupee(result.professionalTax)}`);
  }
  if (result.sec80c > 0) html += resultRow('Section 80C', `− ${formatRupee(result.sec80c)}`);
  if (result.sec80d > 0) html += resultRow('Section 80D', `− ${formatRupee(result.sec80d)}`);
  if (result.nps1b > 0) html += resultRow('NPS Tier-1 80CCD(1B)', `− ${formatRupee(result.nps1b)}`);
  if (result.nps2 > 0) html += resultRow('Employer NPS 80CCD(2)', `− ${formatRupee(result.nps2)}`);
  if (result.homeLoan > 0) html += resultRow('Home Loan Interest', `− ${formatRupee(result.homeLoan)}`);
  if (result.otherDed > 0) html += resultRow('Other Deductions (80TTA, 80E, 80G)', `− ${formatRupee(result.otherDed)}`);
  html += resultRow('Total Deductions', `− ${formatRupee(result.totalDeductions)}`);
  html += '<div class="result-divider"></div>';
  html += resultRow('Taxable Income', formatRupee(result.taxableIncome), true);
  html += renderSlabTable(result);
  html += '<div class="result-divider"></div>';
  html += resultRow('Total Tax Payable', formatRupee(result.totalTax), true, 'accent');
  html += resultRow('Monthly Tax', formatRupee(Math.round(result.totalTax / 12)));
  html += '<div class="result-divider"></div>';
  html += resultRow('Net Take-Home (Annual)', formatRupee(result.netTakeHomeAnnual), true, 'success');
  html += resultRow('Net Take-Home (Monthly)', formatRupee(Math.round(result.netTakeHomeAnnual / 12)));
  
  html += '<div class="result-metrics">';
  html += `<div class="metric"><span>Effective Rate:</span> <strong>${result.effectiveRate.toFixed(2)}%</strong></div>`;
  html += `<div class="metric"><span>Marginal Rate:</span> <strong>${result.marginalRate.toFixed(2)}%</strong></div>`;
  html += '</div></div>';

  bodyEl.innerHTML = html;
}

function renderSlabTable(result) {
  let html = '<div class="slab-table">';
  html += '<div class="slab-table__header"><span>Slab Range</span><span>Rate</span><span>Tax</span></div>';
  
  const slabs = result.slabBreakdown || [];
  for (const slab of slabs) {
    const rangeStr = slab.to === Infinity ? `Above ₹${(slab.from/100000).toFixed(1)}L` : `₹${(slab.from/100000).toFixed(1)}L - ₹${(slab.to/100000).toFixed(1)}L`;
    html += `<div class="slab-table__row">
      <span>${rangeStr}</span>
      <span>${slab.rate === 0 ? 'Nil' : (slab.rate * 100) + '%'}</span>
      <strong>${slab.taxOnSlab === 0 ? '₹0' : formatRupee(slab.taxOnSlab)}</strong>
    </div>`;
  }
  
  html += '<div class="slab-table__summary">';
  html += `<div class="slab-table__row"><span>Basic Tax</span><strong>${formatRupee(result.basicTax)}</strong></div>`;
  if (result.surchargeAmount > 0) html += `<div class="slab-table__row"><span>Surcharge</span><strong>${formatRupee(result.surchargeAmount)}</strong></div>`;
  if (result.marginalRelief > 0) html += `<div class="slab-table__row"><span>Marginal Relief</span><strong>− ${formatRupee(result.marginalRelief)}</strong></div>`;
  if (result.rebate > 0) html += `<div class="slab-table__row"><span>Section 87A Rebate</span><strong>− ${formatRupee(result.rebate)}</strong></div>`;
  html += `<div class="slab-table__row"><span>Tax After Rebate</span><strong>${formatRupee(result.taxAfterRebate + (result.surchargeAmount || 0))}</strong></div>`;
  html += `<div class="slab-table__row"><span>Health & Education Cess (4%)</span><strong>${formatRupee(result.cess)}</strong></div>`;
  html += '</div></div>';
  return html;
}

function renderRecommendation(oldResult, newResult) {
  const diff = oldResult.totalTax - newResult.totalTax;
  let html = '';
  
  const tagOld = document.getElementById('tag-old');
  const tagNew = document.getElementById('tag-new');
  if (tagOld) tagOld.style.display = 'none';
  if (tagNew) tagNew.style.display = 'none';

  if (diff > 0) {
    html = `<div class="reco-content"><div class="reco-icon">🏆</div><div><div class="reco-title">Recommended: <strong>New Regime</strong></div><div class="reco-desc">Saves you <strong>${formatRupee(diff)}</strong> in tax</div></div></div>`;
    if (tagNew) tagNew.style.display = 'flex';
  } else if (diff < 0) {
    html = `<div class="reco-content"><div class="reco-icon">🏆</div><div><div class="reco-title">Recommended: <strong>Old Regime</strong></div><div class="reco-desc">Saves you <strong>${formatRupee(Math.abs(diff))}</strong> in tax</div></div></div>`;
    if (tagOld) tagOld.style.display = 'flex';
  } else {
    html = `<div class="reco-content"><div class="reco-icon">⚖️</div><div><div class="reco-title"><strong>Both Regimes</strong></div><div class="reco-desc">Taxes are identical. New Regime means less paperwork!</div></div></div>`;
  }
  
  const recoBanner = document.getElementById('overview-reco-banner');
  if (recoBanner) {
      recoBanner.innerHTML = html;
      recoBanner.className = 'reco-banner';
  }
}

function resultRow(label, value, isBold = false, colorClass = '') {
  let vClass = '';
  if (colorClass === 'accent') vClass = 'text-accent';
  if (colorClass === 'success') vClass = 'text-success';
  const valHtml = isBold ? `<strong class="${vClass}">${value}</strong>` : `<span class="${vClass}">${value}</span>`;
  const lblHtml = isBold ? `<strong>${label}</strong>` : `<span>${label}</span>`;
  return `<div class="result-row">${lblHtml}${valHtml}</div>`;
}


function downloadPDF() {
  const element = document.getElementById('dashboard-wrapper') || document.querySelector('.main-content');
  html2pdf().set({
    margin: 10,
    filename: 'Tax_Estimate_FY25-26.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(element).save();
}

// ─── WIRING EVENT LISTENERS ───
grossSalaryInput.addEventListener('input', (e) => {
  handleCurrencyInput(e);
  updateComputedGross();
  scheduleCompute();
});
grossSalaryInput.addEventListener('keydown', handleCurrencyKeydown);
grossSalaryInput.addEventListener('paste', handleCurrencyPaste);

for (const id of COMPONENT_IDS) {
  const input = componentInputs[id];
  if (input) {
    input.addEventListener('input', handleCurrencyInput);
    input.addEventListener('keydown', handleCurrencyKeydown);
    input.addEventListener('paste', handleCurrencyPaste);
  }
}

// Wire all deductions and other text inputs
document.querySelectorAll('.view input[type="text"]').forEach(input => {
  if (input.id !== 'gross-salary' && !COMPONENT_IDS.includes(input.id)) {
    input.addEventListener('input', (e) => {
      handleCurrencyInput(e);
      if (input.classList.contains('ded-80c') || input.id === 'ded-epf') {
        update80cProgress();
      }
      scheduleCompute();
    });
    input.addEventListener('keydown', handleCurrencyKeydown);
    input.addEventListener('paste', handleCurrencyPaste);
  }
});

// Wire all radios and checkboxes
document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
  input.addEventListener('change', scheduleCompute);
});

// Ensure first compute runs on load
scheduleCompute();

// ─── TAX-SAVING SUGGESTIONS ───
function renderTaxSuggestions(oldResult) {
  const container = document.getElementById('opportunities-content');
  if (!container) return;

  if (oldResult.taxableIncome <= 500000) {
    container.innerHTML = '<div class="suggestion-card"><p class="suggestion-card__desc">Your tax under the Old Regime is already zero due to the Section 87A rebate. No further tax-saving investments are needed to reduce taxes!</p></div>';
    return;
  }

  const deductionsInputs = collectDeductions();
  const suggestions = [];
  const marginalRate = oldResult.marginalRate / 100;

  // 1. 80C Headroom
  const used80c = deductionsInputs.sec80c;
  if (used80c < 150000) {
    const headroom = 150000 - used80c;
    const saving = headroom * marginalRate;
    if (saving > 0) {
      suggestions.push({
        title: 'Maximize Section 80C',
        desc: 'You have ₹' + formatIndian(headroom) + ' remaining under the ₹1.5L limit. Invest in ELSS, PPF, or Tax-Saving FDs.',
        saving: saving
      });
    }
  }

  // 2. 80CCD(1B) NPS
  const usedNPS1b = deductionsInputs.nps1b;
  if (usedNPS1b < 50000) {
    const headroom = 50000 - usedNPS1b;
    const saving = headroom * marginalRate;
    if (saving > 0) {
      suggestions.push({
        title: 'Invest in NPS (Tier 1)',
        desc: 'Claim an additional ₹50,000 deduction under Section 80CCD(1B) beyond the 80C limit.',
        saving: saving
      });
    }
  }

  // 3. Health Insurance (80D)
  const ageGroup = getRadioValue('age-group');
  const maxSelf80D = (ageGroup === 'senior' || ageGroup === 'supersenior') ? 50000 : 25000;
  const selfPremium = parseIndian(document.getElementById('ded-80d-self').value);
  if (selfPremium < maxSelf80D) {
    const headroom = maxSelf80D - selfPremium;
    const saving = headroom * marginalRate;
    if (saving > 0) {
      suggestions.push({
        title: 'Get Health Insurance',
        desc: 'Protect yourself and save tax. You have ₹' + formatIndian(headroom) + ' headroom under Section 80D.',
        saving: saving
      });
    }
  }

  const parentsPremium = parseIndian(document.getElementById('ded-80d-parents').value);
  const maxParents80D = document.getElementById('parents-senior').checked ? 50000 : 25000;
  if (parentsPremium < maxParents80D) {
    const headroom = maxParents80D - parentsPremium;
    const saving = headroom * marginalRate;
    if (saving > 0) {
      suggestions.push({
        title: 'Insure Parents (80D)',
        desc: 'Paying health insurance premiums for parents gives you an extra deduction up to ₹' + formatIndian(maxParents80D) + '.',
        saving: saving
      });
    }
  }

  // Sort by savings descending
  suggestions.sort((a, b) => b.saving - a.saving);

  if (suggestions.length === 0) {
    container.innerHTML = '<div class="suggestion-card"><p class="suggestion-card__desc">🎉 You have fully maximized all common deductions!</p></div>';
    return;
  }

  // Render top 4
  let html = '';
  for (const s of suggestions.slice(0, 4)) {
    html += `<div class="suggestion-card">
      <div class="suggestion-card__header">
        <span class="suggestion-card__title">💡 ${s.title}</span>
        <span class="suggestion-card__saving">Save ~₹${formatIndian(Math.round(s.saving))}</span>
      </div>
      <p class="suggestion-card__desc">${s.desc}</p>
    </div>`;
  }
  container.innerHTML = html;
}
