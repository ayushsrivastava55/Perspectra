'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Conversation {
  id: string;
  title: string;
  problem: string;
  createdAt: string;
  updatedAt: string;
  totalMessages: number;
  status: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchConversations();
    }
  }, [status, router]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = () => {
    router.push('/');
  };

  const openConversation = (id: string) => {
    router.push(`/conversation/${id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Perspectra Dashboard</h1>
              <p className="text-slate-300">Welcome back, {session?.user?.name || session?.user?.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={createNewConversation}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                New Conversation
              </Button>
              <Button
                onClick={() => signOut()}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Your Conversations</h2>
          
          {conversations.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">🤔</div>
              <h3 className="text-xl font-semibold text-white mb-2">No conversations yet</h3>
              <p className="text-slate-300 mb-6">Start your first AI-powered decision-making session</p>
              <Button
                onClick={createNewConversation}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                Start Your First Conversation
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => openConversation(conversation.id)}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/15 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                      {conversation.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      conversation.status === 'ACTIVE' 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-slate-500/20 text-slate-300'
                    }`}>
                      {conversation.status}
                    </span>
                  </div>
                  
                  <p className="text-slate-300 text-sm mb-4 line-clamp-2">
                    {conversation.problem}
                  </p>
                  
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>{conversation.totalMessages} messages</span>
                    <span>{formatDate(conversation.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {conversations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-2xl font-bold text-white">{conversations.length}</div>
              <div className="text-slate-300">Total Conversations</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-2xl font-bold text-white">
                {conversations.reduce((sum, conv) => sum + conv.totalMessages, 0)}
              </div>
              <div className="text-slate-300">Total Messages</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-2xl font-bold text-white">
                {conversations.filter(conv => conv.status === 'ACTIVE').length}
              </div>
              <div className="text-slate-300">Active Conversations</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 