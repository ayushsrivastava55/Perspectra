import { PERSONA_INFO } from '@/lib/perplexity';

interface Message {
  id: string;
  content: string;
  persona: string;
  timestamp: Date;
  factChecked?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.persona === 'user';
  const personaInfo = isUser ? null : PERSONA_INFO[message.persona as keyof typeof PERSONA_INFO];

  const getPersonaColors = (persona: string) => {
    switch (persona) {
      case 'system1':
        return 'from-red-500/20 to-red-600/20 border-red-400/30';
      case 'system2':
        return 'from-blue-500/20 to-blue-600/20 border-blue-400/30';
      case 'moderator':
        return 'from-green-500/20 to-green-600/20 border-green-400/30';
      case 'devilsAdvocate':
        return 'from-purple-500/20 to-purple-600/20 border-purple-400/30';
      default:
        return 'from-slate-500/20 to-slate-600/20 border-slate-400/30';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-2xl">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl rounded-br-md p-4 shadow-lg">
            <p className="text-white leading-relaxed">{message.content}</p>
          </div>
          <div className="flex items-center justify-end gap-2 mt-2 px-2">
            <span className="text-xs text-slate-400">You</span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-2xl">
        <div className={`
          bg-gradient-to-r ${getPersonaColors(message.persona)} 
          backdrop-blur-sm rounded-2xl rounded-bl-md p-4 border shadow-lg
        `}>
          {/* Persona Header */}
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-sm">
              {personaInfo?.name?.charAt(0)}
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">
                {personaInfo?.name}
              </h4>
              <p className="text-xs text-white/60">
                {personaInfo?.description}
              </p>
            </div>
          </div>

          {/* Message Content */}
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
            
            {/* Fact-checking indicator */}
            {message.factChecked && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs text-green-300">
                  <span className="w-4 h-4 bg-green-500/20 rounded-full flex items-center justify-center">
                    ✓
                  </span>
                  <span>Fact-checked with current data</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 mt-2 px-2">
          <span className="text-xs text-slate-400">{personaInfo?.name}</span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
          {message.factChecked && (
            <>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Verified
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 