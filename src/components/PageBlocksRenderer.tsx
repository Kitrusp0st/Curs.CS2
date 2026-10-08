import React from 'react';
import {
  Users,
  Trophy,
  Radio,
  ExternalLink,
  ChevronRight,
  FileText,
  Pin,
} from 'lucide-react';
import { CustomPageBlock } from '../data/defaultCmsContent';
import { ResilientImage } from './ResilientImage';
import { soundEngine } from '../lib/soundEffects';

export interface DiscordStatusData {
  guildName: string;
  onlineCount: number;
  totalMembers: number;
  inviteUrl: string;
  voiceActiveCount: number;
  onlineMembersSample: Array<{ id: string; username: string; status: string; game?: string }>;
  updatedAt: number;
  isLiveApi: boolean;
}

export interface LeaderboardEntryData {
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

export interface RosterMemberData {
  id: number;
  nickname: string;
  role: string;
  status?: string;
  avatarUrl: string;
  kdRatio: string;
  discordTag: string;
  bio: string;
  joinedDate?: string;
}

export interface ClanRoleData {
  id: number;
  name: string;
  color: string;
  displayOrder: number;
}

export interface ClanNewsData {
  id: number;
  title: string;
  content: string;
  category: string;
  coverUrl?: string;
  status?: string;
  isPinned?: boolean;
  publishedDate?: string;
  authorName: string;
  driveFileUrl?: string;
}

interface PageBlocksRendererProps {
  blocks: CustomPageBlock[];
  logoUrl: string;
  discordInviteFallback: string;
  discordStatus: DiscordStatusData | null;
  topEntries: LeaderboardEntryData[];
  roster: RosterMemberData[];
  clanRoles: ClanRoleData[];
  news: ClanNewsData[];
  onNavigateTab: (tabId: string) => void;
}

export const PageBlocksRenderer: React.FC<PageBlocksRendererProps> = ({
  blocks,
  logoUrl,
  discordInviteFallback,
  discordStatus,
  topEntries,
  roster,
  clanRoles,
  news,
  onNavigateTab,
}) => {
  const handleActionLink = (url?: string) => {
    soundEngine.playClick();
    if (!url) return;
    if (url.startsWith('tab:')) {
      onNavigateTab(url.replace('tab:', ''));
      return;
    }
    if (url.startsWith('/')) {
      const slug = url.replace(/^\//, '');
      onNavigateTab(slug || 'home');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getRoleColor = (roleName: string): string => {
    const found = clanRoles.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
    return found?.color || '#e11d48';
  };

  return (
    <div className="space-y-10">
      {blocks.map((block) => {
        // 1. HERO BLOCK
        if (block.type === 'hero') {
          return (
            <div
              key={block.id}
              className="relative rounded-2xl overflow-hidden border border-white/10 min-h-[420px] flex items-center"
            >
              <div className="absolute inset-0 z-0">
                <ResilientImage
                  src={
                    block.imageUrl ||
                    '/src/assets/images/cs2_curs_hero_banner_1791453811574.jpg'
                  }
                  alt={block.title || 'CURS Hero'}
                  className="w-full h-full object-cover object-center opacity-40"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(9,9,13,0.96) 0%, rgba(9,9,13,0.82) 55%, rgba(9,9,13,0.45) 100%)',
                  }}
                />
              </div>

              <div className="relative z-10 p-6 sm:p-12 max-w-3xl space-y-5">
                <div className="inline-flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/15 bg-black/50 shrink-0">
                    <ResilientImage
                      src={logoUrl}
                      alt="CURS Crest"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-curs-accent">
                    {block.subtitle || 'Counter-Strike 2 · Клан CURS на CrazyPub'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                  {block.title || 'Игровой клан CURS — доминирование на CrazyPub'}
                </h1>

                {block.content && (
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                    {block.content}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <button
                    type="button"
                    onMouseEnter={() => soundEngine.playHover()}
                    onClick={() => handleActionLink(block.buttonUrl || 'tab:apply')}
                    className="btn-curs-primary px-6 py-3.5 text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>{block.buttonText || 'Вступить в клан'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {(block.secondaryButtonText || block.secondaryButtonUrl) && (
                    <button
                      type="button"
                      onMouseEnter={() => soundEngine.playHover()}
                      onClick={() =>
                        handleActionLink(block.secondaryButtonUrl || discordInviteFallback)
                      }
                      className="btn-curs-secondary px-6 py-3.5 text-xs sm:text-sm font-semibold bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 text-white rounded-xl inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>{block.secondaryButtonText || 'Наш Discord'}</span>
                      <ExternalLink className="w-4 h-4 text-curs-accent" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // 2. RICH TEXT BLOCK
        if (block.type === 'text') {
          return (
            <div
              key={block.id}
              className="bg-[#12121A]/90 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4"
            >
              {block.title && (
                <h2 className="text-xl sm:text-2xl font-semibold text-white">{block.title}</h2>
              )}
              <div
                className="prose prose-invert max-w-none text-sm sm:text-base text-slate-300 leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: block.content || '' }}
              />
            </div>
          );
        }

        // 3. IMAGE & GALLERY BLOCK
        if (block.type === 'image') {
          const gallery = Array.isArray(block.galleryUrls)
            ? block.galleryUrls.filter(Boolean)
            : [];
          return (
            <div
              key={block.id}
              className="bg-[#12121A]/90 border border-white/10 rounded-2xl p-6 space-y-4"
            >
              {block.title && (
                <h3 className="text-lg font-semibold text-white">{block.title}</h3>
              )}
              {block.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-white/10 max-h-[440px]">
                  <ResilientImage
                    src={block.imageUrl}
                    alt={block.title || 'CURS Media'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {gallery.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {gallery.map((gUrl, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl overflow-hidden border border-white/10 h-52"
                    >
                      <ResilientImage
                        src={gUrl}
                        alt={`${block.title || 'Галерея'} #${idx + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // 4. BUTTON CALLOUT BLOCK
        if (block.type === 'button') {
          return (
            <div
              key={block.id}
              className="bg-[#12121A] border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                {block.title && (
                  <h3 className="text-lg font-semibold text-white">{block.title}</h3>
                )}
                {block.content && <p className="text-sm text-slate-300">{block.content}</p>}
              </div>
              <button
                type="button"
                onMouseEnter={() => soundEngine.playHover()}
                onClick={() => handleActionLink(block.buttonUrl || 'tab:apply')}
                style={
                  block.buttonColor ? { backgroundColor: block.buttonColor } : undefined
                }
                className="btn-curs-primary px-6 py-3 text-xs sm:text-sm font-semibold text-white rounded-xl inline-flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <span>{block.buttonText || 'Перейти'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        }

        // 5. YOUTUBE VIDEO BLOCK
        if (block.type === 'youtube') {
          const rawUrl = block.youtubeUrl || '';
          const match = rawUrl.match(
            /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
          );
          const videoId = match ? match[1] : null;
          return (
            <div
              key={block.id}
              className="bg-[#12121A] border border-white/10 rounded-2xl p-6 space-y-4"
            >
              {block.title && (
                <h3 className="text-lg font-semibold text-white">{block.title}</h3>
              )}
              {videoId ? (
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={block.title || 'YouTube video'}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="p-6 bg-[#09090D] border border-white/10 rounded-xl text-xs text-slate-400">
                  Укажите корректную ссылку на видео YouTube в настройках блока.
                </div>
              )}
            </div>
          );
        }

        // 6. DISCORD LIVE ONLINE BLOCK
        if (block.type === 'discord_online') {
          return (
            <div
              key={block.id}
              className="bg-[#12121A] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Discord Widget API · Обновление в реальном времени</span>
                  </div>
                  <h2 className="text-xl font-semibold text-white">
                    {block.title || discordStatus?.guildName || 'CURS · Official Clan Discord'}
                  </h2>
                </div>

                <a
                  href={discordStatus?.inviteUrl || discordInviteFallback}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => soundEngine.playHover()}
                  onClick={() => soundEngine.playClick()}
                  className="btn-curs-primary px-5 py-2.5 text-xs font-semibold rounded-xl inline-flex items-center gap-2 shrink-0"
                >
                  <span>Присоединиться к Discord</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#09090D] border border-white/10 rounded-xl">
                  <div className="text-xs text-slate-400">Сейчас онлайн</div>
                  <div className="text-2xl font-bold font-mono-tabular text-emerald-400 mt-1">
                    {discordStatus?.onlineCount ?? 44}
                  </div>
                </div>
                <div className="p-4 bg-[#09090D] border border-white/10 rounded-xl">
                  <div className="text-xs text-slate-400">Всего участников</div>
                  <div className="text-2xl font-bold font-mono-tabular text-white mt-1">
                    {discordStatus?.totalMembers ?? 192}
                  </div>
                </div>
                <div className="p-4 bg-[#09090D] border border-white/10 rounded-xl">
                  <div className="text-xs text-slate-400">В голосовых каналах CS2</div>
                  <div className="text-2xl font-bold font-mono-tabular text-curs-accent mt-1">
                    {discordStatus?.voiceActiveCount ?? 9}
                  </div>
                </div>
              </div>

              {discordStatus?.onlineMembersSample &&
                discordStatus.onlineMembersSample.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {discordStatus.onlineMembersSample.map((m) => (
                      <div
                        key={m.id}
                        className="px-3 py-1.5 bg-[#09090D] border border-white/10 rounded-lg text-xs flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-medium text-white">{m.username}</span>
                        {m.game && <span className="text-slate-400">· {m.game}</span>}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          );
        }

        // 7. CLAN TOP LEADERBOARD BLOCK
        if (block.type === 'clan_top') {
          const topSlice = topEntries.slice(0, 5);
          return (
            <div
              key={block.id}
              className="bg-[#12121A] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-curs-accent">
                    <Trophy className="w-4 h-4" />
                    <span>Рейтинг игроков клана CURS на CrazyPub</span>
                  </div>
                  <h2 className="text-xl font-semibold text-white mt-0.5">
                    {block.title || 'Топ игроков клана CURS'}
                  </h2>
                </div>
                <button
                  type="button"
                  onMouseEnter={() => soundEngine.playHover()}
                  onClick={() => handleActionLink('tab:top')}
                  className="btn-curs-secondary px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Открыть полный Топ клана</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto border border-white/10 rounded-xl bg-[#09090D]">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="py-3 px-4">Место</th>
                      <th className="py-3 px-4">Игрок</th>
                      <th className="py-3 px-4">Очки CrazyPub</th>
                      <th className="py-3 px-4">K/D</th>
                      <th className="py-3 px-4">HS%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {topSlice.map((entry, idx) => (
                      <tr key={entry.id || idx} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono-tabular font-bold text-curs-accent">
                          #{entry.place || idx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">{entry.nickname}</td>
                        <td className="py-3 px-4 font-mono-tabular text-white">
                          {entry.points.toLocaleString('ru-RU')}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-emerald-400">
                          {entry.kdRatio}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-300">
                          {entry.headshotPct}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        // 8. ROSTER LIST BLOCK
        if (block.type === 'roster_list') {
          const activeMembers = roster.filter((m) => m.status !== 'inactive');
          return (
            <div
              key={block.id}
              className="bg-[#12121A] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-curs-accent">
                    <Users className="w-4 h-4" />
                    <span>Активный ростер клана CURS</span>
                  </div>
                  <h2 className="text-xl font-semibold text-white mt-0.5">
                    {block.title || `Состав клана (${activeMembers.length})`}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleActionLink('tab:roster')}
                  className="btn-curs-secondary px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-xl cursor-pointer"
                >
                  Перейти ко всему составу
                </button>
              </div>

              {activeMembers.length === 0 ? (
                <div className="p-6 bg-[#09090D] border border-white/10 rounded-xl text-xs text-slate-400">
                  Основной состав формируется по результатам рассмотрения заявок.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeMembers.map((m) => (
                    <div
                      key={m.id}
                      className="card-curs-interactive p-4 bg-[#09090D] border border-white/10 rounded-xl flex items-center gap-3.5"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/15 shrink-0">
                        <ResilientImage
                          src={m.avatarUrl}
                          alt={m.nickname}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white truncate">
                          [CURS] {m.nickname}
                        </div>
                        <div
                          className="text-xs font-semibold mt-0.5"
                          style={{ color: getRoleColor(m.role) }}
                        >
                          {m.role}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono-tabular">
                          K/D {m.kdRatio} · с {m.joinedDate || '2026'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // 9. LATEST NEWS BLOCK
        if (block.type === 'latest_news') {
          return (
            <div
              key={block.id}
              className="bg-[#12121A] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-curs-accent">
                  <FileText className="w-4 h-4" />
                  <span>Информационная лента клана</span>
                </div>
                <h2 className="text-xl font-semibold text-white mt-0.5">
                  {block.title || 'Последние новости и объявления CURS'}
                </h2>
              </div>

              {news.length === 0 ? (
                <p className="text-xs text-slate-400">Новостей пока нет.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {news.slice(0, 4).map((item) => (
                    <article
                      key={item.id}
                      className="card-curs-interactive bg-[#09090D] border border-white/10 rounded-xl overflow-hidden flex flex-col justify-between"
                    >
                      {item.coverUrl && (
                        <div className="h-44 overflow-hidden border-b border-white/10">
                          <ResilientImage
                            src={item.coverUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-5 space-y-2.5 flex-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-curs-accent font-semibold">{item.category}</span>
                          <div className="flex items-center gap-2 text-slate-400">
                            {item.isPinned && (
                              <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                                <Pin className="w-3 h-3" /> Закреплено
                              </span>
                            )}
                            <span className="font-mono-tabular">{item.publishedDate}</span>
                          </div>
                        </div>
                        <h3 className="text-base font-semibold text-white">{item.title}</h3>
                        <div
                          className="text-xs sm:text-sm text-slate-300 leading-relaxed prose prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: item.content }}
                        />
                        {item.driveFileUrl && (
                          <a
                            href={item.driveFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-curs-accent hover:underline pt-1"
                          >
                            <span>Открыть прикреплённый файл Google Drive</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // 10. LAYOUT BLOCK (DIVIDER, SPACER, 2 OR 3 COLUMNS)
        if (block.type === 'layout') {
          const subtype = block.layoutSubtype || 'columns_3';
          if (subtype === 'divider') {
            return (
              <div key={block.id} className="py-4">
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            );
          }
          if (subtype === 'spacer') {
            return (
              <div
                key={block.id}
                style={{ height: `${Math.max(16, Number(block.spacerHeight || 48))}px` }}
              />
            );
          }
          const cols = Array.isArray(block.columnsData) ? block.columnsData : [];
          const gridClass =
            subtype === 'columns_2'
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-3';
          return (
            <div key={block.id} className="space-y-4">
              {block.title && (
                <h2 className="text-xl font-semibold text-white">{block.title}</h2>
              )}
              <div className={`grid ${gridClass} gap-5`}>
                {cols.map((colHtml, idx) => (
                  <div
                    key={idx}
                    className="card-curs-interactive bg-[#12121A] border border-white/10 rounded-xl p-5 prose prose-invert max-w-none text-sm text-slate-300"
                    dangerouslySetInnerHTML={{ __html: colHtml }}
                  />
                ))}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
