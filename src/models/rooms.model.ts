import type { ConnectionContext } from './websocket.model.js';
import type { MessageBase, MessageType } from './types.js';

export interface UserToRoomRequestData {
  indexRoom: string | number;
}

export interface RoomUsers {
  name: string;
  index: string | number; // idUser
}

export interface SingleRoomState {
  roomId: number | string;
  roomUsers: RoomUsers[];
}

export type UserToRoomOneResponseData = SingleRoomState[];

export interface RoomsControllerType {
  handleRoomMessage(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<MessageType, unknown>
  ): Promise<void> | void;
}
