import { ads } from '../core/ads/AdManager.js';
import { ChaseEngine } from './src/ChaseEngine.js';
import { ANIMAL_CONFIGS } from './src/animals/AnimalRegistry.js';
import { crossPromo } from '../core/crossPromo/CrossPromoModal.js';

ads.gameLoadingStart();
const engine = new ChaseEngine('chase-canvas');
ads.gameLoadingProgress(1.0);
ads.gameLoadingFinished();
engine.start();

// Animal Selector
const animalSelect = document.getElementById('animal-select');
if (animalSelect) {
  animalSelect.addEventListener('change', (e) => {
    engine.animalConfig = ANIMAL_CONFIGS[e.target.value];
    engine.animal.hearts = engine.animalConfig.hearts;
  });
}

// Revive & Restart
const reviveBtn = document.getElementById('chase-revive-btn');
if (reviveBtn) {
  reviveBtn.addEventListener('click', () => {
    engine.attemptRevive();
  });
}

const restartBtn = document.getElementById('chase-restart-btn');
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    location.reload();
  });
}

// Zero-CAC Cross Promo
const moreGamesBtn = document.getElementById('chase-more-games');
if (moreGamesBtn) {
  moreGamesBtn.addEventListener('click', () => {
    crossPromo.showPortfolioModal('track-b');
  });
}
