import type { RoomId, RoomUsers, SingleRoomState } from '../models/rooms.model.js';

const roomsStorage = new Map<RoomId, SingleRoomState>();

export function createRoomInStorage(
  roomId: RoomId,
  initialRoomUser: RoomUsers,
  initialConnectionId: string
): SingleRoomState {
  const roomState: SingleRoomState = {
    roomId,
    roomUsers: [initialRoomUser],
    connections: [initialConnectionId], // один игрок — одно соединение
  };

  roomsStorage.set(roomId, roomState);
  return roomState;
}

export function getRoomFromStorage(roomId: RoomId): SingleRoomState | undefined {
  return roomsStorage.get(roomId);
}

export function updateRoomInStorage(updatedRoomState: SingleRoomState): void {
  roomsStorage.set(updatedRoomState.roomId, updatedRoomState);
}

// Удалить комнату из хранилища
export function deleteRoomFromStorage(roomId: RoomId): void {
  roomsStorage.delete(roomId);
}

// Получить все комнаты (полный список)
export function getAllRoomsFromStorage(): SingleRoomState[] {
  return Array.from(roomsStorage.values());
}

// Вернуть только комнаты, где ровно один игрок
// Именно этот список должен уходить в update_room
export function getRoomsWithSingleUserFromStorage(): SingleRoomState[] {
  return Array.from(roomsStorage.values()).filter((roomState) => roomState.roomUsers.length === 1);
}
