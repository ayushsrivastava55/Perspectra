'use client';

import { useState, useRef, useEffect } from 'react';
import { useConversationStore } from '@/store/conversation';
import { PersonaType, PERSONA_INFO } from '@/lib/perplexity';
import { MessageBubble } from './MessageBubble';
import { PersonaCard } from './PersonaCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ConversationInterface() {
  const {
    messages,
    currentConversation,
    problem,
    isConversationActive,
    addMessage,
    updateMessage,
    createConversation,
    endConversation,
    clearConversation,
  } = useConversationStore();

  const [inputMessage, setInputMessage] = useState('');
  const [problemInput, setProblemInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePersonas, setActivePersonas] = useState<PersonaType[]>(['system1', 'system2', 'moderator', 'devilsAdvocate']);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartConversation = async () => {
    if (!problemInput.trim()) return;
    
    try {
      await createConversation({
        title: problemInput.slice(0, 50) + (problemInput.length > 50 ? '...' : ''),
        problem: problemInput,
        activePersonas,
      });

      // Trigger initial responses from active personas
      generatePersonaResponses();
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isGenerating) return;

    addMessage({
      content: inputMessage,
      persona: 'user',
    });

    setInputMessage('');
    generatePersonaResponses();
  };

  const generatePersonaResponses = async () => {
    setIsGenerating(true);

    // Generate responses from each active persona
    for (const persona of activePersonas) {
      // Add loading message
      const loadingMessage = {
        content: '',
        persona,
        isLoading: true,
      };
      
      addMessage(loadingMessage);
      
      // Get the ID of the message we just added
      const currentMessages = useConversationStore.getState().messages;
      const loadingMessageId = currentMessages[currentMessages.length - 1].id;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messages,
            persona,
            problem: problem || problemInput,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Update the loading message with the actual response
          updateMessage(loadingMessageId, {
            content: data.response,
            isLoading: false,
          });
        } else {
          updateMessage(loadingMessageId, {
            content: 'Sorry, I encountered an error generating a response.',
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Error generating response:', error);
        updateMessage(loadingMessageId, {
          content: 'Sorry, I encountered an error generating a response.',
          isLoading: false,
        });
      }

      // Add a small delay between persona responses
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsGenerating(false);
  };

  const togglePersona = (persona: PersonaType) => {
    const newActivePersonas = activePersonas.includes(persona)
      ? activePersonas.filter(p => p !== persona)
      : [...activePersonas, persona];
    setActivePersonas(newActivePersonas);
  };

  if (!isConversationActive) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-3xl font-bold text-gray-800">
              🏛️ Welcome to Perspectra
            </CardTitle>
            <p className="text-center text-gray-600 mt-2">
              Your AI-powered boardroom for better decision-making
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Problem Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What decision or problem would you like to explore?
              </label>
              <textarea
                value={problemInput}
                onChange={(e) => setProblemInput(e.target.value)}
                placeholder="Describe your situation, decision, or problem..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            {/* Persona Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select your advisory panel:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['system1', 'system2', 'moderator', 'devilsAdvocate'] as PersonaType[]).map((persona) => (
                  <PersonaCard
                    key={persona}
                    persona={persona}
                    isActive={activePersonas.includes(persona)}
                    onClick={() => togglePersona(persona)}
                  />
                ))}
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center">
              <Button
                onClick={handleStartConversation}
                disabled={!problemInput.trim() || activePersonas.length === 0}
                size="lg"
                className="px-8"
              >
                Start Boardroom Discussion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar with active personas */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Personas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activePersonas.map((persona) => (
                <PersonaCard
                  key={persona}
                  persona={persona}
                  isActive={true}
                  onClick={() => {}} // No toggle in active conversation
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={endConversation}
                className="w-full"
              >
                End Discussion
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={clearConversation}
                className="w-full"
              >
                Clear All
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main conversation area */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">
                Discussion: {problem || currentConversation?.title}
              </CardTitle>
            </CardHeader>
            
            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>

            {/* Input area */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Add your thoughts or ask a question..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isGenerating}
                  className="self-end"
                >
                  {isGenerating ? 'Generating...' : 'Send'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 