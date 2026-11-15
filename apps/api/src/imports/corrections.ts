/**
 * DOCUMENTED DATA CORRECTIONS
 *
 * Real-world datasets have errors and go out of date. We never hand-edit the
 * downloaded files; instead every fix lives here, in code, with a reason. That
 * makes corrections reviewable in a PR and re-applied on every import.
 *
 * Boundary map used: DataMeet "india_pc_2019_simplified" (2008 delimitation).
 */

/** Map state names → current official names (as used by sansad.in). */
export const STATE_NAME_FIXES: Record<string, string> = {
  Orissa: "Odisha", // renamed in 2011
  Delhi: "NCT of Delhi",
  "Andaman & Nicobar": "Andaman and Nicobar Islands",
  "Dadra & Nagar Haveli": "Dadra and Nagar Haveli and Daman and Diu", // two UTs merged in 2020
  "Daman & Diu": "Dadra and Nagar Haveli and Daman and Diu",
};

export interface ConstituencyFix {
  state: string; // state name AS IT APPEARS IN THE MAP
  number: number; // pc_no in the map
  name?: string; // corrected / current name
  newState?: string; // move to another (current) state
  newNumber?: number; // avoid number clashes after a UT merger
  boundaryOutdated?: true;
  reason: string;
}

const ASSAM_2023 = "Assam was re-delimited in 2023; the open map predates it, so this boundary is approximate.";
const JK_2022 = "J&K was re-delimited in 2022; the open map predates it, so this boundary is approximate.";

export const CONSTITUENCY_FIXES: ConstituencyFix[] = [
  // --- Errors in the source map ----------------------------------------------
  { state: "Maharashtra", number: 30, name: "Mumbai South Central", reason: "Map labels both #30 and #31 'Mumbai South'; #30 is Mumbai South Central." },

  // --- Union territory changes ------------------------------------------------
  { state: "Daman & Diu", number: 1, newNumber: 2, reason: "After the 2020 merger, Daman and Diu is seat #2 of the merged UT (Dadra & Nagar Haveli is #1)." },
  { state: "Jammu & Kashmir", number: 4, newState: "Ladakh", boundaryOutdated: true, reason: "Ladakh became a separate union territory in 2019." },

  // --- Re-delimitation: renamed seats (successor names, approximate boundaries) ---
  { state: "Jammu & Kashmir", number: 3, name: "Anantnag-Rajouri", boundaryOutdated: true, reason: JK_2022 },
  { state: "Assam", number: 3, name: "Diphu", boundaryOutdated: true, reason: `${ASSAM_2023} Successor of 'Autonomous District'.` },
  { state: "Assam", number: 7, name: "Guwahati", boundaryOutdated: true, reason: `${ASSAM_2023} Successor of 'Gauhati'.` },
  { state: "Assam", number: 8, name: "Darrang-Udalguri", boundaryOutdated: true, reason: `${ASSAM_2023} Successor of 'Mangaldoi'.` },
  { state: "Assam", number: 9, name: "Sonitpur", boundaryOutdated: true, reason: `${ASSAM_2023} Successor of 'Tezpur'.` },
  { state: "Assam", number: 10, name: "Nagaon", boundaryOutdated: true, reason: `${ASSAM_2023} Successor of 'Nowgong'.` },
  { state: "Assam", number: 11, name: "Kaziranga", boundaryOutdated: true, reason: `${ASSAM_2023} Successor of 'Kaliabor'.` },

  // --- Spelling: use the current official (Parliament) spelling ----------------
  { state: "Andhra Pradesh", number: 19, name: "Anantapur", reason: "Official spelling on sansad.in." },
  { state: "Telangana", number: 14, name: "Bhongir", reason: "Official spelling on sansad.in." },
  { state: "Karnataka", number: 2, name: "Belgaum", reason: "Official spelling on sansad.in." },
  { state: "Chhattisgarh", number: 3, name: "Janjgir-Champa", reason: "Official name on sansad.in." },
];

/**
 * Names used by the 17th Lok Sabha (2019–24) for seats that were RENAMED by the
 * 2022/2023 re-delimitations, mapped to our current seat names. The areas changed
 * too, so "previous MP" comparisons for these seats are approximate (flagged in the UI).
 */
export const FORMER_SEAT_NAMES: Record<string, string> = {
  "Assam|Gauhati": "Guwahati",
  "Assam|Tezpur": "Sonitpur",
  "Assam|Mangaldoi": "Darrang-Udalguri",
  "Assam|Nowgong": "Nagaon",
  "Assam|Kaliabor": "Kaziranga",
  "Assam|Autonomous District": "Diphu",
  "Jammu and Kashmir|Anantnag": "Anantnag-Rajouri",
};

/** States whose remaining seats are all affected by re-delimitation. */
export const OUTDATED_STATES = new Set(["Assam", "Jammu & Kashmir"]);
