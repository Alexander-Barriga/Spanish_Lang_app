-- ============================================
-- RESTORE ALL EPISODE AUDIO METADATA
-- Run in Supabase SQL Editor to re-link
-- existing audio files to the database
-- ============================================

-- Episode 1: El Café de la Esquina
INSERT INTO public.pre_generated_audio (content_key, content_type, character_id, text_content, audio_url, emotion)
VALUES 
  ('ep1_s1_arrival', 'scene_dialogue', 'florencia', 
   '¡Hola! Qué bueno que estés aquí. Bienvenido a Buenos Aires. Soy Florencia, sentate, sentate. ¿Querés un café?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-1/ep1_s1_arrival.mp3',
   'warm_welcome'),
  ('ep1_s2_coffee', 'scene_dialogue', 'florencia',
   '¡Perfecto! Acá en Argentina tomamos mucho café. Es importante que pruebes un cortado - es espresso con un poquito de leche. ¿De dónde sos vos?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-1/ep1_s2_coffee.mp3',
   'curious'),
  ('ep1_s2_smalltalk', 'scene_dialogue', 'florencia',
   '¡Muy bien, gracias! Qué lindo que hayas venido a Buenos Aires. Este café, el Tortoni, tiene más de 150 años. Es importante que conozcas su historia. ¿Sabés algo de Argentina?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-1/ep1_s2_smalltalk.mp3',
   'proud'),
  ('ep1_s3_tango', 'scene_dialogue', 'florencia',
   'Mirá, yo soy bailarina de tango. Es mi pasión. Quiero que vengas a una milonga conmigo esta semana. ¿Te gustaría?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-1/ep1_s3_tango.mp3',
   'enthusiastic'),
  ('ep1_s4_tango_yes', 'scene_dialogue', 'florencia',
   '¡Genial! No te preocupes si no sabés bailar. Es necesario que tengas paciencia, nada más. El tango se siente, no se piensa. Te va a encantar.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-1/ep1_s4_tango_yes.mp3',
   'encouraging'),
  ('ep1_s4_tango_nervous', 'scene_dialogue', 'florencia',
   '¡No importa! Quiero que sepas que todos empezamos sin saber nada. Es importante que te relajes y disfrutes. Te voy a enseñar los pasos básicos.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-1/ep1_s4_tango_nervous.mp3',
   'reassuring'),
  ('ep1_s5_closing', 'scene_dialogue', 'florencia',
   'Bueno, fue un placer conocerte. Espero que te guste Buenos Aires tanto como a mí. Nos vemos en la milonga, ¿dale?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-1/ep1_s5_closing.mp3',
   'warm_goodbye')
ON CONFLICT (content_key) DO UPDATE SET
  audio_url = EXCLUDED.audio_url,
  text_content = EXCLUDED.text_content,
  emotion = EXCLUDED.emotion;

-- Episode 2: La Milonga
INSERT INTO public.pre_generated_audio (content_key, content_type, character_id, text_content, audio_url, emotion)
VALUES 
  ('ep2_s1_arrival', 'scene_dialogue', 'florencia',
   '¡Llegaste! Me alegra que hayas venido. Mirá este lugar - esta milonga tiene 80 años de historia. ¿Qué te parece?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-2/ep2_s1_arrival.mp3',
   'excited'),
  ('ep2_s2_lesson', 'scene_dialogue', 'florencia',
   'Vení, te voy a mostrar los pasos básicos. Es importante que escuches la música primero. El tango tiene un ritmo especial. Me alegra que quieras aprender.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-2/ep2_s2_lesson.mp3',
   'patient_teacher'),
  ('ep2_s3_rhythm', 'scene_dialogue', 'florencia',
   'No te preocupes, es normal. Me alegra que seas honesto. Cerrá los ojos y sentí la música en el corazón. El tango es emoción pura.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-2/ep2_s3_rhythm.mp3',
   'encouraging'),
  ('ep2_s3_dance', 'scene_dialogue', 'florencia',
   '¡Dale! Me encanta que tengas entusiasmo. Poné tu mano acá... así. Es triste que mucha gente no conozca el tango verdadero, solo el de las películas.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-2/ep2_s3_dance.mp3',
   'nostalgic'),
  ('ep2_s4_story', 'scene_dialogue', 'florencia',
   'Mi abuela Rosa me enseñó a bailar cuando tenía 6 años. Me emociona que su memoria viva cada vez que bailo. El tango es mi conexión con ella.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-2/ep2_s4_story.mp3',
   'emotional_nostalgic'),
  ('ep2_s5_closing', 'scene_dialogue', 'florencia',
   'Bailaste muy bien para ser tu primera vez. Me alegra que hayas disfrutado. ¿Querés venir al mercado de San Telmo conmigo el domingo?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-2/ep2_s5_closing.mp3',
   'happy')
