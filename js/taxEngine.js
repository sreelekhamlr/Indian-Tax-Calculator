/* ═══════════════════════════════════════════════════════
   Tax Engine — FY 2025-26 (AY 2026-27)
   Pure computation functions. No DOM access.
   ═══════════════════════════════════════════════════════ */

// ─── SLAB DEFINITIONS ───

/** New Regime slabs — same for all age groups */
const SLABS_NEW = [
  { from: 0,       to: 400000,   rate: 0    },
  { from: 400000,  to: 800000,   rate: 0.05 },
  { from: 800000,  to: 1200000,  rate: 0.10 },
  { from: 1200000, to: 1600000,  rate: 0.15 },
  { from: 1600000, to: 2000000,  rate: 0.20 },
  { from: 2000000, to: 2400000,  rate: 0.25 },
  { from: 2400000, to: Infinity, rate: 0.30 },
];

/** Old Regime slabs — Below 60 */
const SLABS_OLD_BELOW60 = [
  { from: 0,       to: 250000,   rate: 0    },
  { from: 250000,  to: 500000,   rate: 0.05 },
  { from: 500000,  to: 1000000,  rate: 0.20 },
  { from: 1000000, to: Infinity, rate: 0.30 },
];

/** Old Regime slabs — Senior Citizens (60–80) */
const SLABS_OLD_SENIOR = [
  { from: 0,       to: 300000,   rate: 0    },
  { from: 300000,  to: 500000,   rate: 0.05 },
  { from: 500000,  to: 1000000,  rate: 0.20 },
  { from: 1000000, to: Infinity, rate: 0.30 },
];

/** Old Regime slabs — Super Senior Citizens (80+) */
const SLABS_OLD_SUPERSENIOR = [
  { from: 0,       to: 500000,   rate: 0    },
  { from: 500000,  to: 1000000,  rate: 0.20 },
  { from: 1000000, to: Infinity, rate: 0.30 },
];


// ─── SURCHARGE TIERS ───

const SURCHARGE_TIERS_OLD = [
  { threshold: 5000000,   rate: 0    },
  { threshold: 10000000,  rate: 0.10 },
  { threshold: 20000000,  rate: 0.15 },
  { threshold: 50000000,  rate: 0.25 },
  { threshold: Infinity,  rate: 0.37 },
];

const SURCHARGE_TIERS_NEW = [
  { threshold: 5000000,   rate: 0    },
  { threshold: 10000000,  rate: 0.10 },
  { threshold: 20000000,  rate: 0.15 },
  { threshold: 50000000,  rate: 0.25 },
  { threshold: Infinity,  rate: 0.25 },   // Capped at 25% in New Regime
];


// ─── CONSTANTS ───

const STANDARD_DEDUCTION_OLD = 50000;
const STANDARD_DEDUCTION_NEW = 75000;
const CESS_RATE = 0.04;

// Section 87A
const REBATE_THRESHOLD_OLD = 500000;
const REBATE_MAX_OLD = 12500;
const REBATE_THRESHOLD_NEW = 1200000;
const REBATE_MAX_NEW = 60000;


// ─── SLAB SELECTOR ───

/**
 * Returns the correct slab configuration for the given regime and age group.
 * @param {'old'|'new'} regime
 * @param {'below60'|'senior'|'supersenior'} ageGroup
 * @returns {Array}
 */
function getSlabs(regime, ageGroup) {
  if (regime === 'new') return SLABS_NEW;
  switch (ageGroup) {
    case 'senior':      return SLABS_OLD_SENIOR;
    case 'supersenior': return SLABS_OLD_SUPERSENIOR;
    default:            return SLABS_OLD_BELOW60;
  }
}


// ─── SLAB-WISE TAX COMPUTATION ───

/**
 * Computes tax on the given income using the provided slabs.
 * Returns { basicTax, slabBreakdown }.
 *
 * Each entry in slabBreakdown:
 *   { from, to, rate, incomeInSlab, taxOnSlab }
 */
