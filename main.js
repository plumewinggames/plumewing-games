import { economy } from './core/economy/EconomyManager.js';

const elPearls = document.getElementById('stat-pearls');
if (elPearls) {
  elPearls.textContent = economy.getPearls();
}

const elBerries = document.getElementById('stat-berries');
if (elBerries) {
  elBerries.textContent = economy.getGoldenBerries();
}
