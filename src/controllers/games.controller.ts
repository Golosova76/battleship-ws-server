import type {
  AttackResponseData,
  AttackShipsRequestData,
  GamesControllerType,
  RandomAttackRequestData,
  ShipsRequestData,
} from '../models/game.model.js';
import type { GamesService } from '../services/games-service.js';
import type { ConnectionContext } from '../models/websocket.model.js';
import { MESSAGE_TYPES, type MessageBase, type MessageType, type UpdateWinnersResponseData } from '../models/types.js';
import { logCommandResultError, logCommandResultOk, logError, logInfo } from '../utils/logging.js';
import { sendBroadcastMessage, sendRoomMessage } from '../protocol/messageSender.js';
import { getGameRoomConnectionIds, requireGameState } from '../storage/game-storage.js';
import { getAllUsers } from '../storage/player-storage.js';

const BOT_MOVE_DELAY_MS = 4000;

export class GamesController implements GamesControllerType {
  private readonly gamesService: GamesService;

  constructor(gamesService: GamesService) {
    this.gamesService = gamesService;
  }

  public handleGameMessage(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<MessageType, unknown>
  ): void {
    logInfo(`[GamesController] handleGameMessage type="${clientMessage.type}" for ${connectionContext.connectionId}`);
    switch (clientMessage.type) {
      case MESSAGE_TYPES.ADD_SHIPS: {
        this.handleAddShips(connectionContext, clientMessage as MessageBase<typeof MESSAGE_TYPES.ADD_SHIPS, unknown>);
        break;
      }

      case MESSAGE_TYPES.ATTACK: {
        this.handleAttack(connectionContext, clientMessage as MessageBase<typeof MESSAGE_TYPES.ATTACK, unknown>);
        break;
      }

      case MESSAGE_TYPES.RANDOM_ATTACK: {
        this.handleRandomAttack(
          connectionContext,
          clientMessage as MessageBase<typeof MESSAGE_TYPES.RANDOM_ATTACK, unknown>
        );
        break;
      }

      case MESSAGE_TYPES.SINGLE_PLAY: {
        this.handleSinglePlay(
          connectionContext,
          clientMessage as MessageBase<typeof MESSAGE_TYPES.SINGLE_PLAY, unknown>
        );
        break;
      }

      default: {
        break;
      }
    }
  }

  // ---------- ADD_SHIPS ----------

  private handleAddShips(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<typeof MESSAGE_TYPES.ADD_SHIPS, unknown>
  ): void {
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
      const startGameResponseDataJson: string = JSON.stringify(startGameMessage.responseData);
      const responseMessage: MessageBase<typeof MESSAGE_TYPES.START_GAME, string> = {
        type: MESSAGE_TYPES.START_GAME,
        data: startGameResponseDataJson,
        id: clientMessage.id ?? 0,
      };

      // отправляем в "канал комнаты", но только одному игроку
      sendRoomMessage([startGameMessage.targetConnectionId], responseMessage);
    }

    // turn — обоим игрокам в комнате
    const roomConnectionIds = getGameRoomConnectionIds(placementResult.gameId);

    const turnResponseDataJson: string = JSON.stringify(placementResult.initialTurnResponseData);

    const turnResponse: MessageBase<typeof MESSAGE_TYPES.TURN, string> = {
      type: MESSAGE_TYPES.TURN,
      data: turnResponseDataJson,
      id: clientMessage.id ?? 0,
    };

    sendRoomMessage(roomConnectionIds, turnResponse);

