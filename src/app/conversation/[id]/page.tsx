'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useConversationStore } from '@/store/conversation';
import { PersonaCard } from '@/components/PersonaCard';
import { MessageBubble } from '@/components/MessageBubble';
import { ConversationCanvas } from '@/components/ConversationCanvas';
import { ConversationControls } from '@/components/ConversationControls';
import { Button } from '@/components/ui/button';
import { PERSONA_INFO, PersonaType } from '@/lib/perplexity';
import { AutoConversationEngine, ConversationState } from '@/lib/autoConversation';

interface DatabaseMessage {
  id: string;
  content: string;
  persona: string;
  timestamp: string;
  factChecked: boolean;
}

interface DatabaseConversation {
  id: string;
  title: string;
  problem: string;
  status: string;
  activePersonas: string;
  messages: DatabaseMessage[];
}

export default function ConversationPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  
  const { messages, problem, setProblem, addMessage, isLoading, setIsLoading, clearConversation } = useConversationStore();
  const [selectedPersona, setSelectedPersona] = useState<PersonaType | null>(null);
  const [userInput, setUserInput] = useState('');
  const [showInterruptInput, setShowInterruptInput] = useState(false);
  const [interruptMessage, setInterruptMessage] = useState('');
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [conversationNotFound, setConversationNotFound] = useState(false);
  
  // Auto-conversation state
  const [autoConversationEngine] = useState(() => new AutoConversationEngine());
  const [conversationState, setConversationState] = useState<ConversationState>({
    currentSpeaker: null,
    conversationRound: 0,
    topicFocus: '',
    isActive: false,
    pauseRequested: false,
    lastSpeakTime: 0,
  });

  // Layout state
  const [viewMode, setViewMode] = useState<'split' | 'chat' | 'canvas'>('split');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Save message to database - memoized to prevent infinite loops
  const saveMessageToDatabase = useCallback(async (message: {
    id: string;
    content: string;
    persona: string;
    timestamp: Date;
    factChecked?: boolean;
  }) => {
    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message.content,
          persona: message.persona,
          factChecked: message.factChecked || false,
        }),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }, [conversationId]);

  // Load conversation - memoized to prevent infinite loops
  const loadConversation = useCallback(async () => {
    try {
      setIsLoadingConversation(true);
      
      // Fetch conversation details
      const conversationResponse = await fetch(`/api/conversations/${conversationId}`);
      if (!conversationResponse.ok) {
        setConversationNotFound(true);
        return;
      }
      
      const conversationData = await conversationResponse.json();
      const conversation: DatabaseConversation = conversationData.conversation;
      
      // Fetch messages
      const messagesResponse = await fetch(`/api/conversations/${conversationId}/messages`);
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        
        // Clear existing conversation and load from database
        clearConversation();
        setProblem(conversation.problem);
        
        // Convert database messages to store format
        messagesData.messages.forEach((dbMessage: DatabaseMessage) => {
          addMessage({
            content: dbMessage.content,
            persona: dbMessage.persona as PersonaType | 'user',
            factChecked: dbMessage.factChecked,
          });
        });
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      setConversationNotFound(true);
    } finally {
      setIsLoadingConversation(false);
    }
  }, [conversationId, clearConversation, setProblem, addMessage]);

  // Load conversation from database
  useEffect(() => {
    if (status === 'authenticated' && conversationId) {
      loadConversation();
    }
  }, [status, conversationId, loadConversation]);

  // Initialize auto-conversation engine
  useEffect(() => {
    autoConversationEngine.setMessageCallback((message) => {
      const fullMessage = {
        id: Date.now().toString(),
        content: message.content,
        persona: message.persona,
        timestamp: new Date(),
        factChecked: message.factChecked,
      };
      addMessage(fullMessage);
      autoConversationEngine.addMessage(fullMessage);
      
      // Save message to database
      saveMessageToDatabase(fullMessage);
    });

    autoConversationEngine.setStateChangeCallback((state) => {
      setConversationState(state);
    });
  }, [autoConversationEngine, addMessage, saveMessageToDatabase]);

  // Auto-scroll to bottom of chat container
  useEffect(() => {
    if (messagesEndRef.current && chatContainerRef.current) {
      if (viewMode === 'split' || viewMode === 'chat') {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
    }
  }, [messages, viewMode]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      content: userInput,
      persona: 'user' as const,
      timestamp: new Date()
    };

    addMessage(userMessage);
    await saveMessageToDatabase(userMessage);
    
    if (conversationState.isActive) {
      autoConversationEngine.interruptWithUserMessage(userMessage);
    }
    
    setUserInput('');
  };

  const handlePersonaResponse = async (persona: PersonaType) => {
    if (isLoading || conversationState.isActive) return;
    
    setIsLoading(true);
    setSelectedPersona(persona);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          persona,
          problem: problem || ''
        })
      });

      const data = await response.json();
      
      if (data.response) {
        const aiMessage = {
          id: Date.now().toString(),
          content: data.response,
          persona,
          timestamp: new Date(),
          factChecked: data.factChecked || false,
        };
        
        addMessage(aiMessage);
        await saveMessageToDatabase(aiMessage);
      }
    } catch (error) {
      console.error('Error getting persona response:', error);
    } finally {
      setIsLoading(false);
      setSelectedPersona(null);
    }
  };

  // Auto-conversation controls
  const handleStartAutoConversation = () => {
    if (problem?.trim()) {
      autoConversationEngine.startConversation(problem, messages);
    }
  };

  const handlePauseAutoConversation = () => {
    autoConversationEngine.pauseConversation();
  };

  const handleResumeAutoConversation = () => {
    autoConversationEngine.resumeConversation();
  };

  const handleStopAutoConversation = () => {
    autoConversationEngine.stopConversation();
  };

  const handleInterruptConversation = () => {
    setShowInterruptInput(true);
    autoConversationEngine.pauseConversation();
  };

  const handleSubmitInterrupt = async () => {
    if (interruptMessage.trim()) {
      const userMessage = {
        id: Date.now().toString(),
        content: interruptMessage,
        persona: 'user' as const,
        timestamp: new Date()
      };
      
      addMessage(userMessage);
      await saveMessageToDatabase(userMessage);
      autoConversationEngine.interruptWithUserMessage(userMessage);
      
      setInterruptMessage('');
      setShowInterruptInput(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    autoConversationEngine.setSpeakingInterval(speed);
  };

  const handleNodeClick = (nodeId: string) => {
    const message = messages.find(m => m.id === nodeId);
    if (message) {
      console.log('Clicked node:', message);
    }
  };

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  const handleNewConversation = () => {
    router.push('/');
  };

  // Loading state
  if (status === 'loading' || isLoadingConversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading conversation...</div>
      </div>
    );
  }

  // Conversation not found
  if (conversationNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-white mb-4">Conversation Not Found</h1>
          <p className="text-slate-300 mb-6">This conversation doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Button onClick={goToDashboard} className="bg-gradient-to-r from-blue-500 to-purple-600">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="flex h-screen overflow-hidden">
        {/* Left Sidebar - Controls & Personas */}
        <div className="w-80 bg-black/30 backdrop-blur-lg border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-white">P</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Perspectra</h1>
                <p className="text-xs text-slate-400">AI Boardroom</p>
              </div>
            </div>
            
            {/* Problem Summary */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <h3 className="text-sm font-medium text-slate-300 mb-2">Current Discussion</h3>
              <p className="text-sm text-white line-clamp-3">{problem || 'No topic set'}</p>
            </div>
          </div>

          {/* Conversation Controls */}
          <div className="p-6 border-b border-white/10">
            <ConversationControls
              conversationState={conversationState}
              onStart={handleStartAutoConversation}
              onPause={handlePauseAutoConversation}
              onResume={handleResumeAutoConversation}
              onStop={handleStopAutoConversation}
              onInterrupt={handleInterruptConversation}
              onSpeedChange={handleSpeedChange}
              disabled={!problem?.trim()}
            />
          </div>

          {/* Manual Personas */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Manual Control</h2>
            <div className="space-y-3">
              {Object.entries(PERSONA_INFO).map(([key, info]) => (
                <PersonaCard
                  key={key}
                  info={info}
                  isActive={selectedPersona === key}
                  isLoading={isLoading && selectedPersona === key}
                  onClick={() => handlePersonaResponse(key as PersonaType)}
                />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 border-t border-white/10">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-lg font-bold text-white">{messages.length}</div>
                <div className="text-xs text-slate-400">Messages</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-lg font-bold text-white">
                  {new Set(messages.map(m => m.persona)).size}
                </div>
                <div className="text-xs text-slate-400">Perspectives</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {problem ? (problem.slice(0, 50) + (problem.length > 50 ? '...' : '')) : 'No topic set'}
              </h2>
              
              <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex bg-black/30 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('split')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      viewMode === 'split' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Split View
                  </button>
                  <button
                    onClick={() => setViewMode('chat')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      viewMode === 'chat' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Chat Only
                  </button>
                  <button
                    onClick={() => setViewMode('canvas')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      viewMode === 'canvas' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Canvas Only
                  </button>
                </div>

                {/* Navigation Buttons */}
                <Button
                  onClick={handleNewConversation}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  New
                </Button>
                <Button
                  onClick={goToDashboard}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Dashboard
                </Button>
                
                {/* Save Status */}
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Saved
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Chat Section */}
            {(viewMode === 'split' || viewMode === 'chat') && (
              <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col border-r border-white/10 overflow-hidden`}>
                {/* Messages Container */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-6 space-y-4"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {messages.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">🤔</div>
                      <h3 className="text-xl font-semibold text-white mb-2">Continue the discussion</h3>
                      <p className="text-slate-400 mb-6">
                        Start an auto-conversation or click on any AI advisor to get their perspective.
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="bg-black/20 backdrop-blur-lg border-t border-white/10 p-4 flex-shrink-0">
                  {showInterruptInput ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-yellow-400 text-sm">
                        <span>🖐️</span>
                        <span>Interrupting conversation...</span>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={interruptMessage}
                          onChange={(e) => setInterruptMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSubmitInterrupt()}
                          placeholder="Add your input to guide the conversation..."
                          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          autoFocus
                        />
                        <Button
                          onClick={handleSubmitInterrupt}
                          disabled={!interruptMessage.trim()}
                          className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700"
                        >
                          Submit
                        </Button>
                        <Button
                          onClick={() => {
                            setShowInterruptInput(false);
                            setInterruptMessage('');
                            autoConversationEngine.resumeConversation();
                          }}
                          className="px-6 py-3 bg-gray-600 hover:bg-gray-700"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Add your thoughts or ask a question..."
                        className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!userInput.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
                      >
                        Send
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Canvas Section */}
            {(viewMode === 'split' || viewMode === 'canvas') && (
              <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} p-6 overflow-hidden`}>
                <ConversationCanvas
                  messages={messages}
                  isAutoConversing={conversationState.isActive && !conversationState.pauseRequested}
                  onNodeClick={handleNodeClick}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 