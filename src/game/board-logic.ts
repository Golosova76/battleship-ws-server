import { environment } from '../config/environment.js';
import type {
  AttackLogicResult,
  BoardCell,
  GamePlayerState,
  GameState,
  Position,
  Ship,
  ShipType,
} from '../models/game.model.js';
import type { AttackStatus } from '../models/types.js';
import { getRandomIntegerInclusive } from '../utils/random-helpers.js';
import { logError } from '../utils/logging.js';

function validateAttackCoordinates(x: number, y: number): void {
  if (x < 0 || x >= environment.boardSize || y < 0 || y >= environment.boardSize) {
    throw new Error('Attack coordinates are out of board');
  }
}

export function getShipCells(ship: Ship): Position[] {
  const cells: Position[] = [];
  const { x, y } = ship.position;

  for (let i = 0; i < ship.length; i += 1) {
    cells.push({
      x: ship.direction ? x : x + i,
      y: ship.direction ? y + i : y,
    });
  }

  return cells;
}

export function getCellsAroundShip(ship: Ship): Position[] {
  const shipCells = getShipCells(ship);
  const around = new Map<string, Position>();

  for (const cell of shipCells) {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const neighborX = cell.x + dx;
        const neighborY = cell.y + dy;

        const isInsideBoard =
          neighborX >= 0 && neighborX < environment.boardSize && neighborY >= 0 && neighborY < environment.boardSize;

        if (!isInsideBoard) {
          continue;
        }

        const isShipCell = shipCells.some((shipCell) => shipCell.x === neighborX && shipCell.y === neighborY);

        if (isShipCell) {
          continue;
        }

        const key = `${neighborX},${neighborY}`;

        if (!around.has(key)) {
          around.set(key, { x: neighborX, y: neighborY });
        }
      }
    }
  }

  return Array.from(around.values());
}

// ===== РАБОТА С СОСТОЯНИЕМ ИГРОКОВ =====

function ensurePlayerBoard(player: GamePlayerState): void {
  if (!player.board) {
    player.board = { cells: [] };
  }
}

function getPlayerState(gameState: GameState, playerIndex: string | number): GamePlayerState {
  const player = gameState.players.find((playerState) => playerState.gamePlayerId === playerIndex);

  if (!player) {
    throw new Error('Player not found');
  }

  ensurePlayerBoard(player);

  return player;
}

function getOpponentState(gameState: GameState, attackerIndex: string | number): GamePlayerState {
  const opponent = gameState.players.find((playerState) => playerState.gamePlayerId !== attackerIndex);

  if (!opponent) {
    throw new Error('Opponent not found');
  }

  // оппоненту доска не обязательна (мы храним только выстрелы атакующего)
  return opponent;
}

function hasCellBeenAttacked(player: GamePlayerState, x: number, y: number): boolean {
  if (!player.board) {
    return false;
  }

  return player.board.cells.some((cell) => cell.x === x && cell.y === y);
}

// ===== ЛОГИКА АТАКИ И КОРАБЛЕЙ =====

function findHitShip(ships: Ship[], x: number, y: number): Ship | null {
  return ships.find((ship) => getShipCells(ship).some((cell) => cell.x === x && cell.y === y)) || null;
}

function isShipKilled(attacker: GamePlayerState, ship: Ship): boolean {
  if (!attacker.board) {
    return false;
  }

  const shipCells = getShipCells(ship);

  return shipCells.every((shipCell) =>
    attacker.board?.cells.some(
      (attackedCell) =>
        attackedCell.x === shipCell.x &&
        attackedCell.y === shipCell.y &&
        (attackedCell.status === 'shot' || attackedCell.status === 'killed')
    )
  );
}

function markShipAsKilled(attacker: GamePlayerState, ship: Ship): void {
  if (!attacker.board) {
    attacker.board = { cells: [] };
  }

  const shipCells = getShipCells(ship);
  const boardCells = attacker.board.cells;
  const cellMap = new Map<string, BoardCell>(boardCells.map((cell) => [`${cell.x},${cell.y}`, cell]));

  for (const shipCell of shipCells) {
    const key = `${shipCell.x},${shipCell.y}`;
    const existingCell = cellMap.get(key);

    if (existingCell) {
      existingCell.status = 'killed';
    } else {
      const newCell: BoardCell = {
        x: shipCell.x,
        y: shipCell.y,
        status: 'killed',
      };
      boardCells.push(newCell);
      cellMap.set(key, newCell);
    }
  }
}

function processAttack(
  attacker: GamePlayerState,
  opponent: GamePlayerState,
  x: number,
  y: number
): {
  status: AttackStatus;
  killedShipAroundCells: Position[];
} {
  if (!attacker.board) {
    attacker.board = { cells: [] };
  }

  const hitShip = findHitShip(opponent.ships, x, y);

  if (!hitShip) {
    attacker.board.cells.push({ x, y, status: 'miss' });
    return { status: 'miss', killedShipAroundCells: [] };
  }

  attacker.board.cells.push({ x, y, status: 'shot' });

  if (isShipKilled(attacker, hitShip)) {
    markShipAsKilled(attacker, hitShip);
    const aroundCells = getCellsAroundShip(hitShip);

    return {
      status: 'killed',
      killedShipAroundCells: aroundCells,
    };
  }

  return {
    status: 'shot',
    killedShipAroundCells: [],
  };
}

