/**
 * 站点全局配置 —— 后期大部分内容修改只需改这里
 * 所有文案、图片、链接、服务项集中管理，组件只负责渲染。
 */

export const site = {
  name: "Longview China Travel",
  tagline: "China, tailored to you.",
  email: "longviewchinatravel@gmail.com",
  // WhatsApp 号码（国际格式，无 + 号）
  whatsappNumber: "447511987919",
  socials: [
    {
      id: "facebook",
      label: "Facebook",
      url: "https://www.facebook.com/profile.php?id=61590580290168",
    },
    {
      id: "tiktok",
      label: "TikTok",
      url: "https://www.tiktok.com/@longviewchinatravel",
    },
    {
      id: "instagram",
      label: "Instagram",
      url: "https://www.instagram.com/longviewchinatravel/",
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      url: "https://wa.me/447511987919", // 与 whatsappNumber 保持一致
    },
  ],
};

export const hero = {
  video: "/media/hero.mp4",
  poster: "/media/hero-poster.jpg",
  titleLines: ["Longview", "China"],
  chineseTagline: "龙观中国",
  subtitle:
    "Inbound leisure travel & business travel, fully tailored——premium travel experiences at approachable prices.",
  ctaPrimary: { label: "Plan your trip", target: "#purpose" },
};

export const manifesto = {
  heading: "Your Vision of China, Effortlessly Delivered.",
  paragraphs: [
    "Where ancient heritage meets modern ambitious horizon. Whether closing a strategic venture or wandering through misty peaks, we curate every detail for your complete peace of mind.",
  ],
  stats: [
    { value: "0", suffix: "", label: "Limits — Infinite Horizons, Yours" },
    { value: "360", suffix: "°", label: "Tailor-made, end-to-end service" },
    { value: "24", suffix: "/7", label: "Support during your whole stay" },
    { value: "∞", suffix: "", label: "Journeys — Endless Inspiration, Endless Return" },
  ],
};



/** 子页面分步向导步骤定义：kind 支持 chips(多选) / select(单选下拉) / text(自由填写) */
export type WizardStep = {
  id: string;
  title: string;
  subtitle?: string;
  kind: "chips" | "select" | "text";
  options?: string[];
  placeholder?: string;
  inputType?: string;
  required?: boolean;
};

export const purpose = {
  heading: "What brings you to China?",
  subheading: "Choose your journey — everything after is tailored.",
  options: [
    {
      id: "leisure",
      title: "Leisure Travel",
      subtitle: "入境休闲旅游",
      description:
        "Custom holidays, classic routes and hidden gems. We design the trip, you collect the memories.",
      image: "/media/img4.jpg",
      bullets: ["Custom itineraries & private tours", "Hotels, drivers & bilingual guides", "Tickets, shows & local experiences"],
    },
    {
      id: "business",
      title: "Business Travel",
      subtitle: "商业差旅",
      description:
        "Meetings, factory visits, exhibitions and trade fairs — handled with precision and discretion.",
      image: "/media/img7.jpg",
      bullets: ["Meetings, exhibitions & factory visits", "Interpreters & business etiquette support", "Flights, hotels & ground transport"],
    },
  ],
};

export const wizardLeisure: WizardStep[] = [
  {
    id: "interests",
    title: "What are you interested in?",
    subtitle: "Pick as many as you like",
    kind: "chips",
    options: ["Classic routes", "Food & culture", "Nature & hiking", "Photography", "Family trip", "Luxury", "Budget", "Nightlife"],
    required: true,
  },
  {
    id: "city",
    title: "Which city do you want to visit?",
    kind: "select",
    options: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu", "Xi'an", "Hangzhou", "Guilin", "Other / multiple cities"],
    required: true,
  },
  {
    id: "dates",
    title: "When do you plan to travel?",
    placeholder: "e.g. Nov 10 – Nov 20, 2026",
    kind: "text",
  },
  {
    id: "extra",
    title: "How many people?",
    placeholder: "e.g. 2 adults, 1 child",
    kind: "text",
  },
  {
    id: "name",
    title: "What's your name?",
    placeholder: "Your name",
    kind: "text",
    required: true,
  },
  {
    id: "email",
    title: "What's your email?",
    subtitle: "We reply within 24 hours",
    placeholder: "you@example.com",
    kind: "text",
    inputType: "email",
    required: true,
  },
  {
    id: "whatsapp",
    title: "WhatsApp / phone? (optional)",
    placeholder: "+1 555 000 0000",
    kind: "text",
    inputType: "tel",
  },
];

