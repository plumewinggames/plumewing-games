import http from 'http';

async function pingUrl(url, timeoutMs = 4000) {
  try {
    const start = performance.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const latency = Math.round(performance.now() - start);
    return { ok: res.status >= 200 && res.status < 400, status: res.status, latency };
  } catch (e) {
    if (e.name === 'TimeoutError' || (e.cause && e.cause.code === 'UND_ERR_CONNECT_TIMEOUT')) {
      return { ok: false, status: 'TIMEOUT', error: 'Connection Timeout (Possible ISP / Firewall Block)' };
    }
    return { ok: false, status: 'FAILED', error: e.message };
  }
}

async function runHealthCheck() {
  console.log(`\n=============================================================`);
  console.log(`🔍 PlumeWing Games - Full Deployment & Health Test`);
  console.log(`=============================================================\n`);

  const targets = [
    { name: 'Local Dev Server (Vite)', url: 'http://localhost:5173/' },
    { name: 'Local Dev Track A (3D Flight)', url: 'http://localhost:5173/track-a-flight/index.html' },
    { name: 'Local Dev Track B (Caveman)', url: 'http://localhost:5173/track-b-chase/index.html' },
    { name: 'Local Dev Puff Guard', url: 'http://localhost:5173/puff-guard/index.html' },
    { name: 'Cloud: Vercel (Unblocked)', url: 'https://instant-hazel-xu18zfp.tmp.now/' },
    { name: 'Cloud: GitHub Pages Hub', url: 'https://plumewinggames.github.io/plumewing-games/' },
    { name: 'Cloud: GitHub Puff Guard', url: 'https://plumewinggames.github.io/plumewing-games/puff-guard/index.html' },
    { name: 'Cloud: GitHub 3D Flight', url: 'https://plumewinggames.github.io/plumewing-games/track-a-flight/index.html' },
    { name: 'Cloud: GitHub Caveman Chase', url: 'https://plumewinggames.github.io/plumewing-games/track-b-chase/index.html' },
    { name: 'Cloud: Netlify Hub', url: 'https://plumewing-games.netlify.app/' }
  ];

  for (const t of targets) {
    const result = await pingUrl(t.url);
    const badge = result.ok ? '✅ PASS' : (result.status === 'TIMEOUT' ? '⚠️ BLOCKED' : '❌ FAIL');
    const extra = result.latency ? `(${result.latency}ms)` : `(${result.error || result.status})`;
    console.log(`${badge.padEnd(10)} [${String(result.status).padEnd(4)}] ${t.name.padEnd(32)} ${extra}`);
  }

  console.log(`\n=============================================================`);
  console.log(`💡 Recommendation:`);
  console.log(`- If Local Dev is FAIL: Run 'npm run dev' or double-click 'PLAY_OFFLINE.bat'.`);
  console.log(`- If Netlify is TIMEOUT: Your ISP blocks Netlify IPs. Use GitHub Pages or a VPN.`);
  console.log(`=============================================================\n`);
}

runHealthCheck();
