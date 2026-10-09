import fs from 'fs';
import path from 'path';
import {
  DEFAULT_CMS_CONFIG,
  DEFAULT_TOP_PLAYERS,
  DEFAULT_CLAN_ROLES,
  DEFAULT_SYSTEM_PAGES,
  CmsSiteConfig,
} from '../data/defaultCmsContent.ts';

// Local JSON database file path (replaces Cloud SQL)
const DB_FILE_PATH = path.join(process.cwd(), '.curs-db.json');

export interface RoleRecord {
  id: number;
  code: string;
  name: string;
  discordRoleIdsJson: string;
  permissionsJson: string;
  createdAt: Date | string;
}

export interface UserRecord {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  discordId: string | null;
  discordRole: string;
  isSuspended: boolean;
  lastActiveAt: Date | string;
  createdAt: Date | string;
}

export interface ClanRoleRecord {
  id: number;
  name: string;
  color: string;
  displayOrder: number;
  createdAt: Date | string;
}

export interface ApplicationRecord {
  id: number;
  nickname: string;
  age: number;
  discordLink: string;
  experience: string;
  weeklyHours: string;
  motivation: string;
  rulesAccepted: boolean;
  role: string;
  kdRatio: string;
  status: string;
  adminComment: string | null;
  commentsLogJson: string;
  ipAddress: string | null;
  reviewedBy: string | null;
  applicantUid?: string;
  applicantEmail?: string;
  createdAt: Date | string;
}

export interface RosterMemberRecord {
  id: number;
  nickname: string;
  role: string;
  status: string;
  avatarUrl: string;
  kdRatio: string;
  discordTag: string;
  bio: string;
  joinedDate: string;
  displayOrder: number;
  addedBy: string | null;
  createdAt: Date | string;
}

export interface TopPlayerRecord {
  id: number;
  place: number;
  nickname: string;
  clanTag: string;
  points: number;
  kdRatio: string;
  headshotPct: string;
  kills: number;
  playtimeHours: number;
  updatedBy: string | null;
  createdAt: Date | string;
}

export interface ClanNewsRecord {
  id: number;
  title: string;
  content: string;
  category: string;
  coverUrl: string | null;
  status: string;
  isPinned: boolean;
  publishedDate: string;
  scheduledAt: string | null;
  authorName: string;
  driveFileUrl: string | null;
  deletedAt: Date | string | null;
  createdAt: Date | string;
}

export interface SiteSettingRecord {
  id: number;
  settingKey: string;
  dataJson: string;
  updatedBy: string | null;
  updatedAt: Date | string;
}

export interface CustomPageRecord {
  id: number;
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  showInMenu: boolean;
  isSystem: boolean;
  status: string;
  blocksJson: string;
  draftBlocksJson: string;
  authorName: string;
  deletedAt: Date | string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface MediaFileRecord {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  thumbnailUrl: string | null;
  uploadedBy: string;
  deletedAt: Date | string | null;
  createdAt: Date | string;
}

export interface ContentVersionRecord {
  id: number;
  targetType: string;
  targetKey: string;
  versionTitle: string;
  snapshotJson: string;
  createdBy: string;
  createdAt: Date | string;
}

export interface AuditLogRecord {
  id: number;
  actorName: string;
  actorRole: string;
  section: string;
  action: string;
  details: string;
  ipAddress: string;
  diffJson: string | null;
  createdAt: Date | string;
}

export interface AdminNoteRecord {
  id: number;
  authorName: string;
  authorRole: string;
  noteText: string;
  priority: string;
  createdAt: Date | string;
}

interface LocalStoreState {
  nextId: number;
  roles: RoleRecord[];
  users: UserRecord[];
  clanRoles: ClanRoleRecord[];
  applications: ApplicationRecord[];
  rosterMembers: RosterMemberRecord[];
  topPlayers: TopPlayerRecord[];
  clanNews: ClanNewsRecord[];
  siteSettings: SiteSettingRecord[];
  customPages: CustomPageRecord[];
  mediaFiles: MediaFileRecord[];
  contentVersions: ContentVersionRecord[];
  auditLogs: AuditLogRecord[];
  adminNotes: AdminNoteRecord[];
  applicationBans: Array<{ uid: string; email: string; until: string | null; reason: string; issuedBy: string; createdAt: string }>;
}

let memoryStore: LocalStoreState | null = null;

function getEmptyStore(): LocalStoreState {
  return {
    nextId: 1,
    roles: [],
    users: [],
    clanRoles: [],
    applications: [],
    applicationBans: [],
    rosterMembers: [],
    topPlayers: [],
    clanNews: [],
    siteSettings: [],
    customPages: [],
    mediaFiles: [],
    contentVersions: [],
    auditLogs: [],
    adminNotes: [],
  };
}

function loadStore(): LocalStoreState {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<LocalStoreState>;
      memoryStore = {
        ...getEmptyStore(),
        ...parsed,
      };
      return memoryStore;
    }
  } catch (err) {
    console.warn('Warning loading local JSON database, initializing fresh store:', err);
  }
  memoryStore = getEmptyStore();
  return memoryStore;
}

function saveStore() {
  if (!memoryStore) return;
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Warning saving local JSON database:', err);
  }
}

function allocId(store: LocalStoreState): number {
  const id = store.nextId || 1;
  store.nextId = id + 1;
  return id;
}

// Server-side XSS sanitizer for rich text and user inputs
export function sanitizeHtmlServer(dirty: string): string {
  if (!dirty) return '';
  return dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '');
}

export function sanitizePlainText(dirty: string): string {
  if (!dirty) return '';
  return dirty.replace(/[<>]/g, '').trim();
}

