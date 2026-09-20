// src/utils/bloodCompatibility.js — Medically accurate RBC compatibility table & utilities

export const COMPATIBLE_DONORS_FOR_RECIPIENT = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'], // Universal recipient
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],                                             // Universal donor
};

export const COMPATIBLE_RECIPIENTS_FOR_DONOR = {
  'O-':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal donor: can give to everyone
  'O+':  ['O+', 'A+', 'B+', 'AB+'],
  'A-':  ['A-', 'A+', 'AB-', 'AB+'],
  'A+':  ['A+', 'AB+'],
  'B-':  ['B-', 'B+', 'AB-', 'AB+'],
  'B+':  ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

/**
 * Returns array of eligible donor blood types for a patient needing `recipientBloodGroup`
 */
export function getEligibleDonorGroups(recipientBloodGroup) {
  if (!recipientBloodGroup) return [];
  const normalized = recipientBloodGroup.trim().toUpperCase();
  return COMPATIBLE_DONORS_FOR_RECIPIENT[normalized] || [normalized];
}

/**
 * Checks if a donor with `donorGroup` can donate to a patient needing `recipientGroup`
 */
export function isDonorCompatible(donorGroup, recipientGroup) {
  if (!donorGroup || !recipientGroup) return false;
  const eligible = getEligibleDonorGroups(recipientGroup);
  return eligible.includes(donorGroup.trim().toUpperCase());
}

/**
 * Returns user-friendly compatibility info object
 */
export function getCompatibilityDetails(donorGroup, recipientGroup) {
  if (!donorGroup || !recipientGroup) return null;
  const d = donorGroup.trim().toUpperCase();
  const r = recipientGroup.trim().toUpperCase();

  if (d === r) {
    return {
      type: 'exact',
      label: '🎯 Exact Match',
      bg: '#dcfce7',
      color: '#166534',
      border: '#86efac',
      description: `Exact ${d} blood group match.`,
    };
  }

  if (d === 'O-') {
    return {
      type: 'universal_donor',
      label: '🌟 Universal Donor (O-)',
      bg: '#fef3c7',
      color: '#92400e',
      border: '#fcd34d',
      description: 'O- is a universal red blood cell donor, compatible with all blood types.',
    };
  }

  if (d === 'O+') {
    return {
      type: 'universal_positive',
      label: '🩸 Universal Positive Donor (O+)',
      bg: '#e0e7ff',
      color: '#3730a3',
      border: '#a5b4fc',
      description: `O+ is compatible with all Rh-positive patients (${r}).`,
    };
  }

  const isComp = isDonorCompatible(d, r);
  if (isComp) {
    return {
      type: 'compatible',
      label: `🩸 Compatible (${d} ➔ ${r})`,
      bg: '#eff6ff',
      color: '#1e40af',
      border: '#93c5fd',
      description: `${d} red blood cells are medically safe and compatible for an ${r} patient.`,
    };
  }

  return null;
}
