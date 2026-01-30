-- Episode 2: Milonga en Salón Marabú - Introduction to Tango
-- Grammar Focus: Present Subjunctive (expressing emotion)
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
            "scene_id": "ep2_scene1",
            "scene_number": 1,
            "florencia_says": "Bienvenido a Salón Marabú. Este lugar tiene casi cien años de historia. Aquí tocaron las orquestas más famosas del tango — Aníbal Troilo, Osvaldo Pugliese, y por supuesto, Carlos Di Sarli.",
            "florencia_says_en": "Welcome to Salón Marabú. This place has almost one hundred years of history. The most famous tango orchestras played here — Aníbal Troilo, Osvaldo Pugliese, and of course, Carlos Di Sarli.",
            "response_type": "listen_only",
            "emotion": "reverent",
            "audio_key": "ep2_s1_florencia",
            "cultural_context": "Salón Marabú is one of Buenos Aires'' historic milongas (tango dance halls) from the Golden Age of Tango in the 1940s-50s."
        },
        {
            "scene_id": "ep2_scene2",
            "scene_number": 2,
            "florencia_says": "Mirá a los bailarines. El tango es un diálogo entre dos personas. Hay un líder y un seguidor, pero los dos escuchan la música y se escuchan entre sí.",
            "florencia_says_en": "Look at the dancers. Tango is a dialogue between two people. There is a leader and a follower, but both listen to the music and listen to each other.",
            "user_says": "Es increíble que se muevan con tanta gracia.",
            "user_says_en": "It''s incredible that they move with such grace.",
            "response_type": "scripted",
            "emotion": "passionate",
            "audio_key": "ep2_s2_florencia"
        },
        {
            "scene_id": "ep2_scene3",
            "scene_number": 3,
            "florencia_says": "¡Muy bien! Usaste el subjuntivo para expresar emoción — ''es increíble que se muevan.'' Eso es exactamente lo que quiero que practiques.",
            "florencia_says_en": "Very good! You used the subjunctive to express emotion — ''it''s incredible that they move.'' That''s exactly what I want you to practice.",
            "response_type": "listen_only",
            "emotion": "encouraging",
            "audio_key": "ep2_s3_florencia"
        },
        {
            "scene_id": "ep2_scene4",
            "scene_number": 4,
            "florencia_says": "¿Escuchás esa canción? Es ''Soñemos'' — la misma que escuchamos en el café. La letra dice: ''Soñemos, que la vida es corta y hay que vivirla.''",
            "florencia_says_en": "Do you hear that song? It''s ''Soñemos'' — the same one we heard at the café. The lyrics say: ''Let''s dream, life is short and we must live it.''",
            "response_type": "listen_only",
            "emotion": "dreamy",
            "audio_key": "ep2_s4_florencia"
        },
        {
            "scene_id": "ep2_scene5",
            "scene_number": 5,
            "florencia_says": "¿Te gustaría bailar conmigo?",
            "florencia_says_en": "Would you like to dance with me?",
            "user_says": "Me encantaría, pero no sé bailar tango.",
            "user_says_en": "I would love to, but I don''t know how to dance tango.",
            "response_type": "scripted",
            "emotion": "flirtatious",
            "audio_key": "ep2_s5_florencia"
        },
        {
            "scene_id": "ep2_scene6",
            "scene_number": 6,
            "florencia_says": "No te preocupes. El tango no se aprende con los pies — se aprende con el corazón. Solo tenés que sentir la música y confiar en mí.",
            "florencia_says_en": "Don''t worry. Tango is not learned with the feet — it''s learned with the heart. You just have to feel the music and trust me.",
            "response_type": "listen_only",
            "emotion": "reassuring",
            "audio_key": "ep2_s6_florencia"
        },
        {
            "scene_id": "ep2_scene7",
            "scene_number": 7,
            "florencia_says": "Poné tu mano en mi espalda, así. Ahora, cerrá los ojos. Dejá que la música te guíe.",
            "florencia_says_en": "Put your hand on my back, like this. Now, close your eyes. Let the music guide you.",
            "response_type": "listen_only",
            "emotion": "intimate",
            "audio_key": "ep2_s7_florencia"
        },
        {
            "scene_id": "ep2_scene8",
            "scene_number": 8,
            "florencia_says": "¿Ves? No es tan difícil. Me alegra mucho que te animes a intentarlo.",
            "florencia_says_en": "See? It''s not so hard. I''m so glad that you dare to try it.",
            "user_says": "Es emocionante que pueda bailar tango en Buenos Aires.",
            "user_says_en": "It''s exciting that I can dance tango in Buenos Aires.",
            "response_type": "scripted",
            "emotion": "warm",
            "audio_key": "ep2_s8_florencia"
        },
        {
            "scene_id": "ep2_scene9",
            "scene_number": 9,
            "florencia_says": "¡Excelente uso del subjuntivo! ''Es emocionante que pueda bailar.'' Estás aprendiendo muy rápido.",
            "florencia_says_en": "Excellent use of the subjunctive! ''It''s exciting that I can dance.'' You''re learning very fast.",
            "response_type": "listen_only",
            "emotion": "proud",
            "audio_key": "ep2_s9_florencia"
        },
        {
            "scene_id": "ep2_scene10",
            "scene_number": 10,
            "florencia_says": "Mi abuela me enseñó a bailar tango cuando era chica. Ella bailaba profesionalmente durante la época de oro del tango.",
            "florencia_says_en": "My grandmother taught me to dance tango when I was a little girl. She danced professionally during the Golden Age of tango.",
            "user_says": "Tu abuela debe ser una bailarina increíble.",
            "user_says_en": "Your grandmother must be an incredible dancer.",
            "response_type": "scripted",
            "emotion": "nostalgic",
            "audio_key": "ep2_s10_florencia"
        },
        {
            "scene_id": "ep2_scene11",
            "scene_number": 11,
            "florencia_says": "Lo es. Tal vez algún día te la presente. Pero por ahora, sigamos bailando. La noche es joven y ''Soñemos'' todavía está sonando.",
            "florencia_says_en": "She is. Maybe someday I''ll introduce you to her. But for now, let''s keep dancing. The night is young and ''Soñemos'' is still playing.",
            "response_type": "listen_only",
            "emotion": "mysterious",
            "audio_key": "ep2_s11_florencia"
        },
        {
            "scene_id": "ep2_scene12",
            "scene_number": 12,
            "florencia_says": "Sabés, me sorprende que un principiante baile tan bien. Quizás tenés alma de tanguero.",
            "florencia_says_en": "You know, it surprises me that a beginner dances so well. Maybe you have the soul of a tango dancer.",
            "user_says": "Me hace feliz que pienses eso.",
            "user_says_en": "It makes me happy that you think that.",
            "response_type": "scripted",
            "emotion": "flirtatious",
            "audio_key": "ep2_s12_florencia"
        }
    ]'::jsonb,
    estimated_duration = 2
    WHERE episode_number = 2 AND story_arc_id = v_arc_id
    RETURNING id INTO v_episode_id;
    
    RAISE NOTICE 'Updated Episode 2 with ID: %', v_episode_id;
END $$;

