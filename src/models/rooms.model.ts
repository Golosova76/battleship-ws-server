export interface UserToRoomRequestData {
    indexRoom: string | number;
}

export interface RoomUsers {
    name: string;
    index: string | number;  // idUser
}

export interface SingleRoomState {
    roomId: number | string;
    roomUsers: RoomUsers[];
}

export type UserToRoomOneResponseData = SingleRoomState[];
