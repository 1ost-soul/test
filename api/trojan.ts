import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

type Req = {
  headers: Record<string, string | string[] | undefined>;
  socket: { server: { on: (event: string, cb: (...args: any[]) => void) => void } };
};

type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  end: () => void;
  setHeader: (name: string, value: string) => void;
};

const toBase64 = (value: string) => (globalThis as any).Buffer.from(value, 'utf8').toString('base64');

export default async function handler(req: Req, res: Res) {
  const upgradeHeader = req.headers.upgrade;
  const upgrade = Array.isArray(upgradeHeader) ? upgradeHeader[0] : upgradeHeader;

  // WebSocket upgrade support on Vercel depends on runtime/proxy capabilities.
  if (upgrade?.toLowerCase() === 'websocket') {
    const wss = new WebSocketServer({ noServer: true });

    req.socket.server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

    wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        console.log('Received:', message.toString());
        ws.send('Hello from Trojan WS Server!');
      });
    });

    res.status(101).end();
    return;
  }

  // Non-WebSocket request: return subscription info
  const id = uuidv4();
  const hostHeader = req.headers.host;
  const domain = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader || 'example.com';
  const port = 443;
  const password = id;

  const trojanWSLink = `trojan://${password}@${domain}:${port}?type=ws#${domain}`;

  const v2raySubObj = {
    v: '2',
    ps: 'Trojan WS',
    add: domain,
    port: port.toString(),
    id: password,
    aid: '0',
    net: 'ws',
    type: 'none',
    host: domain,
    path: '/api/trojan',
    tls: 'tls',
  };

  const v2raySub = `vmess://${toBase64(JSON.stringify(v2raySubObj))}`;

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    trojan: trojanWSLink,
    v2ray: v2raySub,
  });
}
