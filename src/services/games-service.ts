import type {
  AttackProcessingParams,
  AttackProcessingResult,
  AttackResponseData,
  BoardCell,
  CreateGameForRoomParams,
  FinishResponseData,
  GameId,
  GamePlayerCreationData,
  GameShipsResponseData,
  GameState,
  Position,
  RandomAttackRequestData,
  ShipsPlacementResult,
  ShipsRequestData,
  TurnResponseData,
} from '../models/game.model.js';
import type { PlayerInGameId } from '../models/user.model.js';
import {
  createGameState,
  deleteGameState,
  findOpponentStateInGame,
  findPlayerStateInGame,
  requireGameState,
  saveGameState,
} from '../storage/game-storage.js';
import { applyAttackToGameState } from '../game/board-logic.js';
import { getRandomFreeAttackPosition } from '../utils/random-helpers.js';


export class GamesService {

  public createGameForRoom(params: CreateGameForRoomParams): GameState {

    const playersForCreation: GamePlayerCreationData[] = params.players.map((player) => ({
      gamePlayerId: player.gamePlayerId,
      userId: player.userId,
      connectionId: player.connectionId,
    }));

    const gameState = createGameState({
      gameId: params.gameId,
      roomId: params.roomId,
      players: playersForCreation,
      firstPlayerId: params.firstPlayerId,
    });

    return gameState;
  }

  public placeShips(requestData: ShipsRequestData): ShipsPlacementResult | null {
    const gameState = requireGameState(requestData.gameId);

    const currentPlayerState = findPlayerStateInGame(
      requestData.gameId,
      requestData.indexPlayer
    );

    if (!currentPlayerState) {
      throw new Error('Player not found in game while placing ships');
    }

    currentPlayerState.ships = requestData.ships;

    const allPlayersPlacedShips =
      gameState.players.length === 2 &&
      gameState.players.every(
        (playerState) => playerState.ships && playerState.ships.length > 0
      );

    saveGameState(gameState);

    if (!allPlayersPlacedShips || gameState.currentPlayerId === null) {
      return null;
    }

    const startGameForPlayers = gameState.players.map((playerState) => {
      const responseData: GameShipsResponseData = {
        ships: playerState.ships,
        currentPlayerIndex: gameState.currentPlayerId as PlayerInGameId,
      };

      return {
        targetConnectionId: playerState.connectionId,
        responseData,
      };
    });

    const initialTurnResponseData: TurnResponseData = {
      currentPlayer: gameState.currentPlayerId,
    };

    return {
      gameId: requestData.gameId,
      startGameForPlayers,
      initialTurnResponseData,
    };
  }

  public processAttack(params: AttackProcessingParams): AttackProcessingResult {

    const gameState = requireGameState(params.gameId);

    if (gameState.isFinished) {
      throw new Error('Game is already finished');
    }

    if (gameState.currentPlayerId !== params.attackerPlayerId) {
      throw new Error('It is not this player turn');
    }

    const attackerState = findPlayerStateInGame(
      params.gameId,
      params.attackerPlayerId
    );

    const opponentState = findOpponentStateInGame(
      params.gameId,
      params.attackerPlayerId
    );

    if (!attackerState || !opponentState) {
      throw new Error('Attacker or opponent not found in game');
    }

    const attackLogicResult = applyAttackToGameState({
      gameState,
      attackerPlayerId: params.attackerPlayerId,
      x: params.position.x,
      y: params.position.y,
    });

    const additionalMissCells: Position[] = [];

    // Добавляем дополнительные 'miss' вокруг убитого корабля
    if (attackLogicResult.killedShipAroundCells.length > 0) {
      for (const pos of attackLogicResult.killedShipAroundCells) {
        const exists = attackerState.board.cells.find(
          (cell) => cell.x === pos.x && cell.y === pos.y
        );

        if (!exists) {
          const boardCell: BoardCell = { x: pos.x, y: pos.y, status: 'miss' };
          attackerState.board.cells.push(boardCell);
          additionalMissCells.push({ x: pos.x, y: pos.y });
        }
      }
    }

    const isMiss = attackLogicResult.status === 'miss';

    const nextPlayerIndex: PlayerInGameId = isMiss
      ? opponentState.gamePlayerId
      : attackerState.gamePlayerId;

    gameState.currentPlayerId = nextPlayerIndex;

    let finishResponseData: FinishResponseData | undefined;

    if (attackLogicResult.isGameOver) {
      gameState.isFinished = true;
      gameState.winnerPlayerId = attackerState.gamePlayerId;

      finishResponseData = {
        winPlayer: attackerState.gamePlayerId,
      };

      deleteGameState(params.gameId);
    } else {
      saveGameState(gameState);
    }

    const attackResponseData: AttackResponseData = {
      position: { x: params.position.x, y: params.position.y },
      currentPlayer: params.attackerPlayerId,
      status: attackLogicResult.status,
    };

    const turnResponseData: TurnResponseData = {
      currentPlayer: nextPlayerIndex,
    };

    const targetConnectionIds = gameState.players.map(
      (playerState) => playerState.connectionId
    );

    return {
      gameId: params.gameId,
      targetConnectionIds,
      attackResponseData,
      additionalMissCells,
      turnResponseData,
      finishResponseData,
    };
  }

  public processRandomAttack(params: { requestData: RandomAttackRequestData; }): AttackProcessingResult {

    const attackerState = findPlayerStateInGame(
      params.requestData.gameId,
      params.requestData.indexPlayer
    );

    if (!attackerState) {
      throw new Error('Player not found in game for random attack');
    }

    const randomPosition = getRandomFreeAttackPosition({
      existingBoardCells: attackerState.board?.cells ?? [],
    });

    if (!randomPosition) {
      throw new Error('There are no free cells left for random attack');
    }

    return this.processAttack({
      gameId: params.requestData.gameId,
      attackerPlayerId: params.requestData.indexPlayer,
      position: randomPosition,
    });
  }
}
