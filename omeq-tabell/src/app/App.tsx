import { useMemo, useState } from "react";
import { Box, Container, Divider, IconButton, Paper, Typography, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import styles from "../styles/App.module.css";

import { OMEQRow, type OMEQRowValue } from "../features/omeq/components/OMEQRow";

type Row = OMEQRowValue & { id: string };

const makeRow = (): Row => ({
  id: crypto.randomUUID(),
  medicationText: "",
  doseText: "",
});

function App() {
  const [rows, setRows] = useState<Row[]>([makeRow()]);

  const setRowById = (id: string, next: OMEQRowValue) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, makeRow()]);
  };

  const resetAll = () => {
    window.location.reload();
  };

  const showDividers = useMemo(() => rows.length > 1, [rows.length]);

  return (
    <Container maxWidth={false} className={styles.appContainer}>
      <Paper elevation={3} className={styles.appCard}>
        <Typography variant="h4" gutterBottom>
          OMEQ – preparatsøk
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Lim inn preparatnavn og styrke, og legg inn dosering for beregning
        </Typography>

        {rows.map((r, idx) => (
          <Box key={r.id}>
            <OMEQRow value={r} onChange={(next) => setRowById(r.id, next)} />

            {idx < rows.length - 1 && showDividers && <Divider sx={{ my: 2 }} />}
            {idx === rows.length - 1 && (
              <Box className={styles.addRowGrid}>
                <Box className={styles.addRowButtonCell} style={{ gap: 8 }}>
                  <Tooltip title="Legg til ny linje">
                    <IconButton
                      aria-label="Legg til ny linje"
                      onClick={addRow}
                      sx={{
                        backgroundColor: "primary.main",
                        color: "white",
                        "&:hover": {
                          backgroundColor: "primary.main",
                        },
                      }}
                      className={styles.addRowButton}
                    >
                      <AddIcon />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Nullstill beregning">
                    <IconButton
                      aria-label="Nullstill beregning"
                      onClick={resetAll}
                      sx={{
                        ml: 2,
                        border: "1px solid",
                        borderColor: "primary.main",
                        color: "primary.main",
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                      className={styles.addRowButton}
                    >
                      <RestartAltIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}
          </Box>
        ))}
      </Paper>
    </Container>
  );
}

export default App;
