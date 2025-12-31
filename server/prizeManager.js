/**
 * Manages prizes and winners for the bingo game
 * Default prizes: Top Row, Middle Row, Bottom Row, Each Column (B,I,N,G,O), Early 5, Full House
 */

class PrizeManager {
  constructor() {
    this.prizes = [
      { id: 'early-5', name: 'Early 5', description: 'First to mark 5 numbers', claimed: false, winner: null },
      { id: 'top-row', name: 'Top Row', description: 'Complete top row', claimed: false, winner: null },
      { id: 'middle-row', name: 'Middle Row', description: 'Complete middle row', claimed: false, winner: null },
      { id: 'bottom-row', name: 'Bottom Row', description: 'Complete bottom row', claimed: false, winner: null },
      { id: 'b-column', name: 'B Column', description: 'Complete B column', claimed: false, winner: null },
      { id: 'i-column', name: 'I Column', description: 'Complete I column', claimed: false, winner: null },
      { id: 'n-column', name: 'N Column', description: 'Complete N column', claimed: false, winner: null },
      { id: 'g-column', name: 'G Column', description: 'Complete G column', claimed: false, winner: null },
      { id: 'o-column', name: 'O Column', description: 'Complete O column', claimed: false, winner: null },
      { id: 'full-house', name: 'Full House', description: 'Mark all numbers', claimed: false, winner: null }
    ];
  }

  /**
   * Check which prizes a player has won
   */
  checkPrizes(card, playerName) {
    const wonPrizes = [];
    const marked = card.markedCells;

    // Check Early 5 (excluding free space)
    const markedCount = this.getMarkedCount(card) - 1; // Subtract 1 for free space
    if (markedCount >= 5 && !this.prizes[0].claimed) {
      wonPrizes.push(this.prizes[0]);
    }

    // Check Top Row (Row 1)
    if (marked[0].every(cell => cell) && !this.prizes[1].claimed) {
      wonPrizes.push(this.prizes[1]);
    }

    // Check Middle Row (Row 3)
    if (marked[2].every(cell => cell) && !this.prizes[2].claimed) {
      wonPrizes.push(this.prizes[2]);
    }

    // Check Bottom Row (Row 5)
    if (marked[4].every(cell => cell) && !this.prizes[3].claimed) {
      wonPrizes.push(this.prizes[3]);
    }

    // Check B Column
    if (marked.every(row => row[0]) && !this.prizes[4].claimed) {
      wonPrizes.push(this.prizes[4]);
    }

    // Check I Column
    if (marked.every(row => row[1]) && !this.prizes[5].claimed) {
      wonPrizes.push(this.prizes[5]);
    }

    // Check N Column
    if (marked.every(row => row[2]) && !this.prizes[6].claimed) {
      wonPrizes.push(this.prizes[6]);
    }

    // Check G Column
    if (marked.every(row => row[3]) && !this.prizes[7].claimed) {
      wonPrizes.push(this.prizes[7]);
    }

    // Check O Column
    if (marked.every(row => row[4]) && !this.prizes[8].claimed) {
      wonPrizes.push(this.prizes[8]);
    }

    // Check Full House
    const allMarked = marked.every(row => row.every(cell => cell));
    if (allMarked && !this.prizes[9].claimed) {
      wonPrizes.push(this.prizes[9]);
    }

    return wonPrizes;
  }

  /**
   * Claim prizes for a player
   */
  claimPrizes(wonPrizes, playerName, playerId) {
    const claimed = [];

    wonPrizes.forEach(prize => {
      const prizeIndex = this.prizes.findIndex(p => p.id === prize.id);
      if (prizeIndex !== -1 && !this.prizes[prizeIndex].claimed) {
        this.prizes[prizeIndex].claimed = true;
        this.prizes[prizeIndex].winner = { name: playerName, id: playerId };
        claimed.push(this.prizes[prizeIndex]);
      }
    });

    return claimed;
  }

  /**
   * Get all unclaimed prizes
   */
  getUnclaimedPrizes() {
    return this.prizes.filter(p => !p.claimed);
  }

  /**
   * Get all claimed prizes
   */
  getClaimedPrizes() {
    return this.prizes.filter(p => p.claimed);
  }

  /**
   * Get all prizes
   */
  getAllPrizes() {
    return this.prizes;
  }

  /**
   * Reset all prizes
   */
  reset() {
    this.prizes.forEach(prize => {
      prize.claimed = false;
      prize.winner = null;
    });
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

module.exports = PrizeManager;
