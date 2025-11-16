import type {
  AttackResponseData,
  AttackShipsRequestData,
  FinishResponseData,
  GamesControllerType,
  GameShipsResponseData,
  RandomAttackRequestData,
  ShipsRequestData,
  TurnResponseData,
} from '../models/game.model.js';
import type { GamesService } from '../services/games-service.js';
import type { ConnectionContext } from '../models/websocket.model.js';
import { MESSAGE_TYPES, type MessageBase, type MessageType } from '../models/types.js';
import { logCommandResultOk, logError } from '../utils/logging.js';
import { sendRoomMessage } from '../protocol/messageSender.js';
import { getGameRoomConnectionIds } from '../storage/game-storage.js';


export class GamesController implements GamesControllerType {
  private readonly gamesService: GamesService;

  constructor(gamesService: GamesService) {
    this.gamesService = gamesService;
  }

  public handleGameMessage(connectionContext: ConnectionContext, clientMessage: MessageBase<MessageType, unknown>): void {
    switch (clientMessage.type) {
      case MESSAGE_TYPES.ADD_SHIPS: {
        this.handleAddShips(
          connectionContext,
          clientMessage as MessageBase<typeof MESSAGE_TYPES.ADD_SHIPS, unknown>
        );
        break;
      }

      case MESSAGE_TYPES.ATTACK: {
        this.handleAttack(
          connectionContext,
          clientMessage as MessageBase<typeof MESSAGE_TYPES.ATTACK, unknown>
        );
        break;
      }

      case MESSAGE_TYPES.RANDOM_ATTACK: {
        this.handleRandomAttack(
          connectionContext,
          clientMessage as MessageBase<typeof MESSAGE_TYPES.RANDOM_ATTACK, unknown>
        );
        break;
      }

      default: {
        // остальные игровые типы (start_game, turn, finish, create_game, single_play)
        // — это ответы сервера, а не команды клиента
        break;
      }
    }
  }

  // ---------- ADD_SHIPS ----------

  private handleAddShips(connectionContext: ConnectionContext, clientMessage: MessageBase<typeof MESSAGE_TYPES.ADD_SHIPS, unknown>): void {
    const shipsRequestData = this.parseShipsRequestData(clientMessage.data);

    if (!shipsRequestData) {
      logError(`Invalid data for add_ships from connection ${connectionContext.connectionId}`);
      return;
    }

    const placementResult = this.gamesService.placeShips(shipsRequestData);

    if (!placementResult) {
      // Корабли этого игрока приняты, но второй ещё не готов.
      // Для логов — команда успешно обработана.
      logCommandResultOk(connectionContext.connectionId, clientMessage.type, {
        status: 'ships_accepted_waiting_opponent',
        gameId: shipsRequestData.gameId,
        player: shipsRequestData.indexPlayer,
      });
      return;
    }

    // start_game — каждому игроку персонально
    for (const startGameMessage of placementResult.startGameForPlayers) {
      const responseMessage: MessageBase<typeof MESSAGE_TYPES.START_GAME, GameShipsResponseData> = {
        type: MESSAGE_TYPES.START_GAME,
        data: startGameMessage.responseData,
        id: clientMessage.id ?? 0,
      };

      // отправляем в "канал комнаты", но только одному игроку
      sendRoomMessage([startGameMessage.targetConnectionId], responseMessage);
    }

    // turn — обоим игрокам в комнате
    const roomConnectionIds = getGameRoomConnectionIds(placementResult.gameId);

    const turnResponse: MessageBase<typeof MESSAGE_TYPES.TURN, TurnResponseData> = {
      type: MESSAGE_TYPES.TURN,
      data: placementResult.initialTurnResponseData,
      id: clientMessage.id ?? 0,
    };

    sendRoomMessage(roomConnectionIds, turnResponse);

    // лог результата команды
    logCommandResultOk(connectionContext.connectionId, clientMessage.type, placementResult);
  }

  // ---------- ATTACK ----------

