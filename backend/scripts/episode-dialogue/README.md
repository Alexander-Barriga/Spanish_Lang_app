# Episode Dialogue Scripts

This folder contains SQL scripts for updating the 8 episodes of the Buenos Aires story arc with immersive Spanish dialogue.

## Overview

- **Song Motif**: "Soñemos" by Carlos Di Sarli
- **Runtime**: ~2 minutes per episode
- **Response Types**: 
  - `scripted` - User reads a specific Spanish line aloud
  - `listen_only` - User listens and continues
  - `guided` - User chooses from options (legacy)
  - `free_speak` - User speaks freely (legacy)

## Episode Files

| File | Episode | Grammar Focus |
|------|---------|---------------|
| `episode-1-cafe-tortoni.sql` | Café Tortoni | Present Subjunctive (desire) |
| `episode-2-salon-marabu.sql` | Salón Marabú | Present Subjunctive (emotion) |
| `episode-3-san-telmo.sql` | San Telmo Market | Perfect Subjunctive (doubt) |
| `episode-4-family-asado.sql` | Family Asado | Perfect Subjunctive (desire) |
| `episode-5-cementerio.sql` | Chacarita Cemetery | Pluperfect Subjunctive |
| `episode-6-teatro-colon.sql` | Teatro Colón | Imperfect Subjunctive |
| `episode-7-la-boca.sql` | La Boca | Imperfect Subjunctive |
| `episode-8-farewell.sql` | Farewell | All Subjunctive (review) |

## Characters

- **Florencia**: Main character, Argentine tango dancer, Spanish teacher
- **User**: The learner, speaks scripted lines
- **Waiter (Mozo)**: Appears in Episodes 1 and 8

## Backstory (Episode 5)

Florencia's grandmother, **Valentina Reyes**, was a celebrated tango singer/dancer during the Golden Age. She was offered a leading role at Teatro Colón but chose family when she became pregnant. Florencia inherited her passion but regrets not accepting a touring company offer before the pandemic.

## How to Run

### Option 1: Supabase SQL Editor (Recommended)

Copy and paste the contents of each individual episode SQL file into the Supabase SQL Editor and run them in order (1-8).

### Option 2: Local psql

```bash
cd backend/scripts/episode-dialogue
psql -U your_user -d your_database -f run-all-episodes.sql
```

## Scene Structure

Each scene in the `scenes` JSONB array contains:

```json
{
  "scene_id": "ep1_scene1",
  "scene_number": 1,
  "florencia_says": "Spanish dialogue",
  "florencia_says_en": "English translation",
  "user_says": "User's scripted Spanish line",
  "user_says_en": "User's English translation",
  "waiter_says": "Waiter's line (Episodes 1 & 8)",
  "waiter_says_en": "Waiter's translation",
  "response_type": "scripted | listen_only",
  "emotion": "warm | flirtatious | mysterious | etc.",
  "audio_key": "ep1_s1_florencia",
  "cultural_context": "Historical/cultural information"
}
```

