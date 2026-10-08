import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Heading,
  List,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Eye,
  Code,
  Upload,
  AlertTriangle,
  X,
  Check,
  Search,
  FolderOpen,
} from 'lucide-react';
import { soundEngine } from '../lib/soundEffects';
import { ResilientImage } from './ResilientImage';

export interface MediaRecordItem {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  createdAt?: string;
}

const BUILTIN_CLAN_ASSETS = [
  {
    name: 'Эмблема клана CURS',
    url: '/src/assets/images/curs_clan_crest_1791453830325.jpg',
  },
  {
    name: 'Главный баннер CS2 Оперативники',
    url: '/src/assets/images/cs2_curs_hero_banner_1791453811574.jpg',
  },
  {
    name: 'Арена CrazyPub #1 — Mirage',
    url: '/src/assets/images/crazypub_mirage_arena_1791453849278.jpg',
  },
  {
    name: 'Арена CrazyPub #2 — Inferno',
    url: '/src/assets/images/crazypub_inferno_arena_1791453864614.jpg',
  },
];

interface RichHtmlEditorProps {
  label: string;
  value: string;
  onChange: (newHtml: string) => void;
  disabled?: boolean;
  mediaList?: MediaRecordItem[];
}

export const RichHtmlEditor: React.FC<RichHtmlEditorProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  mediaList = [],
}) => {
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [showMediaPicker, setShowMediaPicker] = useState<boolean>(false);

  const insertSnippet = (snippet: string) => {
    if (disabled) return;
    soundEngine.playClick();
    onChange(`${value}\n${snippet}`);
  };

  return (
    <div className="bg-[#09090D] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#121218] border-b border-white/10">
        <span className="text-xs font-semibold text-slate-200">{label}</span>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => insertSnippet('<h3>Подзаголовок раздела</h3>')}
            className="p-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer disabled:opacity-40"
            title="Заголовок H3"
          >
            <Heading className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => insertSnippet('<strong>Жирный текст</strong>')}
            className="p-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer disabled:opacity-40"
            title="Жирный"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => insertSnippet('<em>Курсивный текст</em>')}
            className="p-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer disabled:opacity-40"
            title="Курсив"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              insertSnippet('<ul>\n  <li>Первый пункт</li>\n  <li>Второй пункт</li>\n</ul>')
            }
            className="p-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer disabled:opacity-40"
            title="Список"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              insertSnippet('<blockquote>Важная цитата или правило клана CURS</blockquote>')
            }
            className="p-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer disabled:opacity-40"
            title="Цитата"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              insertSnippet('<a href="https://discord.gg/curs-clan" target="_blank">Ссылка</a>')
            }
            className="p-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer disabled:opacity-40"
            title="Ссылка"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowMediaPicker(true)}
            className="p-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer disabled:opacity-40"
            title="Вставить картинку из медиатеки"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setPreviewMode(!previewMode);
            }}
            className="ml-2 px-2.5 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white rounded flex items-center gap-1 cursor-pointer"
          >
            {previewMode ? (
              <>
                <Code className="w-3 h-3" />
                <span>HTML-код</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                <span>Визуальный вид</span>
              </>
            )}
          </button>
        </div>
      </div>

      {previewMode ? (
        <div
          className="p-4 prose prose-invert max-w-none text-sm text-slate-200 space-y-2 leading-relaxed min-h-[130px]"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <textarea
          rows={5}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3.5 text-xs sm:text-sm font-mono-tabular bg-[#09090D] text-slate-200 focus:outline-none disabled:opacity-50"
        />
      )}

      {showMediaPicker && (
        <MediaLibraryPickerModal
          mediaList={mediaList}
          onSelect={(url, name) => {
            insertSnippet(`<img src="${url}" alt="${name}" class="rounded-xl my-3 max-h-80 object-cover" />`);
            setShowMediaPicker(false);
          }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
};

// Client-side image compression + thumbnail generation (up to 5 MB)
export async function compressImageFile(
  file: File,
  maxWidth = 1280,
  quality = 0.82
): Promise<{
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  thumbnailUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      reject(new Error('Разрешены только файлы JPG, PNG, WebP и GIF.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Размер файла превышает допустимый лимит 5 МБ.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // 1. Main compressed image
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Ошибка инициализации Canvas для сжатия.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const targetMime = 'image/webp';
        const dataUrl = canvas.toDataURL(targetMime, quality);
        const approxBytes = Math.round((dataUrl.length * 3) / 4);

        // 2. Thumbnail (320px width)
        const thumbCanvas = document.createElement('canvas');
        const thumbW = Math.min(320, width);
        const thumbH = Math.round((height * thumbW) / width);
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(img, 0, 0, thumbW, thumbH);
        }
        const thumbnailUrl = thumbCtx
          ? thumbCanvas.toDataURL(targetMime, 0.7)
          : dataUrl;

        resolve({
          fileName: file.name.replace(/\.[^.]+$/, '.webp'),
          mimeType: targetMime,
          sizeBytes: approxBytes,
          dataUrl,
          thumbnailUrl,
        });
      };
      img.onerror = () => reject(new Error('Не удалось прочитать изображение.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла.'));
    reader.readAsDataURL(file);
  });
}

interface ImageUploadButtonProps {
  onUploaded: (dataUrl: string, fileName: string) => void;
  uploadToServer: (payload: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    dataUrl: string;
    thumbnailUrl?: string;
  }) => Promise<void>;
  label?: string;
  mediaList?: MediaRecordItem[];
  showPickerButton?: boolean;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onUploaded,
  uploadToServer,
  label = 'Загрузить (до 5 МБ)',
  mediaList = [],
  showPickerButton = true,
}) => {
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const compressed = await compressImageFile(file);
      await uploadToServer(compressed);
      soundEngine.playSuccess();
      onUploaded(compressed.dataUrl, compressed.fileName);
    } catch (err: any) {
      soundEngine.playAlert();
      setErrorMsg(err.message || 'Ошибка загрузки');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-lg cursor-pointer transition-colors whitespace-nowrap">
        <Upload className="w-3.5 h-3.5 text-curs-accent" />
        <span>{busy ? 'Сжатие + миниатюра...' : label}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
          disabled={busy}
        />
      </label>

      {showPickerButton && (
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setPickerOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#09090D] border border-white/15 hover:border-white/30 text-slate-200 rounded-lg cursor-pointer transition-colors whitespace-nowrap"
        >
          <FolderOpen className="w-3.5 h-3.5 text-curs-accent" />
          <span>Из медиатеки</span>
        </button>
      )}

      {errorMsg && <span className="text-xs text-rose-400">{errorMsg}</span>}

      {pickerOpen && (
        <MediaLibraryPickerModal
          mediaList={mediaList}
          onSelect={(url, name) => {
            soundEngine.playSuccess();
            onUploaded(url, name);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
};

// Modal to pick any image from Media Library or built-in Clan Assets
export const MediaLibraryPickerModal: React.FC<{
  mediaList: MediaRecordItem[];
  onSelect: (url: string, name: string) => void;
  onClose: () => void;
}> = ({ mediaList, onSelect, onClose }) => {
  const [search, setSearch] = useState('');

  const filteredMedia = mediaList.filter((m) =>
    m.fileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12121A] border border-white/15 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Выбор изображения из Медиатеки</h3>
            <p className="text-xs text-slate-400">
              Выберите загруженный файл или стандартный игровой ассет клана CURS
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-white/10 bg-[#09090D]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию файла..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#12121A] border border-white/10 rounded-lg text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Загруженные файлы в базе данных ({filteredMedia.length})
            </div>
            {filteredMedia.length === 0 ? (
              <p className="text-xs text-slate-400">
                Загруженных файлов по запросу не найдено. Вы можете выбрать встроенный ассет ниже.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {filteredMedia.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.dataUrl, item.fileName)}
                    className="group text-left bg-[#09090D] border border-white/10 hover:border-rose-500 rounded-xl overflow-hidden transition-all cursor-pointer"
                  >
                    <div className="h-24 bg-black overflow-hidden">
                      <img
                        src={item.thumbnailUrl || item.dataUrl}
                        alt={item.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-medium text-white truncate">{item.fileName}</div>
                      <div className="text-[10px] text-slate-400">
                        {Math.round(item.sizeBytes / 1024)} КБ
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Стандартные игровые баннеры и эмблемы CURS
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BUILTIN_CLAN_ASSETS.map((asset) => (
                <button
                  key={asset.url}
                  type="button"
                  onClick={() => onSelect(asset.url, asset.name)}
                  className="group text-left bg-[#09090D] border border-white/10 hover:border-rose-500 rounded-xl overflow-hidden transition-all cursor-pointer"
                >
                  <div className="h-24 bg-black overflow-hidden">
                    <ResilientImage
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-medium text-white truncate">{asset.name}</div>
                    <div className="text-[10px] text-emerald-400">Встроенный HD-ассет</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal for Dangerous Actions (Delete, Role Change, Reset)
export const ConfirmDangerModal: React.FC<{
  title: string;
  description: string;
  warningDetails?: string[];
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  title,
  description,
  warningDetails = [],
  confirmLabel = 'Подтвердить действие',
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12121A] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        {warningDetails.length > 0 && (
          <div className="p-3.5 bg-amber-950/50 border border-amber-500/40 rounded-xl text-xs text-amber-200 space-y-1">
            <div className="font-semibold text-amber-300">
              Внимание! Объект используется в следующих местах сайта:
            </div>
            <ul className="list-disc list-inside space-y-0.5">
              {warningDetails.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 rounded-lg cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onConfirm();
            }}
            className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
