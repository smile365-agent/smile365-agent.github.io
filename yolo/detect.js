/**
 * YOLOv8n browser inference helpers:
 * letterbox preprocess, decode [1,84,8400], JS NMS, canvas draw.
 */
import { labelText } from "./labels.js";

export const INPUT_SIZE = 640;
export const SCORE_THRESH = 0.45;
export const IOU_THRESH = 0.45;
export const MAX_DETECTIONS = 50;

const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/Hyuto/yolov8-onnxruntime-web@master/public/model/yolov8n.onnx";

/** Letterbox video/image frame onto 640×640 with gray pad (114). */
export function letterbox(source, size = INPUT_SIZE) {
  const sw = source.videoWidth || source.width;
  const sh = source.videoHeight || source.height;
  const scale = Math.min(size / sw, size / sh);
  const nw = Math.round(sw * scale);
  const nh = Math.round(sh * scale);
  const padX = Math.floor((size - nw) / 2);
  const padY = Math.floor((size - nh) / 2);

  const canvas = letterbox._canvas || (letterbox._canvas = document.createElement("canvas"));
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(source, padX, padY, nw, nh);

  const { data } = ctx.getImageData(0, 0, size, size);
  const plane = size * size;
  const tensor = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const j = i * 4;
    tensor[i] = data[j] / 255;
    tensor[plane + i] = data[j + 1] / 255;
    tensor[2 * plane + i] = data[j + 2] / 255;
  }

  return { tensor, scale, padX, padY, srcW: sw, srcH: sh };
}

function iou(a, b) {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  return inter / (areaA + areaB - inter + 1e-6);
}

/** Class-aware NMS on decoded boxes. */
export function nms(boxes, iouThresh = IOU_THRESH, maxDet = MAX_DETECTIONS) {
  const byClass = new Map();
  for (const b of boxes) {
    if (!byClass.has(b.classId)) byClass.set(b.classId, []);
    byClass.get(b.classId).push(b);
  }
  const kept = [];
  for (const group of byClass.values()) {
    group.sort((a, b) => b.score - a.score);
    const selected = [];
    for (const cand of group) {
      let ok = true;
      for (const s of selected) {
        if (iou(cand, s) > iouThresh) {
          ok = false;
          break;
        }
      }
      if (ok) selected.push(cand);
      if (selected.length >= maxDet) break;
    }
    kept.push(...selected);
  }
  kept.sort((a, b) => b.score - a.score);
  return kept.slice(0, maxDet);
}

/**
 * Decode YOLOv8 output [1, 84, 8400] → boxes in source image coords.
 * Channels 0–3: cx, cy, w, h (letterbox space); 4–83: class scores.
 */
export function decodeOutput(output, meta, scoreThresh = SCORE_THRESH) {
  const data = output.data;
  const dims = output.dims; // [1, 84, 8400]
  const numAttrs = dims[1]; // 84
  const numAnchors = dims[2]; // 8400
  const numClasses = numAttrs - 4;
  const { scale, padX, padY, srcW, srcH } = meta;
  const boxes = [];

  for (let i = 0; i < numAnchors; i++) {
    let bestScore = 0;
    let bestCls = 0;
    for (let c = 0; c < numClasses; c++) {
      const s = data[(4 + c) * numAnchors + i];
      if (s > bestScore) {
        bestScore = s;
        bestCls = c;
      }
    }
    if (bestScore < scoreThresh) continue;

    const cx = data[0 * numAnchors + i];
    const cy = data[1 * numAnchors + i];
    const w = data[2 * numAnchors + i];
    const h = data[3 * numAnchors + i];

    let x1 = (cx - w / 2 - padX) / scale;
    let y1 = (cy - h / 2 - padY) / scale;
    let x2 = (cx + w / 2 - padX) / scale;
    let y2 = (cy + h / 2 - padY) / scale;

    x1 = Math.max(0, Math.min(srcW, x1));
    y1 = Math.max(0, Math.min(srcH, y1));
    x2 = Math.max(0, Math.min(srcW, x2));
    y2 = Math.max(0, Math.min(srcH, y2));

    if (x2 <= x1 || y2 <= y1) continue;

    boxes.push({ x1, y1, x2, y2, score: bestScore, classId: bestCls });
  }
  return boxes;
}

export function drawDetections(canvas, video, detections, mirror = false) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);

  // Video may be CSS-mirrored; flip box X so overlays match, keep text readable.
  for (const det of detections) {
    let { x1, y1, x2, y2, score, classId } = det;
    if (mirror) {
      const nx1 = w - x2;
      const nx2 = w - x1;
      x1 = nx1;
      x2 = nx2;
    }
    const bw = x2 - x1;
    const bh = y2 - y1;
    ctx.strokeStyle = "#c4a574";
    ctx.lineWidth = Math.max(2, Math.round(w / 320));
    ctx.strokeRect(x1, y1, bw, bh);

    const label = `${labelText(classId)} ${(score * 100).toFixed(0)}%`;
    ctx.font = `600 ${Math.max(12, Math.round(w / 40))}px "Segoe UI", "PingFang SC", "Noto Sans SC", sans-serif`;
    const tw = ctx.measureText(label).width;
    const th = Math.max(16, Math.round(w / 36));
    const labelX = x1;
    const labelY = Math.max(0, y1 - th - 2);
    ctx.fillStyle = "rgba(14, 12, 10, 0.85)";
    ctx.fillRect(labelX, labelY, tw + 10, th + 4);
    ctx.fillStyle = "#e8dcc8";
    ctx.fillText(label, labelX + 5, labelY + th - 2);
  }
}

export async function loadYoloSession(ort) {
  const session = await ort.InferenceSession.create(MODEL_URL, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  return session;
}

export async function runDetect(session, ort, source) {
  const meta = letterbox(source);
  const input = new ort.Tensor("float32", meta.tensor, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const feeds = {};
  const inputName = session.inputNames[0];
  feeds[inputName] = input;
  const results = await session.run(feeds);
  const output = results[session.outputNames[0]];
  const raw = decodeOutput(output, meta);
  return nms(raw);
}

export { MODEL_URL };
