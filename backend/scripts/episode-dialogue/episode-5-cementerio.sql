-- Episode 5: Cementerio de la Chacarita - Legacy to Become an Artist
-- Grammar Focus: Pluperfect Subjunctive (various applications)
-- Runtime: ~2 minutes total audio
-- Characters: Florencia, User
-- Key narrative: Revelation about grandmother, Florencia's unspoken regret

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
            "scene_id": "ep5_scene1",
            "scene_number": 1,
            "florencia_says": "Este es el Cementerio de la Chacarita. Es el cementerio más grande de Buenos Aires, donde descansan los artistas, poetas, y leyendas del tango.",
            "florencia_says_en": "This is the Chacarita Cemetery. It is the largest cemetery in Buenos Aires, where artists, poets, and tango legends rest.",
            "response_type": "listen_only",
            "emotion": "solemn",
            "audio_key": "ep5_s1_florencia",
            "cultural_context": "Cementerio de la Chacarita is Buenos Aires'' great popular necropolis, where Carlos Gardel, Carlos Di Sarli, and other cultural icons are buried."
        },
        {
            "scene_id": "ep5_scene2",
            "scene_number": 2,
            "florencia_says": "Aquí está la tumba de Carlos Gardel — el mismo que viste en las fotos del Café Tortoni. Y más allá, Carlos Di Sarli, el compositor de ''Soñemos.''",
            "florencia_says_en": "Here is the tomb of Carlos Gardel — the same one you saw in the photos at Café Tortoni. And over there, Carlos Di Sarli, the composer of ''Soñemos.''",
            "user_says": "Es un honor estar en el mismo lugar donde descansan estas leyendas.",
            "user_says_en": "It is an honor to be in the same place where these legends rest.",
            "response_type": "scripted",
            "emotion": "reverent",
            "audio_key": "ep5_s2_florencia"
        },
        {
            "scene_id": "ep5_scene3",
            "scene_number": 3,
            "florencia_says": "Hay otra razón por la que te traje aquí. Mi abuela... ella también está aquí.",
            "florencia_says_en": "There is another reason why I brought you here. My grandmother... she is also here.",
            "response_type": "listen_only",
            "emotion": "vulnerable",
            "audio_key": "ep5_s3_florencia"
        },
        {
            "scene_id": "ep5_scene4",
            "scene_number": 4,
            "florencia_says": "Sé que siempre hablo de ella como si estuviera viva. Es porque, para mí, ella vive a través del tango. Su memoria vive cuando bailo.",
            "florencia_says_en": "I know I always talk about her as if she were alive. It is because, for me, she lives through tango. Her memory lives when I dance.",
            "user_says": "No sabía. Si hubiera sabido, no habría preguntado tanto.",
            "user_says_en": "I did not know. If I had known, I would not have asked so much.",
            "response_type": "scripted",
            "emotion": "tender",
            "audio_key": "ep5_s4_florencia"
        },
        {
            "scene_id": "ep5_scene5",
            "scene_number": 5,
            "florencia_says": "Usaste el subjuntivo pluscuamperfecto perfectamente: ''Si hubiera sabido, no habría preguntado.'' Es para hablar de situaciones hipotéticas en el pasado.",
            "florencia_says_en": "You used the pluperfect subjunctive perfectly: ''If I had known, I would not have asked.'' It is for talking about hypothetical situations in the past.",
            "response_type": "listen_only",
            "emotion": "appreciative",
            "audio_key": "ep5_s5_florencia"
        },
        {
            "scene_id": "ep5_scene6",
            "scene_number": 6,
            "florencia_says": "Mi abuela se llamaba Valentina Reyes. Era cantante y bailarina durante la época de oro del tango. Le habían ofrecido un papel principal en el Teatro Colón.",
            "florencia_says_en": "My grandmother was named Valentina Reyes. She was a singer and dancer during the Golden Age of tango. They had offered her a leading role at Teatro Colón.",
            "user_says": "¿Y qué pasó?",
            "user_says_en": "And what happened?",
            "response_type": "scripted",
            "emotion": "nostalgic",
            "audio_key": "ep5_s6_florencia"
        },
        {
            "scene_id": "ep5_scene7",
            "scene_number": 7,
            "florencia_says": "Eligió la familia. Estaba embarazada de mi mamá. Siempre me pregunto: si ella hubiera aceptado ese papel, ¿habría sido más feliz? ¿O fue la decisión correcta?",
            "florencia_says_en": "She chose family. She was pregnant with my mom. I always wonder: if she had accepted that role, would she have been happier? Or was it the right decision?",
            "response_type": "listen_only",
            "emotion": "wistful",
            "audio_key": "ep5_s7_florencia"
        },
        {
            "scene_id": "ep5_scene8",
            "scene_number": 8,
            "florencia_says": "Ella nunca se arrepintió. Pero yo... a veces me pregunto si hubiera tenido el mismo coraje que ella.",
            "florencia_says_en": "She never regretted it. But I... sometimes I wonder if I would have had the same courage as her.",
            "user_says": "¿Querés ser artista como tu abuela?",
            "user_says_en": "Do you want to be an artist like your grandmother?",
            "response_type": "scripted",
            "emotion": "vulnerable",
            "audio_key": "ep5_s8_florencia"
        },
        {
            "scene_id": "ep5_scene9",
            "scene_number": 9,
            "florencia_says": "Sí. Pero... es complicado. Hace unos años, me ofrecieron un lugar en una compañía de tango. Ojalá hubiera tenido el valor de aceptar.",
            "florencia_says_en": "Yes. But... it is complicated. A few years ago, they offered me a spot in a tango company. I wish I had had the courage to accept.",
            "response_type": "listen_only",
            "emotion": "regretful",
            "audio_key": "ep5_s9_florencia"
        },
        {
            "scene_id": "ep5_scene10",
            "scene_number": 10,
            "florencia_says": "Mi abuela eligió el amor. Yo... todavía no sé qué elegí. Quizás el miedo.",
            "florencia_says_en": "My grandmother chose love. I... still do not know what I chose. Maybe fear.",
            "user_says": "Todavía tenés tiempo. Nunca es tarde para seguir tus sueños.",
            "user_says_en": "You still have time. It is never too late to follow your dreams.",
            "response_type": "scripted",
            "emotion": "sad",
            "audio_key": "ep5_s10_florencia"
        },
        {
            "scene_id": "ep5_scene11",
            "scene_number": 11,
            "florencia_says": "Gracias. Pero... es suficiente por hoy. Este lugar me pone muy emocional.",
            "florencia_says_en": "Thank you. But... that is enough for today. This place makes me very emotional.",
            "response_type": "listen_only",
            "emotion": "withdrawn",
            "audio_key": "ep5_s11_florencia"
        },
        {
            "scene_id": "ep5_scene12",
            "scene_number": 12,
            "florencia_says": "Nos vemos la próxima vez. Vamos al Teatro Colón — el lugar donde mi abuela casi hizo historia.",
            "florencia_says_en": "I will see you next time. We are going to Teatro Colón — the place where my grandmother almost made history.",
            "response_type": "listen_only",
            "emotion": "mysterious",
            "audio_key": "ep5_s12_florencia"
        }
    ]'::jsonb,
    estimated_duration = 2
    WHERE episode_number = 5 AND story_arc_id = v_arc_id
    RETURNING id INTO v_episode_id;
    
    RAISE NOTICE 'Updated Episode 5 with ID: %', v_episode_id;
END $$;

