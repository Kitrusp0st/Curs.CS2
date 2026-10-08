export type PlayerRole = 'Капитан (IGL)' | 'Снайпер (AWP)' | 'Энтри-фраггер' | 'Опорник' | 'Люрковод';

export interface ClanPlayer {
  id: string;
  nickname: string;
  tagName: string;
  realName: string;
  role: PlayerRole;
  division: 'Основной состав' | 'Элита паблика';
  kdRatio: number;
  adr: number;
  hsPercent: number;
  crazypubHours: number;
  clutchWinRate: string;
  signatureWeapon: string;
  favoriteMap: string;
  dpi: number;
  sensitivity: number;
  resolution: string;
  crosshairCode: string;
  viewModelCommand: string;
  rankCrazypub: number;
  bio: string;
}

export interface VacantRoleSlot {
  role: PlayerRole;
  slotsCount: number;
  minKd: string;
  duties: string;
}

export interface ClanAdminMember {
  id: string;
  tagName: string;
  position: string;
  responsibility: string;
  contact: string;
  activeHours: string;
  status: string;
}

export interface ClanRuleSection {
  id: string;
  number: string;
  category: string;
  title: string;
  summary: string;
  clauses: Array<{
    code: string;
    text: string;
    penalty: string;
  }>;
}

export interface ServerNode {
  id: string;
  name: string;
  mapName: string;
  imageUrl: string;
  slots: string;
  tickMode: string;
  avgPingMsk: string;
  description: string;
  features: string[];
}

export const HERO_IMAGE_URL = '/Curs.CS2/assets/images/cs2_curs_hero_banner_1791453811574.jpg';
export const CLAN_CREST_URL = '/Curs.CS2/assets/images/curs_clan_crest_1791453830325.jpg';
export const MIRAGE_ARENA_URL = '/Curs.CS2/assets/images/crazypub_mirage_arena_1791453849278.jpg';
export const INFERNO_ARENA_URL = '/Curs.CS2/assets/images/crazypub_inferno_arena_1791453864614.jpg';

// Список состава изначально пуст, так как состав еще не избран
export const INITIAL_CLAN_ROSTER: ClanPlayer[] = [];

export const VACANT_ROLE_SLOTS: VacantRoleSlot[] = [
  {
    role: 'Капитан (IGL)',
    slotsCount: 1,
    minKd: '1.50+ K/D',
    duties: 'Координация стака на паблике Crazypub, коллы раундов и управление экономикой на клан-варах.'
  },
  {
    role: 'Снайпер (AWP)',
    slotsCount: 1,
    minKd: '1.85+ K/D',
    duties: 'Удержание ключевых линий (мидл, коннектор, банан) и открывающие фраги со снайперской винтовки.'
  },
  {
    role: 'Энтри-фраггер',
    slotsCount: 2,
    minKd: '1.60+ K/D',
    duties: 'Первый выход на плент под флешки соклановцев, вскрытие опорных позиций защиты.'
  },
  {
    role: 'Опорник',
    slotsCount: 1,
    minKd: '1.40+ K/D',
    duties: 'Надежное удержание закрытого плента за сторону CT, грамотный расход молотовых и дымов.'
  },
  {
    role: 'Люрковод',
    slotsCount: 1,
    minKd: '1.45+ K/D',
    duties: 'Перехват перетяжек соперника, сбор информации по карте и отыгрыш клатчей 1v1 / 1v2.'
  }
];

export const CLAN_ADMINISTRATION: ClanAdminMember[] = [
  {
    id: 'admin-1',
    tagName: '[Curs] Основатель',
    position: 'Глава клана · Главный куратор',
    responsibility: 'Утверждение основного состава [Curs], связь с главной администрацией сервера Crazypub, решение спорных вопросов и выдача клановых префиксов.',
    contact: 'Discord / Telegram (через анкету отбора)',
    activeHours: 'Ежедневно 18:00 — 01:00 МСК',
    status: 'Принимает заявки в первый состав'
  },
  {
    id: 'admin-2',
    tagName: '[Curs] Зам. Главы',
    position: 'Ответственный за отбор и тест-игры',
    responsibility: 'Проверка кандидатов на паблике Crazypub, проведение индивидуальных просмотров 1v1 и контроль соблюдения устава внутри стака.',
    contact: 'Координация на сервере Crazypub #1',
    activeHours: 'Ежедневно 19:00 — 00:00 МСК',
    status: 'Проводит отбор кандидатов'
  },
  {
    id: 'admin-3',
    tagName: '[Curs] Дисциплинарный куратор',
    position: 'Модератор состава и клан-варов',
    responsibility: 'Контроль чистоты аккаунтов (проверка Steam / Faceit), расписание субботних матчей 5x5 и разбор жалоб от игроков Crazypub.',
    contact: 'Закрытый Discord-канал [Curs]',
    activeHours: 'Пт–Вс 17:00 — 02:00 МСК',
    status: 'Проверка анкет'
  }
];

