import FormData from 'form-data';

// ElevenLabs voice options
export interface VoiceOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speakerBoost?: boolean;
}

export class VoiceService {
  private openaiApiKey: string;
  private elevenLabsApiKey: string;
  private defaultVoiceId: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || '';
    this.defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || '';
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  async transcribe(audioBuffer: Buffer, options?: {
    language?: string;
    prompt?: string;
  }): Promise<{
    transcript: string;
  }> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { language = 'es', prompt } = options || {};

    // Create form data for the API request
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm',
    });
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    if (prompt) {
      formData.append('prompt', prompt);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        ...formData.getHeaders(),
      },
      body: formData.getBuffer(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Whisper error:', errorText);
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const result = await response.json() as { text: string };

    return {
      transcript: result.text || '',
    };
  }

  /**
   * Convert text to speech using ElevenLabs
   */
  async synthesize(text: string, options?: VoiceOptions): Promise<Buffer> {
    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const {
      voiceId = this.defaultVoiceId,
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0.5,
      speakerBoost = true,
    } = options || {};

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: speakerBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', errorText);
      throw new Error(`Speech synthesis failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Stream text to speech using ElevenLabs
   */
  async synthesizeStream(text: string, options?: VoiceOptions): Promise<ReadableStream<Uint8Array> | null> {
    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const {
      voiceId = this.defaultVoiceId,
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0.5,
      speakerBoost = true,
    } = options || {};

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: speakerBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs streaming error:', errorText);
      throw new Error(`Speech synthesis streaming failed: ${response.status}`);
    }

    return response.body;
  }

  /**
   * Get available ElevenLabs voices
   */
  async getVoices(): Promise<Array<{
    voice_id: string;
    name: string;
    labels?: Record<string, string>;
    preview_url?: string;
  }>> {
    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': this.elevenLabsApiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json() as { voices: Array<{
      voice_id: string;
      name: string;
      labels?: Record<string, string>;
      preview_url?: string;
    }> };
    
    // Filter for Spanish-compatible voices
    return data.voices.filter(voice => {
      const accent = voice.labels?.accent?.toLowerCase() || '';
      const language = voice.labels?.language?.toLowerCase() || '';
      return accent.includes('spanish') || 
             accent.includes('latin') || 
             language.includes('spanish') ||
             language.includes('es');
    });
  }
}

// Export singleton instance
export const voiceService = new VoiceService();
