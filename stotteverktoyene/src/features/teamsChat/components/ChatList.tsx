import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
} from "@mui/material";
import type { GraphChat } from "../graph/chatApi";

export interface ChatListProps {
  chats: GraphChat[];
  selectedChatId?: string | null;
  onSelectChat: (chatId: string) => void;
  title?: string;
}

function labelForChat(chat: GraphChat): string {
  if (chat.topic && chat.topic.trim().length > 0) return chat.topic;
  // Fallback: show chatType + short id
  const shortId = chat.id?.slice(0, 8) ?? "";
  const type = chat.chatType ?? "chat";
  return `${type} · ${shortId}`;
}

export default function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  title = "Chats",
}: ChatListProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Typography sx={{ px: 2, py: 1.5 }} variant="subtitle1">
        {title}
      </Typography>
      <Divider />

      {chats.length === 0 ? (
        <Box sx={{ px: 2, py: 2 }}>
          <Typography color="text.secondary">Ingen chats å vise.</Typography>
        </Box>
      ) : (
        <List dense disablePadding sx={{ overflow: "auto", flex: 1 }}>
          {chats.map((chat) => {
            const selected = Boolean(selectedChatId && chat.id === selectedChatId);
            return (
              <ListItemButton
                key={chat.id}
                selected={selected}
                onClick={() => onSelectChat(chat.id)}
                sx={{ px: 2, py: 1.25 }}
              >
                <ListItemText
                  primary={labelForChat(chat)}
                  secondary={chat.lastUpdatedDateTime ?? chat.createdDateTime ?? ""}
                  secondaryTypographyProps={{
                    noWrap: true,
                  }}
                  primaryTypographyProps={{
                    noWrap: true,
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      )}
    </Box>
  );
}
