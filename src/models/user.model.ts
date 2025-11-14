import type { ConnectionContext } from './websocket.model.js';
import type { MessageBase, MessageType } from './types.js';

export interface User {
  index: string; // idUser
  name: string;
  passwordHash: string;
  totalWins: number;
  isLogin: boolean;
}

export interface UserRequestData {
  name: string;
  password: string;
}

export interface UserResponseData {
  name: string;
  index: number | string;
  error: boolean;
  errorText: string;
}

export interface PlayersControllerType {
  handlePlayerMessage(
    connectionContext: ConnectionContext,
    clientMessage: MessageBase<MessageType, unknown>
  ): Promise<void> | void;
}
