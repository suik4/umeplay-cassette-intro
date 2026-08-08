const experience = document.querySelector("#experience");
const cassette = document.querySelector("#cassette");
const slot = document.querySelector("#slot");
const mediaVideo = document.querySelector("#mediaVideo");
const mediaStill = document.querySelector("#mediaStill");
const narrationText = document.querySelector("#narrationText");
const skipButton = document.querySelector("#skipButton");
const replayButton = document.querySelector("#replayButton");
const stateText = document.querySelector("#stateText");
const timecode = document.querySelector("#timecode");
const liveRegion = document.querySelector("#liveRegion");
const flash = document.querySelector(".flash");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
// 런타임에 조립하는 경로는 Vite가 다시 쓰지 않으므로 base를 직접 붙인다.
const asset = (name) => `${import.meta.env.BASE_URL}assets/${name}`;
const frames = [
  asset("slide1-optimized.jpg"),
  asset("reviver-hospital.png"),
  asset("insane.jpg"),
];
const lines = [
  "저장매체는 모든 시야를 담지 못한다.",
  "기록된 시점에는 누락과 오류가 있다.",
  "당신은 그 시점에 있었던 인물이 된다.",
];

let dragging = false;
let running = false;
let startPoint = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };
let timers = [];
let ticker = null;
let startedAt = 0;

function schedule(callback, delay) {
  const timer = window.setTimeout(callback, delay);
  timers.push(timer);
  return timer;
}

function clearTimers() {
  timers.forEach(window.clearTimeout);
  timers = [];
  window.clearInterval(ticker);
  ticker = null;
}

function announce(message) {
  liveRegion.textContent = "";
  schedule(() => {
    liveRegion.textContent = message;
  }, 10);
}

function showLine(text) {
  narrationText.classList.remove("is-visible");
  schedule(() => {
    narrationText.textContent = text;
    narrationText.classList.add("is-visible");
    announce(text);
  }, 160);
}

function hideLine() {
  narrationText.classList.remove("is-visible");
}

function showFrame(source, duration) {
  mediaStill.src = source;
  mediaStill.style.opacity = "1";
  flash.animate(
    [{ opacity: 0 }, { opacity: 0.28 }, { opacity: 0 }],
    { duration: 120, easing: "steps(2, end)" },
  );
  schedule(() => {
    if (!experience.classList.contains("is-result")) {
      mediaStill.style.opacity = "0";
    }
  }, duration);
}

function startTimecode() {
  startedAt = performance.now();
  ticker = window.setInterval(() => {
    const elapsed = Math.floor((performance.now() - startedAt) / 10);
    const seconds = String(Math.floor(elapsed / 100)).padStart(2, "0");
    const framesValue = String(elapsed % 100).padStart(2, "0");
    timecode.textContent = `00:00:${seconds}:${framesValue}`;
  }, 50);
}

function playInsertSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.075, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
    gain.connect(context.destination);

    const oscillator = context.createOscillator();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(84, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(32, context.currentTime + 0.18);
    oscillator.connect(gain);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.21);
    schedule(() => context.close(), 800);
  } catch {
    // The visual sequence remains usable if audio is blocked.
  }
}

function revealInsane() {
  clearTimers();
  hideLine();
  mediaVideo.pause();
  mediaStill.src = asset("insane.jpg");
  mediaStill.style.opacity = "";
  experience.classList.add("is-result");
  stateText.textContent = "RECORD 001";
  timecode.textContent = "INSANE";
  announce("INSANE 기록을 찾았습니다.");
}

function insertTape() {
  if (running) return;
  running = true;
  clearTimers();
  playInsertSound();
  experience.classList.remove("is-drop-ready");
  experience.classList.add("is-inserting");
  cassette.style.transform = "";
  stateText.textContent = "LOADING";
  announce("카세트를 인식했습니다.");

  if (reduceMotion.matches) {
    schedule(revealInsane, 500);
    return;
  }

  schedule(() => {
    experience.classList.add("is-playing");
    stateText.textContent = "PLAY";
    mediaVideo.currentTime = 0;
    mediaVideo.play().catch(() => {});
    startTimecode();
  }, 650);

  schedule(() => showLine(lines[0]), 920);
  schedule(() => showFrame(frames[0], 220), 1380);
  schedule(hideLine, 1720);
  schedule(() => showFrame(frames[2], 300), 1880);
  schedule(() => showLine(lines[1]), 2180);
  schedule(() => showFrame(frames[1], 360), 2660);
  schedule(hideLine, 3000);
  schedule(() => showLine(lines[2]), 3220);
  schedule(() => showFrame(frames[2], 460), 3660);
  schedule(revealInsane, 4380);
}

