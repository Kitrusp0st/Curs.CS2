export interface MenuItemConfig {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
  isCustomPage?: boolean;
  externalUrl?: string;
}

export interface FooterLinkItem {
  id: string;
  label: string;
  url: string;
}

export interface SocialLinksConfig {
  discord: string;
  youtube: string;
  telegram: string;
  tiktok: string;
  vk: string;
}

export interface IntegrationsConfig {
  discordGuildId: string;
  discordInviteUrl: string;
  discordPollIntervalSec: number;
  discordWebhookUrl: string; // Канал заявок
  discordNewsWebhookUrl: string; // Канал новостей
  crazypubSourceUrl: string;
  crazypubApiUrl: string;
  cacheTtlMinutes: number;
  leaderboardMode?: 'database' | 'parser';
}

export type ThemePresetId =
  | 'crimson'
  | 'violet'
  | 'amber'
  | 'emerald'
  | 'cyan'
  | 'light_esports';

export type ButtonAnimationStyle = 'cyber_shimmer' | 'tactical_pulse' | 'strict_minimal';
export type SiteFontOption = 'unbounded' | 'orbitron' | 'russo' | 'manrope';

export interface ThemePresetDefinition {
  id: ThemePresetId;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  accentRgb: string;
  bgBase: string;
  bgSurface: string;
  bgCard: string;
  textPrimary: string;
  textMuted: string;
  isLight?: boolean;
}

export const THEME_PRESETS: ThemePresetDefinition[] = [
  {
    id: 'crimson',
    name: 'CURS Crimson (Красный неон)',
    description: 'Фирменный агрессивный багровый акцент на глубоком обсидиановом фоне',
    primaryColor: '#09090D',
    accentColor: '#e11d48',
    accentRgb: '225, 29, 72',
    bgBase: '#09090D',
    bgSurface: '#0E0E14',
    bgCard: '#12121A',
    textPrimary: '#F8FAFC',
    textMuted: '#94A3B8',
  },
  {
    id: 'violet',
    name: 'CURS Cyber Violet (Неоновый фиолетовый)',
    description: 'Киберспортивный фиолетовый неон с холодным полуночным фоном',
    primaryColor: '#080710',
    accentColor: '#8b5cf6',
    accentRgb: '139, 92, 246',
    bgBase: '#080710',
    bgSurface: '#0E0C1A',
    bgCard: '#141124',
    textPrimary: '#F5F3FF',
    textMuted: '#A78BFA',
  },
  {
    id: 'amber',
    name: 'CS2 Source Amber (Золотой тактический)',
    description: 'Вдохновлён палитрой Counter-Strike 2 Source 2 и картой Mirage',
    primaryColor: '#0B0A08',
    accentColor: '#f59e0b',
    accentRgb: '245, 158, 11',
    bgBase: '#0B0A08',
    bgSurface: '#12100D',
    bgCard: '#181511',
    textPrimary: '#FEF3C7',
    textMuted: '#A8A29E',
  },
  {
    id: 'emerald',
    name: 'Viper Emerald (Изумрудный спецназ)',
    description: 'Тактический зелёный прибор ночного видения и тёмный графит',
    primaryColor: '#060B09',
    accentColor: '#10b981',
    accentRgb: '16, 185, 129',
    bgBase: '#060B09',
    bgSurface: '#0B1310',
    bgCard: '#101C17',
    textPrimary: '#ECFDF5',
    textMuted: '#94A3B8',
  },
  {
    id: 'cyan',
    name: 'Arctic Pulse (Ледяной кибер-циан)',
    description: 'Холодный неоновый голубой акцент на стальном тёмно-синем фоне',
    primaryColor: '#060A0F',
    accentColor: '#06b6d4',
    accentRgb: '6, 182, 212',
    bgBase: '#060A0F',
    bgSurface: '#0B111A',
    bgCard: '#101926',
    textPrimary: '#ECFEFF',
    textMuted: '#94A3B8',
  },
  {
    id: 'light_esports',
    name: 'Daylight Arena (Светлая кибер-тема)',
    description: 'Контрастная светлая тема в стиле турнирных студий с багровым акцентом',
    primaryColor: '#F1F5F9',
    accentColor: '#e11d48',
    accentRgb: '225, 29, 72',
    bgBase: '#F1F5F9',
    bgSurface: '#E2E8F0',
    bgCard: '#FFFFFF',
    textPrimary: '#0F172A',
    textMuted: '#475569',
    isLight: true,
  },
];

