/**
 * AdManager - Universal Ad & Monetization Abstraction Layer.
 * Supports:
 * 1. Web Portals: Poki SDK v2 & CrazyGames SDK v2/v3
 * 2. Mobile Native: Capacitor AdMob / AppLovin MAX
 * 3. Web Local / Mock: Instant simulated modal for local & mobile LAN testing
 *
 * Implements strict portal lifecycle methods:
 * - gameLoadingStart(), gameLoadingProgress(), gameLoadingFinished()
 * - gameplayStart(), gameplayStop(), happyTime()
 * - Rewarded video verification (withReward boolean check)
 * - Interstitial pacing (every 3rd death + 60s cooldown cap)
 * - Audio muting synchronization with SynthAudio
 * - Non-intrusive AdBlock detection and graceful fallback
 */

import { sound } from '../audio/SynthAudio.js';

export class AdManager {
  constructor() {
    this.provider = this.detectProvider();
    this.interstitialCounter = 0;
    this.lastInterstitialTime = 0;
    this.minInterstitialIntervalMs = 60000; // 60s minimum between interstitials
    this.isGameplayActive = false;
    this.wasAudioMutedByAd = false;
    this.adBlockDetected = false;

    // Run async adblock probe
    this.checkAdBlock().catch(() => {});
  }

