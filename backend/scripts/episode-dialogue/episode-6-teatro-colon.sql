-- Episode 6: Teatro Colón - High Culture and the Illusions of the Artist
-- Grammar Focus: Imperfect Subjunctive (various applications)
-- Runtime: ~2 minutes total audio
-- Characters: Florencia, User
-- Key narrative: Artist's illusions, Florencia's true nature revealed

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
            "scene_id": "ep6_scene1",
            "scene_number": 1,
            "florencia_says": "Bienvenido al Teatro Colón, uno de los teatros de ópera más famosos del mundo. Esta noche hay un espectáculo de tango muy especial.",
            "florencia_says_en": "Welcome to Teatro Colón, one of the most famous opera houses in the world. Tonight there is a very special tango show.",
            "response_type": "listen_only",
            "emotion": "elegant",
            "audio_key": "ep6_s1_florencia",
            "cultural_context": "Teatro Colón embodies Argentina''s aspiration toward European high culture. Tango''s presence on its stage marks the nation''s embrace of its own popular, immigrant-born art form."
        },
        {
            "scene_id": "ep6_scene2",
            "scene_number": 2,
            "florencia_says": "¿Te gusta mi vestido? Es rojo, como la pasión del tango. Mi abuela siempre decía que una bailarina debería vestirse como si fuera la última noche de su vida.",
            "florencia_says_en": "Do you like my dress? It is red, like the passion of tango. My grandmother always said that a dancer should dress as if it were the last night of her life.",
            "user_says": "Estás hermosa. Parece como si fueras una estrella del tango.",
            "user_says_en": "You are beautiful. It seems as if you were a tango star.",
            "response_type": "scripted",
            "emotion": "flirtatious",
            "audio_key": "ep6_s2_florencia"
        },
        {
            "scene_id": "ep6_scene3",
            "scene_number": 3,
            "florencia_says": "Gracias. Usaste el imperfecto del subjuntivo: ''como si fueras.'' Es perfecto para describir situaciones imaginarias o que parecen irreales.",
            "florencia_says_en": "Thank you. You used the imperfect subjunctive: ''as if you were.'' It is perfect for describing imaginary situations or ones that seem unreal.",
            "response_type": "listen_only",
            "emotion": "teaching",
            "audio_key": "ep6_s3_florencia"
        },
        {
            "scene_id": "ep6_scene4",
            "scene_number": 4,
            "florencia_says": "¿Sabés? El tango nació en los conventillos, los barrios pobres de inmigrantes. Era la música de la gente humilde. Y ahora está aquí, en el teatro más elegante de Argentina.",
            "florencia_says_en": "You know? Tango was born in the conventillos, the poor immigrant neighborhoods. It was the music of humble people. And now it is here, in the most elegant theater of Argentina.",
            "user_says": "Es increíble cómo algo tan humilde llegara tan lejos.",
            "user_says_en": "It is incredible how something so humble could reach so far.",
            "response_type": "scripted",
            "emotion": "reflective",
            "audio_key": "ep6_s4_florencia"
        },
        {
            "scene_id": "ep6_scene5",
            "scene_number": 5,
            "florencia_says": "Las cosas no siempre son lo que parecen a primera vista. El tango parece pasión pura, pero detrás hay años de disciplina, sacrificio, y lágrimas.",
            "florencia_says_en": "Things are not always what they seem at first glance. Tango looks like pure passion, but behind it are years of discipline, sacrifice, and tears.",
            "response_type": "listen_only",
            "emotion": "mysterious",
            "audio_key": "ep6_s5_florencia"
        },
        {
            "scene_id": "ep6_scene6",
            "scene_number": 6,
            "florencia_says": "Los artistas crean ilusiones. Usamos la belleza para transportar al público a otra realidad. Una realidad que inspira el corazón y la mente.",
            "florencia_says_en": "Artists create illusions. We use beauty to transport the audience to another reality. A reality that inspires the heart and mind.",
            "user_says": "Hablás como si fueras una artista.",
            "user_says_en": "You speak as if you were an artist.",
            "response_type": "scripted",
            "emotion": "profound",
            "audio_key": "ep6_s6_florencia"
        },
        {
            "scene_id": "ep6_scene7",
            "scene_number": 7,
            "florencia_says": "¿Y si te dijera que lo soy? Como mi abuela antes que yo, soy una artista. El tango es mi lenguaje, mi forma de hablar con el mundo.",
            "florencia_says_en": "And what if I told you that I am? Like my grandmother before me, I am an artist. Tango is my language, my way of speaking with the world.",
            "response_type": "listen_only",
            "emotion": "revelatory",
            "audio_key": "ep6_s7_florencia"
        },
        {
            "scene_id": "ep6_scene8",
            "scene_number": 8,
            "florencia_says": "En el escenario, los bailarines muestran pasión, seducción, amor tormentoso. Permitimos que el público olvide que es una ilusión, porque todos anhelamos creer en algo bello.",
            "florencia_says_en": "On stage, the dancers show passion, seduction, tormented love. We allow the audience to forget that it is an illusion, because we all long to believe in something beautiful.",
            "user_says": "¿Entonces todo esto es una ilusión?",
            "user_says_en": "So all of this is an illusion?",
            "response_type": "scripted",
            "emotion": "poetic",
            "audio_key": "ep6_s8_florencia"
        },
        {
            "scene_id": "ep6_scene9",
            "scene_number": 9,
            "florencia_says": "Eso depende de vos. A veces la línea entre la realidad y la ilusión es tan fina que se vuelven lo mismo. ¿Qué sentís que es real?",
            "florencia_says_en": "That depends on you. Sometimes the line between reality and illusion is so thin that they become the same. What do you feel is real?",
            "response_type": "listen_only",
            "emotion": "intimate",
            "audio_key": "ep6_s9_florencia"
        },
        {
            "scene_id": "ep6_scene10",
            "scene_number": 10,
            "florencia_says": "Mirá, las luces se están apagando. El espectáculo va a comenzar. Disfrutemos de los sueños que los artistas crean para nosotros.",
            "florencia_says_en": "Look, the lights are dimming. The show is about to begin. Let''s enjoy the dreams that the artists create for us.",
            "user_says": "Ojalá pudiera entender qué es real y qué no lo es.",
            "user_says_en": "I wish I could understand what is real and what is not.",
            "response_type": "scripted",
            "emotion": "dramatic",
            "audio_key": "ep6_s10_florencia"
        },
        {
            "scene_id": "ep6_scene11",
            "scene_number": 11,
            "florencia_says": "''Ojalá pudiera'' — usaste el imperfecto del subjuntivo para expresar un deseo difícil de cumplir. Muy bien.",
            "florencia_says_en": "''I wish I could'' — you used the imperfect subjunctive to express a wish that is difficult to fulfill. Very good.",
            "response_type": "listen_only",
            "emotion": "approving",
            "audio_key": "ep6_s11_florencia"
        },
        {
            "scene_id": "ep6_scene12",
            "scene_number": 12,
            "florencia_says": "Escuchá... están tocando ''Soñemos.'' Parece que esa canción nos sigue a todos lados. Quizás es una señal.",
            "florencia_says_en": "Listen... they are playing ''Soñemos.'' It seems that song follows us everywhere. Maybe it is a sign.",
            "response_type": "listen_only",
            "emotion": "dreamy",
            "audio_key": "ep6_s12_florencia"
        }
    ]'::jsonb,
    estimated_duration = 2
    WHERE episode_number = 6 AND story_arc_id = v_arc_id
    RETURNING id INTO v_episode_id;
    
    RAISE NOTICE 'Updated Episode 6 with ID: %', v_episode_id;
END $$;