ON CONFLICT (content_key) DO UPDATE SET audio_url = EXCLUDED.audio_url, text_content = EXCLUDED.text_content, emotion = EXCLUDED.emotion;

-- Episode 3: La Feria de San Telmo
INSERT INTO public.pre_generated_audio (content_key, content_type, character_id, text_content, audio_url, emotion)
VALUES 
  ('ep3_s1_arrival', 'scene_dialogue', 'florencia',
   '¡Bienvenido a la Feria de San Telmo! Es el mercado de antigüedades más grande de Buenos Aires. No creo que encuentres algo así en otro lugar del mundo.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-3/ep3_s1_arrival.mp3',
   'proud'),
  ('ep3_s2_antique', 'scene_dialogue', 'florencia',
   'Mirá estos discos de vinide Gardel. Dudo que sean originales de 1930, pero son hermosos igual. ¿Te gusta la música de Gardel?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-3/ep3_s2_antique.mp3',
   'curious'),
  ('ep3_s3_gardel_intro', 'scene_dialogue', 'florencia',
   '¡Carlos Gardel es el rey del tango! Nació en Francia pero es nuestro. Hay gente que duda que haya existido alguien mejor. Decimos que cada día canta mejor, aunque murió en 1935.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-3/ep3_s3_gardel_intro.mp3',
   'passionate'),
  ('ep3_s3_gardel_fan', 'scene_dialogue', 'florencia',
   '¡Qué bien! Es raro que los extranjeros conozcan a Gardel. Dudo que exista mejor embajador del tango argentino. ¿Cuál es tu canción favorita?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-3/ep3_s3_gardel_fan.mp3',
   'impressed'),
  ('ep3_s4_vendor', 'scene_dialogue', 'florencia',
   'Este vendedor dice que este reloj es de 1890. Dudo que sea tan antiguo, pero es lindo. En las ferias no es seguro que todo sea auténtico, ¿sabés?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-3/ep3_s4_vendor.mp3',
   'skeptical'),
  ('ep3_s5_closing', 'scene_dialogue', 'florencia',
   'Fue un día genial. No creo que haya mejor manera de conocer Buenos Aires que caminando por San Telmo. ¿Querés que te cuente sobre mi familia el próximo encuentro?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-3/ep3_s5_closing.mp3',
   'satisfied')
ON CONFLICT (content_key) DO UPDATE SET audio_url = EXCLUDED.audio_url, text_content = EXCLUDED.text_content, emotion = EXCLUDED.emotion;

-- Episode 4: Asado en Familia
INSERT INTO public.pre_generated_audio (content_key, content_type, character_id, text_content, audio_url, emotion)
VALUES 
  ('ep4_s1_arrival', 'scene_dialogue', 'florencia',
   '¡Pasá, pasá! Bienvenido a mi casa. Mi mamá Elena está preparando el asado. Quiero que la conozcas, es una mujer increíble.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-4/ep4_s1_arrival.mp3',
   'welcoming'),
  ('ep4_s2_elena', 'scene_dialogue', 'florencia',
   'Mamá, este es mi amigo. Necesito que le muestres cómo hacés el chimichurri. ¡Es el mejor de Buenos Aires!',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-4/ep4_s2_elena.mp3',
   'proud'),
  ('ep4_s3_chimichurri', 'scene_dialogue', 'florencia',
   'Mi mamá prefiere que usemos perejil fresco del jardín. Dice que necesita que el chimichurri descanse una hora antes de servir. Es su secreto.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-4/ep4_s3_chimichurri.mp3',
   'sharing_wisdom'),
  ('ep4_s3_house', 'scene_dialogue', 'florencia',
   'Te muestro la casa. Esta es la cocina donde mi abuela Rosa me enseñó a bailar. Quiero que veas las fotos de ella en el living.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-4/ep4_s3_house.mp3',
   'nostalgic'),
  ('ep4_s4_asado', 'scene_dialogue', 'florencia',
   'El asado está listo. En Argentina, preferimos que la carne esté bien cocida, no como en otros países. ¿Vos cómo la querés?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-4/ep4_s4_asado.mp3',
   'hosting'),
  ('ep4_s5_closing', 'scene_dialogue', 'florencia',
   'Qué lindo fue tenerte acá. Mi mamá quiere que vuelvas pronto. Dice que necesita que alguien aprecie su cocina como vos.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-4/ep4_s5_closing.mp3',
   'warm')
