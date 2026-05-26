/**
 * Duty + VAT rates for spirits (HS 2208) by destination country.
 * Sources:
 *  - UK: HMRC excise £28.74/LPA (Budget 2024) + 20% VAT
 *  - EU (DE example): 13.03€/LPA + 19% VAT
 *  - US: $13.50/proof-gallon federal excise + state varies (avg ~5%)
 *  - CA: ~$11.696/LPA federal + provincial (avg 10%)
 *  - AU: ATO A$103.81/LPA (2024-25 indexed rate) + 10% GST
 *  - JP: ¥370/LPA spirits excise + 10% consumption tax + 3% import duty
 *
 * All rates in the RETAILER currency per litre of pure alcohol (LPA).
 * Updated: Q2 2025 — verify before production use.
 */

export interface DutyRate {
  /** Destination country ISO 3166-1 alpha-2 */
  country: string;
  /** Excise duty per litre of pure alcohol, in the duty currency */
  excisePerLpa: number;
  /** Currency of the excise rate */
  exciseCurrency: string;
  /** VAT/GST rate as a decimal (0.20 = 20%) */
  vatRate: number;
  /** Import duty rate on top of product value (0 = free trade / included) */
  importDutyRate: number;
}

export const DUTY_RATES: DutyRate[] = [
  {
    country: 'GB',
    excisePerLpa: 28.74,
    exciseCurrency: 'GBP',
    vatRate: 0.20,
    importDutyRate: 0, // UK domestic — no import duty
  },
  {
    country: 'US',
    excisePerLpa: 23.68, // $13.50/proof-gallon ≈ $23.68/LPA
    exciseCurrency: 'USD',
    vatRate: 0.08, // avg state sales tax (no federal VAT)
    importDutyRate: 0, // MFN spirits duty ~0% under GATT for most origins
  },
  {
    country: 'DE',
    excisePerLpa: 13.03,
    exciseCurrency: 'EUR',
    vatRate: 0.19,
    importDutyRate: 0, // EU internal or MFN 0% for Scotch
  },
  {
    country: 'FR',
    excisePerLpa: 9.17,
    exciseCurrency: 'EUR',
    vatRate: 0.20,
    importDutyRate: 0,
  },
  {
    country: 'CA',
    excisePerLpa: 11.696,
    exciseCurrency: 'CAD',
    vatRate: 0.13, // HST Ontario (varies by province)
    importDutyRate: 0,
  },
  {
    country: 'AU',
    excisePerLpa: 103.81, // ATO indexed rate 2024-25 (A$/LPA)
    exciseCurrency: 'AUD',
    vatRate: 0.10,        // GST
    importDutyRate: 0.05, // MFN import duty for spirits ~5%
  },
  {
    country: 'JP',
    excisePerLpa: 370,    // ¥370/LPA spirits category (Liquor Tax Act)
    exciseCurrency: 'JPY',
    vatRate: 0.10,        // consumption tax
    importDutyRate: 0.03, // MFN import duty for whisky ~3%
  },
];

export function getDutyRate(destinationCountry: string): DutyRate | null {
  return DUTY_RATES.find((r) => r.country === destinationCountry) ?? null;
}
