-- Seed workouts table with diverse training programs
INSERT INTO workouts (id, title, category, environment, duration_min, difficulty, goal, equipment_needed, calories_burned_est, is_basic, is_premium, tags) VALUES
  -- FREE WORKOUTS (is_basic = true)
  ('a1b2c3d4-1111-1111-1111-111111111111', 'HIIT Queima Total', 'cardio', 'casa', 20, 'iniciante', 'perda_gordura', '{}', 180, true, false, ARRAY['hiit', 'queima', 'rapido']),
  ('a1b2c3d4-2222-2222-2222-222222222222', 'Core Funcional Express', 'funcional', 'casa', 15, 'iniciante', 'forca', '{}', 100, true, false, ARRAY['core', 'abdomen', 'iniciante']),
  ('a1b2c3d4-3333-3333-3333-333333333333', 'Alongamento Completo', 'mobilidade', 'casa', 15, 'iniciante', 'mobilidade', '{}', 50, true, false, ARRAY['alongamento', 'relaxamento', 'flexibilidade']),
  
  -- PREMIUM WORKOUTS - Academia
  ('b2c3d4e5-1111-1111-1111-111111111111', 'Push Day - Peito e Tríceps', 'musculacao', 'academia', 50, 'intermediario', 'hipertrofia', ARRAY['supino', 'halteres', 'cabo'], 350, false, true, ARRAY['push', 'peito', 'triceps', 'hipertrofia']),
  ('b2c3d4e5-2222-2222-2222-222222222222', 'Pull Day - Costas e Bíceps', 'musculacao', 'academia', 55, 'intermediario', 'hipertrofia', ARRAY['barra', 'puxador', 'halteres'], 340, false, true, ARRAY['pull', 'costas', 'biceps', 'hipertrofia']),
  ('b2c3d4e5-3333-3333-3333-333333333333', 'Leg Day Intenso', 'musculacao', 'academia', 60, 'avancado', 'hipertrofia', ARRAY['leg press', 'agachamento', 'extensora'], 420, false, true, ARRAY['pernas', 'gluteos', 'quadriceps']),
  ('b2c3d4e5-4444-4444-4444-444444444444', 'Full Body Força', 'musculacao', 'academia', 45, 'intermediario', 'forca', ARRAY['barra', 'halteres', 'maquinas'], 380, false, true, ARRAY['fullbody', 'forca', 'composto']),
  
  -- PREMIUM WORKOUTS - Casa
  ('c3d4e5f6-1111-1111-1111-111111111111', 'Treino Tabata Avançado', 'cardio', 'casa', 25, 'avancado', 'perda_gordura', '{}', 280, false, true, ARRAY['tabata', 'intenso', 'queima']),
  ('c3d4e5f6-2222-2222-2222-222222222222', 'Yoga Flow Energizante', 'mobilidade', 'casa', 30, 'iniciante', 'mobilidade', ARRAY['tapete'], 120, false, true, ARRAY['yoga', 'flexibilidade', 'relaxamento']),
  ('c3d4e5f6-3333-3333-3333-333333333333', 'Circuito Funcional Casa', 'funcional', 'casa', 35, 'intermediario', 'perda_gordura', ARRAY['faixa elastica'], 260, false, true, ARRAY['circuito', 'funcional', 'resistencia']),
  ('c3d4e5f6-4444-4444-4444-444444444444', 'Core Power Avançado', 'funcional', 'casa', 25, 'avancado', 'forca', '{}', 180, false, true, ARRAY['core', 'abdomen', 'avancado']),
  ('c3d4e5f6-5555-5555-5555-555555555555', 'Mobilidade para Atletas', 'mobilidade', 'casa', 20, 'intermediario', 'mobilidade', ARRAY['foam roller'], 80, false, true, ARRAY['mobilidade', 'recuperacao', 'atleta']);

-- Seed workout_exercises for FREE workouts
-- HIIT Queima Total
INSERT INTO workout_exercises (workout_id, order_index, exercise_name, sets, reps, rest_seconds, instructions) VALUES
  ('a1b2c3d4-1111-1111-1111-111111111111', 1, 'Jumping Jacks', 3, '40 segundos', 20, 'Mantenha o core ativado durante todo o movimento'),
  ('a1b2c3d4-1111-1111-1111-111111111111', 2, 'Burpees', 3, '30 segundos', 30, 'Desça até o chão e exploda na subida'),
  ('a1b2c3d4-1111-1111-1111-111111111111', 3, 'Mountain Climbers', 3, '40 segundos', 20, 'Mantenha o quadril baixo e alterne as pernas rapidamente'),
  ('a1b2c3d4-1111-1111-1111-111111111111', 4, 'Agachamento com Salto', 3, '30 segundos', 30, 'Agache fundo e salte o mais alto possível'),
  ('a1b2c3d4-1111-1111-1111-111111111111', 5, 'Prancha com Toque no Ombro', 3, '40 segundos', 20, 'Mantenha o corpo estável enquanto alterna os toques');