    // лог результата команды
    logCommandResultOk(connectionContext.connectionId, clientMessage.type, placementResult);
  }

  // ---------- ATTACK ----------

  private handleAttack(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<typeof MESSAGE_TYPES.ATTACK, unknown>
  ): void {
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
    const attackResponseDataJson: string = JSON.stringify(attackResult.attackResponseData);

    const attackResponse: MessageBase<typeof MESSAGE_TYPES.ATTACK, string> = {
      type: MESSAGE_TYPES.ATTACK,
      data: attackResponseDataJson,
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

        const additionalAttackDataJson: string = JSON.stringify(additionalAttackData);

        const additionalAttackResponse: MessageBase<typeof MESSAGE_TYPES.ATTACK, string> = {
          type: MESSAGE_TYPES.ATTACK,
          data: additionalAttackDataJson,
          id: clientMessage.id ?? 0,
        };

        sendRoomMessage(attackResult.targetConnectionIds, additionalAttackResponse);
      }
    }

    // ход
    const turnResponseDataJson: string = JSON.stringify(attackResult.turnResponseData);

    const turnResponse: MessageBase<typeof MESSAGE_TYPES.TURN, string> = {
      type: MESSAGE_TYPES.TURN,
      data: turnResponseDataJson,
      id: clientMessage.id ?? 0,
    };

    sendRoomMessage(attackResult.targetConnectionIds, turnResponse);

    // завершение игры
    if (attackResult.finishResponseData) {
      const finishResponseDataJson: string = JSON.stringify(attackResult.finishResponseData);
      const finishResponse: MessageBase<typeof MESSAGE_TYPES.FINISH, string> = {
        type: MESSAGE_TYPES.FINISH,
        data: finishResponseDataJson,
        id: clientMessage.id ?? 0,
      };

      sendRoomMessage(attackResult.targetConnectionIds, finishResponse);

      const allUsers = getAllUsers();

      const winnersTable: UpdateWinnersResponseData = allUsers
        .map((user) => ({
          name: user.name,
          wins: user.totalWins,
        }))
        .sort((firstWinner, secondWinner) => secondWinner.wins - firstWinner.wins);

      const winnersTableJson: string = JSON.stringify(winnersTable);

      const updateWinnersMessage: MessageBase<typeof MESSAGE_TYPES.UPDATE_WINNERS, string> = {
        type: MESSAGE_TYPES.UPDATE_WINNERS,
        data: winnersTableJson,
        id: 0,
      };

      sendBroadcastMessage(updateWinnersMessage);
    }

    if (!attackResult.finishResponseData) {
      const nextPlayerId = attackResult.turnResponseData.currentPlayer;

      const gameState = requireGameState(attackResult.gameId);
      const nextPlayerState = gameState.players.find((playerState) => playerState.gamePlayerId === nextPlayerId);

      if (nextPlayerState && nextPlayerState.connectionId === '') {
        const botRandomAttackMessage: MessageBase<typeof MESSAGE_TYPES.RANDOM_ATTACK, string> = {
          type: MESSAGE_TYPES.RANDOM_ATTACK,
          data: JSON.stringify({
            gameId: attackResult.gameId,
            indexPlayer: nextPlayerId,
          }),
          id: 0,
        };

        setTimeout(() => {
          this.handleBotAttack(connectionContext, botRandomAttackMessage);
        }, BOT_MOVE_DELAY_MS);
      }
    }

    // лог результата команды
    logCommandResultOk(connectionContext.connectionId, clientMessage.type, attackResult);
  }

  // ---------- RANDOM_ATTACK ----------

  private handleRandomAttack(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<typeof MESSAGE_TYPES.RANDOM_ATTACK, unknown>
  ): void {
    const randomAttackRequestData = this.parseRandomAttackRequestData(clientMessage.data);

    if (!randomAttackRequestData) {
      logError(`Invalid data for randomAttack from connection ${connectionContext.connectionId}`);
      return;
    }

    const attackResult = this.gamesService.processRandomAttack({
      requestData: randomAttackRequestData,
    });

    // основной выстрел
    const attackResponseDataJson: string = JSON.stringify(attackResult.attackResponseData);

    const attackResponse: MessageBase<typeof MESSAGE_TYPES.ATTACK, string> = {
      type: MESSAGE_TYPES.ATTACK,
      data: attackResponseDataJson,
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

        const additionalAttackDataJson: string = JSON.stringify(additionalAttackData);

        const additionalAttackResponse: MessageBase<typeof MESSAGE_TYPES.ATTACK, string> = {
          type: MESSAGE_TYPES.ATTACK,
          data: additionalAttackDataJson,
          id: clientMessage.id ?? 0,
        };

        sendRoomMessage(attackResult.targetConnectionIds, additionalAttackResponse);
      }
    }

    // ход
    const turnResponseDataJson: string = JSON.stringify(attackResult.turnResponseData);

    const turnResponse: MessageBase<typeof MESSAGE_TYPES.TURN, string> = {
      type: MESSAGE_TYPES.TURN,
      data: turnResponseDataJson,
      id: clientMessage.id ?? 0,
    };

    sendRoomMessage(attackResult.targetConnectionIds, turnResponse);

    // завершение игры
    if (attackResult.finishResponseData) {
      const finishResponseDataJson: string = JSON.stringify(attackResult.finishResponseData);

      const finishResponse: MessageBase<typeof MESSAGE_TYPES.FINISH, string> = {
        type: MESSAGE_TYPES.FINISH,
        data: finishResponseDataJson,
        id: clientMessage.id ?? 0,
      };

      sendRoomMessage(attackResult.targetConnectionIds, finishResponse);

      const allUsers = getAllUsers();

      const winnersTable: UpdateWinnersResponseData = allUsers
        .map((user) => ({
          name: user.name,
          wins: user.totalWins,
        }))
        .sort((firstWinner, secondWinner) => secondWinner.wins - firstWinner.wins);

      const winnersTableJson: string = JSON.stringify(winnersTable);

      const updateWinnersMessage: MessageBase<typeof MESSAGE_TYPES.UPDATE_WINNERS, string> = {
        type: MESSAGE_TYPES.UPDATE_WINNERS,
        data: winnersTableJson,
        id: 0,
      };

      sendBroadcastMessage(updateWinnersMessage);
    }

    // лог результата команды
    logCommandResultOk(connectionContext.connectionId, clientMessage.type, attackResult);
  }

  // ---------- BOT_ATTACK ----------

  private handleSinglePlay(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<typeof MESSAGE_TYPES.SINGLE_PLAY, unknown>
  ): void {
    logInfo(`[GamesController] handleSinglePlay for ${connectionContext.connectionId}`);
    try {
      const userId = this.getUserIndexFromConnectionContext(connectionContext);
      logInfo(`[GamesController] single_play userId resolved: ${String(userId)}`);
      if (!userId) {
        logError(`Single play requested from connection ${connectionContext.connectionId}, but user not found`);
        return;
      }

      logInfo('[GamesController] single_play before createSinglePlayGame');

      const singlePlayCreationResult = this.gamesService.createSinglePlayGame({
        userId,
        connectionId: connectionContext.connectionId,
      });

      logInfo('[GamesController] single_play after createSinglePlayGame');

      const gameState = singlePlayCreationResult.gameState;
      const humanPlayerId = singlePlayCreationResult.humanPlayerId;

      // -------- create_game --------
      const createGameResponseData = {
        idGame: gameState.gameId,
        idPlayer: humanPlayerId,
      };

      const createGameResponseMessage: MessageBase<typeof MESSAGE_TYPES.CREATE_GAME, string> = {
        type: MESSAGE_TYPES.CREATE_GAME,
        data: JSON.stringify(createGameResponseData),
        id: clientMessage.id ?? 0,
      };

      const responseTargetConnectionIds = getGameRoomConnectionIds(gameState.gameId);
      logInfo(
        `[GamesController] single_play connectionIds for game ${gameState.gameId}: ` +
          JSON.stringify(responseTargetConnectionIds)
      );
      sendRoomMessage(responseTargetConnectionIds, createGameResponseMessage);

      logCommandResultOk(connectionContext.connectionId, clientMessage.type, {
        gameId: gameState.gameId,
        humanPlayerId,
      });
    } catch (error) {
      logCommandResultError(connectionContext.connectionId, clientMessage.type, String(error));
    }
  }

  private handleBotAttack(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<typeof MESSAGE_TYPES.RANDOM_ATTACK, unknown>
  ): void {
    const randomAttackRequestData = this.parseRandomAttackRequestData(clientMessage.data);

    if (!randomAttackRequestData) {
      logError(`Invalid data for randomAttack from connection ${connectionContext.connectionId}`);
      return;
    }

    const attackResult = this.gamesService.processBotAttack(randomAttackRequestData.gameId);

    // основной выстрел
    const attackResponseDataJson: string = JSON.stringify(attackResult.attackResponseData);

    const attackResponse: MessageBase<typeof MESSAGE_TYPES.ATTACK, string> = {
      type: MESSAGE_TYPES.ATTACK,
      data: attackResponseDataJson,
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

        const additionalAttackDataJson: string = JSON.stringify(additionalAttackData);

        const additionalAttackResponse: MessageBase<typeof MESSAGE_TYPES.ATTACK, string> = {
          type: MESSAGE_TYPES.ATTACK,
          data: additionalAttackDataJson,
          id: clientMessage.id ?? 0,
        };

        sendRoomMessage(attackResult.targetConnectionIds, additionalAttackResponse);
      }
    }

    // ход
    const turnResponseDataJson: string = JSON.stringify(attackResult.turnResponseData);

    const turnResponse: MessageBase<typeof MESSAGE_TYPES.TURN, string> = {
      type: MESSAGE_TYPES.TURN,
      data: turnResponseDataJson,
      id: clientMessage.id ?? 0,
    };

    sendRoomMessage(attackResult.targetConnectionIds, turnResponse);

    // завершение игры
    if (attackResult.finishResponseData) {
      const finishResponseDataJson: string = JSON.stringify(attackResult.finishResponseData);

      const finishResponse: MessageBase<typeof MESSAGE_TYPES.FINISH, string> = {
        type: MESSAGE_TYPES.FINISH,
        data: finishResponseDataJson,
        id: clientMessage.id ?? 0,
      };

      sendRoomMessage(attackResult.targetConnectionIds, finishResponse);

      const allUsers = getAllUsers();

      const winnersTable: UpdateWinnersResponseData = allUsers
        .map((user) => ({
          name: user.name,
          wins: user.totalWins,
        }))
        .sort((firstWinner, secondWinner) => secondWinner.wins - firstWinner.wins);

      const winnersTableJson: string = JSON.stringify(winnersTable);

      const updateWinnersMessage: MessageBase<typeof MESSAGE_TYPES.UPDATE_WINNERS, string> = {
        type: MESSAGE_TYPES.UPDATE_WINNERS,
        data: winnersTableJson,
        id: 0,
      };

      sendBroadcastMessage(updateWinnersMessage);

      logCommandResultOk(connectionContext.connectionId, clientMessage.type, attackResult);
      return;
    }

    // если после выстрела всё ещё ход бота — делаем ещё один ход бота
    if (attackResult.turnResponseData.currentPlayer === randomAttackRequestData.indexPlayer) {
      const nextBotRandomAttackMessage: MessageBase<typeof MESSAGE_TYPES.RANDOM_ATTACK, string> = {
        type: MESSAGE_TYPES.RANDOM_ATTACK,
        data: JSON.stringify({
          gameId: attackResult.gameId,
          indexPlayer: randomAttackRequestData.indexPlayer,
        }),
        id: 0,
      };

      setTimeout(() => {
        this.handleBotAttack(connectionContext, nextBotRandomAttackMessage);
      }, BOT_MOVE_DELAY_MS);
    }

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

  private getUserIndexFromConnectionContext(connectionContext: ConnectionContext): string | number | null {
    if (typeof connectionContext.userIndex === 'string' || typeof connectionContext.userIndex === 'number') {
      return connectionContext.userIndex;
    }

    logError(`Cannot extract userIndex from ConnectionContext for connection ${connectionContext.connectionId}`);
    return null;
  }
}
