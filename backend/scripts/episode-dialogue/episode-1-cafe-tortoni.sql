-- Episode 1: Cafe Tortoni - Introductions
-- Grammar Focus: Present Subjunctive (expressing desire)
-- Runtime: ~2 minutes total audio
-- Characters: Florencia, User, Waiter

-- Get the story arc ID first
DO $$
DECLARE
    v_arc_id UUID;
    v_episode_id UUID;
BEGIN
    -- Get the Buenos Aires story arc
    SELECT id INTO v_arc_id FROM public.story_arcs WHERE title_en ILIKE '%Buenos Aires%' LIMIT 1;
    
    IF v_arc_id IS NULL THEN
        RAISE EXCEPTION 'Story arc not found';
    END IF;

    -- Update Episode 1 with new dialogue
    UPDATE public.episodes
    SET scenes = '[
        {
            "scene_id": "ep1_scene1",
            "scene_number": 1,
            "florencia_says": "¡Bienvenido a Café Tortoni! Me llamo Florencia, y seré tu profesora de español durante las próximas ocho semanas.",
            "florencia_says_en": "Welcome to Café Tortoni! My name is Florencia, and I will be your Spanish teacher for the next eight weeks.",
            "response_type": "listen_only",
            "emotion": "warm",
            "audio_key": "ep1_s1_florencia",
            "cultural_context": "Café Tortoni, founded in 1858, is Buenos Aires'' oldest café. Its Parisian-style décor attracted legendary figures like Carlos Gardel and Jorge Luis Borges."
        },
        {
            "scene_id": "ep1_scene2",
            "scene_number": 2,
            "florencia_says": "Este lugar es muy especial para mí. Mi abuela solía traerme aquí cuando era niña. ¿Ves esas fotos en la pared? Son de Carlos Gardel, el rey del tango.",
            "florencia_says_en": "This place is very special to me. My grandmother used to bring me here when I was a little girl. Do you see those photos on the wall? They are of Carlos Gardel, the king of tango.",
            "response_type": "listen_only",
            "emotion": "nostalgic",
            "audio_key": "ep1_s2_florencia"
        },
        {
            "scene_id": "ep1_scene3",
            "scene_number": 3,
            "florencia_says": "Dime, ¿por qué quieres aprender español?",
            "florencia_says_en": "Tell me, why do you want to learn Spanish?",
            "user_says": "Quiero aprender español para conectar con la cultura.",
            "user_says_en": "I want to learn Spanish to connect with the culture.",
            "response_type": "scripted",
            "emotion": "curious",
            "audio_key": "ep1_s3_florencia"
        },
        {
            "scene_id": "ep1_scene4",
            "scene_number": 4,
            "florencia_says": "¡Qué lindo! Me encanta que quieras conectar con nuestra cultura. Es la mejor razón para aprender un idioma.",
            "florencia_says_en": "How lovely! I love that you want to connect with our culture. It''s the best reason to learn a language.",
            "response_type": "listen_only",
            "emotion": "delighted",
            "audio_key": "ep1_s4_florencia"
        },
        {
            "scene_id": "ep1_scene5",
            "scene_number": 5,
            "waiter_says": "Buenas tardes. ¿Qué les gustaría tomar?",
            "waiter_says_en": "Good afternoon. What would you like to have?",
            "florencia_says": "Mira, llegó el mozo. ¿Qué te gustaría tomar? Intenta decirlo en español.",
            "florencia_says_en": "Look, the waiter arrived. What would you like to have? Try saying it in Spanish.",
            "response_type": "listen_only",
            "emotion": "encouraging",
            "audio_key": "ep1_s5_waiter"
        },
        {
            "scene_id": "ep1_scene6",
            "scene_number": 6,
            "florencia_says": "Recuerda usar ''quiero que'' o ''me gustaría que'' para expresar deseo. Por ejemplo: ''Quiero que me traiga un café.''",
            "florencia_says_en": "Remember to use ''quiero que'' or ''me gustaría que'' to express desire. For example: ''I want you to bring me a coffee.''",
            "user_says": "Me gustaría que me traiga un café con leche, por favor.",
            "user_says_en": "I would like you to bring me a café con leche, please.",
            "response_type": "scripted",
            "emotion": "supportive",
            "audio_key": "ep1_s6_florencia"
        },
        {
            "scene_id": "ep1_scene7",
            "scene_number": 7,
            "waiter_says": "Perfecto. ¿Y para la señorita?",
            "waiter_says_en": "Perfect. And for the lady?",
            "florencia_says": "Para mí también un café con leche, por favor.",
            "florencia_says_en": "For me also a café con leche, please.",
            "response_type": "listen_only",
            "emotion": "pleasant",
            "audio_key": "ep1_s7_waiter"
        },
        {
            "scene_id": "ep1_scene8",
            "scene_number": 8,
            "waiter_says": "Enseguida se los traigo.",
            "waiter_says_en": "I''ll bring them right away.",
            "florencia_says": "¡Muy bien! Usaste el subjuntivo perfectamente. ''Me gustaría que me traiga'' — eso es exactamente correcto.",
            "florencia_says_en": "Very good! You used the subjunctive perfectly. ''I would like you to bring me'' — that is exactly right.",
            "response_type": "listen_only",
            "emotion": "proud",
            "audio_key": "ep1_s8_florencia"
        },
        {
            "scene_id": "ep1_scene9",
            "scene_number": 9,
            "florencia_says": "Sabes, el subjuntivo es como una llave mágica. Te abre las puertas a una nueva realidad — una donde puedes expresar tus deseos, tus emociones, tus sueños.",
            "florencia_says_en": "You know, the subjunctive is like a magic key. It opens the doors to a new reality — one where you can express your desires, your emotions, your dreams.",
            "response_type": "listen_only",
            "emotion": "mysterious",
            "audio_key": "ep1_s9_florencia"
        },
        {
            "scene_id": "ep1_scene10",
            "scene_number": 10,
            "florencia_says": "Durante estas ocho semanas, vamos a explorar Buenos Aires juntos. Te voy a mostrar los lugares que amo, y tú vas a aprender a expresarte como un verdadero porteño.",
            "florencia_says_en": "During these eight weeks, we are going to explore Buenos Aires together. I am going to show you the places I love, and you are going to learn to express yourself like a true Buenos Aires native.",
            "user_says": "Espero que sea una experiencia inolvidable.",
            "user_says_en": "I hope it will be an unforgettable experience.",
            "response_type": "scripted",
            "emotion": "warm",
            "audio_key": "ep1_s10_florencia"
        },
        {
            "scene_id": "ep1_scene11",
            "scene_number": 11,
            "florencia_says": "Te prometo que lo será. ¿Escuchás esa música? Es ''Soñemos'' de Carlos Di Sarli. Mi abuela siempre decía que esa canción habla de crear sueños juntos.",
            "florencia_says_en": "I promise you it will be. Do you hear that music? It''s ''Soñemos'' by Carlos Di Sarli. My grandmother always said that song speaks of creating dreams together.",
            "response_type": "listen_only",
            "emotion": "tender",
            "audio_key": "ep1_s11_florencia"
        },
        {
            "scene_id": "ep1_scene12",
            "scene_number": 12,
            "florencia_says": "Ah, mira — llegaron nuestros cafés. ¡Salud! Por nuevos comienzos y sueños compartidos.",
            "florencia_says_en": "Ah, look — our coffees arrived. Cheers! To new beginnings and shared dreams.",
            "user_says": "¡Salud! Por nuestro viaje juntos.",
            "user_says_en": "Cheers! To our journey together.",
            "response_type": "scripted",
            "emotion": "joyful",
            "audio_key": "ep1_s12_florencia"
        }
    ]'::jsonb,
    estimated_duration = 2
    WHERE episode_number = 1 AND story_arc_id = v_arc_id
    RETURNING id INTO v_episode_id;
    
    RAISE NOTICE 'Updated Episode 1 with ID: %', v_episode_id;
END $$;

