import type {
  AddUserToRoomServiceResult,
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
  public createRoomForUser(roomOwnerUser: RoomUsers): {
    createdRoomState: SingleRoomState;
    roomsForBroadcast: UserToRoomOneResponseData;
  } {
    const roomIdentifier = generateRoomId();

    const createdRoomState = createRoomInStorage(roomIdentifier, roomOwnerUser);

    const roomsWithSingleUser = getRoomsWithSingleUserFromStorage();

    return {
      createdRoomState,
      roomsForBroadcast: roomsWithSingleUser,
    };
  }

  // Добавить второго игрока в комнату
  public addUserToRoom(requestData: UserToRoomRequestData, newRoomUser: RoomUsers): AddUserToRoomServiceResult {
    const roomIdentifier = requestData.indexRoom;
    const existingRoomState = getRoomFromStorage(roomIdentifier);

    if (!existingRoomState) {
      logError(`Room not found: ${roomIdentifier}`);
      return { updatedRoomsForBroadcast: [], targetRoomState: null };
    }

    if (existingRoomState.roomUsers.length >= 2) {
      logError(`Room is full: ${roomIdentifier}`);
      return { updatedRoomsForBroadcast: [], targetRoomState: null };
    }

    const updatedRoomState: SingleRoomState = {
      ...existingRoomState,
      roomUsers: [...existingRoomState.roomUsers, newRoomUser],
    };

    updateRoomInStorage(updatedRoomState);

    const roomsWithSingleUser = getRoomsWithSingleUserFromStorage();

    return {
      updatedRoomsForBroadcast: roomsWithSingleUser,
      targetRoomState: updatedRoomState,
    };
  }
}
