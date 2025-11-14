import type { ResponseMessagePackage } from '../models/types.js';
import { getAllActiveConnectionContexts, getWsConnectionId } from '../websocket/connectionRegistry.js';
import { logCommandResultError, logCommandResultOk } from '../utils/logging.js';
import type { BroadcastResponseMessage, PersonalResponseMessage, RoomResponseMessage } from './messageTypes.js';

function sendMessageToConnectionIds(responseMessagePackage: ResponseMessagePackage): void {
  const { targetConnectionIds, responseMessage } = responseMessagePackage;

  const serializedMessage = JSON.stringify(responseMessage);
  const commandType = responseMessage.type;

  for (const targetConnectionId of targetConnectionIds) {
    const websocketClient = getWsConnectionId(targetConnectionId);

    if (!websocketClient) {
      logCommandResultError(targetConnectionId, commandType, 'WebSocket connection not found');
      continue;
    }

    if (websocketClient.readyState !== WebSocket.OPEN) {
      logCommandResultError(targetConnectionId, commandType, 'WebSocket connection is not OPEN');
      continue;
    }

    try {
      websocketClient.send(serializedMessage);
      logCommandResultOk(targetConnectionId, commandType, serializedMessage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logCommandResultError(targetConnectionId, commandType, errorMessage);
    }
  }
}

export function sendPersonalMessage(
  responseTargetConnectionId: string,
  responseMessage: PersonalResponseMessage
): void {
  const responseMessagePackage: ResponseMessagePackage = {
    targetConnectionIds: [responseTargetConnectionId],
    responseMessage,
  };

  sendMessageToConnectionIds(responseMessagePackage);
}

export function sendRoomMessage(responseTargetConnectionIds: string[], responseMessage: RoomResponseMessage): void {
  if (responseTargetConnectionIds.length === 0) {
    return;
  }

  const responseMessagePackage: ResponseMessagePackage = {
    targetConnectionIds: responseTargetConnectionIds,
    responseMessage,
  };

  sendMessageToConnectionIds(responseMessagePackage);
}

export function sendBroadcastMessage(responseMessage: BroadcastResponseMessage): void {
  const activeConnectionContexts = getAllActiveConnectionContexts();

  if (activeConnectionContexts.length === 0) {
    return;
  }

  const allConnectionIds = activeConnectionContexts.map((connectionContext) => connectionContext.connectionId);

  const responseMessagePackage: ResponseMessagePackage = {
    targetConnectionIds: allConnectionIds,
    responseMessage,
  };

  sendMessageToConnectionIds(responseMessagePackage);
}
