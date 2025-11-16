import type {
  AddUserToRoomServiceResult,
  RoomId,
  RoomUsers,
  SingleRoomState,
  UserToRoomOneResponseData,
  UserToRoomRequestData,
} from '../models/rooms.model.js';
import { generateRoomId } from '../utils/id-generator.js';
import {
  createRoomInStorage,
  getRoomFromStorage,
  getRoomsWithSingleUserFromStorage,
  updateRoomInStorage,
} from '../storage/room-storage.js';
import { logError } from '../utils/logging.js';

export class RoomsService {

  // Создать комнату для пользователя
  public createRoomForUser(roomOwnerUser: RoomUsers, ownerConnectionId: string): {
    createdRoomState: SingleRoomState;
    roomsForBroadcast: UserToRoomOneResponseData;
  } {
    const roomId: RoomId = generateRoomId();

    const createdRoomState = createRoomInStorage(roomId, roomOwnerUser, ownerConnectionId);

    const roomsWithSingleUser = getRoomsWithSingleUserFromStorage();

    return {
      createdRoomState,
      roomsForBroadcast: roomsWithSingleUser,
    };
  }

  // Добавить второго игрока в комнату
  public addUserToRoom(requestData: UserToRoomRequestData, newRoomUser: RoomUsers, newUserConnectionId: string): AddUserToRoomServiceResult {
    const roomId = requestData.indexRoom;
    const existingRoomState = getRoomFromStorage(roomId);

    if (!existingRoomState) {
      logError(`Room not found: ${roomId}`);
      return { updatedRoomsForBroadcast: [], targetRoomState: null };
    }

    if (existingRoomState.roomUsers.length >= 2) {
      logError(`Room is full: ${roomId}`);
      return { updatedRoomsForBroadcast: [], targetRoomState: null };
    }

    const updatedRoomState: SingleRoomState = {
      ...existingRoomState,
      roomUsers: [...existingRoomState.roomUsers, newRoomUser],
      connections: [...existingRoomState.connections, newUserConnectionId],
    };

    updateRoomInStorage(updatedRoomState);

    const roomsWithSingleUser = getRoomsWithSingleUserFromStorage();

    return {
      updatedRoomsForBroadcast: roomsWithSingleUser,
      targetRoomState: updatedRoomState,
    };
  }
}
