/** Keep the original spelling, removing only consecutive repeated comma-separated parts. */
export function dedupeAddressParts(...values:(string|null|undefined)[]):string {
 const parts:string[]=[];
 for(const part of values.filter(Boolean).flatMap(value=>value!.split(','))){const text=part.trim().replace(/\s+/g,' ');if(!text)continue;const previous=parts.at(-1);if(previous?.normalize('NFKC').toLocaleLowerCase()===text.normalize('NFKC').toLocaleLowerCase())continue;parts.push(text);}
 return parts.join(', ');
}

/** "Near KBR Park" — unless the landmark already starts with its own position word (Near/Opp./Behind...). */
export const landmarkText = (landmark?: string | null): string | null => {
  const l = String(landmark || '').trim();
  if (!l) return null;
  return /^(near|opp\.?|opposite|behind|beside|besides|next to|adjacent|in front of)(\s|$)/i.test(l) ? l : `Near ${l}`;
};
