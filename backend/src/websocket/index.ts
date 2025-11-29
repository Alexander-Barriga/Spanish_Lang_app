import { WebSocketServer, WebSocket } from 'ws';
import { supabase } from '../config/supabase';
import { ConversationService } from '../services/conversation';
import FormData from 'form-data';

interface WebSocketClient extends WebSocket {
  userId?: string;
  conversationId?: string;
  isAlive?: boolean;
}

interface WSMessage {
  type: string;
  payload: Record<string, unknown>;
}

export function setupWebSocket(wss: WebSocketServer) {
  const conversationService = new ConversationService();
  
  // Heartbeat to detect broken connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as WebSocketClient;
      if (client.isAlive === false) {
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on('connection', async (ws: WebSocket, req) => {
    const client = ws as WebSocketClient;
    client.isAlive = true;

    console.log('🔌 New WebSocket connection');

    // Extract token from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (token) {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          client.userId = user.id;
          console.log(`✅ Authenticated user: ${user.id}`);
        }
      } catch (error) {
        console.error('WebSocket auth error:', error);
      }
    }

    client.on('pong', () => {
      client.isAlive = true;
    });

    client.on('message', async (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        await handleMessage(client, message, conversationService);
      } catch (error) {
        console.error('WebSocket message error:', error);
        sendError(client, 'Invalid message format');
      }
    });

    client.on('close', () => {
      console.log('🔌 WebSocket connection closed');
    });

    client.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send connection confirmation
    send(client, {
      type: 'connected',
      payload: { 
        authenticated: !!client.userId,
        message: '¡Bienvenido a LoboLingo!' 
      },
    });
  });
}

async function handleMessage(
  client: WebSocketClient,
  message: WSMessage,
  conversationService: ConversationService
) {
  switch (message.type) {
    case 'start_conversation':
      await handleStartConversation(client, message.payload);
      break;

    case 'audio_chunk':
      await handleAudioChunk(client, message.payload);
      break;

    case 'audio_end':
      await handleAudioEnd(client, message.payload, conversationService);
      break;

    case 'text_message':
      await handleTextMessage(client, message.payload, conversationService);
      break;

    case 'end_conversation':
      await handleEndConversation(client);
      break;

    case 'ping':
      send(client, { type: 'pong', payload: {} });
      break;

    default:
      sendError(client, `Unknown message type: ${message.type}`);
  }
}

async function handleStartConversation(
  client: WebSocketClient,
  payload: Record<string, unknown>
) {
  if (!client.userId) {
    sendError(client, 'Authentication required');
    return;
  }

  const conversationId = payload.conversationId as string;
  if (!conversationId) {
    sendError(client, 'Conversation ID required');
    return;
  }

  client.conversationId = conversationId;
  
  send(client, {
    type: 'conversation_started',
    payload: { conversationId },
  });

  console.log(`📝 Started conversation: ${conversationId}`);
}

// Buffer for collecting audio chunks
const audioBuffers = new Map<string, Buffer[]>();

async function handleAudioChunk(
  client: WebSocketClient,
  payload: Record<string, unknown>
) {
  if (!client.userId || !client.conversationId) {
    sendError(client, 'No active conversation');
    return;
  }

  const audioData = payload.audio as string;
  if (!audioData) {
    return;
  }

  // Decode base64 audio chunk
  const buffer = Buffer.from(audioData, 'base64');
  
  const key = `${client.userId}-${client.conversationId}`;
  if (!audioBuffers.has(key)) {
    audioBuffers.set(key, []);
  }
  audioBuffers.get(key)!.push(buffer);

  // Acknowledge receipt
  send(client, {
    type: 'audio_chunk_received',
    payload: { chunkSize: buffer.length },
  });
}

async function handleAudioEnd(
  client: WebSocketClient,
  _payload: Record<string, unknown>,
  conversationService: ConversationService
) {
  if (!client.userId || !client.conversationId) {
    sendError(client, 'No active conversation');
    return;
  }

  const key = `${client.userId}-${client.conversationId}`;
  const chunks = audioBuffers.get(key);

  if (!chunks || chunks.length === 0) {
    sendError(client, 'No audio data received');
    return;
  }

  // Combine all chunks
  const fullAudio = Buffer.concat(chunks);
  audioBuffers.delete(key);

  send(client, {
    type: 'processing_audio',
    payload: { status: 'transcribing' },
  });

  try {
    // Transcribe with OpenAI Whisper
    const transcript = await transcribeAudioWithWhisper(fullAudio);

    if (!transcript) {
      sendError(client, 'Could not transcribe audio');
      return;
    }

    send(client, {
      type: 'transcription_complete',
      payload: { transcript },
    });

    // Process as text message
    await processUserMessage(client, transcript, conversationService);
  } catch (error) {
    console.error('Audio processing error:', error);
    sendError(client, 'Audio processing failed');
  }
}

async function handleTextMessage(
  client: WebSocketClient,
  payload: Record<string, unknown>,
  conversationService: ConversationService
) {
  if (!client.userId || !client.conversationId) {
    sendError(client, 'No active conversation');
    return;
  }

  const text = payload.text as string;
  if (!text) {
    sendError(client, 'Message text required');
    return;
  }

  await processUserMessage(client, text, conversationService);
}

async function processUserMessage(
  client: WebSocketClient,
  text: string,
  _conversationService: ConversationService
) {
  send(client, {
    type: 'processing',
    payload: { status: 'generating_response' },
  });

  try {
    // In a real implementation, this would call the conversation service
    // and stream the response back to the client
    
    // For now, we'll use the REST API for message processing
    // and just notify the client to fetch the new message
    
    send(client, {
      type: 'response_ready',
      payload: { 
        userMessage: text,
        // The actual response would be fetched via REST API
        // This allows for proper database persistence
      },
    });
  } catch (error) {
    console.error('Message processing error:', error);
    sendError(client, 'Failed to process message');
  }
}

async function handleEndConversation(client: WebSocketClient) {
  if (client.conversationId) {
    send(client, {
      type: 'conversation_ended',
      payload: { conversationId: client.conversationId },
    });
    client.conversationId = undefined;
  }
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeAudioWithWhisper(audioBuffer: Buffer): Promise<string | null> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.error('OpenAI API key not configured');
    return null;
  }

  try {
    // Create form data for OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm',
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'es'); // Spanish

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        ...formData.getHeaders(),
      },
      body: formData.getBuffer(),
    });

    if (!response.ok) {
      console.error('OpenAI Whisper error:', await response.text());
      return null;
    }

    const result = await response.json() as { text: string };
    return result.text || null;
  } catch (error) {
    console.error('Transcription error:', error);
    return null;
  }
}

function send(client: WebSocketClient, message: WSMessage) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

function sendError(client: WebSocketClient, error: string) {
  send(client, {
    type: 'error',
    payload: { message: error },
  });
}