// Seed initial roles, clan roles, CMS settings, system pages, news, and top players
export async function ensureInitialSeed() {
  try {
    const store = loadStore();
    let changed = false;
    const nowIso = new Date().toISOString();

    // 1. Seed Admin Panel Roles
    if (store.roles.length === 0) {
      const seedRoles = [
        {
          code: 'leader',
          name: 'Лидер клана',
          discordRoleIdsJson: JSON.stringify(['110000000000000001']),
          permissionsJson: JSON.stringify([
            'dashboard',
            'pages',
            'news',
            'roster',
            'applications',
            'media',
            'appearance',
            'integrations',
            'admins',
            'logs',
            'settings',
          ]),
        },
        {
          code: 'deputy',
          name: 'Заместитель',
          discordRoleIdsJson: JSON.stringify(['110000000000000002']),
          permissionsJson: JSON.stringify([
            'dashboard',
            'pages',
            'news',
            'roster',
            'applications',
            'media',
            'logs',
          ]),
        },
        {
          code: 'moderator',
          name: 'Модератор',
          discordRoleIdsJson: JSON.stringify(['110000000000000003']),
          permissionsJson: JSON.stringify(['dashboard', 'applications', 'logs']),
        },
        {
          code: 'member',
          name: 'Участник',
          discordRoleIdsJson: JSON.stringify([]),
          permissionsJson: JSON.stringify(['public']),
        },
      ];
      for (const r of seedRoles) {
        store.roles.push({
          id: allocId(store),
          ...r,
          createdAt: nowIso,
        });
      }
      changed = true;
    }

    // 2. Seed Customizable Clan Roster Roles
    if (store.clanRoles.length === 0) {
      for (const cr of DEFAULT_CLAN_ROLES) {
        store.clanRoles.push({
          id: allocId(store),
          name: cr.name,
          color: cr.color,
          displayOrder: cr.displayOrder,
          createdAt: nowIso,
        });
      }
      changed = true;
    }

    // 3. Seed CMS Site Settings (published_cms & draft_cms)
    if (store.siteSettings.length === 0) {
      const jsonStr = JSON.stringify(DEFAULT_CMS_CONFIG);
      store.siteSettings.push(
        {
          id: allocId(store),
          settingKey: 'published_cms',
          dataJson: jsonStr,
          updatedBy: 'Система [CURS]',
          updatedAt: nowIso,
        },
        {
          id: allocId(store),
          settingKey: 'draft_cms',
          dataJson: jsonStr,
          updatedBy: 'Система [CURS]',
          updatedAt: nowIso,
        }
      );

      store.contentVersions.push({
        id: allocId(store),
        targetType: 'cms_settings',
        targetKey: 'published_cms',
        versionTitle: 'Базовая конфигурация сайта CURS (v1.0)',
        snapshotJson: jsonStr,
        createdBy: 'Система [CURS]',
        createdAt: nowIso,
      });
      changed = true;
    }

    // 4. Seed System & Demo Pages (home, about, rules, tactics)
    const existingSlugs = new Set(store.customPages.map((p) => p.slug));
    for (const sysPage of DEFAULT_SYSTEM_PAGES) {
      if (!existingSlugs.has(sysPage.slug)) {
        const blocksStr = JSON.stringify(sysPage.blocks);
        store.customPages.push({
          id: allocId(store),
          slug: sysPage.slug,
          title: sysPage.title,
          seoTitle: sysPage.seoTitle,
          seoDescription: sysPage.seoDescription,
          showInMenu: sysPage.showInMenu,
          isSystem: sysPage.isSystem,
          status: 'published',
          blocksJson: blocksStr,
          draftBlocksJson: blocksStr,
          authorName: '[CURS] Лидер',
          deletedAt: null,
          updatedAt: nowIso,
          createdAt: nowIso,
        });
        changed = true;
      }
    }

    // 5. Seed Initial News if empty
    if (store.clanNews.length === 0) {
      store.clanNews.push(
        {
          id: allocId(store),
          title: 'Открыт набор в основной состав клана CURS на CrazyPub',
          content:
            '<p>Штаб клана <strong>CURS</strong> объявляет об открытии приёма заявок на роль <strong>Участника</strong>. Все кандидаты проходят отбор по дисциплине, адекватности и командной игре на серверах CrazyPub.</p>',
          category: 'Объявление штаба',
          coverUrl: '/src/assets/images/cs2_curs_hero_banner_1791453811574.jpg',
          status: 'published',
          isPinned: true,
          publishedDate: '2026-10-08',
          scheduledAt: null,
          authorName: '[CURS] Лидер',
          driveFileUrl: null,
          deletedAt: null,
          createdAt: nowIso,
        },
        {
          id: allocId(store),
          title: 'Субботние сборы и тренировка раскидок на Mirage',
          content:
            '<p>В эту субботу в 19:30 МСК проводим общий сбор в Discord-канале клана. Разбираем быстрые выходы на А-плент и контроль мида на <em>de_mirage</em>.</p>',
          category: 'События клана',
          coverUrl: '/src/assets/images/crazypub_mirage_arena_1791453849278.jpg',
          status: 'published',
          isPinned: false,
          publishedDate: '2026-10-08',
          scheduledAt: null,
          authorName: '[CURS] Заместитель',
          driveFileUrl: null,
          deletedAt: null,
          createdAt: nowIso,
        }
      );
      changed = true;
    }

    // 6. Seed Initial Top Players Leaderboard if empty
    if (store.topPlayers.length === 0) {
      for (const p of DEFAULT_TOP_PLAYERS) {
        store.topPlayers.push({
          id: allocId(store),
          place: p.place,
          nickname: p.nickname,
          clanTag: p.clanTag,
          points: p.points,
          kdRatio: p.kdRatio,
          headshotPct: p.headshotPct,
          kills: p.kills,
          playtimeHours: p.playtimeHours,
          updatedBy: 'Система [CURS]',
          createdAt: nowIso,
        });
      }
      changed = true;
    }

    if (changed) {
      saveStore();
    }
  } catch (error) {
    console.error('Database seed warning:', error);
  }
}

