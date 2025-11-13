import type {IncomingClientMessage, MessageRouterDependencies} from "../models/types.js";
import type { PlayersControllerType} from "../models/user.model.js";
import type { RoomsControllerType} from "../models/rooms.model.js";
import type { GamesControllerType} from "../models/game.model.js";
import type {ConnectionContext} from "../models/websocket.model.js";
import {logCommand, logError, logIncomingCommand} from "../utils/logging.js";
import {LOG_COMMAND} from "../models/messages-text.model.js";

export class MessageRouter {
    private readonly playersController: PlayersControllerType;
    private readonly roomsController: RoomsControllerType;
    private readonly gamesController: GamesControllerType;

    constructor(dependencies: MessageRouterDependencies) {
        this.playersController = dependencies.playersController;
        this.roomsController = dependencies.roomsController;
        this.gamesController = dependencies.gamesController;
    }

    public async routeIncomingMessage(
        rawMessageText: string,
        connectionContext: ConnectionContext
    ): Promise<void> {
        logIncomingCommand(connectionContext.connectionId, rawMessageText);

        let parsedMessage: unknown;

        // Парсим JSON и логируем, если это вообще не JSON
        try {
            parsedMessage = JSON.parse(rawMessageText);
        } catch (errorInstance) {
            logCommand(
                LOG_COMMAND.INCOMING_INVALID_JSON(connectionContext.connectionId, rawMessageText)
            );

            // системный лог ошибки
            logError(
                `Failed to parse incoming JSON from ${connectionContext.connectionId}: ${String(
                    errorInstance
                )}`
            );
            return;
        }

        if (!this.isValidClientMessage(parsedMessage)) {
            logError('Incoming WebSocket message has invalid structure or unknown type');
            return;
        }

        const clientMessage: IncomingClientMessage = parsedMessage;

        try {
            await this.dispatchToController(connectionContext, clientMessage);
        } catch (errorInstance) {
            const errorMessage =
                errorInstance instanceof Error ? errorInstance.message : String(errorInstance);

            logError(
                `Unhandled error while processing command "${clientMessage.type}" ` +
                `for connection ${connectionContext.connectionId}: ${errorMessage}`
            );
        }
    }

}