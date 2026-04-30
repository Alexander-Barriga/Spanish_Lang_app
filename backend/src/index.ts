import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import conversationRoutes from './routes/conversations';
import userRoutes from './routes/users';
import voiceRoutes from './routes/voice';
import progressRoutes from './routes/progress';
import curriculumRoutes from './routes/curriculum';
import workoutsRoutes from './routes/workouts';
import writingRoutes from './routes/writing';
import placementRoutes from './routes/placement';
import storiesRoutes from './routes/stories';
import journalRoutes from './routes/journal';
import audioCacheRoutes from './routes/audio-cache';
import articlesRoutes from './routes/articles';
import episodeArticlesRoutes from './routes/episodeArticles';
import episodeConversationRoutes from './routes/episodeConversation';
import legalRoutes from './routes/legal';
import subscriptionRoutes from './routes/subscription';

// Import WebSocket handler
import { setupWebSocket } from './websocket';

// Import storage service
import { storageService } from './services/storage';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request limit reached. Please wait a moment.' },
});

app.use('/api/', generalLimiter);
app.use('/api/v1/conversations', aiLimiter);
app.use('/api/v1/voice', aiLimiter);
app.use('/api/v1/episode-conversation', aiLimiter);
app.use('/api/v1/writing', aiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Spanish Lab API'
  });
});

// API Routes (versioned)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/voice', voiceRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/curriculum', curriculumRoutes);
app.use('/api/v1/workouts', workoutsRoutes);
app.use('/api/v1/writing', writingRoutes);
app.use('/api/v1/placement', placementRoutes);
app.use('/api/v1/stories', storiesRoutes);
app.use('/api/v1/journal', journalRoutes);
app.use('/api/v1/audio', audioCacheRoutes);
app.use('/api/v1/articles', articlesRoutes);
app.use('/api/v1/episode-articles', episodeArticlesRoutes);
app.use('/api/v1/episode-conversation', episodeConversationRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);

// Legal pages (served at root level, not behind /api/v1)
app.use('/', legalRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Create HTTP server for WebSocket support
const server = createServer(app);

// Setup WebSocket server for real-time voice streaming
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Start server - listen on all interfaces to allow mobile device access
server.listen(PORT, async () => {
  // Initialize storage bucket for audio recordings
  await storageService.initializeBucket();
  
  console.log(`
  Spanish Lab API Server
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 Server running on port ${PORT}
  🌐 Accessible at http://localhost:${PORT}
  📡 WebSocket available at ws://localhost:${PORT}/ws
  🔧 Environment: ${process.env.NODE_ENV || 'development'}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export default app;

