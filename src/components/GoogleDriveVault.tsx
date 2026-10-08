import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Upload,
  Trash2,
  RefreshCw,
  ExternalLink,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { getAccessToken, googleSignIn } from '../lib/firebase';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
}

interface GoogleDriveVaultProps {
  onSelectFileUrl?: (url: string, name: string) => void;
  exportPayload?: Record<string, unknown>;
}

export const GoogleDriveVault: React.FC<GoogleDriveVaultProps> = ({
  onSelectFileUrl,
  exportPayload,
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mandatory custom confirmation dialog state for destructive operations
  const [filePendingDelete, setFilePendingDelete] = useState<DriveFileItem | null>(null);

  useEffect(() => {
    getAccessToken().then((t) => {
      if (t) {
        setAccessToken(t);
        setNeedsAuth(false);
        fetchDriveFiles(t);
      }
    });
  }, []);

  const fetchDriveFiles = async (tokenToUse?: string, queryStr?: string) => {
    const token = tokenToUse || (await getAccessToken());
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const qParts = ['trashed = false'];
      const cleanSearch = (queryStr ?? searchQuery).trim();
      if (cleanSearch) {
        qParts.push(`name contains '${cleanSearch.replace(/'/g, "\\'")}'`);
      }

      const params = new URLSearchParams({
        pageSize: '15',
        q: qParts.join(' and '),
        fields: 'files(id,name,mimeType,webViewLink,modifiedTime,size)',
        orderBy: 'modifiedTime desc',
      });

      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        setNeedsAuth(true);
        throw new Error('Сессия Google Drive истекла или требует повторного входа.');
      }

      if (!res.ok) {
        throw new Error('Не удалось получить список файлов из Google Drive.');
      }

      const data = await res.json();
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка обращения к Google Drive API');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result?.accessToken) {
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        await fetchDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Не удалось выполнить вход через Google.');
    }
  };

  const handleExportClanReportToDrive = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const nowStr = new Date().toISOString().slice(0, 16).replace('T', '_');
      const fileName = `CURS_Clan_Report_${nowStr}.json`;

      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        description: 'Экспорт данных клана [CURS] CS2 (состав, рейтинг CrazyPub и заявки)',
      };

      const fileContent = JSON.stringify(
        exportPayload || {
          clan: 'CURS',
          exportedAt: new Date().toISOString(),
          server: 'CrazyPub CS2',
        },
        null,
        2
      );

      const boundary = '-------curs_drive_multipart_boundary';
      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${fileContent}\r\n` +
        `--${boundary}--`;

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        }
      );

      if (!res.ok) {
        throw new Error('Ошибка при загрузке файла отчёта в Google Drive.');
      }

      const created = await res.json();
      setStatusMessage(`Отчёт «${created.name}» успешно сохранён в ваш Google Drive.`);
      await fetchDriveFiles(token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Не удалось сохранить файл в Google Drive');
    } finally {
      setUploading(false);
    }
  };

  const confirmDeleteFile = async () => {
    if (!filePendingDelete) return;
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setNeedsAuth(true);
      setFilePendingDelete(null);
      return;
    }

    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${filePendingDelete.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok && res.status !== 204) {
        throw new Error('Не удалось удалить файл из Google Drive.');
      }

      setStatusMessage(`Файл «${filePendingDelete.name}» удалён из Google Drive.`);
      setFilePendingDelete(null);
      await fetchDriveFiles(token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка удаления файла');
      setFilePendingDelete(null);
    }
  };

  return (
    <div className="bg-[#121218] border border-white/10 rounded-xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="text-xs text-rose-400 font-semibold mb-1">
            Google Drive API · Облачное хранилище клана CURS
          </div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-rose-500" />
            <span>Демки, конфиги и бэкапы клана в Google Drive</span>
          </h3>
        </div>

        {!needsAuth && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportClanReportToDrive}
              disabled={uploading}
              className="px-3.5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Сохранение...' : 'Выгрузить отчёт CURS в Drive'}</span>
            </button>
            <button
              type="button"
              onClick={() => fetchDriveFiles()}
              disabled={loading}
              className="p-2 text-xs bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Обновить список файлов"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/40 rounded-lg flex items-center gap-2.5 text-xs text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-950/50 border border-rose-500/40 rounded-lg text-xs text-rose-200">
          {errorMessage}
        </div>
      )}

      {needsAuth ? (
        <div className="py-6 text-center space-y-4">
          <p className="text-sm text-slate-300 max-w-lg mx-auto">
            Подключите свой аккаунт Google, чтобы просматривать тактические файлы, прикреплять
            демки с Google Drive к новостям клана и сохранять резервные копии таблицы лидеров
            CrazyPub.
          </p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="gsi-material-button inline-flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-medium text-sm rounded-lg shadow transition-colors cursor-pointer"
            >
              <div className="gsi-material-button-icon w-5 h-5">
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
              <span className="gsi-material-button-contents">Sign in with Google</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchDriveFiles(undefined, searchQuery)}
              placeholder="Поиск файлов в вашем Google Drive..."
              className="flex-1 px-3.5 py-2 text-xs bg-[#09090D] border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
            />
            <button
              type="button"
              onClick={() => fetchDriveFiles(undefined, searchQuery)}
              className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Найти
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Загрузка файлов из Google Drive...
            </div>
          ) : files.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Файлы не найдены. Нажмите «Выгрузить отчёт CURS в Drive», чтобы создать первый
              клановый архив.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-lg bg-[#09090D]">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-white font-medium truncate">{file.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {file.mimeType}
                        {file.modifiedTime
                          ? ` · ${new Date(file.modifiedTime).toLocaleDateString('ru-RU')}`
                          : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onSelectFileUrl && file.webViewLink && (
                      <button
                        type="button"
                        onClick={() => onSelectFileUrl(file.webViewLink!, file.name)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Прикрепить к новости
                      </button>
                    )}
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-white/5"
                        title="Открыть в Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setFilePendingDelete(file)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 cursor-pointer"
                      title="Удалить файл из Google Drive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mandatory Confirmation Modal for Destructive Google Drive Delete Action */}
      {filePendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#14141C] border border-rose-500/40 rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-base font-semibold text-white">
                  Подтверждение удаления файла из Google Drive
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Вы действительно хотите безвозвратно удалить файл{' '}
                  <strong className="text-white">«{filePendingDelete.name}»</strong> из вашего
                  Google Drive? Это действие нельзя отменить.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFilePendingDelete(null)}
                className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                Подтвердить удаление
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
