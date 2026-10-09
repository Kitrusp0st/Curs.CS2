import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  ensureInitialSeed,
  getOrCreateUser,
  getAllUsers,
  inviteGoogleAdmin,
  updateUserRole,
  getRolesTable,
  updateRoleDiscordMapping,
  getClanRoles,
  saveClanRole,
  deleteClanRole,
  getCmsConfig,
  saveCmsConfig,
  getContentVersionsList,
  rollbackCmsVersion,
  getRosterMembers,
  addRosterMember,
  updateRosterMember,
  reorderRosterMembers,
  deleteRosterMember,
  getTopPlayers,
  addTopPlayer,
  updateTopPlayer,
  reorderTopPlayers,
  deleteTopPlayer,
  resetTopPlayersToDefault,
  checkRecentApplication24h,
  getApplicationBan,
  getApplicationBans,
  getActiveApplicationForUser,
  setApplicationBan,
  clearApplicationBan,
  getApplications,
  createApplication,
  updateApplicationAdmin,
  getClanNews,
  saveClanNewsItem,
  deleteClanNews,
  getCustomPages,
  saveCustomPage,
  deleteCustomPage,
  getMediaFiles,
  addMediaFile,
  renameMediaFile,
  checkMediaUsage,
  deleteMediaFile,
  getTrashBinItems,
  restoreFromTrash,
  getAdminNotes,
  createAdminNote,
  deleteAdminNote,
  getAuditLogs,
  createAuditLog,
} from './src/db/queries.ts';
import {
  AuthRequest,
  AdminRole,
  resolveAuthContext,
  requireRole,
  requireAuth,
  signAdminSessionCookie,
} from './src/middleware/auth.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '8mb' }));
app.use(cookieParser());

// Prevent search engines from indexing /admin and /api/admin routes
app.use(['/admin', '/api/admin'], (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
});

let seedInitialized = false;
async function initSeedOnce() {
  if (!seedInitialized) {
    seedInitialized = true;
    await ensureInitialSeed();
  }
}

function getClientIp(req: Request): string {
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.ip ||
    '127.0.0.1'
  );
}

export function maskSecretValue(val?: string): string {
  if (!val || val.trim().length === 0) return '';
  const clean = val.trim();
  if (clean.length <= 12) return '••••••••';
  return `${clean.slice(0, 8)}••••••••${clean.slice(-4)}`;
}

// Rate limiter per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const rateLimiter = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const key = `${ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Слишком много запросов. Пожалуйста, подождите минуту и попробуйте снова.',
      });
    }

    record.count += 1;
    next();
  };
};

// CSRF verification for state-mutating requests
const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
    const customHeader = req.headers['x-curs-csrf'];
    if (customHeader !== 'curs-verified-client') {
      return res.status(403).json({ error: 'Ошибка проверки CSRF-токена запроса.' });
    }
  }
  next();
};

