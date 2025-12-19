export type SearchSource = "FEST" | "PIM" | "HV";

export type SearchIndexItem = {
  source: SearchSource;

  // unik nøkkel for React + for å kunne velge riktig rad igjen
  // tips: bygg som `${source}:${id}`
  id: string;

  // det du viser i dropdown
  displayName: string;

  // normalisert tekst du matcher på (lowercase, fjern ekstra mellomrom, osv.)
  searchText: string;

  // FEST-only (valgfritt)
  atc?: string;
  substance?: string;       // virkestoff
  prescriptionGroup?: string; // reseptgruppe

  // PIM/HV (valgfritt)
  farmaloggNumber?: string;

  // PIM/HV: behold begge, fordi de brukes forskjellig (visning vs søk vs detaljer)
  name?: string;
  nameFormStrength?: string;
};