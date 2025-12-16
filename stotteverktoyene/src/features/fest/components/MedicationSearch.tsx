import { useMemo, useState } from "react";
import { Box, List, ListItemButton, ListItemText, TextField, Typography, InputAdornment, IconButton } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";

import meds from "../meds.json";

type Med = {
  id: string;
  varenavn: string | null;
  navnFormStyrke: string | null;
  atc: string | null;
  virkestoff: string | null;
  produsent: string | null;
  reseptgruppe: string | null;
};

type Props = {
  maxResults?: number;
  onPick?: (med: Med) => void;
};

const normalizeForSearch = (value: string) =>
  value
    .toLowerCase()
    // Split digit/letter boundaries so "30mg" becomes "30 mg"
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    // Treat common punctuation as spaces
    .replace(/[\u00B5µ,.;:()\[\]{}\/\\|+\-_*"'!?]/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

const toTokens = (value: string) =>
  normalizeForSearch(value)
    .split(" ")
    .filter((t) => t.length >= 2 || /^\d+$/.test(t));

const isNumberToken = (t: string) => /^\d+$/.test(t);

const tokenMatches = (hayTokens: string[], needle: string) => {
  if (isNumberToken(needle)) {
    // numbers must match exactly (so 40 doesn't match 10/20)
    return hayTokens.includes(needle);
  }
  // text tokens can match as prefix of any token (so "xirom" matches "xiromed")
  return hayTokens.some((ht) => ht.startsWith(needle));
};

export default function MedicationSearch({ maxResults = 25, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const tokens = toTokens(query);
    if (tokens.length === 0) return [];

    const brandToken = tokens[0];
    const requiredTokens = tokens.slice(1); // alt etter første token (f.eks. produsent + styrke)

    const out: { med: Med; score: number }[] = [];

    for (const m of meds as Med[]) {
      const hayText = m.navnFormStyrke ?? m.varenavn ?? "";
      if (!hayText) continue;

      const hay = normalizeForSearch(hayText);
      const hayTokens = toTokens(hayText);

      // Må matche første token (oftest preparatnavn). Tillat prefiks-match for tekst.
      if (!tokenMatches(hayTokens, brandToken) && !hay.includes(brandToken)) continue;

      // Strengere filter: alle øvrige tokens må også matche.
      // Teksttokens kan matche som prefiks ("xirom" -> "xiromed"), men tall må matche eksakt.
      if (requiredTokens.length > 0) {
        const ok = requiredTokens.every((t) => tokenMatches(hayTokens, t));
        if (!ok) continue;
      }

      // Score = hvor mange tokens som finnes i teksten
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += 1;
      }

      out.push({ med: m, score });
    }

    out.sort((a, b) => b.score - a.score);

    return out.slice(0, maxResults).map((x) => x.med);
  }, [query, maxResults]);

  return (
    <Box sx={{ mt: 2 }}>
      <TextField
        fullWidth
        label="Søk etter preparat"
        placeholder="Søk på navn, f.eks. 'Arcoxia'"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        InputProps={{
          endAdornment: query ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                }}
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      {query.trim() && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Viser opptil {maxResults} treff (filtrert på navnFormStyrke)
          </Typography>
        </Box>
      )}

      {open && results.length > 0 && (
        <List dense sx={{ mt: 1, maxHeight: 320, overflow: "auto" }}>
          {results.map((m) => (
            <ListItemButton
              key={m.id}
              onClick={() => {
                const label = (m.navnFormStyrke ?? m.varenavn ?? "").trim();
                if (label) setQuery(label);
                onPick?.(m);
                setOpen(false);
              }}
              sx={{ borderRadius: 1 }}
            >
              <ListItemText
                primary={m.navnFormStyrke ?? m.varenavn ?? "(uten navn)"}
                secondary={[
                  m.virkestoff ? `Virkestoff: ${m.virkestoff}` : null,
                  m.atc ? `ATC: ${m.atc}` : null,
                  m.reseptgruppe ? `Reseptgruppe: ${m.reseptgruppe}` : null,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
