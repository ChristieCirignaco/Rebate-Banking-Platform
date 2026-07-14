import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import { TicketAttachmentPreview } from "./ticket-attachment-preview";
import type { TicketMessageView } from "./types";

// One chat-style bubble in the thread. Admin (staff) messages align right in the primary
// color; the user's own messages align left in a neutral surface — the standard support-
// chat convention, so the roles are visually unmistakable at a glance.
export function TicketMessageBubble({ message }: { message: TicketMessageView }) {
  const isAdmin = message.senderType === "admin";

  return (
    <div className={cn("flex gap-3", isAdmin && "flex-row-reverse")}>
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="text-xs">{initials(message.senderName)}</AvatarFallback>
      </Avatar>
      <div className={cn("flex max-w-[80%] flex-col gap-1", isAdmin && "items-end")}>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{message.senderName}</span>
          <span className="text-muted-foreground text-xs">{isAdmin ? "Staff" : "User"}</span>
        </div>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap",
            isAdmin
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted rounded-tl-sm",
          )}
        >
          {message.body}
        </div>
        {message.attachments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <TicketAttachmentPreview key={attachment.key} attachment={attachment} />
            ))}
          </div>
        ) : null}
        <span
          suppressHydrationWarning
          className="text-muted-foreground text-xs"
          title={formatDateTime(message.createdAt)}
        >
          {formatDateTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}
