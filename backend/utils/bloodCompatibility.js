// utils/bloodCompatibility.js — Medically accurate Red Blood Cell (RBC) compatibility matrix

/**
 * Map: Recipient Blood Group -> Array of compatible Donor Blood Groups
 * Defines who can donate red blood cells to a patient needing a specific blood group.
 */
const COMPATIBLE_DONORS_FOR_RECIPIENT = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'], // Universal Recipient: can receive all types
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],                                             // Universal Donor: can only receive O-
};

/**
 * Map: Donor Blood Group -> Array of compatible Recipient Blood Groups
 * Defines who this donor can give blood to.
 */
const COMPATIBLE_RECIPIENTS_FOR_DONOR = {
  'O-':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal Donor: can give to everyone
  'O+':  ['O+', 'A+', 'B+', 'AB+'],
  'A-':  ['A-', 'A+', 'AB-', 'AB+'],
  'A+':  ['A+', 'AB+'],
  'B-':  ['B-', 'B+', 'AB-', 'AB+'],
  'B+':  ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

/**
 * Returns an array of eligible donor blood types for a patient needing `recipientBloodGroup`
 * @param {string} recipientBloodGroup e.g. 'A+', 'O-'
 * @returns {string[]} e.g. ['A+', 'A-', 'O+', 'O-']
 */
function getEligibleDonorGroups(recipientBloodGroup) {
  if (!recipientBloodGroup) return [];
  const normalized = recipientBloodGroup.trim().toUpperCase();
  return COMPATIBLE_DONORS_FOR_RECIPIENT[normalized] || [normalized];
}

/**
 * Returns an array of patient blood types that `donorBloodGroup` can donate to
 * @param {string} donorBloodGroup e.g. 'O+'
 * @returns {string[]} e.g. ['O+', 'A+', 'B+', 'AB+']
 */
function getEligibleRecipientGroups(donorBloodGroup) {
  if (!donorBloodGroup) return [];
  const normalized = donorBloodGroup.trim().toUpperCase();
  return COMPATIBLE_RECIPIENTS_FOR_DONOR[normalized] || [normalized];
}

/**
 * Checks if a donor with `donorGroup` can donate to a patient needing `recipientGroup`
 */
function isDonorCompatible(donorGroup, recipientGroup) {
  if (!donorGroup || !recipientGroup) return false;
  const eligible = getEligibleDonorGroups(recipientGroup);
  return eligible.includes(donorGroup.trim().toUpperCase());
}

/**
 * Categorizes the compatibility relationship:
 * - 'exact': Same blood group (e.g. A+ -> A+)
 * - 'universal_donor': O- donor
 * - 'compatible': Medically compatible (e.g. O+ -> A+, A- -> AB+)
 */
function getCompatibilityType(donorGroup, recipientGroup) {
  if (!donorGroup || !recipientGroup) return 'unknown';
  const d = donorGroup.trim().toUpperCase();
  const r = recipientGroup.trim().toUpperCase();
  if (d === r) return 'exact';
  if (d === 'O-') return 'universal_donor';
  return 'compatible';
}

module.exports = {
  COMPATIBLE_DONORS_FOR_RECIPIENT,
  COMPATIBLE_RECIPIENTS_FOR_DONOR,
  getEligibleDonorGroups,
  getEligibleRecipientGroups,
  isDonorCompatible,
  getCompatibilityType,
};