export const wizardBusiness: WizardStep[] = [
  {
    id: "interests",
    title: "What's the purpose of your trip?",
    subtitle: "Pick as many as you like",
    kind: "chips",
    options: ["Exhibitions / trade fairs", "Factory visits", "Meetings & conferences", "Market research", "Interpretation", "Partner visits"],
    required: true,
  },
  {
    id: "city",
    title: "Which city are you heading to?",
    kind: "select",
    options: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu", "Xi'an", "Hangzhou", "Other / multiple cities"],
    required: true,
  },
  {
    id: "dates",
    title: "When do you plan to travel?",
    placeholder: "e.g. Nov 10 – Nov 20, 2026",
    kind: "text",
  },
  {
    id: "extra",
    title: "Company / organization (optional)",
    placeholder: "e.g. ABC Trading Ltd.",
    kind: "text",
  },
  {
    id: "name",
    title: "What's your name?",
    placeholder: "Your name",
    kind: "text",
    required: true,
  },
  {
    id: "email",
    title: "What's your email?",
    subtitle: "We reply within 24 hours",
    placeholder: "you@example.com",
    kind: "text",
    inputType: "email",
    required: true,
  },
  {
    id: "whatsapp",
    title: "WhatsApp / phone? (optional)",
    placeholder: "+1 555 000 0000",
    kind: "text",
    inputType: "tel",
  },
];

/** Business 分步引导内容配置（src/components/BusinessWizard.tsx 使用） */
export const businessContent = {  /** 目标城市九宫格：image 留空则用城市名做视觉占位，有素材后填图片路径 */
  cities: [
    { name: "Guangzhou", zh: "广州", image: "/media/cities/guangzhou.jpg" },
    { name: "Shanghai", zh: "上海", image: "/media/cities/shanghai.jpg" },
    { name: "Shenzhen", zh: "深圳", image: "/media/cities/shenzhen.jpg" },
    { name: "Dongguan", zh: "东莞", image: "/media/cities/dongguan.jpg" },
    { name: "Yiwu", zh: "义乌", image: "/media/cities/yiwu.jpg" },
    { name: "Ningbo", zh: "宁波", image: "/media/cities/ningbo.jpg" },
    { name: "Qingdao", zh: "青岛", image: "/media/cities/qingdao.jpg" },
    { name: "Beijing", zh: "北京", image: "/media/cities/beijing.jpg" },
  ],
  purposes: [
    { en: "Exhibition / trade fair", zh: "参加展会" },
    { en: "Factory audit", zh: "工厂验厂" },
    { en: "Client visit", zh: "客户拜访" },
    { en: "Business negotiation", zh: "商务谈判" },
    { en: "Sourcing research", zh: "采购考察" },
  ],
  services: [
    { en: "Flights", zh: "机票" },
    { en: "Chartered car", zh: "包车" },
    { en: "Car rental", zh: "租车" },
    { en: "Driver", zh: "司机" },
    { en: "Sourcing", zh: "采购" },
    { en: "Hotel booking", zh: "预定酒店" },
    { en: "Professional interpretation", zh: "专业翻译" },
    { en: "Ground handling", zh: "地接" },
    { en: "Dining arrangements", zh: "餐饮安排" },
    { en: "Visa assistance", zh: "签证" },
    { en: "Ticket booking", zh: "订票" },
    { en: "High-speed rail", zh: "高铁预定" },
    { en: "Airport transfer", zh: "接送机" },
    { en: "SIM card", zh: "Sim card" },
    { en: "Payment support", zh: "支付" },
    { en: "Emergency assistance", zh: "紧急协助" },
  ],
  /** 选中这些服务时才会出现“人员要求”步骤 */
  personnelServices: [
    "Chartered car",
    "Driver",
    "Professional interpretation",
    "Ground handling",
    "Airport transfer",
    "Emergency assistance",
  ],
  personnelOptions: [
    { en: "Language requirement", zh: "语言要求", note: "language" },
    { en: "Purchasing experience", zh: "采购经验" },
    { en: "Interpretation experience", zh: "口译经验" },
    { en: "Legal experience", zh: "法律经验" },
    { en: "Financial experience", zh: "财务经验" },
    { en: "Negotiation skills", zh: "议价经验" },
    { en: "Logistics experience", zh: "物流经验" },
    { en: "Foreign trade experience", zh: "外贸经验" },
    { en: "Male", zh: "男" },
    { en: "Female", zh: "女" },
    { en: "Age requirement", zh: "年龄要求", note: "age" },
  ],
};

