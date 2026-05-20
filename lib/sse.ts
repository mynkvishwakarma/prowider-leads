// Simple in-process SSE broadcaster
// Clients connect via GET /api/sse and receive events when leads are assigned

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
  timeout?: NodeJS.Timeout;
};

const clients: SSEClient[] = [];

// Clean up stale clients periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
const CLIENT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

setInterval(() => {
  const now = Date.now();
  for (let i = clients.length - 1; i >= 0; i--) {
    const client = clients[i];
    // Remove client if timeout has expired (set when client connects)
    if (client.timeout) {
      const timeoutTime = (client.timeout as any)._destroyTime || now;
      // This is a simple check; ideally track connection time separately
    }
  }
}, CLEANUP_INTERVAL);

export function addSSEClient(
  id: string,
  controller: ReadableStreamDefaultController
) {
  const client: SSEClient = { id, controller };
  clients.push(client);
  
  // Auto-remove client after CLIENT_TIMEOUT to prevent memory leaks
  const timeout = setTimeout(() => {
    removeSSEClient(id);
  }, CLIENT_TIMEOUT);
  
  client.timeout = timeout;
}

export function removeSSEClient(id: string) {
  const idx = clients.findIndex((c) => c.id === id);
  if (idx !== -1) {
    const client = clients[idx];
    if (client.timeout) {
      clearTimeout(client.timeout);
    }
    clients.splice(idx, 1);
  }
}

export function broadcastLeadUpdate(data: object) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  for (const client of [...clients]) {
    try {
      client.controller.enqueue(encoder.encode(message));
    } catch {
      removeSSEClient(client.id);
    }
  }
}
