import type { WebSocket } from 'ws';
import type { ConnectionContext } from '../models/websocket.model.js';
import { generateConnectionId } from '../utils/id-generator.js';
import { logError, logInfo } from '../utils/logging.js';
import { LOG_REGISTRY } from '../models/messages-text.model.js';

// WebSocket → ConnectionContext
const wsConnectionContext = new Map<WebSocket, ConnectionContext>();

// connectionIdentifier → WebSocket
const connectionIdWs = new Map<string, WebSocket>();

// Регистрация нового подключения
export function registerConnection(websocketClient: WebSocket): ConnectionContext {
  const existingConnectionContext = wsConnectionContext.get(websocketClient);
  if (existingConnectionContext) return existingConnectionContext;

  const connectionContext: ConnectionContext = {
    connectionId: generateConnectionId(),
  };

  wsConnectionContext.set(websocketClient, connectionContext);
  connectionIdWs.set(connectionContext.connectionId, websocketClient);

  return connectionContext;
}

// Удаление подключения
export function unregisterConnection(websocketClient: WebSocket): void {
  const context = wsConnectionContext.get(websocketClient);
  if (!context) return;

  wsConnectionContext.delete(websocketClient);
  connectionIdWs.delete(context.connectionId);
}

// Получить контекст по WebSocket
export function getConnectionContextByWebsocket(websocketClient: WebSocket): ConnectionContext | undefined {
  return wsConnectionContext.get(websocketClient);
}

// Получить WebSocket по connectionId
export function getWsConnectionId(connectionId: string): WebSocket | undefined {
  return connectionIdWs.get(connectionId);
}

// Получить все активные подключения
export function getAllActiveConnectionContexts(): ConnectionContext[] {
  return Array.from(wsConnectionContext.values());
}

// Закрыть все подключения и очистить реестр
export function closeAllConnections(): void {
  const totalConnections = wsConnectionContext.size;

  if (totalConnections === 0) {
    logInfo(LOG_REGISTRY.CONNECTIONS_NONE);
    return;
  }

  logInfo(LOG_REGISTRY.CONNECTIONS_CLOSING(totalConnections));

  for (const [websocketClient, context] of wsConnectionContext.entries()) {
    try {
      websocketClient.close(1001, 'Server shutting down');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logError(LOG_REGISTRY.CONNECTION_CLOSE_ERROR(context.connectionId, message));
    }
  }

  wsConnectionContext.clear();
  connectionIdWs.clear();

  logInfo(LOG_REGISTRY.CONNECTIONS_CLEARED);
}