/** Leisure 分步引导内容配置（src/components/LeisureWizard.tsx 使用）
 *  attractionsByCity 按城市英文名分组；只有分组存在且客人选了该城市才会出现景点步骤 */
export const leisureContent = {
  /** 目标城市大卡片区：image 留空则用城市中文名做视觉占位 */
  cities: [
    { name: "Shanghai", zh: "上海", image: "/media/cities/shanghai.jpg" },
    { name: "Beijing", zh: "北京", image: "/media/cities/beijing.jpg" },
    { name: "Qingdao", zh: "青岛", image: "/media/cities/qingdao.jpg" },
    { name: "Harbin", zh: "哈尔滨", image: "/media/cities/harbin.jpg" },
    { name: "Zhangjiajie", zh: "张家界", image: "/media/cities/zhangjiajie.jpg" },
    { name: "Shenzhen", zh: "深圳", image: "/media/cities/shenzhen.jpg" },
    { name: "Chongqing", zh: "重庆", image: "/media/cities/chongqing.jpg" },
    { name: "Guangzhou", zh: "广州", image: "/media/cities/guangzhou.jpg" },
  ],
  /** 每个城市的景点卡片：desc 为一句话吸引文案 */
  attractionsByCity: {
    Qingdao: [
      { name: "May Fourth Square", zh: "五四广场", desc: "Red sculpture by the sea — Qingdao's iconic skyline at sunset.", image: "/media/attractions/qingdao/may-fourth-square.webp" },
      { name: "St. Michael's Cathedral", zh: "圣弥厄尔大教堂", desc: "A twin-spired gem tucked in old-town streets, perfect for photos.", image: "/media/attractions/qingdao/st-michaels-cathedral.webp" },
      { name: "Naval Museum", zh: "海军博物馆", desc: "Walk the decks of real warships — China's maritime glory up close.", image: "/media/attractions/qingdao/naval-museum.webp" },
      { name: "Badaguan", zh: "八大关", desc: "European villas under old trees — the most romantic corner of Qingdao.", image: "/media/attractions/qingdao/badaguan.webp" },
      { name: "Zhanqiao Pier", zh: "栈桥", desc: "The 440m pier into the bay, with seagulls circling Huilan Pavilion.", image: "/media/attractions/qingdao/zhanqiao-pier.webp" },
      { name: "Tsingtao Beer Museum", zh: "青岛啤酒博物馆", desc: "Where China's famous beer was born — taste it fresh at the source.", image: "/media/attractions/qingdao/tsingtao-beer-museum.webp" },
      { name: "Taidong Pedestrian Street", zh: "台东步行街", desc: "Qingdao's liveliest night market — street food till midnight.", image: "/media/attractions/qingdao/taidong-street.webp" },
      { name: "Laoshan Scenic Area", zh: "崂山风景区", desc: "Sacred Taoist mountains rising straight from the sea — hike above clouds.", image: "/media/attractions/qingdao/laoshan.webp" },
    ],
  } as Record<string, { name: string; zh: string; desc: string; image?: string }[]>,
  /** 景点步骤里「其他」卡片的背景图（按城市配置，无配置则显示默认虚线卡片） */
  attractionOtherImage: {
    Qingdao: "/media/attractions/qingdao/other.webp",
  } as Record<string, string>,
  services: [
    { en: "Itinerary design", zh: "行程定制" },
    { en: "Day tours", zh: "一日游" },
    { en: "Flights", zh: "机票" },
    { en: "Chartered car", zh: "包车" },
    { en: "Car rental", zh: "租车" },
    { en: "Driver", zh: "司机" },
    { en: "Hotel booking", zh: "预定酒店" },
    { en: "Ground handling", zh: "地接" },
    { en: "Tour guide", zh: "导游" },
    { en: "Restaurant booking", zh: "餐饮预定" },
    { en: "Visa assistance", zh: "签证" },
    { en: "Attraction tickets", zh: "景点门票" },
    { en: "High-speed rail", zh: "高铁预定" },
    { en: "Airport transfer", zh: "接送机" },
    { en: "SIM card", zh: "Sim card" },
    { en: "Payment support", zh: "支付" },
    { en: "Emergency assistance", zh: "紧急协助" },
  ],
  /** 选中这些服务时才会出现“人员要求”步骤 */
  personnelServices: [
    "Chartered car",
    "Driver",
    "Ground handling",
    "Tour guide",
    "Airport transfer",
    "Emergency assistance",
  ],
  personnelOptions: [
    { en: "Language requirement", zh: "语言要求", note: "language" },
    { en: "Female", zh: "女" },
    { en: "Male", zh: "男" },
    { en: "No gender preference", zh: "不限性别" },
    { en: "Luggage assistance", zh: "协助搬运行李" },
    { en: "Sign language", zh: "手语" },
    { en: "Elderly / child care", zh: "照顾老人/儿童" },
    { en: "Special skills", zh: "特殊技能", note: "skills" },
  ],
  interests: [
    { en: "Food & local eats", zh: "美食探店", image: "/media/interests/food-local-eats.webp" },
    { en: "Nature & scenery", zh: "自然风光", image: "/media/interests/nature-scenery.webp" },
    { en: "Photography", zh: "摄影", image: "/media/interests/photography.webp" },
    { en: "Honeymoon", zh: "情侣蜜月", image: "/media/interests/honeymoon.webp" },
    { en: "Family trip", zh: "家庭出行", image: "/media/interests/family-trip.webp" },
    { en: "History & heritage", zh: "历史古迹", image: "/media/interests/history-heritage.webp" },
    { en: "City & culture", zh: "城市人文", image: "/media/interests/city-culture.webp" },
    { en: "Night views", zh: "夜景观光", image: "/media/interests/night-views.webp" },
    { en: "Intangible heritage", zh: "非遗体验", image: "/media/interests/intangible-heritage.webp" },
    { en: "Shopping", zh: "购物", image: "/media/interests/shopping.webp" },
    { en: "Hiking & outdoors", zh: "户外徒步", image: "/media/interests/hiking-outdoors.webp" },
    { en: "Hot springs / beaches", zh: "温泉 / 海滩", image: "/media/interests/hot-springs-beaches.webp" },
    { en: "Modern tech", zh: "现代科技", image: "/media/interests/modern-tech.webp" },
    { en: "Chinese culture", zh: "中国文化", image: "/media/interests/chinese-culture.webp" },
    { en: "Tea ceremony", zh: "茶道与品茶", image: "/media/interests/tea-ceremony.webp" },
    { en: "Calligraphy", zh: "中国书法", image: "/media/interests/chinese-calligraphy.webp" },
    { en: "Chinese painting", zh: "中国画", image: "/media/interests/chinese-painting.webp" },
    { en: "Local markets", zh: "本地集市", image: "/media/interests/local-markets.webp" },
    { en: "Old town walks", zh: "老社区漫步", image: "/media/interests/old-neighborhood.webp" },
    { en: "Hanfu experience", zh: "汉服体验", image: "/media/interests/hanfu.webp" },
    { en: "Pottery & ceramics", zh: "陶艺与陶瓷制作", image: "/media/interests/pottery-ceramics.webp" },
    { en: "Paper cutting", zh: "剪纸", image: "/media/interests/paper-cutting.webp" },
    { en: "Fan painting", zh: "扇面绘画", image: "/media/interests/fan-painting.webp" },
    { en: "Kung fu", zh: "功夫体验", image: "/media/interests/kung-fu.webp" },
    { en: "Tai chi", zh: "太极课程", image: "/media/interests/tai-chi.webp" },
    { en: "TCM & wellness", zh: "中医与养生", image: "/media/interests/tcm-wellness.webp" },
    { en: "Bullet train ride", zh: "高铁体验", image: "/media/interests/high-speed-rail.webp" },
    { en: "Chinese opera", zh: "中国戏剧表演", image: "/media/interests/chinese-theatre.webp" },
    { en: "Fruit picking", zh: "水果采摘", image: "/media/interests/fruit-picking.webp" },
    { en: "Traditional stays", zh: "中式住宿", image: "/media/interests/traditional-accommodation.webp" },
    { en: "Chinese massage", zh: "中式按摩", image: "/media/interests/chinese-massage.webp" },
    { en: "Foot massage", zh: "足疗体验", image: "/media/interests/foot-massage.webp" },
    { en: "Public transport", zh: "公共交通体验", image: "/media/interests/public-transport.webp" },
    { en: "Craft workshops", zh: "传统技艺学习", image: "/media/interests/craft-workshops.webp" },
  ],
};

