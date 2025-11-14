import type { PlayersControllerType } from './user.model.js';
import type { RoomsControllerType } from './rooms.model.js';
import type { GamesControllerType } from './game.model.js';

export const MESSAGE_TYPES = {
  REG: 'reg',
  UPDATE_WINNERS: 'update_winners',
  CREATE_ROOM: 'create_room',
  ADD_USER_TO_ROOM: 'add_user_to_room',
  CREATE_GAME: 'create_game',
  UPDATE_ROOM: 'update_room',
  ADD_SHIPS: 'add_ships',
  START_GAME: 'start_game',
  ATTACK: 'attack',
  RANDOM_ATTACK: 'randomAttack',
  TURN: 'turn',
  FINISH: 'finish',
  SINGLE_PLAY: 'single_play',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export interface MessageBase<TMessageType extends MessageType, TMessageData> {
  type: TMessageType;
  data: TMessageData;
  id: 0;
}

// Базовый тип исходящего сообщения от сервера
export type AllServerResponseMessage = MessageBase<MessageType, unknown>;

// Базовый тип входящего сообщения от клиента
export type IncomingClientMessage = MessageBase<MessageType, unknown>;

export interface Winner {
  name: string;
  wins: number;
}

export type UpdateWinnersResponseData = Winner[];

// GAME
export const ATTACK_STATUS = {
  MISS: 'miss',
  SHOT: 'shot',
  KILLED: 'killed',
} as const;

export type AttackStatus = (typeof ATTACK_STATUS)[keyof typeof ATTACK_STATUS];

export type LogLevel = 'info' | 'error' | 'command';

export interface BaseLogRecord {
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface ResponseMessagePackage {
  targetConnectionIds: string[];
  responseMessage: AllServerResponseMessage;
}

export interface MessageRouterDependencies {
  playersController: PlayersControllerType;
  roomsController: RoomsControllerType;
  gamesController: GamesControllerType;
}