export const FONT_OPTIONS: Array<{ id: SiteFontOption; label: string; cssStack: string }> = [
  {
    id: 'unbounded',
    label: 'Unbounded (Киберспорт / Широкий акцент)',
    cssStack: "'Unbounded', sans-serif",
  },
  {
    id: 'manrope',
    label: 'Manrope (Современный геометрический гротеск)',
    cssStack: "'Manrope', system-ui, sans-serif",
  },
  {
    id: 'orbitron',
    label: 'JetBrains Mono Tactical (Техно-моноширинный)',
    cssStack: "'JetBrains Mono', monospace",
  },
  {
    id: 'russo',
    label: 'System Heavy Tactical (Контрастный индустриальный)',
    cssStack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
];

export interface CmsSiteConfig {
  // Оформление, Тема, Шрифт, Звуки и Анимации
  siteTitle: string;
  seoDescription: string;
  themePreset: ThemePresetId;
  defaultThemeMode: 'dark' | 'light';
  primaryColor: string;
  accentColor: string;
  fontFamily: SiteFontOption;
  buttonAnimation: ButtonAnimationStyle;
  soundEnabledByDefault: boolean;
  soundVolume: number;
  logoUrl: string;
  faviconUrl: string;

  // Главная страница
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  ctaPrimaryText: string;
  ctaSecondaryText: string;
  discordInviteUrl: string;
  heroBgUrl: string;

  // Страница «О клане» и «Правила»
  aboutHistoryHtml: string;
  aboutRulesHtml: string;
  aboutGoalsHtml: string;

  // Меню сайта
  menuItems: MenuItemConfig[];

  // Футер и соцсети
  footerText: string;
  footerLinks: FooterLinkItem[];
  socials: SocialLinksConfig;

  // Настройки интеграций
  integrations: IntegrationsConfig;
}

export type PageBlockType =
  | 'hero'
  | 'text'
  | 'image'
  | 'button'
  | 'youtube'
  | 'discord_online'
  | 'clan_top'
  | 'roster_list'
  | 'latest_news'
  | 'layout';

export interface CustomPageBlock {
  id: string;
  type: PageBlockType;
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  galleryUrls?: string[];
  buttonText?: string;
  buttonUrl?: string;
  buttonColor?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  youtubeUrl?: string;
  layoutSubtype?: 'divider' | 'spacer' | 'columns_2' | 'columns_3';
  spacerHeight?: number;
  columnsData?: string[];
}

export const DEFAULT_CLAN_ROLES = [
  { name: 'Лидер клана', color: '#e11d48', displayOrder: 1 },
  { name: 'Капитан (IGL)', color: '#f59e0b', displayOrder: 2 },
  { name: 'Снайпер (AWP)', color: '#8b5cf6', displayOrder: 3 },
  { name: 'Энтри-фраггер', color: '#10b981', displayOrder: 4 },
  { name: 'Опорник', color: '#06b6d4', displayOrder: 5 },
  { name: 'Участник', color: '#64748b', displayOrder: 6 },
];

export const DEFAULT_TOP_PLAYERS = [
  { place: 1, nickname: '[CURS] Vortex', clanTag: 'CURS', points: 4820, kdRatio: '2.18', headshotPct: '61.4%', kills: 3410, playtimeHours: 142 },
  { place: 2, nickname: '[CURS] K1ngShatter', clanTag: 'CURS', points: 4695, kdRatio: '2.64', headshotPct: '44.2%', kills: 3890, playtimeHours: 168 },
  { place: 3, nickname: '[CURS] RazeN', clanTag: 'CURS', points: 4410, kdRatio: '2.09', headshotPct: '72.8%', kills: 3120, playtimeHours: 119 },
  { place: 4, nickname: '[CURS] Ex1le', clanTag: 'CURS', points: 4180, kdRatio: '2.31', headshotPct: '51.9%', kills: 2740, playtimeHours: 89 },
  { place: 5, nickname: '[CURS] Shadowstep', clanTag: 'CURS', points: 3965, kdRatio: '1.96', headshotPct: '65.0%', kills: 2590, playtimeHours: 98 },
  { place: 6, nickname: '[CURS] B1tCrusher', clanTag: 'CURS', points: 3840, kdRatio: '1.88', headshotPct: '68.5%', kills: 2480, playtimeHours: 131 },
  { place: 7, nickname: '[CURS] PhantomCS', clanTag: 'CURS', points: 3690, kdRatio: '1.79', headshotPct: '59.1%', kills: 2190, playtimeHours: 94 },
  { place: 8, nickname: '[CURS] NightHawk', clanTag: 'CURS', points: 3520, kdRatio: '1.72', headshotPct: '57.4%', kills: 1980, playtimeHours: 82 },
  { place: 9, nickname: '[CURS] ZeroRecoil', clanTag: 'CURS', points: 3390, kdRatio: '1.68', headshotPct: '63.2%', kills: 1845, playtimeHours: 76 },
  { place: 10, nickname: '[CURS] FrostByte', clanTag: 'CURS', points: 3250, kdRatio: '1.61', headshotPct: '54.8%', kills: 1720, playtimeHours: 71 },
];

export const DEFAULT_SYSTEM_PAGES: Array<{
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  showInMenu: boolean;
  isSystem: boolean;
  blocks: CustomPageBlock[];
}> = [
  {
    slug: 'home',
    title: 'Главная',
    seoTitle: '[CURS] — Главная страница клана CS2 на CrazyPub',
    seoDescription: 'Официальный портал клана CURS на сервере CrazyPub: онлайн Discord, топ клана и приём заявок.',
    showInMenu: true,
    isSystem: true,
    blocks: [
      {
        id: 'home-hero-1',
        type: 'hero',
        title: 'Игровой клан CURS — доминирование и дисциплина на CrazyPub',
        subtitle: 'Counter-Strike 2 · Официальное сообщество на паблике CrazyPub',
        content:
          'Мы объединяем лучших игроков сервера CrazyPub под единым тегом CURS. Командная игра, живое общение в Discord, прозрачный рейтинг и открытый набор на роль Участника клана.',
        imageUrl: '/src/assets/images/cs2_curs_hero_banner_1791453811574.jpg',
        buttonText: 'Вступить в клан',
        buttonUrl: 'tab:apply',
        secondaryButtonText: 'Наш Discord',
        secondaryButtonUrl: 'https://discord.gg/curs-clan',
      },
      {
        id: 'home-discord-2',
        type: 'discord_online',
        title: 'Онлайн Discord-сервера CURS в реальном времени',
      },
      {
        id: 'home-top-3',
        type: 'clan_top',
        title: 'Мини-топ клана CURS на паблике CrazyPub',
      },
      {
        id: 'home-news-4',
        type: 'latest_news',
        title: 'Последние новости и объявления штаба CURS',
      },
    ],
  },
  {
    slug: 'about',
    title: 'О клане',
    seoTitle: 'О клане CURS — История, цели и достижения на CrazyPub',
    seoDescription: 'История формирования клана CURS в Counter-Strike 2, турнирные цели и структура сообщества.',
    showInMenu: true,
    isSystem: true,
    blocks: [
      {
        id: 'about-text-1',
        type: 'text',
        title: 'История становления клана CURS',
        content: `<h3>От стака регулярных игроков до организованного клана CrazyPub</h3>
<p>Клан <strong>CURS</strong> зародился на паблик-серверах CrazyPub в Counter-Strike 2, когда ведущие игроки вечернего прайм-тайма объединились под общим тегом для совместного контроля карты, обмена опытом и участия в клановых матчах.</p>
<blockquote>Сегодня весь контент портала, состав, список топов и приём заявок управляются через единую базу данных клана без программирования.</blockquote>`,
      },
      {
        id: 'about-cols-2',
        type: 'layout',
        layoutSubtype: 'columns_3',
        title: 'Три главных принципа CURS',
        columnsData: [
          '<h4>01. Командная дисциплина</h4><p>Чёткая коммуникация в раундах, знание раскидок на Mirage и Inferno и взаимная страховка.</p>',
          '<h4>02. Абсолютный Fair Play</h4><p>Нулевая терпимость к любому стороннему софту, скриптам или токсичному поведению на сервере.</p>',
          '<h4>03. Прозрачный рост</h4><p>Каждый принятый по заявке игрок получает роль «Участник» и может вырасти до офицера стака.</p>',
        ],
      },
      {
        id: 'about-img-3',
        type: 'image',
        title: 'Арена сражений клана CURS на CrazyPub',
        imageUrl: '/src/assets/images/crazypub_mirage_arena_1791453849278.jpg',
        galleryUrls: [
          '/src/assets/images/crazypub_mirage_arena_1791453849278.jpg',
          '/src/assets/images/crazypub_inferno_arena_1791453864614.jpg',
        ],
      },
    ],
  },
  {
    slug: 'rules',
    title: 'Правила',
    seoTitle: 'Устав и правила клана CURS на CrazyPub',
    seoDescription: 'Обязательный кодекс поведения, правила ношения клан-тега [CURS] и дисциплинарный регламент.',
    showInMenu: true,
    isSystem: true,
    blocks: [
      {
        id: 'rules-text-1',
        type: 'text',
        title: 'Официальный устав и правила клана CURS',
        content: `<h3>Раздел 1. Общие положения и клан-тег</h3>
<ul>
  <li><strong>Пункт 1.1:</strong> Каждый участник основного состава обязан носить префикс <code>[CURS]</code> перед игровым никнеймом при игре на серверах сети CrazyPub.</li>
  <li><strong>Пункт 1.2:</strong> Категорически запрещено использование любых читов, макросов, стороннего ПО и текстурных багов карт. Нарушение ведёт к перманентному исключению.</li>
</ul>
<h3>Раздел 2. Поведение и коммуникация</h3>
<ul>
  <li><strong>Пункт 2.1:</strong> Запрещены оскорбления соклановцев, провокации в общем чате и неуважение к администрации паблика CrazyPub.</li>
  <li><strong>Пункт 2.2:</strong> Во время клатч-ситуаций (1v1, 1v2) в голосовом канале соблюдается полная тишина после выдачи короткой информации по позиции противника.</li>
</ul>`,
      },
      {
        id: 'rules-btn-2',
        type: 'button',
        title: 'Ознакомились с уставом клана?',
        content: 'После изучения всех пунктов устава вы можете подать заявку на роль Участника.',
        buttonText: 'Перейти к подаче заявки',
        buttonUrl: 'tab:apply',
        buttonColor: '#e11d48',
      },
    ],
  },
  {
    slug: 'tactics',
    title: 'База раскидок CS2',
    seoTitle: 'База раскидок и тактик клана CURS',
    seoDescription: 'Обязательные гранаты и тактические схемы клана CURS для карт Mirage и Inferno.',
    showInMenu: true,
    isSystem: false,
    blocks: [
      {
        id: 'tac-1',
        type: 'text',
        title: 'Стандартные раскидки CURS для Mirage и Inferno',
        content:
          '<p>Каждый участник клана изучает базовые смоки на Mirage (Окно, Коннектор, Старт) и Inferno (Гробы, КТ-спавн) для синхронного выхода в раунде.</p>',
      },
      {
        id: 'tac-2',
        type: 'image',
        title: 'Контроль центра и А-плента на Mirage',
        imageUrl: '/src/assets/images/crazypub_mirage_arena_1791453849278.jpg',
      },
    ],
  },
];

export const DEFAULT_CMS_CONFIG: CmsSiteConfig = {
  siteTitle: '[CURS] — Официальный сайт клана CS2 на CrazyPub',
  seoDescription:
    'Игровой клан CURS в Counter-Strike 2 на паблике CrazyPub: приём заявок на роль Участника, живой онлайн Discord, таблица рейтинга и новости клана.',
  themePreset: 'crimson',
  defaultThemeMode: 'dark',
  primaryColor: '#09090D',
  accentColor: '#e11d48',
  fontFamily: 'unbounded',
  buttonAnimation: 'cyber_shimmer',
  soundEnabledByDefault: true,
  soundVolume: 0.35,
  logoUrl: '/src/assets/images/curs_clan_crest_1791453830325.jpg',
  faviconUrl: '/src/assets/images/curs_clan_crest_1791453830325.jpg',

  heroTitle: 'Игровой клан CURS — доминирование и дисциплина на CrazyPub',
  heroSubtitle: 'Counter-Strike 2 · Официальное сообщество на паблике CrazyPub',
  heroDescription:
    'Мы объединяем лучших игроков сервера CrazyPub под единым тегом CURS. Командная игра, живое общение в Discord, прозрачный рейтинг и открытый набор на роль Участника клана.',
  ctaPrimaryText: 'Вступить в клан',
  ctaSecondaryText: 'Наш Discord',
  discordInviteUrl: 'https://discord.gg/curs-clan',
  heroBgUrl: '/src/assets/images/cs2_curs_hero_banner_1791453811574.jpg',

  aboutHistoryHtml: `<h3>От стака регулярных игроков до организованного клана CrazyPub</h3>
<p>Клан <strong>CURS</strong> зародился на паблик-серверах CrazyPub в Counter-Strike 2, когда ведущие игроки вечернего прайм-тайма объединились под общим тегом для совместного контроля карты, обмена опытом и участия в клановых матчах.</p>
<p>Сегодня весь контент портала, состав, список топов и приём заявок управляются через единую базу данных клана.</p>`,

  aboutRulesHtml: `<h3>Официальный устав клана CURS</h3>
<ul>
  <li><strong>Пункт 1.1 (Ношение тега):</strong> Каждый принятый участник носит префикс [CURS] на серверах сети CrazyPub.</li>
  <li><strong>Пункт 1.2 (Честная игра):</strong> Категорически запрещены читы, макросы, скрипты и использование багов карт. Нарушение карается мгновенным исключением.</li>
  <li><strong>Пункт 2.1 (Дисциплина в чате):</strong> Запрещены оскорбления соклановцев, провокации в текстовом и голосовом чате и неуважение к администрации сервера.</li>
  <li><strong>Пункт 2.2 (Командная работа):</strong> Во время клатчей (1v1 / 1v2) в войс-канале соблюдается тишина после выдачи точной информации по позиции соперника.</li>
</ul>`,

  aboutGoalsHtml: `<h3>Цели и задачи клана на сезон</h3>
<ul>
  <li><strong>Лидерство в рейтинге CrazyPub:</strong> удержание первых строчек таблицы лидеров среди всех кланов паблика.</li>
  <li><strong>Активное комьюнити в Discord:</strong> ежедневные вечерние сборы, совместные игры и разбор гранат на Mirage и Inferno.</li>
  <li><strong>Развитие участников:</strong> каждый принятый игрок со статусом «Участник» может проявить себя и решением Лидера получить офицерскую роль.</li>
</ul>`,

  menuItems: [
    { id: 'home', label: 'Главная', enabled: true, order: 1 },
    { id: 'about', label: 'О клане', enabled: true, order: 2 },
    { id: 'rules', label: 'Правила', enabled: true, order: 3 },
    { id: 'roster', label: 'Состав', enabled: true, order: 4 },
    { id: 'top', label: 'Топ клана', enabled: true, order: 5 },
    { id: 'apply', label: 'Вступление', enabled: true, order: 6 },
  ],

  footerText: '© 2026 Игровой клан [CURS] · Counter-Strike 2 на паблике CrazyPub. Все права защищены.',
  footerLinks: [
    { id: 'fl-1', label: 'Устав клана', url: 'tab:rules' },
    { id: 'fl-2', label: 'Рейтинг CrazyPub', url: 'tab:top' },
    { id: 'fl-3', label: 'Подать заявку', url: 'tab:apply' },
  ],

  socials: {
    discord: 'https://discord.gg/curs-clan',
    youtube: 'https://youtube.com/@curs-clan-cs2',
    telegram: 'https://t.me/curs_crazypub',
    tiktok: 'https://tiktok.com/@curs.cs2',
    vk: 'https://vk.com/curs_cs2',
  },

  integrations: {
    discordGuildId: '',
    discordInviteUrl: 'https://discord.gg/curs-clan',
    discordPollIntervalSec: 45,
    discordWebhookUrl: '',
    discordNewsWebhookUrl: '',
    crazypubSourceUrl: 'https://crazypub.cs2.ru/top',
    crazypubApiUrl: '',
    cacheTtlMinutes: 6,
    leaderboardMode: 'database',
  },
};
