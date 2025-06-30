'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Message } from '@/store/conversation';
import { PERSONA_INFO } from '@/lib/perplexity';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  NodeTypes,
  EdgeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface DecisionInsight {
  id: string;
  message: Message;
  type: 'factor' | 'option' | 'risk' | 'benefit' | 'constraint' | 'outcome';
  impact: number; // 1-10
  confidence: number; // 1-10
  category: string;
  weight: number; // 1-5
  connections: string[];
  aiAnalysis?: string;
  position: { x: number; y: number };
}

interface AIAnalysisResult {
  summary: string;
  insights: Array<{
    type: string;
    content: string;
    confidence: number;
    impact: number;
  }>;
  recommendations: string[];
  consensus: {
    agreements: string[];
    disagreements: string[];
    uncertainties: string[];
  };
}

interface CanvasMode {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface ConversationCanvasProps {
  messages: Message[];
  isAutoConversing: boolean;
  onNodeClick: (nodeId: string) => void;
}

const CANVAS_MODES: CanvasMode[] = [
  { id: 'summary-view', name: 'Summary', description: 'Clear overview with key takeaways and recommendations', icon: '📋' },
  { id: 'pros-cons', name: 'Pros & Cons', description: 'Simple comparison of positive and negative points', icon: '⚖️' },
  { id: 'decision-tree', name: 'Decision Path', description: 'Step-by-step decision guidance', icon: '🛤️' },
  { id: 'consensus-view', name: 'Agreement', description: 'What everyone agrees and disagrees on', icon: '🤝' },
  { id: 'next-steps', name: 'Action Plan', description: 'Clear next steps and recommendations', icon: '✅' }
];

// Custom Node Components
const InsightNode = ({ data }: { data: any }) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'risk': return 'bg-red-50 border-red-200 text-red-900';
      case 'benefit': return 'bg-green-50 border-green-200 text-green-900';
      case 'option': return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'factor': return 'bg-purple-50 border-purple-200 text-purple-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'risk': return '⚠️';
      case 'benefit': return '✅';
      case 'option': return '💡';
      case 'factor': return '🔍';
      default: return '💭';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'risk': return 'Concern';
      case 'benefit': return 'Benefit';
      case 'option': return 'Option';
      case 'factor': return 'Factor';
      default: return 'Insight';
    }
  };

  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[250px] max-w-[350px] ${getNodeColor(data.type)} cursor-pointer hover:shadow-lg transition-all shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTypeIcon(data.type)}</span>
          <span className="text-sm font-semibold">{getTypeLabel(data.type)}</span>
        </div>
        {!data.simplified && (
          <div className="flex gap-1">
            <span className="text-xs bg-white/70 px-2 py-1 rounded-full font-medium">
              Impact: {data.impact}/10
            </span>
          </div>
        )}
      </div>
      
      <div className="text-sm font-medium mb-2 text-gray-600">
        {PERSONA_INFO[data.persona as keyof typeof PERSONA_INFO]?.name || data.persona}
      </div>
      
      <div className="text-sm leading-relaxed">
        {data.simplified ? data.content.slice(0, 120) + '...' : data.content}
      </div>
      
      {data.aiAnalysis && (
        <div className="mt-3 text-xs bg-white/80 p-2 rounded-lg border border-white/50">
          <div className="flex items-center gap-1 mb-1">
            <span>🤖</span>
            <strong>AI Insight:</strong>
          </div>
          <div>{data.aiAnalysis.slice(0, 100)}...</div>
        </div>
      )}
    </div>
  );
};

