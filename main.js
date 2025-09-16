// main.js
import { Hands } from 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
import { FaceMesh } from 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
import { Camera } from 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
import { templates, recording, recordFrames, normalizeLandmarks, averageFrames, compareTemplates, renderTemplates } from './gesture.js';
import { onFaceResults, lastFaceTrigger } from './face.js';
import { speak } from './speech.js'; // pastikan ada speech.js

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const btnCamera = document.getElementById('btnCamera');
const btnFullscreen = document.getElementById('btnFullscreen');
const btnSnapshot = document.getElementById('btnSnapshot');
const statusEl = document.getElementById('status');

let hands = null;
let faceMesh = null;
let cameraObj = null;
let lastGlobalTrigger = 0;

// Highlight flash
function flashHighlight(){
  const vb = document.getElementById('videoWrap');
  vb.classList.add('highlight');
  setTimeout(()=>vb.classList.remove('highlight'), 420);
}

// Hands detection callback
function onHandsResults(results){
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.save();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  if(results.multiHandLandmarks && results.multiHandLandmarks.length>0){
    results.multiHandLandmarks.forEach((lm, idx)=>{
      const color = idx===0 ? '#00ffb3' : '#66d9ff';
      if(window.drawConnectors) window.drawConnectors(ctx, lm, window.HAND_CONNECTIONS, {color:color, lineWidth:3});
      if(window.drawLandmarks) window.drawLandmarks(ctx, lm, {color:'#ffd600', lineWidth:2, radius:3});

      statusEl.innerText = `👀 ${results.multiHandLandmarks.length} tangan terdeteksi`;

      const simple = lm.map(p=>({x:p.x, y:p.y}));

      // Recording
      if(recording){
        recordFrames.push(simple);
        const count = recordFrames.length;
        if(count >= 18){ // RECORD_FRAME_COUNT
          statusEl.innerText = '✅ Rekaman selesai. Klik Simpan Gestur.';
        } else {
          statusEl.innerText = `⏺️ Merekam... (${count}/18)`;
        }
      } else {
        // Recognition
        if(templates.length>0){
          const normCurrent = normalizeLandmarks(simple);
          let best=null, bestDist=Infinity;
          for(const t of templates){
            const d = compareTemplates(t.landmarks, normCurrent);
            if(d < bestDist){ bestDist = d; best = t; }
          }
          const threshold = parseFloat(document.getElementById('sensitivity').value) || 3.0;
          if(best && bestDist < threshold){
            const now = Date.now();
            const tcd = best.cooldown || 2500;
            if(!best.lastTriggered) best.lastTriggered = 0;
            if(now - best.lastTriggered > tcd){
              best.lastTriggered = now;
              flashHighlight();
              speak(best.response);
              statusEl.innerText = `✅ Gesture "${best.name}" terdeteksi (score ${bestDist.toFixed(2)})`;
            } else {
              statusEl.innerText = `🔒 Gesture "${best.name}" cocok tetapi on cooldown`;
            }
          }
        }
      }
    });
  } else {
    statusEl.innerText = '👀 Tidak ada tangan';
  }

  // Face detection
  if(faceMesh) onFaceResults({ multiFaceLandmarks: faceMesh.lastResults?.multiFaceLandmarks });
  ctx.restore();
}

// Camera start/stop
async function startCamera(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{width:1280,height:720}, audio:false});
    video.srcObject = stream;
    await video.play();
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;

    cameraObj = new Camera(video, {
      onFrame: async () => {
        if(hands) await hands.send({image: video});
        if(faceMesh) await faceMesh.send({image: video});
      },
      width: video.videoWidth,
      height: video.videoHeight
    });
    cameraObj.start();
    btnCamera.innerText = 'Stop Camera';
    statusEl.innerText = '✅ Kamera berjalan';
  }catch(err){
    console.error(err); alert('Gagal akses kamera: ' + err.message);
    statusEl.innerText = '❌ Gagal akses kamera';
  }
}

function stopCamera(){
  if(cameraObj){ cameraObj.stop(); cameraObj = null; }
  if(video.srcObject){ video.srcObject.getTracks().forEach(t=>t.stop()); video.srcObject=null; }
  btnCamera.innerText = 'Start Camera';
  statusEl.innerText = 'Kamera dihentikan';
}

btnCamera.onclick = ()=> { if(!cameraObj) startCamera(); else stopCamera(); };

// Snapshot
btnSnapshot.onclick = ()=>{
  const temp = document.createElement('canvas'); temp.width = canvas.width; temp.height = canvas.height;
  const tctx = temp.getContext('2d');
  tctx.save(); tctx.scale(-1,1); tctx.drawImage(video, -temp.width, 0, temp.width, temp.height); tctx.restore();
  tctx.drawImage(canvas, 0, 0, temp.width, temp.height);
  temp.toBlob(blob=>{
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download='snapshot.png'; a.click();
  }, 'image/png', 0.95);
};

// Fullscreen
btnFullscreen.onclick = async ()=>{
  const el = document.getElementById('videoWrap');
  try{
    if(!document.fullscreenElement) await el.requestFullscreen();
    else await document.exitFullscreen();
  }catch(e){ console.warn('Fullscreen error', e); }
};

// MediaPipe init
hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.6 });
hands.onResults(onHandsResults);

faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.7, minTrackingConfidence: 0.6 });
faceMesh.onResults(onFaceResults);

// Init
renderTemplates();
