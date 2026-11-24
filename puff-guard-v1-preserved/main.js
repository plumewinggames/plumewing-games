import { PuffGuardEngine } from './src/PuffGuardEngine.js';
import { IntroVideoPlayer } from './src/IntroVideoPlayer.js';
import { crossPromo } from '../core/crossPromo/CrossPromoModal.js';

const engine = new PuffGuardEngine('puff-canvas');
let selectedDiver = 'maya';
let selectedDiff = 'standard';

// 1. Video Intro Controller
const introPlayer = new IntroVideoPlayer('puff-canvas', () => {
  const introEl = document.getElementById('intro-modal');
  if (introEl) introEl.style.display = 'none';
  const setupEl = document.getElementById('setup-modal');
  if (setupEl) setupEl.style.display = 'flex';
});

const btnPlayIntro = document.getElementById('btn-play-intro');
if (btnPlayIntro) {
  btnPlayIntro.addEventListener('click', () => {
    const introEl = document.getElementById('intro-modal');
    if (introEl) introEl.style.display = 'none';
    introPlayer.play();
  });
}

const btnSkipIntro = document.getElementById('btn-skip-intro');
if (btnSkipIntro) {
  btnSkipIntro.addEventListener('click', () => {
    const introEl = document.getElementById('intro-modal');
    if (introEl) introEl.style.display = 'none';
    const setupEl = document.getElementById('setup-modal');
    if (setupEl) setupEl.style.display = 'flex';
  });
}

// 2. Setup Selection (Divers & Difficulty)
document.querySelectorAll('[data-diver]').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('[data-diver]').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    selectedDiver = el.getAttribute('data-diver');
  });
});

document.querySelectorAll('[data-diff]').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('[data-diff]').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    selectedDiff = el.getAttribute('data-diff');
  });
});

const btnDiveNow = document.getElementById('btn-dive-now');
if (btnDiveNow) {
  btnDiveNow.addEventListener('click', () => {
    const setupEl = document.getElementById('setup-modal');
    if (setupEl) setupEl.style.display = 'none';
    const hudEl = document.getElementById('hud');
    if (hudEl) hudEl.style.display = 'flex';
    const touchEl = document.getElementById('touch-controls');
    if (touchEl) touchEl.style.display = 'block';

    engine.setDiver(selectedDiver);
    engine.setDifficulty(selectedDiff);
    engine.start();
  });
}

// 3. Revive & Restart
const reviveBtn = document.getElementById('revive-btn');
if (reviveBtn) {
  reviveBtn.addEventListener('click', () => {
    engine.attemptRevive();
  });
}

const restartBtn = document.getElementById('restart-btn');
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    location.reload();
  });
}

// 4. Cross-Promo
const moreGamesBtn = document.getElementById('more-games-btn');
if (moreGamesBtn) {
  moreGamesBtn.addEventListener('click', () => {
    crossPromo.showPortfolioModal('puff-guard');
  });
}
