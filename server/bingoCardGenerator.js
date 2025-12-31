/**
 * Generates bingo cards with equal probability of winning
 * Traditional 5x5 format with numbers 1-75
 * B column: 1-15, I column: 16-30, N column: 31-45, G column: 46-60, O column: 61-75
 */

class BingoCardGenerator {
  constructor() {
    this.columnRanges = {
      B: [1, 15],
      I: [16, 30],
      N: [31, 45],
      G: [46, 60],
      O: [61, 75]
    };
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Generate a single bingo card
   */
  generateCard(playerId) {
    const card = {
      id: playerId,
      grid: [],
      markedCells: Array(5).fill(null).map(() => Array(5).fill(false))
    };

    // Mark center as free space
    card.markedCells[2][2] = true;

    const columns = ['B', 'I', 'N', 'G', 'O'];

    for (let col = 0; col < 5; col++) {
      const column = [];
      const [min, max] = this.columnRanges[columns[col]];

      // Generate range of numbers for this column
      const numbers = [];
      for (let i = min; i <= max; i++) {
        numbers.push(i);
      }

      // Shuffle and take first 5
      const shuffled = this.shuffleArray(numbers);
      const selected = shuffled.slice(0, 5);

      for (let row = 0; row < 5; row++) {
        if (col === 2 && row === 2) {
          // Free space in center
          column.push('FREE');
        } else {
          column.push(selected[row]);
        }
      }

      card.grid.push(column);
    }

    return card;
  }

  /**
   * Generate multiple cards ensuring uniqueness
   */
  generateCards(count) {
    const cards = [];
    const cardSet = new Set();

    for (let i = 0; i < count; i++) {
      let card;
      let attempts = 0;

      do {
        card = this.generateCard(`player-${i + 1}`);
        const cardString = JSON.stringify(card.grid);

        if (!cardSet.has(cardString)) {
          cardSet.add(cardString);
          break;
        }

        attempts++;
      } while (attempts < 100); // Prevent infinite loop

      cards.push(card);
    }

    return cards;
  }

  /**
   * Mark a number on a card
   */
  markNumber(card, number) {
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 5; row++) {
        if (card.grid[col][row] === number) {
          card.markedCells[row][col] = true;
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if a card has a valid bingo pattern
   * Returns array of winning patterns
   */
  checkBingo(card) {
    const wins = [];
    const marked = card.markedCells;

    // Check rows
    for (let row = 0; row < 5; row++) {
      if (marked[row].every(cell => cell)) {
        wins.push(`Row ${row + 1}`);
      }
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      if (marked.every(row => row[col])) {
        const columnNames = ['B', 'I', 'N', 'G', 'O'];
        wins.push(`${columnNames[col]} Column`);
      }
    }

    // Check diagonals
    if (marked[0][0] && marked[1][1] && marked[2][2] && marked[3][3] && marked[4][4]) {
      wins.push('Diagonal (Top-Left to Bottom-Right)');
    }
    if (marked[0][4] && marked[1][3] && marked[2][2] && marked[3][1] && marked[4][0]) {
      wins.push('Diagonal (Top-Right to Bottom-Left)');
    }

    // Check if all marked (Full House)
    const allMarked = marked.every(row => row.every(cell => cell));
    if (allMarked) {
      wins.push('Full House');
    }

    // Check first 5 numbers marked
    let markedCount = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (marked[row][col]) markedCount++;
      }
    }

    return wins;
  }

  /**
   * Get count of marked numbers
   */
  getMarkedCount(card) {
    let count = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (card.markedCells[row][col]) count++;
      }
    }
    return count;
  }
}

module.exports = BingoCardGenerator;