// ============================================================================
// USERS, ROLES & DISCORD ROLE MAPPINGS
// ============================================================================
export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  discordId?: string,
  discordRole: string = 'member'
) {
  const store = loadStore();
  const nowIso = new Date().toISOString();
  const existing = store.users.find((u) => u.uid === uid);

  if (existing) {
    existing.email = email;
    existing.displayName = displayName || email.split('@')[0];
    if (discordId) existing.discordId = discordId;
    existing.lastActiveAt = nowIso;
    saveStore();
    return existing;
  }

  // Claim an invitation only after the Google ID token has been verified.
  const pending = store.users.find((u) => u.uid.startsWith('pending-google:') && u.email.toLowerCase() === email.toLowerCase());
  if (pending && !discordId) {
    pending.uid = uid;
    pending.displayName = displayName || pending.displayName;
    pending.lastActiveAt = nowIso;
    saveStore();
    return pending;
  }

  const newUser: UserRecord = {
    id: allocId(store),
    uid,
    email,
    displayName: displayName || email.split('@')[0],
    discordId: discordId || null,
    discordRole,
    isSuspended: false,
    lastActiveAt: nowIso,
    createdAt: nowIso,
  };
  store.users.push(newUser);
  saveStore();
  return newUser;
}

export async function inviteGoogleAdmin(email: string, role: 'deputy' | 'moderator') {
  const store = loadStore();
  const normalized = email.trim().toLowerCase();
  const existing = store.users.find((u) => u.email.toLowerCase() === normalized && !u.discordId);
  if (existing) {
    existing.discordRole = role;
    existing.isSuspended = false;
    saveStore();
    return existing;
  }
  const now = new Date().toISOString();
  const pending: UserRecord = {
    id: allocId(store),
    uid: 'pending-google:' + normalized,
    email: normalized,
    displayName: normalized.split('@')[0],
    discordId: null,
    discordRole: role,
    isSuspended: false,
    lastActiveAt: now,
    createdAt: now,
  };
  store.users.push(pending);
  saveStore();
  return pending;
}

export async function getUserByUid(uid: string) {
  const store = loadStore();
  return store.users.find((u) => u.uid === uid) || null;
}

export async function touchUserActivity(uid: string) {
  const store = loadStore();
  const user = store.users.find((u) => u.uid === uid);
  if (user) {
    user.lastActiveAt = new Date().toISOString();
    saveStore();
  }
}

export async function getAllUsers() {
  const store = loadStore();
  return [...store.users].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateUserRole(
  userId: number,
  newRole: string,
  isSuspended?: boolean
) {
  const store = loadStore();
  const target = store.users.find((u) => u.id === userId);
  if (!target) {
    throw new Error('Пользователь не найден.');
  }
  const before = { ...target };
  if (newRole) {
    target.discordRole = newRole;
  }
  if (isSuspended !== undefined) {
    target.isSuspended = Boolean(isSuspended);
  }
  saveStore();
  return { before, after: { ...target } };
}

export async function getRolesTable() {
  const store = loadStore();
  return [...store.roles].sort((a, b) => a.id - b.id);
}

export async function updateRoleDiscordMapping(roleCode: string, discordRoleIds: string[]) {
  const store = loadStore();
  const cleanIds = discordRoleIds.map((s) => sanitizePlainText(s)).filter(Boolean);
  const role = store.roles.find((r) => r.code === roleCode);
  if (!role) {
    throw new Error('Роль не найдена.');
  }
  role.discordRoleIdsJson = JSON.stringify(cleanIds);
  saveStore();
  return { ...role };
}

// ============================================================================
// CUSTOMIZABLE CLAN ROLES (NAME, COLOR, ORDER)
// ============================================================================
export async function getClanRoles() {
  const store = loadStore();
  return [...store.clanRoles].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.id - b.id
  );
}

export async function saveClanRole(data: {
  id?: number;
  name: string;
  color: string;
  displayOrder: number;
}) {
  const store = loadStore();
  const cleanName = sanitizePlainText(data.name);
  const cleanColor = sanitizePlainText(data.color || '#e11d48');
  const order = Number(data.displayOrder) || 1;

  if (data.id) {
    const existing = store.clanRoles.find((r) => r.id === data.id);
    if (existing) {
      existing.name = cleanName;
      existing.color = cleanColor;
      existing.displayOrder = order;
      saveStore();
      return { ...existing };
    }
  }

  const created: ClanRoleRecord = {
    id: allocId(store),
    name: cleanName,
    color: cleanColor,
    displayOrder: order,
    createdAt: new Date().toISOString(),
  };
  store.clanRoles.push(created);
  saveStore();
  return created;
}

export async function deleteClanRole(id: number) {
  const store = loadStore();
  const idx = store.clanRoles.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const [removed] = store.clanRoles.splice(idx, 1);
  saveStore();
  return removed;
}

// ============================================================================
// CMS SETTINGS & CONTENT VERSIONS (SAVE DRAFT / PUBLISH / ROLLBACK)
// ============================================================================
export async function getCmsConfig(
  mode: 'published' | 'draft' = 'published'
): Promise<CmsSiteConfig> {
  try {
    const store = loadStore();
    const key = mode === 'draft' ? 'draft_cms' : 'published_cms';
    const row = store.siteSettings.find((s) => s.settingKey === key);
    if (row?.dataJson) {
      const parsed = JSON.parse(row.dataJson);
      return {
        ...DEFAULT_CMS_CONFIG,
        ...parsed,
        socials: { ...DEFAULT_CMS_CONFIG.socials, ...(parsed.socials || {}) },
        integrations: { ...DEFAULT_CMS_CONFIG.integrations, ...(parsed.integrations || {}) },
      };
    }
    return DEFAULT_CMS_CONFIG;
  } catch (error) {
    console.error('Error in getCmsConfig:', error);
    return DEFAULT_CMS_CONFIG;
  }
}

