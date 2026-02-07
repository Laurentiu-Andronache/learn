-- Seed: Cognitive Biases & Fallacies theme with 25 questions across 5 categories

DO $$
DECLARE
  theme_id UUID;
  cat_decision UUID;
  cat_logical UUID;
  cat_memory UUID;
  cat_social UUID;
  cat_statistical UUID;
BEGIN
  -- ============================================================================
  -- THEME
  -- ============================================================================
  INSERT INTO themes (title_en, title_es, description_en, description_es, icon, color, is_builtin, is_active, intro_text_en, intro_text_es)
  VALUES (
    'Cognitive Biases & Fallacies',
    'Sesgos Cognitivos y Falacias',
    'Sharpen your logical thinking by learning to recognize the mental shortcuts and reasoning errors that distort our decisions.',
    'Mejora tu pensamiento lógico aprendiendo a reconocer los atajos mentales y errores de razonamiento que distorsionan nuestras decisiones.',
    '🧠',
    '#8B5CF6',
    true,
    true,
    E'**Why Understanding Cognitive Biases Matters**\n\nYour brain is an extraordinary organ, but it takes shortcuts. These shortcuts — called cognitive biases — evolved to help us make fast decisions in a dangerous world. The problem is that in modern life, these same shortcuts systematically lead us astray: we overvalue what we already believe, misjudge risks, and fall for arguments that sound persuasive but are logically broken.\n\nCognitive biases are not a sign of low intelligence. They affect everyone — Nobel laureates, seasoned investors, expert doctors — because they are baked into the architecture of human cognition. The only reliable defense is learning to recognize them by name and pattern, so you can catch yourself (and others) in the act.\n\nLogical fallacies are the close cousins of biases. While biases are unconscious mental shortcuts, fallacies are errors in the structure of an argument. Politicians, advertisers, and even well-meaning friends use them constantly. Once you learn to spot a straw man, an appeal to authority, or a false dilemma, you will see them everywhere — and you will be far harder to manipulate.\n\nThis theme covers decision-making traps, formal and informal fallacies, memory distortions, social pressures on reasoning, and the statistical illusions that fool even trained professionals. Mastering these concepts is one of the highest-leverage upgrades you can give your thinking.',
    E'**Por qué importa entender los sesgos cognitivos**\n\nTu cerebro es un órgano extraordinario, pero toma atajos. Estos atajos — llamados sesgos cognitivos — evolucionaron para ayudarnos a tomar decisiones rápidas en un mundo peligroso. El problema es que en la vida moderna, estos mismos atajos nos desvían sistemáticamente: sobrevaloramos lo que ya creemos, juzgamos mal los riesgos y caemos en argumentos que suenan persuasivos pero son lógicamente defectuosos.\n\nLos sesgos cognitivos no son señal de baja inteligencia. Afectan a todos — premios Nobel, inversores experimentados, médicos expertos — porque están integrados en la arquitectura de la cognición humana. La única defensa fiable es aprender a reconocerlos por nombre y patrón, para poder detectarlos en uno mismo (y en los demás) en el acto.\n\nLas falacias lógicas son primas cercanas de los sesgos. Mientras los sesgos son atajos mentales inconscientes, las falacias son errores en la estructura de un argumento. Los políticos, publicistas e incluso amigos bienintencionados las usan constantemente. Una vez que aprendas a detectar un hombre de paja, una apelación a la autoridad o un falso dilema, los verás en todas partes — y serás mucho más difícil de manipular.\n\nEste tema cubre trampas en la toma de decisiones, falacias formales e informales, distorsiones de memoria, presiones sociales sobre el razonamiento y las ilusiones estadísticas que engañan incluso a profesionales entrenados. Dominar estos conceptos es una de las mejoras de mayor impacto que puedes dar a tu pensamiento.'
  ) RETURNING id INTO theme_id;

  -- ============================================================================
  -- CATEGORIES (5)
  -- ============================================================================
  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Decision-Making Biases', 'Sesgos en la Toma de Decisiones', 'decision-biases', '#EC4899')
  RETURNING id INTO cat_decision;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Logical Fallacies', 'Falacias Lógicas', 'logical-fallacies', '#14B8A6')
  RETURNING id INTO cat_logical;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Memory & Perception', 'Memoria y Percepción', 'memory-perception', '#F97316')
  RETURNING id INTO cat_memory;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Social Biases', 'Sesgos Sociales', 'social-biases', '#6366F1')
  RETURNING id INTO cat_social;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Statistical Thinking', 'Pensamiento Estadístico', 'statistical-thinking', '#84CC16')
  RETURNING id INTO cat_statistical;

  -- ============================================================================
  -- QUESTIONS: Decision-Making Biases (5)
  -- ============================================================================

  -- dm1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_decision, 'multiple_choice',
   'You''ve spent $500 repairing an old car and it breaks down again. A mechanic says it needs another $300. A comparable used car costs $800. What bias would lead you to keep repairing the old car?',
   'Has gastado $500 reparando un coche viejo y se avería de nuevo. Un mecánico dice que necesita otros $300. Un coche usado comparable cuesta $800. ¿Qué sesgo te llevaría a seguir reparando el coche viejo?',
   '["Sunk cost fallacy", "Anchoring bias", "Availability heuristic", "Dunning-Kruger effect"]'::jsonb,
   '["Falacia del costo hundido", "Sesgo de anclaje", "Heurística de disponibilidad", "Efecto Dunning-Kruger"]'::jsonb,
   0,
   'The sunk cost fallacy makes us factor in money or effort already spent (which cannot be recovered) when deciding future actions. Rationally, only future costs and benefits should matter — but our brains hate "wasting" past investments.',
   'La falacia del costo hundido nos hace considerar el dinero o esfuerzo ya gastado (que no se puede recuperar) al decidir acciones futuras. Racionalmente, solo los costos y beneficios futuros deberían importar.',
   2);

  -- dm2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_decision, 'multiple_choice',
   'A real estate agent first shows you an overpriced house at $600,000 before showing a $400,000 house. The second house now feels like a bargain. Which bias is the agent exploiting?',
   'Un agente inmobiliario primero te muestra una casa sobrevalorada de $600,000 antes de mostrarte una de $400,000. La segunda casa ahora parece una ganga. ¿Qué sesgo está explotando el agente?',
   '["Anchoring bias", "Confirmation bias", "Hindsight bias", "Halo effect"]'::jsonb,
   '["Sesgo de anclaje", "Sesgo de confirmación", "Sesgo retrospectivo", "Efecto halo"]'::jsonb,
   0,
   'Anchoring bias causes us to rely too heavily on the first piece of information we encounter (the "anchor") when making decisions. The $600,000 price sets a mental reference point that makes $400,000 seem low, even if it''s still above market value.',
   'El sesgo de anclaje nos hace depender excesivamente de la primera información que encontramos (el "ancla"). El precio de $600,000 establece un punto de referencia mental que hace que $400,000 parezca bajo, incluso si está por encima del valor de mercado.',
   2);

  -- dm3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_decision, 'true_false',
   'Loss aversion means people generally feel the pain of losing $100 about twice as strongly as the pleasure of gaining $100.',
   'La aversión a la pérdida significa que las personas generalmente sienten el dolor de perder $100 aproximadamente el doble de intenso que el placer de ganar $100.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'Research by Kahneman and Tversky demonstrated that losses loom roughly twice as large as equivalent gains. This asymmetry drives risk-averse behavior in gains and risk-seeking behavior when trying to avoid losses.',
   'La investigación de Kahneman y Tversky demostró que las pérdidas pesan aproximadamente el doble que las ganancias equivalentes. Esta asimetría impulsa el comportamiento averso al riesgo en ganancias y buscador de riesgo al intentar evitar pérdidas.',
   3);

  -- dm4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_decision, 'multiple_choice',
   'After a plane crash makes the news, many people switch to driving for long trips — even though driving is statistically far more dangerous per mile. Which bias explains this?',
   'Después de que un accidente aéreo sale en las noticias, muchas personas cambian a conducir para viajes largos — aunque conducir es estadísticamente mucho más peligroso por kilómetro. ¿Qué sesgo explica esto?',
   '["Availability heuristic", "Optimism bias", "Status quo bias", "Framing effect"]'::jsonb,
   '["Heurística de disponibilidad", "Sesgo de optimismo", "Sesgo de statu quo", "Efecto de encuadre"]'::jsonb,
   0,
   'The availability heuristic causes us to judge the probability of events based on how easily examples come to mind. Vivid, recent, or emotionally charged events (like plane crashes) feel more likely than they actually are.',
   'La heurística de disponibilidad nos hace juzgar la probabilidad de eventos según la facilidad con que los ejemplos vienen a la mente. Los eventos vívidos, recientes o emocionalmente cargados parecen más probables de lo que realmente son.',
   2);

  -- dm5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_decision, 'multiple_choice',
   'A doctor presents a treatment as having a "90% survival rate" to one patient group and a "10% mortality rate" to another. Both groups receive the same data, yet the first group is far more likely to accept the treatment. This is an example of:',
   'Un médico presenta un tratamiento con una "tasa de supervivencia del 90%" a un grupo y una "tasa de mortalidad del 10%" a otro. Ambos grupos reciben los mismos datos, pero el primer grupo es mucho más propenso a aceptar el tratamiento. Esto es un ejemplo de:',
   '["The framing effect", "The Dunning-Kruger effect", "Survivorship bias", "The bandwagon effect"]'::jsonb,
   '["El efecto de encuadre", "El efecto Dunning-Kruger", "Sesgo de supervivencia", "Efecto de arrastre"]'::jsonb,
   0,
   'The framing effect shows that how information is presented dramatically affects decisions, even when the underlying facts are identical. Positive framing ("90% survive") triggers acceptance; negative framing ("10% die") triggers avoidance.',
   'El efecto de encuadre muestra que la forma en que se presenta la información afecta drásticamente las decisiones, incluso cuando los hechos subyacentes son idénticos. El encuadre positivo desencadena aceptación; el negativo, rechazo.',
   3);

  -- ============================================================================
  -- QUESTIONS: Logical Fallacies (5)
  -- ============================================================================

  -- lf1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_logical, 'multiple_choice',
   '"We should not listen to Dr. Smith''s climate research because he was once caught speeding." This is an example of which fallacy?',
   '"No deberíamos escuchar la investigación climática del Dr. Smith porque una vez lo multaron por exceso de velocidad." Esto es un ejemplo de qué falacia?',
   '["Ad hominem", "Straw man", "Appeal to nature", "Slippery slope"]'::jsonb,
   '["Ad hominem", "Hombre de paja", "Apelación a la naturaleza", "Pendiente resbaladiza"]'::jsonb,
   0,
   'An ad hominem fallacy attacks the person making the argument rather than the argument itself. A traffic violation has no bearing on the validity of someone''s scientific research.',
   'La falacia ad hominem ataca a la persona que presenta el argumento en lugar del argumento en sí. Una infracción de tráfico no tiene relación con la validez de la investigación científica de alguien.',
   1);

  -- lf2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_logical, 'multiple_choice',
   '"Either you support building a new highway through the park, or you don''t care about reducing traffic congestion." This is an example of:',
   '"O apoyas construir una autopista a través del parque, o no te importa reducir la congestión del tráfico." Esto es un ejemplo de:',
   '["False dilemma (false dichotomy)", "Red herring", "Begging the question", "Equivocation"]'::jsonb,
   '["Falso dilema (falsa dicotomía)", "Pista falsa (red herring)", "Petición de principio", "Equivocación"]'::jsonb,
   0,
   'A false dilemma presents only two options when more exist. In this case, there could be alternative routes, public transit improvements, congestion pricing, or other solutions — the choice is not binary.',
   'Un falso dilema presenta solo dos opciones cuando existen más. En este caso, podría haber rutas alternativas, mejoras al transporte público, tarifas por congestión u otras soluciones.',
   1);

  -- lf3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_logical, 'multiple_choice',
   'A politician argues: "My opponent wants to reduce military spending, so clearly they want to leave our country completely defenseless." Which fallacy is this?',
   'Un político argumenta: "Mi oponente quiere reducir el gasto militar, así que claramente quiere dejar nuestro país completamente indefenso." ¿Qué falacia es esta?',
   '["Straw man", "Ad hominem", "Appeal to authority", "Circular reasoning"]'::jsonb,
   '["Hombre de paja", "Ad hominem", "Apelación a la autoridad", "Razonamiento circular"]'::jsonb,
   0,
   'A straw man fallacy distorts someone''s argument into an extreme or easily attacked version, then attacks that distortion. Reducing spending is not the same as eliminating all defense.',
   'La falacia del hombre de paja distorsiona el argumento de alguien en una versión extrema o fácilmente atacable, y luego ataca esa distorsión. Reducir el gasto no es lo mismo que eliminar toda la defensa.',
   2);

  -- lf4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_logical, 'true_false',
   '"Correlation implies causation" is a valid principle in scientific reasoning.',
   '"La correlación implica causalidad" es un principio válido en el razonamiento científico.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'Correlation does NOT imply causation. Two variables can be correlated due to a third confounding variable, reverse causation, or pure coincidence. Establishing causation requires controlled experiments or rigorous causal inference methods.',
   'La correlación NO implica causalidad. Dos variables pueden estar correlacionadas debido a una tercera variable confusa, causalidad inversa o pura coincidencia. Establecer causalidad requiere experimentos controlados.',
   2);

  -- lf5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_logical, 'multiple_choice',
   '"Millions of people believe in astrology, so there must be something to it." This reasoning commits which fallacy?',
   '"Millones de personas creen en la astrología, así que algo de cierto debe tener." Este razonamiento comete qué falacia?',
   '["Appeal to popularity (ad populum)", "Appeal to nature", "Tu quoque", "Genetic fallacy"]'::jsonb,
   '["Apelación a la popularidad (ad populum)", "Apelación a la naturaleza", "Tu quoque", "Falacia genética"]'::jsonb,
   0,
   'The appeal to popularity (argumentum ad populum) claims something is true or good because many people believe it. The number of believers has no bearing on whether a claim is factually correct.',
   'La apelación a la popularidad (argumentum ad populum) afirma que algo es verdadero o bueno porque mucha gente lo cree. El número de creyentes no tiene relación con si una afirmación es correcta.',
   1);

  -- ============================================================================
  -- QUESTIONS: Memory & Perception (5)
  -- ============================================================================

  -- mp1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_memory, 'multiple_choice',
   'After an election, many people claim they "always knew" who would win, even if they predicted differently beforehand. This is known as:',
   'Después de una elección, muchas personas afirman que "siempre supieron" quién ganaría, incluso si predijeron diferente antes. Esto se conoce como:',
   '["Hindsight bias", "Confirmation bias", "Anchoring bias", "Projection bias"]'::jsonb,
   '["Sesgo retrospectivo", "Sesgo de confirmación", "Sesgo de anclaje", "Sesgo de proyección"]'::jsonb,
   0,
   'Hindsight bias (the "I-knew-it-all-along" effect) causes people to believe, after an event has occurred, that they would have predicted it beforehand. It distorts memory of past predictions and creates false confidence in future predictions.',
   'El sesgo retrospectivo (el efecto "siempre lo supe") hace que las personas crean, después de que ocurre un evento, que lo habrían predicho. Distorsiona la memoria de predicciones pasadas y crea falsa confianza.',
   2);

  -- mp2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_memory, 'true_false',
   'Eyewitness testimony is generally one of the most reliable forms of evidence in criminal cases.',
   'El testimonio de testigos oculares es generalmente una de las formas más fiables de evidencia en casos criminales.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'Eyewitness testimony is notoriously unreliable. Research by Elizabeth Loftus and others has shown that memory is reconstructive, not reproductive — it can be distorted by leading questions, stress, post-event information, and the passage of time. Over 70% of wrongful convictions overturned by DNA evidence involved faulty eyewitness identification.',
   'El testimonio de testigos oculares es notoriamente poco fiable. La investigación ha demostrado que la memoria es reconstructiva, no reproductiva — puede ser distorsionada por preguntas sugestivas, estrés e información posterior al evento. Más del 70% de condenas injustas anuladas por ADN involucraron identificación errónea de testigos.',
   2);

  -- mp3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_memory, 'multiple_choice',
   'You are researching whether coffee is healthy. You keep finding articles that say it is and ignoring those that say it isn''t, because you love coffee. This is:',
   'Estás investigando si el café es saludable. Sigues encontrando artículos que dicen que sí e ignorando los que dicen que no, porque te encanta el café. Esto es:',
   '["Confirmation bias", "Availability heuristic", "Dunning-Kruger effect", "Recency bias"]'::jsonb,
   '["Sesgo de confirmación", "Heurística de disponibilidad", "Efecto Dunning-Kruger", "Sesgo de recencia"]'::jsonb,
   0,
   'Confirmation bias is the tendency to search for, interpret, and remember information that confirms our pre-existing beliefs while ignoring contradictory evidence. It is one of the most pervasive and dangerous cognitive biases.',
   'El sesgo de confirmación es la tendencia a buscar, interpretar y recordar información que confirma nuestras creencias preexistentes mientras ignoramos la evidencia contradictoria. Es uno de los sesgos cognitivos más generalizados y peligrosos.',
   1);

  -- mp4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_memory, 'multiple_choice',
   'Many people vividly remember the Monopoly man wearing a monocle, but he never had one. This type of widespread false memory is called:',
   'Muchas personas recuerdan vívidamente al hombre de Monopoly usando un monóculo, pero nunca tuvo uno. Este tipo de falso recuerdo generalizado se llama:',
   '["The Mandela effect", "Recency bias", "The halo effect", "Source amnesia"]'::jsonb,
   '["El efecto Mandela", "Sesgo de recencia", "Efecto halo", "Amnesia de fuente"]'::jsonb,
   0,
   'The Mandela effect describes a phenomenon where large groups of people share the same false memory. It is named after the widespread (incorrect) belief that Nelson Mandela died in prison in the 1980s. It illustrates how memory is reconstructive and socially influenced.',
   'El efecto Mandela describe un fenómeno donde grandes grupos de personas comparten el mismo falso recuerdo. Se llama así por la creencia generalizada (incorrecta) de que Nelson Mandela murió en prisión en los años 80. Ilustra cómo la memoria es reconstructiva.',
   2);

  -- mp5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_memory, 'multiple_choice',
   'In a famous experiment, participants watching a basketball passing video completely missed a person in a gorilla suit walking through the scene. This demonstrates:',
   'En un famoso experimento, participantes viendo un video de pases de baloncesto no vieron a una persona disfrazada de gorila caminando por la escena. Esto demuestra:',
   '["Inattentional blindness", "The Mandela effect", "Hindsight bias", "The spotlight effect"]'::jsonb,
   '["Ceguera por inatención", "El efecto Mandela", "Sesgo retrospectivo", "El efecto foco"]'::jsonb,
   0,
   'Inattentional blindness (demonstrated by Simons and Chabris'' 1999 gorilla experiment) shows that when focused on a task, we can be completely blind to unexpected stimuli — even highly salient ones. It reveals the severe limits of human attention.',
   'La ceguera por inatención (demostrada por el experimento del gorila de Simons y Chabris en 1999) muestra que cuando nos enfocamos en una tarea, podemos ser completamente ciegos a estímulos inesperados. Revela los límites severos de la atención humana.',
   2);

  -- ============================================================================
  -- QUESTIONS: Social Biases (5)
  -- ============================================================================

  -- sb1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_social, 'multiple_choice',
   'In Solomon Asch''s famous conformity experiment, participants gave obviously wrong answers to simple questions about line lengths. What caused this?',
   'En el famoso experimento de conformidad de Solomon Asch, los participantes dieron respuestas obviamente incorrectas a preguntas simples sobre longitudes de líneas. ¿Qué causó esto?',
   '["Social pressure from confederates answering incorrectly first", "The questions were actually difficult", "Participants were paid to lie", "Visual illusions made the lines confusing"]'::jsonb,
   '["Presión social de cómplices que respondieron incorrectamente primero", "Las preguntas eran realmente difíciles", "Se les pagó a los participantes por mentir", "Ilusiones visuales hacían las líneas confusas"]'::jsonb,
   0,
   'Asch''s experiment showed that about 75% of participants conformed to clearly wrong group answers at least once. The lines were unambiguous — social pressure alone was enough to override their own perception and judgment.',
   'El experimento de Asch mostró que aproximadamente el 75% de los participantes se conformaron con respuestas grupales claramente incorrectas al menos una vez. Las líneas eran inequívocas — la presión social por sí sola bastó para anular su propia percepción.',
   3);

  -- sb2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_social, 'multiple_choice',
   'You meet someone who is attractive and well-dressed, and you automatically assume they are also intelligent and kind. This is known as:',
   'Conoces a alguien atractivo y bien vestido, y automáticamente asumes que también es inteligente y amable. Esto se conoce como:',
   '["The halo effect", "The bystander effect", "Groupthink", "In-group bias"]'::jsonb,
   '["El efecto halo", "El efecto espectador", "Pensamiento de grupo", "Sesgo endogrupal"]'::jsonb,
   0,
   'The halo effect is the tendency for a positive impression in one area (attractiveness) to influence our judgment in unrelated areas (intelligence, kindness). It affects hiring decisions, court verdicts, and everyday social interactions.',
   'El efecto halo es la tendencia a que una impresión positiva en un área (atractivo) influya en nuestro juicio en áreas no relacionadas (inteligencia, amabilidad). Afecta decisiones de contratación, veredictos judiciales e interacciones sociales.',
   1);

  -- sb3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_social, 'true_false',
   'The bystander effect shows that a person is LESS likely to receive help when MORE people are present.',
   'El efecto espectador muestra que una persona tiene MENOS probabilidad de recibir ayuda cuando MÁS personas están presentes.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'The bystander effect, documented by Darley and Latane after the Kitty Genovese case, shows that individuals are less likely to help in emergencies when others are present. Diffusion of responsibility ("someone else will help") and social proof ("nobody else is acting, so it must be fine") both contribute.',
   'El efecto espectador, documentado por Darley y Latane, muestra que las personas son menos propensas a ayudar en emergencias cuando otros están presentes. La difusión de responsabilidad y la prueba social contribuyen a este fenómeno.',
   2);

  -- sb4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_social, 'multiple_choice',
   'A jury judges a defendant more harshly because they belong to a different ethnic group. At the same time, they are lenient with defendants from their own group. This dual pattern illustrates:',
   'Un jurado juzga a un acusado más duramente porque pertenece a un grupo étnico diferente. Al mismo tiempo, son indulgentes con acusados de su propio grupo. Este doble patrón ilustra:',
   '["In-group bias combined with out-group discrimination", "The halo effect", "The Dunning-Kruger effect", "Fundamental attribution error"]'::jsonb,
   '["Sesgo endogrupal combinado con discriminación exogrupal", "El efecto halo", "El efecto Dunning-Kruger", "Error fundamental de atribución"]'::jsonb,
   0,
   'In-group bias (favoring members of our own group) and out-group discrimination (judging outsiders more harshly) are deeply rooted social biases. They operate across ethnicity, nationality, religion, sports teams, and even arbitrary group assignments.',
   'El sesgo endogrupal (favorecer a miembros de nuestro propio grupo) y la discriminación exogrupal (juzgar a los de fuera más duramente) son sesgos sociales profundamente arraigados que operan a través de etnia, nacionalidad, religión y más.',
   3);

  -- sb5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_social, 'multiple_choice',
   'When your friend fails an exam, you think "they didn''t study hard enough." When YOU fail, you think "the exam was unfair." This asymmetry is called:',
   'Cuando tu amigo suspende un examen, piensas "no estudió lo suficiente." Cuando TÚ suspendes, piensas "el examen era injusto." Esta asimetría se llama:',
   '["Fundamental attribution error (actor-observer bias)", "Confirmation bias", "The Mandela effect", "Survivorship bias"]'::jsonb,
   '["Error fundamental de atribución (sesgo actor-observador)", "Sesgo de confirmación", "El efecto Mandela", "Sesgo de supervivencia"]'::jsonb,
   0,
   'The fundamental attribution error is our tendency to attribute others'' behavior to their character (internal causes) while attributing our own behavior to circumstances (external causes). It is one of the most robust findings in social psychology.',
   'El error fundamental de atribución es nuestra tendencia a atribuir el comportamiento de otros a su carácter (causas internas) mientras atribuimos nuestro propio comportamiento a las circunstancias (causas externas). Es uno de los hallazgos más robustos de la psicología social.',
   2);

  -- ============================================================================
  -- QUESTIONS: Statistical Thinking (5)
  -- ============================================================================

  -- st1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_statistical, 'multiple_choice',
   'We only hear about successful startup founders, not the thousands who failed doing the same things. Our false conclusion that their strategies guarantee success is an example of:',
   'Solo escuchamos sobre fundadores de startups exitosos, no sobre los miles que fracasaron haciendo lo mismo. Nuestra falsa conclusión de que sus estrategias garantizan el éxito es un ejemplo de:',
   '["Survivorship bias", "Anchoring bias", "Loss aversion", "Recency bias"]'::jsonb,
   '["Sesgo de supervivencia", "Sesgo de anclaje", "Aversión a la pérdida", "Sesgo de recencia"]'::jsonb,
   0,
   'Survivorship bias occurs when we draw conclusions only from "survivors" (successes) while ignoring the much larger pool of failures. It creates a distorted picture of what leads to success because the evidence from failures is invisible.',
   'El sesgo de supervivencia ocurre cuando sacamos conclusiones solo de los "supervivientes" (éxitos) mientras ignoramos el grupo mucho mayor de fracasos. Crea una imagen distorsionada de lo que lleva al éxito porque la evidencia de los fracasos es invisible.',
   3);

  -- st2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_statistical, 'multiple_choice',
   'A disease affects 1 in 1,000 people. A test for it is 99% accurate (1% false positive rate). If you test positive, what is the approximate probability you actually have the disease?',
   'Una enfermedad afecta a 1 de cada 1,000 personas. Una prueba para ella tiene un 99% de precisión (1% de falsos positivos). Si das positivo, ¿cuál es la probabilidad aproximada de que realmente tengas la enfermedad?',
   '["About 9% (roughly 1 in 11)", "99%", "50%", "1%"]'::jsonb,
   '["Aproximadamente 9% (alrededor de 1 en 11)", "99%", "50%", "1%"]'::jsonb,
   0,
   'This is the base rate fallacy in action. Out of 1,000 people tested: 1 truly has the disease (true positive), but ~10 healthy people also test positive (false positives from 999 x 1%). So only about 1 out of 11 positive results is a true case — roughly 9%, not 99%.',
   'Esta es la falacia de la tasa base en acción. De cada 1,000 personas: 1 realmente tiene la enfermedad, pero ~10 personas sanas también dan positivo (falsos positivos de 999 x 1%). Solo alrededor de 1 de cada 11 resultados positivos es un caso real — aproximadamente 9%, no 99%.',
   5);

  -- st3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_statistical, 'true_false',
   'After flipping a fair coin and getting heads 9 times in a row, the probability of getting tails on the next flip is greater than 50%.',
   'Después de lanzar una moneda justa y obtener cara 9 veces seguidas, la probabilidad de obtener cruz en el siguiente lanzamiento es mayor al 50%.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'This is the gambler''s fallacy — the mistaken belief that past random events affect future probabilities. Each coin flip is independent; the coin has no memory. The probability remains exactly 50% regardless of previous outcomes.',
   'Esta es la falacia del jugador — la creencia errónea de que eventos aleatorios pasados afectan probabilidades futuras. Cada lanzamiento de moneda es independiente; la moneda no tiene memoria. La probabilidad permanece exactamente en 50%.',
   2);

  -- st4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_statistical, 'multiple_choice',
   'A study finds that towns with more churches have higher crime rates. A newspaper concludes: "Religion causes crime." What is the most likely explanation for this correlation?',
   'Un estudio encuentra que las ciudades con más iglesias tienen tasas de criminalidad más altas. Un periódico concluye: "La religión causa crimen." ¿Cuál es la explicación más probable para esta correlación?',
   '["A confounding variable: larger populations have both more churches and more crime", "Religion truly causes crime", "Crime causes people to build churches", "The data must be fabricated"]'::jsonb,
   '["Una variable de confusión: las poblaciones más grandes tienen tanto más iglesias como más crimen", "La religión realmente causa crimen", "El crimen hace que la gente construya iglesias", "Los datos deben estar fabricados"]'::jsonb,
   0,
   'This is a classic example of confounding variables (also called lurking variables). Population size drives both the number of churches and the amount of crime. Failing to account for confounders leads to spurious causal claims from correlational data.',
   'Este es un ejemplo clásico de variables de confusión. El tamaño de la población impulsa tanto el número de iglesias como la cantidad de crimen. No considerar las variables de confusión lleva a afirmaciones causales espurias a partir de datos correlacionales.',
   3);

  -- st5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_statistical, 'multiple_choice',
   'A basketball player makes 3 shots in a row and commentators say he has a "hot hand." Research on this phenomenon initially found that:',
   'Un jugador de baloncesto encesta 3 tiros seguidos y los comentaristas dicen que tiene la "mano caliente." La investigación sobre este fenómeno inicialmente encontró que:',
   '["Streaks were consistent with normal random variation — people see patterns in randomness", "The hot hand is a proven physical phenomenon", "Players actually shoot worse after making several shots", "Coaches should always pass to the player on a streak"]'::jsonb,
   '["Las rachas eran consistentes con la variación aleatoria normal — las personas ven patrones en la aleatoriedad", "La mano caliente es un fenómeno físico comprobado", "Los jugadores realmente tiran peor después de varios aciertos", "Los entrenadores siempre deberían pasar al jugador en racha"]'::jsonb,
   0,
   'Gilovich, Vallone, and Tversky''s 1985 study found that basketball shooting streaks were statistically indistinguishable from random sequences. Humans are wired to see patterns in randomness — a tendency called apophenia. (Note: later research with better data has found a small but real hot hand effect, though far smaller than people perceive.)',
   'El estudio de Gilovich, Vallone y Tversky de 1985 encontró que las rachas de tiros en baloncesto eran estadísticamente indistinguibles de secuencias aleatorias. Los humanos estamos programados para ver patrones en la aleatoriedad — una tendencia llamada apofenia.',
   4);

END $$;
