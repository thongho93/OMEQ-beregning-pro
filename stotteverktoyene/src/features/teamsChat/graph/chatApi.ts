import type { AccountInfo, IPublicClientApplication } from "@azure/msal-browser";
import { graphGet, graphPost } from "./graphClient";

// Minimal types for the UI. Extend as needed.
export interface GraphListResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
}

export interface GraphChat {
  id: string;
  topic?: string | null;
  chatType?: string;
  createdDateTime?: string;
  lastUpdatedDateTime?: string;
}

export interface GraphItemBody {
  contentType?: "text" | "html";
  content?: string;
}

export interface GraphChatMessageFrom {
  user?: {
    id?: string;
    displayName?: string;
  };
  application?: {
    id?: string;
    displayName?: string;
  };
}

export interface GraphChatMessage {
  id: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  subject?: string | null;
  body?: GraphItemBody;
  from?: GraphChatMessageFrom;
}

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export async function listMyChats(
  instance: IPublicClientApplication,
  account: AccountInfo
): Promise<GraphChat[]> {
  // Keep it simple: fetch first 50 chats.
  const url = `${GRAPH_BASE}/me/chats?$top=50`;
  const res = await graphGet<GraphListResponse<GraphChat>>(instance, account, url);
  return res.value ?? [];
}

export async function listChatMessages(
  instance: IPublicClientApplication,
  account: AccountInfo,
  chatId: string
): Promise<GraphChatMessage[]> {
  // Fetch latest 50 messages. We can add paging later.
  const url = `${GRAPH_BASE}/chats/${encodeURIComponent(chatId)}/messages?$top=50`;
  const res = await graphGet<GraphListResponse<GraphChatMessage>>(instance, account, url);
  return res.value ?? [];
}

export async function sendChatMessage(
  instance: IPublicClientApplication,
  account: AccountInfo,
  chatId: string,
  message: string
): Promise<GraphChatMessage> {
  const url = `${GRAPH_BASE}/chats/${encodeURIComponent(chatId)}/messages`;

  return await graphPost<GraphChatMessage>(instance, account, url, {
    body: {
      contentType: "text",
      content: message,
    },
  });
}
