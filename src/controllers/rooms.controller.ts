import type {
  RoomsControllerType,
  RoomUsers,
  UserToRoomOneResponseData,
  UserToRoomRequestData,
} from '../models/rooms.model.js';
import type { ConnectionContext } from '../models/websocket.model.js';
import { MESSAGE_TYPES, type MessageBase, type MessageType } from '../models/types.js';
import { sendBroadcastMessage, sendRoomMessage } from '../protocol/messageSender.js';
import type { RoomsService } from '../services/rooms-service.js';
import { logError } from '../utils/logging.js';
import type { GamesService } from '../services/games-service.js';
import { generateGameId, generatePlayerIdGame } from '../utils/id-generator.js';
import type { PlayerInGameId } from '../models/user.model.js';
import type { CreateGameStateParams, GameId, GamePlayerCreationData, GameResponseData } from '../models/game.model.js';

export class RoomsController implements RoomsControllerType {
  private readonly roomsService: RoomsService;
  private readonly gamesService: GamesService;

  constructor(roomsService: RoomsService, gamesService: GamesService) {
    this.roomsService = roomsService;
    this.gamesService = gamesService;
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

    const { roomsForBroadcast } = this.roomsService.createRoomForUser(roomUser, connectionContext.connectionId);

    const updateRoomResponseData: UserToRoomOneResponseData = roomsForBroadcast;
    const updateRoomResponseDataJson: string = JSON.stringify(updateRoomResponseData);

    const updateRoomResponseMessage: MessageBase<typeof MESSAGE_TYPES.UPDATE_ROOM, string> = {
      type: MESSAGE_TYPES.UPDATE_ROOM,
      data: updateRoomResponseDataJson, // фронт ждёт строку
      id: clientMessage.id ?? 0,
    };

    // Ответ для всех (response for all)
    sendBroadcastMessage(updateRoomResponseMessage);
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

    const serviceResult = this.roomsService.addUserToRoom(parsedRequestData, roomUser, connectionContext.connectionId);

    const updateRoomResponseData: UserToRoomOneResponseData = serviceResult.updatedRoomsForBroadcast;
    const updateRoomResponseDataJson: string = JSON.stringify(updateRoomResponseData);

    const updateRoomResponseMessage: MessageBase<typeof MESSAGE_TYPES.UPDATE_ROOM, string> = {
      type: MESSAGE_TYPES.UPDATE_ROOM,
      data: updateRoomResponseDataJson,
      id: clientMessage.id ?? 0,
    };

    // Ответ для всех (response for all)
    sendBroadcastMessage(updateRoomResponseMessage);

    // 2. Если targetRoomState пустой — игры не создаём
    if (!serviceResult.targetRoomState) {
      return;
    }

    const roomState = serviceResult.targetRoomState;

    const generatedGameId: GameId = generateGameId();

    const playersCreationData: GamePlayerCreationData[] = roomState.roomUsers.map((roomUser, index) => {
      const connectionId = roomState.connections[index];
      if (!connectionId) {
        logError(`Missing connectionId for room "${String(roomState.roomId)}" at position ${index}`);
      }

      const creationData: GamePlayerCreationData = {
        gamePlayerId: generatePlayerIdGame(),
        userId: roomUser.index,
        connectionId: connectionId ?? '',
      };

      return creationData;
    });

    const firstPlayerId: PlayerInGameId = playersCreationData[0].gamePlayerId;

    const createGameParams: CreateGameStateParams = {
      gameId: generatedGameId,
      roomId: roomState.roomId,
      players: playersCreationData,
      firstPlayerId,
    };

    const createdGameState = this.gamesService.createGameForRoom(createGameParams);

    // 5. Рассылаем обоим игрокам личные ответы create_game
    for (const playerState of createdGameState.players) {
      const responseData: GameResponseData = {
        idGame: createdGameState.gameId,
        idPlayer: playerState.gamePlayerId, // 0 или 1 как idPlayer
      };

      const responseDataJson: string = JSON.stringify(responseData);

      const responseMessage: MessageBase<typeof MESSAGE_TYPES.CREATE_GAME, string> = {
        type: MESSAGE_TYPES.CREATE_GAME,
        data: responseDataJson,
        id: clientMessage.id ?? 0,
      };

      sendRoomMessage([playerState.connectionId], responseMessage);
    }
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
