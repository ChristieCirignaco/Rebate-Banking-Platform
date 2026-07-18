"use client";

import { MessageCircle } from "lucide-react";

import { openChat } from "@/lib/chat-widget";
import { HeaderIconButton, type HeaderIconVariant } from "@/components/app/header-icon-button";
import { useChatProvider } from "@/components/app/chat/chat-config";

// The header entry point to live chat. Opens whichever provider the admin enabled; renders
// nothing when chat is off, so every header can drop it in unconditionally and let the setting
// decide. The pulsing indicator marks it as a live channel.
export function ChatButton({ variant = "surface" }: { variant?: HeaderIconVariant }) {
  const provider = useChatProvider();
  if (!provider) return null;

  return (
    <HeaderIconButton
      label="Chat with support"
      variant={variant}
      indicator
      onClick={() => openChat(provider)}
    >
      <MessageCircle className="size-5" />
    </HeaderIconButton>
  );
}
