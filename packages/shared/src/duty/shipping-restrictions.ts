/**
 * Shipping restriction data — COST-05 / COMP-02.
 *
 * Cross-border alcohol shipping is heavily regulated.
 * US: each state sets its own rules. Most states prohibit or severely restrict
 *     out-of-state spirits retailers shipping directly to consumers.
 * International: some countries prohibit alcohol importation entirely.
 *
 * Sources: DISCUS state shipping laws, TTB guidance (as of 2025).
 * NOTE: laws change — review annually.
 */

export interface ShippingRestriction {
  restricted: boolean;
  warning: string;
}

// ---------------------------------------------------------------------------
// US state-level restrictions (country = 'US', state = 2-letter code)
// ---------------------------------------------------------------------------

/** US states that prohibit or have no legal pathway for direct spirits shipping */
const US_STATE_RESTRICTIONS: Record<string, ShippingRestriction> = {
  // Full prohibition on DTC spirits shipping
  AL: { restricted: true,  warning: 'Alabama prohibits direct-to-consumer spirits shipments. Purchase in-state only.' },
  AR: { restricted: true,  warning: 'Arkansas does not permit out-of-state spirits retailers to ship directly to consumers.' },
  DE: { restricted: true,  warning: 'Delaware prohibits direct spirits shipments from out-of-state retailers.' },
  KY: { restricted: true,  warning: 'Kentucky law does not permit direct-to-consumer spirits shipping from foreign retailers.' },
  MI: { restricted: true,  warning: 'Michigan prohibits direct spirits shipments without a local importer license.' },
  MS: { restricted: true,  warning: 'Mississippi is a control state — direct spirits shipping to consumers is prohibited.' },
  MT: { restricted: true,  warning: 'Montana prohibits direct spirits shipments from out-of-state retailers.' },
  OK: { restricted: true,  warning: 'Oklahoma is a control state — direct spirits shipping to consumers is prohibited.' },
  PA: { restricted: true,  warning: 'Pennsylvania is a control state — spirits must be purchased through the PLCB system.' },
  RI: { restricted: true,  warning: 'Rhode Island does not permit direct spirits shipments from out-of-state retailers.' },
  SD: { restricted: true,  warning: 'South Dakota prohibits direct spirits shipments without a state license.' },
  UT: { restricted: true,  warning: 'Utah is a control state — direct spirits shipping to consumers is prohibited.' },

  // Restricted / limited pathways
  TX: { restricted: false, warning: 'Texas permits limited direct spirits shipping but retailer must hold a Texas permit. Verify before ordering.' },
  CA: { restricted: false, warning: 'California allows direct spirits shipping but retailers must hold a CA direct shipper permit. Verify retailer compliance.' },
};

// ---------------------------------------------------------------------------
// Country-level restrictions
// ---------------------------------------------------------------------------

const COUNTRY_RESTRICTIONS: Record<string, ShippingRestriction> = {
  // Alcohol prohibition
  SA: { restricted: true, warning: 'Saudi Arabia prohibits the importation of alcoholic beverages. This purchase cannot be shipped here.' },
  IR: { restricted: true, warning: 'Iran prohibits the importation of alcoholic beverages. This purchase cannot be shipped here.' },
  PK: { restricted: true, warning: 'Pakistan restricts the importation of alcoholic beverages for non-citizens.' },
  BD: { restricted: true, warning: 'Bangladesh prohibits the importation of alcoholic beverages.' },
  LY: { restricted: true, warning: 'Libya prohibits the importation of alcoholic beverages.' },
  SO: { restricted: true, warning: 'Somalia prohibits the importation of alcoholic beverages.' },
  MR: { restricted: true, warning: 'Mauritania prohibits the importation of alcoholic beverages.' },
  YE: { restricted: true, warning: 'Yemen prohibits the importation of alcoholic beverages.' },
  AF: { restricted: true, warning: 'Afghanistan prohibits the importation of alcoholic beverages.' },

  // High duty / import licensing required
  IN: { restricted: false, warning: 'India requires an import permit for alcohol. High import duties apply. Check with your state excise department before ordering.' },
  NO: { restricted: false, warning: 'Norway has strict import allowances for personal alcohol imports. Excess may be confiscated at customs.' },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RestrictionResult {
  restricted: boolean;
  warning: string | null;
}

/**
 * Check whether shipping alcohol to a destination is restricted.
 *
 * @param countryCode ISO 3166-1 alpha-2 (e.g. 'US', 'GB')
 * @param stateCode   US state abbreviation — required when countryCode = 'US'
 */
export function checkShippingRestriction(
  countryCode: string,
  stateCode?: string,
): RestrictionResult {
  const country = countryCode.toUpperCase();

  // Country-level check first
  const countryRule = COUNTRY_RESTRICTIONS[country];
  if (countryRule?.restricted) {
    return { restricted: true, warning: countryRule.warning };
  }

  // US state-level check
  if (country === 'US' && stateCode) {
    const state = stateCode.toUpperCase();
    const stateRule = US_STATE_RESTRICTIONS[state];
    if (stateRule) {
      return { restricted: stateRule.restricted, warning: stateRule.warning };
    }
    // No explicit rule — generally allowed but advise caution
    return {
      restricted: false,
      warning: 'US spirits shipping laws vary by state and retailer. Verify your retailer ships to your state before purchasing.',
    };
  }

  if (country === 'US') {
    // Country = US but no state provided
    return {
      restricted: false,
      warning: 'US spirits shipping laws vary by state. Please select your state for specific guidance.',
    };
  }

  // Country has a non-restrictive warning
  if (countryRule && !countryRule.restricted) {
    return { restricted: false, warning: countryRule.warning };
  }

  return { restricted: false, warning: null };
}
