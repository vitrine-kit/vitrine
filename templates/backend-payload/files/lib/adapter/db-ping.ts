// Short TCP ping to Postgres with a timeout (~2s), then close. Uses node:net,
// no driver dependency — no need to distinguish unavailable/timeout/error:
// any failure in dev → fallback (see db-decision.ts).
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
