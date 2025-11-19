import type { ConnectionContext } from './websocket.model.js';
import type { MessageBase, MessageType } from './types.js';

export type RoomId = string | number;

export interface UserToRoomRequestData {
  indexRoom: RoomId;
}

export interface RoomUsers {
  name: string;
  index: string | number; // idUser
}

export interface SingleRoomState {
  roomId: RoomId;
  roomUsers: RoomUsers[];
  connections: string[]; // два connectionId, соответствуют двумя игрокам
}

export type UserToRoomOneResponseData = SingleRoomState[];

export interface RoomsControllerType {
  handleRoomMessage(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<MessageType, unknown>
  ): Promise<void> | void;
}

export interface AddUserToRoomServiceResult {
  updatedRoomsForBroadcast: UserToRoomOneResponseData;
  targetRoomState: SingleRoomState | null;
}
