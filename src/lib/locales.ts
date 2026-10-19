/**
 * 站点多语言字典。
 * 约定：英语（en）是默认语言，源码字符串本身就是英文原文，因此这里只存
 * 中文 / 意大利语 / 西班牙语 三种翻译；t() 找不到翻译时回退到英文原文。
 * key = 代码里的英文原文字符串（必须逐字一致）。
 */

export type Lang = "en" | "zh" | "it" | "es";

export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: "en", label: "English", short: "EN" },
  { id: "zh", label: "中文", short: "中" },
  { id: "it", label: "Italiano", short: "IT" },
  { id: "es", label: "Español", short: "ES" },
];

type Triple = { zh: string; it: string; es: string };

export const translations: Record<string, Triple> = {
  /* ---------- 导航 ---------- */
  "Overview": { zh: "概览", it: "Panoramica", es: "Resumen" },
  "Contact": { zh: "联系我们", it: "Contatti", es: "Contacto" },
  "Plan a trip": { zh: "规划行程", it: "Pianifica un viaggio", es: "Planifica un viaje" },
  "Leisure travel": { zh: "休闲旅游", it: "Turismo", es: "Ocio" },
  "Business travel": { zh: "商务差旅", it: "Business", es: "Negocios" },

  /* ---------- 首屏 Hero ---------- */
  "Inbound Travel · Leisure & Business": {
    zh: "入境服务 · 休闲与商务",
    it: "Travel inbound · Turismo & Business",
    es: "Viajes internos · Ocio y negocios",
  },
  "Inbound leisure travel & business travel, fully tailored——premium travel experiences at approachable prices.": {
    zh: "入境休闲旅游与商务差旅，全程定制——高端旅行体验，亲民价格。",
    it: "Viaggi inbound su misura per turismo e business — esperienze di viaggio premium a prezzi accessibili.",
    es: "Viajes a medida para ocio y negocios: experiencias de viaje premium a precios asequibles.",
  },
  "Plan your trip": { zh: "规划您的行程", it: "Pianifica il tuo viaggio", es: "Planifica tu viaje" },
  "Scroll": { zh: "下滑", it: "Scorri", es: "Desliza" },

  /* ---------- 公司介绍 ---------- */
  "Your Vision of China, Effortlessly Delivered.": {
    zh: "您心中的中国，轻松为您呈现。",
    it: "La tua visione della Cina, realizzata senza sforzo.",
    es: "Tu visión de China, realizada sin esfuerzo.",
  },
  "Where ancient heritage meets modern ambitious horizon. Whether closing a strategic venture or wandering through misty peaks, we curate every detail for your complete peace of mind.": {
    zh: "古老文明与现代雄心的交汇之地。无论是促成一场战略合作，还是漫步于云雾缭绕的山峰，我们都为您精心策划每个细节，让您全程安心无忧。",
    it: "Dove l'antico patrimonio incontra un orizzonte moderno e ambizioso. Che si tratti di chiudere un accordo strategico o di perdersi tra vette avvolte dalla nebbia, curiamo ogni dettaglio per la tua totale serenità.",
    es: "Donde la herencia ancestral se encuentra con un horizonte moderno y ambicioso. Ya sea cerrando un acuerdo estratégico o paseando entre cimas envueltas en niebla, cuidamos cada detalle para tu total tranquilidad.",
  },
  "Limits — Infinite Horizons, Yours": {
    zh: "零限制——无尽可能，尽属于你",
    it: "Limiti — orizzonti infiniti, tuoi",
    es: "Límites — horizontes infinitos, tuyos",
  },
  "Tailor-made, end-to-end service": {
    zh: "全程定制，一站式服务",
    it: "Servizio completo su misura",
    es: "Servicio integral a medida",
  },
  "Support during your whole stay": {
    zh: "全程 24/7 支持",
    it: "Assistenza durante tutto il soggiorno",
    es: "Asistencia durante toda tu estancia",
  },
  "Journeys — Endless Inspiration, Endless Return": {
    zh: "旅程——灵感无限，流连忘返",
    it: "Viaggi — ispirazione infinita, ritorno assicurato",
    es: "Viajes — inspiración infinita, ganas de volver",
  },

  /* ---------- 出行类型选择 ---------- */
  "What brings you to China?": {
    zh: "您为何而来中国？",
    it: "Cosa ti porta in Cina?",
    es: "¿Qué te trae a China?",
  },
  "Choose your journey — everything after is tailored.": {
    zh: "选择您的出行方式——之后的一切都将为您定制。",
    it: "Scegli il tuo viaggio — tutto il resto sarà su misura.",
    es: "Elige tu viaje: todo lo demás será a tu medida.",
  },
  "Leisure Travel": { zh: "休闲旅游", it: "Turismo", es: "Ocio" },
  "入境休闲旅游": { zh: "入境休闲旅游", it: "Turismo incoming", es: "Turismo receptivo" },
  "Custom holidays, classic routes and hidden gems. We design the trip, you collect the memories.": {
    zh: "定制假期、经典线路与小众秘境。行程我们设计，回忆由您收藏。",
    it: "Vacanze su misura, itinerari classici e gemme nascoste. Progettiamo noi il viaggio, tu collezioni i ricordi.",
    es: "Vacaciones a medida, rutas clásicas y joyas ocultas. Nosotros diseñamos el viaje, tú coleccionas recuerdos.",
  },
  "Custom itineraries & private tours": {
    zh: "定制行程与私家团",
    it: "Itinerari su misura e tour privati",
    es: "Itinerarios a medida y tours privados",
  },
  "Hotels, drivers & bilingual guides": {
    zh: "酒店、司机与双语向导",
    it: "Hotel, autisti e guide bilingui",
    es: "Hoteles, conductores y guías bilingües",
  },
  "Tickets, shows & local experiences": {
    zh: "门票、演出与本地体验",
    it: "Biglietti, spettacoli ed esperienze locali",
    es: "Entradas, espectáculos y experiencias locales",
  },
  "Business Travel": { zh: "商务差旅", it: "Business", es: "Negocios" },
  "商业差旅": { zh: "商业差旅", it: "Viaggi di lavoro", es: "Viajes de negocios" },
  "Meetings, factory visits, exhibitions and trade fairs — handled with precision and discretion.": {
    zh: "会议、验厂、展会与贸易洽谈——以专业与谨慎为您妥善安排。",
    it: "Riunioni, visite in fabbrica, fiere ed esposizioni — gestite con precisione e discrezione.",
    es: "Reuniones, visitas a fábricas, exposiciones y ferias: gestionadas con precisión y discreción.",
  },
  "Meetings, exhibitions & factory visits": {
    zh: "会议、展会与验厂",
    it: "Riunioni, fiere e visite in fabbrica",
    es: "Reuniones, ferias y visitas a fábricas",
  },
  "Interpreters & business etiquette support": {
    zh: "口译人员与商务礼仪支持",
    it: "Interpreti e supporto sulle buone maniere commerciali",
    es: "Intérpretes y apoyo en protocolo de negocios",
  },
  "Flights, hotels & ground transport": {
    zh: "机票、酒店与地面交通",
    it: "Voli, hotel e trasporti locali",
    es: "Vuelos, hoteles y transporte terrestre",
  },
  "Get started": { zh: "立即开始", it: "Inizia", es: "Empezar" },

  /* ---------- 服务矩阵 ---------- */
  "Your All-in-One Travel Partner": {
    zh: "您的一站式旅行伙伴",
    it: "Il tuo partner di viaggio tutto-in-uno",
    es: "Tu socio de viajes todo en uno",
  },
  "Flights": { zh: "机票", it: "Voli", es: "Vuelos" },
  "Domestic & international flight bookings with optimal routes.": {
    zh: "国内及国际航班预订，优选航线。",
    it: "Prenotazioni di voli nazionali e internazionali con rotte ottimali.",
    es: "Reservas de vuelos nacionales e internacionales con rutas óptimas.",
  },
  "Hotels": { zh: "酒店", it: "Hotel", es: "Hoteles" },
  "Vetted stays from cozy boutique inns to premier landmarks, matched to your style.": {
    zh: "严选住宿，从温馨的精品客栈到顶级地标酒店，贴合您的品味。",
    it: "Soggiorni selezionati, da accoglienti boutique hotel a rinomati luoghi di lusso, in linea con il tuo stile.",
    es: "Estancias seleccionadas, desde acogedoras posadas boutique hasta emblemáticos de lujo, según tu estilo.",
  },
  "Car & Driver": { zh: "专车与司机", it: "Auto e autista", es: "Coche y conductor" },
  "Chauffeur-driven private rides, anytime, anywhere.": {
    zh: "专属司机私人用车，随时随地。",
    it: "Trasferimenti privati con autista, sempre e ovunque.",
    es: "Trayectos privados con chófer, en cualquier momento y lugar.",
  },
  "Guides": { zh: "向导", it: "Guide", es: "Guías" },
  "Fluent, insider storytellers who bring local culture to life.": {
    zh: "语言流利、深谙当地的故事讲述者，让本土文化鲜活呈现。",
    it: "Guide eloquenti e piene di insider knowledge che fanno rivivere la cultura locale.",
    es: "Guías locuaces y conocedores que hacen vibrar la cultura local.",
  },
  "Translation": { zh: "翻译", it: "Interpretariato", es: "Traducción" },
  "On-site interpreters for business meetings and events.": {
    zh: "为商务会议与活动提供现场口译。",
    it: "Interpreti sul posto per riunioni di lavoro ed eventi.",
    es: "Intérpretes in situ para reuniones de negocios y eventos.",
  },
  "Attractions": { zh: "景点", it: "Attrazioni", es: "Atracciones" },
  "Curated sights and off-the-beaten-path recommendations.": {
    zh: "精选景点与鲜有人知的小众推荐。",
    it: "Siti selezionati e consigli lontano dai percorsi turistici.",
    es: "Lugares seleccionados y recomendaciones fuera de las rutas turísticas.",
  },
  "Tickets": { zh: "票务", it: "Biglietti", es: "Entradas" },
  "Instant booking for bullet trains, top shows, and high-demand sites.": {
    zh: "高铁、热门演出与热门景点门票即时预订。",
    it: "Prenotazione istantanea di treni ad alta velocità, grandi spettacoli e siti molto richiesti.",
    es: "Reserva instantánea de trenes de alta velocidad, grandes espectáculos y sitios muy solicitados.",
  },
  "Custom Requests": { zh: "定制需求", it: "Richieste personalizzate", es: "Peticiones a medida" },
  "Dedicated concierge for specialized itineraries and complex logistics.": {
    zh: "专属管家服务，处理特殊行程与复杂后勤安排。",
    it: "Concierge dedicato per itinerari specializzati e logistica complessa.",
    es: "Conserjería dedicada para itinerarios especializados y logística compleja.",
  },

  /* ---------- 页脚 ---------- */
  "Let's plan your China story.": {
    zh: "让我们一起谱写您的中国故事。",
    it: "Pianifichiamo insieme la tua storia in Cina.",
    es: "Planeemos juntos tu historia en China.",
  },
  "Email": { zh: "邮箱", it: "Email", es: "Correo" },
  "WhatsApp": { zh: "WhatsApp", it: "WhatsApp", es: "WhatsApp" },
  "© 2026 Longview China Travel. All rights reserved.": {
    zh: "© 2026 Longview China Travel 版权所有。",
    it: "© 2026 Longview China Travel. Tutti i diritti riservati.",
    es: "© 2026 Longview China Travel. Todos los derechos reservados.",
  },

  /* ---------- 子页面公共 ---------- */
  "Start planning": { zh: "开始规划", it: "Inizia a pianificare", es: "Empezar a planificar" },
  "Back to home": { zh: "返回首页", it: "Torna alla home", es: "Volver al inicio" },
  "Business Travel · 商业差旅": {
    zh: "商务差旅 · 商业差旅",
    it: "BUSINESS TRAVEL · VIAGGI DI LAVORO",
    es: "VIAJE DE NEGOCIOS · 商务差旅",
  },
  "Business in China, without the friction.": {
    zh: "在中国经商，从此畅通无阻。",
    it: "Affari in Cina, senza attriti.",
    es: "Negocios en China, sin fricciones.",
  },
  "Leisure Travel · 入境休闲旅游": {
    zh: "休闲旅游 · 入境休闲旅游",
    it: "LEISURE TRAVEL · TURISMO INCOMING",
    es: "VIAJE DE OCIO · 入境休闲旅游",
  },
  "Your holiday, designed around you.": {
    zh: "您的假期，围绕您而设计。",
    it: "Le tue vacanze, disegnate intorno a te.",
    es: "Tus vacaciones, diseñadas a tu alrededor.",
  },
  "Exhibitions & Trade Fairs": { zh: "展会与交易会", it: "Fiere ed esposizioni", es: "Ferias y exposiciones" },
  "Canton Fair, CIIE, industry expos — registration, badges, hotels near the venue and tight schedules handled.": {
    zh: "广交会、进博会、行业展会——报名、证件、场馆附近酒店与紧凑行程，全部为您安排。",
    it: "Fiera di Canton, CIIE, fiere di settore — registrazione, badge, hotel vicino alla sede e programmi serrati gestiti.",
    es: "Feria de Cantón, CIIE, exposiciones del sector: registro, acreditaciones, hoteles cercanos y agendas ajustadas gestionadas.",
  },
  "Factory & Site Visits": { zh: "工厂与实地验厂", it: "Visite in fabbrica e sul sito", es: "Visitas a fábricas y plantas" },
  "Supplier audits and manufacturing tours across the Pearl River Delta, Yangtze Delta and beyond.": {
    zh: "覆盖珠三角、长三角及更广区域的供应商审核与制造工厂考察。",
    it: "Audit di fornitori e visite produttive nel delta del Fiume delle Perle, dello Yangtze e oltre.",
    es: "Auditorías de proveedores y visitas de fabricación en el delta del río de las Perlas, el delta del Yangtsé y más allá.",
  },
  "Business Interpretation": { zh: "商务口译", it: "Interpretariato d'affari", es: "Interpretación de negocios" },
  "Professional interpreters for negotiations, meetings and banquets — business etiquette included.": {
    zh: "为谈判、会议与宴请提供专业口译——商务礼仪也一并为您把关。",
    it: "Interpreti professionisti per negoziati, riunioni e banchetti — galateo aziendale incluso.",
    es: "Intérpretes profesionales para negociaciones, reuniones y banquetes: protocolo incluido.",
  },
  "Nature & Landscapes": { zh: "自然与风光", it: "Natura e paesaggi", es: "Naturaleza y paisajes" },
  "Great Wall sunrise, Li River karsts, Zhangjiaje pillars — China's iconic scenery, timed to dodge the crowds.": {
    zh: "长城日出、漓江喀斯特、张家界石柱——中国标志性风景，错峰出行避开人潮。",
    it: "Alba sulla Grande Muraglia, carst del fiume Li, pilastri di Zhangjiajie — i paesaggi iconici della Cina, con tempistiche per evitare la folla.",
    es: "Amanecer en la Gran Muralla, karst del río Li, pilares de Zhangjiajie: los paisajes icónicos de China, a horas para evitar multitudes.",
  },
  "Food & Culture": { zh: "美食与文化", it: "Cibo e cultura", es: "Gastronomía y cultura" },
  "Peking duck in hutongs, hotpot in Chengdu, tea ceremonies in Hangzhou. Eat where locals eat.": {
    zh: "胡同里的北京烤鸭、成都的火锅、杭州的茶道。吃在本地人去的地方。",
    it: "Anatra alla pechinese negli hutong, hotpot a Chengdu, cerimonie del tè a Hangzhou. Mangia dove mangiano i locali.",
    es: "Pato laqueado en los hutongs, hotpot en Chengdu, ceremonias del té en Hangzhou. Come donde comen los locales.",
  },
  "Photography Trips": { zh: "摄影之旅", it: "Viaggi fotografici", es: "Viajes fotográficos" },
  "Golden-hour viewpoints and drone-friendly locations, planned around light and weather.": {
    zh: "黄金时刻机位与无人机友好地点，根据光线与天气精心规划。",
    it: "Punti panoramici all'ora d'oro e location adatte ai droni, pianificati su luce e meteo.",
    es: "Miradores a la hora dorada y ubicaciones aptas para drones, planificadas según luz y clima.",
  },

  /* ---------- Leisure 向导（site.ts wizardLeisure） ---------- */
  "What are you interested in?": {
    zh: "您对什么感兴趣？",
    it: "Cosa ti interessa?",
    es: "¿Qué te interesa?",
  },
  "Pick as many as you like": {
    zh: "想选多少选多少",
    it: "Scegline quante vuoi",
    es: "Elige todas las que quieras",
  },
  "Classic routes": { zh: "经典线路", it: "Itinerari classici", es: "Rutas clásicas" },
  "Food & culture": { zh: "美食与文化", it: "Cibo e cultura", es: "Gastronomía y cultura" },
  "Nature & hiking": { zh: "自然与徒步", it: "Natura e trekking", es: "Naturaleza y senderismo" },
  "Photography": { zh: "摄影", it: "Fotografia", es: "Fotografía" },
  "Family trip": { zh: "家庭出游", it: "Viaggio in famiglia", es: "Viaje en familia" },
  "Luxury": { zh: "奢华", it: "Lusso", es: "Lujo" },
  "Budget": { zh: "高性价比", it: "Budget", es: "Económico" },
  "Nightlife": { zh: "夜生活", it: "Vita notturna", es: "Vida nocturna" },
  "Which city do you want to visit?": {
    zh: "您想游览哪座城市？",
    it: "Quale città vuoi visitare?",
    es: "¿Qué ciudad quieres visitar?",
  },
  "Beijing": { zh: "北京", it: "Pechino", es: "Pekín" },
  "Shanghai": { zh: "上海", it: "Shanghai", es: "Shanghái" },
  "Guangzhou": { zh: "广州", it: "Canton", es: "Cantón" },
  "Shenzhen": { zh: "深圳", it: "Shenzhen", es: "Shenzhen" },
  "Chengdu": { zh: "成都", it: "Chengdu", es: "Chendú" },
  "Xi'an": { zh: "西安", it: "Xi'an", es: "Xi'an" },
  "Hangzhou": { zh: "杭州", it: "Hangzhou", es: "Hangzhou" },
  "Guilin": { zh: "桂林", it: "Guilin", es: "Guilin" },
  "Other / multiple cities": {
    zh: "其他城市 / 多城联游",
    it: "Altra città / più città",
    es: "Otra ciudad / varias ciudades",
  },
  "When do you plan to travel?": {
    zh: "您计划什么时候出行？",
    it: "Quando vuoi viaggiare?",
    es: "¿Cuándo planeas viajar?",
  },
  "e.g. Nov 10 – Nov 20, 2026": {
    zh: "例如：2026年11月10日–11月20日",
    it: "es. 10 – 20 novembre 2026",
    es: "p. ej. 10 – 20 nov 2026",
  },
  "How many people?": { zh: "出行人数？", it: "Quante persone?", es: "¿Cuántas personas?" },
  "e.g. 2 adults, 1 child": {
    zh: "例如：2位成人，1名儿童",
    it: "es. 2 adulti, 1 bambino",
    es: "p. ej. 2 adultos, 1 niño",
  },
  "What's your name?": { zh: "您的姓名？", it: "Il tuo nome?", es: "¿Cómo te llamas?" },
  "Your name": { zh: "您的姓名", it: "Il tuo nome", es: "Tu nombre" },
  "What's your email?": { zh: "您的邮箱？", it: "La tua email?", es: "¿Cuál es tu correo?" },
  "We reply within 24 hours": {
    zh: "我们会在24小时内回复",
    it: "Rispondiamo entro 24 ore",
    es: "Respondemos en 24 horas",
  },
  "you@example.com": { zh: "you@example.com", it: "tu@esempio.com", es: "tu@ejemplo.com" },
  "WhatsApp / phone? (optional)": {
    zh: "WhatsApp / 电话？（选填）",
    it: "WhatsApp / telefono? (facoltativo)",
    es: "¿WhatsApp / teléfono? (opcional)",
  },
  "+1 555 000 0000": { zh: "+86 138 0000 0000", it: "+39 333 000 0000", es: "+34 600 000 000" },

  /* ---------- 向导公共文案 ---------- */
  "Step {x} of {y}": { zh: "第 {x} 步，共 {y} 步", it: "Passo {x} di {y}", es: "Paso {x} de {y}" },
  "Summary": { zh: "总览", it: "Riepilogo", es: "Resumen" },
  "Here's your trip, at a glance": {
    zh: "您的行程一览",
    it: "Il tuo viaggio a colpo d'occhio",
    es: "Tu viaje de un vistazo",
  },
  "Check everything looks right, then send it our way.": {
    zh: "确认无误后发送给我们。",
    it: "Controlla che tutto sia corretto, poi inviacelo.",
    es: "Comprueba que todo esté bien y envíanoslo.",
  },
  "Back": { zh: "上一步", it: "Indietro", es: "Atrás" },
  "Continue": { zh: "继续", it: "Continua", es: "Continuar" },
  "Send request": { zh: "发送需求", it: "Invia richiesta", es: "Enviar solicitud" },
  "Request sent!": { zh: "需求已发送！", it: "Richiesta inviata!", es: "¡Solicitud enviada!" },
  "Thank you! Your request has been received — our team will review it and contact you within 24 hours.": {
    zh: "感谢您！您的需求已收到——我们的团队会尽快审阅并在24小时内与您联系。",
    it: "Grazie! La tua richiesta è stata ricevuta — il nostro team la esaminerà e ti contatterà entro 24 ore.",
    es: "¡Gracias! Hemos recibido tu solicitud: nuestro equipo la revisará y te contactará en 24 horas.",
  },
  "Select a city…": { zh: "选择城市…", it: "Seleziona una città…", es: "Selecciona una ciudad…" },

  /* ---------- Business 向导 ---------- */
  "Which city are you heading to?": {
    zh: "您要前往哪座城市？",
    it: "Verso quale città ti rechi?",
    es: "¿A qué ciudad te diriges?",
  },
  "When are you visiting?": { zh: "您的来访时间？", it: "Quando sarai in visita?", es: "¿Cuándo nos visitas?" },
  "How many people are coming?": {
    zh: "一共几位出行？",
    it: "Quante persone arrivano?",
    es: "¿Cuántas personas vienen?",
  },
  "What's the purpose of your visit?": {
    zh: "此次来访的目的是什么？",
    it: "Qual è lo scopo della tua visita?",
    es: "¿Cuál es el propósito de tu visita?",
  },
  "A few more details about your visit": {
    zh: "关于您来访的更多细节",
    it: "Qualche dettaglio in più sulla tua visita",
    es: "Algunos detalles más sobre tu visita",
  },
  "How can we help?": { zh: "我们可以怎么帮您？", it: "Come possiamo aiutarti?", es: "¿Cómo podemos ayudarte?" },
  "Hotel budget per night": { zh: "每晚酒店预算", it: "Budget alberghiero per notte", es: "Presupuesto de hotel por noche" },
  "Any requirements for your assistants?": {
    zh: "对服务人员有什么要求？",
    it: "Requisiti per i tuoi assistenti?",
    es: "¿Requisitos para tus asistentes?",
  },
  "Entry & exit ports in China": {
    zh: "中国入境 / 出境口岸",
    it: "Porti di ingresso e uscita in Cina",
    es: "Puertos de entrada y salida en China",
  },
  "Any other special requests?": {
    zh: "还有其他特殊要求吗？",
    it: "Altre richieste particolari?",
    es: "¿Alguna otra petición especial?",
  },
  "How can we reach you?": { zh: "我们如何联系您？", it: "Come possiamo contattarti?", es: "¿Cómo podemos contactarte?" },
  "Optional": { zh: "可跳过", it: "Facoltativo", es: "Opcional" },
  "Other": { zh: "其他", it: "Altro", es: "Otro" },
  "From · 从": { zh: "从", it: "Da", es: "Desde" },
  "To · 到": { zh: "到", it: "A", es: "Hasta" },
  "person · 人": { zh: "人", it: "persona", es: "persona" },
  "people · 人": { zh: "人", it: "persone", es: "personas" },
  "Add": { zh: "添加", it: "Aggiungi", es: "Añadir" },
  "Enter another city & press Enter — add as many as you like": {
    zh: "输入城市后按回车——可添加多个城市",
    it: "Inserisci una città e premi Invio — aggiungine quante vuoi",
    es: "Escribe una ciudad y pulsa Intro: añade tantas como quieras",
  },
  "Language note · e.g. English + Mandarin": {
    zh: "语言备注 · 例如：英语 + 普通话",
    it: "Nota sulla lingua · es. inglese + mandarino",
    es: "Nota de idioma · p. ej. inglés + mandarín",
  },
  "Age note · e.g. 30–45": {
    zh: "年龄备注 · 例如：30–45",
    it: "Nota sull'età · es. 30–45",
    es: "Nota de edad · p. ej. 30–45",
  },
  "Required to continue": { zh: "必填才能继续", it: "Necessario per continuare", es: "Obligatorio para continuar" },
  "Enter another purpose & press Enter — add as many as you like": {
    zh: "输入来访目的后按回车——可添加多条",
    it: "Inserisci uno scopo e premi Invio — aggiungine quanti vuoi",
    es: "Escribe un propósito y pulsa Intro: añade tantos como quieras",
  },
  "Enter a custom service & press Enter — add as many as you like": {
    zh: "输入自定义服务后按回车——可添加多条",
    it: "Inserisci un servizio personalizzato e premi Invio — aggiungine quanti vuoi",
    es: "Escribe un servicio personalizado y pulsa Intro: añade tantos como quieras",
  },
  "Factory audit · 工厂验厂": { zh: "工厂验厂", it: "Audit in fabbrica", es: "Auditoría de fábrica" },
  "Factory name(s)": { zh: "工厂名称", it: "Nome/i della fabbrica", es: "Nombre(s) de la fábrica" },
  "Factory address(es)": { zh: "工厂地址", it: "Indirizzo/i della fabbrica", es: "Dirección(es) de la fábrica" },
  "Exhibition / trade fair · 参加展会": { zh: "参加展会", it: "Fiera / esposizione", es: "Feria / exposición" },
  "Exhibition name(s)": { zh: "展会名称", it: "Nome/i della fiera", es: "Nombre(s) de la feria" },
  "Exhibition dates": { zh: "展会时间", it: "Date della fiera", es: "Fechas de la feria" },
  "Venue address(es)": { zh: "展馆地址", it: "Indirizzo/i della sede", es: "Dirección(es) del recinto" },
  "Client visit · 客户拜访": { zh: "客户拜访", it: "Visita al cliente", es: "Visita al cliente" },
  "Client address(es)": { zh: "客户地址", it: "Indirizzo/i del cliente", es: "Dirección(es) del cliente" },
  "Enter the factory name & press Enter — add as many as you like": {
    zh: "输入工厂名称后按回车——可添加多个",
    it: "Inserisci il nome della fabbrica e premi Invio — aggiungine quanti vuoi",
    es: "Escribe el nombre de la fábrica y pulsa Intro: añade tantos como quieras",
  },
  "Enter the factory address & press Enter — add as many as you like": {
    zh: "输入工厂地址后按回车——可添加多个",
    it: "Inserisci l'indirizzo della fabbrica e premi Invio — aggiungine quanti vuoi",
    es: "Escribe la dirección de la fábrica y pulsa Intro: añade tantas como quieras",
  },
  "Enter the exhibition name & press Enter — add as many as you like": {
    zh: "输入展会名称后按回车——可添加多个",
    it: "Inserisci il nome della fiera e premi Invio — aggiungine quanti vuoi",
    es: "Escribe el nombre de la feria y pulsa Intro: añade tantas como quieras",
  },
  "e.g. Oct 15–19, 2026 — press Enter to add another": {
    zh: "例如：2026年10月15–19日——回车添加下一条",
    it: "es. 15–19 ott 2026 — premi Invio per aggiungerne un'altra",
    es: "p. ej. 15–19 oct 2026: pulsa Intro para añadir otra",
  },
  "Enter the venue address & press Enter — add as many as you like": {
    zh: "输入展馆地址后按回车——可添加多个",
    it: "Inserisci l'indirizzo della sede e premi Invio — aggiungine quanti vuoi",
    es: "Escribe la dirección del recinto y pulsa Intro: añade tantas como quieras",
  },
  "Enter the client address & press Enter — add as many as you like": {
    zh: "输入客户地址后按回车——可添加多个",
    it: "Inserisci l'indirizzo del cliente e premi Invio — aggiungine quanti vuoi",
    es: "Escribe la dirección del cliente y pulsa Intro: añade tantas como quieras",
  },
  "Budget per night · e.g. 120": {
    zh: "每晚预算 · 例如：120",
    it: "Budget per notte · es. 120",
    es: "Presupuesto por noche · p. ej. 120",
  },
  "Entry · 入境口岸": { zh: "入境口岸", it: "Porto di ingresso", es: "Puerto de entrada" },
  "Exit · 出境口岸": { zh: "出境口岸", it: "Porto di uscita", es: "Puerto de salida" },
  "e.g. Guangzhou Baiyun (CAN)": {
    zh: "例如：广州白云机场（CAN）",
    it: "es. Guangzhou Baiyun (CAN)",
    es: "p. ej. Cantón Baiyun (CAN)",
  },
  "e.g. Shanghai Pudong (PVG)": {
    zh: "例如：上海浦东机场（PVG）",
    it: "es. Shanghai Pudong (PVG)",
    es: "p. ej. Shanghái Pudong (PVG)",
  },
  "Type a request & press Enter — add as many as you like": {
    zh: "输入要求后按回车——可添加多条",
    it: "Scrivi una richiesta e premi Invio — aggiungine quante vuoi",
    es: "Escribe una petición y pulsa Intro: añade tantas como quieras",
  },
  "Name · 姓名": { zh: "姓名", it: "Nome", es: "Nombre" },
  "Email · 邮箱": { zh: "邮箱", it: "Email", es: "Correo" },
  "WhatsApp (optional)": { zh: "WhatsApp（选填）", it: "WhatsApp (facoltativo)", es: "WhatsApp (opcional)" },
  "Gender · 性别": { zh: "性别", it: "Genere", es: "Género" },
  "Prefer not to say": { zh: "不愿透露", it: "Preferisco non dirlo", es: "Prefiero no decirlo" },
  "Male": { zh: "男", it: "Uomo", es: "Hombre" },
  "Female": { zh: "女", it: "Donna", es: "Mujer" },
  "Nationality · 国籍": { zh: "国籍", it: "Nazionalità", es: "Nacionalidad" },
  "e.g. United States": { zh: "例如：中国", it: "es. Italia", es: "p. ej. España" },
  "Age · 年龄": { zh: "年龄", it: "Età", es: "Edad" },
  "e.g. 35": { zh: "例如：35", it: "es. 35", es: "p. ej. 35" },
  "Summary · 总览": { zh: "总览", it: "RIEPILOGO", es: "RESUMEN" },
  "最后确认": { zh: "最后确认", it: "Conferma finale", es: "Confirmación final" },
  "Review everything below — click any row to go back and edit. 点击任意一行可返回修改。": {
    zh: "请核对以下内容——点击任意一行可返回修改。",
    it: "Controlla tutto qui sotto — clicca qualsiasi riga per tornare e modificare.",
    es: "Revisa todo a continuación: haz clic en cualquier fila para volver y editar.",
  },
  "Skip · 跳过": { zh: "跳过", it: "Salta", es: "Omitir" },
  "Review": { zh: "预览", it: "Riepilogo", es: "Revisar" },
  "Request received!": { zh: "需求已收到！", it: "Richiesta ricevuta!", es: "¡Solicitud recibida!" },
  "Thank you, {name}. Your request has been received — our team will review it and contact you within 24 hours.": {
    zh: "感谢您，{name}。您的需求已收到——我们的团队会尽快审阅并在24小时内与您联系。",
    it: "Grazie, {name}. La tua richiesta è stata ricevuta — il nostro team la esaminerà e ti contatterà entro 24 ore.",
    es: "Gracias, {name}. Hemos recibido tu solicitud: nuestro equipo la revisará y te contactará en 24 horas.",
  },
  "Submit another request": { zh: "再提交一份需求", it: "Invia un'altra richiesta", es: "Enviar otra solicitud" },

  /* ---------- Business 向导配置项（businessContent） ---------- */
  "Exhibition / trade fair": { zh: "参加展会", it: "Fiera / esposizione", es: "Feria / exposición" },
  "Factory audit": { zh: "工厂验厂", it: "Audit in fabbrica", es: "Auditoría de fábrica" },
  "Client visit": { zh: "客户拜访", it: "Visita al cliente", es: "Visita al cliente" },
  "Business negotiation": { zh: "商务谈判", it: "Negoziazione commerciale", es: "Negociación comercial" },
  "Sourcing research": { zh: "采购考察", it: "Ricerca fornitori", es: "Investigación de proveedores" },
  "Chartered car": { zh: "包车", it: "Auto con conducente", es: "Coche con conductor" },
  "Car rental": { zh: "租车", it: "Noleggio auto", es: "Alquiler de coche" },
  "Driver": { zh: "司机", it: "Autista", es: "Conductor" },
  "Sourcing": { zh: "采购", it: "Sourcing", es: "Aprovisionamiento" },
  "Hotel booking": { zh: "预定酒店", it: "Prenotazione hotel", es: "Reserva de hotel" },
  "Professional interpretation": {
    zh: "专业口译",
    it: "Interpretariato professionale",
    es: "Interpretación profesional",
  },
  "Ground handling": { zh: "地接", it: "Assistenza locale", es: "Asistencia local" },
  "Dining arrangements": { zh: "餐饮安排", it: "Organizzazione pasti", es: "Organización de comidas" },
  "Visa assistance": { zh: "签证", it: "Assistenza visto", es: "Ayuda con visados" },
  "Ticket booking": { zh: "订票", it: "Prenotazione biglietti", es: "Reserva de entradas" },
  "High-speed rail": { zh: "高铁预定", it: "Treno ad alta velocità", es: "Tren de alta velocidad" },
  "Airport transfer": { zh: "接送机", it: "Transfer aeroportuale", es: "Traslado al aeropuerto" },
  "SIM card": { zh: "SIM 卡", it: "SIM card", es: "Tarjeta SIM" },
  "Payment support": { zh: "支付", it: "Supporto pagamenti", es: "Ayuda con pagos" },
  "Emergency assistance": { zh: "紧急协助", it: "Assistenza d'emergenza", es: "Asistencia de emergencia" },
  "Language requirement": { zh: "语言要求", it: "Requisito linguistico", es: "Requisito de idioma" },
  "Purchasing experience": { zh: "采购经验", it: "Esperienza d'acquisto", es: "Experiencia en compras" },
  "Interpretation experience": { zh: "口译经验", it: "Esperienza d'interpretariato", es: "Experiencia en interpretación" },
  "Legal experience": { zh: "法律经验", it: "Esperienza legale", es: "Experiencia legal" },
  "Financial experience": { zh: "财务经验", it: "Esperienza finanziaria", es: "Experiencia financiera" },
  "Negotiation skills": { zh: "议价经验", it: "Abilità negoziali", es: "Habilidades de negociación" },
  "Logistics experience": { zh: "物流经验", it: "Esperienza logistica", es: "Experiencia logística" },
  "Foreign trade experience": { zh: "外贸经验", it: "Esperienza di commercio estero", es: "Experiencia en comercio exterior" },
  "Age requirement": { zh: "年龄要求", it: "Requisito d'età", es: "Requisito de edad" },

  /* ---------- Leisure 向导界面 ---------- */
  "Arrival · 抵达": { zh: "抵达", it: "Arrivo", es: "Llegada" },
  "Departure · 离开": { zh: "离开", it: "Partenza", es: "Salida" },
  "Dietary requirements · 饮食要求": { zh: "饮食要求", it: "Esigenze alimentari", es: "Requisitos dietéticos" },
  "Religion · 宗教": { zh: "宗教", it: "Religione", es: "Religión" },
  "e.g. vegetarian, peanut allergy… — press Enter to add": {
    zh: "例如：素食、花生过敏……按回车添加",
    it: "es. vegetariano, allergia alle arachidi… — premi Invio per aggiungere",
    es: "p. ej. vegetariano, alergia al cacahuete… pulsa Intro para añadir",
  },
  "e.g. halal food, prayer times… — press Enter to add": {
    zh: "例如：清真食品、礼拜时间……按回车添加",
    it: "es. cibo halal, orari di preghiera… — premi Invio per aggiungere",
    es: "p. ej. comida halal, horarios de oración… pulsa Intro para añadir",
  },
  "Enter another attraction & press Enter — add as many as you like": {
    zh: "输入其他景点后按回车——可添加多个",
    it: "Scrivi un'altra attrazione e premi Invio — aggiungine quante vuoi",
    es: "Escribe otra atracción y pulsa Intro: añade tantas como quieras",
  },
  "Enter another interest & press Enter — add as many as you like": {
    zh: "输入其他兴趣后按回车——可添加多个",
    it: "Scrivi un altro interesse e premi Invio — aggiungine quanti vuoi",
    es: "Escribe otro interés y pulsa Intro: añade tantos como quieras",
  },
  "Location preference · e.g. near the beach, city center…": {
    zh: "位置要求 · 例如：海边、市中心……",
    it: "Preferenza di zona — es. vicino alla spiaggia, centro…",
    es: "Preferencia de ubicación: p. ej. cerca de la playa, centro…",
  },
  "Skills note · e.g. drone pilot, first-aid certified": {
    zh: "特殊技能备注 · 例如：无人机飞手、急救证",
    it: "Note abilità — es. pilota di droni, primo soccorso",
    es: "Nota de habilidades: p. ej. piloto de dron, primeros auxilios",
  },
  "Companions · 随行人（选填）": {
    zh: "随行人（选填）",
    it: "Accompagnatori (facoltativo)",
    es: "Acompañantes (opcional)",
  },
  "Add a companion": { zh: "添加随行人", it: "Aggiungi un accompagnatore", es: "Añadir acompañante" },
  "Companion": { zh: "随行人", it: "Accompagnatore", es: "Acompañante" },
  "Remove companion": { zh: "删除随行人", it: "Rimuovi accompagnatore", es: "Eliminar acompañante" },
  "Traveling solo? Skip this section.": {
    zh: "独自出行？可直接跳过本节。",
    it: "Viaggi da solo? Puoi saltare questa sezione.",
    es: "¿Viajas solo? Puedes omitir esta sección.",
  },

  /* ---------- Leisure 城市 ---------- */
  "Qingdao": { zh: "青岛", it: "Qingdao", es: "Qingdao" },
  "Harbin": { zh: "哈尔滨", it: "Harbin", es: "Harbín" },
  "Zhangjiajie": { zh: "张家界", it: "Zhangjiajie", es: "Zhangjiajie" },
  "Chongqing": { zh: "重庆", it: "Chongqing", es: "Chongqing" },

  /* ---------- 青岛景点 ---------- */
  "May Fourth Square": { zh: "五四广场", it: "Piazza del 4 Maggio", es: "Plaza del 4 de Mayo" },
  "St. Michael's Cathedral": { zh: "圣弥厄尔大教堂", it: "Cattedrale di San Michele", es: "Catedral de San Miguel" },
  "Naval Museum": { zh: "海军博物馆", it: "Museo Navale", es: "Museo Naval" },
  "Badaguan": { zh: "八大关", it: "Badaguan", es: "Badaguan" },
  "Zhanqiao Pier": { zh: "栈桥", it: "Pontile Zhanqiao", es: "Muelle Zhanqiao" },
  "Tsingtao Beer Museum": { zh: "青岛啤酒博物馆", it: "Museo della Birra Tsingtao", es: "Museo de la Cerveza Tsingtao" },
  "Taidong Pedestrian Street": { zh: "台东步行街", it: "Via pedonale Taidong", es: "Calle peatonal Taidong" },
  "Laoshan Scenic Area": { zh: "崂山风景区", it: "Area scenica di Laoshan", es: "Zona escénica de Laoshan" },

  /* ---------- Leisure 服务项目 ---------- */
  "Itinerary design": { zh: "行程定制", it: "Progettazione itinerario", es: "Diseño de itinerario" },
  "Day tours": { zh: "一日游", it: "Gite di un giorno", es: "Excursiones de un día" },
  "Tour guide": { zh: "导游", it: "Guida turistica", es: "Guía turístico" },
  "Restaurant booking": { zh: "餐饮预定", it: "Prenotazione ristoranti", es: "Reserva de restaurantes" },
  "Attraction tickets": { zh: "景点门票", it: "Biglietti per attrazioni", es: "Entradas a atracciones" },

  /* ---------- Leisure 人员要求 ---------- */
  "No gender preference": { zh: "不限性别", it: "Nessuna preferenza di genere", es: "Sin preferencia de género" },
  "Luggage assistance": { zh: "协助搬运行李", it: "Assistenza con i bagagli", es: "Ayuda con el equipaje" },
  "Sign language": { zh: "手语", it: "Lingua dei segni", es: "Lengua de signos" },
  "Elderly / child care": { zh: "照顾老人/儿童", it: "Cura di anziani/bambini", es: "Cuidado de ancianos/niños" },
  "Special skills": { zh: "特殊技能", it: "Abilità speciali", es: "Habilidades especiales" },

  /* ---------- Leisure 兴趣偏好 ---------- */
  "Food & local eats": { zh: "美食探店", it: "Cucina e locali tipici", es: "Gastronomía y locales" },
  "Nature & scenery": { zh: "自然风光", it: "Natura e paesaggi", es: "Naturaleza y paisajes" },
  "Honeymoon": { zh: "情侣蜜月", it: "Luna di miele", es: "Luna de miel" },
  "History & heritage": { zh: "历史古迹", it: "Storia e patrimonio", es: "Historia y patrimonio" },
  "City & culture": { zh: "城市人文", it: "Città e cultura", es: "Ciudad y cultura" },
  "Night views": { zh: "夜景观光", it: "Vedute notturne", es: "Vistas nocturnas" },
  "Intangible heritage": { zh: "非遗体验", it: "Patrimonio immateriale", es: "Patrimonio inmaterial" },
  "Shopping": { zh: "购物", it: "Shopping", es: "Compras" },
  "Hiking & outdoors": { zh: "户外徒步", it: "Trekking e attività all'aperto", es: "Senderismo y aire libre" },
  "Hot springs / beaches": { zh: "温泉 / 海滩", it: "Terme / spiagge", es: "Aguas termales / playas" },
  "Modern tech": { zh: "现代科技", it: "Tecnologia moderna", es: "Tecnología moderna" },
  "Chinese culture": { zh: "中国文化", it: "Cultura cinese", es: "Cultura china" },

  /* ---------- 页脚：快捷入口 + 法律链接 ---------- */
  "Contact us": { zh: "联系我们", it: "Contattaci", es: "Contáctanos" },
  "Explore": { zh: "快速入口", it: "Esplora", es: "Explorar" },
  "Legal & Info": { zh: "法律与信息", it: "Legale e info", es: "Legal e información" },
  "Privacy Policy": { zh: "隐私政策", it: "Informativa sulla privacy", es: "Política de privacidad" },
  "Terms of Service": { zh: "服务条款", it: "Termini di servizio", es: "Términos de servicio" },
  "Cookie Policy": { zh: "Cookie 政策", it: "Informativa sui cookie", es: "Política de cookies" },
  "Refund Policy": { zh: "退款政策", it: "Politica di rimborso", es: "Política de reembolso" },
  "About Us": { zh: "关于我们", it: "Chi siamo", es: "Sobre nosotros" },
  "FAQ": { zh: "常见问题", it: "Domande frequenti", es: "Preguntas frecuentes" },
};