export const services = {  heading: "Your All-in-One Travel Partner",
  items: [
    { icon: "Plane", title: "Flights", text: "Domestic & international flight bookings with optimal routes." },
    { icon: "Hotel", title: "Hotels", text: "Vetted stays from cozy boutique inns to premier landmarks, matched to your style." },
    { icon: "Car", title: "Car & Driver", text: "Chauffeur-driven private rides, anytime, anywhere." },
    { icon: "Users", title: "Guides", text: "Fluent, insider storytellers who bring local culture to life." },
    { icon: "Languages", title: "Translation", text: "On-site interpreters for business meetings and events." },
    { icon: "MapPin", title: "Attractions", text: "Curated sights and off-the-beaten-path recommendations." },
    { icon: "Ticket", title: "Tickets", text: "Instant booking for bullet trains, top shows, and high-demand sites." },
    { icon: "Sparkles", title: "Custom Requests", text: "Dedicated concierge for specialized itineraries and complex logistics." },
  ],
};


export const footer = {
  heading: "Let's plan your China story.",
  contact: [
    { icon: "Mail", label: "Email", value: "longviewchinatravel@gmail.com", href: "mailto:longviewchinatravel@gmail.com" },
    { icon: "Phone", label: "WhatsApp", value: "+44 7511987919", href: "https://wa.me/447511987919" },
  ],
  note: "© 2026 Longview China Travel. All rights reserved.",
};