function reset() {
  clearTimers();
  dragging = false;
  running = false;
  offset = { x: 0, y: 0 };
  // 다시 재생할 때는 인트로 커튼을 반복하지 않고 바로 조작 가능한 상태로 둔다.
  experience.className = "experience is-revealed";
  cassette.className = "cassette";
  cassette.style.transform = "";
  mediaVideo.pause();
  mediaVideo.currentTime = 0;
  mediaStill.removeAttribute("src");
  mediaStill.style.opacity = "";
  narrationText.textContent = "";
  narrationText.classList.remove("is-visible");
  stateText.textContent = "NO MEDIA";
  timecode.textContent = "00:00:00";
  announce("카세트를 위로 밀어 기록을 재생하십시오.");
}

function distanceToSlot() {
  const tapeRect = cassette.getBoundingClientRect();
  const slotRect = slot.getBoundingClientRect();
  const tapeCenter = {
    x: tapeRect.left + tapeRect.width / 2,
    y: tapeRect.top + tapeRect.height * 0.2,
  };
  const slotCenter = {
    x: slotRect.left + slotRect.width / 2,
    y: slotRect.top + slotRect.height / 2,
  };
  return Math.hypot(tapeCenter.x - slotCenter.x, tapeCenter.y - slotCenter.y);
}

function onPointerDown(event) {
  if (running) return;
  dragging = true;
  startPoint = { x: event.clientX, y: event.clientY };
  offset = { x: 0, y: 0 };
  cassette.setPointerCapture(event.pointerId);
  cassette.classList.add("is-dragging");
}

function onPointerMove(event) {
  if (!dragging || running) return;
  offset = {
    x: event.clientX - startPoint.x,
    y: event.clientY - startPoint.y,
  };
  const rotation = Math.max(-5, Math.min(5, offset.x / 50));
  cassette.style.transform = `translate3d(calc(-50% + ${offset.x}px), ${offset.y}px, 0) rotate(${rotation}deg)`;
  experience.classList.toggle("is-drop-ready", distanceToSlot() < 150);
}

function onPointerUp(event) {
  if (!dragging || running) return;
  dragging = false;
  cassette.releasePointerCapture(event.pointerId);
  cassette.classList.remove("is-dragging");
  const movement = Math.hypot(offset.x, offset.y);
  // 탭은 그대로 넣고, 드래그는 '위로 미는' 동작일 때만 삽입한다.
  // 아래로 끌어당겼는데 삽입되면 물체를 다루는 느낌이 깨진다.
  const pushedUp = offset.y < -60;
  const nearSlot = distanceToSlot() < 140 && offset.y < 0;
  const shouldInsert = movement < 8 || pushedUp || nearSlot;

  if (shouldInsert) {
    insertTape();
    return;
  }

  experience.classList.remove("is-drop-ready");
  const animation = cassette.animate(
    [
      { transform: cassette.style.transform },
      { transform: "translateX(-50%) rotate(-1.5deg)" },
    ],
    { duration: 460, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  );
  animation.onfinish = () => {
    cassette.style.transform = "";
  };
}

cassette.addEventListener("pointerdown", onPointerDown);
cassette.addEventListener("pointermove", onPointerMove);
cassette.addEventListener("pointerup", onPointerUp);
cassette.addEventListener("pointercancel", onPointerUp);
cassette.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    insertTape();
  }
});

skipButton.addEventListener("click", revealInsane);
replayButton.addEventListener("click", reset);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) mediaVideo.pause();
});

// 검은 화면 위 테이프 한 장 → 화면이 위아래로 갈라지며 재생기가 드러난다 → 삽입.
function openCurtain() {
  if (experience.classList.contains("is-revealed")) return;
  experience.classList.add("is-revealed");
  announce("재생기가 열렸습니다. 카세트를 위로 밀어 기록을 재생하십시오.");
}

if (reduceMotion.matches) {
  openCurtain();
} else {
  window.setTimeout(openCurtain, 1000);
}
