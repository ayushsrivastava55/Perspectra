# Perspectra - AI-Powered Boardroom for One

Welcome to Perspectra, your personal AI advisory panel for better decision-making! This is the Phase 1 MVP featuring four distinct AI personas powered by Perplexity AI.

## 🎯 What is Perspectra?

Perspectra is the next big thing
Perspectra creates a virtual "boardroom for one" where you can discuss decisions and problems with AI personas representing different cognitive styles:

- **⚡ System-1 Thinker**: Fast, intuitive, emotional responses
- **🧠 System-2 Thinker**: Slow, deliberate, analytical thinking
- **⚖️ Moderator**: Neutral facilitator and synthesizer
- **👹 Devil's Advocate**: Challenges assumptions and identifies risks

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Perplexity AI API key

### Setup

1. **Clone and install dependencies:**

   ```bash
   cd perspectra-app
   npm install
   ```

2. **Set up environment variables:**

   ```bash
   cp env.example .env.local
   ```

   Edit `.env.local` and add your Perplexity API key:

   ```
   PERPLEXITY_API_KEY=your_actual_api_key_here
   ```

3. **Get your Perplexity API key:**

   - Visit [Perplexity AI Settings](https://www.perplexity.ai/settings/api)
   - Create an account if needed
   - Generate an API key
   - Add it to your `.env.local` file

4. **Run the development server:**

   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎮 How to Use

1. **Describe your problem**: Enter any decision or problem you're facing
2. **Select personas**: Choose which AI advisors you want in your boardroom
3. **Start discussion**: Click "Start Boardroom Discussion"
4. **Engage**: Ask questions, share thoughts, and get diverse perspectives
5. **Make decisions**: Use the insights to make better-informed choices

## 🛠 Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **AI**: Perplexity AI API
- **UI Components**: Custom components with Tailwind

## 📋 Features (Phase 1 MVP)

✅ **Core Features:**

- Multi-persona AI conversations
- Real-time chat interface
- Persona selection and management
- Problem context setting
- Conversation persistence during session

✅ **AI Personas:**

- System-1 vs System-2 thinking (Kahneman)
- Neutral moderation
- Constructive criticism and risk assessment

✅ **User Experience:**

- Clean, responsive design
- Real-time message updates
- Loading states and error handling
- Conversation management (start/end/clear)

## 🔮 Coming Soon (Future Phases)

- **Phase 2**: Voice integration, mobile app, personality type integration
- **Phase 3**: Advanced bias detection, Six Thinking Hats, sentiment analysis
- **Phase 4**: CBT integration, Internal Family Systems, advanced analytics

## 🤝 Contributing

This is currently a personal project, but feedback and suggestions are welcome!

## 📄 License

MIT License - feel free to use this for your own projects.

---

**Built with ❤️ using Perplexity AI**
