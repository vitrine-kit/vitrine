// Короткий TCP-ping Postgres с таймаутом (~2с), затем close. Через node:net,
// без зависимости на драйвер — различать недоступность/таймаут/ошибку не нужно:
// любая неудача в dev → fallback (см. db-decision.ts).
import net from 'node:net';

export function canConnectPostgres(url: string, timeoutMs = 2000): Promise<boolean> {
  let host = 'localhost';
  let port = 5432;
  try {
    const u = new URL(url);
    if (u.hostname) host = u.hostname;
    if (u.port) port = Number(u.port);
  } catch {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const finish = (ok: boolean): void => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}
