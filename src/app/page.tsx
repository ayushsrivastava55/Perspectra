'use client';

import { useState, useEffect, useRef } from 'react';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useConversationStore } from '@/store/conversation';
import { PersonaCard } from '@/components/PersonaCard';
import { MessageBubble } from '@/components/MessageBubble';
import { ConversationCanvas } from '@/components/ConversationCanvas';
import { ConversationControls } from '@/components/ConversationControls';
import { Button } from '@/components/ui/Button';
import { PERSONA_INFO, PersonaType } from '@/lib/perplexity';
import { AutoConversationEngine, ConversationState } from '@/lib/autoConversation';


export default function Home() {
  const [isCardOpen, setIsCardOpen] = useState(false);

  const { data: session, status } = useSession();
  const router = useRouter();
  const { messages, problem, setProblem, addMessage, isLoading, setIsLoading, clearConversation } = useConversationStore();
  const [selectedPersona, setSelectedPersona] = useState<PersonaType | null>(null);
  const [userInput, setUserInput] = useState('');
  const [showProblemInput, setShowProblemInput] = useState(!(problem?.trim()));
  const [showInterruptInput, setShowInterruptInput] = useState(false);
  const [interruptMessage, setInterruptMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
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
  const [viewMode, setViewMode] = useState<'split' | 'chat' | 'canvas'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

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
      
      // Save message to database if conversation exists
      if (currentConversationId) {
        saveMessageToDatabase(fullMessage);
      }
    });

    autoConversationEngine.setStateChangeCallback((state) => {
      setConversationState(state);
    });
  }, [autoConversationEngine, addMessage, currentConversationId]);

  // Auto-scroll to bottom of chat container only (not entire page)
  useEffect(() => {
    if (messagesEndRef.current && chatContainerRef.current) {
      // Only scroll if the chat container is visible
      if (viewMode === 'split' || viewMode === 'chat') {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
    }
  }, [messages, viewMode]);

  // Save message to database
  const saveMessageToDatabase = async (message: any) => {
    if (!currentConversationId) return;
    
    try {
      await fetch(`/api/conversations/${currentConversationId}/messages`, {
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
  };

  // Create new conversation in database
  const createConversation = async (title: string, problemText: string) => {
    if (!(session as any)?.user?.id) return null;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          problem: problemText,
          activePersonas: ['system1', 'system2', 'moderator', 'devilsAdvocate'],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.conversation.id;
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setIsSaving(false);
    }
    return null;
  };

  const handleStartConversation = async () => {
    if (problem?.trim()) {
      // Create conversation in database
      const title = problem.slice(0, 50) + (problem.length > 50 ? '...' : '');
      const conversationId = await createConversation(title, problem);
      
      if (conversationId) {
        setCurrentConversationId(conversationId);
      }
      
      setShowProblemInput(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      content: userInput,
      persona: 'user' as const,
      timestamp: new Date()
    };

    addMessage(userMessage);
    
    // Save to database
    if (currentConversationId) {
      await saveMessageToDatabase(userMessage);
    }
    
    // If auto-conversation is active, interrupt it
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
        
        // Save to database
        if (currentConversationId) {
          await saveMessageToDatabase(aiMessage);
        }
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
      
      // Save to database
      if (currentConversationId) {
        await saveMessageToDatabase(userMessage);
      }
      
      autoConversationEngine.interruptWithUserMessage(userMessage);
      
      setInterruptMessage('');
      setShowInterruptInput(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    // Update auto-conversation speed
    autoConversationEngine.setSpeakingInterval(speed);
  };

  const handleNodeClick = (nodeId: string) => {
    // Find and highlight the message
    const message = messages.find(m => m.id === nodeId);
    if (message) {
      // Could implement message highlighting or navigation
      console.log('Clicked node:', message);
    }
  };

  const handleNewConversation = () => {
    clearConversation();
    setCurrentConversationId(null);
    setShowProblemInput(true);
  };

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <span className="loader"></span>
      </div>
    );
  }

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    return null; // Prevent flash of content before redirect
  }

  if (showProblemInput) {
    return (
      <div className="min-h-screen bg-[#191A1A] ">
        {/* Header with navigation */}
        <div className=" ">
          <div className=" mx-auto px-4 sm:px-6 lg:px-16">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <img src="/mainlogo.png" alt="Logo" className="w-full h-full object-contain rounded-lg" />
              </div>
                <h1 className="text-[24px]  text-white font-raleway">Perspectra</h1>

              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={goToDashboard}
                  variant="outline"
                  className="bg-[#191A1A] border-none hover:border-none hover:bg-[#191A1A]"
                >
                  Dashboard
                </Button>
                
              <div>
                {session?.user?.image ? (
                  <img src={session.user.image} alt="User Image" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                ) : (
                  session?.user?.email
                )}
              </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-16 pt-12">
      
            <h1 className="text-[40px] font-normal text-white mb-4 text-[#757676]">
             What decision/problem would you like to explore
            </h1>
          
          </div>

          {/* Problem Input Card */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#24252D] px-20 py-8 rounded-[15px] border-2 border-[#707070] shadow-2xl relative"> {/* Added relative positioning */}
  <div className="space-y-2 -mx-10">
    <textarea 
      style={{
        outline: 'none',
        boxShadow: 'none',
        border: 'none',
        transition: 'height 0.2s ease-out'
      }}
      value={problem || ''}
      onChange={(e) => {
        setProblem(e.target.value);
        // Auto-resize functionality
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }}
      placeholder="Describe what decision/problem or challenge, We will help in making the best decision for you"
      className="resize-none w-[calc(100%+5rem)] min-h-[100px] px-10 py-8 -mt-8 -ml-10 rounded-xl text-white placeholder-slate-400  overflow-hidden border-none focus:outline-none focus:ring-0 [scrollbar-width:none] [-ms-overflow-style:none]"
    />
  </div>
  
  {/* Button moved to bottom right */}
  <div className="absolute bottom-6 right-6"> {/* Adjust bottom/right values as needed */}
 <Button
  onClick={handleStartConversation}
  disabled={!problem?.trim() || isSaving}
  className="p-2 bg-purple-600 hover:bg-purple-00 text-lg font-semibold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-lg shadow-lg"
>
  {isSaving ? (
    <span className="flex items-center gap-2">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      </svg>
      Creating...
    </span>
  ) : (
    <svg
      width="40"
      height="40"
      viewBox="0 0 59 58"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Removed background rectangle */}
      <path
        d="M19.2625 24.085L38.2625 17.7675C38.6791 17.6322 39.1249 17.6148 39.5508 17.717C39.9766 17.8193 40.3659 18.0373 40.6756 18.347C40.9852 18.6567 41.2033 19.046 41.3055 19.4718C41.4078 19.8977 41.3903 20.3435 41.255 20.76L34.9375 39.76C34.7814 40.2352 34.4792 40.6489 34.074 40.9422C33.6689 41.2355 33.1815 41.3934 32.6813 41.3934C32.1811 41.3934 31.6937 41.2355 31.2886 40.9422C30.8834 40.6489 30.5812 40.2352 30.425 39.76L28.05 32.635C27.934 32.28 27.7359 31.9573 27.4718 31.6932C27.2077 31.4291 26.8851 31.231 26.53 31.115L19.405 28.74C18.8639 28.6486 18.3712 28.3726 18.0105 27.9589C17.6499 27.5452 17.4437 27.0194 17.4269 26.4709C17.4101 25.9224 17.5838 25.3849 17.9184 24.95C18.2531 24.515 18.728 24.2094 19.2625 24.085Z"
        stroke="white"
        strokeWidth="3"
        strokeMiterlimit="10"
      />
      <path
        d="M27.625 31.3761L30.9738 28.0273"
        stroke="white"
        strokeWidth="3"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
    </svg>
  )}
</Button>

  </div>
</div>

  {/* Persona Cards - Clean, Modern Layout */}
<div className="grid grid-cols-4 gap-3 mt-6">
  {[
    {
      name: "Sofia",
      role: "Creative Strategist",
      desc: "Fast, Intuitive, Emotional thinker",
      img: "/char1.png",
    },
    {
      name: "Daniel",
      role: "Tech Evangelist",
      desc: "Slow, deliberate, Analytical thinking",
      img: "/char2.png",
    },
    {
      name: "Alice",
      role: "UX Specialist",
      desc: "Neutral, Facilitator and Synthesizer",
      img: "/char3.png",
    },
    {
      name: "Leo",
      role: "AI Consultant",
      desc: "Challenges assumptions and identifies risks",
      img: "/char3.png",
    },
  ].map((persona, i) => (
    <div key={i} className="bg-[#1c1c1e] border border-white/10 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-2">
        <img src={persona.img} alt={persona.name} className="w-10 h-10 rounded-lg object-cover" />
        <div>
          <h3 className="text-white font-semibold text-sm">{persona.name}</h3>
          <p className="text-xs text-slate-400">{persona.role}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-300 line-clamp-2">{persona.desc}</p>
      
    </div>
  ))}
</div>


</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#24252D]">
      <div className="flex h-screen ">
        {/* Left Sidebar - Controls & Personas */}
        <div className="w-80 bg-black/30 backdrop-blur-lg border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10  rounded-lg flex items-center justify-center ">
                <img src="/mainlogo.png" alt="Perspectra Logo" className='rounded-[10px]' />
              </div>
              <div>
                <h1 className="text-xl font-raleway text-white">Perspectra</h1>
               
              </div>
            </div>
            
            {/* Problem Summary */}
            <div className="bg-[#33333E] rounded-lg p-3 flex items-start gap-3">
  <div className="flex-shrink-0">
    <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="12" fill="#A259FF" />
      <path d="M16 20C16 17.79 17.79 16 20 16H44C46.21 16 48 17.79 48 20V36C48 38.21 46.21 40 44 40H28L20 46V40H20C17.79 40 16 38.21 16 36V20Z" fill="white" />
    </svg>
  </div>

  <div className="flex-1">
    <h3 className="text-[16px] font-poppins text-[#F1F3F7] mb-1">Current Discussion</h3>
    <p className="text-[14px] text-white line-clamp-3">{problem || 'No topic set'}</p>
    <button 
      onClick={() => setShowProblemInput(true)}
      className="text-[13px] text-purple-400 hover:text-blue-300 ml-35 mt-2 transition-colors"
    >
      Change topic
    </button>
  </div>
</div>

          </div>
<div className='overflow-auto max-h-100 scrollbar-white'>
          {/* Conversation Controls */}
          <div className="pl-4 pr-4">
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
    <div className="flex-1 p-4">
  <div className="bg-[#33333E] rounded-[10px] overflow-hidden">
    {/* Header */}
    <div 
      className="text-lg font-semibold text-white flex items-center p-4 justify-between cursor-pointer"
      onClick={() => setIsCardOpen(!isCardOpen)}
    >
      Manual Control
      <button
        className="text-white hover:text-gray-300 text-xl"
        onClick={(e) => {
          e.stopPropagation();
          setIsCardOpen(!isCardOpen);
        }}
      >
        {isCardOpen ? '−' : '+'}
      </button>
    </div>

    {/* Scrollable Grid Content */}
    {isCardOpen && (
      <div className="border-t border-[#464652] " >
        <div className="p-6 grid grid-cols-2 gap-2">
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
    )}
  </div>
<div className="pointer-events-none absolute bottom-28 left-0 right-0 h-10 bg-gradient-to-t from-[#191A1F] to-transparent"></div>

</div>

</div>


          {/* Stats */}
         <div className="fixed bottom-0 w-full p-4 ">
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
        <div className="flex-1 flex flex-col ">
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
                {currentConversationId && (
                  <div className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Saved
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex bg-[#313131] overflow-hidden">
            {/* Chat Section */}
            {(viewMode === 'split' || viewMode === 'chat') && (
              <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col border-r border-white/10 overflow-hidden`}>
                {/* Messages Container - Fixed height with internal scrolling */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-6 space-y-4"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {messages.length === 0 ? (
                    <div className="text-center py-40">
                      <div className="text-6xl mb-4"></div>
                      <h3 className="text-3xl font-semibold text-neutral-300 mb-2">Ready to start the discussion</h3>
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

                {/* Input Area - Fixed at bottom */}
                <div className=" backdrop-blur-lg  p-4 flex-shrink-0">
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
                        className="flex-1 px-4 py-3 bg-[#24252D] border border-[#8D3FD7] rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!userInput.trim()}
                        className="px-3 py-6 bg-[#8F44D9] hover:bg-[#862EDE]  disabled:opacity-50"
                      >
                       <svg
      width="50"
      height="50"
      viewBox="0 0 59 58"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Removed background rectangle */}
      <path
        d="M19.2625 24.085L38.2625 17.7675C38.6791 17.6322 39.1249 17.6148 39.5508 17.717C39.9766 17.8193 40.3659 18.0373 40.6756 18.347C40.9852 18.6567 41.2033 19.046 41.3055 19.4718C41.4078 19.8977 41.3903 20.3435 41.255 20.76L34.9375 39.76C34.7814 40.2352 34.4792 40.6489 34.074 40.9422C33.6689 41.2355 33.1815 41.3934 32.6813 41.3934C32.1811 41.3934 31.6937 41.2355 31.2886 40.9422C30.8834 40.6489 30.5812 40.2352 30.425 39.76L28.05 32.635C27.934 32.28 27.7359 31.9573 27.4718 31.6932C27.2077 31.4291 26.8851 31.231 26.53 31.115L19.405 28.74C18.8639 28.6486 18.3712 28.3726 18.0105 27.9589C17.6499 27.5452 17.4437 27.0194 17.4269 26.4709C17.4101 25.9224 17.5838 25.3849 17.9184 24.95C18.2531 24.515 18.728 24.2094 19.2625 24.085Z"
        stroke="white"
        strokeWidth="3"
        strokeMiterlimit="10"
      />
      <path
        d="M27.625 31.3761L30.9738 28.0273"
        stroke="white"
        strokeWidth="3"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
    </svg>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Canvas Section - Fixed position, no scrolling */}
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
