// face.js
import { speak } from './speech.js'; // pastikan speech.js ada dengan fungsi speak(text)

const faceCooldownInput = document.getElementById('faceCooldown');
const statusEl = document.getElementById('status');

export let lastFaceTrigger = 0;

// Thresholds (bisa disesuaikan)
const FACE_YAWN_THRESHOLD = 0.055;
const FACE_SLEEP_THRESHOLD = 0.015;
const FACE_SAD_THRESHOLD = 0.02;

// Face metrics helper
export function faceMetrics(landmarks){
  const upperLip = landmarks[13];
  const lowerLip = landmarks[14];
  const mouthOpen = Math.hypot((upperLip.x-lowerLip.x), (upperLip.y-lowerLip.y));

  const leftTop = landmarks[159], leftBottom = landmarks[145];
  const rightTop = landmarks[386], rightBottom = landmarks[374];
  const leftEye = Math.hypot(leftTop.x-leftBottom.x, leftTop.y-leftBottom.y);
  const rightEye = Math.hypot(rightTop.x-rightBottom.x, rightTop.y-rightBottom.y);

  const leftBrow = landmarks[65], rightBrow = landmarks[295];
  const leftFrown = Math.hypot(leftBrow.x-leftTop.x, leftBrow.y-leftTop.y);
  const rightFrown = Math.hypot(rightBrow.x-rightTop.x, rightBrow.y-rightTop.y);

  return { mouthOpen, leftEye, rightEye, leftFrown, rightFrown };
}

// Face results handler
export function onFaceResults(results){
  if(results.multiFaceLandmarks && results.multiFaceLandmarks.length>0){
    const face = results.multiFaceLandmarks[0];
    // Optional: draw mesh lightly
    if(window.drawConnectors) window.drawConnectors(window.ctx, face, window.FACEMESH_TESSELATION, {color:'#ffffff22', lineWidth:1});
    const m = faceMetrics(face);
    const now = Date.now();
    const faceCd = parseInt(faceCooldownInput.value) || 3000;

    // Yawn detection
    if(m.mouthOpen > FACE_YAWN_THRESHOLD){
      if(now - lastFaceTrigger > faceCd){
        lastFaceTrigger = now;
        speak('Kamu kelihatan menguap, istirahat dulu ya');
        statusEl.innerText = '😮 Terlihat menguap';
      }
      return;
    }

    // Sleepy detection
    if(m.leftEye < FACE_SLEEP_THRESHOLD && m.rightEye < FACE_SLEEP_THRESHOLD){
      if(now - lastFaceTrigger > faceCd){
        lastFaceTrigger = now;
        speak('Kamu mengantuk, jangan dipaksa ya');
        statusEl.innerText = '😴 Terlihat mengantuk';
      }
      return;
    }

    // Sad detection
    if(m.leftFrown < FACE_SAD_THRESHOLD || m.rightFrown < FACE_SAD_THRESHOLD){
      if(now - lastFaceTrigger > faceCd){
        lastFaceTrigger = now;
        speak('Kamu kelihatan sedih, semoga harimu segera membaik');
        statusEl.innerText = '😔 Terlihat sedih/murung';
      }
      return;
    }
  }
}
