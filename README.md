# 🐺 LoboLingo - Spanish Conversational Learning App

A voice-first Spanish language learning app featuring AI-powered conversations, real-time corrections, and multiple practice modes.

## Features

- **Voice Conversations**: Practice speaking Spanish naturally with AI
- **Multiple Modes**: Open chat, topic-focused, vocabulary, grammar, and role-play
- **Real-time Corrections**: Get instant feedback on grammar, vocabulary, and pronunciation
- **Progress Tracking**: Track your streak, vocabulary, and grammar mastery
- **Personalized Learning**: AI adapts to your level (A1-C2)

## Tech Stack

### Mobile App (iOS/Android)
- React Native + Expo
- Expo Router for navigation
- Zustand for state management
- React Query for data fetching

### Backend
- Node.js + Express + TypeScript
- WebSocket for real-time communication
- Supabase (PostgreSQL + Auth)

### AI Services
- **OpenAI GPT-4**: Conversational AI
- **OpenAI Whisper**: Speech-to-Text (accurate Spanish transcription)
- **ElevenLabs**: Text-to-Speech (natural Spanish voices)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Expo Go app on your physical device (recommended)

### 1. Clone & Install

```bash
cd Spanish_Lang_app

# Install backend dependencies
cd backend
npm install
cd ..

# Install mobile dependencies
cd mobile
npm install
cd ..
```

### 2. Configure Environment Variables

#### Backend (`backend/.env`)

Create a `.env` file in the backend directory:

```env
# Server
PORT=3001
NODE_ENV=development

# Supabase (create project at supabase.com)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI (platform.openai.com)
# Used for both GPT-4 conversations AND Whisper speech-to-text
OPENAI_API_KEY=your_openai_api_key

# ElevenLabs (elevenlabs.io)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_spanish_voice_id
```

#### Mobile (`mobile/src/config/constants.ts`)

Update the Supabase configuration:

```typescript
export const SUPABASE_URL = 'your_supabase_project_url';
export const SUPABASE_ANON_KEY = 'your_supabase_anon_key';
```

### 3. Set Up Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the schema from `backend/supabase-schema.sql`

### 4. Run the App

#### Start Backend Server

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:3001`

#### Start Mobile App

```bash
cd mobile
npm start
```

This will open Expo DevTools. You can then:
- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Scan QR code with Expo Go app on your phone

## Development

### Project Structure

```
Spanish_Lang_app/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuration (Supabase, OpenAI)
│   │   ├── middleware/    # Auth middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── types/         # TypeScript types
│   │   ├── websocket/     # WebSocket handlers
│   │   └── index.ts       # Entry point
│   ├── Dockerfile
│   └── package.json
│
├── mobile/
│   ├── app/               # Expo Router screens
│   │   ├── (auth)/        # Auth screens
│   │   ├── (tabs)/        # Main tab screens
│   │   └── conversation/  # Conversation screen
│   ├── src/
│   │   ├── config/        # App constants
│   │   ├── contexts/      # React contexts
│   │   └── theme/         # Design system
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/signup` | POST | Create new user |
| `/api/v1/auth/signin` | POST | Sign in user |
| `/api/v1/auth/me` | GET | Get current user |
| `/api/v1/conversations` | GET | List conversations |
| `/api/v1/conversations` | POST | Start conversation |
| `/api/v1/conversations/:id/messages` | POST | Send message |
| `/api/v1/voice/synthesize` | POST | Text-to-Speech |
| `/api/v1/voice/transcribe` | POST | Speech-to-Text |
| `/api/v1/progress` | GET | Get user progress |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `start_conversation` | Client → Server | Start a conversation |
| `audio_chunk` | Client → Server | Send audio data |
| `audio_end` | Client → Server | Signal recording end |
| `transcription_complete` | Server → Client | Transcribed text |
| `response_ready` | Server → Client | AI response ready |

## Deployment

### Backend (Render)

1. Create a new Web Service on [render.com](https://render.com)
2. Connect your GitHub repository
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy!

### Mobile App (EAS Build)

```bash
cd mobile

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure your project
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build backend only
cd backend
docker build -t lobolingo-api .
docker run -p 3001:3001 --env-file .env lobolingo-api
```

## Roadmap

- [x] Core voice conversation
- [x] Multiple conversation modes
- [x] User authentication
- [x] Progress tracking
- [ ] Offline mode
- [ ] Push notifications
- [ ] Social features
- [ ] Premium subscription

## License

MIT License - see LICENSE for details

---

Built with 🐺 by the LoboLingo team