// Helper: Send Discord Webhook on new application
async function sendDiscordApplicationWebhook(application: {
  id: number;
  nickname: string;
  age: number;
  discordLink: string;
  weeklyHours: string;
  motivation: string;
}) {
  try {
    const cms = await getCmsConfig('published');
    const webhookUrl =
      cms.integrations?.discordWebhookUrl || process.env.DISCORD_ADMIN_WEBHOOK_URL;
    if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return;
    }

    const appBaseUrl =
      process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
        ? process.env.APP_URL.replace(/\/$/, '')
        : 'https://ais-pre-do24evwwqilmq37crv4z7k-259283500817.asia-southeast1.run.app';

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'CURS Recruitment Bot',
        embeds: [
          {
            title: `Новая заявка в клан CURS #${application.id} (на роль Участника)`,
            color: 0xe11d48,
            fields: [
              { name: 'Игровой ник', value: application.nickname, inline: true },
              { name: 'Возраст', value: `${application.age} лет`, inline: true },
              { name: 'Часов в неделю', value: `${application.weeklyHours} ч/нед`, inline: true },
              { name: 'Discord', value: application.discordLink, inline: false },
              {
                name: 'Почему хочет в клан',
                value: application.motivation.slice(0, 300),
                inline: false,
              },
              {
                name: 'Ссылка на заявку в админ-панели',
                value: `[Открыть заявку #${application.id} в /admin](${appBaseUrl}/admin)`,
                inline: false,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (err) {
    console.warn('Discord application webhook warning:', err);
  }
}

// Helper: Send Discord Webhook on news publication
async function sendDiscordNewsWebhook(newsItem: {
  id: number;
  title: string;
  category: string;
  content: string;
  authorName: string;
  coverUrl?: string | null;
}) {
  try {
    const cms = await getCmsConfig('published');
    const webhookUrl =
      cms.integrations?.discordNewsWebhookUrl ||
      process.env.DISCORD_NEWS_WEBHOOK_URL ||
      cms.integrations?.discordWebhookUrl;
    if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return;
    }

    const plainExcerpt = newsItem.content.replace(/<[^>]+>/g, '').slice(0, 350);

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'CURS Clan News',
        embeds: [
          {
            title: `📢 ${newsItem.title}`,
            description: plainExcerpt,
            color: 0xe11d48,
            fields: [
              { name: 'Категория', value: newsItem.category, inline: true },
              { name: 'Автор', value: newsItem.authorName, inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (err) {
    console.warn('Discord news webhook warning:', err);
  }
}

// ============================================================================
// 1. DISCORD SERVER LIVE WIDGET & BOT PRESENCE API
// ============================================================================
interface DiscordStatusCache {
  guildName: string;
  onlineCount: number;
  totalMembers: number;
  inviteUrl: string;
  voiceActiveCount: number;
  onlineMembersSample: Array<{ id: string; username: string; status: string; game?: string }>;
  updatedAt: number;
  isLiveApi: boolean;
}

let discordCache: DiscordStatusCache = {
  guildName: 'CURS · Discord',
  onlineCount: 0,
  totalMembers: 0,
  inviteUrl: process.env.DISCORD_INVITE_URL || 'https://discord.gg/5QwH43Wd9',
  voiceActiveCount: 0,
  onlineMembersSample: [],
  updatedAt: 0,
  isLiveApi: false,
};

app.get('/api/discord/status', async (_req: Request, res: Response) => {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const now = Date.now();
  if (discordCache.isLiveApi && now - discordCache.updatedAt < 45000) {
    return res.json(discordCache);
  }
  if (!guildId || !botToken) {
    return res.json({ ...discordCache, isLiveApi: false, updatedAt: now });
  }
  try {
    const guildRes = await fetch(
      `https://discord.com/api/v10/guilds/${encodeURIComponent(guildId)}?with_counts=true`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!guildRes.ok) throw new Error(`Discord API HTTP ${guildRes.status}`);
    const guildData: any = await guildRes.json();
    discordCache = {
      guildName: guildData.name || 'CURS · Discord',
      onlineCount: guildData.approximate_presence_count ?? 0,
      totalMembers: guildData.approximate_member_count ?? 0,
      inviteUrl: process.env.DISCORD_INVITE_URL || 'https://discord.gg/5QwH43Wd9',
      // REST guild endpoint does not expose live voice states.
      voiceActiveCount: 0,
      onlineMembersSample: [],
      updatedAt: now,
      isLiveApi: true,
    };
    res.json(discordCache);
  } catch (error) {
    console.error('Discord status request failed:', error);
    res.json({ ...discordCache, isLiveApi: false, updatedAt: now });
  }
});

// ============================================================================
// 2. CRAZYPUB CLAN TOP LEADERBOARD PARSER & DATABASE CONFIGURABLE CACHE
// ============================================================================
export interface CrazyPubLeaderboardEntry {
  id?: number;
  place: number;
  nickname: string;
  clanTag: string;
  points: number;
  kdRatio: string;
  headshotPct: string;
  kills: number;
  playtimeHours: number;
}

interface CrazyPubCache {
  entries: CrazyPubLeaderboardEntry[];
  updatedAt: number;
  sourceUrl: string;
  mode: 'api' | 'parser' | 'database' | 'cached_snapshot';
}

let crazyPubCache: CrazyPubCache = {
  sourceUrl: process.env.CRAZYPUB_SOURCE_URL || 'https://crazypub.cs2.ru/top',
  updatedAt: Date.now(),
  mode: 'database',
  entries: [],
};

async function refreshCrazyPubLeaderboard(): Promise<CrazyPubCache> {
  const cms = await getCmsConfig('published');
  const apiUrl = cms.integrations?.crazypubApiUrl || process.env.CRAZYPUB_API_URL;
  const pageUrl = cms.integrations?.crazypubSourceUrl || process.env.CRAZYPUB_SOURCE_URL;

  if (pageUrl) {
    crazyPubCache.sourceUrl = pageUrl;
  }

  if (apiUrl && apiUrl.startsWith('http')) {
    try {
      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(4500) });
      if (response.ok) {
        const json: any = await response.json();
        if (Array.isArray(json.players) && json.players.length > 0) {
          crazyPubCache = {
            entries: json.players.map((p: any, idx: number) => ({
              place: p.place || idx + 1,
              nickname: p.nickname || p.name,
              clanTag: p.clan || 'CURS',
              points: Number(p.points || p.score || 0),
              kdRatio: String(p.kd || '1.50'),
              headshotPct: String(p.hs || '50%'),
              kills: Number(p.kills || 0),
              playtimeHours: Number(p.hours || 0),
            })),
            updatedAt: Date.now(),
            sourceUrl: pageUrl || apiUrl,
            mode: 'api',
          };
          return crazyPubCache;
        }
      }
    } catch {
      // Fallback
    }
  }

  if (pageUrl && pageUrl.startsWith('http') && !pageUrl.includes('crazypub.cs2.ru')) {
    try {
      const htmlRes = await fetch(pageUrl, {
        headers: { 'User-Agent': 'CURS-Clan-Portal-Bot/1.0' },
        signal: AbortSignal.timeout(4500),
      });
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const $ = cheerio.load(html);
        const parsedEntries: CrazyPubLeaderboardEntry[] = [];

        $('table tbody tr').each((index, el) => {
          const cols = $(el).find('td');
          if (cols.length >= 4) {
            const nickname = $(cols[1]).text().trim();
            const points = parseInt($(cols[2]).text().replace(/\D/g, ''), 10) || 1000;
            const kdRatio = $(cols[3]).text().trim() || '1.50';
            if (nickname) {
              parsedEntries.push({
                place: index + 1,
                nickname,
                clanTag: 'CURS',
                points,
                kdRatio,
                headshotPct: cols.length >= 5 ? $(cols[4]).text().trim() : '55.0%',
                kills: 1200,
                playtimeHours: 80,
              });
            }
          }
        });

        if (parsedEntries.length > 0) {
          crazyPubCache = {
            entries: parsedEntries,
            updatedAt: Date.now(),
            sourceUrl: pageUrl,
            mode: 'parser',
          };
          return crazyPubCache;
        }
      }
    } catch {
      // Fallback to database top players
    }
  }

  const dbTop = await getTopPlayers();
  crazyPubCache = {
    entries: dbTop.map((p, index) => ({
      id: p.id,
      place: p.place || index + 1,
      nickname: p.nickname,
      clanTag: p.clanTag,
      points: p.points,
      kdRatio: p.kdRatio,
      headshotPct: p.headshotPct,
      kills: p.kills,
      playtimeHours: p.playtimeHours,
    })),
    updatedAt: Date.now(),
    sourceUrl: pageUrl || 'https://crazypub.cs2.ru/top',
    mode: 'database',
  };

  return crazyPubCache;
}

app.get('/api/crazypub/leaderboard', async (req: Request, res: Response) => {
  await initSeedOnce();
  const cms = await getCmsConfig('published');
  const ttlMs = Math.max(1, Number(cms.integrations?.cacheTtlMinutes || 6)) * 60 * 1000;
  const leaderboardMode = cms.integrations?.leaderboardMode || 'database';
  const forceRefresh = req.query.refresh === '1';

  if (leaderboardMode === 'database' && !forceRefresh) {
    const dbTop = await getTopPlayers();
    return res.json({
      entries: dbTop.map((p, index) => ({
        id: p.id,
        place: p.place || index + 1,
        nickname: p.nickname,
        clanTag: p.clanTag,
        points: p.points,
        kdRatio: p.kdRatio,
        headshotPct: p.headshotPct,
        kills: p.kills,
        playtimeHours: p.playtimeHours,
      })),
      updatedAt: crazyPubCache.updatedAt || Date.now(),
      updatedMinutesAgo: Math.max(
        0,
        Math.floor((Date.now() - (crazyPubCache.updatedAt || Date.now())) / 60000)
      ),
      sourceUrl: cms.integrations?.crazypubSourceUrl || crazyPubCache.sourceUrl,
      mode: 'database',
    });
  }

  if (forceRefresh || Date.now() - crazyPubCache.updatedAt > ttlMs || crazyPubCache.entries.length === 0) {
    await refreshCrazyPubLeaderboard();
  }

  const updatedMinutesAgo = Math.max(
    0,
    Math.floor((Date.now() - crazyPubCache.updatedAt) / 60000)
  );

  res.json({
    ...crazyPubCache,
    updatedMinutesAgo,
  });
});

// ============================================================================
// 3. DISCORD OAUTH2 POPUP FLOW + DB ROLE MAPPING
// ============================================================================
function getCallbackRedirectUri(req: Request): string {
  const baseUrl =
    process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL.replace(/\/$/, '')
      : `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/auth/callback`;
}

app.get('/api/auth/discord/url', (req: Request, res: Response) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = (req.query.redirectUri as string) || getCallbackRedirectUri(req);

  if (!clientId || clientId === 'YOUR_DISCORD_CLIENT_ID') {
    return res.status(400).json({
      error:
        'DISCORD_CLIENT_ID не задан в переменных окружения (.env). Вы можете войти как Лидер через Google-аккаунт или указать ключи Discord OAuth2.',
      missingConfig: true,
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email guilds.members.read',
  });

  res.json({
    url: `https://discord.com/api/oauth2/authorize?${params.toString()}`,
  });
});

const discordCallbackHandler = async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!code || !clientId || !clientSecret) {
    return res.status(400).send('Отсутствует код авторизации или настройки Discord OAuth2.');
  }

  try {
    await initSeedOnce();
    const redirectUri = getCallbackRedirectUri(req);
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error('Не удалось обменять код Discord OAuth2 на токен.');
    }

    const tokenData: any = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const discordUser: any = await userRes.json();

    // Load DB Discord Role mappings configured by Leader in Admin Panel
    const dbRoles = await getRolesTable();
    const getMappedIds = (code: string, envFallback?: string): string[] => {
      const row = dbRoles.find((r) => r.code === code);
      let fromDb: string[] = [];
      try {
        fromDb = row ? JSON.parse(row.discordRoleIdsJson || '[]') : [];
      } catch {
        fromDb = [];
      }
      const fromEnv = (envFallback || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return Array.from(new Set([...fromDb, ...fromEnv]));
    };

    const leaderIds = (process.env.DISCORD_LEADER_IDS || '').split(',').map((s) => s.trim());
    const leaderRoles = getMappedIds('leader', process.env.DISCORD_LEADER_ROLE_IDS);
    const deputyRoles = getMappedIds('deputy', process.env.DISCORD_DEPUTY_ROLE_IDS);
    const modRoles = getMappedIds('moderator', process.env.DISCORD_MODERATOR_ROLE_IDS);

    let determinedRole: AdminRole = 'moderator';

    if (leaderIds.includes(discordUser.id)) {
      determinedRole = 'leader';
    } else if (guildId && guildId !== 'YOUR_DISCORD_GUILD_ID') {
      const memberRes = await fetch(
        `https://discord.com/api/users/@me/guilds/${guildId}/member`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (memberRes.ok) {
        const memberData: any = await memberRes.json();
        const userRoles: string[] = memberData.roles || [];
        if (userRoles.some((r) => leaderRoles.includes(r))) determinedRole = 'leader';
        else if (userRoles.some((r) => deputyRoles.includes(r))) determinedRole = 'deputy';
        else if (userRoles.some((r) => modRoles.includes(r))) determinedRole = 'moderator';
        else determinedRole = 'member';
      }
    }

    const uid = `discord:${discordUser.id}`;
    const email = discordUser.email || `${discordUser.username}@discord.user`;
    const displayName = discordUser.global_name || discordUser.username;

    const dbUser = await getOrCreateUser(uid, email, displayName, discordUser.id, determinedRole);
    const sessionPayload = {
      uid,
      email: dbUser.email,
      displayName: dbUser.displayName || displayName,
      role: (dbUser.discordRole as AdminRole) || determinedRole,
      authProvider: 'discord' as const,
      isSuspended: Boolean(dbUser.isSuspended),
    };

    const signedCookie = signAdminSessionCookie(sessionPayload);
    res.cookie('curs_admin_session', signedCookie, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 2 * 60 * 60 * 1000, // 2-hour inactivity limit
    });

    res.send(`
      <!doctype html>
      <html lang="ru">
        <body style="background:#09090b;color:#f4f4f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/admin';
            }
          </script>
          <p>Авторизация Discord успешна. Окно закроется автоматически...</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Discord OAuth callback error:', error);
    res.status(500).send('Ошибка авторизации через Discord OAuth2.');
  }
};

app.get(['/auth/callback', '/auth/callback/'], discordCallbackHandler);

app.get('/api/auth/me', async (req: AuthRequest, res: Response) => {
  await initSeedOnce();
  const ctx = await resolveAuthContext(req, res);
  if (!ctx) {
    return res.json({ authenticated: false, user: null });
  }
  return res.json({ authenticated: true, user: ctx });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('curs_admin_session', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.json({ ok: true });
});

// ============================================================================
// 4. PUBLIC SITE DATA & APPLICATION SUBMISSION (ONLY MEMBER ROLE + 1 PER 24H)
// ============================================================================
app.get('/api/public/data', async (_req: Request, res: Response) => {
  try {
    await initSeedOnce();
    const [cms, roster, clanRolesList, topPlayersList, news, pages] = await Promise.all([
      getCmsConfig('published'),
      getRosterMembers(),
      getClanRoles(),
      getTopPlayers(),
      getClanNews(false),
      getCustomPages(false),
    ]);

    // Never expose raw webhook URLs to public visitors
    const safeCms = {
      ...cms,
      integrations: {
        ...cms.integrations,
        discordWebhookUrl: cms.integrations?.discordWebhookUrl ? '••••••••' : '',
        discordNewsWebhookUrl: cms.integrations?.discordNewsWebhookUrl ? '••••••••' : '',
      },
    };

    res.json({
      cms: safeCms,
      roster,
      clanRoles: clanRolesList,
      topPlayers: topPlayersList,
      news,
      customPages: pages,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Ошибка загрузки контента сайта' });
  }
});

// Signed checkbox challenge: free lightweight check; rate limiting and account limits provide additional protection.
app.get('/api/captcha/challenge', (_req: Request, res: Response) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return res.status(503).json({ error: 'Проверка недоступна.' });
  const expires = Date.now() + 10 * 60 * 1000;
  const nonce = randomInt(0, 2147483647);
  const payload = `${expires}:${nonce}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  res.setHeader('Cache-Control', 'no-store');
  res.json({ token: `${payload}:${signature}` });
});

function validCaptcha(token: unknown, answer: unknown): boolean {
  if (answer !== true || typeof token !== 'string' || !/^\d+:\d+:[a-f0-9]{64}$/.test(token)) return false;
  const [expiresText, nonce, signature] = token.split(':');
  const expires = Number(expiresText);
  if (expires < Date.now() || expires > Date.now() + 10 * 60 * 1000) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(`${expiresText}:${nonce}`).digest('hex'), 'hex');
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

app.post(
  '/api/applications',
  rateLimiter(6, 60 * 1000),
  csrfProtection,
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      if (req.adminContext?.authProvider !== 'firebase') return res.status(403).json({ error: 'Для подачи заявки войдите через Google.' });
      await initSeedOnce();
      const {
        nickname,
        age,
        discordLink,
        experience,
        weeklyHours,
        motivation,
        rulesAccepted,
        captchaToken,
        captchaAnswer,
      } = req.body;

      const ipAddress = getClientIp(req);
      const applicant = req.adminContext!;
      const ban = await getApplicationBan(applicant.uid);
      if (ban) return res.status(403).json({ error: ban.until ? `Подача заявок заблокирована до ${new Date(ban.until).toLocaleString('ru-RU')}. Причина: ${ban.reason}` : `Подача заявок заблокирована бессрочно. Причина: ${ban.reason}` });
      const active = await getActiveApplicationForUser(applicant.uid);
      if (active) return res.status(409).json({ error: `У вас уже есть активная заявка #${active.id}. Дождитесь решения администрации.` });

      if (!validCaptcha(captchaToken, captchaAnswer)) {
        return res
          .status(400)
          .json({ error: 'Поставьте галочку «Я не робот». Если проверка устарела, обновите страницу.' });
      }

      if (!rulesAccepted) {
        return res
          .status(400)
          .json({ error: 'Необходимо подтвердить согласие с правилами клана CURS.' });
      }

      const cleanNick = String(nickname || '').trim();
      const parsedAge = Number(age);
      const cleanDiscord = String(discordLink || '').trim();
      const cleanExp = String(experience || '').trim();
      const cleanHours = String(weeklyHours || '').trim();
      const cleanMotivation = String(motivation || '').trim();

      if (cleanNick.length < 2 || cleanNick.length > 32) {
        return res.status(400).json({ error: 'Игровой ник должен быть от 2 до 32 символов.' });
      }
      if (isNaN(parsedAge) || parsedAge < 12 || parsedAge > 65) {
        return res.status(400).json({ error: 'Укажите корректный возраст (от 12 до 65 лет).' });
      }
      if (cleanDiscord.length < 3) {
        return res.status(400).json({ error: 'Укажите ваш ник или ссылку в Discord.' });
      }
      if (cleanExp.length < 10) {
        return res.status(400).json({ error: 'Описание игрового опыта должно содержать минимум 10 символов.' });
      }

      const duplicate = await checkRecentApplication24h(cleanDiscord, ipAddress);
      if (duplicate) {
        return res.status(429).json({
          error:
            'Лимит: разрешена только одна заявка с одного Discord-аккаунта или IP-адреса в сутки (24 часа). Ваша предыдущая заявка уже находится в базе.',
        });
      }

      const created = await createApplication({
        nickname: cleanNick,
        age: parsedAge,
        discordLink: cleanDiscord,
        experience: cleanExp,
        weeklyHours: cleanHours || 'Не указано',
        motivation: cleanMotivation || cleanExp,
        rulesAccepted: true,
        ipAddress,
        applicantUid: applicant.uid,
        applicantEmail: applicant.email,
      });

      await createAuditLog({
        actorName: cleanNick,
        actorRole: 'candidate',
        section: 'applications',
        action: 'Новая заявка в клан (Участник)',
        details: `Подана заявка #${created.id} (${cleanNick}, ${parsedAge} лет, ${cleanHours} ч/нед)`,
        ipAddress,
        diffJson: JSON.stringify({ after: created }, null, 2),
      });

      sendDiscordApplicationWebhook(created);

      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка при сохранении заявки' });
    }
  }
);

// Application-only bans: trusted staff can block submissions without disabling profiles.
app.get('/api/admin/application-bans', requireRole(['leader', 'deputy', 'moderator']), async (_req: AuthRequest, res: Response) => {
  res.json(await getApplicationBans());
});
app.post('/api/admin/application-bans', requireRole(['leader', 'deputy', 'moderator']), csrfProtection, async (req: AuthRequest, res: Response) => {
  const { uid, durationHours, reason } = req.body || {};
  const target = String(uid || '').trim();
  const hours = Number(durationHours);
  if (!target || target.length > 256 || !Number.isFinite(hours) || (hours !== 0 && (hours < 1 || hours > 87600))) return res.status(400).json({ error: 'Укажите аккаунт и срок (0 — навсегда, 1–87600 часов — временно).' });
  const apps = await getApplications();
  const owned = apps.find(a => a.applicantUid === target);
  if (!owned) return res.status(404).json({ error: 'Аккаунт не найден среди заявителей.' });
  const actor = req.adminContext!;
  const cleanReason = String(reason || 'Многократная подача заявок').trim().slice(0, 300);
  await setApplicationBan({ uid: target, email: owned.applicantEmail || '', until: hours === 0 ? null : new Date(Date.now() + hours * 3600000).toISOString(), reason: cleanReason, issuedBy: actor.displayName });
  await createAuditLog({ actorName: actor.displayName, actorRole: actor.role, section: 'applications', action: 'Блокировка подачи заявок', details: `Аккаунт ${target}, срок ${hours === 0 ? 'навсегда' : hours + ' ч'}, причина: ${cleanReason}`, ipAddress: getClientIp(req), diffJson: null });
  res.json({ ok: true });
});
app.delete('/api/admin/application-bans/:uid', requireRole(['leader', 'deputy', 'moderator']), csrfProtection, async (req: AuthRequest, res: Response) => {
  const actor = req.adminContext!;
  await clearApplicationBan(String(req.params.uid));
  await createAuditLog({ actorName: actor.displayName, actorRole: actor.role, section: 'applications', action: 'Снятие блокировки заявок', details: `Аккаунт ${req.params.uid}`, ipAddress: getClientIp(req), diffJson: null });
  res.json({ ok: true });
});

// ============================================================================
// 5. PROTECTED ADMIN PANEL & MINI-CMS ROUTES (Server-Side RBAC)
// ============================================================================
app.get(
  '/api/admin/dashboard',
  requireRole(['leader', 'deputy', 'moderator']),
  async (req: AuthRequest, res: Response) => {
    try {
      await initSeedOnce();
      const [
        publishedCms,
        draftCms,
        versions,
        applicationsList,
        rosterList,
        clanRolesList,
        topPlayersList,
        newsList,
        pagesList,
        mediaList,
        trashBin,
        notesList,
        logsList,
        rolesList,
        usersList,
      ] = await Promise.all([
        getCmsConfig('published'),
        getCmsConfig('draft'),
        getContentVersionsList(),
        getApplications(),
        getRosterMembers(),
        getClanRoles(),
        getTopPlayers(),
        getClanNews(true),
        getCustomPages(true),
        getMediaFiles(),
        getTrashBinItems(),
        getAdminNotes(),
        getAuditLogs(),
        getRolesTable(),
        req.adminContext?.role === 'leader' ? getAllUsers() : Promise.resolve([]),
      ]);

      // Mask webhook secrets when sending to client UI
      const maskCmsSecrets = (cfg: any) => ({
        ...cfg,
        integrations: {
          ...cfg.integrations,
          discordWebhookUrl: maskSecretValue(cfg.integrations?.discordWebhookUrl),
          discordNewsWebhookUrl: maskSecretValue(cfg.integrations?.discordNewsWebhookUrl),
        },
      });

      res.json({
        currentUser: req.adminContext,
        publishedCms: maskCmsSecrets(publishedCms),
        draftCms: maskCmsSecrets(draftCms),
        envSecretsStatus: {
          hasDiscordBotToken: Boolean(
            process.env.DISCORD_BOT_TOKEN &&
              process.env.DISCORD_BOT_TOKEN !== 'YOUR_DISCORD_BOT_TOKEN'
          ),
          hasDiscordOAuthSecret: Boolean(
            process.env.DISCORD_CLIENT_SECRET &&
              process.env.DISCORD_CLIENT_SECRET !== 'YOUR_DISCORD_CLIENT_SECRET'
          ),
          hasConfiguredAppWebhook: Boolean(
            publishedCms.integrations?.discordWebhookUrl || process.env.DISCORD_ADMIN_WEBHOOK_URL
          ),
          hasConfiguredNewsWebhook: Boolean(
            publishedCms.integrations?.discordNewsWebhookUrl ||
              process.env.DISCORD_NEWS_WEBHOOK_URL
          ),
        },
        versions,
        applications: applicationsList,
        roster: rosterList,
        clanRoles: clanRolesList,
        topPlayers: topPlayersList,
        news: newsList,
        customPages: pagesList,
        media: mediaList,
        trash: trashBin,
        notes: notesList,
        logs: logsList,
        roles: rolesList,
        users: usersList,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка загрузки админ-панели' });
    }
  }
);

// Update Application Status & Internal Comment (Auto-adds to Roster as 'Участник' on accept)
app.patch(
  '/api/admin/applications/:id',
  requireRole(['leader', 'deputy', 'moderator']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const appId = Number(req.params.id);
      const { status, adminComment } = req.body;
      const actor = req.adminContext!;
      const ipAddress = getClientIp(req);

      if (status && !['new', 'reviewing', 'accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Недопустимый статус заявки.' });
      }

      const result = await updateApplicationAdmin(appId, {
        status,
        adminComment,
        reviewedBy: actor.displayName,
        reviewerRole: actor.role,
      });

      if (!result) {
        return res.status(404).json({ error: 'Заявка не найдена.' });
      }

      if (status === 'accepted' && result.before.status !== 'accepted') {
        const currentRoster = await getRosterMembers();
        const alreadyInRoster = currentRoster.some(
          (m) => m.nickname.toLowerCase() === result.after.nickname.toLowerCase()
        );
        if (!alreadyInRoster) {
          await addRosterMember({
            nickname: result.after.nickname,
            role: 'Участник',
            status: 'active',
            avatarUrl: '/src/assets/images/curs_clan_crest_1791453830325.jpg',
            kdRatio: result.after.kdRatio || '1.50',
            discordTag: result.after.discordLink,
            bio: `Принят по заявке #${appId}. Опыт: ${result.after.experience}`,
            joinedDate: new Date().toISOString().slice(0, 10),
            addedBy: actor.displayName,
          });
        }
      }

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'applications',
        action: `Обработка заявки #${appId} (${result.after.nickname})`,
        details: `Статус: ${result.before.status} → ${result.after.status}${
          adminComment ? ` | Комментарий: ${adminComment}` : ''
        }`,
        ipAddress,
        diffJson: JSON.stringify(result, null, 2),
      });

      res.json(result.after);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Не удалось обновить заявку' });
    }
  }
);

