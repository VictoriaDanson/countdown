const canvas = document.getElementById('constellationCanvas');
const ctx = canvas.getContext('2d');
let width, height;
let nodes = [];
const LINK = 160;
const MAX_NODES = window.innerWidth < 768 ? 40 : 85;
let pointer = { x: -1000, y: -1000 };

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

window.addEventListener('resize', () => {
  resize();
  initNodes();
});
resize();

function initNodes() {
  nodes = [];
  for (let i = 0; i < MAX_NODES; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 2.4 + 1.8
    });
  }
}
initNodes();

document.addEventListener('mousemove', e => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

document.addEventListener('mouseleave', () => {
  pointer.x = -1000;
  pointer.y = -1000;
});

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function animateCanvas() {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  ctx.strokeStyle = '#1f9d55';
  ctx.lineWidth = 1;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = dist(nodes[i], nodes[j]);
      if (d < LINK) {
        ctx.globalAlpha = 0.18 + (1 - d / LINK) * 0.4;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
  }

  nodes.forEach(node => {
    node.x += node.vx;
    node.y += node.vy;

    if (node.x < 0 || node.x > width) node.vx *= -1;
    if (node.y < 0 || node.y > height) node.vy *= -1;

    const pd = dist(node, pointer);
    if (pd < 220) {
      node.x -= (node.x - pointer.x) * 0.005;
      node.y -= (node.y - pointer.y) * 0.005;
    }

    const pulse = 0.78 + Math.sin(Date.now() * 0.001 + node.x) * 0.22;
    ctx.fillStyle = '#1f9d55';
    ctx.globalAlpha = pulse * 0.25;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 1;
  requestAnimationFrame(animateCanvas);
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion) {
  animateCanvas();
}
