-- ============================================
-- Narrative Enhancement Schema Updates
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Add new columns to episodes table
-- ============================================

-- Add cultural context and character development fields
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS cultural_context TEXT;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS character_development_notes TEXT;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS callback_references JSONB DEFAULT '[]';

-- Add episode-level image fields
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS header_image_url TEXT;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS header_image_storage_path TEXT;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS header_image_prompt TEXT;

-- ============================================
-- 2. Create article_images table
-- ============================================

CREATE TABLE IF NOT EXISTS article_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID REFERENCES episode_articles(id) ON DELETE CASCADE,
    image_type TEXT NOT NULL CHECK (image_type IN ('header', 'inline')),
    position INTEGER DEFAULT 0,  -- Order for inline images (0 = header, 1+ = inline order)
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    image_prompt TEXT,  -- Store the DALL-E prompt used
    alt_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_article_images_article_id ON article_images(article_id);
CREATE INDEX IF NOT EXISTS idx_article_images_type ON article_images(image_type);

-- ============================================
-- 3. Create narrative-images storage bucket
-- ============================================

-- Note: This needs to be run separately or the bucket created via Supabase Dashboard
-- The INSERT may fail if bucket already exists - that's okay

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'narrative-images', 
    'narrative-images', 
    true,
    5242880,  -- 5MB limit per image
    ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. Storage bucket policies
-- ============================================

-- Allow public read access for narrative images
CREATE POLICY "Public read access for narrative images"
ON storage.objects FOR SELECT
USING (bucket_id = 'narrative-images');

-- Allow service role to upload narrative images
CREATE POLICY "Service role upload for narrative images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'narrative-images');

-- Allow service role to update narrative images (for regeneration)
CREATE POLICY "Service role update for narrative images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'narrative-images');

-- Allow service role to delete narrative images (for cleanup)
CREATE POLICY "Service role delete for narrative images"
ON storage.objects FOR DELETE
USING (bucket_id = 'narrative-images');

-- ============================================
-- 5. RLS policies for article_images table
-- ============================================

-- Enable RLS
ALTER TABLE article_images ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read article images
CREATE POLICY "Users can read article images"
ON article_images FOR SELECT
TO authenticated
USING (true);

-- Allow service role to manage article images
CREATE POLICY "Service role can manage article images"
ON article_images FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- 6. Update scenes JSONB structure documentation
-- ============================================

-- Note: The scenes column in episodes table is JSONB.
-- Each scene object should now include these additional fields:
-- 
-- {
--   "scene_id": "scene_1",
--   "scene_number": 1,
--   "florencia_says": "...",
--   "audio_key": "...",
--   "emotion": "curious",
--   "response_type": "guided|free_speak",
--   "options": [...],
--   "grammar_hint": "...",
--   "expected_patterns": [...],
--   
--   -- NEW FIELDS --
--   "cultural_context": "Brief 2-3 sentence explanation for users unfamiliar with this location/event",
--   "scene_image_url": "https://xxx.supabase.co/storage/v1/object/public/narrative-images/...",
--   "scene_image_storage_path": "episodes/1/scenes/scene_1.webp",
--   "scene_image_prompt": "DALL-E prompt used to generate this image",
--   "emotional_beat": "curiosity|vulnerability|connection|nostalgia|resilience|hope",
--   "callback_to": "Optional reference to previous episode element"
-- }

-- ============================================
-- 7. Verify schema updates
-- ============================================

-- You can run this to verify the columns were added:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'episodes' 
-- AND column_name IN ('cultural_context', 'character_development_notes', 'callback_references', 'header_image_url');

-- Verify article_images table exists:
-- SELECT * FROM information_schema.tables WHERE table_name = 'article_images';

