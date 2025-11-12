import { type BaseLogRecord, type LogLevel } from '../models/types.js';
import { LOG_COMMAND } from '../models/messages-text.model.js';

function createLogRecord(level: LogLevel, message: string): BaseLogRecord {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
}

function printLog(logRecord: BaseLogRecord): void {
  const prefix = `[${logRecord.timestamp}] [${logRecord.level.toUpperCase()}]`;
  if (logRecord.level === 'error') {
    console.error(`${prefix} ${logRecord.message}`);
  } else {
    console.log(`${prefix} ${logRecord.message}`);
  }
}

// Универсальные
export function logInfo(message: string): void {
  printLog(createLogRecord('info', message));
}

export function logError(messageOrError: string | Error): void {
  const normalizedMessage =
    messageOrError instanceof Error ? `${messageOrError.name}: ${messageOrError.message}` : messageOrError;
  printLog(createLogRecord('error', normalizedMessage));
}

export function logCommand(message: string): void {
  printLog(createLogRecord('command', message));
}

// Входящее сообщение (строго выводим "команду")
export function logIncomingCommand(connectionId: string, rawMessage: string): void {
  try {
    const parsed = JSON.parse(rawMessage);
    const commandType: string = typeof parsed?.type === 'string' ? parsed.type : 'unknown';
    logCommand(LOG_COMMAND.INCOMING(connectionId, commandType));
  } catch {
    logCommand(LOG_COMMAND.INCOMING_INVALID_JSON(connectionId, rawMessage));
  }
}

// Результат обработки команды (успех)
export function logCommandResultOk(targetId: string, commandType: string, resultPayload: unknown): void {
  const compactResultJson = safeStringify(resultPayload);
  logCommand(LOG_COMMAND.RESULT_OK(targetId, commandType, compactResultJson));
}

// Результат обработки команды (ошибка)
export function logCommandResultError(targetId: string, commandType: string, errorMessage: string): void {
  logCommand(LOG_COMMAND.RESULT_ERROR(targetId, commandType, errorMessage));
}

/* ----------------------------- Вспомогательное ----------------------------- */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
