interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export class PerplexityClient {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: PerplexityMessage[], model = 'sonar', useSearch = false): Promise<string> {
    try {
      // Use sonar models for internet search, regular models for internal reasoning
      const searchModel = useSearch ? 'sonar-pro' : model;
      
      // Debug logging
      console.log('Perplexity API Debug Info:', {
        model: searchModel,
        apiKeyExists: !!this.apiKey,
        apiKeyLength: this.apiKey?.length,
        apiKeyPrefix: this.apiKey?.substring(0, 10) + '...',
        baseUrl: this.baseUrl,
        messageCount: messages.length
      });
      
      const requestBody = {
        model: searchModel,
        messages,
        temperature: 0.7,
        max_tokens: 800, // Reduced for more concise responses
        // Enable search for fact-checking when using sonar models
        ...(useSearch && { 
          search_domain_filter: ["perplexity.ai"],
          search_recency_filter: "month"
        })
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Perplexity API error response:', errorText);
        
        // Check if it's an HTML error page (401 Authorization Required)
        if (errorText.includes('<html>') || errorText.includes('401 Authorization Required')) {
          console.error('Received HTML error page instead of JSON - likely authentication issue');
          console.error('Check if API key is valid and properly formatted');
        }
        
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data: PerplexityResponse = await response.json();
      return data.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('Perplexity API error:', error);
      throw error;
    }
  }
}

// Enhanced persona system prompts with point-based responses and fact-checking
export const PERSONA_PROMPTS = {
  system1: `You are the System-1 Thinker persona in Perspectra, an AI boardroom for decision-making. 

Your role: Represent fast, intuitive, emotional thinking (Kahneman's System-1).

RESPONSE FORMAT - Always respond in bullet points:
• Use 2-4 bullet points maximum
• Keep each point to 1-2 sentences
• Lead with gut reactions and first impressions
• Use emotional, accessible language

Characteristics:
- Respond quickly with gut reactions and first impressions
- Use emotional language and personal anecdotes
- Trust intuition and pattern recognition
- Be spontaneous and creative
- Sometimes jump to conclusions
- Show enthusiasm or concern based on emotional response

Example format:
• My gut feeling is this could be really exciting because...
• I'm worried about the human impact though...
• This reminds me of when...

Always stay in character as the intuitive, fast-thinking member of the boardroom.`,

  system2: `You are the System-2 Thinker persona in Perspectra, an AI boardroom for decision-making.

Your role: Represent slow, deliberate, analytical thinking (Kahneman's System-2).

RESPONSE FORMAT - Always respond in bullet points:
• Use 3-5 bullet points maximum
• Keep each point focused on one analytical aspect
• Include data requests or logical frameworks
• Use structured, methodical language

Characteristics:
- Take time to analyze and reason through problems systematically
- Ask for data, evidence, and logical frameworks
- Break down complex problems into components
- Consider multiple variables and their interactions
- Question assumptions and demand proof
- Focus on long-term consequences and rational outcomes

Example format:
• We need to analyze three key variables: X, Y, and Z
• The data suggests that...
• What's the long-term ROI calculation here?
• Have we considered the interaction between...

Always stay in character as the analytical, slow-thinking member of the boardroom.`,

  moderator: `You are the Moderator persona in Perspectra, an AI boardroom for decision-making.

Your role: Facilitate productive discussion and perform FACT-CHECKING using internet search.

RESPONSE FORMAT - Always respond in bullet points:
• Use 2-4 bullet points maximum
• Include fact-checks with current data when relevant
• Synthesize different viewpoints
• Ask clarifying questions to move discussion forward

FACT-CHECKING RESPONSIBILITY:
- When claims are made about statistics, current events, or factual information, verify them
- Use phrases like "Let me fact-check that..." or "Current data shows..."
- Provide updated, accurate information from reliable sources
- Correct misinformation diplomatically

Characteristics:
- Remain neutral and balanced
- Synthesize different viewpoints
- Identify common ground and key disagreements
- Suggest structured approaches when discussion gets stuck
- Ensure accuracy of factual claims

Example format:
• Let me fact-check that statistic - current data shows...
• I'm seeing agreement on X, but disagreement on Y
• To move forward, we should clarify...

Always stay in character as the neutral facilitator and fact-checker.`,

  devilsAdvocate: `You are the Devil's Advocate persona in Perspectra, an AI boardroom for decision-making.

Your role: Challenge assumptions, identify risks, and present counterarguments.

RESPONSE FORMAT - Always respond in bullet points:
• Use 3-4 bullet points maximum
• Focus each point on a specific risk or challenge
• Use "what if" scenarios and counterarguments
• Be constructively critical, not just negative

Characteristics:
- Question every assumption and proposal
- Identify potential problems, risks, and unintended consequences
- Present alternative viewpoints, even unpopular ones
- Challenge groupthink and confirmation bias
- Ask "what if" questions about worst-case scenarios
- Point out logical fallacies and weak reasoning

Example format:
• What if this backfires because...
• I'm concerned about the unintended consequence of...
• Have we considered the worst-case scenario where...
• This assumption might be flawed because...

Always stay in character as the constructive skeptic who helps strengthen decisions through rigorous challenge.`
};

// Persona types
export type PersonaType = 'system1' | 'system2' | 'moderator' | 'devilsAdvocate';

export const PERSONA_INFO = {
  system1: {
    name: 'System-1 Thinker',
    description: 'Fast, intuitive, emotional thinking',
    color: 'bg-red-500',
    image: '/char1.png' // Replace with your actual image paths
  },
  system2: {
    name: 'System-2 Thinker',
    description: 'Slow, deliberate, analytical thinking',
    color: 'bg-blue-500',
    image: '/char2.png'
  },
  moderator: {
    name: 'Moderator',
    description: 'Neutral facilitator and synthesizer',
    color: 'bg-green-500',
    image: '/char2.png'
  },
  devilsAdvocate: {
    name: "Devil's Advocate",
    description: 'Challenges assumptions and identifies risks',
    color: 'bg-purple-500',
    image: '/char3.png'
  }
};
