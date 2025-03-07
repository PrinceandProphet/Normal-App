import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { Message } from "@shared/schema";

interface MessageThreadProps {
  messages: Message[];
  onSend: (content: string) => void;
  content: string;
  onContentChange: (content: string) => void;
}

export default function MessageThread({
  messages,
  onSend,
  content,
  onContentChange,
}: MessageThreadProps) {
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
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
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {format(new Date(message.timestamp), "PPp")}
                </p>
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
