export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export const generateConnectionId = (): string => generateId('connection'); // при установлении WebSocket
export const generatePlayerId = (): string => generateId('user'); // при создании user
export const generateRoomId = (): string => generateId('room'); // при создании комнаты
export const generateGameId = (): string => generateId('game'); // при создании игры
export const generatePlayerIdGame = (): string => generateId('player'); // при создании игрока