import { environment } from '../config/environment.js';
import type { BoardCell, Position } from '../models/game.model.js';

export function getRandomIntegerInclusive(minValue: number, maxValue: number): number {
  const minimum = Math.ceil(minValue);
  const maximum = Math.floor(maxValue);
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

/**
 * Выбрать случайную клетку, в которую ещё не стреляли.
 * Возвращает null, если свободных клеток не осталось.
 */
export function getRandomFreeAttackPosition(params: {
  existingBoardCells: BoardCell[];
  boardSize?: number;
}): Position | null {
  const boardSize = params.boardSize ?? environment.boardSize;

  const attackedCellsKeys = new Set(
    params.existingBoardCells.map((cell) => `${cell.x},${cell.y}`)
  );

  const allFreePositions: Position[] = [];

  for (let x = 0; x < boardSize; x += 1) {
    for (let y = 0; y < boardSize; y += 1) {
      const key = `${x},${y}`;
      if (!attackedCellsKeys.has(key)) {
        allFreePositions.push({ x, y });
      }
    }
  }

  if (allFreePositions.length === 0) {
    return null;
  }

  const randomIndex = getRandomIntegerInclusive(0, allFreePositions.length - 1);
  return allFreePositions[randomIndex];
}