export const CLAN_RULES: ClanRuleSection[] = [
  {
    id: 'rules-general',
    number: '01',
    category: 'Общие положения',
    title: 'Репутация и ношение тега [Curs] на Crazypub',
    summary: 'Каждый участник клана представляет тег [Curs] перед всем сообществом паблика Crazypub.',
    clauses: [
      {
        code: 'Пункт 1.1',
        text: 'Участник обязан носить официальный префикс [Curs] в никнейме во время игры на всех серверах сети Crazypub.',
        penalty: 'Предупреждение / Снятие резервного слота'
      },
      {
        code: 'Пункт 1.2',
        text: 'Категорически запрещено использование любых читов, макросов, стороннего софта или багов карты (pixel-walk).',
        penalty: 'Мгновенное исключение из клана + перманентный бан на Crazypub'
      },
      {
        code: 'Пункт 1.3',
        text: 'Запрещена передача аккаунта с клановыми привилегиями третьим лицам.',
        penalty: 'Исключение из состава без права возврата'
      }
    ]
  },
  {
    id: 'rules-voice',
    number: '02',
    category: 'Коммуникация и поведение',
    title: 'Дисциплина в голосовом и текстовом чате',
    summary: 'Мы поддерживаем рабочую атмосферу без спама и конфликтов на паблике.',
    clauses: [
      {
        code: 'Пункт 2.1',
        text: 'Запрещены оскорбления соклановцев, провокации других игроков Crazypub и неуважительное отношение к администрации сервера.',
        penalty: 'Строгий выговор / Исключение при повторе'
      },
      {
        code: 'Пункт 2.2',
        text: 'Во время клатчей (1v1, 1v2) в голосовом канале соблюдается полная тишина после выдачи точной информации по позиции врага.',
        penalty: 'Устное замечание от капитана'
      },
      {
        code: 'Пункт 2.3',
        text: 'Запрещено намеренно мешать игре соклановцев (флешить своих, блокировать в проходах, забирать дроп без спроса).',
        penalty: 'Перевод в запас / Исключение'
      }
    ]
  },
  {
    id: 'rules-activity',
    number: '03',
    category: 'Онлайн и клан-вары',
    title: 'Посещаемость паблика и участие в отборе',
    summary: 'Место в основном составе удерживается за счет стабильной игры и командной работы.',
    clauses: [
      {
        code: 'Пункт 3.1',
        text: 'Минимальная активность участника основного состава на паблике Crazypub — не менее 6 часов в неделю.',
        penalty: 'Перевод в резервный состав'
      },
      {
        code: 'Пункт 3.2',
        text: 'При отсутствии более 7 дней без предупреждения главы клана или заместителя слот передается следующему кандидату.',
        penalty: 'Освобождение слота в ростере'
      },
      {
        code: 'Пункт 3.3',
        text: 'Игроки, избранные в турнирную пятерку, обязаны подтверждать явку на субботние клан-вары минимум за 3 часа до начала матча.',
        penalty: 'Замена на игрока из резерва'
      }
    ]
  }
];

export const CRAZYPUB_SERVERS: ServerNode[] = [
  {
    id: 'crazypub-mirage',
    name: 'Crazypub #1 · Mirage 24/7 Tactical',
    mapName: 'de_mirage',
    imageUrl: MIRAGE_ARENA_URL,
    slots: '24 слота паблика',
    tickMode: 'Sub-tick Pro · Защита античитом',
    avgPingMsk: '9 мс (Москва / СПб)',
    description: 'Основная площадка клана [Curs]. Здесь проходят вечерние сборы, просмотр кандидатов в состав и командная отработка удержания плентов.',
    features: [
      'Золотой префикс [Curs] в чате и таблице счета для утвержденного состава',
      'Автоматический баланс команд и подробная статистика урона в конце раунда',
      'Приоритетный вход для игроков основного ростера и администрации клана'
    ]
  },
  {
    id: 'crazypub-inferno',
    name: 'Crazypub #2 · Inferno & Dust2 Classic',
    mapName: 'de_inferno',
    imageUrl: INFERNO_ARENA_URL,
    slots: '24 слота паблика',
    tickMode: 'Sub-tick Pro · 5v5 / 12v12 Mix',
    avgPingMsk: '11 мс (Москва / СНГ)',
    description: 'Второй сервер проекта Crazypub, где проводятся закрытые клановые матчи 5x5 и тренировочные сессии по раскидкам.',
    features: [
      'Субботние встречи 5x5 между кланами сообщества Crazypub',
      'Запись демок каждого отборочного матча для разбора с администрацией',
      'Единая база рейтинга LevelRanks для оценки K/D кандидатов'
    ]
  }
];