function checkGameOver(attacker: GamePlayerState, opponent: GamePlayerState): boolean {
  return opponent.ships.every((ship) => isShipKilled(attacker, ship));
}

// ===== ПУБЛИЧНАЯ ФУНКЦИЯ АТАКИ =====

export function applyAttackToGameState(params: {
  gameState: GameState;
  attackerPlayerId: string | number;
  x: number;
  y: number;
}): AttackLogicResult {
  const { gameState, attackerPlayerId, x, y } = params;

  // 1. проверяем координаты
  validateAttackCoordinates(x, y);

  // 2. находим игроков
  const attacker = getPlayerState(gameState, attackerPlayerId);
  const opponent = getOpponentState(gameState, attackerPlayerId);

  // 3. проверяем повторный выстрел
  if (hasCellBeenAttacked(attacker, x, y)) {
    throw new Error('This cell has already been attacked');
  }

  // 4. считаем результат атаки
  const attackResult = processAttack(attacker, opponent, x, y);

  // 5. проверяем, не закончилась ли игра
  const isGameOver = checkGameOver(attacker, opponent);

  return {
    ...attackResult,
    isGameOver,
  };
}

export function generateBotShipsForSinglePlay(): Ship[] {
  const boardSize = environment.boardSize;

  const shipLengths: number[] = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

  const shipTypeByLength: Record<number, ShipType> = {
    1: 'small',
    2: 'medium',
    3: 'large',
    4: 'huge',
  };

  const maximumAttempts = 200;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const ships: Ship[] = [];

    const occupiedCells = new Set<string>();
    const blockedCells = new Set<string>();

    const encodePosition = (position: Position): string => `${position.x}:${position.y}`;

    const isCellBusy = (x: number, y: number): boolean => {
      const cellKey = `${x}:${y}`;
      return occupiedCells.has(cellKey) || blockedCells.has(cellKey);
    };

    const markShipOnBoard = (ship: Ship): void => {
      const shipCells: Position[] = getShipCells(ship);
      for (const cell of shipCells) {
        occupiedCells.add(encodePosition(cell));
      }

      const cellsAroundShip: Position[] = getCellsAroundShip(ship);
      for (const cell of cellsAroundShip) {
        if (cell.x < 0 || cell.x >= boardSize || cell.y < 0 || cell.y >= boardSize) {
          continue;
        }
        blockedCells.add(encodePosition(cell));
      }
    };

    let generationFailed = false;

    for (const shipLength of shipLengths) {
      const shipType = shipTypeByLength[shipLength];
      const possibleShips: Ship[] = [];

      const orientations: boolean[] = [true, false]; // true = вертикальный, false = горизонтальный

      for (const isVerticalDirection of orientations) {
        const maximumX = isVerticalDirection ? boardSize - 1 : boardSize - shipLength;
        const maximumY = isVerticalDirection ? boardSize - shipLength : boardSize - 1;

        for (let startX = 0; startX <= maximumX; startX += 1) {
          for (let startY = 0; startY <= maximumY; startY += 1) {
            const candidateShip: Ship = {
              length: shipLength,
              direction: isVerticalDirection,
              position: { x: startX, y: startY },
              type: shipType,
            };

            const candidateCells: Position[] = getShipCells(candidateShip);

            let hasConflict = false;

            // 1. Проверяем клетки самого корабля
            for (const cell of candidateCells) {
              if (cell.x < 0 || cell.x >= boardSize || cell.y < 0 || cell.y >= boardSize) {
                hasConflict = true;
                break;
              }
              if (isCellBusy(cell.x, cell.y)) {
                hasConflict = true;
                break;
              }
            }

            if (hasConflict) {
              continue;
            }

            // 2. Проверяем клетки вокруг корабля
            const candidateAround: Position[] = getCellsAroundShip(candidateShip);
            for (const position of candidateAround) {
              if (position.x < 0 || position.x >= boardSize || position.y < 0 || position.y >= boardSize) {
                continue;
              }
              if (isCellBusy(position.x, position.y)) {
                hasConflict = true;
                break;
              }
            }

            if (hasConflict) {
              continue;
            }

            possibleShips.push(candidateShip);
          }
        }
      }

      if (possibleShips.length === 0) {
        generationFailed = true;
        break;
      }

      const randomIndex = getRandomIntegerInclusive(0, possibleShips.length - 1);
      const chosenShip = possibleShips[randomIndex];

      ships.push(chosenShip);
      markShipOnBoard(chosenShip);
    }

    if (!generationFailed) {
      return ships;
    }
  }

  logError(`[BotShips] Failed to generate bot ships after ${maximumAttempts} attempts on boardSize=${boardSize}`);
  throw new Error('Failed to generate bot ships: no possible placement for some ship.');
}
