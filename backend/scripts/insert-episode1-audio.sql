-- Insert Episode 1 audio records into pre_generated_audio table
-- Run this in Supabase SQL Editor after running the audio generation script

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

-- Verify the inserts
SELECT content_key, emotion, LENGTH(audio_url) as url_length FROM public.pre_generated_audio WHERE content_key LIKE 'ep1_%';