// Save or Publish CMS Site Configuration (Menu, Appearance, Integrations)
app.post(
  '/api/admin/cms',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const { mode, config, versionTitle, sectionName } = req.body;
      const actor = req.adminContext!;
      const ipAddress = getClientIp(req);
      const beforeConfig = await getCmsConfig(mode === 'publish' ? 'published' : 'draft');

      // Preserve masked webhook secrets if user didn't enter a new raw webhook URL
      const mergedIntegrations = {
        ...beforeConfig.integrations,
        ...(config.integrations || {}),
      };
      if (
        !config.integrations?.discordWebhookUrl ||
        String(config.integrations.discordWebhookUrl).includes('••••')
      ) {
        mergedIntegrations.discordWebhookUrl = beforeConfig.integrations?.discordWebhookUrl || '';
      }
      if (
        !config.integrations?.discordNewsWebhookUrl ||
        String(config.integrations.discordNewsWebhookUrl).includes('••••')
      ) {
        mergedIntegrations.discordNewsWebhookUrl =
          beforeConfig.integrations?.discordNewsWebhookUrl || '';
      }

      let targetConfig = {
        ...beforeConfig,
        ...config,
        integrations: mergedIntegrations,
      };

      // Deputy cannot change integrations
      if (actor.role === 'deputy') {
        targetConfig.integrations = beforeConfig.integrations;
      }

      const saved = await saveCmsConfig(
        mode === 'publish' ? 'publish' : 'draft',
        targetConfig,
        actor.displayName,
        versionTitle
      );

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: sectionName || 'appearance',
        action:
          mode === 'publish'
            ? 'Публикация настроек сайта и оформления'
            : 'Сохранение черновика настроек CMS',
        details: versionTitle || `Обновлены параметры сайта (${actor.displayName})`,
        ipAddress,
        diffJson: JSON.stringify(
          {
            before: {
              siteTitle: beforeConfig.siteTitle,
              themePreset: beforeConfig.themePreset,
              accentColor: beforeConfig.accentColor,
              fontFamily: beforeConfig.fontFamily,
            },
            after: {
              siteTitle: saved.siteTitle,
              themePreset: saved.themePreset,
              accentColor: saved.accentColor,
              fontFamily: saved.fontFamily,
            },
          },
          null,
          2
        ),
      });

      res.json(saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка сохранения настроек CMS' });
    }
  }
);

