import http from 'node:http';

const prefix = 'com.kanoton.damagecalculator';
const commands = new Map([
  [prefix + '.voice', 'voice'],
  [prefix + '.attack', 'attack'],
  [prefix + '.defense', 'defense'],
  [prefix + '.missions', 'missions'],
  [prefix + '.monsters', 'monsters'],
  [prefix + '.chips', 'chips']
]);
const listeners = new Set();
const server = http.createServer((request, response) => {
  if (request.url !== '/events') {
    response.writeHead(404).end();
    return;
  }
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Private-Network': 'true',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream; charset=utf-8',
    'X-Accel-Buffering': 'no'
  };
  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers).end();
    return;
  }
  if (request.method !== 'GET') {
    response.writeHead(405, headers).end();
    return;
  }
  response.writeHead(200, headers);
  response.write(': connected\n\n');
  listeners.add(response);
  request.on('close', () => listeners.delete(response));
});
server.listen(17371, '127.0.0.1');
setInterval(() => {
  for (const client of listeners) client.write(': ping\n\n');
}, 20000).unref();

function broadcast(action) {
  if (!commands.has(prefix + '.' + action)) return;
  const message = 'data: ' + JSON.stringify({ action }) + '\n\n';
  for (const client of listeners) client.write(message);
}
function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1];
}
if (process.argv.includes('--simulate')) {
  setTimeout(() => broadcast(argument('--simulate')), 300);
} else {
  const port = Number(argument('-port'));
  const uuid = argument('-pluginUUID');
  const registerEvent = argument('-registerEvent');
  if (!Number.isInteger(port) || !uuid || !registerEvent) {
    console.error('Stream Deck registration arguments are missing');
    process.exitCode = 1;
    server.close();
  } else {
    const socket = new WebSocket('ws://127.0.0.1:' + port);
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ event: registerEvent, uuid }));
    });
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.event === 'keyDown') {
          const action = commands.get(message.action);
          if (action) broadcast(action);
        }
      } catch (_) { /* Ignore unrelated Stream Deck messages. */ }
    });
    socket.addEventListener('close', () => server.close());
  }
}
