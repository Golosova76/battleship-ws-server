import type { UserRequestData, UserResponseData } from '../models/user.model.js';
import type { MESSAGE_TYPES} from '../models/types.js';
import { type MessageBase, type UpdateWinnersResponseData } from '../models/types.js';
import type { UserToRoomOneResponseData, UserToRoomRequestData } from '../models/rooms.model.js';
import type {
  AttackResponseData,
  AttackShipsRequestData,
  FinishResponseData,
  GameResponseData,
  GameShipsResponseData,
  RandomAttackRequestData,
  ShipsRequestData,
  TurnResponseData,
} from '../models/game.model.js';

// <-  cmd from frontend

// // PLAYER
export type RegRequestMessage = MessageBase<typeof MESSAGE_TYPES.REG, UserRequestData>;

// // ROOM
export type CreateRoomRequestMessage = MessageBase<typeof MESSAGE_TYPES.CREATE_ROOM, ''>;

export type AddUserToRoomRequestMessage = MessageBase<typeof MESSAGE_TYPES.ADD_USER_TO_ROOM, UserToRoomRequestData>;

// // SHIP
export type AddShipsRequestMessage = MessageBase<typeof MESSAGE_TYPES.ADD_SHIPS, ShipsRequestData>;

// // GAME
export type AttackGameRequestMessage = MessageBase<typeof MESSAGE_TYPES.ATTACK, AttackShipsRequestData>;

export type RandomAttackGameRequestMessage = MessageBase<typeof MESSAGE_TYPES.RANDOM_ATTACK, RandomAttackRequestData>;

// -> answer server

// // PLAYER
export type RegResponseMessage = MessageBase<typeof MESSAGE_TYPES.REG, UserResponseData>;

export type UpdateWinsResponseMessage = MessageBase<typeof MESSAGE_TYPES.UPDATE_WINNERS, UpdateWinnersResponseData>;

// // ROOM
export type CreateGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.CREATE_GAME, GameResponseData>;

export type UpdateRoomResponseMessage = MessageBase<typeof MESSAGE_TYPES.UPDATE_ROOM, UserToRoomOneResponseData>;

// // START GAME
export type StartGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.START_GAME, GameShipsResponseData>;

// // GAME
export type AttackGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.ATTACK, AttackResponseData>;

export type TurnGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.TURN, TurnResponseData>;

export type FinishGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.FINISH, FinishResponseData>;
