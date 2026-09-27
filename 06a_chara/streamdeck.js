(() => {
  // 音声入力は一時停止中。復帰時は streamdeck-voice.disabled.js を参照してください。
  const select = (selector) => document.querySelector(selector)?.click();
  const actions = {
    attack() { select('.role-tab[data-role="attack"]'); },
    defense() { select('.role-tab[data-role="defense"]'); },
    missions() {
      select('.role-tab[data-role="map"]');
      select('#mp-tab-map');
    },
    monsters() {
      select('.role-tab[data-role="map"]');
      select('#mp-tab-monsters');
    },
    chips() {
      select('.role-tab[data-role="character"]');
      select('#character-chip-tab');
    }
  };

  // Stream Deck からのタブ切り替えだけを受信します。
  if (typeof EventSource !== 'undefined') {
    const source = new EventSource('http://127.0.0.1:17371/events');
    source.onmessage = (event) => {
      try {
        const action = JSON.parse(event.data).action;
        if (Object.hasOwn(actions, action)) actions[action]();
      } catch (_) { /* 不正なメッセージは無視します。 */ }
    };
    window.addEventListener('pagehide', () => source.close(), { once: true });
  }
})();
