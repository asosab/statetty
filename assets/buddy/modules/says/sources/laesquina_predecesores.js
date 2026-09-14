/**
 * Buddy Says — fuente de conocimiento sobre predecesores y casos de éxito.
 *
 * El listado vive directamente en esta fuente. No depende de archivos JSON,
 * fetch() ni de ningún módulo externo.
 *
 * Cada elemento puede ser un string o, si en el futuro se necesita, un objeto
 * con la forma aceptada por buddy_says.js: { id, texto, emocion }.
 */
window.BuddyInformSources = window.BuddyInformSources || {};

window.BuddyInformSources.laesquina_predecesores = [
  // ——— Predecesores directos: Minna no Toshokan Sankaku (Japón) ———
  'Minna no Toshokan Sankaku (Yaizu, Japón, marzo 2020): “Biblioteca Triangular de Todos”. Un local vacío frente a la estación JR se convirtió en espacio comunitario sin un solo yen de subsidio municipal.',
  'Sankaku fue fundada por Junya Dohi, activista de Yaizu que ya impulsaba la organización “Wakamono no Machi” para revitalizar la ciudad. Empezó con crowdfunding y trabajo DIY de los partidarios.',
  'En Sankaku cada dueño de estante (“One Box Bookshelf Owner”) paga 2.000 yenes al mes por un espacio de aproximadamente 20 × 50 cm. Puede cambiar los libros cuando quiera durante su membresía.',
  'Con unos 54 propietarios Sankaku sostiene alrededor de 3.000 libros. Muchos dueños de estante también hacen turnos como “encargados de tienda”, lo que permite abrir seis días a la semana.',
  'El registro de lector en Sankaku cuesta 300 yenes una sola vez. Después el préstamo es gratuito: máximo 5 libros por visita, por alrededor de un mes, sin multas ni recordatorios estrictos.',
  'Sankaku nació en una “shutter street” (calle de comercios cerrados). Recuperar un local vacío y llenarlo de libros y gente fue también un acto de revitalización urbana.',
  'En Sankaku los estantes tienen tarjetas de comentarios: los lectores dejan impresiones y se genera un diálogo silencioso entre quien comparte el libro y quien lo lee.',
  'Cafeterías y vendedores de comida operan ciertos días en Sankaku sin pagar alquiler; a cambio ayudan a mantener el espacio abierto. El modelo mezcla cultura y economía de proximidad.',

  // ——— Predecesores directos: Casual Poet Library (Singapur) ———
  'Casual Poet Library (Bukit Merah, Singapur, agosto 2024) nació inspirada directamente en Sankaku. La fundó la fotógrafa Rebecca Toh en un void deck (planta baja abierta) de un edificio HDB.',
  'El costo de arranque de Casual Poet se estimó en unos S$40.000. Los gastos mensuales rondan S$5.000 (alquiler, servicios, tasas y un empleado parcial de administración).',
  'Rebecca Toh cubrió el arranque con crowdfunding y el compromiso anticipado de aproximadamente 180 dueños de estante que pagaron sus leases por adelantado. Ese capital inicial financió renovación y equipamiento.',
  'En Casual Poet el lease de estante cuesta S$45/mes por un año, S$49/mes por seis meses o S$43/mes por dos años. Se paga todo por adelantado más una tarifa administrativa única de S$25.',
  'Cualquier persona puede entrar gratis a Casual Poet a navegar y leer. Para llevar libros a casa hace falta membresía anual de S$25: hasta 5 libros por visita, máximo 1 mes (+1 mes de renovación).',
  'Casual Poet no cobra multas por retraso. Confía en la buena voluntad de los lectores, igual que Sankaku. El catálogo usa ISBN y registro digital para saber qué está prestado.',
  'En Casual Poet los dueños de estante curan su propio espacio por tema o preferencia personal. No se permiten libros prohibidos en Singapur; el contenido adulto se coloca en estantes altos.',
  'Ambos modelos (Sankaku y Casual Poet) demuestran lo mismo: una biblioteca puede existir sin depender del Estado cuando la comunidad se reparte el costo del espacio y el cuidado del acervo.',

  // ——— Brasil ———
  'Borrachalioteca (Sabará, Minas Gerais, Brasil, 2002): empezó dentro de un taller de reparación de llantas. El mecánico integró libros al negocio familiar y el lugar se conoció como “borracharioteca”.',
  'En 2006 la Borrachalioteca se formalizó como ONG (Instituto Cultural Aníbal Machado). Recibió el premio “Viva Leitura” 2007 y fue declarada Punto de Cultura regional en 2011.',
  'La Borrachalioteca llegó a superar los 20.000 volúmenes catalogados manualmente. Opera con préstamo domiciliario de 15 días, club de lectura y actividades culturales, sostenida sobre todo por voluntariado.',
  'Biblioteca Terra Livre (São Paulo, 2009): nació de la reestructuración de un colectivo anarquista que editaba la revista Protesta!. Se instaló en local propio en el barrio Pompeia.',
  'Terra Livre se autofinancia completamente. En 2011 creó una actividad editorial propia para recaudar fondos. Estructura horizontal, sin jerarquías formales, y sin apoyo institucional de ningún tipo.',
  'Terra Livre ofrece debates, cineclub, conferencias y ferias anarquistas, todas gratuitas y abiertas. Es centro de referencia para movimientos sociales y atrae activistas de varios países.',
  'Biblioteca do Caranguejo (Praia do Mangue Seco, Raposa – Maranhão, Brasil, 2016): iniciativa de la cooperativa de pescadores local, impulsada por Dona Luzia y el líder comunitario Jackson Roger.',
  'Caranguejo opera de forma autónoma, sin apoyo gubernamental ni empresarial. Combina préstamo de libros con talleres de crochet y guitarra, educación ambiental y punto de encuentro en la playa.',
  'La lección de Caranguejo: comunidades rurales con oficios afines (pescadores, montañeses, mineros) pueden crear bibliotecas en espacios informales cuando hay liderazgo local y voluntad colectiva.',

  // ——— Ecuador y Uruguay ———
  'Pasa Libro (Ecuador, desde ~2016): proyecto de Nubia Sandoval para llevar lectura a comunidades costeras con acceso escaso a cultura. Se instaló en Zaruma, Durán, Guayaquil, Chongón, Olón y Ayampe.',
  'Pasa Libro se sostiene “principalmente a través de la autogestión” comunitaria. Espacios cedidos (casas comunales), donaciones de libros y voluntarios locales (vecinos, docentes, estudiantes).',
  'La red Pasa Libro rota cerca de 5.000 libros. Ofrece préstamo gratuito, círculos de lectura, talleres de literatura, proyecciones de cine y colaboración con escuelas. Unos 300 lectores activos registrados.',
  'Biblioteca Cooperactiva Coperpay (Paysandú, Uruguay, julio 2023): la cooperativa de consumo Coperpay destinó su sede (Sarandí y Setembrino Pereda) a una biblioteca temática de unos 20 m².',
  'Coperpay arrancó con fondos de la cooperativa, mano de obra voluntaria de socios y apoyo de extensión universitaria (software y gestión bibliotecaria). Costos operativos asumidos por la cooperativa.',
  'La Cooperactiva combina textos de cooperativismo con literatura recreativa. Se proyecta como centro cultural con conferencias y ciclos. Modelo replicable en otras cooperativas de consumo u obreras.',

  // ——— Nigeria, Bangladesh e India ———
  'Yellow House Community Library (Yenagoa, Nigeria, 2021): creada por Babawale Babafemi con libros heredados de su padre (antiguo director escolar). Atiende gratis los fines de semana a niños de comunidades pesqueras.',
  'Yellow House se estableció como “lugar de refugio” para niños no escolarizados. Más de 60 niños asisten regularmente a clubes de lectura y jornadas lúdicas. Opera solo con voluntariado y recursos no monetarios.',
  'Shanok Boyra Anusandhan Library (Bhuiyapur, Tangail – Bangladesh, abril 2012): empezó en el dormitorio del fundador Humayun Kabir, inspirado por el primer club de libros de la aldea e impulsado por la red Village Library Movement.',
  'Shanok Boyra tiene menos de 100 libros (donados) y alrededor de 200 miembros. Funciona como sistema abierto: los usuarios se registran en un libro de visitas. Organiza concursos anuales de lectura.',
  'Bansa Community Library (Hardoi, Uttar Pradesh – India, 2020): Jatin Lalit y dos colegas convencieron a un templo local para ceder terreno y construyeron dos salas durante el confinamiento.',
  'Bansa alcanzó 2.100 miembros registrados y cerca de 100 visitas diarias. Ofrece préstamo, espacio de estudio hasta altas horas y clases gratuitas de preparación de exámenes. Todo sostenido por donaciones y voluntarios.',

  // ——— Australia ———
  'My Community Library Ltd (Outer Melbourne, Australia, 2022): consorcio de bibliotecas de tres municipios que, por cambio legislativo, tuvo que migrar de fondos municipales a entidad independiente sin ánimo de lucro.',
  'My Community Library debe generar ingresos propios (cuotas, patrocinio privado, venta de servicios). Es un caso pionero de transición de biblioteca pública a NPO autosuficiente con junta directiva y CEO.',

  // ——— Lecciones transversales y principios ———
  'Lección recurrente: casi todos los casos exitosos empiezan con un líder o colectivo local, un espacio modestísimo y donaciones de libros antes de buscar dinero en efectivo.',
  'Otra lección: la formalización (ONG, cooperativa o asociación) llega después de demostrar tracción comunitaria, no antes. Primero la comunidad, después el papelerío.',
  'La mayoría de estas bibliotecas opera con voluntariado casi total en las primeras etapas. El personal remunerado es la excepción, no la regla, hasta que el modelo se estabiliza.',
  'Diversificar ingresos es clave para la resiliencia: alquiler de estantes, membresías de lectores, eventos, editorial propia, alianzas con cooperativas, universidades o empresas sociales.',
  'Los espacios informales (taller de llantas, playa, dormitorio, void deck, local vacío, terreno de templo) funcionan si hay confianza y reglas claras de cuidado del acervo y del lugar.',
  'Ningún caso exitoso depende de un solo financiador. La resiliencia viene de muchas fuentes pequeñas y del compromiso recurrente de la comunidad que lo usa y lo cuida.',
  'La Esquina hereda de Sankaku y Casual Poet la idea central: el estante es personal, el espacio es compartido y el sostenimiento es colectivo. Un estante por persona, cuota que cubre el local.',
  'De los casos latinoamericanos tomamos la fuerza de la autogestión y la capacidad de arraigar en oficios y barrios concretos: pescadores, cooperativas, talleres mecánicos, comunidades costeras.',
  'De los casos asiáticos y africanos aprendemos que incluso con colecciones muy pequeñas (menos de 100 libros) se puede crear hábito lector cuando el espacio se siente seguro, propio y abierto.',
  'El modelo de “biblioteca de estantes personales” reduce la dependencia de compras institucionales: el acervo crece y se renueva con lo que cada dueño decide compartir desde su propia biblioteca.',
  'Confianza sin multas: tanto Sankaku como Casual Poet eliminan penalidades por retraso. El sistema se sostiene en la buena voluntad y en el deseo de que otros también puedan leer.',
  'Abrir el espacio a usos complementarios (café, comida, talleres, turnos de dueños de estante) multiplica las razones para que la gente vuelva y ayuda a cubrir los días de apertura.',
  'Registrar impacto de forma simple (lectores activos, préstamos, visitas, eventos) sirve para atraer aliados y demostrar valor, incluso cuando el presupuesto es casi inexistente.',
  'Escalabilidad gradual: casi todos empezaron pequeños (un local, un dormitorio, un taller) y crecieron según demanda. Mejor un piloto vivo que una red ambiciosa sin comunidad real.',
  'La recomendación que se repite en todos los contextos: partir de las fortalezas locales (espacio disponible, redes existentes, liderazgo carismático) y construir poco a poco la infraestructura social.'
];
