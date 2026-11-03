/**
 * @file /src/domains/discovery/utils.ts
 * @description Utility functions for opportunity fingerprinting, deduplication, and normalization.
 */

import { DiscoveredOpportunity, OpportunityCompensation } from "./types";

/**
 * Generate a deterministic deduplication hash for an opportunity
 * Normalizes title, organization name, and location to identify identical positions across providers.
 */
export function generateOpportunityHash(
  title: string,
  orgName: string,
  locationRaw: string,
  type: string
): string {
  const normTitle = (title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normOrg = (orgName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normLoc = (locationRaw || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normType = (type || "FULL_TIME").toUpperCase();

  const combined = `${normTitle}|${normOrg}|${normLoc}|${normType}`;
  
  // Lightweight standard string hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `opp-hash-${Math.abs(hash).toString(16)}`;
}

/**
 * Parses raw salary strings into structured OpportunityCompensation
 */
export function parseRawCompensation(raw: string | undefined): OpportunityCompensation | undefined {
  if (!raw || raw.trim().length === 0 || raw.toLowerCase().includes("competitive") || raw.toLowerCase().includes("market rate")) {
    return raw ? { rawString: raw, isDisclosed: false } : undefined;
  }

  const result: OpportunityCompensation = {
    rawString: raw,
    isDisclosed: true
  };

  // Check currency
  if (raw.includes("$") || raw.toLowerCase().includes("usd")) {
    result.currency = "USD";
  } else if (raw.includes("₹") || raw.toLowerCase().includes("inr") || raw.toLowerCase().includes("lpa")) {
    result.currency = "INR";
  } else if (raw.includes("€") || raw.toLowerCase().includes("eur")) {
    result.currency = "EUR";
  } else if (raw.includes("£") || raw.toLowerCase().includes("gbp")) {
    result.currency = "GBP";
  } else if (raw.toLowerCase().includes("aed")) {
    result.currency = "AED";
  } else {
    result.currency = "USD";
  }

  // Check period
  const lower = raw.toLowerCase();
  if (lower.includes("/hr") || lower.includes("hr") || lower.includes("hour")) {
    result.period = "HOURLY";
  } else if (lower.includes("/mo") || lower.includes("month")) {
    result.period = "MONTHLY";
  } else if (lower.includes("fixed") || lower.includes("project")) {
    result.period = "FIXED";
  } else {
    result.period = "YEARLY";
  }

  // Extract numbers
  const numbers = raw.replace(/,/g, "").match(/\d+(\.\d+)?/g);
  if (numbers && numbers.length > 0) {
    const parsedNums = numbers.map(Number).filter((n) => !isNaN(n));
    if (parsedNums.length === 1) {
      result.min = parsedNums[0];
      result.max = parsedNums[0];
    } else if (parsedNums.length >= 2) {
      result.min = Math.min(parsedNums[0], parsedNums[1]);
      result.max = Math.max(parsedNums[0], parsedNums[1]);
    }
  }

  return result;
}

/**
 * Deduplicate an array of opportunities using their deduplicationHash
 */
export function deduplicateOpportunities(opportunities: DiscoveredOpportunity[]): DiscoveredOpportunity[] {
  const seenHashes = new Set<string>();
  const uniqueList: DiscoveredOpportunity[] = [];

  for (const opp of opportunities) {
    const hash = opp.metadata.deduplicationHash || generateOpportunityHash(
      opp.title,
      opp.organization.name,
      opp.location.raw,
      opp.type
    );

    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      uniqueList.push({
        ...opp,
        metadata: {
          ...opp.metadata,
          deduplicationHash: hash
        }
      });
    }
  }

  return uniqueList;
}
