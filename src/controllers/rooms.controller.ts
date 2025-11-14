import type {
  RoomsControllerType,
  RoomUsers,
  UserToRoomOneResponseData,
  UserToRoomRequestData,
} from '../models/rooms.model.js';
import type { ConnectionContext } from '../models/websocket.model.js';
import { logCommand, logError } from '../utils/logging.js';
import { MESSAGE_TYPES, type MessageBase, type MessageType } from '../models/types.js';
import { sendBroadcastMessage } from '../protocol/messageSender.js';
import type { RoomsService } from '../services/rooms-service.js';
import { LOG_COMMAND } from '../models/messages-text.model.js';

export class RoomsController implements RoomsControllerType {
  private readonly roomsService: RoomsService;

  constructor(roomsService: RoomsService) {
    this.roomsService = roomsService;
  }

  public handleRoomMessage(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<MessageType, unknown>
  ): void {
    switch (clientMessage.type) {
      case MESSAGE_TYPES.CREATE_ROOM: {
        this.handleCreateRoom(
          connectionContext,
          clientMessage as MessageBase<typeof MESSAGE_TYPES.CREATE_ROOM, unknown>
        );
        break;
      }

      case MESSAGE_TYPES.ADD_USER_TO_ROOM: {
        this.handleAddUserToRoom(
          connectionContext,
          clientMessage as MessageBase<typeof MESSAGE_TYPES.ADD_USER_TO_ROOM, unknown>
        );
        break;
      }

      default: {
        // Команды не для комнат — игнорируем
        break;
      }
    }
  }

  // --------- приватные хендлеры ---------

  private handleCreateRoom(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<typeof MESSAGE_TYPES.CREATE_ROOM, unknown>
  ): void {
    const roomUser = this.extractRoomUserFromConnectionContext(connectionContext);
    if (!roomUser) {
      return;
    }

    const { roomsForBroadcast } = this.roomsService.createRoomForUser(roomUser);

    const updateRoomResponseData: UserToRoomOneResponseData = roomsForBroadcast;
    const updateRoomResponseDataJson: string = JSON.stringify(updateRoomResponseData);

    const updateRoomResponseMessage: MessageBase<typeof MESSAGE_TYPES.UPDATE_ROOM, string> = {
      type: MESSAGE_TYPES.UPDATE_ROOM,
      data: updateRoomResponseDataJson, // фронт ждёт строку
      id: clientMessage.id ?? 0,
    };

    // Ответ для всех (response for all)
    sendBroadcastMessage(updateRoomResponseMessage);

    // Лог результата команды (как в задании: команда + результат)
    logCommand(
      LOG_COMMAND.RESULT_OK(
        connectionContext.connectionId,
        MESSAGE_TYPES.UPDATE_ROOM,
        updateRoomResponseDataJson
      )
    );
  }

  private handleAddUserToRoom(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<typeof MESSAGE_TYPES.ADD_USER_TO_ROOM, unknown>
  ): void {
    const roomUser = this.extractRoomUserFromConnectionContext(connectionContext);
    if (!roomUser) {
      return;
    }

    const parsedRequestData = this.parseUserToRoomRequestData(clientMessage.data);

    if (!parsedRequestData) {
      logError(`Invalid data for add_user_to_room from connection ${connectionContext.connectionId}`);
      return;
    }

    const serviceResult = this.roomsService.addUserToRoom(parsedRequestData, roomUser);

    const updateRoomResponseData: UserToRoomOneResponseData = serviceResult.updatedRoomsForBroadcast;
    const updateRoomResponseDataJson: string = JSON.stringify(updateRoomResponseData);

    const updateRoomResponseMessage: MessageBase<typeof MESSAGE_TYPES.UPDATE_ROOM, string> = {
      type: MESSAGE_TYPES.UPDATE_ROOM,
      data: updateRoomResponseDataJson,
      id: clientMessage.id ?? 0,
    };

    // Ответ для всех (response for all)
    sendBroadcastMessage(updateRoomResponseMessage);

    // Лог результата команды update_room
    logCommand(
      LOG_COMMAND.RESULT_OK(
        connectionContext.connectionId,
        MESSAGE_TYPES.UPDATE_ROOM,
        updateRoomResponseDataJson
      )
    );

    // Дальше здесь будет "response for the game room":
    // - gamesService.createGameForRoom(serviceResult.targetRoomState)
    // - генерация idGame, idPlayer и отправка create_game двум игрокам комнаты
  }

  // --------- хелперы ---------

  private parseUserToRoomRequestData(rawData: unknown): UserToRoomRequestData | null {
    let normalizedData: unknown = rawData;

    // вариант 1: data — строка с JSON
    if (typeof normalizedData === 'string') {
      try {
        normalizedData = JSON.parse(normalizedData);
      } catch {
        return null;
      }
    }

    // вариант 2: уже объект
    if (normalizedData && typeof normalizedData === 'object') {
      const candidate = normalizedData as { indexRoom?: unknown };

      if (
        'indexRoom' in candidate &&
        (typeof candidate.indexRoom === 'string' || typeof candidate.indexRoom === 'number')
      ) {
        return { indexRoom: candidate.indexRoom };
      }
    }

    return null;
  }

  private extractRoomUserFromConnectionContext(connectionContext: ConnectionContext): RoomUsers | null {
    if (
      typeof connectionContext.userName === 'string' &&
      (typeof connectionContext.userIndex === 'string' || typeof connectionContext.userIndex === 'number')
    ) {
      const roomUser: RoomUsers = {
        name: connectionContext.userName,
        index: connectionContext.userIndex,
      };

      return roomUser;
    }

    logError(`Cannot extract RoomUsers from ConnectionContext for connection ${connectionContext.connectionId}`);
    return null;
  }
}