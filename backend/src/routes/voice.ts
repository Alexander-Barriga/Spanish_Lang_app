import { Router, Request, Response } from 'express';
import multer from 'multer';
import { optionalAuth } from '../middleware/auth';
import { storageService } from '../services/storage';
import FormData from 'form-data';

const router = Router();

// Development-only fallback: Use a test user ID if not authenticated
// Must be a valid UUID format for Supabase
const DEV_TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// Configure multer for memory storage (we'll pass the buffer to OpenAI)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (OpenAI's limit)
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files - be permissive since mobile devices use various formats
    const allowedMimes = [
      'audio/webm',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/aac',
      'audio/ogg',
      'audio/flac',
      'audio/x-caf', // iOS CAF format
      'audio/caf',
      'application/octet-stream', // Sometimes sent as binary
    ];
    console.log(`📥 Received file: ${file.originalname}, type: ${file.mimetype}`);
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.warn(`⚠️ Unexpected file type: ${file.mimetype}, allowing anyway`);
      // Allow anyway - OpenAI Whisper can handle many formats
      cb(null, true);
    }
  },
});

// Use optional auth - will authenticate if token provided, otherwise continue
router.use(optionalAuth);

// Get available voices
router.get('/voices', async (req: Request, res: Response) => {
  try {
    // ElevenLabs Spanish voices - these would be fetched from ElevenLabs API
    // For now, we'll return a static list of recommended Spanish voices
    const voices = [
      {
        id: 'spanish_female_1',
        name: 'Isabella',
        accent: 'mexico',
        gender: 'female',
        description: 'Warm and clear Mexican Spanish accent',
        preview_url: null,
      },
      {
        id: 'spanish_male_1',
        name: 'Carlos',
        accent: 'spain',
        gender: 'male',
        description: 'Professional Castilian Spanish accent',
        preview_url: null,
      },
      {
        id: 'spanish_female_2',
        name: 'Lucía',
        accent: 'argentina',
        gender: 'female',
        description: 'Friendly Rioplatense Spanish accent',
        preview_url: null,
      },
      {
        id: 'spanish_male_2',
        name: 'Diego',
        accent: 'colombia',
        gender: 'male',
        description: 'Clear Colombian Spanish accent',
        preview_url: null,
      },
    ];

    res.json({ voices });
  } catch (error) {
    console.error('Get voices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Text-to-speech endpoint
router.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { text, voiceId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || 'your_default_voice_id';

    if (!elevenLabsApiKey) {
      return res.status(500).json({ error: 'ElevenLabs API not configured' });
    }

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || defaultVoiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', errorText);
      return res.status(500).json({ error: 'Text-to-speech synthesis failed' });
    }

    // Stream audio back to client
    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
    });

    const reader = response.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: 'Failed to read audio stream' });
    }

    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(value);
      await pump();
    };

    await pump();
  } catch (error) {
    console.error('Synthesize error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Speech-to-text endpoint using OpenAI Whisper
// Also saves audio to Supabase Storage for later reference
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OpenAI API not configured' });
    }

    // Get the uploaded file
    const audioFile = req.file;

    if (!audioFile || !audioFile.buffer || audioFile.buffer.length === 0) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // Get user and conversation IDs for storage
    const userId = req.user?.id || req.body.userId || DEV_TEST_USER_ID;
    const conversationId = req.body.conversationId || 'unknown';

    console.log(`Transcribing audio: ${audioFile.originalname}, size: ${audioFile.size}, type: ${audioFile.mimetype}`);

    // Determine file extension from mimetype
    // OpenAI Whisper supports: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm
    const mimeToExt: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/wave': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/x-m4a': 'm4a',  // iOS format
      'audio/aac': 'm4a',
      'audio/ogg': 'ogg',
      'audio/flac': 'flac',
      'audio/x-caf': 'wav',  // Convert CAF to wav extension for Whisper
    };
    const extension = mimeToExt[audioFile.mimetype] || 'm4a'; // Default to m4a for iOS

    // Normalize content type for OpenAI (some iOS types aren't recognized)
    const mimeToContentType: Record<string, string> = {
      'audio/x-m4a': 'audio/m4a',
      'audio/x-wav': 'audio/wav',
      'audio/wave': 'audio/wav',
      'audio/x-caf': 'audio/wav',
    };
    const contentType = mimeToContentType[audioFile.mimetype] || audioFile.mimetype;

    // Create form data for OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', audioFile.buffer, {
      filename: `audio.${extension}`,
      contentType: contentType, // Use normalized content type
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
      const errorText = await response.text();
      console.error('OpenAI Whisper error:', errorText);
      return res.status(500).json({ error: 'Transcription failed' });
    }

    const result = await response.json() as { text: string };

    console.log(`Transcription result: "${result.text}"`);

    // Save audio to Supabase Storage (in background, don't block response)
    let audioUrl: string | undefined;
    try {
      const uploadResult = await storageService.uploadAudio(
        audioFile.buffer,
        userId,
        conversationId,
        audioFile.mimetype
      );
      if (uploadResult.success && uploadResult.url) {
        audioUrl = uploadResult.url;
        console.log(`✅ Audio saved to storage: ${audioUrl}`);
      }
    } catch (storageError) {
      console.error('Audio storage error (non-fatal):', storageError);
      // Continue without audio storage - transcription still works
    }

    res.json({
      transcript: result.text || '',
      confidence: 0.95, // OpenAI doesn't return confidence, using a default
      audioUrl, // Include the storage URL for later reference
    });
  } catch (error) {
    console.error('Transcribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