// Rollback Content Version (Pages, News, or CMS Settings)
app.post(
  '/api/admin/cms/rollback/:versionId',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const versionId = Number(req.params.versionId);
      const actor = req.adminContext!;
      const ipAddress = getClientIp(req);
      const restored = await rollbackCmsVersion(versionId, actor.displayName);

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'settings',
        action: 'Откат версии контента (Rollback)',
        details: `Выполнен откат к версии #${versionId} (${restored.targetType})`,
        ipAddress,
        diffJson: JSON.stringify({ after: restored.data }, null, 2),
      });

      res.json(restored);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка отката версии' });
    }
  }
);

// Restore Item from 30-Day Trash Bin
app.post(
  '/api/admin/trash/restore',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const { type, id } = req.body;
      const actor = req.adminContext!;
      const ipAddress = getClientIp(req);
      if (!['page', 'news', 'media'].includes(type)) {
        return res.status(400).json({ error: 'Некорректный тип объекта корзины.' });
      }
      const restored = await restoreFromTrash(type, Number(id));

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'settings',
        action: 'Восстановление из корзины',
        details: `Восстановлен объект (${type}) #${id}`,
        ipAddress,
        diffJson: JSON.stringify({ after: restored }, null, 2),
      });

      res.json({ ok: true, restored });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка восстановления из корзины' });
    }
  }
);

