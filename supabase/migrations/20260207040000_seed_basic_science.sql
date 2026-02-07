-- Seed: Basic Science theme with 25 questions across 5 categories

DO $$
DECLARE
  theme_id UUID;
  cat_cell_bio UUID;
  cat_chemistry UUID;
  cat_physics UUID;
  cat_human_body UUID;
  cat_earth_env UUID;
BEGIN
  -- ============================================================================
  -- THEME
  -- ============================================================================
  INSERT INTO themes (title_en, title_es, description_en, description_es, icon, color, is_builtin, is_active, intro_text_en, intro_text_es)
  VALUES (
    'Basic Science',
    'Ciencias Basicas',
    'Fundamental concepts in biology, chemistry, physics, and earth science that shape our understanding of the natural world.',
    'Conceptos fundamentales de biologia, quimica, fisica y ciencias de la tierra que dan forma a nuestra comprension del mundo natural.',
    '🔬',
    '#3B82F6',
    true,
    true,
    E'**Why Basic Science Literacy Matters**\n\nScience is not a collection of facts to memorize — it is a way of thinking about the world. From the cells that build your body to the forces that hold the universe together, basic science gives you the tools to understand how things actually work. This understanding is the foundation for making informed decisions about health, technology, and the environment.\n\nEvery day you interact with scientific principles: the chemistry in your food, the physics in your phone, the biology of your own immune system. When you understand the basics, you stop being a passive consumer of information and start being someone who can evaluate claims, spot misinformation, and think critically about the world around you.\n\nThis theme covers five core areas: cell biology, chemistry, physics, the human body, and earth science. The questions are designed not just to test knowledge, but to build genuine understanding of the mechanisms that govern life and matter. Whether you are refreshing what you learned in school or exploring these topics for the first time, the goal is the same — to see the world more clearly.',
    E'**Por que importa la alfabetizacion cientifica basica**\n\nLa ciencia no es una coleccion de datos para memorizar — es una forma de pensar sobre el mundo. Desde las celulas que construyen tu cuerpo hasta las fuerzas que mantienen unido el universo, la ciencia basica te da las herramientas para entender como funcionan realmente las cosas. Esta comprension es la base para tomar decisiones informadas sobre salud, tecnologia y medio ambiente.\n\nCada dia interactuas con principios cientificos: la quimica en tu comida, la fisica en tu telefono, la biologia de tu propio sistema inmune. Cuando entiendes los fundamentos, dejas de ser un consumidor pasivo de informacion y empiezas a ser alguien que puede evaluar afirmaciones, detectar desinformacion y pensar criticamente sobre el mundo que te rodea.\n\nEste tema cubre cinco areas fundamentales: biologia celular, quimica, fisica, el cuerpo humano y ciencias de la tierra. Las preguntas estan disenadas no solo para evaluar conocimiento, sino para construir una comprension genuina de los mecanismos que gobiernan la vida y la materia. Ya sea que estes repasando lo que aprendiste en la escuela o explorando estos temas por primera vez, el objetivo es el mismo — ver el mundo con mayor claridad.'
  ) RETURNING id INTO theme_id;

  -- ============================================================================
  -- CATEGORIES (5)
  -- ============================================================================
  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Cell Biology', 'Biologia Celular', 'cell-biology', '#10B981')
  RETURNING id INTO cat_cell_bio;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Chemistry Basics', 'Quimica Basica', 'chemistry-basics', '#3B82F6')
  RETURNING id INTO cat_chemistry;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Physics Fundamentals', 'Fisica Fundamental', 'physics-fundamentals', '#8B5CF6')
  RETURNING id INTO cat_physics;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Human Body', 'Cuerpo Humano', 'human-body', '#EF4444')
  RETURNING id INTO cat_human_body;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Earth & Environment', 'Tierra y Medio Ambiente', 'earth-environment', '#F59E0B')
  RETURNING id INTO cat_earth_env;

  -- ============================================================================
  -- QUESTIONS: Cell Biology (5)
  -- ============================================================================

  -- cb1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_cell_bio, 'multiple_choice',
   'What is the primary function of mitochondria in a cell?',
   'Cual es la funcion principal de las mitocondrias en una celula?',
   '["Producing ATP through cellular respiration", "Storing genetic information", "Synthesizing proteins", "Breaking down waste products"]'::jsonb,
   '["Producir ATP mediante respiracion celular", "Almacenar informacion genetica", "Sintetizar proteinas", "Descomponer productos de desecho"]'::jsonb,
   0,
   'Mitochondria are the powerhouses of the cell. They convert glucose and oxygen into ATP (adenosine triphosphate) through oxidative phosphorylation, providing the energy that drives nearly all cellular processes.',
   'Las mitocondrias son las centrales energeticas de la celula. Convierten glucosa y oxigeno en ATP (adenosin trifosfato) mediante fosforilacion oxidativa, proporcionando la energia que impulsa casi todos los procesos celulares.',
   2);

  -- cb2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_cell_bio, 'true_false',
   'Plant cells have a rigid cell wall made primarily of cellulose, while animal cells do not have a cell wall.',
   'Las celulas vegetales tienen una pared celular rigida compuesta principalmente de celulosa, mientras que las celulas animales no tienen pared celular.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'Plant cells are surrounded by a rigid cell wall made of cellulose that provides structural support. Animal cells lack this wall and instead rely on their flexible plasma membrane and internal cytoskeleton for shape.',
   'Las celulas vegetales estan rodeadas por una pared celular rigida de celulosa que proporciona soporte estructural. Las celulas animales carecen de esta pared y dependen de su membrana plasmatica flexible y citoesqueleto interno.',
   1);

  -- cb3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_cell_bio, 'multiple_choice',
   'Which organelle is responsible for modifying, sorting, and packaging proteins for transport?',
   'Que organelo es responsable de modificar, clasificar y empaquetar proteinas para su transporte?',
   '["Golgi apparatus", "Ribosome", "Nucleus", "Lysosome"]'::jsonb,
   '["Aparato de Golgi", "Ribosoma", "Nucleo", "Lisosoma"]'::jsonb,
   0,
   'The Golgi apparatus acts as the cell''s post office. Proteins arrive from the endoplasmic reticulum, get modified with sugar chains (glycosylation), sorted by destination, and packaged into vesicles for delivery to the cell surface or other organelles.',
   'El aparato de Golgi actua como la oficina de correos de la celula. Las proteinas llegan del reticulo endoplasmatico, se modifican con cadenas de azucar (glicosilacion), se clasifican por destino y se empaquetan en vesiculas para su entrega.',
   3);

  -- cb4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_cell_bio, 'multiple_choice',
   'What molecule carries genetic instructions from DNA in the nucleus to ribosomes for protein synthesis?',
   'Que molecula transporta las instrucciones geneticas del ADN en el nucleo a los ribosomas para la sintesis de proteinas?',
   '["Messenger RNA (mRNA)", "Transfer RNA (tRNA)", "ATP", "Glucose"]'::jsonb,
   '["ARN mensajero (ARNm)", "ARN de transferencia (ARNt)", "ATP", "Glucosa"]'::jsonb,
   0,
   'Messenger RNA is transcribed from DNA in the nucleus and carries the genetic code to ribosomes in the cytoplasm. There, the mRNA sequence is translated into a specific chain of amino acids, forming a protein.',
   'El ARN mensajero se transcribe a partir del ADN en el nucleo y transporta el codigo genetico a los ribosomas en el citoplasma. Alli, la secuencia de ARNm se traduce en una cadena especifica de aminoacidos, formando una proteina.',
   3);

  -- cb5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_cell_bio, 'true_false',
   'Bacteria are eukaryotic cells because they contain a membrane-bound nucleus.',
   'Las bacterias son celulas eucariotas porque contienen un nucleo rodeado de membrana.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'Bacteria are prokaryotic cells — they lack a membrane-bound nucleus. Their DNA floats freely in the cytoplasm in a region called the nucleoid. Eukaryotic cells (plants, animals, fungi) have their DNA enclosed within a nuclear membrane.',
   'Las bacterias son celulas procariotas — carecen de un nucleo rodeado de membrana. Su ADN flota libremente en el citoplasma en una region llamada nucleoide. Las celulas eucariotas (plantas, animales, hongos) tienen su ADN encerrado dentro de una membrana nuclear.',
   1);

  -- ============================================================================
  -- QUESTIONS: Chemistry Basics (5)
  -- ============================================================================

  -- ch1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_chemistry, 'multiple_choice',
   'What type of bond forms when atoms share electrons?',
   'Que tipo de enlace se forma cuando los atomos comparten electrones?',
   '["Covalent bond", "Ionic bond", "Hydrogen bond", "Metallic bond"]'::jsonb,
   '["Enlace covalente", "Enlace ionico", "Enlace de hidrogeno", "Enlace metalico"]'::jsonb,
   0,
   'In a covalent bond, two atoms share one or more pairs of electrons to achieve stable electron configurations. This is the most common bond in organic molecules — carbon, for example, forms four covalent bonds in nearly all its compounds.',
   'En un enlace covalente, dos atomos comparten uno o mas pares de electrones para lograr configuraciones electronicas estables. Es el enlace mas comun en moleculas organicas.',
   2);

  -- ch2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_chemistry, 'multiple_choice',
   'What does the pH scale measure?',
   'Que mide la escala de pH?',
   '["The concentration of hydrogen ions in a solution", "The temperature of a liquid", "The density of a substance", "The electrical conductivity of water"]'::jsonb,
   '["La concentracion de iones de hidrogeno en una solucion", "La temperatura de un liquido", "La densidad de una sustancia", "La conductividad electrica del agua"]'::jsonb,
   0,
   'pH stands for "potential of hydrogen." It measures the concentration of H+ ions on a logarithmic scale from 0 to 14. Below 7 is acidic, 7 is neutral, and above 7 is basic (alkaline). Each unit represents a tenfold change in H+ concentration.',
   'pH significa "potencial de hidrogeno." Mide la concentracion de iones H+ en una escala logaritmica de 0 a 14. Por debajo de 7 es acido, 7 es neutro y por encima de 7 es basico (alcalino).',
   2);

  -- ch3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_chemistry, 'true_false',
   'Water (H2O) is considered the "universal solvent" because it can dissolve more substances than any other common liquid.',
   'El agua (H2O) es considerada el "disolvente universal" porque puede disolver mas sustancias que cualquier otro liquido comun.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'Water''s polarity — with a slightly negative oxygen end and slightly positive hydrogen ends — allows it to dissolve a vast range of ionic and polar substances. This property is essential for all known life, as biological reactions occur in aqueous solution.',
   'La polaridad del agua — con un extremo de oxigeno ligeramente negativo y extremos de hidrogeno ligeramente positivos — le permite disolver una amplia gama de sustancias ionicas y polares. Esta propiedad es esencial para toda la vida conocida.',
   1);

  -- ch4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_chemistry, 'multiple_choice',
   'What is the atomic number of an element determined by?',
   'Que determina el numero atomico de un elemento?',
   '["The number of protons in its nucleus", "The number of neutrons in its nucleus", "The total number of electrons", "The mass of the atom"]'::jsonb,
   '["El numero de protones en su nucleo", "El numero de neutrones en su nucleo", "El numero total de electrones", "La masa del atomo"]'::jsonb,
   0,
   'The atomic number equals the number of protons in the nucleus and defines which element an atom is. Carbon always has 6 protons, oxygen always has 8. Changing the number of protons changes the element itself.',
   'El numero atomico es igual al numero de protones en el nucleo y define que elemento es un atomo. El carbono siempre tiene 6 protones, el oxigeno siempre tiene 8. Cambiar el numero de protones cambia el elemento.',
   1);

  -- ch5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_chemistry, 'multiple_choice',
   'In a chemical reaction, what does the law of conservation of mass state?',
   'En una reaccion quimica, que establece la ley de conservacion de la masa?',
   '["Matter is neither created nor destroyed", "Energy is always released as heat", "Gases are always produced", "Reactions always require a catalyst"]'::jsonb,
   '["La materia no se crea ni se destruye", "La energia siempre se libera como calor", "Siempre se producen gases", "Las reacciones siempre requieren un catalizador"]'::jsonb,
   0,
   'The law of conservation of mass, established by Antoine Lavoisier in 1789, states that the total mass of reactants equals the total mass of products. Atoms are rearranged in chemical reactions, but no atoms are created or lost.',
   'La ley de conservacion de la masa, establecida por Antoine Lavoisier en 1789, establece que la masa total de los reactivos es igual a la masa total de los productos. Los atomos se reorganizan pero no se crean ni se pierden.',
   2);

  -- ============================================================================
  -- QUESTIONS: Physics Fundamentals (5)
  -- ============================================================================

  -- ph1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_physics, 'multiple_choice',
   'What does Newton''s first law of motion describe?',
   'Que describe la primera ley del movimiento de Newton?',
   '["An object at rest stays at rest unless acted on by an external force", "Force equals mass times acceleration", "Every action has an equal and opposite reaction", "Energy cannot be created or destroyed"]'::jsonb,
   '["Un objeto en reposo permanece en reposo a menos que una fuerza externa actue sobre el", "La fuerza es igual a masa por aceleracion", "Toda accion tiene una reaccion igual y opuesta", "La energia no puede crearse ni destruirse"]'::jsonb,
   0,
   'Newton''s first law (the law of inertia) states that an object will maintain its state of rest or uniform motion in a straight line unless compelled to change by a net external force. This is why passengers lurch forward when a car suddenly brakes.',
   'La primera ley de Newton (ley de inercia) establece que un objeto mantendra su estado de reposo o movimiento uniforme en linea recta a menos que una fuerza externa neta lo obligue a cambiar.',
   1);

  -- ph2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_physics, 'true_false',
   'Sound can travel through the vacuum of outer space.',
   'El sonido puede viajar a traves del vacio del espacio exterior.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'Sound is a mechanical wave that requires a medium (solid, liquid, or gas) to propagate. In the vacuum of space, there are no molecules to vibrate and transmit sound waves. This is why "in space, no one can hear you scream."',
   'El sonido es una onda mecanica que requiere un medio (solido, liquido o gas) para propagarse. En el vacio del espacio, no hay moleculas que vibren y transmitan ondas sonoras.',
   1);

  -- ph3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_physics, 'multiple_choice',
   'What is the speed of light in a vacuum, approximately?',
   'Cual es la velocidad de la luz en el vacio, aproximadamente?',
   '["300,000 km/s", "150,000 km/s", "1,000,000 km/s", "30,000 km/s"]'::jsonb,
   '["300.000 km/s", "150.000 km/s", "1.000.000 km/s", "30.000 km/s"]'::jsonb,
   0,
   'The speed of light in a vacuum is approximately 299,792 km/s (about 300,000 km/s). According to Einstein''s special relativity, this is the ultimate speed limit of the universe — nothing with mass can reach or exceed it.',
   'La velocidad de la luz en el vacio es aproximadamente 299.792 km/s (unos 300.000 km/s). Segun la relatividad especial de Einstein, este es el limite de velocidad definitivo del universo.',
   2);

  -- ph4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_physics, 'multiple_choice',
   'What is the SI unit of electrical resistance?',
   'Cual es la unidad del SI de resistencia electrica?',
   '["Ohm", "Volt", "Ampere", "Watt"]'::jsonb,
   '["Ohmio", "Voltio", "Amperio", "Vatio"]'::jsonb,
   0,
   'The ohm (symbol: Omega) is the SI unit of electrical resistance. It is defined by Ohm''s law: R = V/I, where one ohm is the resistance that produces a one-volt drop when one ampere of current flows through it.',
   'El ohmio (simbolo: Omega) es la unidad del SI de resistencia electrica. Se define por la ley de Ohm: R = V/I, donde un ohmio es la resistencia que produce una caida de un voltio cuando fluye un amperio de corriente.',
   2);

  -- ph5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_physics, 'true_false',
   'Gravity is stronger on the Moon than on Earth because the Moon is closer to the Sun.',
   'La gravedad es mas fuerte en la Luna que en la Tierra porque la Luna esta mas cerca del Sol.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'The Moon''s surface gravity is about 1/6 of Earth''s, not stronger. Gravitational acceleration depends on the body''s mass and radius, not its distance from the Sun. The Moon is much less massive than Earth, so its gravitational pull is weaker.',
   'La gravedad superficial de la Luna es aproximadamente 1/6 de la de la Tierra, no mas fuerte. La aceleracion gravitacional depende de la masa y el radio del cuerpo, no de su distancia al Sol.',
   1);

  -- ============================================================================
  -- QUESTIONS: Human Body (5)
  -- ============================================================================

  -- hb1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_human_body, 'multiple_choice',
   'Which organ in the human body is primarily responsible for filtering blood and producing urine?',
   'Que organo del cuerpo humano es el principal responsable de filtrar la sangre y producir orina?',
   '["Kidneys", "Liver", "Lungs", "Spleen"]'::jsonb,
   '["Rinones", "Higado", "Pulmones", "Bazo"]'::jsonb,
   0,
   'The kidneys filter approximately 180 liters of blood per day, removing waste products and excess fluid to produce about 1-2 liters of urine. They also regulate electrolyte balance, blood pressure, and red blood cell production.',
   'Los rinones filtran aproximadamente 180 litros de sangre por dia, eliminando productos de desecho y liquido en exceso para producir entre 1 y 2 litros de orina. Tambien regulan el equilibrio de electrolitos y la presion arterial.',
   1);

  -- hb2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_human_body, 'multiple_choice',
   'What type of blood cells are the primary defenders against infections in the immune system?',
   'Que tipo de celulas sanguineas son las principales defensoras contra infecciones en el sistema inmune?',
   '["White blood cells (leukocytes)", "Red blood cells (erythrocytes)", "Platelets (thrombocytes)", "Plasma proteins"]'::jsonb,
   '["Globulos blancos (leucocitos)", "Globulos rojos (eritrocitos)", "Plaquetas (trombocitos)", "Proteinas del plasma"]'::jsonb,
   0,
   'White blood cells (leukocytes) are the immune system''s soldiers. They include neutrophils (first responders), lymphocytes (B-cells make antibodies, T-cells kill infected cells), monocytes (which become macrophages), and others that coordinate the defense against pathogens.',
   'Los globulos blancos (leucocitos) son los soldados del sistema inmune. Incluyen neutrofilos (primeros respondedores), linfocitos (las celulas B producen anticuerpos, las celulas T matan celulas infectadas) y monocitos que coordinan la defensa contra patogenos.',
   2);

  -- hb3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_human_body, 'true_false',
   'The human skeleton is made entirely of bone from birth and does not change throughout life.',
   'El esqueleto humano esta hecho completamente de hueso desde el nacimiento y no cambia a lo largo de la vida.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'At birth, much of the skeleton is cartilage that gradually ossifies (turns to bone) during childhood. Even in adults, bone is living tissue that constantly remodels — osteoclasts break down old bone while osteoblasts build new bone, replacing the entire skeleton roughly every 10 years.',
   'Al nacer, gran parte del esqueleto es cartilago que gradualmente se osifica durante la infancia. Incluso en adultos, el hueso es tejido vivo que se remodela constantemente, reemplazando todo el esqueleto aproximadamente cada 10 anos.',
   2);

  -- hb4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_human_body, 'multiple_choice',
   'Which part of the brain is responsible for regulating balance, coordination, and fine motor control?',
   'Que parte del cerebro es responsable de regular el equilibrio, la coordinacion y el control motor fino?',
   '["Cerebellum", "Cerebral cortex", "Hippocampus", "Medulla oblongata"]'::jsonb,
   '["Cerebelo", "Corteza cerebral", "Hipocampo", "Bulbo raquideo"]'::jsonb,
   0,
   'The cerebellum, located at the back and base of the brain, contains over half of all neurons in the brain despite being only 10% of its volume. It fine-tunes motor commands, maintains posture and balance, and plays a role in motor learning.',
   'El cerebelo, ubicado en la parte posterior e inferior del cerebro, contiene mas de la mitad de todas las neuronas del cerebro a pesar de ser solo el 10% de su volumen. Ajusta los comandos motores, mantiene la postura y el equilibrio.',
   3);

  -- hb5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_human_body, 'multiple_choice',
   'What is the largest organ in the human body?',
   'Cual es el organo mas grande del cuerpo humano?',
   '["Skin", "Liver", "Small intestine", "Lungs"]'::jsonb,
   '["Piel", "Higado", "Intestino delgado", "Pulmones"]'::jsonb,
   0,
   'The skin is the largest organ, covering approximately 1.5-2 square meters in adults and weighing about 3.6 kg. It serves as a barrier against pathogens, regulates body temperature, provides sensory input, and synthesizes vitamin D from sunlight.',
   'La piel es el organo mas grande, cubriendo aproximadamente 1,5-2 metros cuadrados en adultos y pesando alrededor de 3,6 kg. Sirve como barrera contra patogenos, regula la temperatura corporal y sintetiza vitamina D a partir de la luz solar.',
   1);

  -- ============================================================================
  -- QUESTIONS: Earth & Environment (5)
  -- ============================================================================

  -- ee1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_earth_env, 'multiple_choice',
   'What are the three main layers of the Earth''s interior?',
   'Cuales son las tres capas principales del interior de la Tierra?',
   '["Crust, mantle, and core", "Lithosphere, hydrosphere, and atmosphere", "Troposphere, stratosphere, and mesosphere", "Sedimentary, igneous, and metamorphic"]'::jsonb,
   '["Corteza, manto y nucleo", "Litosfera, hidrosfera y atmosfera", "Troposfera, estratosfera y mesosfera", "Sedimentaria, ignea y metamorfica"]'::jsonb,
   0,
   'The Earth has three main layers: the thin crust (5-70 km), the mantle (2,900 km thick, making up 84% of Earth''s volume), and the core (inner solid, outer liquid, extending 3,485 km to the center). Convection in the mantle drives plate tectonics.',
   'La Tierra tiene tres capas principales: la delgada corteza (5-70 km), el manto (2.900 km de grosor, constituyendo el 84% del volumen terrestre) y el nucleo (interior solido, exterior liquido, extendiendose 3.485 km hasta el centro).',
   1);

  -- ee2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_earth_env, 'multiple_choice',
   'What gas makes up approximately 78% of Earth''s atmosphere?',
   'Que gas compone aproximadamente el 78% de la atmosfera terrestre?',
   '["Nitrogen", "Oxygen", "Carbon dioxide", "Argon"]'::jsonb,
   '["Nitrogeno", "Oxigeno", "Dioxido de carbono", "Argon"]'::jsonb,
   0,
   'Earth''s atmosphere is approximately 78% nitrogen (N2), 21% oxygen (O2), and 1% other gases including argon (0.93%) and carbon dioxide (0.04%). Despite its small concentration, CO2 plays a critical role in regulating Earth''s temperature through the greenhouse effect.',
   'La atmosfera terrestre es aproximadamente 78% nitrogeno (N2), 21% oxigeno (O2) y 1% otros gases. A pesar de su pequena concentracion, el CO2 juega un papel critico en la regulacion de la temperatura terrestre mediante el efecto invernadero.',
   1);

  -- ee3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_earth_env, 'true_false',
   'The ozone layer protects life on Earth by absorbing most of the Sun''s harmful ultraviolet (UV) radiation.',
   'La capa de ozono protege la vida en la Tierra al absorber la mayor parte de la radiacion ultravioleta (UV) danina del Sol.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'The ozone layer in the stratosphere (15-35 km altitude) absorbs 97-99% of the Sun''s harmful UV-B and UV-C radiation. Without it, surface UV levels would be lethal to most life. The 1987 Montreal Protocol successfully addressed ozone depletion from CFCs.',
   'La capa de ozono en la estratosfera (15-35 km de altitud) absorbe el 97-99% de la radiacion UV-B y UV-C danina del Sol. Sin ella, los niveles de UV en la superficie serian letales para la mayoria de la vida.',
   2);

  -- ee4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_earth_env, 'multiple_choice',
   'What drives the movement of tectonic plates on Earth''s surface?',
   'Que impulsa el movimiento de las placas tectonicas en la superficie terrestre?',
   '["Convection currents in the mantle", "The rotation of the Earth", "Solar radiation heating the crust", "Gravitational pull from the Moon"]'::jsonb,
   '["Corrientes de conveccion en el manto", "La rotacion de la Tierra", "Radiacion solar calentando la corteza", "Atraccion gravitacional de la Luna"]'::jsonb,
   0,
   'Tectonic plates move due to convection currents in the semi-fluid asthenosphere of the upper mantle. Hot material rises from near the core, spreads laterally, cools, and sinks back down, dragging plates along. This process causes earthquakes, volcanic activity, and mountain building.',
   'Las placas tectonicas se mueven debido a corrientes de conveccion en la astenosfera semifluida del manto superior. El material caliente asciende cerca del nucleo, se extiende lateralmente, se enfria y desciende, arrastrando las placas.',
   3);

  -- ee5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_earth_env, 'true_false',
   'Fossil fuels are considered a renewable energy source because new deposits form naturally over time.',
   'Los combustibles fosiles se consideran una fuente de energia renovable porque nuevos depositos se forman naturalmente con el tiempo.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'Fossil fuels (coal, oil, natural gas) are non-renewable because they take millions of years to form from ancient organic matter under extreme heat and pressure. Humanity consumes them far faster than geological processes can replace them, making them a finite resource.',
   'Los combustibles fosiles (carbon, petroleo, gas natural) son no renovables porque tardan millones de anos en formarse a partir de materia organica antigua bajo calor y presion extremos. La humanidad los consume mucho mas rapido de lo que los procesos geologicos pueden reponerlos.',
   1);

END $$;
