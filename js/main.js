/**
 * Oscar Valverde Portfolio - Main JavaScript
 * Persona 3 Reload Theme
 * Accessibility-first, animated, sonorized
 */

'use strict';

// ============================================================
// AUDIO ENGINE
// ============================================================
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.bgGain = null;
    this.sfxGain = null;
    this.bgSource = null;
    this.isPlaying = false;
  }

  async init(withSound = true) {
    this.enabled = withSound;
    if (!withSound) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.bgGain = this.ctx.createGain();
      this.bgGain.gain.value = 0.25;
      this.bgGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.ctx.destination);

      this.playAmbient();
    } catch (e) {
      console.warn('AudioContext not supported:', e);
      this.enabled = false;
    }
  }

  // Procedurally generated ambient Persona 3-like melody
  playAmbient() {
    if (!this.ctx || !this.enabled) return;
    this.isPlaying = true;
    this._scheduleAmbient();
  }

  _createOscillator(freq, type = 'sine', duration = 0.5, startTime, gainVal = 0.06) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.bgGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
  }

  _scheduleAmbient() {
    if (!this.ctx || !this.enabled || !this.isPlaying) return;
    // Persona 3-inspired chord progression (Am - F - C - G in minor key)
    const now = this.ctx.currentTime;
    const scale = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];
    const melody = [0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 9];
    const rhythmBase = 0.4;

    melody.forEach((noteIdx, i) => {
      const freq = scale[noteIdx % scale.length];
      const t = now + i * rhythmBase;
      this._createOscillator(freq, 'triangle', 0.35, t, 0.04);
      // Add sub-bass
      if (i % 4 === 0) {
        this._createOscillator(freq / 2, 'sine', 0.6, t, 0.05);
      }
    });

    // Re-schedule loop
    const loopDuration = melody.length * rhythmBase;
    this._ambientTimer = setTimeout(() => this._scheduleAmbient(), (loopDuration - 0.1) * 1000);
  }

  playSFX(type = 'hover') {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const sfxMap = {
      hover: { freq: 880, duration: 0.1, type: 'sine', gain: 0.08 },
      click: { freq: [660, 880], duration: 0.15, type: 'triangle', gain: 0.12 },
      splash: { freq: [220, 440, 660, 880], duration: 0.8, type: 'sine', gain: 0.15 },
      nav: { freq: [440, 660], duration: 0.2, type: 'triangle', gain: 0.1 },
      reveal: { freq: [330, 440], duration: 0.3, type: 'sine', gain: 0.08 },
    };
    const sfx = sfxMap[type] || sfxMap.hover;
    const freqs = Array.isArray(sfx.freq) ? sfx.freq : [sfx.freq];
    freqs.forEach((f, i) => {
      this._createOscillator(f, sfx.type, sfx.duration, now + i * 0.05, sfx.gain / freqs.length);
    });
  }

  toggle() {
    if (!this.ctx) return;
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.bgGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.isPlaying = true;
      this._scheduleAmbient();
    } else {
      clearTimeout(this._ambientTimer);
      this.isPlaying = false;
      this.bgGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    }
    return this.enabled;
  }

  stop() {
    clearTimeout(this._ambientTimer);
    this.isPlaying = false;
    if (this.bgGain && this.ctx) {
      this.bgGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    }
  }
}

const audio = new AudioEngine();

// ============================================================
// PARTICLES
// ============================================================
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animId = null;
    this.resize();
    this.init();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    const count = Math.min(60, Math.floor((window.innerWidth * window.innerHeight) / 20000));
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }
    this.animate();
  }

  createParticle() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4 - 0.2,
      alpha: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.6 ? '#00d4ff' : '#00f5c4',
    };
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha += (Math.random() - 0.5) * 0.02;
      p.alpha = Math.max(0.05, Math.min(0.6, p.alpha));

      if (p.x < 0 || p.x > this.canvas.width || p.y < -10 || p.y > this.canvas.height + 10) {
        this.particles[i] = { ...this.createParticle(), x: Math.random() * this.canvas.width, y: this.canvas.height + 5 };
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    this.animId = requestAnimationFrame(() => this.animate());
  }
}

// ============================================================
// CUSTOM CURSOR
// ============================================================
class CustomCursor {
  constructor() {
    this.cursor = document.querySelector('.cursor');
    this.ring = document.querySelector('.cursor-ring');
    this.ringX = 0;
    this.ringY = 0;
    this.curX = 0;
    this.curY = 0;
    if (!this.cursor || !this.ring) return;
    this.bind();
    this.animate();
  }

