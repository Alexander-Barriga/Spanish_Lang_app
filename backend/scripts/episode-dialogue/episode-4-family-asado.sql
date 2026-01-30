-- Episode 4: Family Asado - Family, Tradition, and the Symbolism of Mate
-- Grammar Focus: Perfect Subjunctive (expressing desire)
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
            "scene_id": "ep4_scene1",
            "scene_number": 1,
            "florencia_says": "¡Bienvenido al asado de mi familia! Espero que hayas tenido hambre, porque mi papá hace el mejor asado de Buenos Aires.",
            "florencia_says_en": "Welcome to my family''s asado! I hope you came hungry, because my dad makes the best asado in Buenos Aires.",
            "response_type": "listen_only",
            "emotion": "excited",
            "audio_key": "ep4_s1_florencia",
            "cultural_context": "Argentine asado is a communal ritual rooted in gaucho life that transforms beef, fire, and time into an expression of national identity and social equality."
        },
        {
            "scene_id": "ep4_scene2",
            "scene_number": 2,
            "florencia_says": "El asado es más que una comida. Es un ritual. Todos comen la misma carne, todos se sientan en la misma mesa. No hay diferencias — solo familia y amigos.",
            "florencia_says_en": "Asado is more than a meal. It is a ritual. Everyone eats the same meat, everyone sits at the same table. There are no differences — only family and friends.",
            "user_says": "Me alegra que me hayas invitado a compartir esto con tu familia.",
            "user_says_en": "I''m glad that you have invited me to share this with your family.",
            "response_type": "scripted",
            "emotion": "warm",
            "audio_key": "ep4_s2_florencia"
        },
        {
            "scene_id": "ep4_scene3",
            "scene_number": 3,
            "florencia_says": "¡Excelente! Usaste el subjuntivo perfecto para expresar emoción sobre algo que ya pasó: ''Me alegra que me hayas invitado.'' Estás mejorando mucho.",
            "florencia_says_en": "Excellent! You used the perfect subjunctive to express emotion about something that already happened: ''I''m glad you have invited me.'' You are improving a lot.",
            "response_type": "listen_only",
            "emotion": "proud",
            "audio_key": "ep4_s3_florencia"
        },
        {
            "scene_id": "ep4_scene4",
            "scene_number": 4,
            "florencia_says": "Mirá, traje algo especial. Un mate y un termo con agua caliente. ¿Te acordás de lo que te expliqué en San Telmo?",
            "florencia_says_en": "Look, I brought something special. A mate and a thermos with hot water. Do you remember what I explained to you in San Telmo?",
            "user_says": "Sí, me acuerdo. El mate se comparte entre amigos.",
            "user_says_en": "Yes, I remember. Mate is shared among friends.",
            "response_type": "scripted",
            "emotion": "tender",
            "audio_key": "ep4_s4_florencia"
        },
        {
            "scene_id": "ep4_scene5",
            "scene_number": 5,
            "florencia_says": "Exacto. Voy a prepararlo y después te lo paso. Cuando tomes del mismo mate que yo, significa que sos parte de mi círculo.",
            "florencia_says_en": "Exactly. I am going to prepare it and then I will pass it to you. When you drink from the same mate as me, it means you are part of my circle.",
            "response_type": "listen_only",
            "emotion": "intimate",
            "audio_key": "ep4_s5_florencia"
        },
        {
            "scene_id": "ep4_scene6",
            "scene_number": 6,
            "florencia_says": "Tomá. Es tu turno.",
            "florencia_says_en": "Here. It''s your turn.",
            "user_says": "Gracias. Ojalá que me haya acostumbrado al sabor.",
            "user_says_en": "Thank you. I hope I have gotten used to the taste.",
            "response_type": "scripted",
            "emotion": "offering",
            "audio_key": "ep4_s6_florencia"
        },
        {
            "scene_id": "ep4_scene7",
            "scene_number": 7,
            "florencia_says": "Jaja, el mate tiene un sabor fuerte al principio. Pero te va a gustar. Ahora somos amigos oficialmente.",
            "florencia_says_en": "Haha, mate has a strong flavor at first. But you will like it. Now we are officially friends.",
            "response_type": "listen_only",
            "emotion": "playful",
            "audio_key": "ep4_s7_florencia"
        },
        {
            "scene_id": "ep4_scene8",
            "scene_number": 8,
            "florencia_says": "¿Sabés qué? Me encanta que hayas venido hoy. Mi familia ya te quiere.",
            "florencia_says_en": "You know what? I love that you have come today. My family already loves you.",
            "user_says": "Yo también estoy feliz de haber venido. Pero... no veo a tu abuela.",
            "user_says_en": "I am also happy to have come. But... I don''t see your grandmother.",
            "response_type": "scripted",
            "emotion": "affectionate",
            "audio_key": "ep4_s8_florencia"
        },
        {
            "scene_id": "ep4_scene9",
            "scene_number": 9,
            "florencia_says": "Ah, sí. Mi abuela no pudo venir hoy. Pero te prometo que vas a conocerla. Ella tiene muchas historias de tango que contarte.",
            "florencia_says_en": "Ah, yes. My grandmother couldn''t come today. But I promise you that you are going to meet her. She has many tango stories to tell you.",
            "response_type": "listen_only",
            "emotion": "wistful",
            "audio_key": "ep4_s9_florencia"
        },
        {
            "scene_id": "ep4_scene10",
            "scene_number": 10,
            "florencia_says": "Tenía muchas preguntas sobre tango para hacerle, ¿verdad? La próxima vez que nos veamos, quizás pueda presentártela.",
            "florencia_says_en": "You had many questions about tango to ask her, right? Next time we meet, maybe I can introduce her to you.",
            "user_says": "Me gustaría mucho que me la presentaras.",
            "user_says_en": "I would really like for you to introduce me to her.",
            "response_type": "scripted",
            "emotion": "hopeful",
            "audio_key": "ep4_s10_florencia"
        },
        {
            "scene_id": "ep4_scene11",
            "scene_number": 11,
            "florencia_says": "Te lo prometo. Pero por ahora, disfrutemos del asado. Mi papá ya está sirviendo la carne. ¿Estás listo?",
            "florencia_says_en": "I promise you. But for now, let''s enjoy the asado. My dad is already serving the meat. Are you ready?",
            "user_says": "¡Listo! Espero que la carne sea tan buena como decís.",
            "user_says_en": "Ready! I hope the meat is as good as you say.",
            "response_type": "scripted",
            "emotion": "warm",
            "audio_key": "ep4_s11_florencia"
        },
        {
            "scene_id": "ep4_scene12",
            "scene_number": 12,
            "florencia_says": "Vas a ver. No hay nada mejor que un asado argentino con amigos. Salud, por nuevos amigos y viejas tradiciones.",
            "florencia_says_en": "You will see. There is nothing better than an Argentine asado with friends. Cheers, to new friends and old traditions.",
            "response_type": "listen_only",
            "emotion": "joyful",
            "audio_key": "ep4_s12_florencia"
        }
    ]'::jsonb,
    estimated_duration = 2
    WHERE episode_number = 4 AND story_arc_id = v_arc_id
    RETURNING id INTO v_episode_id;
    
    RAISE NOTICE 'Updated Episode 4 with ID: %', v_episode_id;
END $$;

