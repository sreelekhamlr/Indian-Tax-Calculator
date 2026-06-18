import { computeTax } from '../js/taxEngine.js';

const result = computeTax({
  grossSalary: 2500000,
  regime: 'old',
  ageGroup: 'below60',
  cityType: 'metro',
  salaryComponents: {
    basic: 1000000,
    hra: 500000,
    da: 0
  },
  deductionsInputs: {
    sec80c: 200000, // Should be capped at 150000
    sec80d: 30000
  },
  exemptionsInputs: {
    rentPaid: 480000 // 40k * 12
  }
});

console.log(Object.keys(result));
