import React from 'react';
import { Shield, BookOpen, Database, Lock, CheckCircle2 } from 'lucide-react';

export const AdminReferenceGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-curs-accent">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Краткая инструкция для Лидера клана CURS
            </h3>
            <p className="text-xs text-slate-400">
              Полное руководство по управлению сайтом без программирования через /admin
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 bg-[#09090D] border border-white/10 rounded-xl space-y-2">
            <div className="font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>1. Как войти в админ-панель (/admin)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Перейдите по закрытому адресу <code>/admin</code> (или нажмите кнопку «Штаб /admin» в
              шапке). Выберите вход через <strong>Discord OAuth2</strong> (права определяются
              автоматически по вашей роли на Discord-сервере клана) или через{' '}
              <strong>Google-аккаунт владельца</strong>. Сессия защищена httpOnly-cookie и
              автоматически завершается после 2 часов бездействия.
            </p>
          </div>

          <div className="p-4 bg-[#09090D] border border-white/10 rounded-xl space-y-2">
            <div className="font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>2. Как отредактировать страницу (Конструктор блоков)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Откройте раздел <strong>«Страницы»</strong> в левом меню. Выберите системную страницу
              («Главная», «О клане», «Правила») или создайте новую. Добавляйте любые из 10 типов
              блоков, меняйте их порядок перетаскиванием (Drag & Drop), включайте режим{' '}
              <strong>«Предпросмотр»</strong> и нажимайте <strong>«Опубликовать»</strong>. Черновик
              автосохраняется каждые 30 секунд.
            </p>
          </div>

          <div className="p-4 bg-[#09090D] border border-white/10 rounded-xl space-y-2">
            <div className="font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>3. Как опубликовать новость и анонс в Discord</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              В разделе <strong>«Новости»</strong> заполните заголовок, выберите обложку из
              медиатеки, оформите текст в визуальном редакторе и укажите статус:{' '}
              <em>Черновик</em>, <em>Запланировано</em> (к выбранной дате) или{' '}
              <em>Опубликовано</em>. Включите галочку «Закрепить на главной» и «Отправить анонс в
              Discord через Webhook».
            </p>
          </div>

          <div className="p-4 bg-[#09090D] border border-white/10 rounded-xl space-y-2">
            <div className="font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>4. Как выдать доступ или отключить администратора</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              В разделе <strong>«Администраторы»</strong> вы можете сопоставить ID ролей вашего
              Discord-сервера уровням доступа (<em>Лидер</em>, <em>Заместитель</em>,{' '}
              <em>Модератор</em>), вручную переключить роль любого пользователя или одной кнопкой{' '}
              <strong>временно приостановить доступ</strong> конкретному человеку.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Database className="w-4 h-4 text-curs-accent" />
            <span>Таблицы базы данных PostgreSQL (src/db/schema.ts)</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 font-mono-tabular">
            <li>• roles — уровни доступа и привязка Discord Role ID</li>
            <li>• users — администраторы, статус блокировки (is_suspended), активность</li>
            <li>• clan_roles — кастомные игровые роли состава (название, цвет, порядок)</li>
            <li>• roster_members — участники состава (статус, дата, drag-and-drop порядок)</li>
            <li>• top_players — настраиваемый список Топа клана CrazyPub</li>
            <li>• applications — заявки на роль Участника, лог внутренних комментариев</li>
            <li>• custom_pages — конструктор страниц из 10 блоков + черновики и SEO</li>
            <li>• clan_news — новости (черновик, запланировано, закреплено, корзина)</li>
            <li>• media_files — медиатека (WebP-сжатие, миниатюры, проверка использования)</li>
            <li>• content_versions — история версий страниц, новостей и оформления (Rollback)</li>
            <li>• audit_logs — неизменяемый журнал действий с IP и diff (было / стало)</li>
          </ul>
        </div>

        <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Архитектура безопасности и RBAC Middleware</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
            <li>
              • <strong>Серверный RBAC (src/middleware/auth.ts):</strong> каждый запрос к{' '}
              <code>/api/admin/*</code> проверяет подпись httpOnly-сессии, статус{' '}
              <code>isSuspended</code> и роль пользователя.
            </li>
            <li>
              • <strong>Тайм-аут бездействия:</strong> сессия автоматически истекает после 2 часов
              неактивности как на клиенте, так и на сервере.
            </li>
            <li>
              • <strong>Защита от XSS и CSRF:</strong> серверный санитайзер{' '}
              <code>sanitizeHtmlServer</code> очищает HTML от скриптов, а мутирующие запросы
              требуют заголовок <code>x-curs-csrf</code>.
            </li>
            <li>
              • <strong>Закрытый маршрут /admin:</strong> отдаёт заголовок{' '}
              <code>X-Robots-Tag: noindex, nofollow</code> и мета-тег <code>robots noindex</code>.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
