// speech.js
export let lastGlobalTrigger = 0;

export function speak(text){
  const now = Date.now();
  const globalCd = parseInt(document.getElementById('globalCooldown').value) || 500;
  if(now - lastGlobalTrigger < globalCd) return;
  lastGlobalTrigger = now;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "id-ID";
  speechSynthesis.cancel(); // kurangi tumpukan suara
  speechSynthesis.speak(utter);

  showBubble(text);
}

// bubble visual
function showBubble(text){
  const bubbleArea = document.getElementById('bubbleArea');
  bubbleArea.innerHTML = `<div class="bubble">🤖 ${escapeHtml(text)}</div>`;
  setTimeout(()=>{ bubbleArea.innerHTML=''; }, 3000);
}

// escape HTML
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>'&#'+c.charCodeAt(0)+';');
}
