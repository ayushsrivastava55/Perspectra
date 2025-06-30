'use client';

import { Message } from '@/store/conversation';
import { PERSONA_INFO, PersonaType } from '@/lib/perplexity';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.persona === 'user';
  const personaInfo = isUser ? null : PERSONA_INFO[message.persona as PersonaType];

  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-3 shadow-sm",
        isUser 
          ? "bg-blue-500 text-white" 
          : "bg-white border border-gray-200"
      )}>
        {!isUser && personaInfo && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
            <span className="text-lg">{personaInfo.name.charAt(0)}</span>
            <span className="font-semibold text-sm text-gray-700">
              {personaInfo.name}
            </span>
          </div>
        )}
        
        <div className={cn(
          "text-sm leading-relaxed",
          isUser ? "text-white" : "text-gray-800"
        )}>
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
              <span className="text-gray-500">Thinking...</span>
            </div>
          ) : (
            message.content
          )}
        </div>
        
        <div className={cn(
          "text-xs mt-2 opacity-70",
          isUser ? "text-blue-100" : "text-gray-500"
        )}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
} 