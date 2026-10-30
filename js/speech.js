// 音声認識で「ありがとう」を数える。
// continuous を使うと Android Chrome で同じ文が重複して届くことがあるため、
// 1フレーズずつ認識して終わるたびに自動で再開する方式にしている。

const PATTERN = /ありがと|有難う|有り難う|有難と|アリガト|サンキュ/g;

export function countArigato(text) {
  return (text.match(PATTERN) || []).length;
}

export function isSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * @param {{ onCount:(n:number, text:string)=>void, onHeard:(text:string, final:boolean)=>void,
 *           onState:(state:'listening'|'stopped', reason?:string)=>void }} handlers
 */
export function createListener({ onCount, onHeard, onState }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  let rec = null;
  let active = false;
  let failures = [];

  function stop(reason) {
    active = false;
    if (rec) {
      rec.onend = null;
      try { rec.abort(); } catch { /* 既に止まっている */ }
      rec = null;
    }
    onState('stopped', reason);
  }

  function spawn() {
    rec = new SR();
    rec.lang = 'ja-JP';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        onHeard(text, r.isFinal);
        if (r.isFinal) {
          const n = countArigato(text);
          if (n > 0) onCount(n, text);
        }
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        stop('マイクの使用が許可されていません。ブラウザやOSの設定でマイクを許可してください。');
      } else if (e.error === 'network') {
        stop('音声認識にはインターネット接続が必要です。オフラインのときはタップで数えてください。');
      } else if (e.error === 'audio-capture') {
        stop('マイクが見つかりませんでした。');
      }
    };

    // 1フレーズ終わるたびに再開。短時間に何度も落ちるときは止める
    rec.onend = () => {
      if (!active) return;
      const now = Date.now();
      failures = failures.filter((t) => now - t < 4000);
      failures.push(now);
      if (failures.length > 8) {
        stop('聞き取りが不安定なため止めました。もう一度ボタンを押してください。');
        return;
      }
      try {
        rec.start();
      } catch {
        setTimeout(() => active && spawn(), 300);
      }
    };

    rec.start();
  }

  return {
    get active() { return active; },
    start() {
      if (active) return;
      active = true;
      failures = [];
      try {
        spawn();
        onState('listening');
      } catch {
        stop('聞き取りを開始できませんでした。');
      }
    },
    stop: () => stop(),
  };
}