  bind() {
    document.addEventListener('mousemove', (e) => {
      this.curX = e.clientX;
      this.curY = e.clientY;
      this.cursor.style.left = e.clientX + 'px';
      this.cursor.style.top = e.clientY + 'px';
    });

    document.querySelectorAll('a, button, [role="button"], .gallery-item, .filter-btn').forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.cursor.style.width = '20px';
        this.cursor.style.height = '20px';
        this.ring.style.width = '50px';
        this.ring.style.height = '50px';
        audio.playSFX('hover');
      });
      el.addEventListener('mouseleave', () => {
        this.cursor.style.width = '12px';
        this.cursor.style.height = '12px';
        this.ring.style.width = '36px';
        this.ring.style.height = '36px';
      });
    });
  }

  animate() {
    this.ringX += (this.curX - this.ringX) * 0.12;
    this.ringY += (this.curY - this.ringY) * 0.12;
    this.ring.style.left = this.ringX + 'px';
    this.ring.style.top = this.ringY + 'px';
    requestAnimationFrame(() => this.animate());
  }
}

// ============================================================
// TYPEWRITER
// ============================================================
class Typewriter {
  constructor(el, strings, speed = 80, pause = 2000) {
    this.el = el;
    this.strings = strings;
    this.speed = speed;
    this.pause = pause;
    this.idx = 0;
    this.charIdx = 0;
    this.deleting = false;
    this.run();
  }

  run() {
    const current = this.strings[this.idx];
    if (this.deleting) {
      this.el.textContent = current.substring(0, this.charIdx - 1);
      this.charIdx--;
      if (this.charIdx === 0) {
        this.deleting = false;
        this.idx = (this.idx + 1) % this.strings.length;
        setTimeout(() => this.run(), 400);
        return;
      }
      setTimeout(() => this.run(), this.speed / 2);
    } else {
      this.el.textContent = current.substring(0, this.charIdx + 1);
      this.charIdx++;
      if (this.charIdx === current.length) {
        this.deleting = true;
        setTimeout(() => this.run(), this.pause);
        return;
      }
      setTimeout(() => this.run(), this.speed);
    }
  }
}

// ============================================================
// SCROLL REVEAL
// ============================================================
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        audio.playSFX('reveal');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => observer.observe(el));
}

// ============================================================
// SKILL BARS
// ============================================================
function initSkillBars() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.skill-fill').forEach(bar => {
          const target = bar.getAttribute('data-width');
          setTimeout(() => { bar.style.width = target; }, 200);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.skill-category-card').forEach(card => observer.observe(card));
}

