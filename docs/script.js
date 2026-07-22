const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const scenes = [...document.querySelectorAll('[data-scene]')];
const chapterLinks = [...document.querySelectorAll('.site-header nav a[href^="#"]')];
const chapters = chapterLinks.map((link) => ({
  link,
  section: document.querySelector(link.getAttribute('href'))
}));
const sceneProgress = new WeakMap();
let displayedPageProgress;

document.getElementById('year').textContent = new Date().getFullYear();

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

function setStepProgress(scene, progress) {
  const steps = [...scene.querySelectorAll('[data-step]')];
  const count = Math.max(steps.length, 1);

  steps.forEach((step, index) => {
    let localProgress = reducedMotion ? 1 : clamp(progress * (count + 1) - index);

    if (scene.classList.contains('safety-scene') && !reducedMotion) {
      localProgress = clamp((progress - index * 0.24) / 0.23);
    }
    step.style.opacity = localProgress.toFixed(3);
    step.style.transform = `translateY(${(1 - localProgress) * 36}px) scale(${0.82 + localProgress * 0.18})`;

    if (scene.classList.contains('math-scene')) {
      step.style.transform = `translateY(${(1 - localProgress) * 20}px)`;
    }

    if (scene.classList.contains('safety-scene')) {
      step.style.transform = `translateX(${(1 - localProgress) * -48}px)`;
    }

    if (scene.classList.contains('stack-scene')) {
      const start = [237, 246, 239];
      const end = [80, 255, 131];
      const color = start.map((channel, colorIndex) =>
        Math.round(channel + (end[colorIndex] - channel) * localProgress)
      );

      step.style.setProperty('--step-progress', localProgress.toFixed(3));
      step.style.setProperty('--step-color', `rgb(${color.join(', ')})`);
    }
  });
}

function setTokenProgress(scene, progress) {
  scene.querySelectorAll('.token').forEach((token, index) => {
    const x = Number(token.dataset.x || 0) * (1 - progress);
    const y = Number(token.dataset.y || 0) * (1 - progress);
    const rotation = ((index % 2 ? -1 : 1) * (1 - progress) * (7 + index));
    token.style.opacity = (0.15 + progress * 0.85).toFixed(3);
    token.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
  });
}

