-- Episode 3: San Telmo Market - Introduction to Porteño History
-- Grammar Focus: Perfect Subjunctive (expressing doubt)
-- Runtime: ~2 minutes total audio
-- Characters: Florencia, User

DO $$
DECLARE
    v_arc_id UUID;
    v_episode_id UUID;
BEGIN
    SELECT id INTO v_arc_id FROM public.story_arcs WHERE title_en ILIKE '%Buenos Aires%' LIMIT 1;
    
    IF v_arc_id IS NULL THEN
        RAISE EXCEPTION 'Story arc not found';
    END IF;

    UPDATE public.episodes
    SET scenes = '[
        {
            "scene_id": "ep3_scene1",
            "scene_number": 1,
            "florencia_says": "¡Bienvenido a la Feria de San Telmo! Este mercado existe desde 1897. Aquí podés encontrar antigüedades, arte callejero, comida típica, y mucha historia.",
            "florencia_says_en": "Welcome to the San Telmo Fair! This market has existed since 1897. Here you can find antiques, street art, typical food, and a lot of history.",
            "response_type": "listen_only",
            "emotion": "enthusiastic",
            "audio_key": "ep3_s1_florencia",
            "cultural_context": "The San Telmo Market preserves the immigrant, working-class fabric of Buenos Aires — the raw social material from which tango and porteño identity emerged."
        },
        {
            "scene_id": "ep3_scene2",
            "scene_number": 2,
            "florencia_says": "¿Ves a toda esa gente tomando de esos vasitos con bombilla? Están tomando mate, la bebida nacional de Argentina.",
            "florencia_says_en": "Do you see all those people drinking from those little cups with a metal straw? They are drinking mate, the national drink of Argentina.",
            "user_says": "He notado que mucha gente lo toma. ¿Qué es exactamente?",
            "user_says_en": "I have noticed that many people drink it. What is it exactly?",
            "response_type": "scripted",
            "emotion": "informative",
            "audio_key": "ep3_s2_florencia"
        },
        {
            "scene_id": "ep3_scene3",
            "scene_number": 3,
            "florencia_says": "El mate es una infusión de yerba mate. Pero es más que una bebida — es un ritual social. Se comparte entre amigos, se pasa en círculo. Es una forma de decir: ''Sos parte de mi grupo.''",
            "florencia_says_en": "Mate is an infusion of yerba mate. But it is more than a drink — it is a social ritual. It is shared among friends, passed around in a circle. It is a way of saying: ''You are part of my group.''",
            "response_type": "listen_only",
            "emotion": "warm",
            "audio_key": "ep3_s3_florencia"
        },
        {
            "scene_id": "ep3_scene4",
            "scene_number": 4,
            "florencia_says": "Mirá, necesito encontrar un baño. ¿Por qué no explorás un poco? Nos encontramos aquí en diez minutos.",
            "florencia_says_en": "Look, I need to find a restroom. Why don''t you explore a bit? We''ll meet here in ten minutes.",
            "user_says": "Está bien. Voy a mirar las tiendas de antigüedades.",
            "user_says_en": "Okay. I am going to look at the antique shops.",
            "response_type": "scripted",
            "emotion": "casual",
            "audio_key": "ep3_s4_florencia"
        },
        {
            "scene_id": "ep3_scene5",
            "scene_number": 5,
            "florencia_says": "Pasaron diez minutos. El usuario sale de una tienda de antigüedades con algo en la mano...",
            "florencia_says_en": "Ten minutes passed. The user exits an antique shop with something in hand...",
            "response_type": "listen_only",
            "emotion": "narrative",
            "audio_key": "ep3_s5_narrator"
        },
        {
            "scene_id": "ep3_scene6",
            "scene_number": 6,
            "florencia_says": "¡Ahí estás! ¿Encontraste algo interesante?",
            "florencia_says_en": "There you are! Did you find something interesting?",
            "user_says": "Sí, encontré un disco viejo de Carlos Di Sarli. Tiene la canción que bailamos.",
            "user_says_en": "Yes, I found an old Carlos Di Sarli record. It has the song we danced to.",
            "response_type": "scripted",
            "emotion": "curious",
            "audio_key": "ep3_s6_florencia"
        },
        {
            "scene_id": "ep3_scene7",
            "scene_number": 7,
            "florencia_says": "¿''Soñemos''? ¡Qué casualidad! O quizás no sea casualidad. Dudo que haya sido un accidente que encontraras ese disco.",
            "florencia_says_en": "''Soñemos''? What a coincidence! Or maybe it''s not a coincidence. I doubt that it was an accident that you found that record.",
            "response_type": "listen_only",
            "emotion": "mysterious",
            "audio_key": "ep3_s7_florencia"
        },
        {
            "scene_id": "ep3_scene8",
            "scene_number": 8,
            "florencia_says": "Usé el subjuntivo perfecto: ''Dudo que haya sido un accidente.'' Expresa duda sobre algo que pasó. ¿Podés intentar hacer una frase similar?",
            "florencia_says_en": "I used the perfect subjunctive: ''I doubt it was an accident.'' It expresses doubt about something that happened. Can you try to make a similar phrase?",
            "user_says": "No creo que haya sido una coincidencia.",
            "user_says_en": "I don''t believe it was a coincidence.",
            "response_type": "scripted",
            "emotion": "teaching",
            "audio_key": "ep3_s8_florencia"
        },
        {
            "scene_id": "ep3_scene9",
            "scene_number": 9,
            "florencia_says": "¡Perfecto! Veo que también hiciste una compra. ¿Qué tenés en esa bolsa?",
            "florencia_says_en": "Perfect! I see you also made a purchase. What do you have in that bag?",
            "response_type": "listen_only",
            "emotion": "curious",
            "audio_key": "ep3_s9_florencia"
        },
        {
            "scene_id": "ep3_scene10",
            "scene_number": 10,
            "florencia_says": "Ah, yo también compré algo, pero es un secreto por ahora.",
            "florencia_says_en": "Ah, I also bought something, but it''s a secret for now.",
            "user_says": "¿Qué compraste? ¡Decime!",
            "user_says_en": "What did you buy? Tell me!",
            "response_type": "scripted",
            "emotion": "playful",
            "audio_key": "ep3_s10_florencia"
        },
        {
            "scene_id": "ep3_scene11",
            "scene_number": 11,
            "florencia_says": "Es posible que te lo muestre algún día. Pero no hoy. ¿Te gustaría que sigamos explorando el mercado?",
            "florencia_says_en": "It is possible that I will show you someday. But not today. Would you like us to continue exploring the market?",
            "user_says": "Sí, me encantaría que me muestres más de este lugar.",
            "user_says_en": "Yes, I would love for you to show me more of this place.",
            "response_type": "scripted",
            "emotion": "flirtatious",
            "audio_key": "ep3_s11_florencia"
        },
        {
            "scene_id": "ep3_scene12",
            "scene_number": 12,
            "florencia_says": "Entonces vamos. San Telmo tiene muchos secretos, igual que yo. Y quizás, igual que vos.",
            "florencia_says_en": "Then let''s go. San Telmo has many secrets, just like me. And maybe, just like you.",
            "response_type": "listen_only",
            "emotion": "mysterious",
            "audio_key": "ep3_s12_florencia"
        }
    ]'::jsonb,
    estimated_duration = 2
    WHERE episode_number = 3 AND story_arc_id = v_arc_id
    RETURNING id INTO v_episode_id;
    
    RAISE NOTICE 'Updated Episode 3 with ID: %', v_episode_id;
END $$;

