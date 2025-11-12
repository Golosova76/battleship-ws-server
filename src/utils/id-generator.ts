import { v4 as uuid } from 'uuid';

export function generateId(prefix: string): string {
  return `${prefix}_${uuid()}`;
}

export const generateConnectionId = (): string => generateId('connection');
export const generatePlayerId = (): string => generateId('player');
export const generateRoomId = (): string => generateId('room');
export const generateGameId = (): string => generateId('game');
