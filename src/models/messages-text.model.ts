export const LOG_HTTP = {
  STARTED: (httpPort: number) => `HTTP server started on port ${httpPort}`,
  CLOSED: 'HTTP server closed successfully',
  CLOSE_ERROR: (errorMessage: string) => `Error while closing HTTP server: ${errorMessage}`,
} as const;

export const LOG_WS = {
  STARTED: (websocketPort: number) => `WebSocket server started on port ${websocketPort}`,
  CLOSED: 'WebSocket server closed successfully',
  NEW_CONNECTION: (connectionId: string) => `New WebSocket connection: ${connectionId}`,
  CONNECTION_CLOSED: (connectionId: string, code: number, reason: string) =>
    `Connection closed: ${connectionId}, code=${code}, reason="${reason}"`,
  CLIENT_ERROR: (connectionId: string, errorMessage: string) => `WebSocket error for ${connectionId}: ${errorMessage}`,
  SERVER_ERROR: (errorMessage: string) => `WebSocket server error: ${errorMessage}`,
  CLOSE_ERROR: (errorMessage: string) => `Error while closing WebSocket server: ${errorMessage}`,
} as const;

export const LOG_SYSTEM = {
  ENVIRONMENT: (environmentName: string) => `Environment: ${environmentName}`,
  SHUTDOWN_START: 'Shutdown started...',
  SHUTDOWN_COMPLETE: 'Shutdown completed...',
} as const;

export const LOG_COMMAND = {
  INCOMING: (connectionId: string, commandType: string) => `Incoming command from ${connectionId}: ${commandType}`,
  INCOMING_INVALID_JSON: (connectionId: string, rawPayload: string) =>
    `Incoming invalid JSON from ${connectionId}: ${rawPayload}`,
  RESULT_OK: (targetId: string, commandType: string, compactResultJson: string) =>
    `Result for ${targetId} [${commandType}]: ${compactResultJson}`,
  RESULT_ERROR: (targetId: string, commandType: string, errorMessage: string) =>
    `Result for ${targetId} [${commandType}] ERROR: ${errorMessage}`,
} as const;

export const LOG_REGISTRY = {
  CONNECTIONS_NONE: 'No active WebSocket connections to close',
  CONNECTIONS_CLOSING: (count: number) => `Closing ${count} active WebSocket connection(s)...`,
  CONNECTION_CLOSED: (connectionId: string) => `Closed connection: ${connectionId}`,
  CONNECTION_CLOSE_ERROR: (connectionId: string, errorMessage: string) =>
    `Error closing connection ${connectionId}: ${errorMessage}`,
  CONNECTIONS_CLEARED: 'All WebSocket connections have been closed and registry cleared',
} as const;
