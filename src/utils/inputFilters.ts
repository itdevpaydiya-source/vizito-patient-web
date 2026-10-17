// Typing filters: a field refuses characters it can never accept, as the user types or pastes
// (like the mobile field refusing letters), instead of complaining only after Continue.

/** Person names: letters, spaces and . ' - only; no leading or double spaces. */
export const personNameInput = (value: string): string =>
  value.replace(/[^A-Za-z .'-]/g, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ');

/** Place names (city, area): letters, spaces and . ' - only. */
export const placeNameInput = personNameInput;