export async function saveCmsConfig(
  mode: 'draft' | 'publish',
  incomingConfig: CmsSiteConfig,
  actorName: string,
  versionNote?: string
) {
  const store = loadStore();
  const nowIso = new Date().toISOString();

  const cleanConfig: CmsSiteConfig = {
    ...DEFAULT_CMS_CONFIG,
    ...incomingConfig,
    siteTitle: sanitizePlainText(incomingConfig.siteTitle),
    seoDescription: sanitizePlainText(incomingConfig.seoDescription),
    heroTitle: sanitizePlainText(incomingConfig.heroTitle),
    heroSubtitle: sanitizePlainText(incomingConfig.heroSubtitle),
    heroDescription: sanitizePlainText(incomingConfig.heroDescription),
    ctaPrimaryText: sanitizePlainText(incomingConfig.ctaPrimaryText),
    ctaSecondaryText: sanitizePlainText(incomingConfig.ctaSecondaryText),
    footerText: sanitizePlainText(
      incomingConfig.footerText || DEFAULT_CMS_CONFIG.footerText
    ),
    aboutHistoryHtml: sanitizeHtmlServer(incomingConfig.aboutHistoryHtml),
    aboutRulesHtml: sanitizeHtmlServer(incomingConfig.aboutRulesHtml),
    aboutGoalsHtml: sanitizeHtmlServer(incomingConfig.aboutGoalsHtml),
  };

  const jsonStr = JSON.stringify(cleanConfig);

  const upsertSetting = (key: string) => {
    const existing = store.siteSettings.find((s) => s.settingKey === key);
    if (existing) {
      existing.dataJson = jsonStr;
      existing.updatedBy = actorName;
      existing.updatedAt = nowIso;
    } else {
      store.siteSettings.push({
        id: allocId(store),
        settingKey: key,
        dataJson: jsonStr,
        updatedBy: actorName,
        updatedAt: nowIso,
      });
    }
  };

  upsertSetting('draft_cms');

  if (mode === 'publish') {
    upsertSetting('published_cms');
    store.contentVersions.push({
      id: allocId(store),
      targetType: 'cms_settings',
      targetKey: 'published_cms',
      versionTitle: versionNote || `Публикация оформления и настроек (${actorName})`,
      snapshotJson: jsonStr,
      createdBy: actorName,
      createdAt: nowIso,
    });
  }

  saveStore();
  return cleanConfig;
}

export async function getContentVersionsList() {
  const store = loadStore();
  return [...store.contentVersions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
}

export async function rollbackCmsVersion(versionId: number, actorName: string) {
  const store = loadStore();
  const version = store.contentVersions.find((v) => v.id === versionId);
  if (!version) {
    throw new Error('Версия не найдена.');
  }
  const nowIso = new Date().toISOString();

  if (version.targetType === 'cms_settings') {
    for (const key of ['published_cms', 'draft_cms']) {
      const setting = store.siteSettings.find((s) => s.settingKey === key);
      if (setting) {
        setting.dataJson = version.snapshotJson;
        setting.updatedBy = actorName;
        setting.updatedAt = nowIso;
      }
    }
    saveStore();
    return { targetType: 'cms_settings', data: JSON.parse(version.snapshotJson) };
  }

  if (version.targetType === 'custom_page') {
    const snap = JSON.parse(version.snapshotJson);
    const page = store.customPages.find((p) => p.slug === version.targetKey);
    if (page) {
      page.title = snap.title;
      page.seoTitle = snap.seoTitle;
      page.seoDescription = snap.seoDescription;
      page.showInMenu = snap.showInMenu ?? true;
      page.blocksJson = snap.blocksJson;
      page.draftBlocksJson = snap.blocksJson;
      page.deletedAt = null;
      page.updatedAt = nowIso;
      saveStore();
    }
    return { targetType: 'custom_page', data: snap };
  }

  if (version.targetType === 'news') {
    const snap = JSON.parse(version.snapshotJson);
    const newsId = Number(version.targetKey);
    const item = store.clanNews.find((n) => n.id === newsId);
    if (item) {
      item.title = snap.title;
      item.content = snap.content;
      item.category = snap.category;
      item.coverUrl = snap.coverUrl;
      item.status = snap.status || 'published';
      item.isPinned = Boolean(snap.isPinned);
      item.deletedAt = null;
      saveStore();
    }
    return { targetType: 'news', data: snap };
  }

  return { targetType: version.targetType, data: null };
}

// ============================================================================
// ROSTER MEMBERS (WITH STATUS, DRAG-AND-DROP DISPLAY ORDER & JOIN DATE)
// ============================================================================
export async function getRosterMembers() {
  const store = loadStore();
  return [...store.rosterMembers].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.id - b.id
  );
}

export async function addRosterMember(data: {
  nickname: string;
  role: string;
  status?: string;
  avatarUrl: string;
  kdRatio: string;
  discordTag: string;
  bio: string;
  joinedDate?: string;
  displayOrder?: number;
  addedBy?: string;
}) {
  const store = loadStore();
  const nextOrder = data.displayOrder ?? store.rosterMembers.length + 1;
  const todayStr = new Date().toISOString().slice(0, 10);

  const member: RosterMemberRecord = {
    id: allocId(store),
    nickname: sanitizePlainText(data.nickname),
    role: sanitizePlainText(data.role || 'Участник'),
    status: data.status === 'inactive' ? 'inactive' : 'active',
    avatarUrl: data.avatarUrl || '/src/assets/images/curs_clan_crest_1791453830325.jpg',
    kdRatio: sanitizePlainText(data.kdRatio || '1.50'),
    discordTag: sanitizePlainText(data.discordTag),
    bio: sanitizePlainText(data.bio),
    joinedDate: data.joinedDate || todayStr,
    displayOrder: nextOrder,
    addedBy: data.addedBy || null,
    createdAt: new Date().toISOString(),
  };

  store.rosterMembers.push(member);
  saveStore();
  return member;
}

