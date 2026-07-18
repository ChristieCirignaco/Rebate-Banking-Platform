"use client";

import { useEffect } from "react";

import { hideChatLauncher, showChatLauncher } from "@/lib/chat-widget";
import { useChatProvider } from "@/components/app/chat/chat-config";

// Hides the vendor's floating launcher for as long as the signed-in app is mounted, and restores
// it on the way out. The chat script itself loads site-wide (SitePluginScripts in the root
// layout), so on marketing and auth pages the bubble floats as normal; here the header ChatButton
// is the entry point and a second floating bubble would just be clutter. Renders nothing.
export function ChatLauncherManager() {
  const provider = useChatProvider();

  useEffect(() => {
    if (!provider) return;
    hideChatLauncher(provider);
    // On unmount — i.e. leaving the whole (app) subtree for marketing/auth — give the floating
    // launcher back.
    return () => showChatLauncher(provider);
  }, [provider]);

  return null;
}
