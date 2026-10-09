import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Trophy,
  Shield,
  Send,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Lock,
  LogOut,
  Plus,
  Trash2,
  FileText,
  Radio,
  ChevronRight,
  Terminal,
  BookOpen,
  UserCheck,
  X,
  Download,
} from 'lucide-react';
import {
  HERO_IMAGE_URL,
  CLAN_CREST_URL,
  VACANT_ROLE_SLOTS,
  CLAN_RULES,
  PlayerRole,
} from './data/clanData';
import { ResilientImage } from './components/ResilientImage';
import { GoogleDriveVault } from './components/GoogleDriveVault';
import { initAuth, googleSignIn, getIdToken, logout as firebaseLogout } from './lib/firebase';

// Optional HTTPS API origin for GitHub Pages. Keep empty for same-origin deployments.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

type PageTab = 'home' | 'about' | 'roster' | 'top' | 'apply' | 'admin' | 'docs';
type AdminRole = 'leader' | 'deputy' | 'moderator' | 'member';

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  authProvider: 'discord' | 'firebase';
}

interface DiscordStatus {
  guildName: string;
  onlineCount: number;
  totalMembers: number;
  inviteUrl: string;
  voiceActiveCount: number;
  onlineMembersSample: Array<{ id: string; username: string; status: string; game?: string }>;
  updatedAt: number;
  isLiveApi: boolean;
}

interface CrazyPubEntry {
  place: number;
  nickname: string;
  clanTag: string;
  points: number;
  kdRatio: string;
  headshotPct: string;
  kills: number;
  playtimeHours: number;
}

interface CrazyPubLeaderboardResponse {
  entries: CrazyPubEntry[];
  updatedAt: number;
  updatedMinutesAgo: number;
  sourceUrl: string;
  mode: string;
}

interface RosterMemberRecord {
  id: number;
  nickname: string;
  role: string;
  avatarUrl: string;
  kdRatio: string;
  discordTag: string;
  bio: string;
  addedBy?: string;
  createdAt?: string;
}

interface ClanNewsRecord {
  id: number;
  title: string;
  content: string;
  category: string;
  authorName: string;
  driveFileUrl?: string;
  createdAt?: string;
}

interface ApplicationRecord {
  id: number;
  nickname: string;
  age: number;
  experience: string;
  discordLink: string;
  role: string;
  kdRatio: string;
  status: 'pending' | 'accepted' | 'rejected';
  reviewedBy?: string;
  createdAt?: string;
}

interface AdminNoteRecord {
  id: number;
  authorName: string;
  authorRole: string;
  noteText: string;
  priority: string;
  createdAt?: string;
}

interface AuditLogRecord {
  id: number;
  actorName: string;
  actorRole: string;
  action: string;
  details: string;
  createdAt?: string;
}

interface UserRecord {
  id: number;
  uid: string;
  email: string;
  displayName?: string;
  discordRole: AdminRole;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  leader: 'Лидер (Полный доступ)',
  deputy: 'Заместитель (Заявки, Состав, Новости)',
  moderator: 'Модератор (Просмотр и обработка заявок)',
  member: 'Участник (Без доступа в админку)',
};

const CLAN_DISCORD_INVITE = 'https://discord.gg/5QwH43Wd9';