export async function updateRosterMember(
  id: number,
  payload: {
    nickname?: string;
    role?: string;
    status?: string;
    avatarUrl?: string;
    kdRatio?: string;
    discordTag?: string;
    bio?: string;
    joinedDate?: string;
    displayOrder?: number;
  }
) {
  const store = loadStore();
  const member = store.rosterMembers.find((m) => m.id === id);
  if (!member) {
    throw new Error('Участник не найден.');
  }
  const before = { ...member };

  if (payload.nickname !== undefined) member.nickname = sanitizePlainText(payload.nickname);
  if (payload.role !== undefined) member.role = sanitizePlainText(payload.role);
  if (payload.status !== undefined)
    member.status = payload.status === 'inactive' ? 'inactive' : 'active';
  if (payload.avatarUrl !== undefined) member.avatarUrl = payload.avatarUrl;
  if (payload.kdRatio !== undefined) member.kdRatio = sanitizePlainText(payload.kdRatio);
  if (payload.discordTag !== undefined)
    member.discordTag = sanitizePlainText(payload.discordTag);
  if (payload.bio !== undefined) member.bio = sanitizePlainText(payload.bio);
  if (payload.joinedDate !== undefined) member.joinedDate = payload.joinedDate;
  if (payload.displayOrder !== undefined) member.displayOrder = Number(payload.displayOrder);

  saveStore();
  return { before, after: { ...member } };
}

export async function reorderRosterMembers(orderedIds: number[]) {
  const store = loadStore();
  for (let i = 0; i < orderedIds.length; i++) {
    const member = store.rosterMembers.find((m) => m.id === orderedIds[i]);
    if (member) {
      member.displayOrder = i + 1;
    }
  }
  saveStore();
  return await getRosterMembers();
}

export async function deleteRosterMember(id: number) {
  const store = loadStore();
  const idx = store.rosterMembers.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const [removed] = store.rosterMembers.splice(idx, 1);
  saveStore();
  return removed;
}

// ============================================================================
// TOP PLAYERS LEADERBOARD (ADMIN CONFIGURABLE TOP LIST)
// ============================================================================
export async function getTopPlayers() {
  const store = loadStore();
  return [...store.topPlayers].sort(
    (a, b) => a.place - b.place || b.points - a.points || a.id - b.id
  );
}

export async function addTopPlayer(data: {
  place?: number;
  nickname: string;
  clanTag?: string;
  points: number;
  kdRatio: string;
  headshotPct: string;
  kills: number;
  playtimeHours: number;
  updatedBy?: string;
}) {
  const store = loadStore();
  const nextPlace = data.place && data.place > 0 ? data.place : store.topPlayers.length + 1;
  const rawNick = sanitizePlainText(data.nickname);
  const formattedNick = rawNick.includes('[') ? rawNick : `[CURS] ${rawNick}`;

  const created: TopPlayerRecord = {
    id: allocId(store),
    place: nextPlace,
    nickname: formattedNick,
    clanTag: sanitizePlainText(data.clanTag || 'CURS'),
    points: Math.max(0, Number(data.points) || 1000),
    kdRatio: sanitizePlainText(data.kdRatio || '1.50'),
    headshotPct: sanitizePlainText(data.headshotPct || '55.0%'),
    kills: Math.max(0, Number(data.kills) || 500),
    playtimeHours: Math.max(0, Number(data.playtimeHours) || 50),
    updatedBy: data.updatedBy || 'Администратор',
    createdAt: new Date().toISOString(),
  };

  store.topPlayers.push(created);
  saveStore();
  return created;
}

export async function updateTopPlayer(
  id: number,
  payload: {
    place?: number;
    nickname?: string;
    clanTag?: string;
    points?: number;
    kdRatio?: string;
    headshotPct?: string;
    kills?: number;
    playtimeHours?: number;
    updatedBy?: string;
  }
) {
  const store = loadStore();
  const player = store.topPlayers.find((p) => p.id === id);
  if (!player) {
    throw new Error('Игрок в топе не найден.');
  }

  if (payload.place !== undefined) player.place = Math.max(1, Number(payload.place));
  if (payload.nickname !== undefined) player.nickname = sanitizePlainText(payload.nickname);
  if (payload.clanTag !== undefined) player.clanTag = sanitizePlainText(payload.clanTag);
  if (payload.points !== undefined) player.points = Math.max(0, Number(payload.points));
  if (payload.kdRatio !== undefined) player.kdRatio = sanitizePlainText(payload.kdRatio);
  if (payload.headshotPct !== undefined)
    player.headshotPct = sanitizePlainText(payload.headshotPct);
  if (payload.kills !== undefined) player.kills = Math.max(0, Number(payload.kills));
  if (payload.playtimeHours !== undefined)
    player.playtimeHours = Math.max(0, Number(payload.playtimeHours));
  if (payload.updatedBy !== undefined) player.updatedBy = payload.updatedBy;

  saveStore();
  return { ...player };
}

export async function reorderTopPlayers(orderedIds: number[], actorName: string) {
  const store = loadStore();
  for (let i = 0; i < orderedIds.length; i++) {
    const player = store.topPlayers.find((p) => p.id === orderedIds[i]);
    if (player) {
      player.place = i + 1;
      player.updatedBy = actorName;
    }
  }
  saveStore();
  return await getTopPlayers();
}

export async function deleteTopPlayer(id: number) {
  const store = loadStore();
  const idx = store.topPlayers.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const [removed] = store.topPlayers.splice(idx, 1);
  saveStore();
  return removed;
}

