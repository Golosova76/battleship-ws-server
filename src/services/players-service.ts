import type { User, UserRequestData, UserResponseData } from '../models/user.model.js';
import { playersStorage } from '../storage/inMemoryDatabase.js';
import { generatePlayerId } from '../utils/id-generator.js';

export class PlayersService {
  public registerOrLogin(requestData: UserRequestData): UserResponseData {
    const trimmedName = requestData.name.trim();

    if (!trimmedName || !requestData.password) {
      return {
        name: trimmedName,
        index: '',
        error: true,
        errorText: 'Name and password are required',
      };
    }

    const existingUser: User | undefined = playersStorage.findUserByName(trimmedName);

    if (existingUser) {
      if (existingUser.passwordHash !== requestData.password) {
        return {
          name: trimmedName,
          index: existingUser.index,
          error: true,
          errorText: 'Invalid password',
        };
      }

      existingUser.isLogin = true;
      playersStorage.saveUser(existingUser);

      return {
        name: existingUser.name,
        index: existingUser.index,
        error: false,
        errorText: '',
      };
    }

    const newUser: User = {
      index: generatePlayerId(),
      name: trimmedName,
      passwordHash: requestData.password,
      totalWins: 0,
      isLogin: true,
    };

    playersStorage.saveUser(newUser);

    return {
      name: newUser.name,
      index: newUser.index,
      error: false,
      errorText: '',
    };
  }
}