/* ---------------------------------------------------------------------------
 * 本地内容覆盖机制：后台控制台（/#/admin）修改的文案/链接/图片保存在浏览器
 * localStorage，加载时自动合并到上面的配置 —— 无需重新构建即可换内容。
 * 后续接入真实后端后，改为从服务器拉取配置即可。
 * ------------------------------------------------------------------------- */
export type ConfigOverrides = {
  site?: Partial<typeof site>;
  hero?: Partial<typeof hero>;
  businessContent?: Partial<typeof businessContent>;
  leisureContent?: Partial<typeof leisureContent>;
};

const OVERRIDE_KEY = "longview-config";

export function getOverrides(): ConfigOverrides {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveOverrides(o: ConfigOverrides) {
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(o));
}

(function applyOverrides() {
  const o = getOverrides();
  Object.assign(site, o.site ?? {});
  Object.assign(hero, o.hero ?? {});
  // 互动选项整组替换：后台可视编辑器保存的列表在这里合并进配置
  const bc = o.businessContent ?? {};
  if (bc.cities) businessContent.cities = bc.cities;
  if (bc.purposes) businessContent.purposes = bc.purposes;
  if (bc.services) businessContent.services = bc.services;
  if (bc.personnelOptions) businessContent.personnelOptions = bc.personnelOptions;
  const lc = o.leisureContent ?? {};
  if (lc.cities) leisureContent.cities = lc.cities;
  if (lc.attractionsByCity) leisureContent.attractionsByCity = lc.attractionsByCity;
  if (lc.services) leisureContent.services = lc.services;
  if (lc.personnelOptions) leisureContent.personnelOptions = lc.personnelOptions;
  if (lc.interests) leisureContent.interests = lc.interests;
})();
