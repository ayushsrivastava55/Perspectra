'use client';

import { useEffect } from 'react';
import { useConversationStore } from '@/store/conversation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface ConversationHistoryProps {
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

export function ConversationHistory({ onSelectConversation, onNewConversation }: ConversationHistoryProps) {
  const {
    conversations,
    isLoadingConversations,
    loadConversations,
    deleteConversation,
  } = useConversationStore();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        await deleteConversation(conversationId);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoadingConversations) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading conversations...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold text-gray-800">
              📚 Conversation History
            </CardTitle>
            <Button onClick={onNewConversation} className="px-6">
              New Discussion
            </Button>
          </div>
          <p className="text-gray-600">
            Continue a previous discussion or start a new one
          </p>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏛️</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No conversations yet
              </h3>
              <p className="text-gray-600 mb-6">
                Start your first boardroom discussion to see it here
              </p>
              <Button onClick={onNewConversation} size="lg">
                Start Your First Discussion
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer"
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {conversation.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(conversation.status)}`}>
                        {conversation.status.toLowerCase()}
                      </span>
                      <button
                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete conversation"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {conversation.problem}
                  </p>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>
                        💬 {conversation.totalMessages} messages
                      </span>
                      <span>
                        👥 {conversation.activePersonas.length} personas
                      </span>
                    </div>
                    <span>
                      {formatDistanceToNow(conversation.updatedAt, { addSuffix: true })}
                    </span>
                  </div>
                  
                  {conversation.activePersonas.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {conversation.activePersonas.map((persona) => (
                        <span
                          key={persona}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                        >
                          {persona}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 