// Clan Custom Roles CRUD (Name, Color, Order)
app.post(
  '/api/admin/clan-roles',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, name, color, displayOrder } = req.body;
      const actor = req.adminContext!;
      const ipAddress = getClientIp(req);
      if (!name || String(name).trim().length < 2) {
        return res.status(400).json({ error: 'Укажите название роли клана.' });
      }

      const saved = await saveClanRole({
        id: id ? Number(id) : undefined,
        name: String(name).trim(),
        color: String(color || '#e11d48'),
        displayOrder: Number(displayOrder || 1),
      });

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'roster',
        action: id ? 'Редактирование роли клана' : 'Создание роли клана',
        details: `Роль клана «${saved.name}» (цвет: ${saved.color}, порядок: ${saved.displayOrder})`,
        ipAddress,
        diffJson: JSON.stringify({ after: saved }, null, 2),
      });

      res.status(201).json(saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка сохранения роли клана' });
    }
  }
);

app.delete(
  '/api/admin/clan-roles/:id',
  requireRole(['leader']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const actor = req.adminContext!;
      const deleted = await deleteClanRole(id);
      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'roster',
        action: 'Удаление роли клана',
        details: `Удалена роль клана «${deleted?.name || id}»`,
        ipAddress: getClientIp(req),
      });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка удаления роли клана' });
    }
  }
);