-- Core Funcional Express
INSERT INTO workout_exercises (workout_id, order_index, exercise_name, sets, reps, rest_seconds, instructions) VALUES
  ('a1b2c3d4-2222-2222-2222-222222222222', 1, 'Prancha Frontal', 3, '45 segundos', 15, 'Mantenha o corpo reto da cabeça aos pés'),
  ('a1b2c3d4-2222-2222-2222-222222222222', 2, 'Bicycle Crunch', 3, '20 reps', 15, 'Toque o cotovelo no joelho oposto alternando'),
  ('a1b2c3d4-2222-2222-2222-222222222222', 3, 'Leg Raises', 3, '15 reps', 20, 'Desça as pernas lentamente sem tocar o chão'),
  ('a1b2c3d4-2222-2222-2222-222222222222', 4, 'Dead Bug', 3, '12 reps cada lado', 15, 'Estenda braço e perna opostos mantendo lombar no chão'),
  ('a1b2c3d4-2222-2222-2222-222222222222', 5, 'Prancha Lateral', 2, '30 segundos cada', 15, 'Mantenha o quadril elevado durante todo o tempo');

-- Alongamento Completo
INSERT INTO workout_exercises (workout_id, order_index, exercise_name, sets, reps, rest_seconds, instructions) VALUES
  ('a1b2c3d4-3333-3333-3333-333333333333', 1, 'Alongamento de Pescoço', 1, '60 segundos', 0, 'Incline a cabeça suavemente para cada lado'),
  ('a1b2c3d4-3333-3333-3333-333333333333', 2, 'Alongamento de Ombros', 1, '60 segundos', 0, 'Cruze o braço na frente do corpo e pressione'),
  ('a1b2c3d4-3333-3333-3333-333333333333', 3, 'Cat-Cow Stretch', 1, '10 reps', 0, 'Alterne entre arquear e arredondar as costas'),
  ('a1b2c3d4-3333-3333-3333-333333333333', 4, 'Alongamento de Quadríceps', 1, '45 segundos cada', 0, 'Puxe o pé em direção ao glúteo'),
  ('a1b2c3d4-3333-3333-3333-333333333333', 5, 'Alongamento de Isquiotibiais', 1, '60 segundos cada', 0, 'Incline o tronco mantendo as costas retas'),
  ('a1b2c3d4-3333-3333-3333-333333333333', 6, 'Butterfly Stretch', 1, '60 segundos', 0, 'Junte as solas dos pés e pressione os joelhos');

-- Push Day
INSERT INTO workout_exercises (workout_id, order_index, exercise_name, sets, reps, rest_seconds, instructions) VALUES
  ('b2c3d4e5-1111-1111-1111-111111111111', 1, 'Supino Reto com Barra', 4, '8-10 reps', 90, 'Desça a barra até o peito e empurre explosivamente'),
  ('b2c3d4e5-1111-1111-1111-111111111111', 2, 'Supino Inclinado com Halteres', 3, '10-12 reps', 75, 'Mantenha os cotovelos em 45 graus'),
  ('b2c3d4e5-1111-1111-1111-111111111111', 3, 'Crucifixo no Cabo', 3, '12-15 reps', 60, 'Foque na contração do peitoral'),
  ('b2c3d4e5-1111-1111-1111-111111111111', 4, 'Desenvolvimento com Halteres', 3, '10-12 reps', 75, 'Empurre os halteres verticalmente'),
  ('b2c3d4e5-1111-1111-1111-111111111111', 5, 'Tríceps Pulley', 3, '12-15 reps', 60, 'Mantenha os cotovelos fixos'),
  ('b2c3d4e5-1111-1111-1111-111111111111', 6, 'Tríceps Francês', 3, '10-12 reps', 60, 'Desça o halter atrás da cabeça controladamente');

