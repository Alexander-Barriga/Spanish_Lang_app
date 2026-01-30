-- ============================================
-- Update Episode Titles
-- Run this script in Supabase SQL Editor to update existing episode titles
-- ============================================

-- Episode 1: Café Tortoni - First Encounter
UPDATE public.episodes 
SET title_es = 'Café Tortoni - First Encounter', title_en = ''
WHERE episode_number = 1;

-- Episode 2: Milonga en Salón Marabú - First Tango
UPDATE public.episodes 
SET title_es = 'Milonga en Salón Marabú - First Tango', title_en = ''
WHERE episode_number = 2;

-- Episode 3: San Telmo Market - Colors and Secrets
UPDATE public.episodes 
SET title_es = 'San Telmo Market - Colors and Secrets', title_en = ''
WHERE episode_number = 3;

-- Episode 4: Family Asado - Entering the Circle
UPDATE public.episodes 
SET title_es = 'Family Asado - Entering the Circle', title_en = ''
WHERE episode_number = 4;

-- Episode 5: Cementerio de la Chacarita - The Truth About Valentina
UPDATE public.episodes 
SET title_es = 'Cementerio de la Chacarita - The Truth About Valentina', title_en = ''
WHERE episode_number = 5;

-- Episode 6: Teatro Colón - The Artist Revealed
UPDATE public.episodes 
SET title_es = 'Teatro Colón - The Artist Revealed', title_en = ''
WHERE episode_number = 6;

-- Episode 7: La Boca - Beauty Born from Necessity
UPDATE public.episodes 
SET title_es = 'La Boca - Beauty Born from Necessity', title_en = ''
WHERE episode_number = 7;

-- Episode 8: Cafe Tortoni - Soñemos
UPDATE public.episodes 
SET title_es = 'Cafe Tortoni - Soñemos', title_en = ''
WHERE episode_number = 8;

-- Verify the updates
SELECT episode_number, title_es, title_en FROM public.episodes ORDER BY episode_number;