const DecisionNode = ({ data }: { data: any }) => {
  if (data.question) {
    return (
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-6 rounded-2xl shadow-xl min-w-[300px] text-center">
        <div className="text-2xl mb-2">🤔</div>
        <div className="text-xl font-bold mb-2">{data.label}</div>
        <div className="text-sm opacity-90">Consider the points below to decide</div>
      </div>
    );
  }

  if (data.stepNumber) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4 rounded-xl shadow-lg min-w-[250px]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
            {data.stepNumber}
          </div>
          <div className="text-lg font-bold">{data.label}</div>
        </div>
        <div className="text-sm opacity-90 leading-relaxed">
          {data.description}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4 rounded-xl shadow-lg min-w-[280px]">
      <div className="text-lg font-bold mb-3">{data.label}</div>
      
      {data.summary && (
        <div className="text-sm opacity-90 mb-3 leading-relaxed">
          {data.summary}
        </div>
      )}
      
      {data.stats && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-white/20 px-2 py-1 rounded text-center">
            <div className="font-semibold">{data.stats.benefits}</div>
            <div>Benefits</div>
          </div>
          <div className="bg-white/20 px-2 py-1 rounded text-center">
            <div className="font-semibold">{data.stats.concerns}</div>
            <div>Concerns</div>
          </div>
          <div className="bg-white/20 px-2 py-1 rounded text-center">
            <div className="font-semibold">{data.stats.factors}</div>
            <div>Factors</div>
          </div>
        </div>
      )}
      
      {data.options && (
        <div className="space-y-1 mt-3">
          {data.options.slice(0, 3).map((option: any, idx: number) => (
            <div key={idx} className="text-sm bg-white/20 px-3 py-2 rounded">
              {option.label} (Score: {option.score})
            </div>
          ))}
        </div>
      )}
      
      {data.aiRecommendation && (
        <div className="mt-3 text-xs bg-white/30 p-3 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <span>🤖</span>
            <strong>AI Recommendation:</strong>
          </div>
          <div>{data.aiRecommendation.slice(0, 150)}...</div>
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  insight: InsightNode,
  decision: DecisionNode,
};

export function ConversationCanvas({ messages, isAutoConversing, onNodeClick }: ConversationCanvasProps) {
  const [currentMode, setCurrentMode] = useState<string>('decision-flow');
  const [insights, setInsights] = useState<DecisionInsight[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [modalInsight, setModalInsight] = useState<DecisionInsight | null>(null);
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Enhanced AI analysis using Perplexity API
  const generateAIAnalysis = async (messages: Message[]): Promise<AIAnalysisResult | null> => {
    if (messages.length === 0) return null;
    
    try {
      setIsAnalyzing(true);
      
      const conversationContext = messages.map(m => `${m.persona}: ${m.content}`).join('\n\n');
      
      const prompt = `Analyze this decision-making conversation and provide a structured analysis in JSON format:

{
  "summary": "Brief summary of the main decision/problem",
  "insights": [
    {
      "type": "risk|benefit|option|constraint|factor",
      "content": "Key insight text",
      "confidence": 1-10,
      "impact": 1-10
    }
  ],
  "recommendations": ["Specific actionable recommendations"],
  "consensus": {
    "agreements": ["Points where personas agree"],
    "disagreements": ["Points of disagreement"],
    "uncertainties": ["Areas needing more information"]
  }
}

Conversation:
${conversationContext}

Provide only valid JSON, no additional text.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          persona: 'moderator',
          problem: 'Analysis request'
        })
      });

      if (response.ok) {
        const data = await response.json();
        try {
          // Try to parse the response as JSON
          const analysisResult = JSON.parse(data.response || '{}');
          return analysisResult;
        } catch (parseError) {
          // If JSON parsing fails, create a structured response from the text
          return {
            summary: data.response?.slice(0, 200) || 'Analysis completed',
            insights: [],
            recommendations: [data.response?.slice(0, 100) || 'See full analysis'],
            consensus: {
              agreements: [],
              disagreements: [],
              uncertainties: []
            }
          };
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
    return null;
  };

  // Enhanced insight extraction with better categorization
  const extractInsights = useCallback((messages: Message[]): DecisionInsight[] => {
    return messages.map((message, index) => {
      const content = message.content.toLowerCase();
      
      // Much more nuanced categorization
      let type: DecisionInsight['type'] = 'factor';
      let impact = 5;
      let confidence = 5;
      let weight = 3;
      let category = 'general';

      // Better keyword analysis - less aggressive risk detection
      if (content.includes('advantage') || content.includes('benefit') || content.includes('positive') || 
          content.includes('good') || content.includes('helpful') || content.includes('useful')) {
        type = 'benefit';
        impact = 7;
        confidence = 6;
        weight = 4;
        category = 'benefits';
      } else if (content.includes('problem') || content.includes('concern') || content.includes('negative') || 
                 content.includes('bad') || content.includes('harmful') || content.includes('dangerous')) {
        type = 'risk';
        impact = 7;
        confidence = 6;
        weight = 4;
        category = 'concerns';
      } else if (content.includes('could') || content.includes('might') || content.includes('option') || 
                 content.includes('alternative') || content.includes('approach')) {
        type = 'option';
        impact = 6;
        weight = 4;
        category = 'options';
      } else if (content.includes('important') || content.includes('key') || content.includes('factor') || 
                 content.includes('consider')) {
        type = 'factor';
        impact = 6;
        confidence = 7;
        weight = 4;
        category = 'considerations';
      } else {
        // Default to factor for neutral statements
        type = 'factor';
        impact = 5;
        confidence = 6;
        weight = 3;
        category = 'insights';
      }

      // Adjust based on persona - some are more optimistic/pessimistic
      if (message.persona === 'devilsAdvocate' && type !== 'risk') {
        type = 'risk';
        category = 'concerns';
      } else if (message.persona === 'system1' && content.includes('feel') || content.includes('think')) {
        confidence = Math.max(1, confidence - 1);
      }

      return {
        id: message.id,
        message,
        type,
        impact,
        confidence,
        category,
        weight,
        connections: [],
        position: { x: (index % 4) * 300 + 100, y: Math.floor(index / 4) * 200 + 100 }
      };
    });
  }, []);

  // Generate React Flow nodes and edges based on current mode
  const generateFlowData = useCallback(() => {
    const currentInsights = insights;
    
    switch (currentMode) {
      case 'summary-view':
        return generateSummaryViewData(currentInsights);
      case 'pros-cons':
        return generateProsConsData(currentInsights);
      case 'decision-tree':
        return generateDecisionTreeData(currentInsights);
      case 'consensus-view':
        return generateConsensusViewData(currentInsights);
      case 'next-steps':
        return generateNextStepsData(currentInsights);
      default:
        return { nodes: [], edges: [] };
    }
  }, [currentMode, insights, aiAnalysis]);

  const generateSummaryViewData = (insights: DecisionInsight[]) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Main summary node
    const benefits = insights.filter(i => i.type === 'benefit');
    const risks = insights.filter(i => i.type === 'risk');
    const factors = insights.filter(i => i.type === 'factor');

    nodes.push({
      id: 'main-summary',
      type: 'decision',
      position: { x: 400, y: 100 },
      data: {
        label: 'Decision Summary',
        summary: aiAnalysis?.summary || `Discussing: ${insights[0]?.message.content.slice(0, 50)}...`,
        stats: {
          benefits: benefits.length,
          concerns: risks.length,
          factors: factors.length
        }
      }
    });

    // Key takeaways
    const keyInsights = insights
      .sort((a, b) => (b.impact * b.confidence) - (a.impact * a.confidence))
      .slice(0, 4);

    keyInsights.forEach((insight, index) => {
      const angle = (index / keyInsights.length) * 2 * Math.PI;
      const radius = 200;
      const x = 400 + Math.cos(angle) * radius;
      const y = 300 + Math.sin(angle) * radius;

      nodes.push({
        id: insight.id,
        type: 'insight',
        position: { x, y },
        data: {
          ...insight,
          content: insight.message.content,
          persona: insight.message.persona,
          simplified: true
        }
      });

      edges.push({
        id: `summary-${insight.id}`,
        source: 'main-summary',
        target: insight.id,
        type: 'smoothstep',
        style: { stroke: '#6366f1', strokeWidth: 2 }
      });
    });

    return { nodes, edges };
  };

  const generateProsConsData = (insights: DecisionInsight[]) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const benefits = insights.filter(i => i.type === 'benefit');
    const risks = insights.filter(i => i.type === 'risk');

    // Pros header
    nodes.push({
      id: 'pros-header',
      position: { x: 200, y: 50 },
      data: { 
        label: `✅ PROS (${benefits.length})`,
        type: 'header',
        color: 'green'
      },
      style: {
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: 'white',
        padding: '16px',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: 'bold',
        minWidth: '200px',
        textAlign: 'center'
      }
    });

    // Cons header
    nodes.push({
      id: 'cons-header',
      position: { x: 600, y: 50 },
      data: { 
        label: `❌ CONS (${risks.length})`,
        type: 'header',
        color: 'red'
      },
      style: {
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: 'white',
        padding: '16px',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: 'bold',
        minWidth: '200px',
        textAlign: 'center'
      }
    });

    // Add benefit nodes
    benefits.forEach((benefit, index) => {
      nodes.push({
        id: benefit.id,
        type: 'insight',
        position: { x: 150, y: 150 + index * 100 },
        data: {
          ...benefit,
          content: benefit.message.content,
          persona: benefit.message.persona,
          simplified: true
        }
      });

      edges.push({
        id: `pros-${benefit.id}`,
        source: 'pros-header',
        target: benefit.id,
        type: 'straight',
        style: { stroke: '#10b981', strokeWidth: 2 }
      });
    });

    // Add risk nodes
    risks.forEach((risk, index) => {
      nodes.push({
        id: risk.id,
        type: 'insight',
        position: { x: 550, y: 150 + index * 100 },
        data: {
          ...risk,
          content: risk.message.content,
          persona: risk.message.persona,
          simplified: true
        }
      });

      edges.push({
        id: `cons-${risk.id}`,
        source: 'cons-header',
        target: risk.id,
        type: 'straight',
        style: { stroke: '#ef4444', strokeWidth: 2 }
      });
    });

    return { nodes, edges };
  };

  const generateDecisionTreeData = (insights: DecisionInsight[]) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Decision question
    nodes.push({
      id: 'decision-question',
      type: 'decision',
      position: { x: 400, y: 50 },
      data: {
        label: 'Should you proceed?',
        question: true
      }
    });

    // Yes path
    nodes.push({
      id: 'yes-path',
      position: { x: 200, y: 200 },
      data: { label: '✅ YES', type: 'decision-option' },
      style: {
        background: '#10b981',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        fontWeight: 'bold'
      }
    });

    // No path
    nodes.push({
      id: 'no-path',
      position: { x: 600, y: 200 },
      data: { label: '❌ NO', type: 'decision-option' },
      style: {
        background: '#ef4444',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        fontWeight: 'bold'
      }
    });

    edges.push(
      {
        id: 'to-yes',
        source: 'decision-question',
        target: 'yes-path',
        type: 'smoothstep',
        style: { stroke: '#10b981', strokeWidth: 3 }
      },
      {
        id: 'to-no',
        source: 'decision-question',
        target: 'no-path',
        type: 'smoothstep',
        style: { stroke: '#ef4444', strokeWidth: 3 }
      }
    );

    // Add supporting reasons
    const benefits = insights.filter(i => i.type === 'benefit').slice(0, 3);
    const risks = insights.filter(i => i.type === 'risk').slice(0, 3);

    benefits.forEach((benefit, index) => {
      nodes.push({
        id: `yes-reason-${benefit.id}`,
        type: 'insight',
        position: { x: 100, y: 300 + index * 80 },
        data: {
          ...benefit,
          content: benefit.message.content.slice(0, 100) + '...',
          persona: benefit.message.persona,
          simplified: true
        }
      });

      edges.push({
        id: `yes-support-${benefit.id}`,
        source: 'yes-path',
        target: `yes-reason-${benefit.id}`,
        type: 'straight',
        style: { stroke: '#10b981', strokeDasharray: '5,5' }
      });
    });

    risks.forEach((risk, index) => {
      nodes.push({
        id: `no-reason-${risk.id}`,
        type: 'insight',
        position: { x: 500, y: 300 + index * 80 },
        data: {
          ...risk,
          content: risk.message.content.slice(0, 100) + '...',
          persona: risk.message.persona,
          simplified: true
        }
      });

      edges.push({
        id: `no-support-${risk.id}`,
        source: 'no-path',
        target: `no-reason-${risk.id}`,
        type: 'straight',
        style: { stroke: '#ef4444', strokeDasharray: '5,5' }
      });
    });

    return { nodes, edges };
  };

  const generateConsensusViewData = (insights: DecisionInsight[]) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Analyze consensus
    const personaViews = insights.reduce((acc, insight) => {
      if (!acc[insight.message.persona]) {
        acc[insight.message.persona] = { benefits: 0, risks: 0, factors: 0 };
      }
      acc[insight.message.persona][insight.type === 'benefit' ? 'benefits' : 
                                   insight.type === 'risk' ? 'risks' : 'factors']++;
      return acc;
    }, {} as Record<string, any>);

    // Agreement node
    nodes.push({
      id: 'agreement-center',
      position: { x: 400, y: 200 },
      data: { 
        label: 'Consensus Analysis',
        type: 'consensus'
      },
      style: {
        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        color: 'white',
        padding: '20px',
        borderRadius: '50%',
        width: '150px',
        height: '150px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold'
      }
    });

    // Persona positions around center
    Object.entries(personaViews).forEach(([persona, views], index) => {
      const angle = (index / Object.keys(personaViews).length) * 2 * Math.PI;
      const radius = 200;
      const x = 400 + Math.cos(angle) * radius;
      const y = 200 + Math.sin(angle) * radius;

      const personaInfo = PERSONA_INFO[persona as keyof typeof PERSONA_INFO];
      const isPositive = views.benefits > views.risks;

      nodes.push({
        id: `persona-${persona}`,
        position: { x, y },
        data: {
          label: personaInfo?.name || persona,
          icon: personaInfo?.name?.charAt(0) || '🤖',
          stance: isPositive ? 'Positive' : 'Cautious',
          views
        },
        style: {
          background: isPositive ? '#10b981' : '#f59e0b',
          color: 'white',
          padding: '12px',
          borderRadius: '12px',
          textAlign: 'center',
          minWidth: '120px'
        }
      });

      edges.push({
        id: `consensus-${persona}`,
        source: 'agreement-center',
        target: `persona-${persona}`,
        type: 'smoothstep',
        style: { 
          stroke: isPositive ? '#10b981' : '#f59e0b',
          strokeWidth: 2
        }
      });
    });

    return { nodes, edges };
  };

  const generateNextStepsData = (insights: DecisionInsight[]) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const recommendations = aiAnalysis?.recommendations || [
      'Gather more information',
      'Consider the main benefits and risks',
      'Make a decision based on your priorities'
    ];

    // Action steps
    recommendations.forEach((rec, index) => {
      nodes.push({
        id: `step-${index}`,
        type: 'decision',
        position: { x: 100 + index * 250, y: 200 },
        data: {
          label: `Step ${index + 1}`,
          description: rec,
          stepNumber: index + 1
        }
      });

      if (index > 0) {
        edges.push({
          id: `step-flow-${index}`,
          source: `step-${index - 1}`,
          target: `step-${index}`,
          type: 'smoothstep',
          style: { stroke: '#6366f1', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
        });
      }
    });

    // Add key considerations below
    const keyInsights = insights
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3);

    keyInsights.forEach((insight, index) => {
      nodes.push({
        id: `consideration-${insight.id}`,
        type: 'insight',
        position: { x: 200 + index * 200, y: 400 },
        data: {
          ...insight,
          content: `Key: ${insight.message.content.slice(0, 80)}...`,
          persona: insight.message.persona,
          simplified: true
        }
      });
    });

    return { nodes, edges };
  };

  // Update insights when messages change
  useEffect(() => {
    const newInsights = extractInsights(messages);
    setInsights(newInsights);
  }, [messages, extractInsights]);

  // Generate AI analysis when insights change
  useEffect(() => {
    if (messages.length > 0) {
      generateAIAnalysis(messages).then(setAiAnalysis);
    }
  }, [messages]);

  // Update React Flow data when mode or insights change
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = generateFlowData();
    setNodes(newNodes);
    setEdges(newEdges);
  }, [generateFlowData]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClickHandler = useCallback((event: React.MouseEvent, node: Node) => {
    const insight = insights.find(i => i.id === node.id);
    if (insight) {
      setModalInsight(insight);
      onNodeClick(node.id);
    }
  }, [insights, onNodeClick]);

  // Modal component for detailed insight view
  const InsightModal = ({ insight, onClose }: { insight: DecisionInsight; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Insight Analysis</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Message Content</h3>
              <p className="text-gray-700">{insight.message.content}</p>
              <div className="mt-2 text-sm text-gray-500">
                From: {insight.message.persona} • {insight.message.timestamp.toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-900">Impact Score</h4>
                <div className="text-2xl font-bold text-blue-600">{insight.impact}/10</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <h4 className="font-medium text-green-900">Confidence</h4>
                <div className="text-2xl font-bold text-green-600">{insight.confidence}/10</div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Type & Category</h4>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded text-sm">
                  {insight.type}
                </span>
                <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm">
                  {insight.category}
                </span>
              </div>
            </div>

            {insight.aiAnalysis && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">AI Analysis</h4>
                <p className="text-yellow-800">{insight.aiAnalysis}</p>
              </div>
            )}

            {aiAnalysis?.recommendations && (
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h4 className="font-medium text-indigo-900 mb-2">Related Recommendations</h4>
                <ul className="list-disc list-inside text-indigo-800 space-y-1">
                  {aiAnalysis.recommendations.slice(0, 3).map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mode Selector */}
      <div className="flex-shrink-0 p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Decision Canvas</h3>
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-sm">AI Analyzing...</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CANVAS_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setCurrentMode(mode.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentMode === mode.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span className="mr-2">{mode.icon}</span>
              {mode.name}
            </button>
          ))}
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          {CANVAS_MODES.find(m => m.id === currentMode)?.description}
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClickHandler}
          nodeTypes={nodeTypes}
          fitView
          className="bg-transparent"
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls className="bg-white/80 backdrop-blur-sm" />
          <MiniMap 
            className="bg-white/80 backdrop-blur-sm" 
            nodeColor={(node) => {
              switch (node.data?.type) {
                case 'risk': return '#ef4444';
                case 'benefit': return '#10b981';
                case 'option': return '#3b82f6';
                case 'constraint': return '#f59e0b';
                case 'outcome': return '#8b5cf6';
                default: return '#6b7280';
              }
            }}
          />
          
          <Panel position="top-right" className="bg-white/90 backdrop-blur-sm rounded-lg p-3 m-4">
            <div className="text-sm space-y-1">
              <div className="font-semibold text-gray-900">Canvas Stats</div>
              <div className="text-gray-600">Insights: {insights.length}</div>
              <div className="text-gray-600">Nodes: {nodes.length}</div>
              <div className="text-gray-600">Connections: {edges.length}</div>
              {aiAnalysis && (
                <div className="text-green-600 font-medium">✓ AI Analysis Complete</div>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Insight Modal */}
      {modalInsight && (
        <InsightModal
          insight={modalInsight}
          onClose={() => setModalInsight(null)}
        />
      )}
    </div>
  );
} 