import { convertCurrency } from '../fx/rates.js';
import { getDutyRate } from './rates-table.js';

export interface TrueCostInput {
  /** Shelf price in retailer currency */
  priceLocal: number;
  /** Retailer currency (ISO 4217) */
  currency: string;
  /** Retailer country (ISO 3166-1 alpha-2) */
  retailerCountry: string;
  /** Buyer destination country */
  destinationCountry: string;
  /** Volume in ml */
  volumeMl: number;
  /** ABV as percentage (e.g. 40.0) */
  abv: number;
  /** Estimated shipping cost in retailer currency (0 if unknown) */
  shippingLocal?: number;
  /** Display currency for all output values */
  outputCurrency?: string;
}

export interface TrueCostBreakdown {
  /** Shelf price in output currency */
  shelfPrice: number;
  /** Shipping in output currency */
  shipping: number;
  /** Import duty in output currency (0 if same country or no data) */
  importDuty: number;
  /** Excise duty in output currency */
  exciseDuty: number;
  /** VAT/GST in output currency (applied to shelf + shipping + duties) */
  vat: number;
  /** Grand total in output currency */
  total: number;
  /** Output currency used */
  currency: string;
  /** Whether duty data was available for destination */
  dutyDataAvailable: boolean;
  /** Litres of pure alcohol (for excise calculation reference) */
  lpa: number;
}

/**
 * Calculate true all-in cost of purchasing a whisky from a retailer
 * and importing it to a destination country.
 *
 * Formula (cross-border):
 *  excise = excisePerLpa × LPA (converted to output currency)
 *  importDuty = (shelfPrice + shipping) × importDutyRate
 *  vatBase = shelfPrice + shipping + importDuty + excise
 *  vat = vatBase × vatRate
 *  total = shelfPrice + shipping + importDuty + excise + vat
 *
 * Domestic (retailer country === destination):
 *  Assume VAT is already included in shelf price (European norm).
 *  total = shelfPrice + shipping
 */
export async function calculateTrueCost(
  input: TrueCostInput,
): Promise<TrueCostBreakdown> {
  const {
    priceLocal,
    currency,
    retailerCountry,
    destinationCountry,
    volumeMl,
    abv,
    shippingLocal = 0,
    outputCurrency = currency,
  } = input;

  const lpa = (volumeMl / 1000) * (abv / 100);
  const isDomestic = retailerCountry === destinationCountry;

  // Convert shelf price + shipping to output currency
  const shelfOut = await convertCurrency(priceLocal, currency, outputCurrency);
  const shippingOut = await convertCurrency(shippingLocal, currency, outputCurrency);

  if (isDomestic) {
    // VAT already included in European/UK shelf prices
    return {
      shelfPrice: round(shelfOut),
      shipping: round(shippingOut),
      importDuty: 0,
      exciseDuty: 0,
      vat: 0,
      total: round(shelfOut + shippingOut),
      currency: outputCurrency,
      dutyDataAvailable: true,
      lpa,
    };
  }

  const dutyRate = getDutyRate(destinationCountry);

  if (!dutyRate) {
    // No duty data — return shelf + shipping only, flag it
    return {
      shelfPrice: round(shelfOut),
      shipping: round(shippingOut),
      importDuty: 0,
      exciseDuty: 0,
      vat: 0,
      total: round(shelfOut + shippingOut),
      currency: outputCurrency,
      dutyDataAvailable: false,
      lpa,
    };
  }

  const importDutyOut = round((shelfOut + shippingOut) * dutyRate.importDutyRate);

  const exciseRawOut = await convertCurrency(
    dutyRate.excisePerLpa * lpa,
    dutyRate.exciseCurrency,
    outputCurrency,
  );
  const exciseDutyOut = round(exciseRawOut);

  const vatBase = shelfOut + shippingOut + importDutyOut + exciseDutyOut;
  const vatOut = round(vatBase * dutyRate.vatRate);

  const total = round(shelfOut + shippingOut + importDutyOut + exciseDutyOut + vatOut);

  return {
    shelfPrice: round(shelfOut),
    shipping: round(shippingOut),
    importDuty: importDutyOut,
    exciseDuty: exciseDutyOut,
    vat: vatOut,
    total,
    currency: outputCurrency,
    dutyDataAvailable: true,
    lpa,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
