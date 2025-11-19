import type { AttackStatus, MessageBase, MessageType } from './types.js';
import type { ConnectionContext } from './websocket.model.js';
import type { PlayerInGameId } from './user.model.js';
import type { RoomId } from './rooms.model.js';

export type GameId = string | number;

// 'create_game'
export interface GameResponseData {
  idGame: GameId;
  idPlayer: PlayerInGameId; //id игрока в игровой сессии
}

export interface Position {
  x: number;
  y: number;
}

export interface BoardCell extends Position {
  status: AttackStatus;
}

export type ShipType = 'small' | 'medium' | 'large' | 'huge';

export interface Ship {
  position: Position;
  direction: boolean;
  length: number;
  type: ShipType;
}

// ЭТО ВСЕ И ЕСТЬ data!!!! 'add_ships'
export interface ShipsRequestData {
  gameId: GameId;
  ships: Ship[];
  indexPlayer: PlayerInGameId; // id игрока в тек.игр.сессии
}

// 'start_game'
export interface GameShipsResponseData {
  ships: Ship[]; // корабли игрока
  currentPlayerIndex: PlayerInGameId; // id игрока в тек.игр.сессии, кот отправил свои корабли
}

// GAME
// 'attack'
export interface AttackShipsRequestData {
  gameId: number | string;
  x: number;
  y: number;
  indexPlayer: PlayerInGameId; // id игрока в тек.игр.сессии
}

// 'attack'
export interface AttackResponseData {
  position: Position;
  currentPlayer: PlayerInGameId; // id игрока в тек.игр.сессии
  status: AttackStatus;
}

// 'randomAttack'
export interface RandomAttackRequestData {
  gameId: number | string;
  indexPlayer: PlayerInGameId; // id игрока в тек.игр.сессии
}

// turn
export interface TurnResponseData {
  currentPlayer: PlayerInGameId; // id игрока в тек.игр.сессии
}

// 'finish'
export interface FinishResponseData {
  winPlayer: PlayerInGameId; // id игрока в тек.игр.сессии
}

// 'single_play'
export type SinglePlayRequestData = unknown;

export interface GamesControllerType {
  handleGameMessage(
    _connectionContext: ConnectionContext,
    _clientMessage: MessageBase<MessageType, unknown>
  ): Promise<void> | void;
}

/** Состояние игрока в рамках конкретной игры */
export interface GamePlayerState {
  gamePlayerId: PlayerInGameId;
  userId: string | number;
  connectionId: string;
  ships: Ship[];
  board: {
    cells: BoardCell[];
  };
}

/** Полное состояние игры */
export interface GameState {
  gameId: GameId;
  roomId: RoomId;
  players: GamePlayerState[];
  currentPlayerId: PlayerInGameId | null;
  isFinished: boolean;
  winnerPlayerId: PlayerInGameId | null;
}

export interface GamePlayerCreationData {
  gamePlayerId: PlayerInGameId;
  userId: string | number;
  connectionId: string;
}

export interface CreateGameStateParams {
  gameId: GameId;
  roomId: RoomId;
  players: GamePlayerCreationData[];
  firstPlayerId: PlayerInGameId; // один из двух gamePlayerId, кто ходит первым
}

export interface AttackLogicResult {
  status: AttackStatus; // 'miss' | 'shot' | 'killed'
  isGameOver: boolean;
  killedShipAroundCells: Position[];
}

export interface AttackProcessingResult {
  gameId: GameId;
  targetConnectionIds: string[];
  attackResponseData: AttackResponseData;
  additionalMissCells: Position[];
  turnResponseData: TurnResponseData;
  finishResponseData?: FinishResponseData;
}

export interface AttackProcessingParams {
  gameId: GameId;
  attackerPlayerId: PlayerInGameId;
  position: Position;
}

export interface ShipsPlacementResult {
  gameId: GameId;
  startGameForPlayers: {
    targetConnectionId: string;
    responseData: GameShipsResponseData;
  }[];
  initialTurnResponseData: TurnResponseData;
}

// для function createGameForRoom
export interface CreateGameForRoomParams {
  gameId: GameId;
  roomId: RoomId;
  players: {
    gamePlayerId: PlayerInGameId;
    userId: string | number;
    connectionId: string;
  }[];
  firstPlayerId: PlayerInGameId;
}

export interface CreateSinglePlayGameParams {
  userId: string | number; // глобальный id из reg.index
  connectionId: string; // connectionId человека
}

export interface SinglePlayGameCreationResult {
  gameState: GameState;
  humanPlayerId: string | number; // idPlayer человека в этой игре
  botPlayerId: string | number; // idPlayer бота в этой игре
}
