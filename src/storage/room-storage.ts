import type { RoomUsers, SingleRoomState } from '../models/rooms.model.js';

/**
 * Внутреннее in-memory хранилище комнат.
 * Ключ: идентификатор комнаты (roomId).
 * Значение: состояние комнаты.
 */
const roomsStorage = new Map<string | number, SingleRoomState>();

export function createRoomInStorage(roomIdentifier: string | number, initialRoomUser: RoomUsers): SingleRoomState {
  const roomState: SingleRoomState = {
    roomId: roomIdentifier,
    roomUsers: [initialRoomUser],
  };

  roomsStorage.set(roomIdentifier, roomState);
  return roomState;
}

export function getRoomFromStorage(roomIdentifier: string | number): SingleRoomState | undefined {
  return roomsStorage.get(roomIdentifier);
}

export function updateRoomInStorage(updatedRoomState: SingleRoomState): void {
  roomsStorage.set(updatedRoomState.roomId, updatedRoomState);
}

/**
 * Удалить комнату из хранилища .
 */
export function deleteRoomFromStorage(roomIdentifier: string | number): void {
  roomsStorage.delete(roomIdentifier);
}

/**
 * Получить все комнаты (полный список).
 */
export function getAllRoomsFromStorage(): SingleRoomState[] {
  return Array.from(roomsStorage.values());
}

/**
 * Вернуть только комнаты, где ровно один игрок.
 * Именно этот список должен уходить в update_room.
 */
export function getRoomsWithSingleUserFromStorage(): SingleRoomState[] {
  return Array.from(roomsStorage.values()).filter((roomState) => roomState.roomUsers.length === 1);
}
