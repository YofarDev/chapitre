const canvas = document.getElementById("matrixCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const characters = latin.split("");

const fontSize = 16;
let columns = Math.floor(canvas.width / fontSize);

const streamLength = 25;
const fallSpeed = 0.2;

const drops = [];

function initializeDrops() {
  drops.length = 0;
  for (let x = 0; x < columns; x++) {
    drops[x] = Math.floor(Math.random() * -streamLength);
  }
}

initializeDrops();

const themeAccentColor =
  getComputedStyle(document.documentElement)
    .getPropertyValue("--accent-color")
    .trim() || "#8b5e3c";

const themeHeadColor = "#FFFFFF";

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = fontSize + "px monospace";

  for (let i = 0; i < drops.length; i++) {
    for (let j = 0; j < streamLength; j++) {
      const currentRow = drops[i] - j;

      const yPos = currentRow * fontSize;
      const xPos = i * fontSize;

      if (yPos >= -fontSize && yPos < canvas.height + fontSize) {
        const text = characters[Math.floor(Math.random() * characters.length)];

        ctx.fillStyle = themeAccentColor;

        const alpha = 1.0 - j / streamLength;
        ctx.globalAlpha = alpha * 0.7;

        ctx.fillText(text, xPos, yPos);
      }
    }

    drops[i] += fallSpeed;

    if (drops[i] * fontSize > canvas.height) {
      drops[i] = Math.floor(Math.random() * -streamLength);
    }
  }

  ctx.globalAlpha = 1.0;
}

let animationId;
let isAnimating = false;

function animate() {
  if (!isAnimating) return;
  draw();
  animationId = requestAnimationFrame(animate);
}

function handleResize() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  columns = Math.floor(canvas.width / fontSize);

  initializeDrops();

  if (isAnimating) {
    animate();
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

window.startMatrix = function () {
  if (!isAnimating) {
    isAnimating = true;

    animate();
  }
};

window.stopMatrix = function () {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  isAnimating = false;
};

window.addEventListener("resize", handleResize);
