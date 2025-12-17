import { useMemo, useRef, useState } from "react";
import {
  Box,
  ClickAwayListener,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  TextField,
} from "@mui/material";
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

const NOISE_TOKENS = new Set([
  // packaging / form / filler words often present in pasted strings
  "stk",
  "stk.",
  "blister",
  "blisterpakning",
  "pakning",
  "blist", // sometimes pasted/abbreviated
  "modi",
  "modif",
  "modif.",
  "modifisert",
  "kap",
  "kaps",
  "kapsel",
  "tab",
  "tablett",
  "mikstur",
  "susp",
  "inj",
  "inf",
  "oppl",
  "pulv",
  "pulver",
  "væske",
  "aerosol",
  "inh",
  "spray",
  "dråper",
  "dr",
  "depot",
  "retard",
  "sr",
  "cr",
  "xr",
  "frisett",
  "fri",
]);

const normalizeForSearch = (value: string) =>
  value
    .toLowerCase()
    // keep decimals together: "0,4" -> "0.4"
    .replace(/(\d),(\d)/g, "$1.$2")
    // Split digit/letter boundaries so "30mg" becomes "30 mg"
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    // Treat common punctuation as spaces (keep dot since we use it for decimals)
    .replace(/[\u00B5µ,;:()\[\]{}\/\\|+\-_*"'!?]/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

const dedupe = (arr: string[]) => {
  const out: string[] = [];
  for (const t of arr) {
    if (!t) continue;
    if (out[out.length - 1] !== t) out.push(t);
  }
  return out;
};

const toTokens = (value: string) => {
  const tokens = normalizeForSearch(value)
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean)
    // remove noise tokens
    .filter((t) => !NOISE_TOKENS.has(t))
    // keep short tokens only if they are numbers/decimals
    .filter((t) => t.length >= 2 || /^\d+(?:\.\d+)?$/.test(t));

  return dedupe(tokens);
};

const isNumberToken = (t: string) => /^\d+(?:\.\d+)?$/.test(t);

const tokenMatches = (hayTokens: string[], needleRaw: string) => {
  const needle = needleRaw.replace(",", ".");

  if (isNumberToken(needle)) {
    // numbers (including decimals) must match exactly
    return hayTokens.includes(needle);
  }

  // text tokens can match as prefix of any token (so "xirom" matches "xiromed")
  return hayTokens.some((ht) => ht.startsWith(needle));
};

export default function MedicationSearch({ maxResults = 25, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const tokens = toTokens(query);
    if (tokens.length === 0) return [];

    // number + unit pair like "75 mg" or "1.25 ml"
    const unitSet = new Set(["mg", "g", "mcg", "ug", "µg", "mikrog", "mikrogram", "ml", "dose", "t", "time"]);

    // Split into meaningful text vs number tokens
    const textTokens = tokens.filter((t) => !isNumberToken(t) && !unitSet.has(t));

    // If the user pasted a long string, we want the match to be more specific.
    // Avoid short/partial tokens like "atin" from becoming required.
    const meaningfulTextTokens = textTokens
      .filter((t) => t.length >= 4) // drop partials
      .filter((t) => t !== "mg" && t !== "ml");

    // Require up to 2 meaningful tokens (typically substance + brand/manufacturer),
    // but if we only have one, require that.
    const requiredTextTokens = meaningfulTextTokens.slice(0, Math.min(2, meaningfulTextTokens.length));

    // Enforce only meaningful strength tokens from the query (handles long pasted strings)
    const decimalToken = tokens.find((t) => /^\d+\.\d+$/.test(t));

    const numberWithUnit = (() => {
      for (let i = 0; i < tokens.length - 1; i++) {
        const a = tokens[i];
        const b = tokens[i + 1];
        if (isNumberToken(a) && unitSet.has(b)) return a;
      }
      return null;
    })();

    const requiredStrengthTokens = [
      ...(numberWithUnit ? [numberWithUnit] : []),
      ...(!numberWithUnit && decimalToken ? [decimalToken] : []),
    ];

    const out: { med: Med; score: number }[] = [];

    for (const m of meds as Med[]) {
      const hayText = m.navnFormStyrke ?? m.varenavn ?? "";
      if (!hayText) continue;

      const hay = normalizeForSearch(hayText);
      const hayTokens = toTokens(hayText);

      // Må matche viktige tekst-tokens (typisk preparatnavn + ev. produsent/variant fra pasted tekst).
      if (requiredTextTokens.length > 0) {
        const okText = requiredTextTokens.every(
          (t) => tokenMatches(hayTokens, t) || hay.includes(t)
        );
        if (!okText) continue;
      }

      // Må også matche relevant styrke hvis den finnes i query.
      if (requiredStrengthTokens.length > 0) {
        const okStrength = requiredStrengthTokens.every((t) => tokenMatches(hayTokens, t));
        if (!okStrength) continue;
      }

      // Score = hvor godt den matcher query. Tall teller mer. "required" teksttokens teller ekstra.
      let score = 0;

      for (const t of tokens) {
        if (isNumberToken(t)) {
          if (hayTokens.includes(t)) score += 2;
        } else {
          if (hay.includes(t)) score += 1;
        }
      }

      for (const t of requiredTextTokens) {
        if (tokenMatches(hayTokens, t) || hay.includes(t)) score += 3;
      }

      for (const t of requiredStrengthTokens) {
        if (hayTokens.includes(t)) score += 3;
      }

      // Bonus when the candidate contains most of the (normalized) query text.
      // Helps when the user pastes a long product line.
      const qNorm = normalizeForSearch(query);
      if (qNorm.length >= 8 && hay.includes(qNorm)) score += 6;

      out.push({ med: m, score });
    }

    out.sort((a, b) => b.score - a.score);

    return out.slice(0, maxResults).map((x) => x.med);
  }, [query, maxResults]);

  return (
    <Box>
      <TextField
        ref={anchorRef}
        fullWidth
        label="Søk etter preparat"
        placeholder="Søk på navn, f.eks. 'Arcoxia'"
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(Boolean(next.trim()));
        }}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
          }
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

      <Popper
        open={open && results.length > 0}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
        modifiers={[
          { name: "offset", options: { offset: [0, 8] } },
          { name: "preventOverflow", options: { padding: 8 } },
        ]}
      >
        <ClickAwayListener
          onClickAway={() => {
            setOpen(false);
          }}
        >
          <Paper
            elevation={6}
            sx={{
              width: anchorRef.current?.clientWidth ?? 420,
              maxWidth: 520,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <List dense sx={{ maxHeight: 320, overflow: "auto" }}>
              {results.map((m) => (
                <ListItemButton
                  key={m.id}
                  onClick={() => {
                    const label = (m.navnFormStyrke ?? m.varenavn ?? "").trim();
                    if (label) setQuery(label);
                    onPick?.(m);
                    setOpen(false);
                  }}
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
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
}