function computeSlabTax(taxableIncome, slabs) {
  let remaining = taxableIncome;
  let basicTax = 0;
  const slabBreakdown = [];

  for (const slab of slabs) {
    const slabWidth = slab.to === Infinity
      ? Infinity
      : slab.to - slab.from;

    const incomeInSlab = Math.min(Math.max(remaining, 0), slabWidth);
    const taxOnSlab = incomeInSlab * slab.rate;

    slabBreakdown.push({
      from: slab.from,
      to: slab.to,
      rate: slab.rate,
      incomeInSlab,
      taxOnSlab,
    });

    basicTax += taxOnSlab;
    remaining -= incomeInSlab;

    if (remaining <= 0) break;
  }

  return { basicTax, slabBreakdown };
}


// ─── SECTION 87A REBATE ───

/**
 * Computes the rebate under Section 87A, including marginal relief.
 *
 * Marginal relief: For incomes just above the rebate threshold,
 * the tax payable should not exceed the income above the threshold.
 */
function computeRebate(taxableIncome, basicTax, regime) {
  const threshold = regime === 'new' ? REBATE_THRESHOLD_NEW : REBATE_THRESHOLD_OLD;
  const maxRebate = regime === 'new' ? REBATE_MAX_NEW : REBATE_MAX_OLD;

  if (taxableIncome <= threshold) {
    // Full rebate: tax becomes zero (or the tax itself, whichever is lower)
    return Math.min(basicTax, maxRebate);
  }

  // Marginal relief: if income is slightly above threshold,
  // tax should not exceed the amount by which income exceeds the threshold.
  const excessIncome = taxableIncome - threshold;
  if (basicTax <= excessIncome) {
    // No relief needed — tax is already less than excess
    return 0;
  }

  // Check if applying full rebate would have made tax = 0 at the threshold.
  // If so, apply marginal relief.
  const taxAtThreshold = computeSlabTax(threshold, getSlabs(regime, 'below60')).basicTax;
  const rebateAtThreshold = Math.min(taxAtThreshold, maxRebate);
  const netTaxAtThreshold = taxAtThreshold - rebateAtThreshold;

  if (netTaxAtThreshold === 0) {
    // Income at threshold would be tax-free. So marginal relief applies.
    // Tax should not exceed the income above the threshold.
    const marginalTax = Math.min(basicTax, excessIncome);
    const rebate = basicTax - marginalTax;
    return Math.max(rebate, 0);
  }

  // Beyond marginal relief range — no rebate
  return 0;
}


// ─── SURCHARGE ───

/**
 * Gets the surcharge rate and computes surcharge with marginal relief.
 * Returns { surchargeRate, surchargeAmount, marginalRelief }.
 */