export default function App() {
  const [activeTab, setActiveTab] = useState<PageTab>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newsSearch, setNewsSearch] = useState('');

  // Auth & Admin state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Public data states
  const [discordStatus, setDiscordStatus] = useState<DiscordStatus | null>(null);
  const [leaderboard, setLeaderboard] = useState<CrazyPubLeaderboardResponse | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);
  const [roster, setRoster] = useState<RosterMemberRecord[]>([]);
  const [news, setNews] = useState<ClanNewsRecord[]>([]);

  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const refreshCaptcha = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/captcha/challenge`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Не удалось загрузить капчу');
      const data = await response.json();
      setCaptchaQuestion(data.question);
      setCaptchaToken(data.token);
      setCaptchaAnswer('');
    } catch {
      setCaptchaQuestion('Капча недоступна. Попробуйте обновить страницу.');
      setCaptchaToken('');
    }
  }, []);
  useEffect(() => { void refreshCaptcha(); }, [refreshCaptcha]);

  // Application form state
  const [appNick, setAppNick] = useState<string>('');
  const [appAge, setAppAge] = useState<string>('18');
  const [appRole, setAppRole] = useState<string>('Энтри-фраггер');
  const [appKd, setAppKd] = useState<string>('1.65');
  const [appDiscord, setAppDiscord] = useState<string>('');
  const [appExperience, setAppExperience] = useState<string>('');
  const [appSubmitting, setAppSubmitting] = useState<boolean>(false);
  const [appSuccessMessage, setAppSuccessMessage] = useState<string | null>(null);
  const [appErrorMessage, setAppErrorMessage] = useState<string | null>(null);

  // Admin Dashboard states
  const [adminSubTab, setAdminSubTab] = useState<
    'applications' | 'roster' | 'news' | 'notes' | 'logs' | 'roles'
  >('applications');
  const [adminApplications, setAdminApplications] = useState<ApplicationRecord[]>([]);
  const [adminNotes, setAdminNotes] = useState<AdminNoteRecord[]>([]);
  const [adminLogs, setAdminLogs] = useState<AuditLogRecord[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserRecord[]>([]);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);
  const [developerEmail, setDeveloperEmail] = useState('');
  const [developerRole, setDeveloperRole] = useState<'deputy' | 'moderator'>('moderator');
  const [adminError, setAdminError] = useState<string | null>(null);

  // Admin Forms
  const [newMemberNick, setNewMemberNick] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('Капитан (IGL)');
  const [newMemberKd, setNewMemberKd] = useState<string>('1.95');
  const [newMemberDiscord, setNewMemberDiscord] = useState<string>('');
  const [newMemberBio, setNewMemberBio] = useState<string>('');

  const [newsTitle, setNewsTitle] = useState<string>('');
  const [newsCategory, setNewsCategory] = useState<string>('Объявление клана');
  const [newsContent, setNewsContent] = useState<string>('');
  const [newsDriveUrl, setNewsDriveUrl] = useState<string>('');

  const [noteText, setNoteText] = useState<string>('');
  const [notePriority, setNotePriority] = useState<string>('normal');

  const isTrustedStaff =
    authUser && ['leader', 'deputy', 'moderator'].includes(authUser.role);

  const buildAuthHeaders = useCallback(async (includeCsrf = false) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (includeCsrf) {
      headers['x-curs-csrf'] = 'curs-verified-client';
    }
    const idToken = await getIdToken();
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    return headers;
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const headers = await buildAuthHeaders(false);
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setAuthUser(data.user);
        } else {
          setAuthUser(null);
        }
      }
    } catch (err) {
      console.error('Error checking auth state:', err);
    }
  }, [buildAuthHeaders]);

  const fetchPublicData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/data`);
      if (res.ok) {
        const data = await res.json();
        setRoster(Array.isArray(data.roster) ? data.roster : []);
        setNews(Array.isArray(data.news) ? data.news : []);
      }
    } catch (err) {
      console.error('Error loading public data:', err);
    }
  }, []);

  const fetchDiscordStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/discord/status`);
      if (res.ok) {
        const data = await res.json();
        setDiscordStatus(data);
      }
    } catch (err) {
      console.error('Error loading Discord status:', err);
    }
  }, []);

  const fetchLeaderboard = useCallback(async (force = false) => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/crazypub/leaderboard${force ? '?refresh=1' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (err) {
      console.error('Error loading CrazyPub leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  const fetchAdminDashboard = useCallback(async () => {
    setAdminError(null);
    try {
      const headers = await buildAuthHeaders(false);
      const res = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
        headers,
        credentials: 'include',
      });
      if (res.status === 401 || res.status === 403) {
        const errData = await res.json();
        setAdminError(errData.error || 'Доступ запрещён (403).');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAdminApplications(data.applications || []);
        setAdminNotes(data.notes || []);
        setAdminLogs(data.logs || []);
        setRoster(data.roster || []);
        setNews(data.news || []);
        setAdminUsers(data.users || []);
        if (data.currentUser) {
          setAuthUser(data.currentUser);
        }
      }
    } catch (err: any) {
      setAdminError(err.message || 'Ошибка загрузки данных админ-панели');
    }
  }, [buildAuthHeaders]);

  // Initial load & real-time polling (Discord every 45s, CrazyPub every 5m)
  useEffect(() => {
    fetchPublicData();
    fetchDiscordStatus();
    fetchLeaderboard(false);

    const unsub = initAuth(
      () => {
        fetchCurrentUser();
      },
      () => {
        fetchCurrentUser();
      }
    );

    const discordInterval = setInterval(fetchDiscordStatus, 45000);
    const topInterval = setInterval(() => fetchLeaderboard(false), 300000);

    return () => {
      unsub();
      clearInterval(discordInterval);
      clearInterval(topInterval);
    };
  }, [fetchPublicData, fetchDiscordStatus, fetchLeaderboard, fetchCurrentUser]);

  // Listen for Discord OAuth2 popup completion via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setShowAuthModal(false);
        fetchCurrentUser().then(() => {
          setActiveTab('admin');
          fetchAdminDashboard();
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchCurrentUser, fetchAdminDashboard]);

  useEffect(() => {
    if (activeTab === 'admin' && isTrustedStaff) {
      fetchAdminDashboard();
    }
  }, [activeTab, isTrustedStaff, fetchAdminDashboard]);

  // Open Discord OAuth2 Popup directly to provider URL
  const handleDiscordOAuthConnect = async () => {
    setAuthError(null);
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await fetch(
        `/api/auth/discord/url?redirectUri=${encodeURIComponent(redirectUri)}`
      );
      const data = await res.json();

      if (!res.ok || !data.url) {
        setAuthError(
          data.error ||
            'Для входа через Discord укажите DISCORD_CLIENT_ID и DISCORD_CLIENT_SECRET в .env или используйте вход через Google ниже.'
        );
        return;
      }

      const authWindow = window.open(data.url, 'discord_oauth_popup', 'width=600,height=720');
      if (!authWindow) {
        setAuthError('Всплывающее окно заблокировано браузером. Разрешите popups для этого сайта.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Ошибка подключения к Discord OAuth2');
    }
  };

  const handleGoogleAdminLogin = async () => {
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        await fetchCurrentUser();
        setShowAuthModal(false);
        setActiveTab('admin');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Ошибка входа через аккаунт Google');
    }
  };

  const handleLogout = async () => {
    await firebaseLogout();
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setAuthUser(null);
    if (activeTab === 'admin') {
      setActiveTab('home');
    }
  };

  // Submit clan application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppErrorMessage(null);
    setAppSuccessMessage(null);
    setAppSubmitting(true);

    try {
      const headers = await buildAuthHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/applications`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nickname: appNick,
          age: Number(appAge),
          role: appRole,
          kdRatio: appKd,
          discordLink: appDiscord,
          experience: appExperience,
          captchaToken,
          captchaAnswer,
          rulesAccepted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось отправить заявку');
      }

      setAppSuccessMessage(
        `Заявка #${data.id} от игрока ${data.nickname} сохранена в базе данных PostgreSQL и передана администрации CURS.`
      );
      setAppNick('');
      setAppExperience('');
      setAppDiscord('');
      void refreshCaptcha();
    } catch (err: any) {
      setAppErrorMessage(err.message || 'Ошибка отправки анкеты');
      void refreshCaptcha();
    } finally {
      setAppSubmitting(false);
    }
  };

  // Admin: Review Application
  const handleAdminApplicationDecision = async (
    id: number,
    status: 'accepted' | 'rejected',
    electToRoster = false
  ) => {
    try {
      const headers = await buildAuthHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/applications/${id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status, electToRoster }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAdminFeedback(
        status === 'accepted'
          ? `Заявка #${id} принята${electToRoster ? ' и игрок добавлен в состав CURS' : ''}.`
          : `Заявка #${id} отклонена.`
      );
      fetchAdminDashboard();
      fetchPublicData();
    } catch (err: any) {
      setAdminError(err.message || 'Ошибка обработки заявки');
    }
  };

  // Admin: Add Roster Member
  const handleAdminAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = await buildAuthHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/roster`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          nickname: newMemberNick,
          role: newMemberRole,
          kdRatio: newMemberKd,
          discordTag: newMemberDiscord || 'Discord [CURS]',
          bio: newMemberBio || 'Избран в основной состав клана CURS на паблике CrazyPub.',
          avatarUrl: CLAN_CREST_URL,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNewMemberNick('');
      setNewMemberBio('');
      setAdminFeedback(`Игрок [CURS] ${data.nickname} добавлен в состав.`);
      fetchAdminDashboard();
      fetchPublicData();
    } catch (err: any) {
      setAdminError(err.message || 'Ошибка добавления игрока');
    }
  };

  const handleAdminRemoveMember = async (id: number) => {
    try {
      const headers = await buildAuthHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/roster/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setAdminFeedback('Участник удалён из ростера.');
      fetchAdminDashboard();
      fetchPublicData();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  const handleAdminUpdateMemberRole = async (id: number, role: string) => {
    try {
      const headers = await buildAuthHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/roster/${id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setAdminFeedback(`Роль участника изменена на «${role}».`);
      fetchAdminDashboard();
      fetchPublicData();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Admin: Publish News
  const handleAdminPublishNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = await buildAuthHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/news`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title: newsTitle,
          category: newsCategory,
          content: newsContent,
          driveFileUrl: newsDriveUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNewsTitle('');
      setNewsContent('');
      setNewsDriveUrl('');
      setAdminFeedback('Новость опубликована на главной странице клана.');
      fetchAdminDashboard();
      fetchPublicData();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  const handleAdminDeleteNews = async (id: number) => {
    try {
      const headers = await buildAuthHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/news/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setAdminFeedback('Публикация удалена.');
      fetchAdminDashboard();
      fetchPublicData();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Admin: Add Note
  const handleAdminAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = await buildAuthHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/notes`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          noteText,
          priority: notePriority,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNoteText('');
      setAdminFeedback('Внутренняя заметка сохранена.');
      fetchAdminDashboard();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  const handleInviteDeveloper = async () => {
    setAdminError(null);
    try {
      const headers = await buildAuthHeaders(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/developers/invite`, {
        method: 'POST', headers, credentials: 'include',
        body: JSON.stringify({ email: developerEmail, role: developerRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка добавления');
      setDeveloperEmail('');
      setAdminFeedback('Google-аккаунт добавлен: ' + data.email);
      await fetchAdminDashboard();
    } catch (err: any) { setAdminError(err.message || 'Ошибка добавления'); }
  };

  // Admin Leader: Change User Role
  const handleAdminChangeUserRole = async (userId: number, role: AdminRole) => {
    try {
      const headers = await buildAuthHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAdminFeedback(`Права пользователя обновлены: ${ROLE_LABELS[role]}`);
      fetchAdminDashboard();
      fetchCurrentUser();
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090D] text-[#F4F4F6] flex flex-col">
      {/* Top Bar Contract: 1 row, 3 zones (Brand single text element, Nav links, Primary Actions)
          NOTE: "Админ-панель" tab is strictly hidden for regular visitors and only rendered when isTrustedStaff is true */}
      <header className="sticky top-0 z-40 h-16 bg-[#09090D]/95 backdrop-blur-md border-b border-white/[0.08] px-6 lg:px-12 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="font-display text-xl font-semibold tracking-tight text-white hover:text-rose-500 transition-colors whitespace-nowrap cursor-pointer"
        >
          CURS
        </button>

        <button type="button" aria-label="Открыть меню" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden rounded-lg border border-white/20 px-3 py-2 text-sm text-white">{mobileMenuOpen ? 'Закрыть ✕' : '☰ Меню'}</button>
        {mobileMenuOpen && <div className="absolute left-0 right-0 top-16 z-50 flex flex-col gap-2 border-b border-white/10 bg-[#09090D] p-4 shadow-2xl md:hidden">
          {([['home','Главная'],['about','О клане'],['roster','Состав'],['top','Рейтинг'],['apply','Вступление'],['docs','Документы']] as const).map(([tab,label]) => (
            <button key={tab} type="button" className="rounded-lg px-4 py-3 text-left text-white hover:bg-white/10" onClick={() => {setActiveTab(tab);setMobileMenuOpen(false);}}>{label}</button>
          ))}
          {isTrustedStaff && <button type="button" className="rounded-lg px-4 py-3 text-left text-rose-400 hover:bg-white/10" onClick={() => {setActiveTab('admin');setMobileMenuOpen(false);}}>Админ-панель</button>}
        </div>}
        <nav className="hidden md:flex items-center gap-7 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'home'
                ? 'text-rose-500 font-semibold underline underline-offset-8'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Главная
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'about'
                ? 'text-rose-500 font-semibold underline underline-offset-8'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            О клане
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'roster'
                ? 'text-rose-500 font-semibold underline underline-offset-8'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Состав ({roster.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('top')}
            className={`transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'top'
                ? 'text-rose-500 font-semibold underline underline-offset-8'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Топ клана
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apply')}
            className={`transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'apply'
                ? 'text-rose-500 font-semibold underline underline-offset-8'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Вступление
          </button>
          {isTrustedStaff && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'admin'
                  ? 'text-rose-500 font-semibold underline underline-offset-8'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              Админ-панель
            </button>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/api/download-site-zip"
            download="curs-clan-site.zip"
            className="px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Скачать все файлы сайта в формате ZIP"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            <span>Скачать ZIP сайта</span>
          </a>
          {authUser ? (
            <div className="flex items-center gap-2">
              {isTrustedStaff && (
                <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className="px-3.5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Админ ({authUser.role})
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Выйти из аккаунта"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('apply')}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Вступить в клан
              </button>
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Вход для администрации (Discord OAuth2 / Google)"
              >
                <Lock className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-[#121218] border-b border-white/[0.08] px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: 'home', label: 'Главная' },
          { id: 'about', label: 'О клане' },
          { id: 'roster', label: `Состав (${roster.length})` },
          { id: 'top', label: 'Топ клана' },
          { id: 'apply', label: 'Вступление' },
          ...(isTrustedStaff ? [{ id: 'admin', label: 'Админ-панель' }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as PageTab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-rose-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="flex-1">
        {/* ================= 1. ГЛАВНАЯ ================= */}
        {activeTab === 'home' && (
          <>
            {/* HERO SECTION */}
            <section className="relative overflow-hidden border-b border-white/[0.08]">
              <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-12 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                  <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-rose-500/40 bg-[#121218] shrink-0">
                        <ResilientImage
                          src={CLAN_CREST_URL}
                          alt="Логотип клана CURS"
                          fallbackTitle="CURS"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs text-slate-400">
                        <div className="text-rose-500 font-semibold">
                          Официальный портал клана CURS
                        </div>
                        <div>Counter-Strike 2 · Серверная сеть CrazyPub</div>
                      </div>
                    </div>

                    <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-semibold tracking-tight text-white leading-[1.12]">
                      Игровой клан <span className="text-rose-500">CURS</span> — доминирование и дисциплина на CrazyPub
                    </h1>

                    <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-[65ch]">
                      Элитное сообщество игроков Counter-Strike 2 на паблике CrazyPub. Командная
                      координация, прозрачный рейтинг, живое общение в Discord и отбор лучших
                      стрелков в основной ростер.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setActiveTab('apply')}
                        className="px-6 py-3.5 text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <span>Вступить в клан</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <a
                        href={CLAN_DISCORD_INVITE}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3.5 text-sm font-semibold bg-[#121218] hover:bg-white/10 text-white border border-white/15 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                      >
                        <Radio className="w-4 h-4 text-rose-500" />
                        <span>Наш Discord</span>
                      </a>
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#121218] aspect-video lg:aspect-[16/11]">
                      <ResilientImage
                        src={HERO_IMAGE_URL}
                        alt="Клан CURS на паблике CrazyPub CS2"
                        fallbackTitle="CURS · CS2"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#09090D] via-[#09090D]/40 to-transparent" />
                      <div className="absolute bottom-0 inset-x-0 p-5 flex items-end justify-between gap-4">
                        <div>
                          <div className="text-xs text-slate-300">
                            Актуальный статус · Паблик CrazyPub
                          </div>
                          <div className="text-sm font-semibold text-white mt-0.5">
                            Открыт набор в первый основной состав ({roster.length} из 6 мест занято)
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('roster')}
                          className="text-xs font-semibold text-rose-400 hover:text-rose-300 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Состав →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* DISCORD LIVE ONLINE + MINI-TOP CRAZYPUB */}
            <section className="py-16 lg:py-20 border-b border-white/[0.08]">
              <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  {/* Discord community link without online counters */}
                  <div className="lg:col-span-5 bg-[#121218] border border-white/[0.08] rounded-xl p-6 sm:p-8 flex flex-col justify-center gap-5">
                    <div className="text-xs text-rose-400 font-semibold">Сообщество CURS</div>
                    <h2 className="text-2xl font-semibold text-white">Наш Discord</h2>
                    <p className="text-sm text-slate-400">Общайся с участниками клана, находи команду и узнавай о событиях.</p>
                    <a href={CLAN_DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors">Присоединиться к Discord ↗</a>
                  </div>

                  {/* Mini-Top CrazyPub Block (7 cols) */}
                  <div className="lg:col-span-7 bg-[#121218] border border-white/[0.08] rounded-xl p-6 sm:p-8 flex flex-col justify-between">
                    <div className="space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-xs text-rose-400 font-semibold">
                            Рейтинг CrazyPub · Автосинхронизация
                          </div>
                          <h2 className="text-xl font-semibold text-white mt-1">
                            Мини-топ игроков клана CURS
                          </h2>
                        </div>
                        <span className="text-xs text-slate-400 font-mono-tabular">
                          Обновлено {leaderboard?.updatedMinutesAgo ?? 0} мин. назад
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-white/[0.08] rounded-lg bg-[#09090D]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/[0.08] text-xs text-slate-400">
                              <th className="py-3 px-4 font-medium">Место</th>
                              <th className="py-3 px-4 font-medium">Никнейм</th>
                              <th className="py-3 px-4 font-medium">Очки</th>
                              <th className="py-3 px-4 font-medium">K/D</th>
                              <th className="py-3 px-4 font-medium">HS%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06] text-xs sm:text-sm">
                            {(leaderboard?.entries || []).slice(0, 5).map((row) => (
                              <tr key={row.place} className="hover:bg-white/[0.02]">
                                <td className="py-3 px-4 font-mono-tabular font-semibold text-rose-400">
                                  #{row.place}
                                </td>
                                <td className="py-3 px-4 font-semibold text-white">
                                  {row.nickname}
                                </td>
                                <td className="py-3 px-4 font-mono-tabular text-slate-200">
                                  {row.points}
                                </td>
                                <td className="py-3 px-4 font-mono-tabular text-emerald-400 font-semibold">
                                  {row.kdRatio}
                                </td>
                                <td className="py-3 px-4 font-mono-tabular text-slate-300">
                                  {row.headshotPct}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
                      <a
                        href={leaderboard?.sourceUrl || 'https://crazypub.cs2.ru/top'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
                      >
                        <span>Источник: CrazyPub Rating</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => setActiveTab('top')}
                        className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Открыть полную таблицу рейтинга →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CLAN NEWS & ANNOUNCEMENTS */}
            <section className="py-16 lg:py-20">
              <div className="max-w-[1280px] mx-auto px-6 lg:px-12 space-y-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xs text-rose-400 font-semibold mb-1">
                      Официальная лента клана
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                      Новости и объявления CURS
                    </h2>
                  </div>
                </div>

                <label className="block max-w-md">
                  <span className="sr-only">Поиск новостей</span>
                  <input type="search" value={newsSearch} onChange={(event) => setNewsSearch(event.target.value)} placeholder="Поиск по новостям и категориям" className="w-full rounded-xl border border-white/15 bg-[#15151d] px-4 py-3 text-white placeholder:text-slate-400 focus:border-rose-500 focus:outline-none" />
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {news.filter(item => [item.title,item.content,item.category].some(value => value.toLowerCase().includes(newsSearch.trim().toLowerCase()))).map((item) => (
                    <article
                      key={item.id}
                      className="bg-[#121218] border border-white/[0.08] rounded-xl p-6 sm:p-8 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="text-rose-400 font-semibold">{item.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>Автор: {item.authorName}</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                        <p className="text-sm text-slate-300 leading-relaxed">{item.content}</p>
                      </div>

                      {item.driveFileUrl && (
                        <div className="mt-5 pt-4 border-t border-white/[0.08]">
                          <a
                            href={item.driveFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Открыть прикреплённый материал в Google Drive</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ================= 2. О КЛАНЕ (ИСТОРИЯ, ПРАВИЛА, ЦЕЛИ + GOOGLE DRIVE) ================= */}
        {activeTab === 'about' && (
          <section className="py-12 lg:py-20">
            <div className="max-w-[1280px] mx-auto px-6 lg:px-12 space-y-14">
              {/* History & Goals */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 bg-[#121218] border border-white/[0.08] rounded-xl p-6 sm:p-8 space-y-4">
                  <div className="text-xs text-rose-400 font-semibold">
                    01. История клана CURS
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-white">
                    От стака регулярных игроков паблика до организованного клана CrazyPub
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Клан CURS зародился на паблик-серверах CrazyPub в Counter-Strike 2, когда
                    ведущие игроки вечернего прайм-тайма решили объединиться под единым тегом для
                    командного контроля карты и участия в субботних клан-варах 5x5.
                  </p>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Мы ставим перед собой цель собрать дисциплинированный ростер без токсичности и
                    хаоса, где каждый участник знает свою позицию, раскидки гранат и поддерживает
                    соклановцев в каждом раунде.
                  </p>
                </div>

                <div className="lg:col-span-5 bg-[#121218] border border-white/[0.08] rounded-xl p-6 sm:p-8 space-y-4">
                  <div className="text-xs text-rose-400 font-semibold">
                    02. Стратегические цели на сезон
                  </div>
                  <h2 className="text-xl font-semibold text-white">
                    Задачи основного и паблик-состава
                  </h2>
                  <ul className="space-y-3 text-sm text-slate-300">
                    <li>
                      <strong className="text-white">Удержание Топ-1 CrazyPub:</strong> сохранение
                      лидирующих позиций игроков с префиксом [CURS] в общем рейтинге сервера.
                    </li>
                    <li>
                      <strong className="text-white">Комплектация 1-го состава:</strong> отбор 5
                      основных игроков и 2 запасных по заявкам на сайте.
                    </li>
                    <li>
                      <strong className="text-white">Еженедельные клан-вары:</strong> победы в
                      субботних матчах Bo3 против соперников по паблику.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Clan Rules */}
              <div className="space-y-6">
                <div>
                  <div className="text-xs text-rose-400 font-semibold mb-1">
                    03. Официальный устав
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                    Правила клана CURS
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {CLAN_RULES.map((section) => (
                    <div
                      key={section.id}
                      className="bg-[#121218] border border-white/[0.08] rounded-xl p-6 sm:p-8 space-y-5"
                    >
                      <div className="border-b border-white/[0.08] pb-4">
                        <div className="text-xs text-rose-400 font-semibold">
                          Раздел {section.number} · {section.category}
                        </div>
                        <h3 className="text-xl font-semibold text-white mt-1">
                          {section.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">{section.summary}</p>
                      </div>

                      <div className="divide-y divide-white/[0.06]">
                        {section.clauses.map((c) => (
                          <div
                            key={c.code}
                            className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1 max-w-3xl">
                              <div className="text-xs font-mono-tabular text-rose-400 font-semibold">
                                {c.code}
                              </div>
                              <p className="text-sm text-slate-200">{c.text}</p>
                            </div>
                            <div className="text-xs font-semibold text-amber-400 sm:text-right shrink-0">
                              {c.penalty}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Google Drive Integration Vault */}
              <GoogleDriveVault
                exportPayload={{
                  clan: 'CURS',
                  rosterCount: roster.length,
                  roster,
                  crazyPubTop: leaderboard?.entries || [],
                }}
              />
            </div>
          </section>
        )}

        {/* ================= 3. СОСТАВ (ПУСТОЙ ДО ИЗБРАНИЯ + ВАКАНСИИ) ================= */}
        {activeTab === 'roster' && (
          <section className="py-12 lg:py-20">
            <div className="max-w-[1280px] mx-auto px-6 lg:px-12 space-y-12">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                  <div className="text-xs text-rose-400 font-semibold mb-1">
                    Официальный ростер клана CURS
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-semibold text-white">
                    Состав участников клана
                  </h1>
                  <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                    {roster.length === 0
                      ? 'Список состава пуст, так как основной состав ещё не избран. Администрация принимает заявки кандидатов.'
                      : `Утверждено участников в основном составе: ${roster.length}.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('apply')}
                  className="px-5 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors whitespace-nowrap self-start cursor-pointer"
                >
                  Подать заявку в состав
                </button>
              </div>

              {roster.length === 0 ? (
                <div className="bg-[#121218] border border-white/10 rounded-xl p-8 sm:p-12 text-center max-w-3xl mx-auto">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-rose-500" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-white">
                    Состав клана CURS ещё не избран
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 max-w-xl mx-auto leading-relaxed">
                    В настоящий момент все места в боевом ростере вакантны. Оставьте заявку во
                    вкладке «Вступление» — после утверждения Лидером или Заместителем в закрытой
                    админ-панели ваша карточка с ролью и аватаркой появится здесь.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {roster.map((member) => (
                    <div
                      key={member.id}
                      className="bg-[#121218] border border-white/[0.08] rounded-xl p-6 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-[#09090D] shrink-0">
                            <ResilientImage
                              src={member.avatarUrl || CLAN_CREST_URL}
                              alt={member.nickname}
                              fallbackTitle={member.nickname}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="text-xs text-rose-400 font-semibold">
                              {member.role}
                            </div>
                            <h3 className="text-lg font-semibold text-white">
                              [CURS] {member.nickname}
                            </h3>
                            <div className="text-xs text-slate-400">{member.discordTag}</div>
                          </div>
                        </div>

                        <p className="text-sm text-slate-300 leading-relaxed">{member.bio}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs">
                        <span className="text-slate-400">K/D на CrazyPub</span>
                        <span className="font-mono-tabular font-semibold text-emerald-400">
                          {member.kdRatio}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Vacant Role Slots */}
              <div className="pt-6 border-t border-white/[0.08]">
                <h3 className="text-lg font-semibold text-white mb-5">
                  Открытые позиции для набора в CURS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {VACANT_ROLE_SLOTS.map((slot) => (
                    <div
                      key={slot.role}
                      className="bg-[#121218] border border-white/[0.08] rounded-xl p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs text-slate-400 mb-1">
                          Свободно слотов: {slot.slotsCount} · Ориентир {slot.minKd}
                        </div>
                        <h4 className="text-base font-semibold text-white">{slot.role}</h4>
                        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                          {slot.duties}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAppRole(slot.role);
                          setActiveTab('apply');
                        }}
                        className="mt-4 py-2 px-3 text-xs font-semibold bg-white/5 hover:bg-rose-600 text-white rounded-lg transition-colors cursor-pointer"
                      >
                        Подать заявку на роль «{slot.role}»
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= 4. ТОП КЛАНА С CRAZYPUB ================= */}
        {activeTab === 'top' && (
          <section className="py-12 lg:py-20">
            <div className="max-w-[1280px] mx-auto px-6 lg:px-12 space-y-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs text-rose-400 font-semibold mb-1">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Серверный парсер и кэш · 5–10 минут TTL</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-semibold text-white">
                    Полная таблица рейтинга клана CURS на CrazyPub
                  </h1>
                  <p className="text-sm text-slate-400 mt-2">
                    Статистика синхронизируется автоматически на сервере. При временной
                    недоступности внешнего сайта отображается последний сохранённый кэш.
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start">
                  <span className="text-xs text-slate-400 font-mono-tabular">
                    Обновлено {leaderboard?.updatedMinutesAgo ?? 0} минут назад
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchLeaderboard(true)}
                    disabled={loadingLeaderboard}
                    className="px-4 py-2 text-xs font-semibold bg-[#121218] hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLeaderboard ? 'animate-spin' : ''}`} />
                    <span>Обновить данные</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#121218] border border-white/[0.08] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-xs text-slate-400">
                        <th className="py-3.5 px-5 font-medium">Место</th>
                        <th className="py-3.5 px-5 font-medium">Никнейм игрока</th>
                        <th className="py-3.5 px-5 font-medium">Клан</th>
                        <th className="py-3.5 px-5 font-medium">Очки рейтинга</th>
                        <th className="py-3.5 px-5 font-medium">K/D Ratio</th>
                        <th className="py-3.5 px-5 font-medium">Headshots</th>
                        <th className="py-3.5 px-5 font-medium">Фраги</th>
                        <th className="py-3.5 px-5 font-medium">Время на сервере</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06] text-sm">
                      {(leaderboard?.entries || []).map((row) => (
                        <tr key={row.place} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-5 font-mono-tabular font-semibold text-rose-400">
                            #{row.place}
                          </td>
                          <td className="py-4 px-5 font-semibold text-white">{row.nickname}</td>
                          <td className="py-4 px-5 text-xs text-slate-300">{row.clanTag}</td>
                          <td className="py-4 px-5 font-mono-tabular font-semibold text-white">
                            {row.points}
                          </td>
                          <td className="py-4 px-5 font-mono-tabular text-emerald-400 font-semibold">
                            {row.kdRatio}
                          </td>
                          <td className="py-4 px-5 font-mono-tabular text-slate-300">
                            {row.headshotPct}
                          </td>
                          <td className="py-4 px-5 font-mono-tabular text-slate-300">
                            {row.kills}
                          </td>
                          <td className="py-4 px-5 font-mono-tabular text-slate-400">
                            {row.playtimeHours} ч
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400 pt-2">
                <div>
                  Режим получения данных: серверный кэш / парсер ({leaderboard?.mode || 'cache'})
                </div>
                <a
                  href={leaderboard?.sourceUrl || 'https://crazypub.cs2.ru/top'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-400 hover:text-rose-300 font-semibold inline-flex items-center gap-1.5"
                >
                  <span>Официальный источник рейтинга CrazyPub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ================= 5. ВСТУПЛЕНИЕ (ФОРМА ЗАЯВКИ В БД) ================= */}
        {activeTab === 'apply' && (
          <section className="py-12 lg:py-20">
            <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-5 space-y-6">
                  <div>
                    <div className="text-xs text-rose-400 font-semibold mb-1">
                      Отбор в клан CURS · Запись в PostgreSQL
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-white">
                      Форма заявки на вступление
                    </h1>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                      Заполните все поля анкеты. Заявка проходит серверную валидацию, сохраняется в
                      базу данных PostgreSQL и сразу отображается в закрытой панели администрации
                      клана.
                    </p>
                  </div>

                  <div className="bg-[#121218] border border-white/[0.08] rounded-xl p-6 space-y-3 text-xs text-slate-300">
                    <div className="font-semibold text-white text-sm">
                      Требования к кандидатам CURS:
                    </div>
                    <p>01. Возраст от 16 лет (возможны исключения по решению Лидера).</p>
                    <p>02. Показатель K/D на паблике CrazyPub не ниже 1.35.</p>
                    <p>03. Наличие рабочего микрофона и присутствие на Discord-сервере клана.</p>
                    <a href={CLAN_DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-amber-400 underline underline-offset-4 hover:text-amber-300">Вступить в Discord клана CURS ↗</a>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <form
                    onSubmit={handleSubmitApplication}
                    className="bg-[#121218] border border-white/10 rounded-xl p-6 sm:p-8 space-y-5"
                  >
                    {appSuccessMessage && (
                      <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-lg flex items-start gap-3 text-xs sm:text-sm text-emerald-200">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{appSuccessMessage}</span>
                      </div>
                    )}

                    {appErrorMessage && (
                      <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-lg flex items-start gap-3 text-xs sm:text-sm text-rose-200">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{appErrorMessage}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="app-nick" className="block text-xs text-slate-300 mb-2">
                          Игровой никнейм на CrazyPub *
                        </label>
                        <input
                          id="app-nick"
                          type="text"
                          required
                          value={appNick}
                          onChange={(e) => setAppNick(e.target.value)}
                          placeholder="Например: K1ngShatter"
                          className="w-full px-3.5 py-2.5 text-sm bg-[#09090D] border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="app-age" className="block text-xs text-slate-300 mb-2">
                          Ваш возраст *
                        </label>
                        <input
                          id="app-age"
                          type="number"
                          min="12"
                          max="65"
                          required
                          value={appAge}
                          onChange={(e) => setAppAge(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-[#09090D] border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="app-role" className="block text-xs text-slate-300 mb-2">
                          Желаемая роль в составе *
                        </label>
                        <select
                          id="app-role"
                          value={appRole}
                          onChange={(e) => setAppRole(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm bg-[#09090D] border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500"
                        >
                          <option value="Энтри-фраггер">Энтри-фраггер</option>
                          <option value="Снайпер (AWP)">Снайпер (AWP)</option>
                          <option value="Капитан (IGL)">Капитан (IGL)</option>
                          <option value="Опорник">Опорник</option>
                          <option value="Люрковод">Люрковод</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="app-kd" className="block text-xs text-slate-300 mb-2">
                          Текущий K/D на CrazyPub *
                        </label>
                        <input
                          id="app-kd"
                          type="text"
                          required
                          value={appKd}
                          onChange={(e) => setAppKd(e.target.value)}
                          placeholder="1.65"
                          className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-[#09090D] border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="app-discord" className="block text-xs text-slate-300 mb-2">
                        Ссылка на профиль или тег Discord *
                      </label>
                      <input
                        id="app-discord"
                        type="text"
                        required
                        value={appDiscord}
                        onChange={(e) => setAppDiscord(e.target.value)}
                        placeholder="Ваш Discord username (например, player123)"
                        className="w-full px-3.5 py-2.5 text-sm bg-[#09090D] border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="app-exp" className="block text-xs text-slate-300 mb-2">
                        Ваш игровой опыт (часы в CS2, Faceit Elo, прайм-тайм на CrazyPub) *
                      </label>
                      <textarea
                        id="app-exp"
                        rows={3}
                        required
                        value={appExperience}
                        onChange={(e) => setAppExperience(e.target.value)}
                        placeholder="Опишите ваш опыт игры, любимые карты и время онлайна..."
                        className="w-full px-3.5 py-2.5 text-sm bg-[#09090D] border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="rounded-lg border border-white/10 bg-[#09090D] p-4 space-y-3">
                      <label htmlFor="app-captcha" className="block text-sm text-slate-200">Проверка от спама · {captchaQuestion || 'Загрузка...'}</label>
                      <div className="flex gap-3">
                        <input id="app-captcha" type="number" required value={captchaAnswer} onChange={e => setCaptchaAnswer(e.target.value)} placeholder="Ответ" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#121218] px-3 py-2 text-white" />
                        <button type="button" onClick={() => void refreshCaptcha()} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-200">Другой пример</button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={appSubmitting || !captchaToken || !captchaAnswer}
                      className="w-full py-3.5 px-6 text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {appSubmitting ? 'Сохранение в БД...' : 'Отправить заявку в клан CURS'}
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= 6. ЗАКРЫТАЯ АДМИН-ПАНЕЛЬ (RBAC) ================= */}
        {activeTab === 'admin' && (
          <section className="py-12 lg:py-20">
            <div className="max-w-[1280px] mx-auto px-6 lg:px-12 space-y-8">
              {!isTrustedStaff ? (
                <div className="bg-[#121218] border border-rose-500/40 rounded-xl p-10 text-center max-w-xl mx-auto space-y-4">
                  <Lock className="w-10 h-10 text-rose-500 mx-auto" />
                  <h1 className="text-2xl font-semibold text-white">
                    Доступ запрещён (403 Forbidden)
                  </h1>
                  <p className="text-sm text-slate-300">
                    Раздел «Админ-панель» защищён серверным middleware и доступен только
                    авторизованным доверенным лицам клана CURS (Лидер, Заместитель, Модератор).
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(true)}
                    className="px-5 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Авторизоваться через Discord OAuth2 / Google
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
                    <div>
                      <div className="text-xs text-rose-400 font-semibold mb-1">
                        Закрытая серверная панель управления · Сессия подтверждена
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-semibold text-white">
                        Штаб администрации клана CURS
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Вы вошли как <strong className="text-white">{authUser.displayName}</strong> ·
                        Уровень доступа:{' '}
                        <strong className="text-rose-400">{ROLE_LABELS[authUser.role]}</strong>
                      </p>
                    </div>

                    {/* Sub-navigation according to RBAC role */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#121218] border border-white/10 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setAdminSubTab('applications')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          adminSubTab === 'applications'
                            ? 'bg-rose-600 text-white font-semibold'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Заявки ({adminApplications.length})
                      </button>

                      {['leader', 'deputy'].includes(authUser.role) && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAdminSubTab('roster')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                              adminSubTab === 'roster'
                                ? 'bg-rose-600 text-white font-semibold'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            Состав ({roster.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdminSubTab('news')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                              adminSubTab === 'news'
                                ? 'bg-rose-600 text-white font-semibold'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            Новости
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setAdminSubTab('notes')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          adminSubTab === 'notes'
                            ? 'bg-rose-600 text-white font-semibold'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Заметки ({adminNotes.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminSubTab('logs')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          adminSubTab === 'logs'
                            ? 'bg-rose-600 text-white font-semibold'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Журнал действий
                      </button>

                      {authUser.role === 'leader' && (
                        <button
                          type="button"
                          onClick={() => setAdminSubTab('roles')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                            adminSubTab === 'roles'
                              ? 'bg-rose-600 text-white font-semibold'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          Роли и Админы
                        </button>
                      )}
                    </div>
                  </div>

                  {adminFeedback && (
                    <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-lg flex items-center justify-between text-xs sm:text-sm text-emerald-200">
                      <span>{adminFeedback}</span>
                      <button
                        type="button"
                        onClick={() => setAdminFeedback(null)}
                        className="text-emerald-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {adminError && (
                    <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-lg flex items-center justify-between text-xs sm:text-sm text-rose-200">
                      <span>{adminError}</span>
                      <button
                        type="button"
                        onClick={() => setAdminError(null)}
                        className="text-rose-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* SUB-TAB 1: APPLICATIONS (Leader, Deputy, Moderator) */}
                  {adminSubTab === 'applications' && (
                    <div className="bg-[#121218] border border-white/[0.08] rounded-xl p-6 space-y-4">
                      <h2 className="text-lg font-semibold text-white">
                        Заявки на вступление из базы данных PostgreSQL
                      </h2>
                      {adminApplications.length === 0 ? (
                        <p className="text-sm text-slate-400 py-6">
                          Заявок пока нет. Оставьте тестовую заявку во вкладке «Вступление».
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {adminApplications.map((app) => (
                            <div
                              key={app.id}
                              className="p-4 bg-[#09090D] border border-white/10 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <span className="font-mono-tabular text-rose-400">
                                    Заявка #{app.id}
                                  </span>
                                  <span>·</span>
                                  <span>Возраст: {app.age}</span>
                                  <span>·</span>
                                  <span>Роль: {app.role}</span>
                                  <span>·</span>
                                  <span>K/D: {app.kdRatio}</span>
                                  <span>·</span>
                                  <span
                                    className={
                                      app.status === 'accepted'
                                        ? 'text-emerald-400 font-semibold'
                                        : app.status === 'rejected'
                                        ? 'text-rose-400 font-semibold'
                                        : 'text-amber-400 font-semibold'
                                    }
                                  >
                                    {app.status === 'accepted'
                                      ? 'Принята'
                                      : app.status === 'rejected'
                                      ? 'Отклонена'
                                      : 'Ожидает решения'}
                                  </span>
                                </div>
                                <div className="text-base font-semibold text-white">
                                  {app.nickname}{' '}
                                  <span className="text-xs font-normal text-slate-400">
                                    (Discord: {app.discordLink})
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300">{app.experience}</p>
                              </div>

                              {app.status === 'pending' && (
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAdminApplicationDecision(app.id, 'accepted', true)
                                    }
                                    className="px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
                                  >
                                    Принять + В состав
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAdminApplicationDecision(app.id, 'rejected', false)
                                    }
                                    className="px-3 py-2 text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Отклонить
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 2: ROSTER MANAGEMENT (Leader & Deputy) */}
                  {adminSubTab === 'roster' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <form
                        onSubmit={handleAdminAddMember}
                        className="lg:col-span-5 bg-[#121218] border border-white/[0.08] rounded-xl p-6 space-y-4"
                      >
                        <h3 className="text-base font-semibold text-white">
                          Добавить игрока в состав CURS
                        </h3>
                        <div>
                          <label className="block text-xs text-slate-300 mb-1">Никнейм *</label>
                          <input
                            type="text"
                            required
                            value={newMemberNick}
                            onChange={(e) => setNewMemberNick(e.target.value)}
                            placeholder="Vortex"
                            className="w-full px-3 py-2 text-sm bg-[#09090D] border border-white/10 rounded-lg text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-300 mb-1">Роль</label>
                            <select
                              value={newMemberRole}
                              onChange={(e) => setNewMemberRole(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-[#09090D] border border-white/10 rounded-lg text-white"
                            >
                              <option value="Капитан (IGL)">Капитан (IGL)</option>
                              <option value="Снайпер (AWP)">Снайпер (AWP)</option>
                              <option value="Энтри-фраггер">Энтри-фраггер</option>
                              <option value="Опорник">Опорник</option>
                              <option value="Люрковод">Люрковод</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-300 mb-1">K/D</label>
                            <input
                              type="text"
                              value={newMemberKd}
                              onChange={(e) => setNewMemberKd(e.target.value)}
                              className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#09090D] border border-white/10 rounded-lg text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-300 mb-1">Discord тег</label>
                          <input
                            type="text"
                            value={newMemberDiscord}
                            onChange={(e) => setNewMemberDiscord(e.target.value)}
                            placeholder="vortex_cs2"
                            className="w-full px-3 py-2 text-sm bg-[#09090D] border border-white/10 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-300 mb-1">Описание</label>
                          <textarea
                            rows={2}
                            value={newMemberBio}
                            onChange={(e) => setNewMemberBio(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[#09090D] border border-white/10 rounded-lg text-white"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2.5 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Добавить в состав
                        </button>
                      </form>

                      <div className="lg:col-span-7 bg-[#121218] border border-white/[0.08] rounded-xl p-6 space-y-4">
                        <h3 className="text-base font-semibold text-white">
                          Текущие участники состава ({roster.length})
                        </h3>
                        {roster.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            В составе пока никого нет. Добавьте игрока слева или примите заявку.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {roster.map((m) => (
                              <div
                                key={m.id}
                                className="p-3.5 bg-[#09090D] border border-white/10 rounded-lg flex flex-wrap items-center justify-between gap-3"
                              >
                                <div>
                                  <div className="text-sm font-semibold text-white">
                                    [CURS] {m.nickname}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    K/D: {m.kdRatio} · {m.discordTag}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={m.role}
                                    onChange={(e) =>
                                      handleAdminUpdateMemberRole(m.id, e.target.value)
                                    }
                                    className="px-2.5 py-1.5 text-xs bg-[#121218] border border-white/10 rounded text-white"
                                  >
                                    <option value="Капитан (IGL)">Капитан (IGL)</option>
                                    <option value="Снайпер (AWP)">Снайпер (AWP)</option>
                                    <option value="Энтри-фраггер">Энтри-фраггер</option>
                                    <option value="Опорник">Опорник</option>
                                    <option value="Люрковод">Люрковод</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminRemoveMember(m.id)}
                                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                                    title="Удалить из состава"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 3: NEWS & GOOGLE DRIVE ATTACHMENT (Leader & Deputy) */}
                  {adminSubTab === 'news' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <form
                          onSubmit={handleAdminPublishNews}
                          className="lg:col-span-6 bg-[#121218] border border-white/[0.08] rounded-xl p-6 space-y-4"
                        >
                          <h3 className="text-base font-semibold text-white">
                            Опубликовать новость или объявление
                          </h3>
                          <div>
                            <label className="block text-xs text-slate-300 mb-1">Заголовок *</label>
                            <input
                              type="text"
                              required
                              value={newsTitle}
                              onChange={(e) => setNewsTitle(e.target.value)}
                              placeholder="Расписание субботних клан-варов CURS"
                              className="w-full px-3 py-2 text-sm bg-[#09090D] border border-white/10 rounded-lg text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-300 mb-1">Рубрика</label>
                            <input
                              type="text"
                              value={newsCategory}
                              onChange={(e) => setNewsCategory(e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-[#09090D] border border-white/10 rounded-lg text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-300 mb-1">
                              Ссылка на файл Google Drive (необязательно)
                            </label>
                            <input
                              type="text"
                              value={newsDriveUrl}
                              onChange={(e) => setNewsDriveUrl(e.target.value)}
                              placeholder="Выберите файл из Google Drive ниже или вставьте ссылку"
                              className="w-full px-3 py-2 text-xs bg-[#09090D] border border-white/10 rounded-lg text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-300 mb-1">
                              Текст объявления *
                            </label>
                            <textarea
                              rows={4}
                              required
                              value={newsContent}
                              onChange={(e) => setNewsContent(e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-[#09090D] border border-white/10 rounded-lg text-white"
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full py-2.5 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
                          >
                            Опубликовать новость
                          </button>
                        </form>

                        <div className="lg:col-span-6 bg-[#121218] border border-white/[0.08] rounded-xl p-6 space-y-4">
                          <h3 className="text-base font-semibold text-white">
                            Опубликованные новости ({news.length})
                          </h3>
                          <div className="space-y-3">
                            {news.map((n) => (
                              <div
                                key={n.id}
                                className="p-3.5 bg-[#09090D] border border-white/10 rounded-lg flex items-start justify-between gap-3"
                              >
                                <div>
                                  <div className="text-xs text-rose-400">{n.category}</div>
                                  <div className="text-sm font-semibold text-white">{n.title}</div>
                                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                    {n.content}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAdminDeleteNews(n.id)}
                                  className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <GoogleDriveVault
                        onSelectFileUrl={(url, name) => {
                          setNewsDriveUrl(url);
                          setAdminFeedback(
                            `Файл «${name}» из Google Drive прикреплён к форме новости.`
                          );
                        }}
                        exportPayload={{
                          clan: 'CURS',
                          applications: adminApplications,
                          roster,
                          auditLogs: adminLogs,
                        }}
                      />
                    </div>
                  )}

                  {/* SUB-TAB 4: CLOSED ADMIN NOTES */}
                  {adminSubTab === 'notes' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <form
                        onSubmit={handleAdminAddNote}
                        className="lg:col-span-5 bg-[#121218] border border-white/[0.08] rounded-xl p-6 space-y-4"
                      >
                        <h3 className="text-base font-semibold text-white">
                          Добавить закрытую заметку для администрации
                        </h3>
                        <div>
                          <label className="block text-xs text-slate-300 mb-1">Важность</label>
                          <select
                            value={notePriority}
                            onChange={(e) => setNotePriority(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-[#09090D] border border-white/10 rounded-lg text-white"
                          >
                            <option value="normal">Обычная</option>
                            <option value="high">Высокий приоритет</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-300 mb-1">
                            Текст заметки *
                          </label>
                          <textarea
                            rows={4}
                            required
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Внутренняя информация по проверке кандидатов или демок..."
                            className="w-full px-3 py-2 text-sm bg-[#09090D] border border-white/10 rounded-lg text-white"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2.5 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Сохранить заметку
                        </button>
                      </form>

                      <div className="lg:col-span-7 bg-[#121218] border border-white/[0.08] rounded-xl p-6 space-y-4">
                        <h3 className="text-base font-semibold text-white">
                          Закрытые заметки штаба ({adminNotes.length})
                        </h3>
                        <div className="space-y-3">
                          {adminNotes.map((note) => (
                            <div
                              key={note.id}
                              className="p-4 bg-[#09090D] border border-white/10 rounded-lg space-y-1"
                            >
                              <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>
                                  Автор: <strong className="text-white">{note.authorName}</strong> (
                                  {note.authorRole})
                                </span>
                                <span
                                  className={
                                    note.priority === 'high'
                                      ? 'text-rose-400 font-semibold'
                                      : 'text-slate-400'
                                  }
                                >
                                  {note.priority === 'high' ? 'Важно' : 'Заметка'}
                                </span>
                              </div>
                              <p className="text-sm text-slate-200">{note.noteText}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 5: AUDIT LOGS */}
                  {adminSubTab === 'logs' && (
                    <div className="bg-[#121218] border border-white/[0.08] rounded-xl p-6 space-y-4">
                      <h3 className="text-base font-semibold text-white">
                        Журнал действий администрации (Audit Log)
                      </h3>
                      <div className="overflow-x-auto border border-white/[0.08] rounded-lg bg-[#09090D]">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.08] text-slate-400">
                              <th className="py-3 px-4">ID</th>
                              <th className="py-3 px-4">Администратор / Игрок</th>
                              <th className="py-3 px-4">Роль</th>
                              <th className="py-3 px-4">Действие</th>
                              <th className="py-3 px-4">Подробности</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06]">
                            {adminLogs.map((log) => (
                              <tr key={log.id}>
                                <td className="py-3 px-4 font-mono-tabular text-slate-400">
                                  #{log.id}
                                </td>
                                <td className="py-3 px-4 font-semibold text-white">
                                  {log.actorName}
                                </td>
                                <td className="py-3 px-4 text-rose-400">{log.actorRole}</td>
                                <td className="py-3 px-4 text-white">{log.action}</td>
                                <td className="py-3 px-4 text-slate-300">{log.details}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 6: LEADER ROLE MANAGEMENT */}
                  {adminSubTab === 'roles' && authUser.role === 'leader' && (
                    <div className="bg-[#121218] border border-white/[0.08] rounded-xl p-6 space-y-4">
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          Управление администраторами и ролями доступа (Только для Лидера)
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Вы можете переключать роли зарегистрированных пользователей для проверки
                          уровней доступа (Лидер, Заместитель, Модератор).
                        </p>
                      </div>

                      <div className="p-4 bg-[#09090D] border border-rose-500/20 rounded-lg space-y-3">
                        <h4 className="text-sm font-semibold text-white">Разработчики · Google</h4>
                        <p className="text-xs text-slate-400">Владелец: kitrusp0st@gmail.com. Добавляй Google-аккаунты по email. Доступ появится после входа через Google.</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input type="email" value={developerEmail} onChange={(e) => setDeveloperEmail(e.target.value)} placeholder="email@gmail.com" aria-label="Google email разработчика" className="flex-1 min-w-0 bg-[#121218] border border-white/15 rounded-lg px-3 py-2 text-sm text-white" />
                          <select value={developerRole} onChange={(e) => setDeveloperRole(e.target.value as 'deputy' | 'moderator')} aria-label="Роль разработчика" className="bg-[#121218] border border-white/15 rounded-lg px-3 py-2 text-sm text-white">
                            <option value="deputy">Разработчик</option>
                            <option value="moderator">Модератор</option>
                          </select>
                          <button type="button" onClick={handleInviteDeveloper} disabled={!developerEmail.includes('@')} className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold">Добавить</button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {adminUsers.map((u) => (
                          <div
                            key={u.id}
                            className="p-4 bg-[#09090D] border border-white/10 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {u.displayName || u.email}
                              </div>
                              <div className="text-xs text-slate-400">
                                {u.email} · UID: {u.uid}
                              </div>
                            </div>

                            <select
                              value={u.discordRole}
                              onChange={(e) =>
                                handleAdminChangeUserRole(u.id, e.target.value as AdminRole)
                              }
                              className="px-3 py-2 text-xs bg-[#121218] border border-white/15 rounded-lg text-white"
                            >
                              <option value="leader">Лидер (Полный доступ)</option>
                              <option value="deputy">Заместитель (Заявки, Состав, Новости)</option>
                              <option value="moderator">Модератор (Только заявки)</option>
                              <option value="member">Участник (Без доступа в админку)</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* ================= 7. ДОКУМЕНТАЦИЯ И НАСТРОЙКА ДЕПЛОЯ / DISCORD ================= */}
        {activeTab === 'docs' && (
          <section className="py-12 lg:py-20">
            <div className="max-w-[1280px] mx-auto px-6 lg:px-12 space-y-8">
              <div>
                <div className="text-xs text-rose-400 font-semibold mb-1">
                  Техническая документация проекта CURS
                </div>
                <h1 className="text-2xl sm:text-4xl font-semibold text-white">
                  Структура проекта, настройка Discord OAuth2 и инструкция по деплою
                </h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#121218] border border-white/[0.08] rounded-xl p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-rose-500" />
                    <span>1. Пошаговая настройка Discord OAuth2 и Бота</span>
                  </h2>
                  <div className="text-xs sm:text-sm text-slate-300 space-y-2.5 leading-relaxed">
                    <p>
                      1. Откройте{' '}
                      <a
                        href="https://discord.com/developers/applications"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rose-400 underline"
                      >
                        Discord Developer Portal
                      </a>{' '}
                      и создайте приложение <strong>CURS Clan Portal</strong>.
                    </p>
                    <p>
                      2. В разделе <strong>OAuth2 → Redirects</strong> добавьте два точных
                      Callback URL:
                    </p>
                    <pre className="p-3 bg-[#09090D] border border-white/10 rounded-lg font-mono-tabular text-xs text-rose-300 overflow-x-auto">
{`https://ais-dev-do24evwwqilmq37crv4z7k-259283500817.asia-southeast1.run.app/auth/callback
https://ais-pre-do24evwwqilmq37crv4z7k-259283500817.asia-southeast1.run.app/auth/callback`}
                    </pre>
                    <p>
                      3. В настройках вашего Discord-сервера откройте{' '}
                      <strong>Настройки сервера → Виджет (Widget)</strong> и включите{' '}
                      <em>«Включить виджет сервера»</em>. Скопируйте <strong>ID сервера</strong> в{' '}
                      <code>DISCORD_GUILD_ID</code>.
                    </p>
                    <p>
                      4. Скопируйте ID ролей Лидера, Заместителя и Модератора и укажите их в{' '}
                      <code>DISCORD_LEADER_ROLE_IDS</code>, <code>DISCORD_DEPUTY_ROLE_IDS</code> и{' '}
                      <code>DISCORD_MODERATOR_ROLE_IDS</code>.
                    </p>
                  </div>
                </div>

                <div className="bg-[#121218] border border-white/[0.08] rounded-xl p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-rose-500" />
                    <span>2. Структура проекта и Деплой (VPS / Cloud Run)</span>
                  </h2>
                  <pre className="p-3 bg-[#09090D] border border-white/10 rounded-lg font-mono-tabular text-xs text-slate-200 overflow-x-auto">
{`├── server.ts                  # Express + API Discord/CrazyPub + RBAC
├── firebase-applet-config.json # Конфигурация Firebase & Google Drive OAuth
├── .env.example               # Шаблон переменных окружения
└── src/
    ├── App.tsx                # Клиентское приложение клана CURS
    ├── components/
    │   ├── GoogleDriveVault.tsx # Интеграция с Google Drive API
    │   └── ResilientImage.tsx # Защищённый рендер медиа
    ├── db/
    │   ├── schema.ts          # Схема PostgreSQL (Drizzle ORM)
    │   ├── index.ts           # Пул соединений pg.Pool
    │   ├── queries.ts         # Типобезопасные запросы к БД
    │   └── drizzle.config.ts  # Конфигурация миграций Drizzle Kit
    ├── lib/
    │   ├── firebase.ts        # Клиентский OAuth + Google Drive scopes
    │   └── firebase-admin.ts  # Верификация токенов на сервере
    └── middleware/
        └── auth.ts            # Серверный RBAC и httpOnly cookie`}
                  </pre>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* QUIET FOOTER */}
      <footer className="border-t border-white/[0.08] py-10 px-6 lg:px-12 bg-[#09090D]">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs text-slate-400">
          <div className="space-y-1">
            <div className="font-display text-sm font-semibold text-white">CURS</div>
            <p>Официальный сайт клана CURS · Counter-Strike 2 · CrazyPub.</p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Главная
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              О клане и Google Drive
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Состав ({roster.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('top')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Топ CrazyPub
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('docs')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Документация и Деплой
            </button>
            <a
              href="/api/download-site-zip"
              download="curs-clan-site.zip"
              className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать ZIP сайта</span>
            </a>
            {!authUser && (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Вход для персонала
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Staff Authentication Modal (Discord OAuth2 + Google Sign-In) */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowAuthModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-[#121218] border border-white/10 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-rose-400 font-semibold mb-1">
                  Закрытая авторизация персонала CURS
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Вход в панель администрации
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Вкладка «Админ-панель» скрыта от обычных посетителей. Авторизуйтесь через{' '}
              <strong className="text-white">Discord OAuth2</strong> (проверка ролей Лидер /
              Заместитель / Модератор на сервере клана) или через аккаунт владельца{' '}
              <strong className="text-white">Google</strong>.
            </p>

            {authError && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-lg text-xs text-rose-200">
                {authError}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDiscordOAuthConnect}
                className="w-full py-3 px-4 text-xs sm:text-sm font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Войти через Discord OAuth2</span>
              </button>

              <button
                type="button"
                onClick={handleGoogleAdminLogin}
                className="gsi-material-button w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-3 cursor-pointer"
              >
                <div className="gsi-material-button-icon w-4 h-4">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents">Sign in with Google (Лидер)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