// Roster Management (Leader & Deputy; ONLY Leader can assign roles above 'Участник')
app.post(
  '/api/admin/roster',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const { nickname, role, status, avatarUrl, kdRatio, discordTag, bio, joinedDate } = req.body;
      const actor = req.adminContext!;

      const requestedRole = String(role || 'Участник').trim();
      if (actor.role !== 'leader' && requestedRole !== 'Участник') {
        return res.status(403).json({
          error: 'Назначать роли выше «Участник» имеет право только Лидер клана.',
        });
      }

      const member = await addRosterMember({
        nickname: String(nickname || '').trim(),
        role: requestedRole,
        status: status === 'inactive' ? 'inactive' : 'active',
        avatarUrl:
          String(avatarUrl || '').trim() ||
          '/src/assets/images/curs_clan_crest_1791453830325.jpg',
        kdRatio: String(kdRatio || '1.50'),
        discordTag: String(discordTag || 'Discord [CURS]'),
        bio: String(bio || 'Участник клана CURS на паблике CrazyPub.'),
        joinedDate: joinedDate || new Date().toISOString().slice(0, 10),
        addedBy: actor.displayName,
      });

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'roster',
        action: 'Добавление участника в состав',
        details: `Добавлен игрок [CURS] ${member.nickname} с ролью «${member.role}» (${member.status})`,
        ipAddress: getClientIp(req),
        diffJson: JSON.stringify({ after: member }, null, 2),
      });

      res.status(201).json(member);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка добавления участника' });
    }
  }
);

app.patch(
  '/api/admin/roster/:id',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { nickname, role, status, avatarUrl, kdRatio, discordTag, bio, joinedDate } = req.body;
      const actor = req.adminContext!;

      if (role !== undefined && actor.role !== 'leader' && role !== 'Участник') {
        return res.status(403).json({
          error: 'Права менять роли выше «Участник» есть только у Лидера клана.',
        });
      }

      const result = await updateRosterMember(id, {
        nickname,
        role,
        status,
        avatarUrl,
        kdRatio,
        discordTag,
        bio,
        joinedDate,
      });

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'roster',
        action: 'Редактирование участника состава',
        details: `Обновлены данные игрока ${result.after?.nickname || id} (роль: ${result.after?.role}, статус: ${result.after?.status})`,
        ipAddress: getClientIp(req),
        diffJson: JSON.stringify(result, null, 2),
      });

      res.json(result.after);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка обновления участника' });
    }
  }
);

app.put(
  '/api/admin/roster/reorder',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const { orderedIds } = req.body;
      const actor = req.adminContext!;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: 'Передайте массив ID участников.' });
      }
      const updatedList = await reorderRosterMembers(orderedIds.map(Number));

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'roster',
        action: 'Изменение порядка состава',
        details: `Сохранён новый порядок отображения участников (${orderedIds.length} чел.)`,
        ipAddress: getClientIp(req),
      });

      res.json(updatedList);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка сортировки состава' });
    }
  }
);

app.delete(
  '/api/admin/roster/:id',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const actor = req.adminContext!;
      const deleted = await deleteRosterMember(id);

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'roster',
        action: 'Удаление из состава',
        details: `Игрок ${deleted?.nickname || id} удалён из состава CURS`,
        ipAddress: getClientIp(req),
        diffJson: JSON.stringify({ before: deleted }, null, 2),
      });

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка удаления из состава' });
    }
  }
);