-- Pull Day
INSERT INTO workout_exercises (workout_id, order_index, exercise_name, sets, reps, rest_seconds, instructions) VALUES
  ('b2c3d4e5-2222-2222-2222-222222222222', 1, 'Barra Fixa', 4, '8-10 reps', 90, 'Puxe até o queixo passar da barra'),
  ('b2c3d4e5-2222-2222-2222-222222222222', 2, 'Remada Curvada', 4, '8-10 reps', 90, 'Mantenha as costas retas e puxe até o abdômen'),
  ('b2c3d4e5-2222-2222-2222-222222222222', 3, 'Puxada no Pulley', 3, '10-12 reps', 75, 'Puxe a barra até o peito abrindo o peitoral'),
  ('b2c3d4e5-2222-2222-2222-222222222222', 4, 'Remada Unilateral', 3, '10-12 reps cada', 60, 'Apoie-se no banco e puxe o halter'),
  ('b2c3d4e5-2222-2222-2222-222222222222', 5, 'Rosca Direta com Barra', 3, '10-12 reps', 60, 'Mantenha os cotovelos fixos ao lado do corpo'),
  ('b2c3d4e5-2222-2222-2222-222222222222', 6, 'Rosca Martelo', 3, '12-15 reps', 60, 'Alterne os braços mantendo controle');

-- Leg Day Intenso
INSERT INTO workout_exercises (workout_id, order_index, exercise_name, sets, reps, rest_seconds, instructions) VALUES
  ('b2c3d4e5-3333-3333-3333-333333333333', 1, 'Agachamento Livre', 4, '8-10 reps', 120, 'Desça até as coxas ficarem paralelas ao chão'),
  ('b2c3d4e5-3333-3333-3333-333333333333', 2, 'Leg Press 45°', 4, '10-12 reps', 90, 'Não trave os joelhos no topo'),
  ('b2c3d4e5-3333-3333-3333-333333333333', 3, 'Extensora', 3, '12-15 reps', 60, 'Segure a contração no topo por 1 segundo'),
  ('b2c3d4e5-3333-3333-3333-333333333333', 4, 'Flexora Deitado', 3, '12-15 reps', 60, 'Controle a descida'),
  ('b2c3d4e5-3333-3333-3333-333333333333', 5, 'Stiff', 3, '10-12 reps', 75, 'Mantenha as pernas semi-estendidas'),
  ('b2c3d4e5-3333-3333-3333-333333333333', 6, 'Panturrilha em Pé', 4, '15-20 reps', 45, 'Suba na ponta dos pés e segure');

-- Full Body Força
INSERT INTO workout_exercises (workout_id, order_index, exercise_name, sets, reps, rest_seconds, instructions) VALUES
  ('b2c3d4e5-4444-4444-4444-444444444444', 1, 'Levantamento Terra', 4, '6-8 reps', 120, 'Mantenha a barra próxima ao corpo'),
  ('b2c3d4e5-4444-4444-4444-444444444444', 2, 'Agachamento Frontal', 3, '8-10 reps', 90, 'Mantenha os cotovelos elevados'),
  ('b2c3d4e5-4444-4444-4444-444444444444', 3, 'Supino Reto', 3, '8-10 reps', 90, 'Desça controladamente'),
  ('b2c3d4e5-4444-4444-4444-444444444444', 4, 'Remada Cavalinho', 3, '8-10 reps', 75, 'Puxe a barra até o abdômen'),
  ('b2c3d4e5-4444-4444-4444-444444444444', 5, 'Desenvolvimento Militar', 3, '8-10 reps', 75, 'Empurre a barra sobre a cabeça');

-- Treino Tabata Avançado
INSERT INTO workout_exercises (workout_id, order_index, exercise_name, sets, reps, rest_seconds, instructions) VALUES
  ('c3d4e5f6-1111-1111-1111-111111111111', 1, 'Burpee com Flexão', 8, '20 segundos', 10, 'Máxima intensidade por 20 segundos'),
  ('c3d4e5f6-1111-1111-1111-111111111111', 2, 'Sprints no Lugar', 8, '20 segundos', 10, 'Eleve os joelhos o máximo possível'),
  ('c3d4e5f6-1111-1111-1111-111111111111', 3, 'Jump Squats', 8, '20 segundos', 10, 'Salte explosivamente'),
  ('c3d4e5f6-1111-1111-1111-111111111111', 4, 'Prancha com Pulo', 8, '20 segundos', 10, 'Pule os pés para frente e para trás');