ON CONFLICT (content_key) DO UPDATE SET audio_url = EXCLUDED.audio_url, text_content = EXCLUDED.text_content, emotion = EXCLUDED.emotion;

-- Episode 5: La Recoleta
INSERT INTO public.pre_generated_audio (content_key, content_type, character_id, text_content, audio_url, emotion)
VALUES 
  ('ep5_s1_entrance', 'scene_dialogue', 'florencia',
   'Este es el Cementerio de la Recoleta. Cuando era niña, mi abuela me traía acá todos los domingos. Siempre me contaba historias de las personas famosas que están enterradas aquí.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-5/ep5_s1_entrance.mp3',
   'reflective'),
  ('ep5_s2_evita', 'scene_dialogue', 'florencia',
   'Mirá, esta es la tumba de Eva Perón. Evita murió en 1952, pero mientras vivía, ayudó a millones de argentinos pobres. Era una figura muy controversial.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-5/ep5_s2_evita.mp3',
   'respectful'),
  ('ep5_s3_evita_story', 'scene_dialogue', 'florencia',
   'Evita era actriz antes de conocer a Perón. Un día conoció al coronel Perón y todo cambió. Mientras él gobernaba, ella trabajaba con los descamisados - los trabajadores pobres.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-5/ep5_s3_evita_story.mp3',
   'storytelling'),
  ('ep5_s4_memories', 'scene_dialogue', 'florencia',
   'Mi padre siempre decía que los domingos eran sagrados. Mientras mi mamá cocinaba, él escuchaba tangos en la radio. Un día, de repente, tuvo un infarto. Yo tenía solo 20 años.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-5/ep5_s4_memories.mp3',
   'sad_nostalgic'),
  ('ep5_s5_closing', 'scene_dialogue', 'florencia',
   'Este lugar me hace pensar en el pasado. Antes yo era más triste, pero ahora entiendo que la vida continúa. ¿Vamos a tomar un café y hablar de cosas más alegres?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-5/ep5_s5_closing.mp3',
   'hopeful')
ON CONFLICT (content_key) DO UPDATE SET audio_url = EXCLUDED.audio_url, text_content = EXCLUDED.text_content, emotion = EXCLUDED.emotion;

-- Episode 6: Crisis Porteña
INSERT INTO public.pre_generated_audio (content_key, content_type, character_id, text_content, audio_url, emotion)
VALUES 
  ('ep6_s1_cafe', 'scene_dialogue', 'florencia',
   'Perdón si estoy un poco seria hoy. Si tuviera más plata, no tendría que trabajar tanto. A veces siento como si fuera imposible vivir de mi arte.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-6/ep6_s1_cafe.mp3',
   'frustrated'),
  ('ep6_s2_economy', 'scene_dialogue', 'florencia',
   'Si vivieras en Argentina, entenderías. La inflación nos come vivos. Si pudiera irme a Europa, a veces pienso... pero no, este es mi país.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-6/ep6_s2_economy.mp3',
   'conflicted'),
  ('ep6_s3_support', 'scene_dialogue', 'florencia',
   'Gracias, eso significa mucho. Si todos fueran tan comprensivos como vos... A veces me siento como si nadie entendiera lo difícil que es ser artista acá.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-6/ep6_s3_support.mp3',
   'touched'),
  ('ep6_s3_stay_go', 'scene_dialogue', 'florencia',
   'No sé. Si me fuera, extrañaría todo: el mate, las milongas, mi mamá. Pero si me quedara sin cambiar nada, seguiría igual de frustrada. Es como si no hubiera solución perfecta.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-6/ep6_s3_stay_go.mp3',
   'torn'),
  ('ep6_s4_hope', 'scene_dialogue', 'florencia',
   'Pero sabés qué, si no tuviera esperanza, no seguiría bailando. El tango me salva. Quisiera que vieras mi show este viernes. ¿Vendrías?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-6/ep6_s4_hope.mp3',
   'hopeful')
ON CONFLICT (content_key) DO UPDATE SET audio_url = EXCLUDED.audio_url, text_content = EXCLUDED.text_content, emotion = EXCLUDED.emotion;

