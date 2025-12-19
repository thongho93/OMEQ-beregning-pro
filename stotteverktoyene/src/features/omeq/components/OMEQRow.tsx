import { useMemo, useState } from "react";
import { Alert, Box, InputAdornment, TextField, Tooltip, Typography } from "@mui/material";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

import styles from "../../../styles/app.module.css";

import { MedicationInput } from "./MedicationInput";
import { buildProductIndex, parseMedicationInput } from "../lib/parseMedicationInput";
import { formToRoute } from "../data/atcProducts";
import { OPIOIDS } from "../data/opioids";
import { calculateOMEQ } from "../lib/calc";

export interface OMEQRowValue {
  medicationText: string;
  doseText: string;
}

interface Props {
  value: OMEQRowValue;
  onChange: (next: OMEQRowValue) => void;
}

export const OMEQRow = ({ value, onChange }: Props) => {
  const productIndex = useMemo(() => buildProductIndex(), []);

  const parsed = useMemo(
    () => parseMedicationInput(value.medicationText, productIndex),
    [value.medicationText, productIndex]
  );

  const matchedOpioid = useMemo(() => {
    if (!parsed.product) return null;

    const route = formToRoute(parsed.product.form);
    if (!route) return null;

    return (
      OPIOIDS.find(
        (o) => o.atcCode.includes(parsed.product!.atcCode as any) && o.route.includes(route)
      ) ?? null
    );
  }, [parsed.product]);

  const substanceText = matchedOpioid?.substance ?? "";

  const isPatch = parsed.product?.form?.toLowerCase() === "depotplaster";

  const [isDoseFocused, setIsDoseFocused] = useState(false);
  const MAX_UNITS_PER_DAY = 20;

  const dailyDose = useMemo(() => {
    const raw = value.doseText.trim();
    if (!raw) return null;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }, [value.doseText]);

  const doseOverLimit = useMemo(() => {
    if (isPatch) return false;
    if (dailyDose == null) return false;
    return dailyDose > MAX_UNITS_PER_DAY;
  }, [isPatch, dailyDose]);

  // Use this value everywhere in calculations so we stop computing when the input is clearly wrong.
  const effectiveDailyDose = useMemo(() => {
    if (doseOverLimit) return null;
    return dailyDose;
  }, [doseOverLimit, dailyDose]);

  const strengthMg = useMemo(() => {
    const s = parsed.strength;
    if (!s) return null;
    const v = Number(String(s.value).replace(",", "."));
    if (!Number.isFinite(v)) return null;

    const unit = String(s.unit).toLowerCase();
    if (unit === "mg") return v;
    if (unit === "g") return v * 1000;
    if (unit === "µg" || unit === "ug") return v / 1000;
    return null;
  }, [parsed.strength]);

  const totalMg = useMemo(() => {
    if (isPatch) return null;
    if (effectiveDailyDose == null || strengthMg == null) return null;
    return effectiveDailyDose * strengthMg;
  }, [isPatch, effectiveDailyDose, strengthMg]);

  const result = useMemo(() => {
    return calculateOMEQ({
      product: parsed.product ?? null,
      dailyDose: isPatch ? null : effectiveDailyDose,
      strength: parsed.strength ?? null,
    });
  }, [parsed.product, parsed.strength, effectiveDailyDose, isPatch]);

  const omeqText = useMemo(() => {
    if (result.omeq == null) return "";
    const rounded = Math.round((result.omeq + Number.EPSILON) * 100) / 100;
    return String(rounded);
  }, [result.omeq]);

  const statusText = useMemo(() => {
    if (!parsed.product) return "";

    switch (result.reason) {
      case "missing-input":
        if (isPatch) return "";
        if (doseOverLimit) return "Fyll inn riktig døgndose for å beregne OMEQ.";
      case "missing-strength":
        return isPatch
          ? "Fant ikke plasterstyrke (µg/time) for preparatet."
          : "Fant ikke styrke (mg) for preparatet.";
      case "unsupported-form":
      case "unsupported-codeine":
      case "unsupported-methadone":
      case "unsupported-oxycodone":
        return "Ikke støttet i enkel beregning enda.";
      case "no-route":
        return "Fant ikke administrasjonsvei for preparatet.";
      case "no-omeq-factor":
        return "Fant ikke OMEQ-faktor for valgt administrasjonsvei.";
      case "ok":
        return "";
      default:
        return "";
    }
  }, [parsed.product, result.reason, isPatch, doseOverLimit]);

  const mgWarningText = `Det ser ut som du har skrevet mg. Skriv antall tablett/kapsel/dose per døgn.`;

  const infoText = useMemo(() => {
    if (!matchedOpioid?.helpText) return "";

    // Bruk helpText også for depotplaster
    if (isPatch) return matchedOpioid.helpText;

    // Vis kun når produktet er gjenkjent og raden ellers er brukbar
    if (result.reason === "ok" || result.reason === "missing-input") return matchedOpioid.helpText;

    return "";
  }, [isPatch, matchedOpioid?.helpText, result.reason]);

  const totalText = useMemo(() => {
    if (totalMg == null) return "";
    return String(Math.round((totalMg + Number.EPSILON) * 100) / 100);
  }, [totalMg]);

  const doseLooksLikeMg = useMemo(() => {
    // Reuse this name for styling/error state: anything over limit is most likely mg.
    return doseOverLimit;
  }, [doseOverLimit]);

  const doseHelperText = useMemo(() => {
    if (isPatch) return "";

    const raw = value.doseText.trim();

    // Only show helper text when the dose field is active (focused) or the user has typed something.
    if (!isDoseFocused && !raw) return "";

    // While focused but empty: show a short guidance.
    if (!raw) return "Skriv antall tablett/kapsel/dose per døgn (ikke mg).";

    if (doseOverLimit) return mgWarningText;

    // When user has typed a value but we can't compute mg yet.
    if (dailyDose == null || strengthMg == null)
      return "Skriv antall tablett/kapsel/dose per døgn (ikke mg).";
    const impliedTotalMg = dailyDose * strengthMg;
    const roundedTotal = Math.round((impliedTotalMg + Number.EPSILON) * 100) / 100;
    const substance = substanceText || "virkestoff";

    if (!Number.isFinite(roundedTotal))
      return "Skriv antall tablett/kapsel/dose per døgn (ikke mg).";

    return `Tilsvarer ${roundedTotal} mg ${substance} per døgn.`;
  }, [isPatch, value.doseText, isDoseFocused, dailyDose, strengthMg, substanceText, doseOverLimit]);

  return (
    <Box className={styles.omeqRow}>
      <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <MedicationInput
          value={value.medicationText}
          onChange={(text) => onChange({ ...value, medicationText: text })}
        />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, visibility: substanceText ? "visible" : "hidden" }}
        >
          Virkestoff: {substanceText || "-"}
        </Typography>
      </Box>

      <Box className={styles.ratioBox}>
        <TextField
          value={matchedOpioid ? String(matchedOpioid.omeqFactor) : ""}
          label="OMEQ-faktor"
          size="small"
          InputProps={{ readOnly: true }}
          fullWidth
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "primary.main",
              },
              "&:hover fieldset": {
                borderColor: "primary.main",
              },
              "&.Mui-focused fieldset": {
                borderColor: "primary.main",
              },
            },
          }}
        />
      </Box>

      <Tooltip
        title={doseHelperText}
        open={!isPatch && !!doseHelperText && isDoseFocused}
        placement="top-start"
        arrow
        PopperProps={{
          modifiers: [
            {
              name: "offset",
              options: { offset: [0, 8] },
            },
          ],
        }}
        disableFocusListener
        disableHoverListener
        disableTouchListener
      >
        <Box sx={{ width: "100%" }}>
          <TextField
            label={isPatch ? "Ingen døgndose" : "Antall per døgn"}
            placeholder={isPatch ? "" : "F.eks. 4"}
            value={isPatch ? "" : value.doseText}
            onChange={(e) => onChange({ ...value, doseText: e.target.value })}
            inputProps={{ inputMode: "decimal", "aria-label": "Antall per døgn" }}
            fullWidth
            disabled={isPatch}
            error={doseLooksLikeMg && !isPatch}
            // Keep helperText empty to avoid truncation; tooltip shows the full guidance when active.
            helperText={""}
            onFocus={() => setIsDoseFocused(true)}
            onBlur={() => setIsDoseFocused(false)}
            InputProps={{
              endAdornment: !isPatch ? (
                <InputAdornment position="end">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    {doseLooksLikeMg && (
                      <Tooltip title={mgWarningText} placement="top" arrow>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            color: "warning.main",
                            cursor: "help",
                          }}
                        >
                          <WarningAmberOutlinedIcon fontSize="small" />
                        </Box>
                      </Tooltip>
                    )}
                    <Box component="span" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                      stk/døgn
                    </Box>
                  </Box>
                </InputAdornment>
              ) : undefined,
            }}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "primary.main",
                },
                "&:hover fieldset": {
                  borderColor: "primary.main",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
                },
              },
            }}
          />
        </Box>
      </Tooltip>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.5, visibility: totalMg != null ? "visible" : "hidden" }}
      >
        {totalMg != null ? `Total: ${totalText} mg` : "Total: 0 mg"}
      </Typography>

      <TextField
        label="OMEQ"
        value={omeqText}
        InputProps={{ readOnly: true }}
        fullWidth
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "primary.main",
            },
            "&:hover fieldset": {
              borderColor: "primary.main",
            },
            "&.Mui-focused fieldset": {
              borderColor: "primary.main",
            },
          },
        }}
      />

      {!!statusText && (
        <Typography variant="body2" color="text.secondary">
          {statusText}
        </Typography>
      )}
      {!!infoText && (
        <Alert severity="info" variant="outlined" sx={{ mt: 1, borderColor: "primary.main" }}>
          {infoText}
        </Alert>
      )}
    </Box>
  );
};
