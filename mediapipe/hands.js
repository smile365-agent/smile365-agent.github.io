/**
 * MediaPipe Hands — assets served from ./vendor (no external CDN).
 */
const VENDOR = {
  drawing: "./vendor/drawing_utils/drawing_utils.js",
  hands: "./vendor/hands/hands.js",
  handsBase: "./vendor/hands/",
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const stage = document.getElementById("stage");
const placeholder = document.getElementById("placeholder");
const startBtn = document.getElementById("start");
const statusEl = document.getElementById("status");
const fpsEl = document.getElementById("fps");
const handsEl = document.getElementById("hands");

let stream = null;
let hands = null;
let running = false;
let lastFpsTs = 0;
let frameCount = 0;
let facingUser = true;
let sendBusy = false;

function setStatus(text, kind = "") {
  statusEl.textContent = text;
  statusEl.className = kind;
}

function mapCameraError(err) {
  const name = err && err.name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "权限被拒绝 — 请在浏览器设置中允许摄像头。Permission denied.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "未找到摄像头设备。No camera found.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "摄像头被占用或无法打开。Camera busy or unavailable.";
  }
  if (!window.isSecureContext && location.hostname !== "localhost") {
    return "需要 HTTPS 才能使用摄像头。HTTPS required for camera.";
  }
  return `摄像头错误：${err && err.message ? err.message : String(err)}`;
}

async function openCamera() {
  setStatus("请求权限… · Requesting permission…");
  const tries = [
    { video: { facingMode: { ideal: "user" } }, audio: false },
    { video: { facingMode: { ideal: "environment" } }, audio: false },
    { video: true, audio: false },
  ];
  let lastErr = null;
  for (const constraints of tries) {
    try {
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      const track = s.getVideoTracks()[0];
      const settings = track.getSettings ? track.getSettings() : {};
      facingUser =
        settings.facingMode === "user" ||
        !settings.facingMode ||
        (constraints.video &&
          constraints.video.facingMode &&
          constraints.video.facingMode.ideal === "user");
      if (!settings.facingMode && !/Mobi|Android/i.test(navigator.userAgent)) {
        facingUser = true;
      }
      return s;
    } catch (err) {
      lastErr = err;
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw err;
      }
    }
  }
  throw lastErr || new Error("getUserMedia failed");
}

function fitCanvas() {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function onResults(results) {
  fitCanvas();
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (results.multiHandLandmarks && window.drawConnectors && window.HAND_CONNECTIONS) {
    for (const landmarks of results.multiHandLandmarks) {
      drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
        color: "#c4a574",
        lineWidth: 2,
      });
      drawLandmarks(ctx, landmarks, {
        color: "#8fbc8f",
        lineWidth: 1,
        radius: 3,
      });
    }
  }
  ctx.restore();

  const n = (results.multiHandLandmarks && results.multiHandLandmarks.length) || 0;
  handsEl.textContent = `手数 ${n}`;

  frameCount += 1;
  const now = performance.now();
  if (now - lastFpsTs >= 1000) {
    fpsEl.textContent = `FPS ${frameCount}`;
    frameCount = 0;
    lastFpsTs = now;
  }
}

async function ensureHands() {
  if (hands) return hands;
  setStatus("加载 MediaPipe… · Loading…");
  await loadScript(VENDOR.drawing);
  await loadScript(VENDOR.hands);
  if (!window.Hands) {
    throw new Error("Hands global missing after script load");
  }
  hands = new Hands({
    locateFile: (file) => VENDOR.handsBase + file,
  });
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });
  hands.onResults(onResults);
  setStatus("模型已就绪 · Model ready", "ok");
  return hands;
}

async function loop() {
  if (!running) return;
  if (video.readyState >= 2 && !sendBusy) {
    sendBusy = true;
    try {
      await hands.send({ image: video });
    } catch (err) {
      console.error(err);
      setStatus(`推理出错：${err.message || err}`, "error");
    } finally {
      sendBusy = false;
    }
  }
  requestAnimationFrame(loop);
}

async function start() {
  startBtn.disabled = true;
  try {
    await ensureHands();
    stream = await openCamera();
    video.srcObject = stream;
    await video.play();
    placeholder.style.display = "none";
    stage.classList.toggle("mirror", facingUser);
    running = true;
    lastFpsTs = performance.now();
    frameCount = 0;
    setStatus("检测中… · Tracking…", "ok");
    startBtn.textContent = "关闭摄像头";
    startBtn.disabled = false;
    loop();
  } catch (err) {
    console.error(err);
    setStatus(mapCameraError(err), "error");
    startBtn.disabled = false;
    stop();
  }
}

function stop() {
  running = false;
  if (stream) {
    for (const t of stream.getTracks()) t.stop();
    stream = null;
  }
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  placeholder.style.display = "";
  stage.classList.remove("mirror");
  startBtn.textContent = "开启摄像头";
  startBtn.disabled = false;
  fpsEl.textContent = "FPS —";
  handsEl.textContent = "手数 —";
  if (!statusEl.classList.contains("error")) {
    setStatus("已停止 · Stopped");
  }
}

startBtn.addEventListener("click", () => {
  if (running) stop();
  else start();
});
