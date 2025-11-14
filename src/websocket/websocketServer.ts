import { WebSocketServer, type WebSocket, type RawData } from 'ws';
import type { WebSocketServerOptions } from '../models/websocket.model.js';
import { closeAllConnections, registerConnection, unregisterConnection } from './connectionRegistry.js';
import { logError, logInfo } from '../utils/logging.js';
import { promisify } from 'node:util';
import { LOG_WS } from '../models/messages-text.model.js';
import { MessageRouter } from '../protocol/messageRouter.js';
import { RoomsController } from '../controllers/rooms.controller.js';
import { gamesController } from '../controllers/games.controller.js';
import { PlayersController } from '../controllers/players.controller.js';
import { PlayersService } from '../services/players-service.js';
import { RoomsService } from '../services/rooms-service.js';

const playersService = new PlayersService();
const roomsService = new RoomsService();

const playersController = new PlayersController(playersService);
const roomsController = new RoomsController(roomsService);

function rawDataToString(data: RawData): string {
  if (Buffer.isBuffer(data)) {
    return data.toString('utf-8');
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data).toString('utf-8');
  }

  if ((data as ArrayBuffer) instanceof ArrayBuffer) {
    return Buffer.from(data as ArrayBuffer).toString('utf-8');
  }

  return String(data);
}

export function createWebsocketServer(options: WebSocketServerOptions): WebSocketServer {
  const websocketServer = new WebSocketServer({ port: options.port });

  websocketServer.on('connection', (websocketClient: WebSocket) => {
    const connectionContext = registerConnection(websocketClient);

    logInfo(LOG_WS.NEW_CONNECTION(connectionContext.connectionId));

    websocketClient.on('message', async (receivedData: RawData) => {
      const receivedText = rawDataToString(receivedData);

      logInfo(`Message from ${connectionContext.connectionId}: ${receivedText}`);

      const messageRouter = new MessageRouter({
        playersController,
        roomsController,
        gamesController,
      });
      try {
        await messageRouter.routeIncomingMessage(receivedText, connectionContext);
      } catch (error) {
        logError(`Unhandled error while routing message from ${connectionContext.connectionId}: ${String(error)}`);
      }
    });

    websocketClient.on('close', (code, reason: Buffer) => {
      const reasonText = reason && reason.length ? reason.toString('utf-8') : '';

      logInfo(LOG_WS.CONNECTION_CLOSED(connectionContext.connectionId, code, reasonText));
      unregisterConnection(websocketClient);
    });

    websocketClient.on('error', (errorInstance: Error) => {
      logError(LOG_WS.CLIENT_ERROR(connectionContext.connectionId, errorInstance.message));
    });
  });

  websocketServer.on('error', (errorInstance: Error) => {
    logError(LOG_WS.SERVER_ERROR(errorInstance.message));
  });

  return websocketServer;
}

export async function shutdownWebsocketServer(websocketServer: WebSocketServer): Promise<void> {
  logInfo('Shutting down WebSocket server...');
  closeAllConnections();

  // promisify превращает websocketServer.close() из callback → Promise
  const closeWebsocketServer = promisify(websocketServer.close.bind(websocketServer));

  try {
    await closeWebsocketServer();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(LOG_WS.CLOSE_ERROR(message));
  }
}
