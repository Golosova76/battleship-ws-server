export interface ConnectionContext {
  connectionId: string;
  userName?: string;
  userIndex?: string | number;
}

export interface WebSocketServerOptions {
  port: number;
}
