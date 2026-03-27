import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer'; // 必须显式引入 Buffer

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 检查是否为 WebSocket 升级请求
  if (req.headers.upgrade?.toLowerCase() === 'websocket') {
    const wss = new WebSocketServer({ noServer: true });

    // 触发 WebSocket 升级
    req.socket.server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

    // 订阅代理流量示例
    wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        console.log('Received:', message.toString());
        ws.send('Hello from Trojan WS Server!');
      });
    });

    res.status(101).end(); // 升级成功
    return;
  }

  // 非 WebSocket 请求，返回订阅信息
  const id = uuidv4();
  const domain = req.headers.host || 'example.com';
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
    path: '/api/trojan', // 注意 WS path 要与函数路径一致
    tls: 'tls',
  };

  const v2raySub = `vmess://${Buffer.from(JSON.stringify(v2raySubObj)).toString('base64')}`;

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    trojan: trojanWSLink,
    v2ray: v2raySub,
  });
}