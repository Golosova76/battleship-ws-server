import { httpServer } from './src/http_server/index.js';
import { environment } from './src/config/environment.js';
import { createWebsocketServer, shutdownWebsocketServer } from './src/websocket/websocketServer.js';
import { logError, logInfo } from './src/utils/logging.js';
import { promisify } from 'node:util';
import { LOG_HTTP, LOG_SYSTEM, LOG_WS } from './src/models/messages-text.model.js';

const { httpPort, websocketPort, nodeEnvironment } = environment;

logInfo(LOG_SYSTEM.ENVIRONMENT(nodeEnvironment));

// HTTP-сервер для статики
httpServer.listen(httpPort, () => {
  logInfo(LOG_HTTP.STARTED(httpPort));
  logInfo(`[http] Open http://localhost:${httpPort}/`);
});

// WebSocket-сервер для игры
const websocketServer = createWebsocketServer({ port: websocketPort });
logInfo(LOG_WS.STARTED(websocketPort));

const closeHttpServer = promisify(httpServer.close.bind(httpServer));

// Завершение работы
async function shutDown(): Promise<void> {
  logInfo(LOG_SYSTEM.SHUTDOWN_START);

  try {
    await shutdownWebsocketServer(websocketServer);
    logInfo(LOG_WS.CLOSED);

    await closeHttpServer();
    logInfo(LOG_HTTP.CLOSED);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(LOG_WS.CLOSE_ERROR(message));
    logError(LOG_HTTP.CLOSE_ERROR(message));
  } finally {
    logInfo(LOG_SYSTEM.SHUTDOWN_COMPLETE);
  }
}

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);
