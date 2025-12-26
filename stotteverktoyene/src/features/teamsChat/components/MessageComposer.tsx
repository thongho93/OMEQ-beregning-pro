import React from "react";
import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

export interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageComposer({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Skriv en melding…",
}: MessageComposerProps) {
  const canSend = !disabled && value.trim().length > 0;

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    // Enter = send. Shift+Enter = newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end", p: 1.5 }}>
      <TextField
        fullWidth
        multiline
        minRows={1}
        maxRows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        size="small"
      />

      <Tooltip title={canSend ? "Send" : "Skriv en melding"}>
        <span>
          <IconButton
            aria-label="Send melding"
            onClick={() => {
              if (canSend) onSend();
            }}
            disabled={!canSend}
          >
            <SendIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
