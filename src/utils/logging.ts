import { type BaseLogRecord, type LogLevel } from '../models/types.js';
import { LOG_COMMAND } from '../models/messages-text.model.js';
import {
  printCommandErrorSeparator,
  printCommandOkSeparator,
  printCommandSeparator,
  printErrorSeparator,
  printInfoSeparator,
} from './randomHelpers.js';

function createLogRecord(level: LogLevel, message: string): BaseLogRecord {
  return {
    timestamp: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
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
  printInfoSeparator();
  printLog(createLogRecord('info', message));
}

export function logError(messageOrError: string | Error): void {
  printErrorSeparator();
  const normalizedMessage =
    messageOrError instanceof Error ? `${messageOrError.name}: ${messageOrError.message}` : messageOrError;
  printLog(createLogRecord('error', normalizedMessage));
}

function logCommandWithoutSeparator(message: string): void {
  printLog(createLogRecord('command', message));
}

export function logCommand(message: string): void {
  printCommandSeparator();
  logCommandWithoutSeparator(message);
}

// Входящее сообщение
export function logIncomingCommand(connectionId: string, rawMessageText: string): void {
  try {
    const parsedMessage: unknown = JSON.parse(rawMessageText);
    const commandType = hasTypeField(parsedMessage) ? parsedMessage.type : 'unknown';

    logCommandWithoutSeparator(LOG_COMMAND.INCOMING(connectionId, commandType, rawMessageText));
  } catch {
    logCommandWithoutSeparator(LOG_COMMAND.INCOMING_INVALID_JSON(connectionId, rawMessageText));
  }
}

export function logCommandResultOk(targetId: string, commandType: string, resultPayload: unknown): void {
  printCommandOkSeparator();
  const compactResultJson = safeStringify(resultPayload);
  logCommandWithoutSeparator(LOG_COMMAND.RESULT_OK(targetId, commandType, compactResultJson));
}

export function logCommandResultError(targetId: string, commandType: string, errorMessage: string): void {
  printCommandErrorSeparator();
  logCommandWithoutSeparator(LOG_COMMAND.RESULT_ERROR(targetId, commandType, errorMessage));
}

/* ----------------------------- Вспомогательное ----------------------------- */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function hasTypeField(value: unknown): value is { type: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.type === 'string';
}
