/**
 * Point Collector PWA (HID QR reader version)
 * Replace YOUR_WEBAPP_URL_HERE with your Apps Script WebApp URL.
 */
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbw8qFB1pGBWSJ0PfivcfY2IGsyZTKCFWoUplCTifm2utL9GvUweigCoy3rqGkPxueUCmA/exec';   // ★ここを書き換える
const storeId   = localStorage.getItem('storeId') || prompt('店舗IDを入力してください');
localStorage.setItem('storeId', storeId);
const pointValue = localStorage.getItem('point') || prompt('付与ポイント数を入力してください');
localStorage.setItem('point', pointValue);

let txQueue = JSON.parse(localStorage.getItem('txQueue') || '[]');

// Set focus on hidden input to capture keyboard wedge data
const hidInput = document.getElementById('hidInput');
hidInput.focus();

let buffer = '';
document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter') {
    const memberId = buffer.trim();
    buffer = '';
    hidInput.value = '';
    processScan(memberId);
  } else {
    buffer += ev.key;
  }
});

function processScan(memberId) {
  if(!/^[0-9]{14}$/.test(memberId)) {
    updateStatus('読み取り失敗: ' + memberId, true);
    return;
  }
  enqueueTransaction(memberId);
  updateStatus('読み取りました！<br>' + memberId, false);
}

function enqueueTransaction(memberId) {
  txQueue.push({
    memberId,
    timestamp: new Date().toISOString(),
    storeId,
    point: pointValue
  });
  localStorage.setItem('txQueue', JSON.stringify(txQueue));
  trySync();
}

function updateStatus(msg, isError) {
  const st = document.getElementById('status');
  st.innerHTML = msg;
  st.style.color = isError ? 'red' : 'limegreen';
  setTimeout(() => {
    st.innerHTML = 'Ready';
    st.style.color = '';
    hidInput.focus();
  }, 1500);
}

function trySync() {
  if(!navigator.onLine) return;
  if(txQueue.length === 0) return;

  fetch(WEBAPP_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({transactions: txQueue})
  })
  .then(res => res.json())
  .then(json => {
    if(json.ok) {
      txQueue = [];
      localStorage.setItem('txQueue', JSON.stringify(txQueue));
      updateStatus('同期完了 (' + json.inserted + ')', false);
    } else {
      updateStatus('同期エラー', true);
    }
  })
.catch(err => {
  console.error(err);                               // ← 開発者ツールにも出力
  updateStatus('同期失敗: ' + err.message, true);   // ← 画面に表示
});
}

document.getElementById('sync').addEventListener('click', trySync);
window.addEventListener('online', trySync);
