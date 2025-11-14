import type { UserRequestData, UserResponseData } from '../models/user.model.js';
import type { MESSAGE_TYPES } from '../models/types.js';
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
type RegRequestMessage = MessageBase<typeof MESSAGE_TYPES.REG, UserRequestData>;

// // ROOM
type CreateRoomRequestMessage = MessageBase<typeof MESSAGE_TYPES.CREATE_ROOM, ''>;

type AddUserToRoomRequestMessage = MessageBase<typeof MESSAGE_TYPES.ADD_USER_TO_ROOM, UserToRoomRequestData>;

// // SHIP
type AddShipsRequestMessage = MessageBase<typeof MESSAGE_TYPES.ADD_SHIPS, ShipsRequestData>;

// // GAME
type AttackGameRequestMessage = MessageBase<typeof MESSAGE_TYPES.ATTACK, AttackShipsRequestData>;

type RandomAttackGameRequestMessage = MessageBase<typeof MESSAGE_TYPES.RANDOM_ATTACK, RandomAttackRequestData>;

// -> answer server

// // PLAYER
type RegResponseMessage = MessageBase<typeof MESSAGE_TYPES.REG, string>;

type UpdateWinsResponseMessage = MessageBase<typeof MESSAGE_TYPES.UPDATE_WINNERS, UpdateWinnersResponseData>;

// // ROOM
type CreateGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.CREATE_GAME, GameResponseData>;

// список комнат, где только один игрок внутри.
type UpdateRoomResponseMessage = MessageBase<typeof MESSAGE_TYPES.UPDATE_ROOM, UserToRoomOneResponseData>;

// // START GAME
type StartGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.START_GAME, GameShipsResponseData>;

// // GAME
type AttackGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.ATTACK, AttackResponseData>;

type TurnGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.TURN, TurnResponseData>;

type FinishGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.FINISH, FinishResponseData>;

// <- client → server
export type AllRequestMessage =
  | RegRequestMessage
  | CreateRoomRequestMessage
  | AddUserToRoomRequestMessage
  | AddShipsRequestMessage
  | AttackGameRequestMessage
  | RandomAttackGameRequestMessage;

// -> server → client
// Player
export type PersonalResponseMessage = RegResponseMessage;

// Room  Two Player
export type RoomResponseMessage =
  | CreateGameResponseMessage
  | StartGameResponseMessage
  | AttackGameResponseMessage
  | TurnGameResponseMessage
  | FinishGameResponseMessage;

// for all after every update (Broadcast)
export type BroadcastResponseMessage = UpdateRoomResponseMessage | UpdateWinsResponseMessage;
