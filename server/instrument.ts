// Phải là import đầu tiên trong server.ts (trước express, routes, ...) để Sentry
// auto-instrument được http/express. Xem https://docs.sentry.io/platforms/javascript/guides/express/
//
// Module này tự load .env vì trong ESM, tất cả import đều được evaluate trước khi
// bất kỳ statement nào của server.ts (kể cả dotenv.config()) chạy — nên không thể
// dựa vào dotenv.config() ở server.ts để set process.env trước khi file này đọc nó.
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    sendDefaultPii: false,
  });
}
