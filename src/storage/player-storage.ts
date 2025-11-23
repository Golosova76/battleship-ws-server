import type { User } from '../models/user.model.js';

const usersByName = new Map<string, User>();

export function findUserByName(userName: string): User | undefined {
  return usersByName.get(userName);
}

export function saveUser(user: User): void {
  usersByName.set(user.name, user);
}

export function getAllUsers(): User[] {
  return Array.from(usersByName.values());
}

export function incrementUserWinsByUserId(userId: string | number): void {
  const allUsers = getAllUsers();

  const targetUser = allUsers.find((currentUser) => currentUser.index === userId);

  if (!targetUser) {
    return;
  }

  targetUser.totalWins += 1;
  saveUser(targetUser);
}
