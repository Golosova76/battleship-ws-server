import type { CreateGameStateParams, GameId, GamePlayerState, GameState } from '../models/game.model.js';
import type { PlayerInGameId } from '../models/user.model.js';

const gamesStorage = new Map<GameId, GameState>();

export function createGameState(params: CreateGameStateParams): GameState {
  const playersState: GamePlayerState[] = params.players.map((player) => ({
    gamePlayerId: player.gamePlayerId,
    userId: player.userId,
    connectionId: player.connectionId,
    ships: [],
    board: { cells: [] },
  }));

  const gameState: GameState = {
    gameId: params.gameId,
    roomId: params.roomId,
    players: playersState,
    currentPlayerId: params.firstPlayerId, // ← чей ход первым (произвольно)
    isFinished: false,
    winnerPlayerId: null,
  };

  gamesStorage.set(params.gameId, gameState);
  return gameState;
}

export function saveGameState(gameState: GameState): void {
  gamesStorage.set(gameState.gameId, gameState);
}

// получить игру
export function getGameState(gameId: GameId): GameState | undefined {
  return gamesStorage.get(gameId);
}

// Получить игру с ошибкой если не найдена
export function requireGameState(gameId: GameId): GameState {
  const gameState = gamesStorage.get(gameId);
  if (!gameState) {
    throw new Error(`Game "${String(gameId)}" not found`);
  }
  return gameState;
}

// удалить игру
export function deleteGameState(gameId: GameId): void {
  gamesStorage.delete(gameId);
}

// получить все игры
export function getAllGameStates(): GameState[] {
  return Array.from(gamesStorage.values());
}

// Получить ID подключений игроков из игры
export function getGameRoomConnectionIds(gameId: GameId): string[] {
  const gameState = gamesStorage.get(gameId);
  if (!gameState) return [];
  return gameState.players.map((player) => player.connectionId).filter((connectionId) => Boolean(connectionId));
}

// Найти игрока по Id
export function findPlayerStateInGame(gameId: GameId, playerIndex: PlayerInGameId): GamePlayerState | undefined {
  const gameState = gamesStorage.get(gameId);
  if (!gameState) return undefined;
  return gameState.players.find((player) => player.gamePlayerId === playerIndex);
}

// Найти соперника
export function findOpponentStateInGame(gameId: GameId, playerIndex: PlayerInGameId): GamePlayerState | undefined {
  const gameState = gamesStorage.get(gameId);
  if (!gameState) return undefined;
  return gameState.players.find((player) => player.gamePlayerId !== playerIndex);
}
