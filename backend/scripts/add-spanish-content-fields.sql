-- ============================================
-- ADD SPANISH CONTENT FIELDS TO EPISODE_ARTICLES
-- This script adds Spanish content fields for translation support
-- Run this in Supabase SQL Editor
-- ============================================

-- Add Spanish content fields
ALTER TABLE public.episode_articles 
ADD COLUMN IF NOT EXISTS content_html_es TEXT,
ADD COLUMN IF NOT EXISTS content_markdown_es TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.episode_articles.content_html_es IS 'Spanish version of the article HTML content';
COMMENT ON COLUMN public.episode_articles.content_markdown_es IS 'Spanish version of the article markdown content';

-- Verification
SELECT 'Spanish content fields added successfully!' as status;