export async function resetTopPlayersToDefault(actorName: string) {
  const store = loadStore();
  const nowIso = new Date().toISOString();
  store.topPlayers = DEFAULT_TOP_PLAYERS.map((p) => ({
    id: allocId(store),
    place: p.place,
    nickname: p.nickname,
    clanTag: p.clanTag,
    points: p.points,
    kdRatio: p.kdRatio,
    headshotPct: p.headshotPct,
    kills: p.kills,
    playtimeHours: p.playtimeHours,
    updatedBy: actorName,
    createdAt: nowIso,
  }));
  saveStore();
  return await getTopPlayers();
}

// ============================================================================
// APPLICATIONS (ONLY MEMBER ROLE, INTERNAL COMMENTS LOG, AUTO-ADD TO ROSTER)
// ============================================================================
export async function checkRecentApplication24h(discordLink: string, ipAddress: string) {
  const store = loadStore();
  const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
  return (
    store.applications.find((app) => {
      const createdMs = new Date(app.createdAt).getTime();
      return (
        createdMs >= sinceMs &&
        (app.discordLink === discordLink || app.ipAddress === ipAddress)
      );
    }) || null
  );
}

export async function getApplicationBan(uid: string) {
  const store = loadStore();
  return (store.applicationBans || []).find(b => b.uid === uid && (!b.until || new Date(b.until).getTime() > Date.now())) || null;
}

export async function setApplicationBan(data: { uid: string; email: string; until: string | null; reason: string; issuedBy: string }) {
  const store = loadStore();
  store.applicationBans = (store.applicationBans || []).filter(b => b.uid !== data.uid);
  store.applicationBans.push({ ...data, createdAt: new Date().toISOString() });
  saveStore();
}

export async function clearApplicationBan(uid: string) {
  const store = loadStore();
  store.applicationBans = (store.applicationBans || []).filter(b => b.uid !== uid);
  saveStore();
}

export async function getApplicationBans() {
  return (loadStore().applicationBans || []).filter(b => !b.until || new Date(b.until).getTime() > Date.now());
}

export async function getActiveApplicationForUser(uid: string) {
  return loadStore().applications.find(a => a.applicantUid === uid && (a.status === 'new' || a.status === 'reviewing' || a.status === 'pending')) || null;
}