// Top Players Leaderboard Management (Leader & Deputy)
app.post(
  '/api/admin/top',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const { place, nickname, clanTag, points, kdRatio, headshotPct, kills, playtimeHours } =
        req.body;
      const actor = req.adminContext!;

      if (!nickname || String(nickname).trim().length < 2) {
        return res.status(400).json({ error: 'Укажите игровой никнейм для списка топов.' });
      }

      const added = await addTopPlayer({
        place: place ? Number(place) : undefined,
        nickname: String(nickname).trim(),
        clanTag: String(clanTag || 'CURS').trim(),
        points: Number(points || 3000),
        kdRatio: String(kdRatio || '1.75'),
        headshotPct: String(headshotPct || '58.0%'),
        kills: Number(kills || 1500),
        playtimeHours: Number(playtimeHours || 80),
        updatedBy: actor.displayName,
      });

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'integrations',
        action: 'Добавление игрока в Топ клана',
        details: `Добавлен в топ: #${added.place} ${added.nickname} (${added.points} очков, K/D ${added.kdRatio})`,
        ipAddress: getClientIp(req),
        diffJson: JSON.stringify({ after: added }, null, 2),
      });

      res.status(201).json(added);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка добавления в список топов' });
    }
  }
);

app.put(
  '/api/admin/top/reorder',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const { orderedIds } = req.body;
      const actor = req.adminContext!;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: 'Передайте массив ID игроков топа.' });
      }
      const updated = await reorderTopPlayers(orderedIds.map(Number), actor.displayName);

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'integrations',
        action: 'Сортировка списка топов',
        details: `Обновлён порядок мест в Топе клана (${orderedIds.length} игроков)`,
        ipAddress: getClientIp(req),
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка изменения порядка топа' });
    }
  }
);

app.post(
  '/api/admin/top/reset',
  requireRole(['leader']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const actor = req.adminContext!;
      const resetList = await resetTopPlayersToDefault(actor.displayName);

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'integrations',
        action: 'Сброс списка топов к эталону',
        details: 'Восстановлен стандартный список Топ-10 игроков CURS на CrazyPub',
        ipAddress: getClientIp(req),
      });

      res.json(resetList);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка сброса списка топов' });
    }
  }
);

app.patch(
  '/api/admin/top/:id',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { place, nickname, clanTag, points, kdRatio, headshotPct, kills, playtimeHours } =
        req.body;
      const actor = req.adminContext!;

      const updated = await updateTopPlayer(id, {
        place,
        nickname,
        clanTag,
        points,
        kdRatio,
        headshotPct,
        kills,
        playtimeHours,
        updatedBy: actor.displayName,
      });

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'integrations',
        action: 'Редактирование игрока в Топе',
        details: `Обновлён игрок #${updated?.place} ${updated?.nickname} (${updated?.points} очков)`,
        ipAddress: getClientIp(req),
        diffJson: JSON.stringify({ after: updated }, null, 2),
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка обновления игрока в топе' });
    }
  }
);

app.delete(
  '/api/admin/top/:id',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const actor = req.adminContext!;
      const deleted = await deleteTopPlayer(id);

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'integrations',
        action: 'Удаление игрока из Топа клана',
        details: `Удалён из топа игрок ${deleted?.nickname || id}`,
        ipAddress: getClientIp(req),
        diffJson: JSON.stringify({ before: deleted }, null, 2),
      });

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка удаления игрока из топа' });
    }
  }
);

// News CRUD (Drafts, Scheduled, Publish, Pinning, Discord Webhook Announcement)
app.post(
  '/api/admin/news',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        id,
        title,
        content,
        category,
        coverUrl,
        status,
        isPinned,
        publishedDate,
        scheduledAt,
        driveFileUrl,
        sendDiscordAnnounce,
      } = req.body;
      const actor = req.adminContext!;

      if (!title || !content) {
        return res.status(400).json({ error: 'Укажите заголовок и текст новости.' });
      }

      const validStatus =
        status === 'draft' || status === 'scheduled' ? status : 'published';

      const result = await saveClanNewsItem({
        id: id ? Number(id) : undefined,
        title: String(title),
        content: String(content),
        category: String(category || 'Объявление клана'),
        coverUrl: coverUrl ? String(coverUrl) : undefined,
        status: validStatus,
        isPinned: Boolean(isPinned),
        publishedDate: String(publishedDate || new Date().toISOString().slice(0, 10)),
        scheduledAt: scheduledAt ? String(scheduledAt) : undefined,
        authorName: actor.displayName,
        driveFileUrl: driveFileUrl ? String(driveFileUrl) : undefined,
      });

      if (validStatus === 'published' && sendDiscordAnnounce && result.after) {
        sendDiscordNewsWebhook(result.after);
      }

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'news',
        action: id ? 'Редактирование новости' : 'Создание новости',
        details: `[${result.after.status}] «${result.after.title}»${
          result.after.isPinned ? ' (Закреплено)' : ''
        }`,
        ipAddress: getClientIp(req),
        diffJson: JSON.stringify(result, null, 2),
      });

      res.status(201).json(result.after);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка сохранения новости' });
    }
  }
);

app.delete(
  '/api/admin/news/:id',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const actor = req.adminContext!;
      const deleted = await deleteClanNews(id);

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'news',
        action: 'Перемещение новости в корзину (30 дней)',
        details: `Новость «${deleted?.title || id}» перемещена в корзину`,
        ipAddress: getClientIp(req),
        diffJson: JSON.stringify({ before: deleted }, null, 2),
      });

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка удаления новости' });
    }
  }
);

// Pages Block Builder (Save Draft / Publish / Auto-save)
app.post(
  '/api/admin/pages',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        id,
        slug,
        title,
        seoTitle,
        seoDescription,
        showInMenu,
        status,
        blocks,
        saveMode,
        isAutoSave,
      } = req.body;
      const actor = req.adminContext!;

      if (!title || !slug) {
        return res.status(400).json({ error: 'Укажите название и адрес (slug) страницы.' });
      }

      const result = await saveCustomPage({
        id: id ? Number(id) : undefined,
        slug: String(slug),
        title: String(title),
        seoTitle: seoTitle ? String(seoTitle) : String(title),
        seoDescription: seoDescription ? String(seoDescription) : '',
        showInMenu: showInMenu !== undefined ? Boolean(showInMenu) : true,
        status: status === 'draft' ? 'draft' : 'published',
        blocksJson: JSON.stringify(Array.isArray(blocks) ? blocks : []),
        authorName: actor.displayName,
        saveMode: saveMode === 'publish' ? 'publish' : 'draft_only',
      });

      if (!isAutoSave) {
        await createAuditLog({
          actorName: actor.displayName,
          actorRole: actor.role,
          section: 'pages',
          action:
            saveMode === 'publish'
              ? `Публикация страницы «${result.after.title}»`
              : `Сохранение черновика страницы «${result.after.title}»`,
          details: `Адрес: /${result.after.slug} | Блоков: ${
            Array.isArray(blocks) ? blocks.length : 0
          }`,
          ipAddress: getClientIp(req),
          diffJson: JSON.stringify(result, null, 2),
        });
      }

      res.status(201).json(result.after);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка сохранения страницы' });
    }
  }
);

