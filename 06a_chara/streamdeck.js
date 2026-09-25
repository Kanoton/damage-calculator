(() => {
  const status = document.createElement('span');
  status.id = 'voice-input-status';
  status.setAttribute('role', 'status');
  status.textContent = '音声オフ';
  const voiceButton = document.createElement('button');
  voiceButton.type = 'button';
  voiceButton.id = 'voice-input-toggle';
  voiceButton.textContent = '🎙 音声オフ';
  voiceButton.setAttribute('aria-pressed', 'false');
  document.querySelector('.role-tabs').append(voiceButton, status);

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let wanted = false;
  const showVoice = (message) => {
    voiceButton.textContent = wanted ? '🎙 音声オン' : '🎙 音声オフ';
    voiceButton.setAttribute('aria-pressed', String(wanted));
    status.textContent = message || (wanted ? '音声入力中' : '音声オフ');
  };
  const select = (selector) => document.querySelector(selector)?.click();
  const actions = {
    voice() {
      if (!Recognition) {
        showVoice('このブラウザは音声認識に対応していません');
        return;
      }
      if (!recognition) {
        recognition = new Recognition();
        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          const text = Array.from(event.results).slice(event.resultIndex)
            .filter(result => result.isFinal)
            .map(result => result[0].transcript).join(' ').trim();
          if (!text) return;
          showVoice('認識: ' + text);
          if (/出現モンスター/.test(text)) actions.monsters();
          else if (/ミッション|イベント/.test(text)) actions.missions();
          else if (/攻撃/.test(text)) actions.attack();
          else if (/防御/.test(text)) actions.defense();
          else if (/チップ/.test(text)) actions.chips();
        };
        recognition.onerror = (event) => {
          if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
            wanted = false;
            showVoice('マイクを利用できません。ブラウザの許可を確認してください');
          }
        };
        recognition.onend = () => {
          if (wanted) setTimeout(() => {
            if (wanted) try { recognition.start(); } catch (_) { wanted = false; showVoice(); }
          }, 300);
        };
      }
      wanted = !wanted;
      if (wanted) {
        try { recognition.start(); showVoice(); }
        catch (_) { wanted = false; showVoice('音声認識を開始できませんでした'); }
      } else {
        recognition.stop();
        showVoice();
      }
    },
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
  voiceButton.addEventListener('click', actions.voice);

  // The Stream Deck plugin publishes key presses over a localhost SSE bridge.
  if (typeof EventSource !== 'undefined') {
    const source = new EventSource('http://127.0.0.1:17371/events');
    source.onmessage = (event) => {
      try {
        const action = JSON.parse(event.data).action;
        if (Object.hasOwn(actions, action)) actions[action]();
      } catch (_) { /* Ignore malformed bridge messages. */ }
    };
    window.addEventListener('pagehide', () => source.close(), { once: true });
  }
})();
