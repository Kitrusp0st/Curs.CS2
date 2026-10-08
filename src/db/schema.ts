import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Таблица ролей админ-панели и привязки Discord Role ID
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // 'leader' | 'deputy' | 'moderator' | 'member'
  name: text('name').notNull(),
  discordRoleIdsJson: text('discord_role_ids_json').notNull().default('[]'),
  permissionsJson: text('permissions_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Таблица пользователей и администраторов (с возможностью временного отключения доступа)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  discordId: text('discord_id'),
  discordRole: text('discord_role').notNull().default('member'),
  isSuspended: boolean('is_suspended').notNull().default(false),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Таблица настраиваемых игровых ролей клана (название, цвет, порядок)
export const clanRoles = pgTable('clan_roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#e11d48'),
  displayOrder: integer('display_order').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Таблица заявок в клан (только на роль Участника)
export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  nickname: text('nickname').notNull(),
  age: integer('age').notNull(),
  discordLink: text('discord_link').notNull(),
  experience: text('experience').notNull(),
  weeklyHours: text('weekly_hours').notNull().default('15'),
  motivation: text('motivation').notNull().default('Хочу играть в команде CURS'),
  rulesAccepted: boolean('rules_accepted').notNull().default(true),
  role: text('role').notNull().default('Участник'),
  kdRatio: text('kd_ratio').notNull().default('1.50'),
  status: text('status').notNull().default('new'), // 'new' | 'reviewing' | 'accepted' | 'rejected'
  adminComment: text('admin_comment'),
  commentsLogJson: text('comments_log_json').notNull().default('[]'),
  ipAddress: text('ip_address'),
  reviewedBy: text('reviewed_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Таблица участников состава (аватар, ник, роль, дата вступления, статус активен/неактивен, порядок)
export const rosterMembers = pgTable('roster_members', {
  id: serial('id').primaryKey(),
  nickname: text('nickname').notNull(),
  role: text('role').notNull().default('Участник'),
  status: text('status').notNull().default('active'), // 'active' | 'inactive'
  avatarUrl: text('avatar_url').notNull(),
  kdRatio: text('kd_ratio').notNull().default('1.50'),
  discordTag: text('discord_tag').notNull(),
  bio: text('bio').notNull(),
  joinedDate: text('joined_date').notNull().default('2026-10-08'),
  displayOrder: integer('display_order').notNull().default(0),
  addedBy: text('added_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5b. Таблица игроков Топа клана (настраиваемый рейтинг через админ-панель)
export const topPlayers = pgTable('top_players', {
  id: serial('id').primaryKey(),
  place: integer('place').notNull().default(1),
  nickname: text('nickname').notNull(),
  clanTag: text('clan_tag').notNull().default('CURS'),
  points: integer('points').notNull().default(3000),
  kdRatio: text('kd_ratio').notNull().default('1.75'),
  headshotPct: text('headshot_pct').notNull().default('58.0%'),
  kills: integer('kills').notNull().default(1500),
  playtimeHours: integer('playtime_hours').notNull().default(80),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Таблица новостей (черновик, запланировано, опубликовано, закрепление, обложка, корзина 30 дней)
export const clanNews = pgTable('clan_news', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull(),
  coverUrl: text('cover_url'),
  status: text('status').notNull().default('published'), // 'draft' | 'scheduled' | 'published'
  isPinned: boolean('is_pinned').notNull().default(false),
  publishedDate: text('published_date').notNull().default('2026-10-08'),
  scheduledAt: text('scheduled_at'),
  authorName: text('author_name').notNull(),
  driveFileUrl: text('drive_file_url'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Таблица настроек сайта, меню, оформления и интеграций (CMS)
export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(), // 'published_cms' | 'draft_cms'
  dataJson: text('data_json').notNull(),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 8. Таблица страниц сайта (Главная, О клане, Правила и пользовательские страницы — конструктор блоков)
export const customPages = pgTable('custom_pages', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(), // 'home' | 'about' | 'rules' | custom slug
  title: text('title').notNull(),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  showInMenu: boolean('show_in_menu').notNull().default(true),
  isSystem: boolean('is_system').notNull().default(false),
  status: text('status').notNull().default('published'), // 'draft' | 'published'
  blocksJson: text('blocks_json').notNull().default('[]'),
  draftBlocksJson: text('draft_blocks_json').notNull().default('[]'),
  authorName: text('author_name').notNull(),
  deletedAt: timestamp('deleted_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 9. Таблица медиатеки (сжатые изображения, миниатюры и корзина 30 дней)
export const mediaFiles = pgTable('media_files', {
  id: serial('id').primaryKey(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  dataUrl: text('data_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  uploadedBy: text('uploaded_by').notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. Таблица истории версий контента (для страниц, новостей и настроек с откатом и сравнением)
export const contentVersions = pgTable('content_versions', {
  id: serial('id').primaryKey(),
  targetType: text('target_type').notNull(), // 'cms_settings' | 'custom_page' | 'news'
  targetKey: text('target_key').notNull(),
  versionTitle: text('version_title').notNull(),
  snapshotJson: text('snapshot_json').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 11. Неизменяемая таблица журнала действий (пользователь, действие, раздел, время, IP, было/стало)
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  section: text('section').notNull().default('system'),
  action: text('action').notNull(),
  details: text('details').notNull(),
  ipAddress: text('ip_address').notNull().default('127.0.0.1'),
  diffJson: text('diff_json'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const adminNotes = pgTable('admin_notes', {
  id: serial('id').primaryKey(),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role').notNull(),
  noteText: text('note_text').notNull(),
  priority: text('priority').notNull().default('normal'),
  createdAt: timestamp('created_at').defaultNow(),
});
