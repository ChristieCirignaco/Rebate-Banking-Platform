"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { ChatProvider } from "@/lib/chat-widget";

// The active chat provider ("" = chat off), published once by the (app) layout and read by the
// chat button wherever it renders. A context rather than a prop threaded through every page: the
// button lives in the desktop header, the mobile home hero, and a dozen inner-page headers, and
// none of those should have to know or forward this. Server headers in between are transparent —
// the client provider and the client button share the value across them, the same way next-themes
// reaches client components through server layouts.
const ChatConfigContext = createContext<ChatProvider>("");

export function ChatConfigProvider({
  provider,
  children,
}: {
  provider: ChatProvider;
  children: ReactNode;
}) {
  return <ChatConfigContext.Provider value={provider}>{children}</ChatConfigContext.Provider>;
}

export function useChatProvider(): ChatProvider {
  return useContext(ChatConfigContext);
}
