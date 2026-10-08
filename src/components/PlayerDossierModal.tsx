import React, { useState } from 'react';
import { X, Copy, Check, Crosshair, Terminal } from 'lucide-react';
import { ClanPlayer } from '../data/clanData';

interface PlayerDossierModalProps {
  player: ClanPlayer | null;
  onClose: () => void;
  onApplyForRole: (role: ClanPlayer['role']) => void;
}

export const PlayerDossierModal: React.FC<PlayerDossierModalProps> = ({
  player,
  onClose,
  onApplyForRole,
}) => {
  const [copiedField, setCopiedField] = useState<'crosshair' | 'viewmodel' | null>(null);

  if (!player) return null;

  const handleCopy = (text: string, type: 'crosshair' | 'viewmodel') => {
    navigator.clipboard.writeText(text);
    setCopiedField(type);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-player-title"
    >
      <div
        className="w-full max-w-2xl bg-[#12141A] border border-white/10 rounded-xl p-6 md:p-8 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <span>Ранг #{player.rankCrazypub} на Crazypub</span>
              <span aria-hidden="true">·</span>
              <span>{player.division}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400">{player.role}</span>
            </div>
            <h3 id="dossier-player-title" className="text-2xl md:text-3xl font-semibold text-white">
              {player.tagName}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {player.realName} · Любимая карта: {player.favoriteMap}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-amber-500"
            aria-label="Закрыть профиль игрока"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm md:text-base text-slate-300 leading-relaxed py-5 border-b border-white/10">
          {player.bio}
        </p>

        {/* Key Crazypub Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-white/10">
          <div>
            <div className="text-xs text-slate-400">K/D на Crazypub</div>
            <div className="text-xl font-semibold text-amber-400 font-mono-tabular mt-1">
              {player.kdRatio.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Средний урон (ADR)</div>
            <div className="text-xl font-semibold text-white font-mono-tabular mt-1">
              {player.adr.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Процент Headshot</div>
            <div className="text-xl font-semibold text-white font-mono-tabular mt-1">
              {player.hsPercent.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Наиграно на паблике</div>
            <div className="text-xl font-semibold text-white font-mono-tabular mt-1">
              {player.crazypubHours} ч
            </div>
          </div>
        </div>

        {/* Hardware & Config Settings */}
        <div className="py-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>Оружие: <strong className="text-slate-200 font-normal">{player.signatureWeapon}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Мышь: <strong className="text-slate-200 font-mono-tabular font-normal">{player.dpi} DPI / sens {player.sensitivity}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Разрешение: <strong className="text-slate-200 font-mono-tabular font-normal">{player.resolution}</strong></span>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-3 p-3 bg-[#0A0B0E] border border-white/10 rounded-lg">
              <div className="min-w-0">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Код прицела CS2</span>
                </div>
                <div className="text-xs font-mono-tabular text-slate-200 truncate mt-1">
                  {player.crosshairCode}
                </div>
              </div>
              <button
                onClick={() => handleCopy(player.crosshairCode, 'crosshair')}
                className="px-3 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {copiedField === 'crosshair' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Скопировать прицел</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 bg-[#0A0B0E] border border-white/10 rounded-lg">
              <div className="min-w-0">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Параметры Viewmodel для консоли</span>
                </div>
                <div className="text-xs font-mono-tabular text-slate-200 truncate mt-1">
                  {player.viewModelCommand}
                </div>
              </div>
              <button
                onClick={() => handleCopy(player.viewModelCommand, 'viewmodel')}
                className="px-3 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {copiedField === 'viewmodel' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Скопировать конфиг</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-slate-400">
            Клатчи в сезоне: <strong className="text-slate-200 font-mono-tabular">{player.clutchWinRate}</strong>
          </span>
          <button
            onClick={() => {
              onApplyForRole(player.role);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap"
          >
            Подать заявку на роль «{player.role}»
          </button>
        </div>
      </div>
    </div>
  );
};