  /**
   * Detect current ad environment
   */
  detectProvider() {
    if (typeof window !== 'undefined') {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
        return 'capacitor';
      }
      if (window.PokiSDK) {
        return 'poki';
      }
      if (window.CrazyGames && window.CrazyGames.SDK) {
        return 'crazygames';
      }
    }
    return 'mock';
  }

  /**
   * Override provider at runtime (useful for QA testing and simulation)
   */
  setProvider(providerName) {
    const valid = ['mock', 'poki', 'crazygames', 'capacitor'];
    if (valid.includes(providerName)) {
      this.provider = providerName;
      console.log(`[AdManager] Provider manually set to: ${this.provider}`);
    } else {
      console.warn(`[AdManager] Invalid provider "${providerName}". Valid: ${valid.join(', ')}`);
    }
  }

  getProvider() {
    return this.provider;
  }

  // --- SDK Lifecycle Management ---

  /**
   * Call when initial bundle and assets start loading
   */
  gameLoadingStart() {
    if (this.provider === 'poki' && window.PokiSDK && typeof window.PokiSDK.gameLoadingStart === 'function') {
      try {
        window.PokiSDK.gameLoadingStart();
      } catch (e) {
        console.warn('[AdManager] Poki gameLoadingStart failed:', e);
      }
    } else if (this.provider === 'crazygames' && window.CrazyGames?.SDK?.game?.loadingStart) {
      try {
        window.CrazyGames.SDK.game.loadingStart();
      } catch (e) {
        console.warn('[AdManager] CrazyGames loadingStart failed:', e);
      }
    }
  }

  /**
   * Report loading percentage (0.0 to 1.0)
   */
  gameLoadingProgress(percentage) {
    const clamped = Math.max(0, Math.min(1, percentage));
    if (this.provider === 'poki' && window.PokiSDK && typeof window.PokiSDK.gameLoadingProgress === 'function') {
      try {
        window.PokiSDK.gameLoadingProgress({ percentageCompleted: clamped });
      } catch (e) {
        console.warn('[AdManager] Poki gameLoadingProgress failed:', e);
      }
    }
  }

  /**
   * Call when loading completes and main menu or ready-screen is displayed
   */
  gameLoadingFinished() {
    if (this.provider === 'poki' && window.PokiSDK && typeof window.PokiSDK.gameLoadingFinished === 'function') {
      try {
        window.PokiSDK.gameLoadingFinished();
      } catch (e) {
        console.warn('[AdManager] Poki gameLoadingFinished failed:', e);
      }
    } else if (this.provider === 'crazygames' && window.CrazyGames?.SDK?.game?.loadingStop) {
      try {
        window.CrazyGames.SDK.game.loadingStop();
      } catch (e) {
        console.warn('[AdManager] CrazyGames loadingStop failed:', e);
      }
    }
  }

  /**
   * Call when active gameplay starts or resumes (first interaction, unpause, round reset, revive)
   */
  gameplayStart() {
    if (this.isGameplayActive) return;
    this.isGameplayActive = true;

    if (this.provider === 'poki' && window.PokiSDK && typeof window.PokiSDK.gameplayStart === 'function') {
      try {
        window.PokiSDK.gameplayStart();
      } catch (e) {
        console.warn('[AdManager] Poki gameplayStart failed:', e);
      }
    } else if (this.provider === 'crazygames' && window.CrazyGames?.SDK?.game?.gameplayStart) {
      try {
        window.CrazyGames.SDK.game.gameplayStart();
      } catch (e) {
        console.warn('[AdManager] CrazyGames gameplayStart failed:', e);
      }
    }
  }

  /**
   * Call when active gameplay stops (game over, pause menu, modal display, exit to menu)
   */
  gameplayStop() {
    if (!this.isGameplayActive) return;
    this.isGameplayActive = false;

    if (this.provider === 'poki' && window.PokiSDK && typeof window.PokiSDK.gameplayStop === 'function') {
      try {
        window.PokiSDK.gameplayStop();
      } catch (e) {
        console.warn('[AdManager] Poki gameplayStop failed:', e);
      }
    } else if (this.provider === 'crazygames' && window.CrazyGames?.SDK?.game?.gameplayStop) {
      try {
        window.CrazyGames.SDK.game.gameplayStop();
      } catch (e) {
        console.warn('[AdManager] CrazyGames gameplayStop failed:', e);
      }
    }
  }

  /**
   * Trigger celebratory moment (CrazyGames confetti / milestone event)
   * Call on stage clear, major boss defeat, or setting a new global high score.
   */
  happyTime() {
    if (this.provider === 'crazygames' && window.CrazyGames?.SDK?.game?.happytime) {
      try {
        window.CrazyGames.SDK.game.happytime();
      } catch (e) {
        console.warn('[AdManager] CrazyGames happytime failed:', e);
      }
    } else {
      console.log('[AdManager] HappyTime milestone triggered!');
    }
  }

  // --- Audio Synchronization Helpers ---

  pauseGameAudio() {
    if (sound && !sound.muted) {
      sound.mute();
      this.wasAudioMutedByAd = true;
    }
  }

  resumeGameAudio() {
    if (this.wasAudioMutedByAd) {
      if (sound) sound.unmute();
      this.wasAudioMutedByAd = false;
    }
  }

  // --- Monetization: Rewarded Video Ads ---

  /**
   * Rewarded Video Ad (Revive, Double Currency, Energy Refill)
   * Must ONLY be triggered via explicit player consent (button click).
   * @param {Function} onReward Called ONLY when ad is fully watched and verified
   * @param {Function} onDismiss Called if ad is cancelled, fails, or was skipped
   */
  async showRewarded(onReward, onDismiss) {
    // 1. Poki SDK
    if (this.provider === 'poki' && window.PokiSDK) {
      this.pauseGameAudio();
      try {
        const withReward = await window.PokiSDK.rewardedBreak();
        this.resumeGameAudio();
        if (withReward) {
          if (onReward) onReward();
        } else {
          console.log('[AdManager] Poki rewarded ad closed without reward');
          if (onDismiss) onDismiss('Ad skipped or closed early');
        }
      } catch (e) {
        this.resumeGameAudio();
        console.warn('[AdManager] Poki rewarded ad error:', e);
        if (onDismiss) onDismiss(e);
      }
      return;
    }

    // 2. CrazyGames SDK
    if (this.provider === 'crazygames' && window.CrazyGames?.SDK?.ad) {
      try {
        window.CrazyGames.SDK.ad.requestAd('rewarded', {
          adStarted: () => {
            this.pauseGameAudio();
          },
          adFinished: () => {
            this.resumeGameAudio();
            if (onReward) onReward();
          },
          adError: (error, errorData) => {
            this.resumeGameAudio();
            console.warn('[AdManager] CrazyGames rewarded ad error:', error, errorData);
            if (onDismiss) onDismiss(error || errorData);
          }
        });
      } catch (e) {
        this.resumeGameAudio();
        console.warn('[AdManager] CrazyGames requestAd rewarded exception:', e);
        if (onDismiss) onDismiss(e);
      }
      return;
    }

    // 3. Capacitor Native AdMob (Phase 2 Mobile Wrapper)
    if (this.provider === 'capacitor' && window.Capacitor?.Plugins?.AdMob) {
      this.pauseGameAudio();
      try {
        const { AdMob } = window.Capacitor.Plugins;
        await AdMob.showRewardVideoAd();
        this.resumeGameAudio();
        if (onReward) onReward();
      } catch (e) {
        this.resumeGameAudio();
        console.warn('[AdManager] Capacitor AdMob rewarded error:', e);
        if (onDismiss) onDismiss(e);
      }
      return;
    }

    // 4. Default Mock Provider (Localhost / Preview / LAN)
    this.showMockAdModal('Rewarded Video Ad (Simulated)', 3, onReward, onDismiss);
  }

  // --- Monetization: Interstitial Commercial Breaks ---

  /**
   * Interstitial Ad at natural break (Game Over / Level Transition)
   * Enforces 1-every-3-deaths cap AND 60-second minimum interval cooldown.
   * @param {Function} onComplete Callback invoked when flow resumes
   */
  async showInterstitial(onComplete) {
    this.interstitialCounter++;
    const now = Date.now();

    // Guardrail: Show only every 3rd game over
    if (this.interstitialCounter % 3 !== 0) {
      if (onComplete) onComplete();
      return;
    }

    // Guardrail: Minimum 60s cooldown to comply with portal spam policies
    if (now - this.lastInterstitialTime < this.minInterstitialIntervalMs) {
      if (onComplete) onComplete();
      return;
    }

    this.lastInterstitialTime = now;

    // 1. Poki SDK
    if (this.provider === 'poki' && window.PokiSDK) {
      this.pauseGameAudio();
      try {
        await window.PokiSDK.commercialBreak(() => {
          this.pauseGameAudio();
        });
      } catch (e) {
        console.warn('[AdManager] Poki commercial break error:', e);
      }
      this.resumeGameAudio();
      if (onComplete) onComplete();
      return;
    }

    // 2. CrazyGames SDK
    if (this.provider === 'crazygames' && window.CrazyGames?.SDK?.ad) {
      try {
        window.CrazyGames.SDK.ad.requestAd('midgame', {
          adStarted: () => {
            this.pauseGameAudio();
          },
          adFinished: () => {
            this.resumeGameAudio();
            if (onComplete) onComplete();
          },
          adError: (error) => {
            this.resumeGameAudio();
            if (onComplete) onComplete();
          }
        });
      } catch (e) {
        this.resumeGameAudio();
        if (onComplete) onComplete();
      }
      return;
    }

    // 3. Capacitor Native AdMob
    if (this.provider === 'capacitor' && window.Capacitor?.Plugins?.AdMob) {
      this.pauseGameAudio();
      try {
        await window.Capacitor.Plugins.AdMob.showInterstitial();
      } catch (e) {
        console.warn('[AdManager] Capacitor interstitial error:', e);
      }
      this.resumeGameAudio();
      if (onComplete) onComplete();
      return;
    }

    // 4. Default Mock Provider
    this.showMockAdModal('Interstitial Ad (Simulated)', 2, onComplete, onComplete);
  }

  // --- AdBlocker Detection Protocol ---

  /**
   * Asynchronously checks whether an ad blocker is preventing ads from loading.
   * Completely non-destructive: games remain fully playable without ads.
   */
  async checkAdBlock() {
    if (typeof window === 'undefined') return false;

    // 1. CrazyGames native adblock check
    if (this.provider === 'crazygames' && window.CrazyGames?.SDK?.ad?.hasAdblock) {
      try {
        this.adBlockDetected = await window.CrazyGames.SDK.ad.hasAdblock();
        return this.adBlockDetected;
      } catch (e) {}
    }

    // 2. Poki adblock probe
    if (this.provider === 'poki' && window.PokiSDK && typeof window.PokiSDK.isAdBlocked === 'function') {
      try {
        this.adBlockDetected = window.PokiSDK.isAdBlocked();
        return this.adBlockDetected;
      } catch (e) {}
    }

    // 3. DOM Bait Probe (Zero-network fallback)
    try {
      const bait = document.createElement('div');
      bait.className = 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links';
      bait.style.cssText = 'width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important; top: -1000px !important;';
      document.body.appendChild(bait);
      
      const isBlocked = window.getComputedStyle(bait).display === 'none' || bait.offsetHeight === 0;
      document.body.removeChild(bait);
      this.adBlockDetected = isBlocked;
      return isBlocked;
    } catch (e) {
      this.adBlockDetected = false;
      return false;
    }
  }

  isAdBlockActive() {
    return this.adBlockDetected;
  }

  // --- Simulated Mock Modal ---

  showMockAdModal(title, seconds, onSuccess, onFail) {
    this.pauseGameAudio();
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
      <div style="background: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #38bdf8; text-align: center; max-width: 320px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="font-size: 13px; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Ad Simulation (${this.provider})</div>
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 16px;">${title}</div>
        <div id="mock-ad-timer" style="font-size: 36px; font-weight: 800; color: #f59e0b; margin-bottom: 16px;">${seconds}s</div>
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 16px;">Supporting PlumeWing Games ($0 Burn)</div>
        <button id="mock-ad-skip" style="background: #334155; color: #94a3b8; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: background 0.2s;">Skip (Cancel)</button>
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
        this.resumeGameAudio();
        if (onSuccess) onSuccess();
      }
    }, 1000);

    const skipBtn = document.getElementById('mock-ad-skip');
    if (skipBtn) {
      skipBtn.onclick = () => {
        clearInterval(interval);
        overlay.remove();
        this.resumeGameAudio();
        if (onFail) onFail('User cancelled mock ad');
      };
    }
  }
}

export const ads = new AdManager();
