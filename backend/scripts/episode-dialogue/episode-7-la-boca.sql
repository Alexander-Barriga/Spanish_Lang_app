-- Episode 7: La Boca - Immigrant Hardship, Beauty, and Revealed Truths
-- Grammar Focus: Imperfect Subjunctive (distinct applications from Episode 6)
-- Runtime: ~2 minutes total audio
-- Characters: Florencia, User
-- Key narrative: The kiss scene, illusion becomes reality

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
            "scene_id": "ep7_scene1",
            "scene_number": 1,
            "florencia_says": "Bienvenido a La Boca, uno de los barrios más coloridos de Buenos Aires. Estas casas pintadas son el símbolo del barrio.",
            "florencia_says_en": "Welcome to La Boca, one of the most colorful neighborhoods of Buenos Aires. These painted houses are the symbol of the neighborhood.",
            "response_type": "listen_only",
            "emotion": "lively",
            "audio_key": "ep7_s1_florencia",
            "cultural_context": "La Boca is a working-class immigrant port neighborhood where tango, football, and Buenos Aires'' popular identity took shape before being exported to the world."
        },
        {
            "scene_id": "ep7_scene2",
            "scene_number": 2,
            "florencia_says": "¿Sabés por qué las casas son tan coloridas? Los inmigrantes usaban pintura sobrante de los barcos. La belleza nació de la necesidad económica.",
            "florencia_says_en": "Do you know why the houses are so colorful? The immigrants used leftover paint from ships. Beauty was born from economic necessity.",
            "user_says": "Es como si la pobreza se hubiera transformado en arte.",
            "user_says_en": "It is as if poverty had transformed into art.",
            "response_type": "scripted",
            "emotion": "informative",
            "audio_key": "ep7_s2_florencia"
        },
        {
            "scene_id": "ep7_scene3",
            "scene_number": 3,
            "florencia_says": "Exactamente. ''Como si la pobreza se hubiera transformado'' — combinaste el imperfecto del subjuntivo con el pluscuamperfecto. ¡Excelente!",
            "florencia_says_en": "Exactly. ''As if poverty had transformed'' — you combined the imperfect subjunctive with the pluperfect. Excellent!",
            "response_type": "listen_only",
            "emotion": "impressed",
            "audio_key": "ep7_s3_florencia"
        },
        {
            "scene_id": "ep7_scene4",
            "scene_number": 4,
            "florencia_says": "Los artistas usan la belleza para crear ilusiones. Eso es lo que dije en el Teatro Colón, ¿te acordás?",
            "florencia_says_en": "Artists use beauty to create illusions. That is what I said at Teatro Colón, do you remember?",
            "user_says": "Sí, me acuerdo. También dijiste que sos una artista.",
            "user_says_en": "Yes, I remember. You also said that you are an artist.",
            "response_type": "scripted",
            "emotion": "reflective",
            "audio_key": "ep7_s4_florencia"
        },
        {
            "scene_id": "ep7_scene5",
            "scene_number": 5,
            "florencia_says": "Es verdad. Y como artista, a veces creo ilusiones. Pero a veces... a veces la ilusión se vuelve algo más.",
            "florencia_says_en": "It is true. And as an artist, sometimes I create illusions. But sometimes... sometimes the illusion becomes something more.",
            "user_says": "¿Estás creando alguna ilusión ahora, Florencia?",
            "user_says_en": "Are you creating an illusion now, Florencia?",
            "response_type": "scripted",
            "emotion": "vulnerable",
            "audio_key": "ep7_s5_florencia"
        },
        {
            "scene_id": "ep7_scene6",
            "scene_number": 6,
            "florencia_says": "¿Quién puede saberlo con certeza? A veces la línea entre la realidad y la ilusión es tan difusa que se vuelven una misma cosa.",
            "florencia_says_en": "Who can know for certain? Sometimes the line between reality and illusion is so blurred that they become one and the same.",
            "response_type": "listen_only",
            "emotion": "mysterious",
            "audio_key": "ep7_s6_florencia"
        },
        {
            "scene_id": "ep7_scene7",
            "scene_number": 7,
            "florencia_says": "Decime... ¿qué sentís que es real?",
            "florencia_says_en": "Tell me... what do you feel is real?",
            "user_says": "Esto. Este momento. Vos.",
            "user_says_en": "This. This moment. You.",
            "response_type": "scripted",
            "emotion": "intimate",
            "audio_key": "ep7_s7_florencia"
        },
        {
            "scene_id": "ep7_scene8",
            "scene_number": 8,
            "florencia_says": "...",
            "florencia_says_en": "...",
            "response_type": "listen_only",
            "emotion": "silent_tension",
            "audio_key": "ep7_s8_kiss"
        },
        {
            "scene_id": "ep7_scene9",
            "scene_number": 9,
            "florencia_says": "A veces las ilusiones pueden ser tan reales como la realidad. A veces es simplemente una cuestión de elección.",
            "florencia_says_en": "Sometimes illusions can be as real as reality. Sometimes it is simply a matter of choice.",
            "response_type": "listen_only",
            "emotion": "tender",
            "audio_key": "ep7_s9_florencia"
        },
        {
            "scene_id": "ep7_scene10",
            "scene_number": 10,
            "florencia_says": "Si me hubieras preguntado hace ocho semanas si esto iba a pasar, no lo habría creído.",
            "florencia_says_en": "If you had asked me eight weeks ago if this was going to happen, I would not have believed it.",
            "user_says": "Yo tampoco. Pero me alegro de que haya pasado.",
            "user_says_en": "Me neither. But I am glad that it happened.",
            "response_type": "scripted",
            "emotion": "warm",
            "audio_key": "ep7_s10_florencia"
        },
        {
            "scene_id": "ep7_scene11",
            "scene_number": 11,
            "florencia_says": "Vení, sigamos caminando. La Boca tiene muchos más secretos que mostrarte. Y quizás... quizás yo también tenga algunos más.",
            "florencia_says_en": "Come, let''s keep walking. La Boca has many more secrets to show you. And maybe... maybe I have some more too.",
            "response_type": "listen_only",
            "emotion": "playful",
            "audio_key": "ep7_s11_florencia"
        },
        {
            "scene_id": "ep7_scene12",
            "scene_number": 12,
            "florencia_says": "La próxima vez que nos veamos, será nuestra última clase. Volvemos al Café Tortoni, donde todo empezó.",
            "florencia_says_en": "The next time we meet, it will be our last class. We return to Café Tortoni, where everything began.",
            "user_says": "Ojalá este viaje no terminara nunca.",
            "user_says_en": "I wish this journey would never end.",
            "response_type": "scripted",
            "emotion": "bittersweet",
            "audio_key": "ep7_s12_florencia"
        }
    ]'::jsonb,
    estimated_duration = 2
    WHERE episode_number = 7 AND story_arc_id = v_arc_id
    RETURNING id INTO v_episode_id;
    
    RAISE NOTICE 'Updated Episode 7 with ID: %', v_episode_id;
END $$;