  private handleAttack(connectionContext: ConnectionContext, clientMessage: MessageBase<typeof MESSAGE_TYPES.ATTACK, unknown>): void {
    const attackRequestData = this.parseAttackShipsRequestData(clientMessage.data);

    if (!attackRequestData) {
      logError(`Invalid data for attack from connection ${connectionContext.connectionId}`);
      return;
    }

    const attackResult = this.gamesService.processAttack({
      gameId: attackRequestData.gameId,
      attackerPlayerId: attackRequestData.indexPlayer,
      position: {
        x: attackRequestData.x,
        y: attackRequestData.y,
      },
    });

    // основной выстрел
    const attackResponse: MessageBase<typeof MESSAGE_TYPES.ATTACK, AttackResponseData> = {
      type: MESSAGE_TYPES.ATTACK,
      data: attackResult.attackResponseData,
      id: clientMessage.id ?? 0,
    };

    sendRoomMessage(attackResult.targetConnectionIds, attackResponse);

    // дополнительные miss вокруг убитого корабля
    if (attackResult.additionalMissCells.length > 0) {
      for (const additionalPosition of attackResult.additionalMissCells) {
        const additionalAttackData: AttackResponseData = {
          position: additionalPosition,
          currentPlayer: attackRequestData.indexPlayer,
          status: 'miss',
        };

        const additionalAttackResponse: MessageBase<typeof MESSAGE_TYPES.ATTACK, AttackResponseData> = {
          type: MESSAGE_TYPES.ATTACK,
          data: additionalAttackData,
          id: clientMessage.id ?? 0,
        };

        sendRoomMessage(attackResult.targetConnectionIds, additionalAttackResponse);
      }
    }

    // ход
    const turnResponse: MessageBase<typeof MESSAGE_TYPES.TURN, TurnResponseData> = {
      type: MESSAGE_TYPES.TURN,
      data: attackResult.turnResponseData,
      id: clientMessage.id ?? 0,
    };

    sendRoomMessage(attackResult.targetConnectionIds, turnResponse);

    // завершение игры
    if (attackResult.finishResponseData) {
      const finishResponse: MessageBase<typeof MESSAGE_TYPES.FINISH, FinishResponseData> = {
        type: MESSAGE_TYPES.FINISH,
        data: attackResult.finishResponseData,
        id: clientMessage.id ?? 0,
      };

      sendRoomMessage(attackResult.targetConnectionIds, finishResponse);
    }

    // лог результата команды
    logCommandResultOk(connectionContext.connectionId, clientMessage.type, attackResult);
  }

  // ---------- RANDOM_ATTACK ----------

  private handleRandomAttack(connectionContext: ConnectionContext, clientMessage: MessageBase<typeof MESSAGE_TYPES.RANDOM_ATTACK, unknown>): void {
    const randomAttackRequestData = this.parseRandomAttackRequestData(clientMessage.data);

    if (!randomAttackRequestData) {
      logError(`Invalid data for randomAttack from connection ${connectionContext.connectionId}`);
      return;
    }

    const attackResult = this.gamesService.processRandomAttack({
      requestData: randomAttackRequestData,
    });

    // основной выстрел
    const attackResponse: MessageBase<typeof MESSAGE_TYPES.ATTACK, AttackResponseData> = {
      type: MESSAGE_TYPES.ATTACK,
      data: attackResult.attackResponseData,
      id: clientMessage.id ?? 0,
    };

    sendRoomMessage(attackResult.targetConnectionIds, attackResponse);

    // дополнительные miss вокруг убитого корабля
    if (attackResult.additionalMissCells.length > 0) {
      for (const additionalPosition of attackResult.additionalMissCells) {
        const additionalAttackData: AttackResponseData = {
          position: additionalPosition,
          currentPlayer: randomAttackRequestData.indexPlayer,
          status: 'miss',
        };

        const additionalAttackResponse: MessageBase<typeof MESSAGE_TYPES.ATTACK, AttackResponseData> = {
          type: MESSAGE_TYPES.ATTACK,
          data: additionalAttackData,
          id: clientMessage.id ?? 0,
        };

        sendRoomMessage(attackResult.targetConnectionIds, additionalAttackResponse);
      }
    }

    // ход
    const turnResponse: MessageBase<typeof MESSAGE_TYPES.TURN, TurnResponseData> = {
      type: MESSAGE_TYPES.TURN,
      data: attackResult.turnResponseData,
      id: clientMessage.id ?? 0,
    };

    sendRoomMessage(attackResult.targetConnectionIds, turnResponse);

    // завершение игры
    if (attackResult.finishResponseData) {
      const finishResponse: MessageBase<typeof MESSAGE_TYPES.FINISH, FinishResponseData> = {
        type: MESSAGE_TYPES.FINISH,
        data: attackResult.finishResponseData,
        id: clientMessage.id ?? 0,
      };

      sendRoomMessage(attackResult.targetConnectionIds, finishResponse);
    }

    // лог результата команды
    logCommandResultOk(connectionContext.connectionId, clientMessage.type, attackResult);
  }

