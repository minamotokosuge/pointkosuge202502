/**
 * Point Collector PWA (HID QR reader version)
 * Replace YOUR_WEBAPP_URL_HERE with your Apps Script WebApp URL.
 */
// ここを、デプロイしたGoogle Apps Script WebアプリのURLに正確に書き換えてください。
// 例: 'https://script.google.com/macros/s/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec'
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyqrFUFjrQSc4fftNGIHprCMJ78EhDp_B1XMk4nQpZKRtrZ0LPnsNM8QpDiCppC8S4M/exec'; // ★ここを書き換える

// ローカルストレージから店舗IDと付与ポイント数を取得。なければプロンプトで入力。
const storeId = localStorage.getItem('storeId') || prompt('店舗IDを入力してください');
localStorage.setItem('storeId', storeId); // ローカルストレージに保存
const pointValue = localStorage.getItem('point') || prompt('付与ポイント数を入力してください');
localStorage.setItem('point', pointValue); // ローカルストレージに保存

// 送信するトランザクションキューをローカルストレージからロード。なければ空の配列。
let txQueue = JSON.parse(localStorage.getItem('txQueue') || '[]');

// 隠し入力フィールドにフォーカスを設定し、QRリーダーからの入力をキャプチャ
const hidInput = document.getElementById('hidInput');
hidInput.focus();

let buffer = ''; // QRリーダーからの入力バッファ
// キーボードイベントリスナー
document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter') { // Enterキーが押されたら、バッファの内容を処理
    const memberId = buffer.trim();
    buffer = ''; // バッファをクリア
    hidInput.value = ''; // 隠し入力フィールドもクリア
    processScan(memberId); // メンバーIDを処理する関数を呼び出し
  } else {
    buffer += ev.key; // Enterキー以外はバッファに追加
  }
});

/**
 * スキャンされたメンバーIDを処理します。
 * @param {string} memberId - スキャンされたメンバーID。
 */
function processScan(memberId) {
  // メンバーIDが14桁の数字でない場合はエラー
  if (!/^[0-9]{14}$/.test(memberId)) {
    updateStatus('読み取り失敗: ' + memberId, true); // エラーメッセージ表示
    return;
  }
  enqueueTransaction(memberId); // トランザクションをキューに追加
  updateStatus('読み取りました！<br>' + memberId, false); // 成功メッセージ表示
}

/**
 * トランザクションをキューに追加し、ローカルストレージに保存します。
 * @param {string} memberId - メンバーID。
 */
function enqueueTransaction(memberId) {
  txQueue.push({
    memberId,
    timestamp: new Date().toISOString(), // 現在のタイムスタンプ
    storeId,   // 設定済みの店舗ID
    point: pointValue // 設定済みの付与ポイント数
  });
  localStorage.setItem('txQueue', JSON.stringify(txQueue)); // キューをローカルストレージに保存
  trySync(); // 同期を試行
}

/**
 * ステータスメッセージを更新します。
 * @param {string} msg - 表示するメッセージ。
 * @param {boolean} isError - エラーメッセージの場合はtrue。
 */
function updateStatus(msg, isError) {
  const st = document.getElementById('status');
  st.innerHTML = msg; // メッセージを表示
  st.style.color = isError ? 'red' : 'limegreen'; // エラーなら赤、成功なら緑
  setTimeout(() => {
    st.innerHTML = 'Ready'; // 1.5秒後に「Ready」に戻す
    st.style.color = ''; // 色をリセット
    hidInput.focus(); // 隠し入力フィールドにフォーカスを戻す
  }, 1500);
}

/**
 * トランザクションキューをWebアプリに同期しようと試みます。
 */
function trySync() {
  if (!navigator.onLine) { // オフラインの場合は同期しない
    updateStatus('オフラインです。再接続後に自動同期されます。', true);
    return;
  }
  if (txQueue.length === 0) { // キューが空の場合は同期しない
    updateStatus('同期するデータがありません。', false);
    return;
  }

  updateStatus('同期中...', false); // 同期中メッセージを表示

  fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions: txQueue }) // キューの内容をJSONとして送信
  })
    .then(res => {
      if (!res.ok) { // HTTPステータスコードが200番台以外の場合
        throw new Error(`HTTPエラー: ${res.status} ${res.statusText}`);
      }
      return res.json(); // JSONとしてパース
    })
    .then(json => {
      if (json.ok) { // サーバーからの応答が成功の場合
        txQueue = []; // キューをクリア
        localStorage.setItem('txQueue', JSON.stringify(txQueue)); // ローカルストレージもクリア
        updateStatus('同期完了 (' + json.inserted + '件)', false); // 成功メッセージと件数を表示
      } else {
        // サーバーからの応答がエラーの場合
        updateStatus('同期エラー: ' + (json.error || '不明なエラー'), true);
      }
    })
    .catch(err => {
      // ネットワークエラーなどfetch自体が失敗した場合
      console.error('Fetch失敗:', err); // 開発者ツールにも出力
      updateStatus('同期失敗: ' + err.message, true); // 画面に表示
    });
}

// 「今すぐ同期」ボタンのクリックイベントリスナー
document.getElementById('sync').addEventListener('click', trySync);
// オンラインになったら自動で同期を試行
window.addEventListener('online', trySync);
