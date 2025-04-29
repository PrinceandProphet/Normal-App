import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { Message } from "@shared/schema";
import { MessageTags } from "./message-tags";
import { CheckCircle, Building2 } from "lucide-react"; 
import { getTagLabel } from "@/utils/message-tagging";

interface MessageThreadProps {
  messages: Message[];
  onSend: (content: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  organizationName?: string;
  onTagClick?: (tag: string) => void;
}

export default function MessageThread({
  messages,
  onSend,
  content,
  onContentChange,
  organizationName,
  onTagClick,
}: MessageThreadProps) {
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
  );

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {sortedMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isInbound ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[70%] ${
                  message.isInbound
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {!message.isInbound && message.organizationId && (
                  <div className="flex items-center gap-1 text-xs font-medium mb-1 text-primary-foreground/80">
                    <Building2 size={12} />
                    <span>Sent as {organizationName || 'Organization'}</span>
                  </div>
                )}
                
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                
                {message.tags && (
                  <MessageTags 
                    tags={message.tags} 
                    className="mt-2"
                    selectable={!!onTagClick}
                    onTagClick={onTagClick}
                  />
                )}
                
                <div className="flex justify-between items-center text-xs opacity-70 mt-1">
                  <span>
                    {format(new Date(message.sentAt), "PPp")}
                  </span>
                  {message.status === 'delivered' && (
                    <CheckCircle size={12} className="ml-1" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Type your message..."
          className="flex-1"
          rows={3}
        />
        <Button 
          onClick={() => onSend(content)}
          disabled={!content.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
