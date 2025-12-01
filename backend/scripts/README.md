# Tutor Greetings Generation Script

This script generates and uploads pre-recorded greeting audio files for all three Spanish tutors (Malena, Ana María, and Marcela) to save on ElevenLabs API costs.

## Overview

Instead of generating greeting audio on-demand using ElevenLabs TTS (which costs money), this script:
1. Generates all 9 greetings (3 characters × 3 greetings each) using ElevenLabs API **once**
2. Uploads the audio files to Supabase Storage
3. Saves metadata (text + audio URL) to the `tutor_greetings` database table

When users open a conversation, the app will use the stored audio instead of generating new audio each time.

## Prerequisites

1. **Database Setup**: Run the updated `supabase-schema.sql` to create the `tutor_greetings` table
2. **Environment Variables**: Ensure your `.env` file has:
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin access)
   - `ELEVENLABS_VOICE_ID_ARGENTINA` - Voice ID for Malena
   - `ELEVENLABS_VOICE_ID_MEXICO` - Voice ID for Ana María
   - `ELEVENLABS_VOICE_ID_COLOMBIA` - Voice ID for Marcela

## Running the Script

```bash
cd backend
npm run generate-greetings
```

Or directly with ts-node:

```bash
cd backend
npx ts-node scripts/generate-greetings.ts
```

## What It Does

1. **Creates Storage Bucket**: Creates a public `tutor-greetings` bucket in Supabase Storage (if it doesn't exist)
2. **Generates Audio**: For each character and greeting:
   - Calls ElevenLabs API to generate MP3 audio
   - Uploads to Supabase Storage at `{characterId}/greeting-{index}.mp3`
   - Saves metadata to `tutor_greetings` table
3. **Cost Estimate**: Shows estimated ElevenLabs API cost (roughly $0.30 per 1000 characters)

## Expected Output

```
🚀 Starting greeting generation...

✅ tutor-greetings bucket already exists

📝 Processing Malena (malena)...

  Greeting 1/3:
  🎤 Generating audio for: "¡Hola! Soy Malena, de Buenos Aires. ¿Cómo andás? Contame algo de vos...."
  ✅ Generated 45678 bytes
  📤 Uploading to: malena/greeting-0.mp3
  ✅ Uploaded: https://...
  💾 Saved to database
  ✅ Completed greeting 1 for Malena

...

✅ All greetings generated and uploaded!
💰 Estimated ElevenLabs cost: ~$0.05
```

## Cost Savings

- **Before**: Every user opening a conversation = 1 ElevenLabs API call (~$0.01-0.02 per greeting)
- **After**: One-time cost to generate all 9 greetings (~$0.05 total), then free for all users

For 100 users opening conversations:
- **Before**: 100 × $0.015 = **$1.50**
- **After**: $0.05 (one-time) = **$0.05**

**Savings: ~97% reduction in greeting costs!**

## Troubleshooting

### Error: "ELEVENLABS_API_KEY not found"
- Check your `.env` file has the correct API key

### Error: "Character not found"
- Ensure voice IDs are set in `.env` for all three characters

### Error: "Upload error"
- Check Supabase Storage permissions
- Ensure service role key has admin access

### Error: "Database error"
- Run the updated `supabase-schema.sql` to create the `tutor_greetings` table
- Check RLS policies allow public read access

## Regenerating Greetings

If you need to regenerate greetings (e.g., after changing greeting text), simply run the script again. It will:
- Overwrite existing audio files (using `upsert: true`)
- Update database records (using `ON CONFLICT`)

## Notes

- The storage bucket is **public** so anyone can access greeting audio URLs
- Audio files are stored as MP3 format
- Each greeting is ~30-50KB in size
- Total storage needed: ~400-500KB for all 9 greetings