export async function getApplications() {
  const store = loadStore();
  return [...store.applications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function createApplication(data: {
  nickname: string;
  age: number;
  discordLink: string;
  experience: string;
  weeklyHours: string;
  motivation: string;
  rulesAccepted: boolean;
  ipAddress: string;
  applicantUid: string;
  applicantEmail: string;
}) {
  const store = loadStore();
  const created: ApplicationRecord = {
    id: allocId(store),
    nickname: sanitizePlainText(data.nickname),
    age: data.age,
    discordLink: sanitizePlainText(data.discordLink),
    experience: sanitizePlainText(data.experience),
    weeklyHours: sanitizePlainText(data.weeklyHours),
    motivation: sanitizePlainText(data.motivation),
    rulesAccepted: data.rulesAccepted,
    role: 'Участник',
    kdRatio: '1.50',
    status: 'new',
    adminComment: null,
    commentsLogJson: '[]',
    ipAddress: data.ipAddress,
    reviewedBy: null,
    applicantUid: data.applicantUid,
    applicantEmail: data.applicantEmail,
    createdAt: new Date().toISOString(),
  };

  store.applications.push(created);
  saveStore();
  return created;
}

export async function updateApplicationAdmin(
  id: number,
  payload: {
    status?: 'new' | 'reviewing' | 'accepted' | 'rejected';
    adminComment?: string;
    reviewedBy: string;
    reviewerRole?: string;
  }
) {
  const store = loadStore();
  const current = store.applications.find((a) => a.id === id);
  if (!current) return null;

  const before = { ...current };
  current.reviewedBy = payload.reviewedBy;
  if (payload.status) {
    current.status = payload.status;
  }

  if (payload.adminComment && payload.adminComment.trim()) {
    const cleanComment = sanitizePlainText(payload.adminComment);
    current.adminComment = cleanComment;
    let existingComments: Array<{
      author: string;
      role: string;
      text: string;
      createdAt: string;
    }> = [];
    try {
      existingComments = JSON.parse(current.commentsLogJson || '[]');
    } catch {
      existingComments = [];
    }
    existingComments.push({
      author: payload.reviewedBy,
      role: payload.reviewerRole || 'admin',
      text: cleanComment,
      createdAt: new Date().toISOString(),
    });
    current.commentsLogJson = JSON.stringify(existingComments);
  }

  saveStore();
  return { before, after: { ...current } };
}

// ============================================================================
// CLAN NEWS (DRAFTS, SCHEDULED, PUBLISHED, PINNED, VERSIONS & 30-DAY TRASH)
// ============================================================================
export async function getClanNews(includeDrafts = false) {
  const store = loadStore();
  const nowIso = new Date().toISOString();
  let updatedAny = false;

  for (const item of store.clanNews) {
    if (
      !item.deletedAt &&
      item.status === 'scheduled' &&
      item.scheduledAt &&
      item.scheduledAt <= nowIso
    ) {
      item.status = 'published';
      updatedAny = true;
    }
  }
  if (updatedAny) {
    saveStore();
  }

  const active = store.clanNews
    .filter((n) => !n.deletedAt)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (includeDrafts) return active;
  return active.filter((n) => n.status === 'published');
}

export async function saveClanNewsItem(data: {
  id?: number;
  title: string;
  content: string;
  category: string;
  coverUrl?: string;
  status: 'draft' | 'scheduled' | 'published';
  isPinned?: boolean;
  publishedDate: string;
  scheduledAt?: string;
  authorName: string;
  driveFileUrl?: string;
}) {
  const store = loadStore();
  const nowIso = new Date().toISOString();
  const cleanPayload = {
    title: sanitizePlainText(data.title),
    content: sanitizeHtmlServer(data.content),
    category: sanitizePlainText(data.category || 'Новости клана'),
    coverUrl: data.coverUrl || null,
    status: data.status,
    isPinned: Boolean(data.isPinned),
    publishedDate: data.publishedDate || nowIso.slice(0, 10),
    scheduledAt: data.scheduledAt || null,
    authorName: data.authorName,
    driveFileUrl: data.driveFileUrl || null,
    deletedAt: null,
  };

  let savedRow: ClanNewsRecord;
  let beforeRow: ClanNewsRecord | null = null;

  if (data.id) {
    const existing = store.clanNews.find((n) => n.id === data.id);
    if (existing) {
      beforeRow = { ...existing };
      Object.assign(existing, cleanPayload);
      savedRow = { ...existing };
    } else {
      savedRow = {
        id: allocId(store),
        ...cleanPayload,
        createdAt: nowIso,
      };
      store.clanNews.push(savedRow);
    }
  } else {
    savedRow = {
      id: allocId(store),
      ...cleanPayload,
      createdAt: nowIso,
    };
    store.clanNews.push(savedRow);
  }

  store.contentVersions.push({
    id: allocId(store),
    targetType: 'news',
    targetKey: String(savedRow.id),
    versionTitle: `Новость «${savedRow.title}» [${savedRow.status}]`,
    snapshotJson: JSON.stringify(savedRow),
    createdBy: data.authorName,
    createdAt: nowIso,
  });

  saveStore();
  return { before: beforeRow, after: savedRow };
}

export async function deleteClanNews(id: number) {
  const store = loadStore();
  const item = store.clanNews.find((n) => n.id === id);
  if (!item) return null;
  item.deletedAt = new Date().toISOString();
  saveStore();
  return { ...item };
}

// ============================================================================
// CUSTOM PAGES (BLOCK BUILDER, DRAFT/PUBLISH, SEO, VERSIONS & 30-DAY TRASH)
// ============================================================================
export async function getCustomPages(includeDrafts = false) {
  const store = loadStore();
  const active = store.customPages
    .filter((p) => !p.deletedAt)
    .sort((a, b) => a.id - b.id);
  if (includeDrafts) return active;
  return active.filter((p) => p.status === 'published');
}

export async function saveCustomPage(data: {
  id?: number;
  slug: string;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  showInMenu?: boolean;
  status: 'draft' | 'published';
  blocksJson: string;
  authorName: string;
  saveMode?: 'draft_only' | 'publish';
}) {
  const store = loadStore();
  const nowIso = new Date().toISOString();
  const cleanSlug = data.slug
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const isPublish = data.saveMode === 'publish' || data.status === 'published';
  let beforePage: CustomPageRecord | null = null;
  let savedPage: CustomPageRecord;

  if (data.id) {
    const existing = store.customPages.find((p) => p.id === data.id);
    if (existing) {
      beforePage = { ...existing };
      existing.slug = existing.isSystem ? existing.slug : cleanSlug || `page-${data.id}`;
      existing.title = sanitizePlainText(data.title);
      existing.seoTitle = sanitizePlainText(data.seoTitle || data.title);
      existing.seoDescription = sanitizePlainText(data.seoDescription || '');
      existing.showInMenu = data.showInMenu ?? true;
      existing.draftBlocksJson = data.blocksJson;
      existing.deletedAt = null;
      existing.updatedAt = nowIso;

      if (isPublish) {
        existing.blocksJson = data.blocksJson;
        existing.status = 'published';
      } else if (!existing.isSystem) {
        existing.status = 'draft';
      }
      savedPage = { ...existing };
    } else {
      savedPage = {
        id: allocId(store),
        slug: cleanSlug || `page-${Date.now()}`,
        title: sanitizePlainText(data.title),
        seoTitle: sanitizePlainText(data.seoTitle || data.title),
        seoDescription: sanitizePlainText(data.seoDescription || ''),
        showInMenu: data.showInMenu ?? true,
        isSystem: false,
        status: isPublish ? 'published' : 'draft',
        blocksJson: data.blocksJson,
        draftBlocksJson: data.blocksJson,
        authorName: data.authorName,
        deletedAt: null,
        updatedAt: nowIso,
        createdAt: nowIso,
      };
      store.customPages.push(savedPage);
    }
  } else {
    savedPage = {
      id: allocId(store),
      slug: cleanSlug || `page-${Date.now()}`,
      title: sanitizePlainText(data.title),
      seoTitle: sanitizePlainText(data.seoTitle || data.title),
      seoDescription: sanitizePlainText(data.seoDescription || ''),
      showInMenu: data.showInMenu ?? true,
      isSystem: false,
      status: isPublish ? 'published' : 'draft',
      blocksJson: data.blocksJson,
      draftBlocksJson: data.blocksJson,
      authorName: data.authorName,
      deletedAt: null,
      updatedAt: nowIso,
      createdAt: nowIso,
    };
    store.customPages.push(savedPage);
  }

  store.contentVersions.push({
    id: allocId(store),
    targetType: 'custom_page',
    targetKey: savedPage.slug,
    versionTitle: `Страница «${savedPage.title}» (${isPublish ? 'Опубликовано' : 'Черновик'})`,
    snapshotJson: JSON.stringify(savedPage),
    createdBy: data.authorName,
    createdAt: nowIso,
  });

  saveStore();
  return { before: beforePage, after: savedPage };
}

export async function deleteCustomPage(id: number) {
  const store = loadStore();
  const existing = store.customPages.find((p) => p.id === id);
  if (!existing) return null;
  if (existing.isSystem) {
    throw new Error('Системные страницы (Главная, О клане, Правила) нельзя удалить.');
  }
  existing.deletedAt = new Date().toISOString();
  saveStore();
  return { ...existing };
}

// ============================================================================
// MEDIA LIBRARY (DRAG-AND-DROP, RENAME, USAGE CHECK, 30-DAY TRASH)
// ============================================================================
export async function getMediaFiles() {
  const store = loadStore();
  return store.mediaFiles
    .filter((m) => !m.deletedAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 60);
}

export async function addMediaFile(data: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  thumbnailUrl?: string;
  uploadedBy: string;
}) {
  const store = loadStore();
  const created: MediaFileRecord = {
    id: allocId(store),
    fileName: sanitizePlainText(data.fileName),
    mimeType: data.mimeType,
    sizeBytes: data.sizeBytes,
    dataUrl: data.dataUrl,
    thumbnailUrl: data.thumbnailUrl || data.dataUrl,
    uploadedBy: data.uploadedBy,
    deletedAt: null,
    createdAt: new Date().toISOString(),
  };
  store.mediaFiles.push(created);
  saveStore();
  return created;
}

export async function renameMediaFile(id: number, newFileName: string) {
  const store = loadStore();
  const file = store.mediaFiles.find((m) => m.id === id);
  if (!file) {
    throw new Error('Медиафайл не найден.');
  }
  file.fileName = sanitizePlainText(newFileName).slice(0, 80);
  saveStore();
  return { ...file };
}

export async function checkMediaUsage(dataUrl: string): Promise<string[]> {
  const usedIn: string[] = [];
  if (!dataUrl) return usedIn;
  try {
    const cms = await getCmsConfig('published');
    if (
      cms.logoUrl === dataUrl ||
      cms.faviconUrl === dataUrl ||
      cms.heroBgUrl === dataUrl
    ) {
      usedIn.push('Оформление сайта / Главная');
    }

    const pages = await getCustomPages(true);
    for (const p of pages) {
      if (p.blocksJson.includes(dataUrl) || p.draftBlocksJson.includes(dataUrl)) {
        usedIn.push(`Страница «${p.title}»`);
      }
    }

    const newsList = await getClanNews(true);
    for (const n of newsList) {
      if (n.coverUrl === dataUrl || n.content.includes(dataUrl)) {
        usedIn.push(`Новость «${n.title}»`);
      }
    }

    const roster = await getRosterMembers();
    for (const m of roster) {
      if (m.avatarUrl === dataUrl) {
        usedIn.push(`Аватар игрока ${m.nickname}`);
      }
    }
  } catch {
    // Ignore check errors
  }
  return usedIn;
}

export async function deleteMediaFile(id: number) {
  const store = loadStore();
  const file = store.mediaFiles.find((m) => m.id === id);
  if (!file) return null;
  file.deletedAt = new Date().toISOString();
  saveStore();
  return { ...file };
}

// ============================================================================
// 30-DAY TRASH BIN (PAGES, NEWS, MEDIA FILES)
// ============================================================================
export async function getTrashBinItems() {
  const store = loadStore();
  const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const isRecentDeleted = (deletedAt: Date | string | null) => {
    if (!deletedAt) return false;
    return new Date(deletedAt).getTime() >= thirtyDaysAgoMs;
  };

  return {
    pages: store.customPages.filter((p) => isRecentDeleted(p.deletedAt)),
    news: store.clanNews.filter((n) => isRecentDeleted(n.deletedAt)),
    media: store.mediaFiles.filter((m) => isRecentDeleted(m.deletedAt)),
  };
}

export async function restoreFromTrash(type: 'page' | 'news' | 'media', id: number) {
  const store = loadStore();
  if (type === 'page') {
    const item = store.customPages.find((p) => p.id === id);
    if (item) {
      item.deletedAt = null;
      saveStore();
      return { ...item };
    }
  }
  if (type === 'news') {
    const item = store.clanNews.find((n) => n.id === id);
    if (item) {
      item.deletedAt = null;
      saveStore();
      return { ...item };
    }
  }
  if (type === 'media') {
    const item = store.mediaFiles.find((m) => m.id === id);
    if (item) {
      item.deletedAt = null;
      saveStore();
      return { ...item };
    }
  }
  return null;
}

// ============================================================================
// IMMUTABLE AUDIT LOGS & ADMIN NOTES
// ============================================================================
export async function getAdminNotes() {
  const store = loadStore();
  return [...store.adminNotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function createAdminNote(data: {
  authorName: string;
  authorRole: string;
  noteText: string;
  priority: string;
}) {
  const store = loadStore();
  const created: AdminNoteRecord = {
    id: allocId(store),
    authorName: data.authorName,
    authorRole: data.authorRole,
    noteText: sanitizePlainText(data.noteText),
    priority: data.priority,
    createdAt: new Date().toISOString(),
  };
  store.adminNotes.push(created);
  saveStore();
  return created;
}

export async function deleteAdminNote(id: number) {
  const store = loadStore();
  const idx = store.adminNotes.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  const [removed] = store.adminNotes.splice(idx, 1);
  saveStore();
  return removed;
}

export async function getAuditLogs() {
  const store = loadStore();
  return [...store.auditLogs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 150);
}

export async function createAuditLog(data: {
  actorName: string;
  actorRole: string;
  section?: string;
  action: string;
  details: string;
  ipAddress?: string;
  diffJson?: string;
}) {
  const store = loadStore();
  const created: AuditLogRecord = {
    id: allocId(store),
    actorName: data.actorName,
    actorRole: data.actorRole,
    section: data.section || 'system',
    action: data.action,
    details: data.details,
    ipAddress: data.ipAddress || '127.0.0.1',
    diffJson: data.diffJson || null,
    createdAt: new Date().toISOString(),
  };
  store.auditLogs.push(created);
  saveStore();
  return created;
}
