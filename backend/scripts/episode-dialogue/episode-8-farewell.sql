-- Episode 8: Farewell at Café Tortoni - Piercing Through the Illusions
-- Grammar Focus: All Subjunctive Grammar (comprehensive review)
-- Runtime: ~2 minutes total audio
-- Characters: Florencia, User, Waiter
-- Key narrative: Full circle, gift reveal, bittersweet farewell

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
            "scene_id": "ep8_scene1",
            "scene_number": 1,
            "florencia_says": "El usuario entra al Café Tortoni. La canción ''Soñemos'' de Carlos Di Sarli suena suavemente en el fondo...",
            "florencia_says_en": "The user enters Café Tortoni. The song ''Soñemos'' by Carlos Di Sarli plays softly in the background...",
            "response_type": "listen_only",
            "emotion": "narrative",
            "audio_key": "ep8_s1_narrator",
            "cultural_context": "We return to where it all began — Café Tortoni, where the eight-week journey started."
        },
        {
            "scene_id": "ep8_scene2",
            "scene_number": 2,
            "waiter_says": "¡Bienvenido de nuevo! ¿Le gustaría ordenar algo?",
            "waiter_says_en": "Welcome back! Would you like to order something?",
            "user_says": "Sí, me gustaría que me traiga dos cafés con leche, por favor.",
            "user_says_en": "Yes, I would like you to bring me two cafés con leche, please.",
            "response_type": "scripted",
            "emotion": "friendly",
            "audio_key": "ep8_s2_waiter"
        },
        {
            "scene_id": "ep8_scene3",
            "scene_number": 3,
            "waiter_says": "¡Perfecto! Su español ha mejorado muchísimo desde la primera vez que vino.",
            "waiter_says_en": "Perfect! Your Spanish has improved so much since the first time you came.",
            "florencia_says": "El mozo tiene razón. Tu español es impresionante ahora.",
            "florencia_says_en": "The waiter is right. Your Spanish is impressive now.",
            "response_type": "listen_only",
            "emotion": "proud",
            "audio_key": "ep8_s3_waiter"
        },
        {
            "scene_id": "ep8_scene4",
            "scene_number": 4,
            "florencia_says": "Perdón por llegar tarde. Los argentinos siempre llegamos un poco después de la hora acordada. Es parte de nuestra cultura.",
            "florencia_says_en": "Sorry for arriving late. Argentines always arrive a little after the agreed time. It is part of our culture.",
            "user_says": "Está bien. Me dio tiempo para pensar en estas ocho semanas.",
            "user_says_en": "It is okay. It gave me time to think about these eight weeks.",
            "response_type": "scripted",
            "emotion": "apologetic",
            "audio_key": "ep8_s4_florencia"
        },
        {
            "scene_id": "ep8_scene5",
            "scene_number": 5,
            "florencia_says": "Y yo he pensado mucho en todo lo que hemos vivido juntos. ¿Te acordás de lo que te prometí el primer día?",
            "florencia_says_en": "And I have thought a lot about everything we have lived together. Do you remember what I promised you on the first day?",
            "user_says": "Prometiste que me abrirías las puertas a una nueva realidad.",
            "user_says_en": "You promised that you would open the doors to a new reality for me.",
            "response_type": "scripted",
            "emotion": "reflective",
            "audio_key": "ep8_s5_florencia"
        },
        {
            "scene_id": "ep8_scene6",
            "scene_number": 6,
            "florencia_says": "¿Y lo cumplí? ¿Sientes que has entrado en una nueva realidad?",
            "florencia_says_en": "And did I fulfill it? Do you feel that you have entered a new reality?",
            "user_says": "Sí. Creo que has cumplido tu promesa.",
            "user_says_en": "Yes. I believe you have kept your promise.",
            "response_type": "scripted",
            "emotion": "hopeful",
            "audio_key": "ep8_s6_florencia"
        },
        {
            "scene_id": "ep8_scene7",
            "scene_number": 7,
            "florencia_says": "Tu viaje de ocho semanas está llegando a su fin. ¿La pasaste bien en Buenos Aires?",
            "florencia_says_en": "Your eight-week trip is coming to an end. Did you have a good time in Buenos Aires?",
            "user_says": "Fue mejor de lo que hubiera imaginado. Todo gracias a vos, Florencia.",
            "user_says_en": "It was better than I would have imagined. All thanks to you, Florencia.",
            "response_type": "scripted",
            "emotion": "tender",
            "audio_key": "ep8_s7_florencia"
        },
        {
            "scene_id": "ep8_scene8",
            "scene_number": 8,
            "florencia_says": "Tengo algo para vos. ¿Te acordás del día en San Telmo, cuando desaparecí un rato?",
            "florencia_says_en": "I have something for you. Do you remember the day at San Telmo, when I disappeared for a while?",
            "user_says": "Sí, dijiste que habías comprado algo pero que era un secreto.",
            "user_says_en": "Yes, you said you had bought something but it was a secret.",
            "response_type": "scripted",
            "emotion": "playful",
            "audio_key": "ep8_s8_florencia"
        },
        {
            "scene_id": "ep8_scene9",
            "scene_number": 9,
            "florencia_says": "Compré esto para vos. Es un mate. Así vas a poder recordar Buenos Aires... y la primera vez que tomamos mate juntos en el asado de mi familia.",
            "florencia_says_en": "I bought this for you. It is a mate. This way you will be able to remember Buenos Aires... and the first time we drank mate together at my family''s asado.",
            "user_says": "Es hermoso. Lo voy a cuidar como si fuera un tesoro.",
            "user_says_en": "It is beautiful. I am going to treasure it as if it were a treasure.",
            "response_type": "scripted",
            "emotion": "emotional",
            "audio_key": "ep8_s9_florencia"
        },
        {
            "scene_id": "ep8_scene10",
            "scene_number": 10,
            "florencia_says": "Y ahora... ¿qué vas a hacer?",
            "florencia_says_en": "And now... what are you going to do?",
            "user_says": "Estuve pensando mucho en eso y todavía no estoy seguro.",
            "user_says_en": "I have been thinking a lot about that and I am still not sure.",
            "response_type": "scripted",
            "emotion": "curious",
            "audio_key": "ep8_s10_florencia"
        },
        {
            "scene_id": "ep8_scene11",
            "scene_number": 11,
            "florencia_says": "Escuchá a tu corazón. Lo que sientas siempre será real.",
            "florencia_says_en": "Listen to your heart. What you feel will always be real.",
            "response_type": "listen_only",
            "emotion": "wise",
            "audio_key": "ep8_s11_florencia"
        },
        {
            "scene_id": "ep8_scene12",
            "scene_number": 12,
            "florencia_says": "Escuchá... ''Soñemos'' está terminando. Pero los sueños que compartimos... esos no tienen que terminar nunca.",
            "florencia_says_en": "Listen... ''Soñemos'' is ending. But the dreams we shared... those never have to end.",
            "user_says": "Ojalá que nos volvamos a ver.",
            "user_says_en": "I hope that we will see each other again.",
            "response_type": "scripted",
            "emotion": "hopeful_ending",
            "audio_key": "ep8_s12_florencia"
        },
        {
            "scene_id": "ep8_scene13",
            "scene_number": 13,
            "florencia_says": "Hasta pronto. Y recordá: siempre que tomes mate, estarás un poco en Buenos Aires... y un poco conmigo.",
            "florencia_says_en": "See you soon. And remember: whenever you drink mate, you will be a little in Buenos Aires... and a little with me.",
            "response_type": "listen_only",
            "emotion": "bittersweet",
            "audio_key": "ep8_s13_florencia"
        }
    ]'::jsonb,
    estimated_duration = 2
    WHERE episode_number = 8 AND story_arc_id = v_arc_id
    RETURNING id INTO v_episode_id;
    
    RAISE NOTICE 'Updated Episode 8 with ID: %', v_episode_id;
END $$;

