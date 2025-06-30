'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { ConversationState } from '@/lib/autoConversation';

interface ConversationControlsProps {
  conversationState: ConversationState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onInterrupt: () => void;
  onSpeedChange: (speed: number) => void;
  disabled?: boolean;
}

export function ConversationControls({
  conversationState,
  onStart,
  onPause,
  onResume,
  onStop,
  onInterrupt,
  onSpeedChange,
  disabled = false
}: ConversationControlsProps) {
  const [speed, setSpeed] = useState(3000); // Default 3 seconds
  const [expanded, setExpanded] = useState(false);

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    onSpeedChange(newSpeed);
  };

  return (
    <div className="bg-[#33333E] rounded-[10px] p-4">
      {/* Header with expand/collapse button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <svg
            width="30"
            height="30"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Settings icon"
            role="img"
            className="flex-shrink-0"
          >
            <rect width="64" height="64" rx="12" fill="#A259FF" />
            <circle cx="32" cy="32" r="14" stroke="white" strokeWidth="3" fill="none" />
            <g transform="translate(32,32)" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line y1="-14" y2="-20" />
              <line y1="-14" y2="-20" transform="rotate(45)" />
              <line y1="-14" y2="-20" transform="rotate(90)" />
              <line y1="-14" y2="-20" transform="rotate(135)" />
              <line y1="-14" y2="-20" transform="rotate(180)" />
              <line y1="-14" y2="-20" transform="rotate(225)" />
              <line y1="-14" y2="-20" transform="rotate(270)" />
              <line y1="-14" y2="-20" transform="rotate(315)" />
            </g>
          </svg>
          <h3 className="text-[16px] font-poppins text-[#F1F3F7]">Conversation Control</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${conversationState.isActive && !conversationState.pauseRequested ? 'bg-green-500 animate-pulse' : conversationState.pauseRequested ? 'bg-yellow-500' : 'bg-red-500'}`} />
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-slate-400 hover:text-white"
          >
            {expanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* Always visible controls - Start/Stop buttons */}
      <div className="mb-2">
        {!conversationState.isActive ? (
          <Button
            onClick={onStart}
            disabled={disabled}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            ▶️ Start Auto-Conversation
          </Button>
        ) : (
          <div className="flex gap-2">
            {conversationState.pauseRequested ? (
              <Button
                onClick={onResume}
                disabled={disabled}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                ▶️ Resume
              </Button>
            ) : (
              <Button
                onClick={onPause}
                disabled={disabled}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                ⏸️ Pause
              </Button>
            )}
            <Button
              onClick={onStop}
              disabled={disabled}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              ⏹️ Stop
            </Button>
          </div>
        )}
      </div>

      {/* Collapsible content */}
      {expanded && (
        <div className="space-y-4 pt-2 border-t border-white/10">
          {/* Status Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-lg font-bold text-white">{conversationState.conversationRound}</div>
              <div className="text-xs text-slate-400">Conversation Round</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-lg font-bold text-white">
                {conversationState.currentSpeaker ? 
                  conversationState.currentSpeaker.charAt(0).toUpperCase() + conversationState.currentSpeaker.slice(1) : 
                  'None'
                }
              </div>
              <div className="text-xs text-slate-400">Current Speaker</div>
            </div>
          </div>

          {/* Interrupt Button */}
          {conversationState.isActive && (
            <Button
              onClick={onInterrupt}
              disabled={disabled}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white border-2 border-purple-400"
            >
              🖐️ Interrupt & Add Input
            </Button>
          )}

          {/* Speed Control */}
          <div className="space-y-2">
            <label className="text-[15px] font-medium text-white">
              Response Speed: {speed / 1000}s between messages
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Fast</span>
              <input
                type="range"
                min="1000"
                max="10000"
                step="500"
                value={speed}
                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((speed - 1000) / 9000) * 100}%, #475569 ${((speed - 1000) / 9000) * 100}%, #475569 100%)`
                }}
              />
              <span className="text-xs text-slate-400">Slow</span>
            </div>
          </div>

          {/* Advanced Options */}
          <details className="group">
            <summary className="text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
              Advanced Options
            </summary>
            <div className="mt-3 space-y-3 pl-4 border-l border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Topic Evolution</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Pause on User Input</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Smart Speaker Selection</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
            </div>
          </details>

          {/* Current Topic */}
          {conversationState.topicFocus && (
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-sm font-medium text-white mb-1">Current Focus</h4>
              <p className="text-sm text-slate-300 line-clamp-2">
                {conversationState.topicFocus}
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-300 hover:text-white transition-colors">
              Export Conversation
            </button>
            <button className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-300 hover:text-white transition-colors">
              Save State
            </button>
          </div>
        </div>
      )}
    </div>
  );
}