function computeSurcharge(taxAfterRebate, taxableIncome, regime) {
  const tiers = regime === 'new' ? SURCHARGE_TIERS_NEW : SURCHARGE_TIERS_OLD;

  // Find the applicable tier
  let surchargeRate = 0;
  let prevThreshold = 0;

  for (const tier of tiers) {
    if (taxableIncome <= tier.threshold) {
      surchargeRate = tier.rate;
      break;
    }
    prevThreshold = tier.threshold;
  }

  if (surchargeRate === 0) {
    return { surchargeRate: 0, surchargeAmount: 0, marginalRelief: 0 };
  }

  const rawSurcharge = taxAfterRebate * surchargeRate;

  // Marginal relief: total tax + surcharge should not exceed
  // the tax + surcharge at the previous threshold, plus the excess income.
  const excessIncome = taxableIncome - prevThreshold;

  // Compute tax at the previous threshold
  const slabs = getSlabs(regime, 'below60'); // Use baseline slabs for relief calc
  const { basicTax: taxAtPrevThreshold } = computeSlabTax(prevThreshold, slabs);

  // Rebate at previous threshold (if applicable)
  const rebateAtPrev = computeRebate(prevThreshold, taxAtPrevThreshold, regime);
  const netTaxAtPrev = Math.max(taxAtPrevThreshold - rebateAtPrev, 0);

  // Surcharge at the previous tier
  let prevSurchargeRate = 0;
  for (const tier of tiers) {
    if (prevThreshold <= tier.threshold) {
      prevSurchargeRate = tier.rate;
      break;
    }
  }
  // Actually the prev threshold is the boundary, so at the prev threshold,
  // the surcharge rate is the one from the tier *below*.
  // Let's recalculate properly:
  prevSurchargeRate = 0;
  let pThresh = 0;
  for (const tier of tiers) {
    if (prevThreshold <= tier.threshold) {
      prevSurchargeRate = tier.rate;
      break;
    }
    pThresh = tier.threshold;
  }

  const prevSurcharge = netTaxAtPrev * prevSurchargeRate;
  const prevCess = (netTaxAtPrev + prevSurcharge) * CESS_RATE;
  const totalAtPrevThreshold = netTaxAtPrev + prevSurcharge + prevCess;

  const currentTotalWithoutRelief = taxAfterRebate + rawSurcharge + (taxAfterRebate + rawSurcharge) * CESS_RATE;

  if (currentTotalWithoutRelief > totalAtPrevThreshold + excessIncome) {
    // Marginal relief applies
    const maxAllowedTotal = totalAtPrevThreshold + excessIncome;
    // We need to find the surcharge such that tax + surcharge + cess = maxAllowedTotal
    // tax + surcharge + (tax + surcharge) * 0.04 = maxAllowedTotal
    // (tax + surcharge) * 1.04 = maxAllowedTotal
    // tax + surcharge = maxAllowedTotal / 1.04
    const taxPlusSurcharge = maxAllowedTotal / (1 + CESS_RATE);
    const adjustedSurcharge = Math.max(taxPlusSurcharge - taxAfterRebate, 0);
    const marginalRelief = rawSurcharge - adjustedSurcharge;

    return {
      surchargeRate,
      surchargeAmount: adjustedSurcharge,
      marginalRelief: Math.max(marginalRelief, 0),
    };
  }

  return { surchargeRate, surchargeAmount: rawSurcharge, marginalRelief: 0 };
}


// ─── MARGINAL TAX RATE ───

/**
 * Returns the marginal tax rate (including surcharge and cess) for the next ₹1.
 */
function getMarginalRate(taxableIncome, slabs, surchargeRate) {
  // Find the slab the next rupee falls into
  let marginalSlabRate = 0;
  let cumulative = 0;
  for (const slab of slabs) {
    const slabWidth = slab.to === Infinity ? Infinity : slab.to - slab.from;
    if (taxableIncome < cumulative + slabWidth) {
      marginalSlabRate = slab.rate;
      break;
    }
    cumulative += slabWidth;
  }

  // Effective marginal = slab rate * (1 + surcharge) * (1 + cess)
  return marginalSlabRate * (1 + surchargeRate) * (1 + CESS_RATE);
}


// ─── MAIN COMPUTATION PIPELINE ───

/**
 * Full tax computation for a single regime.
 *
 * @param {Object} params
 * @param {number} params.grossSalary - Total gross salary
 * @param {'old'|'new'} params.regime
 * @param {'below60'|'senior'|'supersenior'} params.ageGroup
 * @param {Object} [params.salaryComponents] - Optional detailed breakdown
 * @param {number} [params.salaryComponents.basic]
 * @param {number} [params.salaryComponents.da]
 * @param {number} [params.salaryComponents.hra]
 * @param {number} [params.salaryComponents.special]
 * @param {number} [params.salaryComponents.lta]
 * @param {number} [params.salaryComponents.bonus]
 * @param {number} [params.salaryComponents.epfEmployee]
 * @param {number} [params.salaryComponents.epfEmployer]
 * @param {number} [params.salaryComponents.professionalTax]
 * @param {number} [params.salaryComponents.gratuity]
 * @param {number} [params.salaryComponents.otherAllowances]
 * @param {Object} [params.deductionsInputs]
 * @param {number} [params.deductionsInputs.sec80c]
 * @param {number} [params.deductionsInputs.sec80d]
 * @param {number} [params.exemptionsInputs.rentPaid]
 * @param {'metro'|'nonmetro'} params.cityType
 * @param {'private'|'government'} [params.employerType]
 * @returns {Object} Full breakdown
 */
