import type { ConnectionContext } from '../models/websocket.model.js';
import type { IncomingClientMessage } from '../models/types.js';
import { MESSAGE_TYPES } from '../models/types.js';

import type { UserRequestData, UserResponseData, PlayersControllerType } from '../models/user.model.js';
import type { PlayersService } from '../services/players-service.js';

import type { PersonalResponseMessage } from '../protocol/messageTypes.js';
import { sendPersonalMessage } from '../protocol/messageSender.js';

export class PlayersController implements PlayersControllerType {
  private readonly playersService: PlayersService;

  constructor(playersService: PlayersService) {
    this.playersService = playersService;
  }

  public async handlePlayerMessage(
    connectionContext: ConnectionContext,
    clientMessage: IncomingClientMessage
  ): Promise<void> {
    if (clientMessage.type === MESSAGE_TYPES.REG) {
      const parsedUserRequestData = this.parseUserRequestData(clientMessage.data);

      if (!parsedUserRequestData) {
        const errorResponseData: UserResponseData = {
          name: '',
          index: '',
          error: true,
          errorText: 'Invalid auth data format',
        };

        const errorResponseDataJson: string = JSON.stringify(errorResponseData);
        const errorServerMessage: PersonalResponseMessage = {
          type: MESSAGE_TYPES.REG,
          data: errorResponseDataJson,
          id: 0,
        };

        sendPersonalMessage(connectionContext.connectionId, errorServerMessage);
        return;
      }

      await this.handleRegistration(connectionContext, parsedUserRequestData);
      return;
    }

    if (clientMessage.type === MESSAGE_TYPES.UPDATE_WINNERS) {
      // TODO: реализация позже
      return;
    }
  }

  private async handleRegistration(
    connectionContext: ConnectionContext,
    userRequestData: UserRequestData
  ): Promise<void> {
    const userResponseData: UserResponseData = this.playersService.registerOrLogin(userRequestData);

    // сохраняем пользователя в ConnectionContext
    if (!userResponseData.error) {
      connectionContext.userName = userResponseData.name;
      connectionContext.userIndex = userResponseData.index; // idUser
    }

    const userResponseDataJson: string = JSON.stringify(userResponseData);
    const serverMessage: PersonalResponseMessage = {
      type: MESSAGE_TYPES.REG,
      data: userResponseDataJson,
      id: 0,
    };

    sendPersonalMessage(connectionContext.connectionId, serverMessage);
  }

  private parseUserRequestData(rawData: unknown): UserRequestData | null {
    let normalizedData: unknown = rawData;

    // вариант 1: data — строка с JSON
    if (typeof normalizedData === 'string') {
      try {
        normalizedData = JSON.parse(normalizedData);
      } catch {
        return null;
      }
    }

    // вариант 2: уже объект
    if (
      normalizedData &&
      typeof normalizedData === 'object' &&
      'name' in normalizedData &&
      'password' in normalizedData
    ) {
      const candidate = normalizedData as { name: unknown; password: unknown };

      if (typeof candidate.name === 'string' && typeof candidate.password === 'string') {
        return {
          name: candidate.name,
          password: candidate.password,
        };
      }
    }

    return null;
  }
}
