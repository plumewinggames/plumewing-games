/**
 * AdManager - Universal Ad Abstraction Layer.
 * Transparently supports:
 * 1. Web Local / Mock (Instant simulated timer for local & mobile LAN testing)
 * 2. Web Portals (Poki SDK & CrazyGames SDK)
 * 3. Mobile Native (Capacitor AdMob / AppLovin MAX)
 */
export class AdManager {
  constructor() {
    this.provider = this.detectProvider();
    this.interstitialCounter = 0;
  }

  detectProvider() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
      return 'capacitor';
    }
    if (window.PokiSDK) {
      return 'poki';
    }
    if (window.CrazyGames && window.CrazyGames.SDK) {
      return 'crazygames';
    }
    return 'mock';
  }

  /**
   * Rewarded Video Ad (Revive, Double Currency, Energy Refill)
   * @param {Function} onReward Called when ad completes successfully
   * @param {Function} onDismiss Called if user cancels or fails
   */
  async showRewarded(onReward, onDismiss) {
    if (this.provider === 'poki') {
      try {
        await window.PokiSDK.rewardedBreak();
        onReward();
      } catch (e) {
        if (onDismiss) onDismiss();
      }
      return;
    }

    if (this.provider === 'crazygames') {
      try {
        window.CrazyGames.SDK.ad.requestAd('rewarded', {
          adFinished: () => onReward(),
          adError: () => onDismiss && onDismiss()
        });
      } catch (e) {
        if (onDismiss) onDismiss();
      }
      return;
    }

    // Default Mock Provider for Web / Localhost / GitHub Pages testing
    this.showMockAdModal('Rewarded Video Ad (Simulated)', 3, onReward, onDismiss);
  }

  /**
   * Interstitial Ad at natural break (Game Over)
   */
  async showInterstitial(onComplete) {
    this.interstitialCounter++;
    // Show interstitial every 2nd or 3rd game over
    if (this.interstitialCounter % 3 !== 0) {
      if (onComplete) onComplete();
      return;
    }

    if (this.provider === 'poki') {
      try {
        await window.PokiSDK.commercialBreak();
      } catch (e) {}
      if (onComplete) onComplete();
      return;
    }

    if (this.provider === 'crazygames') {
      try {
        window.CrazyGames.SDK.ad.requestAd('midgame', {
          adFinished: () => onComplete && onComplete(),
          adError: () => onComplete && onComplete()
        });
      } catch (e) {
        if (onComplete) onComplete();
      }
      return;
    }

    // Mock quick overlay
    this.showMockAdModal('Interstitial Ad (Simulated)', 2, onComplete, onComplete);
  }

  showMockAdModal(title, seconds, onSuccess, onFail) {
    const existing = document.getElementById('mock-ad-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'mock-ad-modal';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.92);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 999999; color: #fff; font-family: system-ui, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="background: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #38bdf8; text-align: center; max-width: 320px; width: 90%;">
        <div style="font-size: 13px; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Ad Simulation</div>
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 16px;">${title}</div>
        <div id="mock-ad-timer" style="font-size: 36px; font-weight: 800; color: #f59e0b; margin-bottom: 16px;">${seconds}s</div>
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 16px;">Supporting $0 Upfront Cost Game Studio</div>
        <button id="mock-ad-skip" style="background: #334155; color: #94a3b8; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">Skip (Cancel)</button>
      </div>
    `;

    document.body.appendChild(overlay);

    let timeLeft = seconds;
    const timerElem = document.getElementById('mock-ad-timer');
    const interval = setInterval(() => {
      timeLeft--;
      if (timerElem) timerElem.textContent = `${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(interval);
        overlay.remove();
        if (onSuccess) onSuccess();
      }
    }, 1000);

    document.getElementById('mock-ad-skip').onclick = () => {
      clearInterval(interval);
      overlay.remove();
      if (onFail) onFail();
    };
  }
}

export const ads = new AdManager();
