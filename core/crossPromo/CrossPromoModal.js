/**
 * CrossPromoModal - Zero-CAC Cross-Promotion Engine.
 * Recycles players between portfolio titles at $0 acquisition cost.
 */
export class CrossPromoModal {
  constructor() {
    this.games = [
      {
        id: 'puff-guard',
        title: 'Puff Guard: Defenders of the Reef',
        tagline: 'Defend 5 progressive coral reefs with asymmetric divers',
        track: 'Aquatic Survival (HTML5 60 FPS)',
        folder: 'puff-guard',
        badge: 'NEW FLAGSHIP',
        color: '#06b6d4'
      },
      {
        id: 'track-a',
        title: 'Notebook Flight: Manta Ray',
        tagline: 'Glide through sunken bioluminescent ruins & the void',
        track: 'Track A (3D Three.js)',
        folder: 'track-a-flight',
        badge: 'Flagship 3D',
        color: '#38bdf8'
      },
      {
        id: 'track-b',
        title: 'Featherweight: Caveman Chase',
        tagline: 'Outrun the relentless mallet slamming prehistoric beast',
        track: 'Track B (2.5D Canvas)',
        folder: 'track-b-chase',
        badge: 'Action Slapstick',
        color: '#f97316'
      }
    ];
  }

  showPortfolioModal(currentGameId) {
    const existing = document.getElementById('cross-promo-modal');
    if (existing) existing.remove();

    const isSubfolder = window.location.pathname.includes('/track-') || window.location.pathname.includes('/puff-guard');
    const prefix = isSubfolder ? '../' : './';

    const overlay = document.createElement('div');
    overlay.id = 'cross-promo-modal';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 99999; color: #fff; font-family: system-ui, sans-serif; padding: 16px;
    `;

    overlay.innerHTML = `
      <div style="background: #0f172a; border: 1px solid #334155; border-radius: 16px; max-width: 440px; width: 100%; padding: 20px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #f8fafc;">More Games</h3>
            <span style="font-size: 11px; color: #94a3b8;">Discover more free web & mobile titles</span>
          </div>
          <button id="close-cross-promo" style="background: #1e293b; border: none; color: #94a3b8; width: 32px; height: 32px; border-radius: 50%; font-size: 16px; cursor: pointer;">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${this.games.map(g => {
            const targetUrl = `${prefix}${g.folder}/index.html`;
            return `
            <div style="background: #1e293b; border: 1px solid ${g.id === currentGameId ? '#475569' : g.color}; border-radius: 12px; padding: 14px; display: flex; align-items: center; justify-content: space-between; ${g.id === currentGameId ? 'opacity: 0.6;' : ''}">
              <div style="flex: 1; padding-right: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="font-weight: 700; font-size: 14px; color: #f8fafc;">${g.title}</span>
                  <span style="font-size: 10px; background: ${g.color}; color: #000; font-weight: bold; padding: 2px 6px; border-radius: 4px;">${g.badge}</span>
                </div>
                <div style="font-size: 12px; color: #94a3b8;">${g.tagline}</div>
              </div>
              <div>
                ${g.id === currentGameId ? 
                  '<span style="font-size: 11px; color: #64748b; font-weight: 600;">PLAYING NOW</span>' : 
                  `<a href="${targetUrl}" style="background: ${g.color}; color: #000; font-weight: 700; font-size: 12px; text-decoration: none; padding: 8px 14px; border-radius: 8px; display: inline-block;">PLAY</a>`
                }
              </div>
            </div>
          `}).join('')}
        </div>

        <div style="margin-top: 16px; text-align: center; border-top: 1px solid #334155; padding-top: 12px;">
          <a href="${prefix}index.html" style="color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 600;">🏠 Return to Main Portfolio Hub</a>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('close-cross-promo').onclick = () => overlay.remove();
  }
}

export const crossPromo = new CrossPromoModal();
