/** Buddy ArcherySchool — configuración genérica por sitio. */
window.BuddyArcherySchoolConfig = window.BuddyArcherySchoolConfig || {};
window.BuddyArcherySchoolConfig = Object.assign({
  enabled: true,
  siteId: null,
  schoolName: null,
  schoolOwnerCompany: 'arbatarchery.com',
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'archerySchool',

  endpoints: {
    users: '/api/buddy/users/list',
    profile: '/api/buddy/archerySchool/profile',
    attributes: '/api/buddy/archerySchool/attributes',
    attributeHistory: '/api/buddy/archerySchool/attributes/history',
    equipment: '/api/buddy/archerySchool/equipment',
    equipmentRelations: '/api/buddy/archerySchool/equipment-relations'
  },

  permissions: { roles: ['student', 'instructor', 'admin'] },

  attributeSources: [
    { value: 'autorreportado', label: 'Autorreportado' },
    { value: 'medido_en_escuela', label: 'Medido en la escuela' },
    { value: 'registrado_por_administrador', label: 'Registrado por administrador' }
  ],

  lateralidad: [
    { value: 'Zurda', label: 'Zurda' },
    { value: 'Izq-Der', label: 'Izq-Der' },
    { value: 'Diestra', label: 'Diestra' },
    { value: 'Der-Izq', label: 'Der-Izq' }
  ],

  genero: [
    { value: 'Masculino', label: 'Masculino' },
    { value: 'Femenino', label: 'Femenino' },
    { value: 'Fluido', label: 'Fluido' },
    { value: 'Prefiero no decirlo', label: 'Prefiero no decirlo' }
  ],

  posibilidadAdquisicion: [
    { value: 'Remota', label: 'Remota' },
    { value: 'Baja', label: 'Baja' },
    { value: 'Viable', label: 'Viable' },
    { value: 'Inmediata', label: 'Inmediata' }
  ],

  equipmentTypes: ['Brida', 'Tapa', 'Antebrazo', 'Pechera', 'Empuñadura', 'Mira', 'Palas', 'Flechas', 'Carcaj', 'Estabilizadores', 'Mochila'],

  equipmentStates: [
    { value: 'activo', label: 'Activo' },
    { value: 'baja', label: 'Baja' },
    { value: 'perdido', label: 'Perdido' },
    { value: 'dañado', label: 'Dañado' }
  ],

  documentTypes: [
    { value: 'CI', label: 'Cédula de identidad (CI)' },
    { value: 'Pasaporte', label: 'Pasaporte' },
    { value: 'Carnet de extranjería', label: 'Carnet de extranjería' },
    { value: 'Licencia de conducir', label: 'Licencia de conducir' }
  ],

  countries: ['Afganistán','Albania','Alemania','Andorra','Angola','Antigua y Barbuda','Arabia Saudita','Argelia','Argentina','Armenia','Australia','Austria','Azerbaiyán','Bahamas','Bangladés','Barbados','Baréin','Bélgica','Belice','Benín','Bielorrusia','Birmania','Bolivia','Bosnia y Herzegovina','Botsuana','Brasil','Brunéi','Bulgaria','Burkina Faso','Burundi','Camboya','Camerún','Canadá','Catar','Chad','Chile','China','Chipre','Colombia','Comoras','Congo (República del)','Corea del Norte','Corea del Sur','Costa de Marfil','Costa Rica','Croacia','Cuba','Dinamarca','Dominica','Ecuador','Egipto','El Salvador','Emiratos Árabes Unidos','Eritrea','Eslovaquia','Eslovenia','España','Estados Unidos','Estonia','Etiopía','Filipinas','Finlandia','Fiyi','Francia','Gabón','Gambia','Georgia','Ghana','Granada','Grecia','Guatemala','Guinea','Guinea Ecuatorial','Guinea-Bisáu','Guyana','Haití','Honduras','Hungría','India','Indonesia','Irak','Irán','Irlanda','Islandia','Islas Marshall','Islas Salomón','Israel','Italia','Jamaica','Japón','Jordania','Kazajistán','Kenia','Kirguistán','Kiribati','Kuwait','Laos','Lesoto','Letonia','Líbano','Liberia','Libia','Liechtenstein','Lituania','Luxemburgo','Macedonia del Norte','Madagascar','Malasia','Malaui','Maldivas','Malí','Malta','Marruecos','Mauricio','Mauritania','México','Micronesia','Moldavia','Mónaco','Mongolia','Montenegro','Mozambique','Namibia','Nauru','Nepal','Nicaragua','Níger','Nigeria','Noruega','Nueva Zelanda','Omán','Países Bajos','Pakistán','Palaos','Palestina','Panamá','Papúa Nueva Guinea','Paraguay','Perú','Polonia','Portugal','Reino Unido','República Centroafricana','República Checa','República Democrática del Congo','República Dominicana','Ruanda','Rumania','Rusia','Samoa','San Cristóbal y Nieves','San Marino','San Vicente y las Granadinas','Santa Lucía','Santo Tomé y Príncipe','Senegal','Serbia','Seychelles','Sierra Leona','Singapur','Siria','Somalia','Sri Lanka','Sudáfrica','Sudán','Sudán del Sur','Suecia','Suiza','Suazilandia','Surinam','Tailandia','Taiwán','Tanzania','Tayikistán','Timor Oriental','Togo','Tonga','Trinidad y Tobago','Túnez','Turkmenistán','Turquía','Tuvalu','Ucrania','Uganda','Uruguay','Uzbekistán','Vanuatu','Vaticano','Venezuela','Vietnam','Yemen','Yibuti','Zambia','Zimbabue'],

  relationTypes: [
    { value: 'propietario', label: 'Propietario' },
    { value: 'prestamo', label: 'Préstamo' }
  ],

  relationPartyTypes: [
    { value: 'persona', label: 'Persona' },
    { value: 'empresa', label: 'Empresa' }
  ],

  /*
   * Elementos de menú que este módulo ofrece al módulo `menu`.
   * Ver contrato en modules/menu/buddy_menu.js.
   */
  menu: [
    {
      id: 'myArcheryProfile',
      label: 'Mi perfil de arquería',
      icon: '🏹',
      roles: 'auth,admin,superadmin',
      enabled: true,
      action: 'renderProfile'
    },
    {
      id: 'archeryAdmin',
      label: 'Administrar arquería',
      icon: '🛠️',
      roles: 'admin,superadmin',
      enabled: true,
      action: 'renderAdmin'
    }
  ]
}, window.BuddyArcherySchoolConfig || {});
