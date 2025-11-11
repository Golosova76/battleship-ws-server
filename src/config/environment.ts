export const environment = {
    port: Number(process.env.PORT) || 3000,
    nodeEnvironment: process.env.NODE_ENV ?? 'development',

    boardSize: 10,
    maximumPlayersInRoom: 2,
};