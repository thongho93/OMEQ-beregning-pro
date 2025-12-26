import { Box, Divider, Typography } from "@mui/material";
import type { GraphChatMessage } from "../graph/chatApi";

export interface MessageListProps {
  messages: GraphChatMessage[];
  title?: string;
  emptyText?: string;
}

function stripHtml(html: string): string {
  // Minimal client-side HTML stripping (Graph can return html).
  // This keeps component dependency-free.
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function messageText(msg: GraphChatMessage): string {
  const body = msg.body?.content ?? "";
  const type = msg.body?.contentType ?? "text";
  if (!body) return "";
  if (type === "html") return stripHtml(body);
  return body;
}

function fromText(msg: GraphChatMessage): string {
  const name = msg.from?.user?.displayName || msg.from?.application?.displayName;
  return name || "Ukjent";
}

export default function MessageList({
  messages,
  title = "Meldinger",
  emptyText = "Velg en chat for å se meldinger.",
}: MessageListProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Typography sx={{ px: 2, py: 1.5 }} variant="subtitle1">
        {title}
      </Typography>
      <Divider />

      {messages.length === 0 ? (
        <Box sx={{ px: 2, py: 2 }}>
          <Typography color="text.secondary">{emptyText}</Typography>
        </Box>
      ) : (
        <Box sx={{ px: 2, py: 2, overflow: "auto", flex: 1 }}>
          {messages
            .slice()
            .sort((a, b) => {
              const da = a.createdDateTime ? Date.parse(a.createdDateTime) : 0;
              const db = b.createdDateTime ? Date.parse(b.createdDateTime) : 0;
              return da - db;
            })
            .map((msg) => {
              const text = messageText(msg);
              const from = fromText(msg);
              const time = msg.createdDateTime
                ? new Date(msg.createdDateTime).toLocaleString()
                : "";

              return (
                <Box key={msg.id} sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {from}
                    {time ? ` · ${time}` : ""}
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                    {text || "(tom melding)"}
                  </Typography>
                </Box>
              );
            })}
        </Box>
      )}
    </Box>
  );
}