-- Episode 7: La Boca Colorida
INSERT INTO public.pre_generated_audio (content_key, content_type, character_id, text_content, audio_url, emotion)
VALUES 
  ('ep7_s1_caminito', 'scene_dialogue', 'florencia',
   '¡Bienvenido a La Boca! Este es el Caminito, el lugar más colorido de Buenos Aires. ¿Te gustaría sacar fotos? Podríamos caminar un rato.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-7/ep7_s1_caminito.mp3',
   'cheerful'),
  ('ep7_s2_bombonera', 'scene_dialogue', 'florencia',
   'Este es el estadio de Boca Juniors, La Bombonera. Mi papá era hincha fanático. Él diría que este es el lugar más sagrado de Argentina. ¿Te gusta el fútbol?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-7/ep7_s2_bombonera.mp3',
   'nostalgic_proud'),
  ('ep7_s3_fan', 'scene_dialogue', 'florencia',
   '¡Tendrías que venir un domingo de superclásico! El ambiente sería algo que nunca olvidarías. Boca contra River es más que fútbol, es pasión pura.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-7/ep7_s3_fan.mp3',
   'excited'),
  ('ep7_s3_culture', 'scene_dialogue', 'florencia',
   'El fútbol acá es religión. Podrías decir que cada barrio tiene su equipo. Mi papá decía que sin Boca, la vida no tendría sentido. Era su forma de conectar con otros.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-7/ep7_s3_culture.mp3',
   'explaining'),
  ('ep7_s4_artists', 'scene_dialogue', 'florencia',
   'Mirá estos artistas callejeros. Me encantaría poder vivir del arte así de libre. Tendría que ser muy valiente para dejarlo todo y pintar en la calle.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-7/ep7_s4_artists.mp3',
   'dreaming'),
  ('ep7_s5_closing', 'scene_dialogue', 'florencia',
   'Fue un día hermoso. El próximo encuentro sería el último antes de que te vayas. ¿Te gustaría que nos despidiéramos en mi lugar favorito de Buenos Aires?',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-7/ep7_s5_closing.mp3',
   'bittersweet')
ON CONFLICT (content_key) DO UPDATE SET audio_url = EXCLUDED.audio_url, text_content = EXCLUDED.text_content, emotion = EXCLUDED.emotion;

-- Episode 8: Despedida
INSERT INTO public.pre_generated_audio (content_key, content_type, character_id, text_content, audio_url, emotion)
VALUES 
  ('ep8_s1_rooftop', 'scene_dialogue', 'florencia',
   'Bienvenido a mi lugar secreto. Desde esta terraza se ve todo Buenos Aires. Es importante que veas esto antes de irte. Me alegra que hayas venido.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-8/ep8_s1_rooftop.mp3',
   'warm_nostalgic'),
  ('ep8_s2_reflection', 'scene_dialogue', 'florencia',
   '¿Sabés qué? Cuando te conocí en el café, no pensé que nos íbamos a hacer tan amigos. Me sorprende que el tiempo haya pasado tan rápido.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-8/ep8_s2_reflection.mp3',
   'touched'),
  ('ep8_s3_lessons', 'scene_dialogue', 'florencia',
   'Espero que nunca olvides lo que aprendiste acá. El tango, el asado, las historias... Quiero que lleves un pedacito de Argentina con vos a donde vayas.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-8/ep8_s3_lessons.mp3',
   'earnest'),
  ('ep8_s4_gratitude', 'scene_dialogue', 'florencia',
   'Vos también cambiaste mi vida. Me hiciste ver que puedo compartir mi cultura y mi historia. Si pudiera, detendría el tiempo ahora mismo.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-8/ep8_s4_gratitude.mp3',
   'emotional'),
  ('ep8_s4_future', 'scene_dialogue', 'florencia',
   'Definitivamente. Es posible que algún día yo viaje a tu país, o que vos vuelvas a Buenos Aires. Dudo que esta sea la última vez que nos veamos.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-8/ep8_s4_future.mp3',
   'hopeful'),
  ('ep8_s5_goodbye', 'scene_dialogue', 'florencia',
   'Bueno, llegó el momento. No me gustan las despedidas largas. Solo quiero que sepas que te voy a extrañar. Cuidate mucho, ¿dale? Y practicá tu español.',
   'https://bqlnhmsskcnbinexmnra.supabase.co/storage/v1/object/public/episode-audio/episode-8/ep8_s5_goodbye.mp3',
   'bittersweet_loving')
ON CONFLICT (content_key) DO UPDATE SET audio_url = EXCLUDED.audio_url, text_content = EXCLUDED.text_content, emotion = EXCLUDED.emotion;

-- Verify the restoration
SELECT 
  SUBSTRING(content_key, 1, 4) as episode,
  COUNT(*) as audio_count
FROM public.pre_generated_audio 
WHERE content_key LIKE 'ep%'
GROUP BY SUBSTRING(content_key, 1, 4)
ORDER BY episode;

