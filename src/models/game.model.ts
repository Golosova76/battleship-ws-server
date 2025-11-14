import type { AttackStatus, MessageBase, MessageType } from './types.js';
import type { ConnectionContext } from './websocket.model.js';

export interface GameResponseData {
  idGame: number | string;
  idPlayer: number | string; //id игрока в игровой сессии
}

export interface Position {
  x: number;
  y: number;
}

export type ShipType = 'small' | 'medium' | 'large' | 'huge';

export interface Ship {
  position: Position;
  direction: boolean;
  length: number;
  type: ShipType;
}

export interface ShipsRequestData {
  gameId: number | string;
  ships: Ship[];
  indexPlayer: number | string; // id игрока в тек.игр.сессии
}

export interface GameShipsResponseData {
  ships: Ship[]; // корабли игрока
  currentPlayerIndex: number | string; // id игрока в тек.игр.сессии, кот отправил свои корабли
}

// GAME
// // Attack
export interface AttackShipsRequestData {
  gameId: number | string;
  x: number;
  y: number;
  indexPlayer: number | string; // id игрока в тек.игр.сессии
}

// // Attack feedback
export interface AttackResponseData {
  position: Position;
  currentPlayer: number | string; // id игрока в тек.игр.сессии
  status: AttackStatus;
}

export interface RandomAttackRequestData {
  gameId: number | string;
  indexPlayer: number | string; // id игрока в тек.игр.сессии
}

export interface TurnResponseData {
  currentPlayer: number | string; // id игрока в тек.игр.сессии
}

export interface FinishResponseData {
  winPlayer: number | string; // id игрока в тек.игр.сессии
}

export interface GamesControllerType {
  handleGameMessage(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<MessageType, unknown>
  ): Promise<void> | void;
}
