'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PERSONA_INFO, PersonaType } from '@/lib/perplexity';
import { cn } from '@/lib/utils';

interface PersonaCardProps {
  persona: PersonaType;
  isActive: boolean;
  onClick: () => void;
}

export function PersonaCard({ persona, isActive, onClick }: PersonaCardProps) {
  const info = PERSONA_INFO[persona];

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isActive ? "ring-2 ring-blue-500 shadow-lg" : "opacity-70 hover:opacity-100"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-2xl">{info.name.charAt(0)}</span>
          {info.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">{info.description}</p>
        <div className={cn("w-full h-1 rounded-full mt-3", info.color)} />
      </CardContent>
    </Card>
  );
} 