function drawComplexityGraph(scene, progress) {
  const canvas = scene.querySelector('[data-complexity-canvas]');
  if (!canvas) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * pixelRatio);
  const pixelHeight = Math.round(height * pixelRatio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext('2d');
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const margin = {
    left: width < 600 ? 46 : 64,
    right: 24,
    top: 42,
    bottom: 48
  };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xPosition = (n) => margin.left + (n / 10) * plotWidth;
  const yPosition = (comparisons) => margin.top + (1 - comparisons / 100) * plotHeight;

  context.font = '10px "Courier New", monospace';
  context.fillStyle = '#87958b';
  context.strokeStyle = 'rgba(80, 255, 131, .11)';
  context.lineWidth = 1;

  for (let n = 0; n <= 10; n += 2) {
    const x = xPosition(n);
    context.beginPath();
    context.moveTo(x, margin.top);
    context.lineTo(x, margin.top + plotHeight);
    context.stroke();
    context.textAlign = 'center';
    context.fillText(String(n), x, margin.top + plotHeight + 18);
  }

  for (let comparisons = 0; comparisons <= 100; comparisons += 20) {
    const y = yPosition(comparisons);
    context.beginPath();
    context.moveTo(margin.left, y);
    context.lineTo(margin.left + plotWidth, y);
    context.stroke();
    context.textAlign = 'right';
    context.fillText(String(comparisons), margin.left - 10, y + 3);
  }

  context.strokeStyle = 'rgba(237, 246, 239, .48)';
  context.beginPath();
  context.moveTo(margin.left, margin.top);
  context.lineTo(margin.left, margin.top + plotHeight);
  context.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  context.stroke();

  context.textAlign = 'right';
  context.fillText('INPUT SIZE n', margin.left + plotWidth, height - 10);
  context.save();
  context.translate(12, margin.top);
  context.rotate(-Math.PI / 2);
  context.textAlign = 'right';
  context.fillText('COMPARISONS', 0, 0);
  context.restore();

  const maxN = progress * 10;
  const drawFunction = (fn, color, lineWidth) => {
    context.beginPath();
    for (let step = 0; step <= 120; step += 1) {
      const n = maxN * (step / 120);
      const x = xPosition(n);
      const y = yPosition(fn(n));
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.shadowColor = color;
    context.shadowBlur = color === '#50ff83' ? 10 : 0;
    context.stroke();
    context.shadowBlur = 0;
  };

  drawFunction((n) => n, '#edf6ef', 1.5);
  drawFunction((n) => n * n, '#50ff83', 2.5);

  if (progress > 0.01) {
    const markerX = xPosition(maxN);
    context.setLineDash([4, 5]);
    context.strokeStyle = 'rgba(237, 246, 239, .35)';
    context.beginPath();
    context.moveTo(markerX, margin.top);
    context.lineTo(markerX, margin.top + plotHeight);
    context.stroke();
    context.setLineDash([]);

    [[maxN, '#edf6ef'], [maxN * maxN, '#50ff83']].forEach(([value, color]) => {
      context.beginPath();
      context.arc(markerX, yPosition(value), 4, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
    });
  }

  const displayedN = Math.round(maxN);
  const nReadout = scene.querySelector('[data-graph-n]');
  const squaredReadout = scene.querySelector('[data-graph-n2]');
  if (nReadout) nReadout.textContent = displayedN;
  if (squaredReadout) squaredReadout.textContent = displayedN * displayedN;
}

function update() {
  let needsAnotherFrame = false;
  const viewportHeight = scenes[0]?.querySelector('.scene-sticky')?.offsetHeight || window.innerHeight;
  const scrollRange = document.documentElement.scrollHeight - viewportHeight;
  const targetPageProgress = scrollRange > 0 ? window.scrollY / scrollRange : 0;
  if (displayedPageProgress === undefined || reducedMotion) displayedPageProgress = targetPageProgress;
  else displayedPageProgress += (targetPageProgress - displayedPageProgress) * 0.18;
  if (Math.abs(targetPageProgress - displayedPageProgress) > 0.0005) needsAnotherFrame = true;
  else displayedPageProgress = targetPageProgress;
  root.style.setProperty('--page', displayedPageProgress.toFixed(4));

  const readingLine = viewportHeight * 0.35;
  const activeChapter = chapters.find(({ section }) => {
    if (!section) return false;
    const rect = section.getBoundingClientRect();
    return rect.top <= readingLine && rect.bottom > readingLine;
  });
  chapters.forEach(({ link }) => {
    if (link === activeChapter?.link) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });

  scenes.forEach((scene) => {
    const rect = scene.getBoundingClientRect();
    const travel = Math.max(rect.height - viewportHeight, 1);
    const rawProgress = clamp(-rect.top / travel);
    const targetProgress = reducedMotion ? 1 : clamp(rawProgress / 0.84);
    let progress = sceneProgress.has(scene) ? sceneProgress.get(scene) : targetProgress;
    if (!reducedMotion) progress += (targetProgress - progress) * 0.18;
    if (Math.abs(targetProgress - progress) > 0.0005) needsAnotherFrame = true;
    else progress = targetProgress;
    sceneProgress.set(scene, progress);
    const centered = progress - 0.5;

    scene.style.setProperty('--p', progress.toFixed(4));
    scene.style.setProperty('--shift', `${centered * 180}px`);
    scene.style.setProperty('--shift-back', `${centered * -180}px`);
    scene.style.setProperty('--lift', `${centered * -70}px`);
    scene.style.setProperty('--clip', `${(1 - progress) * 100}%`);

    setStepProgress(scene, progress);

    const counter = scene.querySelector('[data-counter]');
    if (counter) {
      counter.textContent = String(Math.round(progress * 100)).padStart(3, '0');
    }

    if (scene.classList.contains('ai-scene')) setTokenProgress(scene, progress);
    if (scene.classList.contains('math-scene')) drawComplexityGraph(scene, progress);
  });

  return needsAnotherFrame;
}

let scheduled = false;
function requestUpdate() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    if (update()) requestUpdate();
  });
}

window.addEventListener('scroll', requestUpdate, { passive: true });
window.addEventListener('resize', requestUpdate);

document.querySelectorAll('.site-header a[href^="#"], [data-jump-top]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const hash = link.getAttribute('href');
    const target = hash ? document.querySelector(hash) : null;
    if (!target) return;

    event.preventDefault();
    root.classList.add('is-jumping');
    displayedPageProgress = undefined;
    scenes.forEach((scene) => sceneProgress.delete(scene));

    target.scrollIntoView({ behavior: 'instant', block: 'start' });
    const url = hash === '#top'
      ? `${window.location.pathname}${window.location.search}`
      : `${window.location.pathname}${window.location.search}${hash}`;
    window.history.pushState(null, '', url);
    update();

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => root.classList.remove('is-jumping'));
    });
  });
});

requestUpdate();
