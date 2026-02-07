-- Seed: Vaccines & Longevity theme with 63 questions across 10 categories
-- This migration populates the initial content from the original prototype

DO $$
DECLARE
  theme_id UUID;
  cat_shingles UUID;
  cat_flu UUID;
  cat_pneumococcal UUID;
  cat_rsv UUID;
  cat_covid UUID;
  cat_hpv UUID;
  cat_tdap UUID;
  cat_hepb UUID;
  cat_hepa UUID;
  cat_crosscutting UUID;
BEGIN
  -- ============================================================================
  -- THEME
  -- ============================================================================
  INSERT INTO themes (title_en, title_es, description_en, description_es, icon, color, is_builtin, is_active, intro_text_en, intro_text_es)
  VALUES (
    'Vaccines & Longevity',
    'Vacunas y Longevidad',
    'Learn how vaccines protect not just against infections, but contribute to longevity and healthy aging.',
    'Aprende cómo las vacunas protegen no solo contra infecciones, sino que contribuyen a la longevidad y el envejecimiento saludable.',
    '💉',
    '#10b981',
    true,
    true,
    E'**The Longevity Protocol: Why These Vaccines Matter for Adults**\n\n**1. Shingles (Shingrix)**\nWhile commonly thought of as an "old person''s rash," the Varicella-Zoster virus lives dormant in your nerves. Reactivation causes severe nerve damage (neuralgia) that can last for years. More importantly for healthspan, a shingles outbreak significantly increases the risk of stroke and heart attack in the months following infection due to vascular inflammation. Recent data also suggests this vaccine may reduce the risk of dementia by preventing viral neuro-inflammation.\n\n**2. Pneumococcal (Prevenar 20)**\nPneumonia is a major cause of "aging acceleration." Severe lung infections often leave permanent scarring (fibrosis), reducing your lung capacity and oxygen exchange efficiency for the rest of your life. By preventing bacterial pneumonia, you preserve your respiratory reserve, which is a key predictor of longevity.\n\n**3. RSV (Arexvy / Abrysvo)**\nRespiratory Syncytial Virus is often dismissed as a cold, but in adults, it causes significant cardiac stress. It inflames the arteries, increasing the risk of severe cardiovascular events (like heart failure) in regular, healthy adults. Vaccination removes this substantial inflammatory trigger from your yearly risks.\n\n**4. COVID-19**\nBeyond the acute phase, the primary utility of boosters is protecting the vascular and neurological systems. Repeated infections are linked to cumulative damage to blood vessel linings and "brain fog" (neuro-inflammation). Keeping immunity updated reduces the likelihood of Long COVID, which can be a chronic, debilitating condition.\n\n**5. Influenza (Flu)**\nThe flu is a systemic "inflammation bomb." In the weeks following a flu infection, the risk of heart attack and stroke skyrockets\u2014even in healthy 40-year-olds. The flu shot is effectively a cardioprotective intervention, keeping systemic inflammation low and arteries stable.\n\n**6. Tdap (Tetanus, Diphtheria, Pertussis)**\nThis booster is standard for avoiding acute infection, but it has a hidden benefit: general immune training. Large-scale studies have found a correlation between Tdap vaccination and a significantly lower risk of developing dementia and Alzheimer''s later in life, likely due to "off-target" beneficial effects on the immune system.\n\n**7. HPV (Gardasil 9)**\nThis is strictly a cancer-prevention tool. HPV is responsible for the vast majority of cervical, anal, and increasingly, oropharyngeal (throat) cancers in men and women. Vaccination at this age eliminates the viral reservoir that causes these cancers, removing a major category of preventable mortality.\n\n**8. Hepatitis B**\nThis vaccine protects the liver, your body''s primary filtration and detoxification organ. Chronic Hepatitis B is a leading cause of liver cirrhosis and liver cancer. Ensuring immunity now guarantees that your liver remains free from this viral damage for life.',
    E'**El Protocolo de Longevidad: Por qué son importantes estas vacunas**\n\n**1. Herpes Zóster (Shingrix)**\nAunque se suele asociar a la tercera edad, el virus de la varicela vive latente en tus nervios. Su reactivación provoca daños nerviosos graves (neuralgia) que pueden durar años. Para la longevidad, lo crucial es que un brote de Zóster dispara el riesgo de ictus e infarto en los meses posteriores debido a la inflamación vascular. Datos recientes sugieren que esta vacuna podría reducir el riesgo de demencia al evitar la neuroinflamación viral.\n\n**2. Neumococo (Prevenar 20)**\nLa neumonía es una de las principales causas de "envejecimiento acelerado". Las infecciones pulmonares graves suelen dejar cicatrices permanentes (fibrosis), reduciendo la capacidad pulmonar y la eficiencia de oxígeno para el resto de la vida. Al prevenir la neumonía bacteriana, preservas tu reserva respiratoria, un indicador clave de longevidad.\n\n**3. VRS (Arexvy / Abrysvo)**\nEl Virus Respiratorio Sincitial suele subestimarse como un catarro, pero en adultos provoca un estrés cardíaco significativo. Inflama las arterias y eleva el riesgo de eventos cardiovasculares graves (como insuficiencia cardíaca) en adultos sanos. La vacuna elimina este disparador inflamatorio de tus riesgos anuales.\n\n**4. COVID-19**\nMás allá de la fase aguda, la utilidad principal de los refuerzos es proteger los sistemas vascular y neurológico. Las infecciones repetidas se asocian a daños acumulativos en el revestimiento de los vasos sanguíneos y a la "niebla mental". Mantener la inmunidad actualizada reduce la probabilidad de COVID Persistente (Long COVID), una condición crónica debilitante.\n\n**5. Gripe (Influenza)**\nLa gripe es una "bomba inflamatoria" sistémica. En las semanas posteriores a una infección gripal, el riesgo de infarto e ictus se dispara, incluso en personas sanas de 40 años. La vacuna de la gripe actúa, en la práctica, como una intervención cardioprotectora, manteniendo baja la inflamación sistémica y estables las arterias.\n\n**6. Tdap (Tétanos, Difteria, Tosferina)**\nEste refuerzo es estándar para evitar infecciones agudas, pero tiene un beneficio oculto: el entrenamiento inmunológico general. Estudios a gran escala han encontrado una correlación entre la vacuna Tdap y un riesgo significativamente menor de desarrollar demencia y Alzheimer en la vejez, probablemente debido a efectos beneficiosos "inespecíficos" sobre el sistema inmune.\n\n**7. VPH (Gardasil 9)**\nEs estrictamente una herramienta de prevención del cáncer. El VPH es responsable de la gran mayoría de cánceres de cuello uterino, anal y, cada vez más, orofaríngeo (garganta) en hombres y mujeres. Vacunarse a esta edad elimina el reservorio viral que causa estos tumores, suprimiendo una causa mayor de mortalidad prevenible.\n\n**8. Hepatitis B**\nEsta vacuna protege el hígado, el principal órgano de filtración y desintoxicación del cuerpo. La Hepatitis B crónica es una causa principal de cirrosis y cáncer de hígado. Asegurar la inmunidad ahora garantiza que tu hígado permanezca libre de este daño viral de por vida.'
  ) RETURNING id INTO theme_id;

  -- ============================================================================
  -- CATEGORIES (10)
  -- ============================================================================
  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Shingles (Shingrix)', 'Herpes Zóster (Shingrix)', 'shingles', '#a78bfa')
  RETURNING id INTO cat_shingles;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Influenza', 'Influenza', 'flu', '#60a5fa')
  RETURNING id INTO cat_flu;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Pneumococcal', 'Neumocócica', 'pneumococcal', '#34d399')
  RETURNING id INTO cat_pneumococcal;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'RSV', 'VRS', 'rsv', '#f472b6')
  RETURNING id INTO cat_rsv;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'COVID-19', 'COVID-19', 'covid', '#fb923c')
  RETURNING id INTO cat_covid;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'HPV (Gardasil 9)', 'VPH (Gardasil 9)', 'hpv', '#facc15')
  RETURNING id INTO cat_hpv;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Tdap (Boostrix)', 'Tdap (Boostrix)', 'tdap', '#2dd4bf')
  RETURNING id INTO cat_tdap;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Hepatitis B', 'Hepatitis B', 'hepb', '#c084fc')
  RETURNING id INTO cat_hepb;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Hepatitis A', 'Hepatitis A', 'hepa', '#fb7185')
  RETURNING id INTO cat_hepa;

  INSERT INTO categories (theme_id, name_en, name_es, slug, color)
  VALUES (theme_id, 'Cross-Cutting Longevity', 'Longevidad Transversal', 'cross-cutting', '#94a3b8')
  RETURNING id INTO cat_crosscutting;

  -- ============================================================================
  -- QUESTIONS: Shingles (5)
  -- ============================================================================

  -- sh1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, extra_en, extra_es, difficulty) VALUES
  (cat_shingles, 'multiple_choice',
   'What type of vaccine is Shingrix?',
   '¿Qué tipo de vacuna es Shingrix?',
   '["Recombinant adjuvanted", "Live attenuated", "mRNA-based", "Inactivated whole virus"]'::jsonb,
   '["Recombinante con adyuvante", "Atenuada viva", "Basada en ARNm", "Virus inactivado completo"]'::jsonb,
   0,
   'Shingrix is a recombinant vaccine using the VZV glycoprotein E with the AS01B adjuvant system, providing strong immune stimulation without live virus.',
   'Shingrix es una vacuna recombinante que utiliza la glicoproteína E del VZV con el sistema adyuvante AS01B, proporcionando una fuerte estimulación inmune sin virus vivo.',
   E'There are four main types of vaccines, each teaching your immune system differently. Live attenuated vaccines use a weakened version of the actual virus — like training against a slow sparring partner. Inactivated vaccines use a killed virus — safe but sometimes needs boosters. mRNA vaccines give your cells temporary instructions to build a viral protein, like sending a recipe instead of the dish. Recombinant vaccines (like Shingrix) use lab-made protein pieces plus an adjuvant booster — it''s like showing your immune system a detailed wanted poster with a megaphone to make sure it pays attention.',
   E'Hay cuatro tipos principales de vacunas, cada una enseña a tu sistema inmune de forma diferente. Las vacunas atenuadas vivas usan una versión debilitada del virus real — como entrenar contra un compañero de sparring lento. Las inactivadas usan virus muertos — seguras pero a veces necesitan refuerzos. Las vacunas de ARNm dan a tus células instrucciones temporales para construir una proteína viral, como enviar una receta en vez del plato. Las recombinantes (como Shingrix) usan piezas de proteína hechas en laboratorio más un refuerzo adyuvante — es como mostrarle a tu sistema inmune un cartel de ''se busca'' detallado con un megáfono para asegurarse de que preste atención.',
   5);

  -- sh2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_shingles, 'true_false',
   'Shingrix has been associated with a reduced risk of dementia in observational studies.',
   'Shingrix se ha asociado con un menor riesgo de demencia en estudios observacionales.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'Multiple observational studies have found that Shingrix vaccination correlates with a 17-20% lower risk of dementia, possibly by reducing neuroinflammation from latent VZV reactivation.',
   'Múltiples estudios observacionales han encontrado que la vacunación con Shingrix se correlaciona con un 17-20% menos de riesgo de demencia, posiblemente al reducir la neuroinflamación por reactivación latente del VZV.',
   5);

  -- sh3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_shingles, 'multiple_choice',
   'Which hidden longevity benefit has been linked to shingles vaccination?',
   '¿Qué beneficio oculto de longevidad se ha vinculado a la vacuna contra el herpes zóster?',
   '["Reduced stroke risk", "Improved bone density", "Enhanced muscle growth", "Better kidney function"]'::jsonb,
   '["Menor riesgo de ACV", "Mejora de densidad ósea", "Mayor crecimiento muscular", "Mejor función renal"]'::jsonb,
   0,
   'Shingles vaccination has been associated with reduced stroke risk, likely because herpes zoster reactivation can trigger vascular inflammation and increase stroke likelihood.',
   'La vacunación contra el herpes zóster se ha asociado con menor riesgo de ACV, probablemente porque la reactivación del herpes zóster puede desencadenar inflamación vascular.',
   5);

  -- sh4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_shingles, 'multiple_choice',
   'At what age is Shingrix primarily recommended?',
   '¿A qué edad se recomienda principalmente Shingrix?',
   '["50 and older", "65 and older", "40 and older", "Any adult"]'::jsonb,
   '["50 años o más", "65 años o más", "40 años o más", "Cualquier adulto"]'::jsonb,
   0,
   'Shingrix is recommended for adults 50 and older, though immunocompromised individuals may receive it earlier. The risk of shingles increases significantly with age-related immune decline.',
   'Shingrix se recomienda para adultos de 50 años o más, aunque las personas inmunocomprometidas pueden recibirla antes.',
   5);

  -- sh5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_shingles, 'multiple_choice',
   'Shingrix requires how many doses for full protection?',
   '¿Cuántas dosis de Shingrix se necesitan para protección completa?',
   '["2 doses, 2-6 months apart", "1 single dose", "3 doses over 12 months", "Annual booster"]'::jsonb,
   '["2 dosis, con 2-6 meses de separación", "1 dosis única", "3 dosis en 12 meses", "Refuerzo anual"]'::jsonb,
   0,
   'Shingrix is given as two intramuscular doses 2-6 months apart. The second dose is crucial for achieving over 90% efficacy that lasts at least 7-10 years.',
   'Shingrix se administra en dos dosis intramusculares con 2-6 meses de separación. La segunda dosis es crucial para lograr más del 90% de eficacia.',
   5);

  -- ============================================================================
  -- QUESTIONS: Influenza (5)
  -- ============================================================================

  -- fl1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, extra_en, extra_es, difficulty) VALUES
  (cat_flu, 'multiple_choice',
   'How does annual flu vaccination provide longevity benefits beyond preventing influenza?',
   '¿Cómo la vacunación anual contra la gripe proporciona beneficios de longevidad más allá de prevenir la influenza?',
   '["Reduces cardiovascular events and heart attacks", "Increases telomere length", "Directly kills cancer cells", "Reverses arterial plaque"]'::jsonb,
   '["Reduce eventos cardiovasculares e infartos", "Aumenta la longitud de los telómeros", "Mata células cancerosas directamente", "Revierte placa arterial"]'::jsonb,
   0,
   'Flu vaccination has been shown to reduce the risk of major cardiovascular events by 26-36%, comparable to statins or smoking cessation. Influenza triggers systemic inflammation that destabilizes arterial plaques.',
   E'Se ha demostrado que la vacunación contra la gripe reduce el riesgo de eventos cardiovasculares mayores en un 26-36%, comparable a las estatinas o dejar de fumar.',
   E'When you catch the flu, your entire body goes to war — not just your lungs. The massive inflammation flood reaches your blood vessels, where fatty deposits (plaques) sit on artery walls. Think of these plaques like a snow globe sitting on a shelf: normally stable and quiet. But the flu''s inflammation is like someone shaking that snow globe violently — the plaque can crack open, and the "snow" (clot-forming material) spills into your bloodstream, potentially blocking blood flow to your heart (heart attack) or brain (stroke). That''s why a simple flu shot protects your heart as much as cholesterol medication.',
   E'Cuando te da gripe, todo tu cuerpo entra en guerra — no solo tus pulmones. La inundación masiva de inflamación llega a tus vasos sanguíneos, donde depósitos de grasa (placas) están en las paredes arteriales. Piensa en estas placas como una bola de nieve decorativa en un estante: normalmente estable y tranquila. Pero la inflamación de la gripe es como alguien sacudiendo esa bola de nieve violentamente — la placa puede romperse, y la "nieve" (material formador de coágulos) se derrama en tu torrente sanguíneo, potencialmente bloqueando el flujo de sangre a tu corazón (infarto) o cerebro (derrame). Por eso una simple vacuna antigripal protege tu corazón tanto como los medicamentos para el colesterol.',
   5);

  -- fl2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_flu, 'true_false',
   'The high-dose flu vaccine (Fluzone High-Dose) is specifically designed for adults 65+ because of immunosenescence.',
   'La vacuna antigripal de alta dosis (Fluzone High-Dose) está diseñada específicamente para adultos de 65+ debido a la inmunosenescencia.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'Fluzone High-Dose contains 4x the antigen of standard doses to overcome age-related immune decline (immunosenescence), producing stronger antibody responses in older adults.',
   'Fluzone High-Dose contiene 4 veces más antígeno que las dosis estándar para superar el declive inmune relacionado con la edad (inmunosenescencia).',
   5);

  -- fl3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_flu, 'multiple_choice',
   'What cardiovascular benefit has been demonstrated for flu vaccination after a recent heart attack?',
   '¿Qué beneficio cardiovascular se ha demostrado para la vacunación antigripal después de un infarto reciente?',
   '["Reduced risk of a second cardiac event", "Elimination of atrial fibrillation", "Reversal of heart failure", "Cure for hypertension"]'::jsonb,
   '["Menor riesgo de un segundo evento cardíaco", "Eliminación de fibrilación auricular", "Reversión de insuficiencia cardíaca", "Cura para la hipertensión"]'::jsonb,
   0,
   'The IAMI trial showed that flu vaccination within 72 hours of a heart attack reduced the risk of subsequent major cardiac events, making it a recommended intervention post-MI.',
   'El ensayo IAMI mostró que la vacunación antigripal dentro de las 72 horas de un infarto redujo el riesgo de eventos cardíacos mayores subsiguientes.',
   5);

  -- fl4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_flu, 'multiple_choice',
   'Which flu vaccine formulation uses an adjuvant to boost immune response in elderly patients?',
   '¿Qué formulación de vacuna antigripal usa un adyuvante para potenciar la respuesta inmune en pacientes ancianos?',
   '["Fluad (adjuvanted with MF59)", "Fluzone standard dose", "FluMist nasal spray", "Flublok recombinant"]'::jsonb,
   '["Fluad (adyuvantada con MF59)", "Fluzone dosis estándar", "FluMist spray nasal", "Flublok recombinante"]'::jsonb,
   0,
   E'Fluad uses the MF59 oil-in-water adjuvant to enhance immune response in adults 65+. It''s an alternative to the high-dose approach for overcoming immunosenescence.',
   'Fluad utiliza el adyuvante de aceite en agua MF59 para mejorar la respuesta inmune en adultos de 65+. Es una alternativa al enfoque de alta dosis.',
   5);

  -- fl5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_flu, 'true_false',
   'Repeated annual flu vaccination has been shown to have a cumulative protective effect against dementia.',
   'La vacunación anual repetida contra la gripe ha demostrado tener un efecto protector acumulativo contra la demencia.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   E'Studies show that people who receive flu vaccines over multiple consecutive years have a progressively lower risk of Alzheimer''s and dementia, suggesting cumulative neuroprotective benefits.',
   'Los estudios muestran que las personas que reciben vacunas antigripales durante múltiples años consecutivos tienen un riesgo progresivamente menor de Alzheimer y demencia.',
   5);

  -- ============================================================================
  -- QUESTIONS: Pneumococcal (5)
  -- ============================================================================

  -- pn1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_pneumococcal, 'multiple_choice',
   'What is the brand name of the 20-valent pneumococcal conjugate vaccine?',
   '¿Cuál es el nombre comercial de la vacuna conjugada neumocócica de 20 valencias?',
   '["Prevnar 20 (PCV20)", "Pneumovax 23", "Vaxneuvance", "Synflorix"]'::jsonb,
   '["Prevnar 20 (PCV20)", "Pneumovax 23", "Vaxneuvance", "Synflorix"]'::jsonb,
   0,
   'Prevnar 20 (PCV20) covers 20 pneumococcal serotypes with conjugate technology that produces stronger, longer-lasting immunity than polysaccharide vaccines, especially in older adults.',
   'Prevnar 20 (PCV20) cubre 20 serotipos neumocócicos con tecnología conjugada que produce inmunidad más fuerte y duradera que las vacunas polisacáridas.',
   5);

  -- pn2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_pneumococcal, 'true_false',
   'Pneumococcal vaccination can reduce the risk of heart attacks by preventing bacteremia-induced cardiac damage.',
   'La vacunación neumocócica puede reducir el riesgo de infartos al prevenir el daño cardíaco inducido por bacteremia.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'Streptococcus pneumoniae can directly invade heart tissue during bacteremia, forming microlesions. Preventing pneumococcal disease with vaccination protects against this cardiac damage pathway.',
   'Streptococcus pneumoniae puede invadir directamente el tejido cardíaco durante la bacteremia, formando microlesiones. Prevenir la enfermedad neumocócica protege contra esta vía de daño cardíaco.',
   5);

  -- pn3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_pneumococcal, 'multiple_choice',
   'How does pneumococcal vaccination contribute to longevity beyond preventing pneumonia?',
   '¿Cómo contribuye la vacunación neumocócica a la longevidad más allá de prevenir la neumonía?',
   '["Prevents accelerated aging from severe infections", "Increases growth hormone levels", "Reverses mitochondrial damage", "Extends telomeres directly"]'::jsonb,
   '["Previene el envejecimiento acelerado por infecciones graves", "Aumenta los niveles de hormona de crecimiento", "Revierte el daño mitocondrial", "Extiende los telómeros directamente"]'::jsonb,
   0,
   'Severe pneumococcal infections cause lasting organ damage, chronic inflammation, and accelerated biological aging. Prevention avoids this cascade of damage that shortens healthspan.',
   'Las infecciones neumocócicas graves causan daño orgánico duradero, inflamación crónica y envejecimiento biológico acelerado. La prevención evita esta cascada de daño.',
   5);

  -- pn4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, extra_en, extra_es, difficulty) VALUES
  (cat_pneumococcal, 'multiple_choice',
   'What is the key advantage of conjugate pneumococcal vaccines (PCV) over polysaccharide vaccines (PPSV23)?',
   '¿Cuál es la ventaja clave de las vacunas neumocócicas conjugadas (PCV) sobre las polisacáridas (PPSV23)?',
   '["They produce T-cell dependent immunity with memory", "They cover more serotypes", "They are cheaper to produce", "They never need boosters"]'::jsonb,
   '["Producen inmunidad dependiente de células T con memoria", "Cubren más serotipos", "Son más baratas de producir", "Nunca necesitan refuerzos"]'::jsonb,
   0,
   'Conjugate vaccines link polysaccharides to a protein carrier, engaging T-cell help and creating immune memory. PPSV23 only triggers T-independent B-cell responses with no lasting memory.',
   'Las vacunas conjugadas unen polisacáridos a una proteína transportadora, activando la ayuda de células T y creando memoria inmune.',
   E'Imagine your immune system is a detective agency. Polysaccharide vaccines only show the detectives a blurry photo of the criminal — they might recognize them tomorrow, but they''ll forget the face within weeks. Conjugate vaccines show both a sharp photo AND a detailed description (the protein carrier), which activates T-cells — the agency''s memory experts. These memory experts file the case permanently, so even years later, your immune system can spot and arrest the criminal on sight. That''s why conjugate vaccines give longer-lasting, stronger protection.',
   E'Imagina que tu sistema inmune es una agencia de detectives. Las vacunas polisacáridas solo les muestran a los detectives una foto borrosa del criminal — podrían reconocerlo mañana, pero olvidarán la cara en semanas. Las vacunas conjugadas muestran tanto una foto nítida COMO una descripción detallada (la proteína transportadora), lo que activa las células T — los expertos en memoria de la agencia. Estos expertos archivan el caso permanentemente, así que incluso años después, tu sistema inmune puede detectar y arrestar al criminal a primera vista. Por eso las vacunas conjugadas dan protección más fuerte y duradera.',
   5);

  -- pn5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_pneumococcal, 'multiple_choice',
   'Surviving a serious pneumococcal infection has been shown to increase the risk of which condition?',
   'Sobrevivir una infección neumocócica grave ha demostrado aumentar el riesgo de qué condición?',
   '["Long-term cognitive decline", "Type 1 diabetes", "Autoimmune thyroiditis", "Celiac disease"]'::jsonb,
   '["Deterioro cognitivo a largo plazo", "Diabetes tipo 1", "Tiroiditis autoinmune", "Enfermedad celíaca"]'::jsonb,
   0,
   'Survivors of invasive pneumococcal disease show increased rates of cognitive decline and dementia, likely due to neuroinflammation and micro-vascular damage during infection.',
   'Los sobrevivientes de enfermedad neumocócica invasiva muestran mayores tasas de deterioro cognitivo y demencia, probablemente debido a neuroinflamación y daño microvascular.',
   5);

  -- ============================================================================
  -- QUESTIONS: RSV (5)
  -- ============================================================================

  -- rs1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_rsv, 'multiple_choice',
   'What is the brand name of the RSV vaccine approved for adults 60+?',
   '¿Cuál es el nombre comercial de la vacuna contra el VRS aprobada para adultos de 60+?',
   '["Arexvy (GSK) or Abrysvo (Pfizer)", "Gardasil", "Prevnar", "Shingrix"]'::jsonb,
   '["Arexvy (GSK) o Abrysvo (Pfizer)", "Gardasil", "Prevnar", "Shingrix"]'::jsonb,
   0,
   'Arexvy (GSK) and Abrysvo (Pfizer) were both approved in 2023 for adults 60+. They use prefusion F protein stabilization technology to generate protective antibodies.',
   'Arexvy (GSK) y Abrysvo (Pfizer) fueron aprobadas en 2023 para adultos de 60+. Utilizan tecnología de estabilización de proteína F de prefusión.',
   5);

  -- rs2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_rsv, 'true_false',
   'RSV is primarily dangerous only for infants, not older adults.',
   'El VRS es peligroso principalmente solo para bebés, no para adultos mayores.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'False. RSV causes ~14,000 deaths annually in US adults 65+, and ~177,000 hospitalizations. It''s a major cause of morbidity in older adults, not just infants.',
   E'Falso. El VRS causa ~14.000 muertes anuales en adultos estadounidenses de 65+ y ~177.000 hospitalizaciones. Es una causa importante de morbilidad en adultos mayores.',
   5);

  -- rs3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_rsv, 'multiple_choice',
   'What longevity mechanism makes RSV vaccination important for older adults?',
   '¿Qué mecanismo de longevidad hace importante la vacunación contra el VRS para adultos mayores?',
   '["Prevents lung damage that accelerates frailty", "Reverses existing COPD", "Regenerates lung tissue", "Eliminates all respiratory viruses"]'::jsonb,
   '["Previene daño pulmonar que acelera la fragilidad", "Revierte EPOC existente", "Regenera tejido pulmonar", "Elimina todos los virus respiratorios"]'::jsonb,
   0,
   'Severe RSV infections cause lasting lung damage, reduced pulmonary function, and accelerated frailty in older adults. This creates a downward spiral of declining health and independence.',
   'Las infecciones graves por VRS causan daño pulmonar duradero, función pulmonar reducida y fragilidad acelerada en adultos mayores.',
   5);

  -- rs4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_rsv, 'multiple_choice',
   'RSV infection in older adults has been linked to exacerbation of which chronic conditions?',
   'La infección por VRS en adultos mayores se ha vinculado a la exacerbación de qué condiciones crónicas?',
   '["COPD and heart failure", "Only asthma", "Only diabetes", "Only arthritis"]'::jsonb,
   '["EPOC e insuficiencia cardíaca", "Solo asma", "Solo diabetes", "Solo artritis"]'::jsonb,
   0,
   'RSV is a major trigger for acute exacerbations of COPD and can destabilize heart failure. These cascading effects make RSV a significant contributor to morbidity and mortality in elderly patients.',
   'El VRS es un desencadenante importante de exacerbaciones agudas de EPOC y puede desestabilizar la insuficiencia cardíaca.',
   5);

  -- rs5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, extra_en, extra_es, difficulty) VALUES
  (cat_rsv, 'true_false',
   'The prefusion F protein used in RSV vaccines was a breakthrough because the postfusion form generates much weaker protective antibodies.',
   'La proteína F de prefusión utilizada en las vacunas contra el VRS fue un avance porque la forma de postfusión genera anticuerpos protectores mucho más débiles.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'The RSV F protein changes shape dramatically after fusing with a cell. The prefusion conformation exposes key antigenic sites (like site Ø) that elicit potent neutralizing antibodies. Previous vaccine attempts using postfusion F failed because they missed these critical epitopes.',
   'La proteína F del VRS cambia de forma dramáticamente después de fusionarse con una célula. La conformación de prefusión expone sitios antigénicos clave que provocan anticuerpos neutralizantes potentes.',
   E'The RSV virus has a key protein (F protein) that works like a spring-loaded trap. In its "before" shape (prefusion), it''s cocked and ready — and it shows unique features on its surface that antibodies can grab onto to block the virus. Once it fires and merges with your cell, it snaps into a completely different "after" shape (postfusion) where those key features are hidden. For decades, scientists couldn''t make a good RSV vaccine because they were accidentally using the "after" shape. The breakthrough was learning to freeze the protein in its "before" shape, giving the immune system the right target to recognize.',
   E'El virus VRS tiene una proteína clave (proteína F) que funciona como una trampa con resorte. En su forma "antes" (prefusión), está cargada y lista — y muestra características únicas en su superficie que los anticuerpos pueden agarrar para bloquear el virus. Una vez que se dispara y se fusiona con tu célula, cambia a una forma "después" (postfusión) completamente diferente donde esas características clave están ocultas. Durante décadas, los científicos no pudieron hacer una buena vacuna contra el VRS porque accidentalmente usaban la forma "después". El avance fue aprender a congelar la proteína en su forma "antes", dándole al sistema inmune el objetivo correcto para reconocer.',
   5);

  -- ============================================================================
  -- QUESTIONS: COVID-19 (5)
  -- ============================================================================

  -- cv1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_covid, 'multiple_choice',
   'What is the primary longevity concern with repeated COVID-19 infections that vaccination helps prevent?',
   '¿Cuál es la principal preocupación de longevidad con infecciones repetidas de COVID-19 que la vacunación ayuda a prevenir?',
   '["Cumulative vascular and organ damage", "Immediate death risk only", "Skin aging", "Bone loss"]'::jsonb,
   '["Daño vascular y orgánico acumulativo", "Solo riesgo de muerte inmediata", "Envejecimiento de la piel", "Pérdida ósea"]'::jsonb,
   0,
   'Each COVID infection can cause endothelial damage, microclots, and organ inflammation. Cumulative damage from repeated infections accelerates biological aging even in mild cases.',
   'Cada infección por COVID puede causar daño endotelial, microcoágulos e inflamación orgánica. El daño acumulativo acelera el envejecimiento biológico incluso en casos leves.',
   5);

  -- cv2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_covid, 'true_false',
   'COVID-19 vaccination has been shown to reduce the risk of Long COVID symptoms.',
   'Se ha demostrado que la vacunación contra COVID-19 reduce el riesgo de síntomas de COVID prolongado.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'Studies show vaccination before infection reduces Long COVID risk by approximately 40-50%. Even post-infection vaccination may reduce lingering symptoms in some patients.',
   'Los estudios muestran que la vacunación antes de la infección reduce el riesgo de COVID prolongado en aproximadamente un 40-50%.',
   5);

  -- cv3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, extra_en, extra_es, difficulty) VALUES
  (cat_covid, 'multiple_choice',
   'How does COVID-19 accelerate biological aging?',
   '¿Cómo acelera el COVID-19 el envejecimiento biológico?',
   '["Through T-cell exhaustion, inflammation, and telomere shortening", "Only through lung damage", "By reducing vitamin D levels", "Through weight gain"]'::jsonb,
   '["A través del agotamiento de células T, inflamación y acortamiento de telómeros", "Solo a través de daño pulmonar", "Reduciendo niveles de vitamina D", "A través del aumento de peso"]'::jsonb,
   0,
   'COVID-19 causes immune dysregulation including T-cell exhaustion, persistent low-grade inflammation (inflammaging), epigenetic age acceleration, and telomere shortening — all hallmarks of accelerated aging.',
   'COVID-19 causa desregulación inmune incluyendo agotamiento de células T, inflamación crónica de bajo grado, aceleración de edad epigenética y acortamiento de telómeros.',
   E'Three things happen when COVID ages your body. First, T-cell exhaustion: your immune "soldiers" fight so hard and for so long that they become burned out and stop working well — like an army after a war that can''t recruit new troops. Second, inflammation: the body''s alarm system gets stuck on, slowly damaging organs in the background (inflammaging). Third, telomeres — the protective caps on the ends of your DNA, like the plastic tips on shoelaces — get shorter faster. Every time a cell divides, these caps shrink a little, and COVID accelerates this. Shorter telomeres mean your cells age and die sooner.',
   E'Tres cosas pasan cuando el COVID envejece tu cuerpo. Primero, agotamiento de células T: tus "soldados" inmunes luchan tan fuerte y por tanto tiempo que se queman y dejan de funcionar bien — como un ejército después de una guerra que no puede reclutar nuevas tropas. Segundo, inflamación: el sistema de alarma del cuerpo se queda encendido, dañando lentamente los órganos en segundo plano (inflammaging). Tercero, los telómeros — las tapas protectoras en los extremos de tu ADN, como las puntas de plástico en los cordones — se acortan más rápido. Cada vez que una célula se divide, estas tapas se encogen un poco, y el COVID acelera esto. Telómeros más cortos significan que tus células envejecen y mueren antes.',
   5);

  -- cv4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_covid, 'multiple_choice',
   'Which organ system, beyond the lungs, is particularly vulnerable to COVID-19 damage relevant to longevity?',
   '¿Qué sistema de órganos, más allá de los pulmones, es particularmente vulnerable al daño de COVID-19 relevante para la longevidad?',
   '["Cardiovascular system (endothelium and heart)", "Skeletal system", "Digestive enzymes", "Hair follicles"]'::jsonb,
   '["Sistema cardiovascular (endotelio y corazón)", "Sistema esquelético", "Enzimas digestivas", "Folículos capilares"]'::jsonb,
   0,
   'SARS-CoV-2 has strong tropism for endothelial cells via ACE2 receptors. Vascular damage leads to increased risk of heart attacks, strokes, and pulmonary embolism for months after infection.',
   'SARS-CoV-2 tiene fuerte tropismo por las células endoteliales a través de receptores ACE2. El daño vascular aumenta el riesgo de infartos y ACV durante meses después de la infección.',
   5);

  -- cv5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_covid, 'true_false',
   'Staying up to date with COVID boosters is important for longevity because immunity from both infection and vaccination wanes over time.',
   'Mantenerse al día con los refuerzos de COVID es importante para la longevidad porque la inmunidad tanto de la infección como de la vacunación disminuye con el tiempo.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'Neutralizing antibody levels decline after both infection and vaccination. Updated boosters restore protection against severe disease and the cumulative organ damage that comes with each reinfection.',
   'Los niveles de anticuerpos neutralizantes disminuyen después de la infección y la vacunación. Los refuerzos actualizados restauran la protección.',
   5);

  -- ============================================================================
  -- QUESTIONS: HPV (5)
  -- ============================================================================

  -- hp1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, extra_en, extra_es, difficulty) VALUES
  (cat_hpv, 'multiple_choice',
   'Gardasil 9 protects against how many HPV types?',
   'Gardasil 9 protege contra cuántos tipos de VPH?',
   '["9 types (including 16, 18, 6, 11)", "4 types", "2 types", "All known HPV types"]'::jsonb,
   '["9 tipos (incluyendo 16, 18, 6, 11)", "4 tipos", "2 tipos", "Todos los tipos conocidos de VPH"]'::jsonb,
   0,
   'Gardasil 9 covers HPV types 6, 11, 16, 18, 31, 33, 45, 52, and 58. Types 16 and 18 cause ~70% of cervical cancers, while 6 and 11 cause ~90% of genital warts.',
   'Gardasil 9 cubre los tipos de VPH 6, 11, 16, 18, 31, 33, 45, 52 y 58. Los tipos 16 y 18 causan ~70% de los cánceres cervicales.',
   E'HPV is like a huge family with over 200 "cousins" (types), each slightly different. Most are harmless and your body clears them without you ever noticing. But some cousins are troublemakers: types 6 and 11 cause genital warts (annoying but not dangerous), while types 16, 18, and a handful of others can silently cause cancer over many years. Gardasil 9 targets the 9 most dangerous family members — the 7 that cause the most cancers plus the 2 that cause the most warts. It''s like putting the top 9 most-wanted criminals behind bars.',
   E'El VPH es como una familia enorme con más de 200 "primos" (tipos), cada uno ligeramente diferente. La mayoría son inofensivos y tu cuerpo los elimina sin que te des cuenta. Pero algunos primos son problemáticos: los tipos 6 y 11 causan verrugas genitales (molestas pero no peligrosas), mientras que los tipos 16, 18 y un puñado más pueden causar cáncer silenciosamente durante muchos años. Gardasil 9 apunta a los 9 miembros más peligrosos de la familia — los 7 que causan más cánceres más los 2 que causan más verrugas. Es como poner a los 9 criminales más buscados tras las rejas.',
   5);

  -- hp2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_hpv, 'multiple_choice',
   'Beyond cervical cancer, HPV vaccination prevents which other cancers?',
   'Más allá del cáncer cervical, la vacunación contra el VPH previene qué otros cánceres?',
   '["Oropharyngeal, anal, penile, vulvar, vaginal", "Lung and breast", "Leukemia and lymphoma", "Pancreatic and liver"]'::jsonb,
   '["Orofaríngeo, anal, peneano, vulvar, vaginal", "Pulmón y mama", "Leucemia y linfoma", "Pancreático y hepático"]'::jsonb,
   0,
   'HPV causes cancers in multiple sites: oropharyngeal (throat), anal, penile, vulvar, and vaginal. Head and neck cancers from HPV are rising rapidly, making vaccination important for all genders.',
   'El VPH causa cánceres en múltiples sitios: orofaríngeo, anal, peneano, vulvar y vaginal. Los cánceres de cabeza y cuello por VPH están aumentando rápidamente.',
   5);

  -- hp3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_hpv, 'true_false',
   'HPV vaccination is only beneficial if given before any sexual activity.',
   'La vacunación contra el VPH solo es beneficiosa si se administra antes de cualquier actividad sexual.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'False. While most effective before HPV exposure, vaccination can still protect against HPV types not yet encountered. The FDA approved Gardasil 9 for adults up to age 45.',
   'Falso. Aunque es más eficaz antes de la exposición al VPH, la vacunación aún puede proteger contra tipos de VPH aún no encontrados. La FDA aprobó Gardasil 9 hasta los 45 años.',
   5);

  -- hp4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_hpv, 'multiple_choice',
   'HPV-related oropharyngeal cancer has been increasing most rapidly in which demographic?',
   'El cáncer orofaríngeo relacionado con el VPH ha aumentado más rápidamente en qué grupo demográfico?',
   '["Men aged 40-60", "Women over 70", "Children under 10", "Infants"]'::jsonb,
   '["Hombres de 40-60 años", "Mujeres mayores de 70", "Niños menores de 10", "Bebés"]'::jsonb,
   0,
   'HPV-positive oropharyngeal cancer rates have risen dramatically in middle-aged men, now surpassing cervical cancer incidence in some countries. This underscores why HPV vaccination is critical for all genders.',
   'Las tasas de cáncer orofaríngeo positivo para VPH han aumentado dramáticamente en hombres de mediana edad, superando la incidencia de cáncer cervical en algunos países.',
   5);

  -- hp5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_hpv, 'true_false',
   'The HPV vaccine uses live virus to generate immunity.',
   'La vacuna contra el VPH usa virus vivo para generar inmunidad.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'False. HPV vaccines use virus-like particles (VLPs) made from the L1 capsid protein. These self-assembling proteins mimic the virus structure but contain no viral DNA, making them unable to cause infection.',
   'Falso. Las vacunas contra el VPH usan partículas similares a virus (VLPs) hechas de la proteína de cápside L1. No contienen ADN viral.',
   5);

  -- ============================================================================
  -- QUESTIONS: Tdap (5)
  -- ============================================================================

  -- td1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_tdap, 'multiple_choice',
   'What does Tdap protect against?',
   '¿Contra qué protege la Tdap?',
   '["Tetanus, diphtheria, and pertussis", "Typhoid, dengue, and polio", "Tuberculosis, diphtheria, and plague", "Tetanus, dengue, and pertussis"]'::jsonb,
   '["Tétanos, difteria y tos ferina", "Tifoidea, dengue y polio", "Tuberculosis, difteria y peste", "Tétanos, dengue y tos ferina"]'::jsonb,
   0,
   E'Tdap is a combination vaccine protecting against tetanus (lockjaw), diphtheria (throat/heart infection), and pertussis (whooping cough). The lowercase ''d'' and ''p'' indicate reduced antigen doses for adults.',
   'Tdap es una vacuna combinada que protege contra tétanos, difteria y tos ferina. Las letras minúsculas indican dosis reducidas de antígeno para adultos.',
   5);

  -- td2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_tdap, 'true_false',
   'Tetanus boosters are recommended every 10 years for adults to maintain protection.',
   'Se recomiendan refuerzos de tétanos cada 10 años para adultos para mantener la protección.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'Tetanus immunity wanes over time. Adults should receive a Td or Tdap booster every 10 years, with at least one dose being Tdap to maintain pertussis protection.',
   'La inmunidad contra el tétanos disminuye con el tiempo. Los adultos deben recibir un refuerzo de Td o Tdap cada 10 años.',
   5);

  -- td3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_tdap, 'multiple_choice',
   'How does preventing pertussis in older adults relate to longevity?',
   '¿Cómo se relaciona la prevención de la tos ferina en adultos mayores con la longevidad?',
   '["Severe coughing fits can cause rib fractures, hernias, and pneumonia", "It prevents hair loss", "It improves digestion", "It reverses hearing loss"]'::jsonb,
   '["Los ataques severos de tos pueden causar fracturas costales, hernias y neumonía", "Previene la caída del cabello", "Mejora la digestión", "Revierte la pérdida de audición"]'::jsonb,
   0,
   'Pertussis in older adults causes violent coughing paroxysms lasting weeks that can fracture ribs, cause hernias, trigger pneumonia, and lead to urinary incontinence — all reducing quality of life and independence.',
   'La tos ferina en adultos mayores causa paroxismos violentos de tos durante semanas que pueden fracturar costillas, causar hernias y desencadenar neumonía.',
   5);

  -- td4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_tdap, 'multiple_choice',
   'Which of these is a brand name for the Tdap vaccine?',
   '¿Cuál de estos es un nombre comercial de la vacuna Tdap?',
   '["Boostrix", "Gardasil", "Prevnar", "Shingrix"]'::jsonb,
   '["Boostrix", "Gardasil", "Prevnar", "Shingrix"]'::jsonb,
   0,
   'Boostrix (GSK) and Adacel (Sanofi) are the two Tdap vaccines available. Boostrix is approved for ages 10+ while Adacel is approved for ages 10-64.',
   'Boostrix (GSK) y Adacel (Sanofi) son las dos vacunas Tdap disponibles.',
   5);

  -- td5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, extra_en, extra_es, difficulty) VALUES
  (cat_tdap, 'true_false',
   'Clostridium tetani, the bacterium causing tetanus, produces one of the most potent toxins known to science.',
   'Clostridium tetani, la bacteria que causa el tétanos, produce una de las toxinas más potentes conocidas por la ciencia.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'Tetanus toxin (tetanospasmin) is extraordinarily potent — the lethal dose for humans is estimated at only ~2.5 ng/kg. It works by blocking inhibitory neurotransmitter release, causing uncontrolled muscle spasms.',
   'La toxina del tétanos es extraordinariamente potente — la dosis letal para humanos se estima en solo ~2,5 ng/kg. Funciona bloqueando la liberación de neurotransmisores inhibitorios.',
   E'Tetanus toxin is so incredibly potent that an amount weighing less than a grain of sand could kill a person. To put it in perspective, just 2.5 nanograms per kilogram of body weight is lethal — that''s about 175 nanograms for an average adult, invisible to the naked eye. The toxin works by jamming the "off switch" for your muscles. Normally, your nerves send both "contract" and "relax" signals. Tetanus toxin blocks the "relax" signals, so once a muscle starts contracting, it can''t stop. This causes the horrifying full-body spasms called lockjaw, where even your jaw muscles clamp shut uncontrollably.',
   E'La toxina del tétanos es tan increíblemente potente que una cantidad que pesa menos que un grano de arena podría matar a una persona. Para ponerlo en perspectiva, solo 2,5 nanogramos por kilogramo de peso corporal es letal — eso es unos 175 nanogramos para un adulto promedio, invisible a simple vista. La toxina funciona bloqueando el "interruptor de apagado" de tus músculos. Normalmente, tus nervios envían señales de "contraer" y "relajar". La toxina del tétanos bloquea las señales de "relajar", así que una vez que un músculo empieza a contraerse, no puede parar. Esto causa los horribles espasmos de cuerpo completo llamados trismo, donde incluso los músculos de la mandíbula se cierran incontrolablemente.',
   5);

  -- ============================================================================
  -- QUESTIONS: Hepatitis B (5)
  -- ============================================================================

  -- hb1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_hepb, 'multiple_choice',
   'Chronic hepatitis B infection increases the risk of which life-shortening condition?',
   'La infección crónica por hepatitis B aumenta el riesgo de qué condición que acorta la vida?',
   '["Liver cancer (hepatocellular carcinoma)", "Lung cancer", "Colon cancer", "Brain cancer"]'::jsonb,
   '["Cáncer de hígado (carcinoma hepatocelular)", "Cáncer de pulmón", "Cáncer de colon", "Cáncer cerebral"]'::jsonb,
   0,
   'Chronic HBV is responsible for ~50% of hepatocellular carcinoma cases worldwide. The virus integrates into liver cell DNA, causing chronic inflammation, cirrhosis, and eventually cancer over decades.',
   'La infección crónica por VHB es responsable de ~50% de los casos de carcinoma hepatocelular en todo el mundo.',
   5);

  -- hb2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_hepb, 'true_false',
   'The hepatitis B vaccine was the first vaccine that directly prevents a type of cancer.',
   'La vacuna contra la hepatitis B fue la primera vacuna que previene directamente un tipo de cáncer.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'The hepatitis B vaccine, introduced in 1981, was indeed the first anti-cancer vaccine. By preventing chronic HBV infection, it dramatically reduces the risk of hepatocellular carcinoma.',
   'La vacuna contra la hepatitis B, introducida en 1981, fue de hecho la primera vacuna anticáncer.',
   5);

  -- hb3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, extra_en, extra_es, difficulty) VALUES
  (cat_hepb, 'multiple_choice',
   'What is the brand name of the newer hepatitis B vaccine that requires only 2 doses?',
   '¿Cuál es el nombre comercial de la vacuna más nueva contra la hepatitis B que requiere solo 2 dosis?',
   '["Heplisav-B (with CpG adjuvant)", "Engerix-B", "Recombivax HB", "Twinrix"]'::jsonb,
   '["Heplisav-B (con adyuvante CpG)", "Engerix-B", "Recombivax HB", "Twinrix"]'::jsonb,
   0,
   'Heplisav-B uses a novel CpG 1018 adjuvant that stimulates toll-like receptor 9, achieving protective antibody levels in just 2 doses (vs 3 for traditional HBV vaccines) with higher seroprotection rates.',
   'Heplisav-B utiliza un nuevo adyuvante CpG 1018 que estimula el receptor toll-like 9, logrando niveles protectores de anticuerpos en solo 2 dosis.',
   E'Adjuvants are like wake-up calls for your immune system. A vaccine antigen alone is like whispering a warning — your body might not pay much attention. An adjuvant is like shouting it through a megaphone. CpG is especially clever: it''s a synthetic piece of DNA that mimics what bacterial DNA looks like. When your immune cells detect it, they think "bacteria are invading!" and go on high alert. This triggers toll-like receptor 9, an ancient alarm sensor, causing a much stronger immune response — so strong that you only need 2 doses instead of 3.',
   E'Los adyuvantes son como llamadas de atención para tu sistema inmune. Un antígeno de vacuna solo es como susurrar una advertencia — tu cuerpo podría no prestar mucha atención. Un adyuvante es como gritarlo con un megáfono. El CpG es especialmente ingenioso: es un trozo sintético de ADN que imita cómo luce el ADN bacteriano. Cuando tus células inmunes lo detectan, piensan "¡las bacterias están invadiendo!" y se ponen en alerta máxima. Esto activa el receptor toll-like 9, un sensor de alarma antiguo, causando una respuesta inmune mucho más fuerte — tan fuerte que solo necesitas 2 dosis en vez de 3.',
   5);

  -- hb4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_hepb, 'multiple_choice',
   'Beyond liver cancer, chronic hepatitis B increases the risk of which systemic condition?',
   'Más allá del cáncer de hígado, la hepatitis B crónica aumenta el riesgo de qué condición sistémica?',
   '["Kidney disease (membranous nephropathy)", "Osteoporosis", "Cataracts", "Hearing loss"]'::jsonb,
   '["Enfermedad renal (nefropatía membranosa)", "Osteoporosis", "Cataratas", "Pérdida de audición"]'::jsonb,
   0,
   'Chronic HBV can cause extrahepatic manifestations including membranous nephropathy, polyarteritis nodosa, and other immune-complex diseases that damage kidneys and blood vessels.',
   'El VHB crónico puede causar manifestaciones extrahepáticas incluyendo nefropatía membranosa y poliarteritis nodosa.',
   5);

  -- hb5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_hepb, 'true_false',
   'Adults who were not vaccinated against hepatitis B as children cannot benefit from vaccination later in life.',
   'Los adultos que no fueron vacunados contra la hepatitis B de niños no pueden beneficiarse de la vacunación más adelante en la vida.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   E'False. Adult HBV vaccination is highly effective and recommended for all unvaccinated adults through age 59, and for those 60+ with risk factors. It''s never too late to get protected.',
   'Falso. La vacunación contra el VHB en adultos es muy eficaz y se recomienda para todos los adultos no vacunados hasta los 59 años.',
   5);

  -- ============================================================================
  -- QUESTIONS: Hepatitis A (3)
  -- ============================================================================

  -- ha1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_hepa, 'multiple_choice',
   'How does hepatitis A differ from hepatitis B in terms of chronicity?',
   '¿Cómo difiere la hepatitis A de la hepatitis B en términos de cronicidad?',
   E'["Hep A doesn''t become chronic; Hep B can", "Both always become chronic", "Neither becomes chronic", "Only Hep A becomes chronic"]'::jsonb,
   '["La Hep A no se vuelve crónica; la Hep B sí puede", "Ambas siempre se vuelven crónicas", "Ninguna se vuelve crónica", "Solo la Hep A se vuelve crónica"]'::jsonb,
   0,
   'Hepatitis A is always an acute, self-limiting infection that doesn''t establish chronic disease. However, it can cause acute liver failure, especially in people with pre-existing liver conditions.',
   'La hepatitis A siempre es una infección aguda y autolimitada que no establece enfermedad crónica. Sin embargo, puede causar insuficiencia hepática aguda.',
   5);

  -- ha2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_hepa, 'true_false',
   'Hepatitis A vaccination is particularly important for longevity in people who already have chronic liver disease.',
   'La vacunación contra la hepatitis A es particularmente importante para la longevidad en personas que ya tienen enfermedad hepática crónica.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'People with chronic liver disease (from HBV, HCV, alcohol, NAFLD) face dramatically higher mortality if they contract hepatitis A. The additional inflammatory insult can trigger acute-on-chronic liver failure.',
   'Las personas con enfermedad hepática crónica enfrentan una mortalidad dramáticamente mayor si contraen hepatitis A.',
   5);

  -- ha3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_hepa, 'multiple_choice',
   'What type of vaccine is the hepatitis A vaccine?',
   '¿Qué tipo de vacuna es la vacuna contra la hepatitis A?',
   '["Inactivated (killed) virus", "Live attenuated virus", "mRNA-based", "Recombinant protein"]'::jsonb,
   '["Virus inactivado (muerto)", "Virus atenuado vivo", "Basada en ARNm", "Proteína recombinante"]'::jsonb,
   0,
   'Hepatitis A vaccines (Havrix, Vaqta) use inactivated whole virus. They require 2 doses 6-12 months apart and provide protection lasting at least 25 years, likely lifelong.',
   'Las vacunas contra la hepatitis A (Havrix, Vaqta) usan virus inactivado completo. Requieren 2 dosis con 6-12 meses de separación.',
   5);

  -- ============================================================================
  -- QUESTIONS: Cross-Cutting Longevity (10)
  -- ============================================================================

  -- cc1
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, extra_en, extra_es, difficulty) VALUES
  (cat_crosscutting, 'multiple_choice',
   'Which concept describes how vaccines may train the innate immune system to respond better to future unrelated threats?',
   '¿Qué concepto describe cómo las vacunas pueden entrenar al sistema inmune innato para responder mejor a futuras amenazas no relacionadas?',
   '["Trained immunity (innate immune memory)", "Herd immunity", "Passive immunity", "Immunosuppression"]'::jsonb,
   '["Inmunidad entrenada (memoria inmune innata)", "Inmunidad de rebaño", "Inmunidad pasiva", "Inmunosupresión"]'::jsonb,
   0,
   'Trained immunity refers to epigenetic reprogramming of innate immune cells (monocytes, NK cells) after vaccination, making them more responsive to unrelated pathogens. BCG and flu vaccines notably demonstrate this effect.',
   'La inmunidad entrenada se refiere a la reprogramación epigenética de las células inmunes innatas después de la vacunación, haciéndolas más responsivas a patógenos no relacionados.',
   E'Your immune system has two teams: the innate (general security guards) and the adaptive (specialized detectives with wanted posters). Normally, only the detectives learn and remember specific criminals. But "trained immunity" is like giving your security guards better training — after encountering a vaccine, they become more alert and effective against ALL intruders, not just the one they trained for. It''s not about updating the wanted posters; it''s about making the guards faster, sharper, and better equipped at their general patrol job.',
   E'Tu sistema inmune tiene dos equipos: el innato (guardias de seguridad generales) y el adaptativo (detectives especializados con carteles de ''se busca''). Normalmente, solo los detectives aprenden y recuerdan criminales específicos. Pero la "inmunidad entrenada" es como darles mejor entrenamiento a tus guardias de seguridad — después de encontrar una vacuna, se vuelven más alertas y efectivos contra TODOS los intrusos, no solo contra el que entrenaron. No se trata de actualizar los carteles de ''se busca''; se trata de hacer que los guardias sean más rápidos, astutos y mejor equipados en su patrullaje general.',
   5);

  -- cc2
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, extra_en, extra_es, difficulty) VALUES
  (cat_crosscutting, 'multiple_choice',
   E'What is ''inflammaging'' and how do vaccines help combat it?',
   E'¿Qué es el ''inflammaging'' y cómo ayudan las vacunas a combatirlo?',
   '["Chronic low-grade inflammation of aging; vaccines prevent infection-driven inflammatory spikes", "A type of fever; vaccines cure it", "Muscle inflammation; vaccines reduce exercise pain", "Skin aging; vaccines reverse wrinkles"]'::jsonb,
   '["Inflamación crónica de bajo grado del envejecimiento; las vacunas previenen picos inflamatorios por infecciones", "Un tipo de fiebre; las vacunas la curan", "Inflamación muscular; las vacunas reducen dolor del ejercicio", "Envejecimiento de la piel; las vacunas revierten arrugas"]'::jsonb,
   0,
   'Inflammaging is the progressive increase in baseline inflammatory markers with age. Each serious infection adds to this inflammatory burden. Vaccines prevent these infection-driven inflammatory spikes, helping keep inflammaging in check.',
   'El inflammaging es el aumento progresivo de marcadores inflamatorios basales con la edad. Las vacunas previenen picos inflamatorios por infecciones.',
   E'Think of inflammation like your body''s fire alarm. When you''re young, the alarm goes off during an emergency and then turns off. As you age, the alarm system gets glitchy and starts buzzing quietly all the time — that''s inflammaging. Every serious infection is like a small fire that makes the alarm louder and harder to turn off. Over years, this constant low-level alarm wears out your organs, damages blood vessels, and speeds up aging. Vaccines help by preventing the infections that would trigger those extra alarms, keeping your baseline inflammation lower.',
   E'Piensa en la inflamación como la alarma de incendios de tu cuerpo. Cuando eres joven, la alarma suena durante una emergencia y luego se apaga. Al envejecer, el sistema se vuelve defectuoso y empieza a zumbar suavemente todo el tiempo — eso es el inflammaging. Cada infección grave es como un pequeño incendio que hace la alarma más fuerte y difícil de apagar. Con los años, esta alarma constante de bajo nivel desgasta tus órganos, daña los vasos sanguíneos y acelera el envejecimiento. Las vacunas ayudan previniendo las infecciones que dispararían esas alarmas extras, manteniendo tu inflamación base más baja.',
   5);

  -- cc3
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_crosscutting, 'multiple_choice',
   'Multiple vaccines have been associated with reduced dementia risk. What is the leading hypothesis for this effect?',
   'Múltiples vacunas se han asociado con menor riesgo de demencia. ¿Cuál es la hipótesis principal para este efecto?',
   '["Preventing infections reduces neuroinflammation and vascular brain damage", "Vaccines contain nootropic ingredients", "Vaccines increase brain size", "The placebo effect of feeling protected"]'::jsonb,
   '["Prevenir infecciones reduce la neuroinflamación y el daño vascular cerebral", "Las vacunas contienen ingredientes nootrópicos", "Las vacunas aumentan el tamaño del cerebro", "El efecto placebo de sentirse protegido"]'::jsonb,
   0,
   'Infections trigger neuroinflammation and can cause microvascular brain damage. By preventing these infections, vaccines reduce the cumulative neurological insults that contribute to cognitive decline and dementia.',
   'Las infecciones desencadenan neuroinflamación y pueden causar daño microvascular cerebral. Al prevenir estas infecciones, las vacunas reducen los insultos neurológicos acumulativos.',
   5);

  -- cc4
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_crosscutting, 'true_false',
   E'The concept of ''immunosenescence'' means the immune system gets stronger with age.',
   E'El concepto de ''inmunosenescencia'' significa que el sistema inmune se fortalece con la edad.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'False. Immunosenescence is the gradual deterioration of the immune system with age. It involves thymic involution, reduced naive T-cells, accumulation of senescent immune cells, and weakened vaccine responses — which is why adjuvanted/high-dose vaccines are important for older adults.',
   'Falso. La inmunosenescencia es el deterioro gradual del sistema inmune con la edad.',
   5);

  -- cc5
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_crosscutting, 'multiple_choice',
   'Which of these is NOT a documented longevity benefit of vaccination?',
   '¿Cuál de estos NO es un beneficio documentado de longevidad de la vacunación?',
   '["Reversing existing genetic mutations", "Reducing cardiovascular events", "Preventing cancer (HPV, HBV)", "Lowering dementia risk"]'::jsonb,
   '["Revertir mutaciones genéticas existentes", "Reducir eventos cardiovasculares", "Prevenir cáncer (VPH, VHB)", "Reducir riesgo de demencia"]'::jsonb,
   0,
   'Vaccines cannot reverse existing genetic mutations. However, they do provide the other listed benefits: cardiovascular protection (flu), cancer prevention (HPV, HBV), and dementia risk reduction (shingles, flu).',
   'Las vacunas no pueden revertir mutaciones genéticas existentes. Sin embargo, proporcionan los otros beneficios listados.',
   5);

  -- cc6
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_crosscutting, 'multiple_choice',
   E'What is the ''infection-frailty cascade'' that vaccination helps prevent?',
   E'¿Qué es la ''cascada infección-fragilidad'' que la vacunación ayuda a prevenir?',
   E'["Infection → hospitalization → muscle loss → reduced mobility → more infections", "Infection → immediate death", "Infection → full recovery → stronger immunity", "Infection → better appetite → weight gain"]'::jsonb,
   E'["Infección → hospitalización → pérdida muscular → movilidad reducida → más infecciones", "Infección → muerte inmediata", "Infección → recuperación completa → inmunidad más fuerte", "Infección → mejor apetito → aumento de peso"]'::jsonb,
   0,
   'Serious infections in older adults often trigger a downward spiral: hospitalization leads to muscle loss (sarcopenia), deconditioning, reduced mobility, falls, and increased susceptibility to further infections.',
   'Las infecciones graves en adultos mayores a menudo desencadenan una espiral descendente: la hospitalización lleva a pérdida muscular, desacondicionamiento y mayor susceptibilidad a más infecciones.',
   5);

  -- cc7
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_crosscutting, 'true_false',
   'Vaccines that prevent viral infections can indirectly reduce the risk of autoimmune diseases triggered by molecular mimicry.',
   'Las vacunas que previenen infecciones virales pueden reducir indirectamente el riesgo de enfermedades autoinmunes desencadenadas por mimetismo molecular.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   0,
   'Some viral infections trigger autoimmune diseases through molecular mimicry — when viral proteins resemble self-proteins, confusing the immune system. Preventing these infections with vaccines can reduce this autoimmune trigger.',
   'Algunas infecciones virales desencadenan enfermedades autoinmunes a través del mimetismo molecular. Prevenir estas infecciones con vacunas puede reducir este desencadenante autoinmune.',
   5);

  -- cc8
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_crosscutting, 'multiple_choice',
   'Which combination of vaccines provides the broadest cardiovascular protection based on current evidence?',
   '¿Qué combinación de vacunas proporciona la protección cardiovascular más amplia según la evidencia actual?',
   '["Flu + Pneumococcal + COVID-19", "HPV + Hepatitis A", "Tdap only", "Shingles only"]'::jsonb,
   '["Gripe + Neumocócica + COVID-19", "VPH + Hepatitis A", "Solo Tdap", "Solo Herpes zóster"]'::jsonb,
   0,
   'Flu vaccination reduces MI risk by 26-36%, pneumococcal prevents direct cardiac invasion, and COVID vaccination prevents vascular damage. Together they address the three major infection-related cardiovascular threats.',
   'La vacunación antigripal reduce el riesgo de infarto en un 26-36%, la neumocócica previene la invasión cardíaca directa y la vacuna COVID previene el daño vascular.',
   5);

  -- cc9
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_crosscutting, 'multiple_choice',
   'What role does pulmonary fibrosis from repeated respiratory infections play in longevity?',
   '¿Qué papel juega la fibrosis pulmonar por infecciones respiratorias repetidas en la longevidad?',
   '["Permanently reduces lung capacity, limiting exercise and independence", "No effect on longevity", "Improves lung function over time", "Only affects children"]'::jsonb,
   '["Reduce permanentemente la capacidad pulmonar, limitando el ejercicio y la independencia", "Sin efecto en la longevidad", "Mejora la función pulmonar con el tiempo", "Solo afecta a los niños"]'::jsonb,
   0,
   'Each severe respiratory infection (flu, RSV, COVID, pneumococcal pneumonia) can leave fibrotic scarring in the lungs. This cumulative damage permanently reduces exercise capacity, oxygenation, and functional independence.',
   'Cada infección respiratoria grave puede dejar cicatrices fibróticas en los pulmones. Este daño acumulativo reduce permanentemente la capacidad de ejercicio y la independencia funcional.',
   5);

  -- cc10
  INSERT INTO questions (category_id, type, question_en, question_es, options_en, options_es, correct_index, explanation_en, explanation_es, difficulty) VALUES
  (cat_crosscutting, 'true_false',
   'Getting vaccinated only benefits the individual, not the broader community.',
   'Vacunarse solo beneficia al individuo, no a la comunidad en general.',
   '["True", "False"]'::jsonb,
   '["Verdadero", "Falso"]'::jsonb,
   1,
   'False. Vaccination provides community (herd) immunity by reducing disease transmission. This protects vulnerable individuals who cannot be vaccinated, including immunocompromised people, newborns, and the elderly with poor vaccine responses.',
   'Falso. La vacunación proporciona inmunidad comunitaria (de rebaño) al reducir la transmisión de enfermedades.',
   5);

END $$;