export function computeTax({ grossSalary, regime, ageGroup, cityType, employerType = 'private', salaryComponents, deductionsInputs, exemptionsInputs }) {
  // Step 1: Gross Total Income
  // Employer EPF contribution is excluded from taxable salary (up to 12% of Basic)
  let grossTotalIncome = grossSalary;
  let employerEPFExempt = 0;
  let employerEPF = 0;
  let professionalTax = 0;
  let employeeEPF = 0;

  if (salaryComponents) {
    const basic = salaryComponents.basic || 0;
    const epfEmployer = salaryComponents.epfEmployer || 0;

    // Re-derive gross from components so otherAllowances is always included,
    // regardless of whether the UI sync fired.
    const derivedGross =
      basic +
      (salaryComponents.da || 0) +
      (salaryComponents.hra || 0) +
      (salaryComponents.special || 0) +
      (salaryComponents.lta || 0) +
      (salaryComponents.bonus || 0) +
      (salaryComponents.otherAllowances || 0);

    // Use the derived gross if it's non-zero, otherwise fall back to the passed grossSalary
    if (derivedGross > 0) grossSalary = derivedGross;

    // Employer EPF exempt up to 12% of Basic (statutory limit)
    const epfEmployerLimit = Math.round(basic * 0.12);
    employerEPFExempt = Math.min(epfEmployer, epfEmployerLimit);
    employerEPF = epfEmployer; // full employer EPF (may exceed exempt limit)
    
    // Any Employer EPF contribution above the 12% limit is taxable.
    const employerEPFTaxable = Math.max(employerEPF - employerEPFExempt, 0);

    // Gross Total Income = Gross Salary (cash components) + Taxable portion of Employer EPF
    // (We DO NOT subtract employerEPFExempt from grossSalary because employerEPF is not in grossSalary to begin with)
    grossTotalIncome = grossSalary + employerEPFTaxable;

    professionalTax = salaryComponents.professionalTax || 0;
    employeeEPF = salaryComponents.epfEmployee || 0;
  }

  // Step 2: Exemptions (Old Regime only)
  let hraExemption = 0;
  let ltaExemption = 0;

  if (regime === 'old' && salaryComponents) {
    if (exemptionsInputs && exemptionsInputs.rentPaid > 0) {
      const basic = salaryComponents.basic || 0;
      const da = salaryComponents.da || 0;
      const hraReceived = salaryComponents.hra || 0;
      const rentPaid = exemptionsInputs.rentPaid;
      const basicAndDa = basic + da;

      if (hraReceived > 0 && basicAndDa > 0) {
        const condition1 = hraReceived;
        const condition2 = Math.max(rentPaid - 0.10 * basicAndDa, 0);
        const condition3 = cityType === 'metro' ? 0.50 * basicAndDa : 0.40 * basicAndDa;
        hraExemption = Math.min(condition1, condition2, condition3);
      }
    }

    if (deductionsInputs && deductionsInputs.ltaClaimed > 0) {
      const ltaReceived = salaryComponents.lta || 0;
      ltaExemption = Math.min(deductionsInputs.ltaClaimed, ltaReceived);
    }
  }

  // Gross Total Income after exemptions
  grossTotalIncome = Math.max(grossTotalIncome - hraExemption - ltaExemption, 0);

  // Step 3: Deductions
  const standardDeduction = regime === 'new'
    ? STANDARD_DEDUCTION_NEW
    : STANDARD_DEDUCTION_OLD;

  let sec80c = 0;
  let sec80d = 0;
  let nps1b = 0;
  let nps2 = 0;
  let homeLoan = 0;
  let otherDed = 0;

  // Professional tax is ONLY deductible under the Old Regime for taxable income
  const ptDeduction = regime === 'old' ? professionalTax : 0;
  let totalDeductions = standardDeduction + ptDeduction;

  if (deductionsInputs) {
    // 80CCD(2) - Employer NPS is deductible in BOTH regimes!
    if (deductionsInputs.nps2 > 0 && salaryComponents) {
      const basic = salaryComponents.basic || 0;
      const da = salaryComponents.da || 0;
      const basicDa = basic + da;
      const capPct = (regime === 'new' || employerType === 'government') ? 0.14 : 0.10;
      nps2 = Math.min(deductionsInputs.nps2, Math.round(basicDa * capPct));
      totalDeductions += nps2;
    }

    if (regime === 'old') {
      sec80c = Math.min(deductionsInputs.sec80c || 0, 150000); // 80C + 80CCC + 80CCD(1) cap
      sec80d = deductionsInputs.sec80d || 0;
      nps1b = Math.min(deductionsInputs.nps1b || 0, 50000); // 80CCD(1B) extra cap
      
      // Home Loan
      const hlInt = Math.min(deductionsInputs.homeLoanInterest || 0, 200000); // 24(b)
      const hlEEA = Math.min(deductionsInputs.homeLoanEEA || 0, 150000); // 80EEA
      homeLoan = hlInt + hlEEA;

      // 80TTA / 80TTB
      let savingsLimit = 0;
      if (ageGroup === 'senior' || ageGroup === 'supersenior') {
        savingsLimit = Math.min(deductionsInputs.savingsInterest || 0, 50000);
      } else {
        savingsLimit = Math.min(deductionsInputs.savingsInterest || 0, 10000);
      }

      const eLoan = deductionsInputs.eduLoanInterest || 0; // 80E no limit
      const donation = (deductionsInputs.donation100 || 0) + ((deductionsInputs.donation50 || 0) * 0.5); // Simplified 80G

      otherDed = eLoan + donation + savingsLimit;
      
      totalDeductions += sec80c + sec80d + nps1b + homeLoan + otherDed;
    }
  }

  totalDeductions = Math.min(totalDeductions, grossTotalIncome);

  // Step 4: Taxable Income
  const taxableIncome = Math.max(grossTotalIncome - totalDeductions, 0);

  // Step 4: Slab-wise tax
  const slabs = getSlabs(regime, ageGroup);
  const { basicTax, slabBreakdown } = computeSlabTax(taxableIncome, slabs);

  // Step 5: Section 87A Rebate
  const rebate = computeRebate(taxableIncome, basicTax, regime);
  const taxAfterRebate = Math.max(basicTax - rebate, 0);

  // Step 6: Surcharge
  const { surchargeRate, surchargeAmount, marginalRelief } =
    computeSurcharge(taxAfterRebate, taxableIncome, regime);

  // Step 7: Cess
  const cess = Math.round((taxAfterRebate + surchargeAmount) * CESS_RATE);

  // Step 8: Total Tax
  const totalTax = Math.round(taxAfterRebate + surchargeAmount + cess);

  // Effective & Marginal rates
  const effectiveRate = grossTotalIncome > 0
    ? (totalTax / grossTotalIncome) * 100
    : 0;

  const marginalRate = getMarginalRate(taxableIncome, slabs, surchargeRate) * 100;

  // Net take-home: what actually reaches your bank account
  // CTC = grossSalary + employerEPF
  // Net take-home: what actually reaches your bank account
  // Gross Salary = Basic + DA + HRA + Special + LTA + Bonus + Other Allowances
  // Deductions from Gross Salary = Employee EPF + Professional Tax + Income Tax
  // (Employer EPF is paid over and above Gross Salary as part of CTC, so it is NOT deducted from Gross Salary)
  const netTakeHomeAnnual = grossSalary - totalTax - employeeEPF - professionalTax;



  return {
    grossSalary,
    salaryComponents,
    grossTotalIncome: grossTotalIncome + hraExemption, // Pre-exemption
    hraExemption,
    grossTotalIncomeAfterExemptions: grossTotalIncome,
    employerEPFExempt,
    employerEPF,
    totalDeductions,
    standardDeduction,
    professionalTax,
    sec80c,
    sec80d,
    nps1b,
    nps2,
    homeLoan,
    otherDed,
    taxableIncome,
    basicTax: Math.round(basicTax),
    slabBreakdown,
    rebate: Math.round(rebate),
    taxAfterRebate: Math.round(taxAfterRebate),
    surchargeRate,
    surchargeAmount: Math.round(surchargeAmount),
    marginalRelief: Math.round(marginalRelief),
    cess,
    totalTax,
    effectiveRate,
    marginalRate,
    monthlyTax: Math.round(totalTax / 12),
    employeeEPF,
    hasSalaryComponents: !!salaryComponents,
    netTakeHomeAnnual: Math.round(netTakeHomeAnnual),
    netTakeHomeMonthly: Math.round(netTakeHomeAnnual / 12),
  };
}