app.delete(
  '/api/admin/pages/:id',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const actor = req.adminContext!;
      const deleted = await deleteCustomPage(id);

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'pages',
        action: 'Перемещение страницы в корзину (30 дней)',
        details: `Страница «${deleted?.title || id}» перемещена в корзину`,
        ipAddress: getClientIp(req),
        diffJson: JSON.stringify({ before: deleted }, null, 2),
      });

      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Ошибка удаления страницы' });
    }
  }
);

// Media Library Upload, Rename, Usage Check & Soft-Delete (Max 5 MB)
app.post(
  '/api/admin/media',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const { fileName, mimeType, sizeBytes, dataUrl, thumbnailUrl } = req.body;
      const actor = req.adminContext!;

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(String(mimeType))) {
        return res.status(400).json({
          error: 'Разрешены только изображения форматов JPG, PNG, WebP и GIF.',
        });
      }

      if (Number(sizeBytes) > 5 * 1024 * 1024) {
        return res.status(400).json({
          error: 'Размер файла не должен превышать 5 МБ.',
        });
      }

      const saved = await addMediaFile({
        fileName: String(fileName || 'image.webp').slice(0, 80),
        mimeType: String(mimeType),
        sizeBytes: Number(sizeBytes || 0),
        dataUrl: String(dataUrl),
        thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : String(dataUrl),
        uploadedBy: actor.displayName,
      });

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'media',
        action: 'Загрузка файла в медиатеку',
        details: `Загружено изображение «${saved.fileName}» (${Math.round(saved.sizeBytes / 1024)} КБ)`,
        ipAddress: getClientIp(req),
      });

      res.status(201).json(saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка загрузки изображения' });
    }
  }
);

app.patch(
  '/api/admin/media/:id',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { fileName } = req.body;
      const actor = req.adminContext!;
      if (!fileName || String(fileName).trim().length < 2) {
        return res.status(400).json({ error: 'Укажите новое имя файла.' });
      }
      const updated = await renameMediaFile(id, String(fileName).trim());

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'media',
        action: 'Переименование медиафайла',
        details: `Файл #${id} переименован в «${updated?.fileName}»`,
        ipAddress: getClientIp(req),
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка переименования файла' });
    }
  }
);

app.post(
  '/api/admin/media/check-usage',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const { dataUrl } = req.body;
      const usedIn = await checkMediaUsage(String(dataUrl || ''));
      res.json({ usedIn });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка проверки использования файла' });
    }
  }
);

app.delete(
  '/api/admin/media/:id',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const actor = req.adminContext!;
      const deleted = await deleteMediaFile(id);

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'media',
        action: 'Удаление файла в корзину (30 дней)',
        details: `Медиафайл «${deleted?.fileName || id}» перемещён в корзину`,
        ipAddress: getClientIp(req),
      });

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка удаления файла' });
    }
  }
);

// Admin Notes
app.post(
  '/api/admin/notes',
  requireRole(['leader', 'deputy', 'moderator']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const { noteText, priority } = req.body;
      const actor = req.adminContext!;
      const note = await createAdminNote({
        authorName: actor.displayName,
        authorRole: actor.role,
        noteText: String(noteText || ''),
        priority: String(priority || 'normal'),
      });
      res.status(201).json(note);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка создания заметки' });
    }
  }
);

app.delete(
  '/api/admin/notes/:id',
  requireRole(['leader', 'deputy']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      await deleteAdminNote(id);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка удаления заметки' });
    }
  }
);

// Only the verified Google owner may invite new Google admins.
app.post('/api/admin/developers/invite', requireRole(['leader']), csrfProtection,
  async (req: AuthRequest, res: Response) => {
    const owner = (process.env.ADMIN_LEADER_EMAILS || '').split(',').map((v) => v.trim().toLowerCase());
    if (req.adminContext?.authProvider !== 'firebase' || !owner.includes(req.adminContext.email.toLowerCase())) {
      return res.status(403).json({ error: 'Только владелец Google может добавлять разработчиков.' });
    }
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = req.body?.role;
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || !['deputy', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'Укажите корректный email и роль.' });
    }
    if (owner.includes(email)) return res.status(400).json({ error: 'Владелец уже имеет доступ.' });
    try {
      const user = await inviteGoogleAdmin(email, role);
      res.status(201).json({ id: user.id, email: user.email, role: user.discordRole });
    } catch (err) {
      res.status(500).json({ error: 'Не удалось добавить аккаунт.' });
    }
  }
);

// Manage Admin Roles, Temporary Access Suspension & Discord Role Mapping (Leader ONLY)
app.patch(
  '/api/admin/users/:id/role',
  requireRole(['leader']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = Number(req.params.id);
      const { role, isSuspended } = req.body;
      const actor = req.adminContext!;

      if (role && !['leader', 'deputy', 'moderator', 'member'].includes(role)) {
        return res.status(400).json({ error: 'Некорректная роль.' });
      }

      const result = await updateUserRole(userId, role, isSuspended);

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'admins',
        action: 'Изменение прав / доступа администратора',
        details: `Пользователь ${result.after?.displayName || userId}: роль «${
          result.after?.discordRole
        }», доступ: ${result.after?.isSuspended ? 'Временно отключён' : 'Активен'}`,
        ipAddress: getClientIp(req),
        diffJson: JSON.stringify(result, null, 2),
      });

      res.json(result.after);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка изменения прав доступа' });
    }
  }
);

app.put(
  '/api/admin/roles/:code/discord-mapping',
  requireRole(['leader']),
  csrfProtection,
  async (req: AuthRequest, res: Response) => {
    try {
      const code = String(req.params.code);
      const { discordRoleIds } = req.body;
      const actor = req.adminContext!;
      if (!['leader', 'deputy', 'moderator'].includes(code)) {
        return res.status(400).json({ error: 'Недопустимый код роли.' });
      }

      const updated = await updateRoleDiscordMapping(
        code,
        Array.isArray(discordRoleIds) ? discordRoleIds.map(String) : []
      );

      await createAuditLog({
        actorName: actor.displayName,
        actorRole: actor.role,
        section: 'admins',
        action: 'Настройка привязки ролей Discord',
        details: `Для уровня доступа «${code}» заданы ID ролей Discord: ${(
          discordRoleIds || []
        ).join(', ')}`,
        ipAddress: getClientIp(req),
        diffJson: JSON.stringify({ after: updated }, null, 2),
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Ошибка сохранения ролей Discord' });
    }
  }
);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CURS Clan CMS Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
