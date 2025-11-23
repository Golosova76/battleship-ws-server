export const environment = {
  // Режим окружения (development / production)
  nodeEnvironment: process.env.NODE_ENV ?? 'development',

  // Порт для HTTP-сервера (раздача фронта)
  httpPort: Number(process.env.HTTP_PORT) || 8181,

  // Порт для WebSocket-сервера
  websocketPort: Number(process.env.WEBSOCKET_PORT) || 3000,

  // Размер поля (10x10 по умолчанию)
  boardSize: 10,

  // Максимум игроков в комнате/
  maximumPlayersInRoom: 2,
};