// ============================================================
// NAVIGATION
// ============================================================
function initNavigation() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-menu a');
  const progressBar = document.getElementById('progress-bar');

  // Scroll behavior
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const progress = Math.min((scrollY / docH) * 100, 100);

    navbar.classList.toggle('scrolled', scrollY > 50);
    progressBar.style.width = progress + '%';

    // Scroll to top visibility
    const scrollTopBtn = document.getElementById('scroll-top');
    scrollTopBtn.classList.toggle('visible', scrollY > 400);

    // Active nav link
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(sec => {
      const top = sec.offsetTop - 100;
      const bottom = top + sec.offsetHeight;
      if (scrollY >= top && scrollY < bottom) {
        navLinks.forEach(a => a.classList.remove('active'));
        const active = document.querySelector(`.nav-menu a[href="#${sec.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  });

  // Hamburger
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('active');
      navMenu.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
      audio.playSFX('nav');
    });
  }

  // Nav link clicks
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        navMenu.classList.remove('open');
        hamburger && hamburger.classList.remove('active');
        hamburger && hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        audio.playSFX('click');
      }
    });
  });
}

// ============================================================
// THEME TOGGLE
// ============================================================
function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
    audio.playSFX('click');
  });
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
  btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
}

// ============================================================
// AUDIO TOGGLE
// ============================================================
function initAudioToggle() {
  const btn = document.getElementById('audio-toggle');
  btn.addEventListener('click', () => {
    if (!audio.ctx) {
      audio.init(true);
      btn.innerHTML = '🔊';
      btn.setAttribute('aria-label', 'Silenciar música');
      return;
    }
    const on = audio.toggle();
    btn.innerHTML = on ? '🔊' : '🔇';
    btn.setAttribute('aria-label', on ? 'Silenciar música' : 'Activar música');
  });
}

// ============================================================
// GALLERY FILTER
// ============================================================
function initGallery() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const items = document.querySelectorAll('.gallery-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      audio.playSFX('click');
      const filter = btn.getAttribute('data-filter');
      items.forEach(item => {
        const cat = item.getAttribute('data-category');
        const show = filter === 'all' || cat === filter;
        item.style.opacity = show ? '1' : '0.2';
        item.style.transform = show ? 'scale(1)' : 'scale(0.95)';
        item.style.pointerEvents = show ? 'auto' : 'none';
      });
    });
  });
}

// ============================================================
// CONTACT FORM
// ============================================================
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const original = btn.textContent;
    btn.textContent = '✅ Mensaje enviado!';
    btn.disabled = true;
    audio.playSFX('splash');
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
      form.reset();
    }, 3000);
  });
}

// ============================================================
// AUDIO VISUALIZER BARS
// ============================================================
function initAudioVisualizer() {
  const viz = document.querySelector('.audio-visualizer');
  if (!viz) return;
  const count = 40;
  for (let i = 0; i < count; i++) {
    const bar = document.createElement('div');
    bar.className = 'audio-bar';
    const h = Math.random() * 30 + 5;
    bar.style.setProperty('--bar-height', h + 'px');
    bar.style.animationDelay = (Math.random() * 1) + 's';
    bar.style.animationDuration = (Math.random() * 0.8 + 0.6) + 's';
    viz.appendChild(bar);
  }
}

// ============================================================
// SCROLL TO TOP
// ============================================================
function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    audio.playSFX('click');
  });
}

// ============================================================
// COUNTER ANIMATION
// ============================================================
function animateCounter(el, target, duration = 1500) {
  const start = performance.now();
  const step = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(ease * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

function initCounters() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const num = entry.target.querySelector('.hero-stat-num');
        if (num) {
          const target = parseInt(num.getAttribute('data-target') || num.textContent);
          animateCounter(num, target);
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.hero-stat').forEach(stat => observer.observe(stat));
}

// ============================================================
// P3 CLOCK DECORATION
// ============================================================
function initP3Clock() {
  const clock = document.querySelector('.p3-clock');
  if (!clock) return;
  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourAngle = (hours * 30) + (minutes * 0.5);
  const minAngle = minutes * 6;
  const secAngle = seconds * 6;

  clock.innerHTML = `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="50" cy="50" r="45" stroke="rgba(0,212,255,0.4)" stroke-width="1.5"/>
      <circle cx="50" cy="50" r="38" stroke="rgba(0,245,196,0.2)" stroke-width="0.5"/>
      ${Array.from({length: 12}, (_, i) => {
        const a = (i * 30) * Math.PI / 180;
        const x1 = 50 + 40 * Math.sin(a);
        const y1 = 50 - 40 * Math.cos(a);
        const x2 = 50 + 44 * Math.sin(a);
        const y2 = 50 - 44 * Math.cos(a);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(0,212,255,0.5)" stroke-width="1.5"/>`;
      }).join('')}
      <!-- Hour hand -->
      <line x1="50" y1="50" x2="${50 + 22 * Math.sin(hourAngle * Math.PI / 180)}" y2="${50 - 22 * Math.cos(hourAngle * Math.PI / 180)}" stroke="#00d4ff" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Minute hand -->
      <line x1="50" y1="50" x2="${50 + 32 * Math.sin(minAngle * Math.PI / 180)}" y2="${50 - 32 * Math.cos(minAngle * Math.PI / 180)}" stroke="#00f5c4" stroke-width="1.5" stroke-linecap="round"/>
      <!-- Second hand -->
      <line x1="50" y1="50" x2="${50 + 36 * Math.sin(secAngle * Math.PI / 180)}" y2="${50 - 36 * Math.cos(secAngle * Math.PI / 180)}" stroke="#ffe44d" stroke-width="0.8" stroke-linecap="round"/>
      <circle cx="50" cy="50" r="3" fill="#00d4ff"/>
    </svg>
  `;

  // Update every second
  setInterval(() => initP3Clock(), 1000);
}

// ============================================================
// SPLASH SCREEN
// ============================================================
function initSplash() {
  const splash = document.getElementById('splash-screen');
  const btnSound = document.getElementById('splash-sound');
  const btnSilent = document.getElementById('splash-silent');

  if (!splash) return;

  async function enterSite(withSound) {
    await audio.init(withSound);
    if (withSound) {
      audio.playSFX('splash');
      const audioBtn = document.getElementById('audio-toggle');
      if (audioBtn) { audioBtn.innerHTML = '🔊'; }
    }
    splash.classList.add('hidden');
    document.body.classList.remove('splash-active');

    // Announce to screen readers
    const announcer = document.getElementById('sr-announcer');
    if (announcer) announcer.textContent = 'Bienvenido al portafolio de Oscar Valverde';

    setTimeout(() => {
      initScrollReveal();
      initSkillBars();
      initCounters();
      new CustomCursor();
      new Typewriter(
        document.getElementById('typewriter'),
        [
          'Desarrollador Web Full Stack',
          'Estudiante de Ing. de Software',
          'Apasionado por el código limpio',
          'Profesional 4.0 en formación',
          'Jugador de equipo comprometido',
        ]
      );
    }, 500);
  }

  btnSound && btnSound.addEventListener('click', () => enterSite(true));
  btnSilent && btnSilent.addEventListener('click', () => enterSite(false));

  // Keyboard support
  splash.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      enterSite(false);
    }
  });
}

// ============================================================
// LIVE CLOCK IN NAV (optional)
// ============================================================
function updateNavTime() {
  const el = document.getElementById('nav-time');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Core init (works before splash dismissal)
  initNavigation();
  initThemeToggle();
  initAudioToggle();
  initGallery();
  initContactForm();
  initScrollTop();
  initAudioVisualizer();
  initP3Clock();
  initSplash();
  updateNavTime();
  setInterval(updateNavTime, 30000);

  // Particles
  const canvas = document.getElementById('particles-canvas');
  if (canvas) new ParticleSystem(canvas);

  // Announce page load to screen readers
  document.title = 'Oscar Valverde | Portafolio Profesional';
});
