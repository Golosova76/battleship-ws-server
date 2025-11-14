import {
  type IncomingClientMessage,
  MESSAGE_TYPES,
  type MessageRouterDependencies,
  type MessageType,
} from '../models/types.js';
import type { PlayersControllerType } from '../models/user.model.js';
import type { RoomsControllerType } from '../models/rooms.model.js';
import type { GamesControllerType } from '../models/game.model.js';
import type { ConnectionContext } from '../models/websocket.model.js';
import { logError, logIncomingCommand } from '../utils/logging.js';
import { printNewCommandSeparator } from '../utils/randomHelpers.js';

export class MessageRouter {
  private readonly playersController: PlayersControllerType;
  private readonly roomsController: RoomsControllerType;
  private readonly gamesController: GamesControllerType;

  constructor(dependencies: MessageRouterDependencies) {
    this.playersController = dependencies.playersController;
    this.roomsController = dependencies.roomsController;
    this.gamesController = dependencies.gamesController;
  }

  // Вызывается WebSocket-сервером, когда от клиента приходит строка.
  public async routeIncomingMessage(rawMessageText: string, connectionContext: ConnectionContext): Promise<void> {
    printNewCommandSeparator();
    logIncomingCommand(connectionContext.connectionId, rawMessageText);

    let parsedMessage: unknown;

    try {
      parsedMessage = JSON.parse(rawMessageText);
    } catch (errorInstance) {
      logError(`Failed to parse incoming JSON from ${connectionContext.connectionId}: ${String(errorInstance)}`);
      return;
    }

    if (!this.isValidClientMessage(parsedMessage)) {
      logError(`Invalid WebSocket message from ${connectionContext.connectionId}: ` + 'missing or unknown "type"');
      return;
    }

    const clientMessage: IncomingClientMessage = parsedMessage;

    try {
      await this.dispatchToController(connectionContext, clientMessage);
    } catch (errorInstance) {
      logError(
        `Error processing command "${clientMessage.type}" ` +
          `for connection ${connectionContext.connectionId}: ${String(errorInstance)}`
      );
    }
  }

  // Выбор контроллера по типу сообщения.
  private async dispatchToController(
    connectionContext: ConnectionContext,
    clientMessage: IncomingClientMessage
  ): Promise<void> {
    const messageType: MessageType = clientMessage.type;

    // 1. Команды игрока
    if (messageType === MESSAGE_TYPES.REG || messageType === MESSAGE_TYPES.UPDATE_WINNERS) {
      await this.playersController.handlePlayerMessage(connectionContext, clientMessage);
      return;
    }

    // 2. Команды комнат
    if (
      messageType === MESSAGE_TYPES.CREATE_ROOM ||
      messageType === MESSAGE_TYPES.ADD_USER_TO_ROOM ||
      messageType === MESSAGE_TYPES.UPDATE_ROOM
    ) {
      await this.roomsController.handleRoomMessage(connectionContext, clientMessage);
      return;
    }

    // 3. Команды игры
    if (
      messageType === MESSAGE_TYPES.ADD_SHIPS ||
      messageType === MESSAGE_TYPES.ATTACK ||
      messageType === MESSAGE_TYPES.RANDOM_ATTACK ||
      messageType === MESSAGE_TYPES.START_GAME ||
      messageType === MESSAGE_TYPES.FINISH ||
      messageType === MESSAGE_TYPES.TURN ||
      messageType === MESSAGE_TYPES.CREATE_GAME ||
      messageType === MESSAGE_TYPES.SINGLE_PLAY
    ) {
      await this.gamesController.handleGameMessage(connectionContext, clientMessage);
      return;
    }
    logError(`Unknown command type in MessageRouter: "${messageType}"`);
  }

  private isValidClientMessage(value: unknown): value is IncomingClientMessage {
    if (value === null || typeof value !== 'object') {
      return false;
    }

    const record = value as Record<string, unknown>;
    const typeCandidate = record.type;

    if (typeof typeCandidate !== 'string') {
      return false;
    }

    const allowedTypesSet = new Set<MessageType>(Object.values(MESSAGE_TYPES));
    return allowedTypesSet.has(typeCandidate as MessageType);
  }
}
