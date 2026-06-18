/* ═══════════════════════════════════════════════════════
   Currency Formatter — Indian Number System
   e.g. 1250000 → "12,50,000"
   ═══════════════════════════════════════════════════════ */

/**
 * Formats a number using the Indian numbering system.
 * 1234567 → "12,34,567"
 *
 * @param {number} num
 * @param {boolean} [showPaise=false] - Whether to show decimal places
 * @returns {string}
 */
export function formatIndian(num, showPaise = false) {
  if (num === null || num === undefined || isNaN(num)) return '0';

  const negative = num < 0;
  num = Math.abs(num);

  if (showPaise) {
    const parts = num.toFixed(2).split('.');
    return (negative ? '-' : '') + applyIndianCommas(parts[0]) + '.' + parts[1];
  }

  return (negative ? '-' : '') + applyIndianCommas(Math.round(num).toString());
}

/**
 * Formats with ₹ prefix.
 * @param {number} num
 * @returns {string}
 */
export function formatRupee(num) {
  if (num === 0) return '₹0';
  return '₹' + formatIndian(num);
}

/**
 * Formats a number in compact Indian notation.
 * e.g. 1250000 → "₹12.5L", 25000000 → "₹2.5Cr"
 *
 * @param {number} num
 * @returns {string}
 */
export function formatCompact(num) {
  if (num === null || num === undefined || isNaN(num)) return '₹0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 10000000) {
    const cr = abs / 10000000;
    return sign + '₹' + (cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, '')) + 'Cr';
  }
  if (abs >= 100000) {
    const l = abs / 100000;
    return sign + '₹' + (l % 1 === 0 ? l.toFixed(0) : l.toFixed(2).replace(/\.?0+$/, '')) + 'L';
  }
  if (abs >= 1000) {
    const k = abs / 1000;
    return sign + '₹' + (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.?0+$/, '')) + 'K';
  }
  return sign + '₹' + abs.toString();
}

/**
 * Formats a slab boundary for display.
 * 0 → "₹0", 400000 → "₹4L", 1000000 → "₹10L", Infinity → "∞"
 */
export function formatSlabBound(num) {
  if (num === Infinity) return '∞';
  if (num === 0) return '₹0';
  if (num >= 100000) {
    const l = num / 100000;
    return '₹' + (l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)) + 'L';
  }
  return '₹' + formatIndian(num);
}

/**
 * Parses a formatted Indian currency string back to a number.
 * "12,50,000" → 1250000
 * "₹ 12,50,000" → 1250000
 *
 * @param {string} str
 * @returns {number}
 */
export function parseIndian(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[₹,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats a percentage to 1 or 2 decimal places.
 * @param {number} pct
 * @returns {string}
 */
export function formatPercent(pct) {
  if (pct === 0) return '0%';
  if (pct < 0.01) return '<0.01%';
  return pct.toFixed(pct % 1 === 0 ? 0 : 2) + '%';
}


// ─── INTERNAL ───

function applyIndianCommas(str) {
  // Indian system: last 3 digits, then groups of 2
  // e.g. 1234567 → 12,34,567
  const len = str.length;
  if (len <= 3) return str;

  let result = str.slice(-3);
  let remaining = str.slice(0, -3);

  while (remaining.length > 2) {
    result = remaining.slice(-2) + ',' + result;
    remaining = remaining.slice(0, -2);
  }

  if (remaining.length > 0) {
    result = remaining + ',' + result;
  }

  return result;
}
