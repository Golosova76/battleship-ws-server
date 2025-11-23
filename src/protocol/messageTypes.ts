import type { UserRequestData } from '../models/user.model.js';
import type { MESSAGE_TYPES } from '../models/types.js';
import { type MessageBase } from '../models/types.js';
import type { UserToRoomRequestData } from '../models/rooms.model.js';
import type {
  AttackShipsRequestData,
  RandomAttackRequestData,
  ShipsRequestData,
  SinglePlayRequestData,
} from '../models/game.model.js';

// <-  cmd from frontend

type RegRequestMessage = MessageBase<typeof MESSAGE_TYPES.REG, UserRequestData>;

export type CreateRoomRequestData = '';
type CreateRoomRequestMessage = MessageBase<typeof MESSAGE_TYPES.CREATE_ROOM, CreateRoomRequestData>;

type AddUserToRoomRequestMessage = MessageBase<typeof MESSAGE_TYPES.ADD_USER_TO_ROOM, UserToRoomRequestData>;

type AddShipsRequestMessage = MessageBase<typeof MESSAGE_TYPES.ADD_SHIPS, ShipsRequestData>;

type AttackGameRequestMessage = MessageBase<typeof MESSAGE_TYPES.ATTACK, AttackShipsRequestData>;

type RandomAttackGameRequestMessage = MessageBase<typeof MESSAGE_TYPES.RANDOM_ATTACK, RandomAttackRequestData>;

type SinglePlayRequestMessage = MessageBase<typeof MESSAGE_TYPES.SINGLE_PLAY, SinglePlayRequestData>;

// -> answer server

type RegResponseMessage = MessageBase<typeof MESSAGE_TYPES.REG, string>;

type UpdateWinsResponseMessage = MessageBase<typeof MESSAGE_TYPES.UPDATE_WINNERS, string>;

type CreateGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.CREATE_GAME, string>;

// список комнат, где только один игрок внутри.
type UpdateRoomResponseMessage = MessageBase<typeof MESSAGE_TYPES.UPDATE_ROOM, string>;

type StartGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.START_GAME, string>;

type AttackGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.ATTACK, string>;

type TurnGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.TURN, string>;

type FinishGameResponseMessage = MessageBase<typeof MESSAGE_TYPES.FINISH, string>;

// <- client → server
export type AllRequestMessage =
  | RegRequestMessage
  | CreateRoomRequestMessage
  | AddUserToRoomRequestMessage
  | AddShipsRequestMessage
  | AttackGameRequestMessage
  | RandomAttackGameRequestMessage
  | SinglePlayRequestMessage;

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
