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
