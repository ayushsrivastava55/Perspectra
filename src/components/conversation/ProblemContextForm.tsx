'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonaType } from '@/lib/perplexity';
import { PersonaCard } from './PersonaCard';

interface ProblemContextFormProps {
  onStartConversation: (data: {
    title: string;
    problem: string;
    context: string;
    urgency: 'low' | 'medium' | 'high';
    activePersonas: PersonaType[];
  }) => void;
}

export function ProblemContextForm({ onStartConversation }: ProblemContextFormProps) {
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [context, setContext] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [activePersonas, setActivePersonas] = useState<PersonaType[]>([
    'system1', 'system2', 'moderator', 'devilsAdvocate'
  ]);

  const togglePersona = (persona: PersonaType) => {
    setActivePersonas(prev => 
      prev.includes(persona)
        ? prev.filter(p => p !== persona)
        : [...prev, persona]
    );
  };

  const handleSubmit = () => {
    if (!title.trim() || !problem.trim()) return;
    
    onStartConversation({
      title: title.trim(),
      problem: problem.trim(),
      context: context.trim(),
      urgency,
      activePersonas,
    });
  };

  const isValid = title.trim() && problem.trim() && activePersonas.length > 0;

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
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Give your discussion a title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Career Change Decision, Investment Strategy, etc."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
            />
          </div>

          {/* Problem Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What decision or problem would you like to explore? *
            </label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Describe your situation, decision, or problem in detail..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {problem.length}/1000 characters
            </p>
          </div>

          {/* Additional Context */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional context (optional)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Any background information, constraints, or specific considerations..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {context.length}/500 characters
            </p>
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How urgent is this decision?
            </label>
            <div className="flex gap-4">
              {[
                { value: 'low', label: 'Low - I have plenty of time', color: 'bg-green-100 text-green-800' },
                { value: 'medium', label: 'Medium - Moderate timeline', color: 'bg-yellow-100 text-yellow-800' },
                { value: 'high', label: 'High - Time-sensitive', color: 'bg-red-100 text-red-800' },
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setUrgency(value as 'low' | 'medium' | 'high')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    urgency === value
                      ? `border-blue-500 ${color}`
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Persona Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select your advisory panel: *
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
            <p className="text-xs text-gray-500 mt-2">
              Select at least one persona to start the discussion
            </p>
          </div>

          {/* Start Button */}
          <div className="text-center pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!isValid}
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