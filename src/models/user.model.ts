export interface User {
    index: string;  // idUser
    name: string;
    passwordHash: string;
    totalWins: number;
    isLogin: boolean;
}


export interface UserRequestData {
    name: string;
    password: string;
}

export interface UserResponseData {
    name: string;
    index: number | string;
    error: boolean;
    errorText: string;
}