-- Yoga Flow
INSERT INTO workout_exercises (workout_id, order_index, exercise_name, sets, reps, rest_seconds, instructions) VALUES
  ('c3d4e5f6-2222-2222-2222-222222222222', 1, 'Saudação ao Sol A', 1, '5 rounds', 0, 'Flua suavemente entre as posições'),
  ('c3d4e5f6-2222-2222-2222-222222222222', 2, 'Warrior I', 1, '60 segundos cada', 0, 'Mantenha os quadris alinhados'),
  ('c3d4e5f6-2222-2222-2222-222222222222', 3, 'Warrior II', 1, '60 segundos cada', 0, 'Braços paralelos ao chão'),
  ('c3d4e5f6-2222-2222-2222-222222222222', 4, 'Triangle Pose', 1, '45 segundos cada', 0, 'Alongue a lateral do corpo'),
  ('c3d4e5f6-2222-2222-2222-222222222222', 5, 'Downward Dog', 1, '90 segundos', 0, 'Pressione os calcanhares em direção ao chão'),
  ('c3d4e5f6-2222-2222-2222-222222222222', 6, 'Pigeon Pose', 1, '60 segundos cada', 0, 'Relaxe o quadril na posição');

-- Circuito Funcional Casa
INSERT INTO workout_exercises (workout_id, order_index, exercise_name, sets, reps, rest_seconds, instructions) VALUES
  ('c3d4e5f6-3333-3333-3333-333333333333', 1, 'Agachamento com Faixa', 3, '15 reps', 30, 'Mantenha tensão na faixa'),
  ('c3d4e5f6-3333-3333-3333-333333333333', 2, 'Flexão de Braço', 3, '12-15 reps', 30, 'Corpo reto da cabeça aos pés'),
  ('c3d4e5f6-3333-3333-3333-333333333333', 3, 'Remada com Faixa', 3, '15 reps', 30, 'Aperte as escápulas no final'),
  ('c3d4e5f6-3333-3333-3333-333333333333', 4, 'Afundo Alternado', 3, '12 reps cada', 30, 'Joelho quase toca o chão'),
  ('c3d4e5f6-3333-3333-3333-333333333333', 5, 'Prancha com Remada', 3, '10 reps cada', 30, 'Mantenha quadril estável'),
  ('c3d4e5f6-3333-3333-3333-333333333333', 6, 'Glute Bridge', 3, '15 reps', 30, 'Aperte os glúteos no topo');

-- Core Power Avançado
INSERT INTO workout_exercises (workout_id, order_index, exercise_name, sets, reps, rest_seconds, instructions) VALUES
  ('c3d4e5f6-4444-4444-4444-444444444444', 1, 'Dragon Flag', 3, '8 reps', 60, 'Desça o corpo reto lentamente'),
  ('c3d4e5f6-4444-4444-4444-444444444444', 2, 'Hanging Leg Raise', 3, '12 reps', 45, 'Eleve as pernas até 90 graus'),
  ('c3d4e5f6-4444-4444-4444-444444444444', 3, 'Ab Wheel Rollout', 3, '10 reps', 45, 'Estenda o máximo possível'),
  ('c3d4e5f6-4444-4444-4444-444444444444', 4, 'Hollow Body Hold', 3, '45 segundos', 30, 'Mantenha lombar colada no chão'),
  ('c3d4e5f6-4444-4444-4444-444444444444', 5, 'Russian Twist', 3, '20 reps total', 30, 'Toque o chão de cada lado');

-- Mobilidade para Atletas
INSERT INTO workout_exercises (workout_id, order_index, exercise_name, sets, reps, rest_seconds, instructions) VALUES
  ('c3d4e5f6-5555-5555-5555-555555555555', 1, 'Foam Rolling - Quadríceps', 1, '90 segundos cada', 0, 'Role lentamente em áreas tensas'),
  ('c3d4e5f6-5555-5555-5555-555555555555', 2, 'Foam Rolling - IT Band', 1, '90 segundos cada', 0, 'Foque em pontos de tensão'),
  ('c3d4e5f6-5555-5555-5555-555555555555', 3, 'Hip 90/90 Stretch', 1, '60 segundos cada', 0, 'Mantenha tronco ereto'),
  ('c3d4e5f6-5555-5555-5555-555555555555', 4, 'Thoracic Spine Rotation', 1, '10 reps cada', 0, 'Gire o tronco mantendo quadril fixo'),
  ('c3d4e5f6-5555-5555-5555-555555555555', 5, 'Couch Stretch', 1, '60 segundos cada', 0, 'Alongue flexores do quadril');