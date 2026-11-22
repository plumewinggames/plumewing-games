/**
 * EconomyManager - LocalStorage persistent economy & progression manager.
 * Zero external database dependency, instant state syncing.
 */
export class EconomyManager {
  constructor() {
    this.STORAGE_KEY = 'antigravity_portfolio_save_v1';
    this.state = this.loadState();
  }

  getDefaultState() {
    return {
      currencies: {
        pearls: 0,
        goldenBerries: 0
      },
      highScores: {
        flight: {},
        chase: {}
      },
      unlockedArenas: ['mantaRay'], // Track A default
      unlockedAnimals: ['dodo'],    // Track B default
      unlockedStages: [1],          // Track B default
      unlockedLevels: ['1-1'],
      vipPass: false,
      noAds: false,
      settings: {
        sound: true,
        music: true
      }
    };
  }

  loadState() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return this.getDefaultState();
      return { ...this.getDefaultState(), ...JSON.parse(data) };
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
      return this.getDefaultState();
    }
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }

  // --- Currencies ---
  getPearls() {
    return this.state.currencies.pearls || 0;
  }

  addPearls(amount) {
    this.state.currencies.pearls = (this.state.currencies.pearls || 0) + Math.max(0, amount);
    this.saveState();
    return this.state.currencies.pearls;
  }

  spendPearls(amount) {
    if ((this.state.currencies.pearls || 0) >= amount) {
      this.state.currencies.pearls -= amount;
      this.saveState();
      return true;
    }
    return false;
  }

  getGoldenBerries() {
    return this.state.currencies.goldenBerries || 0;
  }

  addGoldenBerries(amount) {
    this.state.currencies.goldenBerries = (this.state.currencies.goldenBerries || 0) + Math.max(0, amount);
    this.saveState();
    return this.state.currencies.goldenBerries;
  }

  spendGoldenBerries(amount) {
    if ((this.state.currencies.goldenBerries || 0) >= amount) {
      this.state.currencies.goldenBerries -= amount;
      this.saveState();
      return true;
    }
    return false;
  }

  // --- High Scores ---
  getHighScore(track, key) {
    return (this.state.highScores[track] && this.state.highScores[track][key]) || 0;
  }

  recordScore(track, key, score) {
    if (!this.state.highScores[track]) this.state.highScores[track] = {};
    const current = this.state.highScores[track][key] || 0;
    if (score > current) {
      this.state.highScores[track][key] = score;
      this.saveState();
      return { isNewHigh: true, best: score };
    }
    return { isNewHigh: false, best: current };
  }

  // --- Unlocks ---
  isArenaUnlocked(arenaId) {
    return this.state.unlockedArenas.includes(arenaId);
  }

  unlockArena(arenaId) {
    if (!this.state.unlockedArenas.includes(arenaId)) {
      this.state.unlockedArenas.push(arenaId);
      this.saveState();
      return true;
    }
    return false;
  }

  isAnimalUnlocked(animalId) {
    return this.state.unlockedAnimals.includes(animalId);
  }

  unlockAnimal(animalId) {
    if (!this.state.unlockedAnimals.includes(animalId)) {
      this.state.unlockedAnimals.push(animalId);
      this.saveState();
      return true;
    }
    return false;
  }

  isStageUnlocked(stageNumber) {
    return this.state.unlockedStages.includes(stageNumber);
  }

  unlockStage(stageNumber) {
    if (!this.state.unlockedStages.includes(stageNumber)) {
      this.state.unlockedStages.push(stageNumber);
      this.saveState();
      return true;
    }
    return false;
  }
}

export const economy = new EconomyManager();