  // ---------- парсеры данных ----------

  private parseShipsRequestData(rawData: unknown): ShipsRequestData | null {
    let normalizedData: unknown = rawData;

    if (typeof normalizedData === 'string') {
      try {
        normalizedData = JSON.parse(normalizedData);
      } catch {
        return null;
      }
    }

    if (!normalizedData || typeof normalizedData !== 'object') {
      return null;
    }

    const candidate = normalizedData as {
      gameId?: unknown;
      ships?: unknown;
      indexPlayer?: unknown;
    };

    if (
      (typeof candidate.gameId === 'string' || typeof candidate.gameId === 'number') &&
      (typeof candidate.indexPlayer === 'string' || typeof candidate.indexPlayer === 'number') &&
      Array.isArray(candidate.ships)
    ) {
      // здесь можно сделать более жёсткую проверку ships, если захочешь
      return {
        gameId: candidate.gameId,
        ships: candidate.ships as ShipsRequestData['ships'],
        indexPlayer: candidate.indexPlayer,
      };
    }

    return null;
  }

  private parseAttackShipsRequestData(rawData: unknown): AttackShipsRequestData | null {
    let normalizedData: unknown = rawData;

    if (typeof normalizedData === 'string') {
      try {
        normalizedData = JSON.parse(normalizedData);
      } catch {
        return null;
      }
    }

    if (!normalizedData || typeof normalizedData !== 'object') {
      return null;
    }

    const candidate = normalizedData as {
      gameId?: unknown;
      x?: unknown;
      y?: unknown;
      indexPlayer?: unknown;
    };

    if (
      (typeof candidate.gameId === 'string' || typeof candidate.gameId === 'number') &&
      typeof candidate.x === 'number' &&
      typeof candidate.y === 'number' &&
      (typeof candidate.indexPlayer === 'string' || typeof candidate.indexPlayer === 'number')
    ) {
      return {
        gameId: candidate.gameId,
        x: candidate.x,
        y: candidate.y,
        indexPlayer: candidate.indexPlayer,
      };
    }

    return null;
  }

  private parseRandomAttackRequestData(rawData: unknown): RandomAttackRequestData | null {
    let normalizedData: unknown = rawData;

    if (typeof normalizedData === 'string') {
      try {
        normalizedData = JSON.parse(normalizedData);
      } catch {
        return null;
      }
    }

    if (!normalizedData || typeof normalizedData !== 'object') {
      return null;
    }

    const candidate = normalizedData as {
      gameId?: unknown;
      indexPlayer?: unknown;
    };

    if (
      (typeof candidate.gameId === 'string' || typeof candidate.gameId === 'number') &&
      (typeof candidate.indexPlayer === 'string' || typeof candidate.indexPlayer === 'number')
    ) {
      return {
        gameId: candidate.gameId,
        indexPlayer: candidate.indexPlayer,
      };
    }

    return null;
  }
}
