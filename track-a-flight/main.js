import { ads } from '../core/ads/AdManager.js';
import { FlightEngine } from './src/FlightEngine.js';
import { crossPromo } from '../core/crossPromo/CrossPromoModal.js';

ads.gameLoadingStart();
const engine = new FlightEngine('flight-canvas');
ads.gameLoadingProgress(1.0);
ads.gameLoadingFinished();
engine.start();

// Arena change handler
const arenaSelector = document.getElementById('arena-selector');
if (arenaSelector) {
  arenaSelector.addEventListener('change', (e) => {
    engine.switchArena(e.target.value);
  });
}

// Revive & Restart buttons
const reviveBtn = document.getElementById('revive-btn');
if (reviveBtn) {
  reviveBtn.addEventListener('click', () => {
    engine.attemptRevive();
  });
}

const restartBtn = document.getElementById('restart-btn');
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.style.display = 'none';
    engine.switchArena(engine.config.id);
  });
}

// Zero-CAC Cross Promotion Modal
const moreGamesBtn = document.getElementById('more-games-btn');
if (moreGamesBtn) {
  moreGamesBtn.addEventListener('click', () => {
    crossPromo.showPortfolioModal('track-a');
  });
}
