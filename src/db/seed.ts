import * as dotenv from 'dotenv';
import { ensureInitialSeed } from './queries.ts';

dotenv.config();

async function runSeed() {
  console.log('Запуск первоначального заполнения базы данных клана CURS...');
  await ensureInitialSeed();
  console.log('Стартовый контент (роли, настройки CMS, страницы и новости) успешно записан в БД.');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Ошибка заполнения БД:', err);
  process.exit(1);
});
