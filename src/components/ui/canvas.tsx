interface LineOptions {
  spring: number;
}

class NodeItem {
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
}

class Line {
  spring: number;
  friction: number;
  nodes: NodeItem[];

  constructor(e: LineOptions) {
    this.spring = e.spring + 0.1 * Math.random() - 0.05;
    this.friction = E.friction + 0.01 * Math.random() - 0.005;
    this.nodes = [];
    for (let n = 0; n < E.size; n++) {
      const node = new NodeItem();
      node.x = pos.x;
      node.y = pos.y;
      this.nodes.push(node);
    }
  }

  update() {
    let springFactor = this.spring;
    const firstNode = this.nodes[0];
    if (firstNode) {
      firstNode.vx += (pos.x - firstNode.x) * springFactor;
      firstNode.vy += (pos.y - firstNode.y) * springFactor;
    }
    
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (!node) continue;
      if (i > 0) {
        const prevNode = this.nodes[i - 1];
        if (prevNode) {
          node.vx += (prevNode.x - node.x) * springFactor;
          node.vy += (prevNode.y - node.y) * springFactor;
          node.vx += prevNode.vx * E.dampening;
          node.vy += prevNode.vy * E.dampening;
        }
      }
      node.vx *= this.friction;
      node.vy *= this.friction;
      node.x += node.vx;
      node.y += node.vy;
      springFactor *= E.tension;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const firstNode = this.nodes[0];
    if (!firstNode) return;
    
    ctx.beginPath();
    ctx.moveTo(firstNode.x, firstNode.y);
    
    let a: number;
    for (a = 1; a < this.nodes.length - 2; a++) {
      const curr = this.nodes[a];
      const next = this.nodes[a + 1];
      if (curr && next) {
        const midX = 0.5 * (curr.x + next.x);
        const midY = 0.5 * (curr.y + next.y);
        ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
      }
    }
    
    const secondLast = this.nodes[a];
    const last = this.nodes[a + 1];
    if (secondLast && last) {
      ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
    }
    ctx.stroke();
    ctx.closePath();
  }
}

const E = {
  debug: true,
  friction: 0.5,
  trails: 30, // Reduced to 30 for elegant performance
  size: 40,
  dampening: 0.025,
  tension: 0.98,
};

let pos = { x: 0, y: 0 };
let lines: Line[] = [];
let ctx: any = null;
let colorOscillator: any = null;

class Oscillator {
  phase: number;
  offset: number;
  frequency: number;
  amplitude: number;

  constructor(e: { phase: number; offset: number; frequency: number; amplitude: number }) {
    this.phase = e.phase;
    this.offset = e.offset;
    this.frequency = e.frequency;
    this.amplitude = e.amplitude;
  }

  update() {
    this.phase += this.frequency;
    return this.offset + Math.sin(this.phase) * this.amplitude;
  }
}

function onMousemove(e: any) {
  function initLines() {
    lines = [];
    for (let i = 0; i < E.trails; i++) {
      lines.push(new Line({ spring: 0.45 + (i / E.trails) * 0.025 }));
    }
  }

  function setCoordinates(event: any) {
    if (event.touches) {
      pos.x = event.touches[0].pageX;
      pos.y = event.touches[0].pageY;
    } else {
      pos.x = event.clientX;
      pos.y = event.clientY + (window.scrollY || window.pageYOffset || 0);
    }
  }

  function handleTouchStart(event: any) {
    if (event.touches.length === 1) {
      pos.x = event.touches[0].pageX;
      pos.y = event.touches[0].pageY;
    }
  }

  document.removeEventListener("mousemove", onMousemove);
  document.removeEventListener("touchstart", onMousemove);
  document.addEventListener("mousemove", setCoordinates);
  document.addEventListener("touchmove", setCoordinates);
  document.addEventListener("touchstart", handleTouchStart);
  
  setCoordinates(e);
  initLines();
  render();
}

function render() {
  if (ctx && ctx.running) {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = "lighter";
    
    // Scale hue to brand colors: blue (200) -> indigo (240) -> purple (270)
    const hue = Math.round(colorOscillator.update());
    ctx.strokeStyle = `hsla(${hue}, 100%, 55%, 0.022)`;
    ctx.lineWidth = 2.0; // Thinner lines for clean visual aesthetics
    
    for (let t = 0; t < E.trails; t++) {
      const line = lines[t];
      if (line) {
        line.update();
        line.draw(ctx);
      }
    }
    
    window.requestAnimationFrame(render);
  }
}

function resizeCanvas() {
  if (ctx && ctx.canvas) {
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      window.innerHeight
    );
  }
}

export const renderCanvas = function () {
  const canvasEl = document.getElementById("canvas") as HTMLCanvasElement;
  if (!canvasEl) return;
  
  // Disable on mobile/touch screen configurations
  const isMobile = window.innerWidth < 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (isMobile) {
    canvasEl.style.display = "none";
    return;
  }

  ctx = canvasEl.getContext("2d");
  if (!ctx) return;
  
  ctx.running = true;
  ctx.frame = 1;
  
  // brand colors mapping: hue range [210, 270] (blue to purple)
  // Slow color shift by setting frequency to 0.0007
  colorOscillator = new Oscillator({
    phase: Math.random() * 2 * Math.PI,
    amplitude: 30,
    frequency: 0.0007,
    offset: 240,
  });

  document.addEventListener("mousemove", onMousemove);
  document.addEventListener("touchstart", onMousemove);
  window.addEventListener("resize", resizeCanvas);
  
  const handleFocus = () => {
    if (ctx && !ctx.running) {
      ctx.running = true;
      render();
    }
  };
  
  const handleBlur = () => {
    if (ctx) ctx.running = false; // Pause when blur
  };

  window.addEventListener("focus", handleFocus);
  window.addEventListener("blur", handleBlur);
  
  resizeCanvas();
};
