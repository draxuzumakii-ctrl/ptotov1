(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safePath = value => typeof value === 'string' && value.trim() && !/^(?:javascript|data|vbscript):/i.test(value.trim()) ? value.trim() : '';
  const safeExternalURL = value => {
    if (typeof value !== 'string' || !value.trim() || value.trim() === '#') return '';
    try {
      const url = new URL(value.trim(), window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const formatTime = value => {
    if (!Number.isFinite(value)) return '0:00';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const state = {projects: [], photos: [], experiments: [], tracks: [], currentTrack: 0, currentPhoto: 0, transformed: false, lastScroll: 0, activeModal: null, toastTimer: 0, logoClicks: 0, logoTimer: 0};

  async function loadJSON(path, fallback = []) {
    try {
      const response = await fetch(path, {headers: {'Accept': 'application/json'}});
      if (!response.ok) throw new Error(`Could not load ${path}`);
      const value = await response.json();
      return Array.isArray(value) ? value : fallback;
    } catch (error) {
      console.warn(error);
      return fallback;
    }
  }

  function imageMarkup(src, alt, className = '') {
    if (!src) return '';
    return `<img class="${className}" src="${escapeHTML(src)}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async">`;
  }

  function renderProjects(filter = 'all') {
    const list = $('#project-list');
    const projects = state.projects.filter(project => filter === 'all' || (project.filters || []).includes(filter));
    if (!projects.length) {
      list.innerHTML = '<p class="project-empty">Nothing in this drawer just yet. Try another filter.</p>';
      return;
    }
    const allFilter = $('.filter-button[data-filter="all"]');
    if (allFilter) allFilter.innerHTML = `ALL <span>${String(state.projects.length).padStart(2, '0')}</span>`;
    list.innerHTML = projects.map((project, index) => {
      const title = escapeHTML(project.title || 'Untitled project');
      const category = escapeHTML(project.category || 'EXPERIMENT');
      const image = safePath(project.image);
      const visual = ['paper', 'night'].includes(project.visual) ? project.visual : 'default';
      const artContents = image
        ? imageMarkup(image, `${title} project visual`, 'project-cover')
        : `<div class="project-art-inner"><div class="art-window"><div class="art-browser"><i></i><i></i><i></i></div><div class="art-site"><strong>${title}</strong><span></span></div></div></div><span class="art-label">${escapeHTML(project.status || 'PERSONAL STUDY')} · VISUAL PLACEHOLDER</span>`;
      return `<article class="project-item" style="animation-delay:${index * 65}ms">
        <span class="project-number">${escapeHTML(project.number || String(index + 1).padStart(2, '0'))}</span>
        <div class="project-info"><span class="project-kind">${category}</span><h3>${title}</h3><p>${escapeHTML(project.description || '')}</p>
          <div class="project-meta"><span>${escapeHTML(project.year || '')}</span><span>${escapeHTML(project.status || 'PERSONAL STUDY')}</span></div>
          <button class="project-open" type="button" data-project="${escapeHTML(project.number || index)}" data-cursor="OPEN">EXPLORE THE NOTE <span>↗</span></button>
        </div>
        <button class="project-art project-art--${visual}" type="button" data-project="${escapeHTML(project.number || index)}" data-cursor="OPEN" aria-label="Open ${title} project details">${artContents}</button>
      </article>`;
    }).join('');
    $$('.project-open, .project-art', list).forEach(button => button.addEventListener('click', () => openProject(button.dataset.project)));
    if (finePointer) bindCursorTargets(list);
  }

  function renderPhotos() {
    const grid = $('#photo-grid');
    $('#photo-count').textContent = String(state.photos.length).padStart(2, '0');
    if (!state.photos.length) {
      grid.innerHTML = '<p class="project-empty">A little space for the first photograph.</p>';
      return;
    }
    grid.innerHTML = state.photos.map((photo, index) => {
      const title = escapeHTML(photo.title || `Moment ${index + 1}`);
      const scene = /^scene-(window|sky|shadow|street)$/.test(photo.scene) ? photo.scene : 'scene-window';
      const visual = safePath(photo.image)
        ? imageMarkup(photo.image, photo.alt || title)
        : `<div class="photo-placeholder ${scene}" role="img" aria-label="${escapeHTML(photo.alt || `Placeholder for ${title}`)}"><span class="scene-shape" aria-hidden="true"></span><span class="placeholder-mark">PHOTO ${String(index + 1).padStart(2, '0')}</span><span class="placeholder-title">PLACEHOLDER · REPLACE WITH YOUR PHOTO</span></div>`;
      const detail = [photo.location, photo.year].filter(Boolean).map(escapeHTML).join(' · ');
      return `<button class="photo-card" type="button" data-photo-index="${index}" data-cursor="LOOK" aria-label="Open photograph: ${title}">
        <div class="photo-image">${visual}</div><div class="photo-caption"><strong>${title}</strong>${detail ? `<span>${detail}</span>` : ''}</div>
      </button>`;
    }).join('');
    $$('.photo-card', grid).forEach(card => card.addEventListener('click', () => openPhoto(Number(card.dataset.photoIndex))));
    if (finePointer) bindCursorTargets(grid);
  }

  function renderExperiments() {
    const list = $('#experiment-list');
    if (!state.experiments.length) {
      list.innerHTML = '<p class="project-empty">No notes in the drawer yet.</p>';
      return;
    }
    list.innerHTML = state.experiments.map((experiment, index) => `<article class="experiment-row">
      <span class="experiment-number">${escapeHTML(experiment.number || String(index + 1).padStart(3, '0'))}</span>
      <div><span class="experiment-name">${escapeHTML(experiment.title || 'Loose idea')}</span><span class="experiment-detail">${escapeHTML(experiment.detail || '')}</span></div>
      <span class="experiment-status">${escapeHTML(experiment.status || 'ONGOING')}</span>
    </article>`).join('');
  }

  function renderPlaylist() {
    const playlist = $('#playlist');
    $('#track-count').textContent = `${String(state.tracks.length).padStart(2, '0')} TRACK${state.tracks.length === 1 ? '' : 'S'}`;
    if (!state.tracks.length) {
      playlist.innerHTML = '<p class="playlist-empty">No tracks here yet. This space is ready for something you love.</p>';
      $('#track-title').textContent = 'Nothing queued yet';
      $('#track-artist').textContent = 'Add tracks in data/playlist.json';
      $('#play-track').disabled = true;
      $('#previous-track').disabled = true;
      $('#next-track').disabled = true;
      $('#music-launch-status').textContent = 'OFF';
      return;
    }
    playlist.innerHTML = state.tracks.map((track, index) => `<button class="playlist-item" type="button" data-track-index="${index}" aria-label="Play ${escapeHTML(track.title || `Track ${index + 1}`)}">
      <span class="playlist-index">${String(index + 1).padStart(2, '0')}</span><span class="playlist-title">${escapeHTML(track.title || `Track ${index + 1}`)}<span class="playlist-artist">${escapeHTML(track.artist || 'Unknown artist')}</span></span><span class="playlist-time">${escapeHTML(track.duration || '—')}</span>
    </button>`).join('');
    $$('.playlist-item', playlist).forEach(item => item.addEventListener('click', () => playTrack(Number(item.dataset.trackIndex))));
    $('#play-track').disabled = false;
    $('#previous-track').disabled = false;
    $('#next-track').disabled = false;
    playTrack(0, false);
  }

  function artForPhoto(photo, index) {
    const image = safePath(photo.image);
    if (image) return imageMarkup(image, photo.alt || photo.title || 'Photograph');
    const scene = /^scene-(window|sky|shadow|street)$/.test(photo.scene) ? photo.scene : 'scene-window';
    return `<div class="photo-placeholder ${scene}" role="img" aria-label="${escapeHTML(photo.alt || `Placeholder for ${photo.title || `photo ${index + 1}`}`)}"><span class="scene-shape" aria-hidden="true"></span><span class="placeholder-mark">PHOTO ${String(index + 1).padStart(2, '0')}</span><span class="placeholder-title">PLACEHOLDER · REPLACE WITH YOUR PHOTO</span></div>`;
  }

  function openPhoto(index) {
    if (!state.photos.length) return;
    state.currentPhoto = (index + state.photos.length) % state.photos.length;
    const photo = state.photos[state.currentPhoto];
    $('#viewer-image').innerHTML = artForPhoto(photo, state.currentPhoto);
    $('#viewer-title').textContent = photo.title || `Moment ${state.currentPhoto + 1}`;
    $('#viewer-caption').textContent = photo.caption || '';
    $('#viewer-count').textContent = `${String(state.currentPhoto + 1).padStart(2, '0')} / ${String(state.photos.length).padStart(2, '0')}`;
    const metadata = [photo.location, photo.year, photo.device || photo.camera, photo.lens].filter(Boolean);
    $('#viewer-meta').textContent = metadata.join(' · ');
    $('#viewer-meta').hidden = metadata.length === 0;
    if (!$('#photo-viewer').classList.contains('is-open')) showModal($('#photo-viewer'), $('.viewer-close'));
  }

  function movePhoto(direction) {
    if (!state.photos.length) return;
    openPhoto(state.currentPhoto + direction);
  }

  function openProject(key) {
    const project = state.projects.find((item, index) => String(item.number || index) === String(key));
    if (!project) return;
    const visual = ['paper', 'night'].includes(project.visual) ? project.visual : 'default';
    const visualMarkup = safePath(project.image)
      ? `<div class="project-art project-art--${visual} case-visual">${imageMarkup(project.image, `${project.title} project artwork`)}</div>`
      : `<div class="project-art project-art--${visual} case-visual"><div class="project-art-inner"><div class="art-window"><div class="art-browser"><i></i><i></i><i></i></div><div class="art-site"><strong>${escapeHTML(project.title || '')}</strong><span></span></div></div></div><span class="art-label">${escapeHTML(project.status || 'PERSONAL STUDY')} · CSS PLACEHOLDER</span></div>`;
    const projectURL = safeExternalURL(project.url);
    const links = projectURL ? `<a href="${escapeHTML(projectURL)}" target="_blank" rel="noreferrer">VIEW PROJECT ↗</a>` : '';
    $('#project-modal-content').innerHTML = `<div class="case-topline eyebrow"><span>${escapeHTML(project.category || 'PROJECT NOTE')}</span><span>${escapeHTML(project.year || '')} · ${escapeHTML(project.status || 'PERSONAL STUDY')}</span></div>
      <h2 class="case-title">${escapeHTML(project.title || 'Untitled')}</h2><p class="case-lead">${escapeHTML(project.description || '')}</p>${visualMarkup}
      <div class="case-columns"><div class="case-column"><h3>ROLE / TOOLS</h3><p>${escapeHTML(project.role || 'Personal project')}<br>${escapeHTML(project.tools || '')}</p><h3>THE PROCESS</h3><p>${escapeHTML(project.process || 'A personal exploration, in progress.')}</p></div>
      <div class="case-column"><h3>WHAT I LEARNED</h3><p>${escapeHTML(project.result || 'A note to return to as the work grows.')}</p><div class="case-links">${links}<a href="#contact" class="case-contact">SAY HELLO ↗</a></div></div></div>`;
    $('.case-contact', $('#project-modal-content')).addEventListener('click', closeAllOverlays);
    showModal($('#project-modal'), $('.modal-close'));
  }

  function showModal(element, focusTarget) {
    const returnFocus = state.activeModal ? state.lastFocused : document.activeElement;
    closeMobileMenu(false);
    $$('.photo-viewer,.project-modal,.command-overlay,.shortcuts-overlay').forEach(openElement => {
      if (openElement !== element) closeModal(openElement, false);
    });
    state.lastFocused = returnFocus;
    element.classList.add('is-open');
    element.setAttribute('aria-hidden', 'false');
    state.activeModal = element;
    document.body.classList.add('no-scroll');
    window.setTimeout(() => focusTarget?.focus(), 30);
  }

  function closeModal(element, restore = true) {
    if (!element || !element.classList.contains('is-open')) return;
    element.classList.remove('is-open');
    element.setAttribute('aria-hidden', 'true');
    if (state.activeModal === element) state.activeModal = null;
    updateScrollLock();
    if (restore) state.lastFocused?.focus?.();
  }

  function updateScrollLock() {
    const mobileOpen = $('.mobile-menu').classList.contains('is-open');
    const musicOpen = $('#music-panel').classList.contains('is-open') && window.matchMedia('(max-width: 680px)').matches;
    const overlayOpen = $$('.photo-viewer,.project-modal,.command-overlay,.shortcuts-overlay').some(element => element.classList.contains('is-open'));
    document.body.classList.toggle('no-scroll', mobileOpen || musicOpen || overlayOpen);
  }

  function closeAllOverlays() {
    $$('.photo-viewer,.project-modal,.command-overlay,.shortcuts-overlay').forEach(element => closeModal(element, false));
    closeMusic(false);
    closeMobileMenu(false);
    updateScrollLock();
  }

  function openMobileMenu() {
    const menu = $('.mobile-menu');
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    $('.menu-toggle').setAttribute('aria-expanded', 'true');
    $('.menu-toggle').setAttribute('aria-label', 'Close menu');
    updateScrollLock();
    window.setTimeout(() => $('nav a', menu)?.focus(), 180);
  }
  function closeMobileMenu(restore = true) {
    const menu = $('.mobile-menu');
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    $('.menu-toggle').setAttribute('aria-expanded', 'false');
    $('.menu-toggle').setAttribute('aria-label', 'Open menu');
    updateScrollLock();
    if (restore) $('.menu-toggle').focus();
  }

  function openMusic() {
    const panel = $('#music-panel');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    $('#music-launch').setAttribute('aria-expanded', 'true');
    if (window.matchMedia('(max-width: 680px)').matches) updateScrollLock();
    window.setTimeout(() => $('.music-close').focus(), 80);
  }
  function closeMusic(restore = true) {
    const panel = $('#music-panel');
    if (!panel.classList.contains('is-open')) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    $('#music-launch').setAttribute('aria-expanded', 'false');
    updateScrollLock();
    if (restore) $('#music-launch').focus();
  }

  function playTrack(index, autoplay = true) {
    if (!state.tracks.length) return;
    const total = state.tracks.length;
    state.currentTrack = (index + total) % total;
    const track = state.tracks[state.currentTrack];
    const audio = $('#audio-player');
    if (track.src && audio.getAttribute('src') !== track.src) {
      audio.src = track.src;
      audio.load();
    }
    $('#track-title').textContent = track.title || `Track ${state.currentTrack + 1}`;
    $('#track-artist').textContent = track.artist || 'Unknown artist';
    const recordArt = $('.record-art');
    if (safePath(track.cover)) {
      recordArt.style.backgroundImage = `linear-gradient(rgba(10,10,10,.26), rgba(10,10,10,.26)), url("${track.cover.replace(/["\\]/g, '')}")`;
      recordArt.style.backgroundSize = 'cover';
      recordArt.style.backgroundPosition = 'center';
    } else {
      recordArt.style.backgroundImage = '';
      recordArt.style.backgroundSize = '';
      recordArt.style.backgroundPosition = '';
    }
    $$('.playlist-item').forEach((item, itemIndex) => item.classList.toggle('is-current', itemIndex === state.currentTrack));
    $('#audio-progress').value = 0;
    $('#current-time').textContent = '0:00';
    $('#duration-time').textContent = track.duration || '0:00';
    if (autoplay) {
      const playRequest = audio.play();
      if (playRequest?.catch) playRequest.catch(() => showToast('This track could not be played. Check its file path.'));
    }
  }

  function togglePlayback() {
    if (!state.tracks.length) {
      showToast('The listening room is ready for your playlist.');
      openMusic();
      return;
    }
    const audio = $('#audio-player');
    if (audio.paused) {
      if (!audio.src) playTrack(state.currentTrack, true);
      else audio.play().catch(() => showToast('This track could not be played. Check its file path.'));
    } else audio.pause();
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2300);
  }

  const originalName = ['I KOMANG', 'EDI MAHENDRA'];
  const alternateName = ['NDRA DOYAN', 'NGODING'];
  function setHeroName(transformed) {
    state.transformed = transformed;
    const button = $('#hero-name');
    button.classList.toggle('is-transformed', transformed);
    clearTimeout(state.nameTimer);
    button.classList.toggle('is-returning', !transformed);
    if (!transformed) state.nameTimer = window.setTimeout(() => button.classList.remove('is-returning'), 850);
    button.setAttribute('aria-label', transformed ? 'NDRA DOYAN NGODING. Click for a little secret.' : 'Reveal a little secret');
    const lines = transformed ? alternateName : originalName;
    $$('.name-line', button).forEach((line, lineIndex) => {
      const text = lines[lineIndex] || '';
      line.dataset.line = text;
      line.replaceChildren(...[...text].map((char, charIndex) => {
        const span = document.createElement('span');
        span.className = `name-char${char === ' ' ? ' is-space' : ''}`;
        span.textContent = char === ' ' ? '\u00a0' : char;
        span.style.setProperty('--delay', `${charIndex * 24 + lineIndex * 78}ms`);
        return span;
      }));
    });
  }
  function toggleHeroName() {
    if (state.transformed) {
      showToast('you found it. yes, I actually do.');
      window.setTimeout(() => setHeroName(false), 450);
    } else setHeroName(true);
  }

  function bindCursorTargets(root = document) {
    $$('[data-cursor], a[href]', root).forEach(target => {
      if (target.dataset.cursorBound) return;
      target.dataset.cursorBound = 'true';
      target.addEventListener('pointerenter', () => {
        const cursor = $('.cursor');
        cursor.classList.add('is-active');
        cursor.querySelector('span').dataset.label = target.dataset.cursor || 'GO';
      });
      target.addEventListener('pointerleave', () => $('.cursor').classList.remove('is-active'));
    });
  }

  function setupReveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window) || reducedMotion) {
      items.forEach(item => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), {threshold: .11, rootMargin: '0px 0px -30px 0px'});
    items.forEach(item => observer.observe(item));
  }

  function updateClock() {
    const now = new Date();
    $('#live-clock').textContent = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false}).format(now);
  }

  function onScroll() {
    const header = $('.site-header');
    const current = window.scrollY;
    const goingDown = current > state.lastScroll;
    header.classList.toggle('scrolled', current > 30);
    if (current > 280 && goingDown && !document.body.classList.contains('no-scroll')) header.classList.add('is-hidden');
    else header.classList.remove('is-hidden');
    state.lastScroll = current;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const percent = Math.round((current / max) * 100);
    $('#progress-value').textContent = String(percent).padStart(2, '0');
    $('#progress-bar').style.height = `${percent}%`;
  }

  function setupNavObserver() {
    if (!('IntersectionObserver' in window)) return;
    const sections = ['work', 'about', 'photo', 'lab', 'contact'].map(id => document.getElementById(id)).filter(Boolean);
    const navLinks = $$('.desktop-nav a');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`));
      });
    }, {rootMargin: '-35% 0px -55% 0px'});
    sections.forEach(section => observer.observe(section));
  }

  function openCommandMenu() {
    const overlay = $('#command-overlay');
    showModal(overlay, $('#command-search'));
    $('#command-search').value = '';
    $$('.command-options button').forEach(button => button.hidden = false);
  }

  function commandAction(action) {
    if (action === 'music') {
      closeModal($('#command-overlay'), false);
      openMusic();
      return;
    }
    const target = document.getElementById(action);
    closeModal($('#command-overlay'), false);
    updateScrollLock();
    target?.scrollIntoView({behavior: reducedMotion ? 'auto' : 'smooth'});
  }

  function trapFocus(event, element) {
    if (event.key !== 'Tab') return;
    const focusable = $$('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]', element).filter(node => node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  // Project filters
  $$('.filter-button').forEach(button => button.addEventListener('click', () => {
    $$('.filter-button').forEach(item => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', item === button ? 'true' : 'false'); });
    renderProjects(button.dataset.filter);
  }));

  // Photo controls and random moment
  $('.random-photo').addEventListener('click', () => {
    if (!state.photos.length) return;
    let index = Math.floor(Math.random() * state.photos.length);
    if (state.photos.length > 1 && index === state.currentPhoto) index = (index + 1) % state.photos.length;
    openPhoto(index);
  });
  $('.viewer-close').addEventListener('click', () => closeModal($('#photo-viewer')));
  $('.viewer-prev').addEventListener('click', () => movePhoto(-1));
  $('.viewer-next').addEventListener('click', () => movePhoto(1));
  $('#photo-viewer').addEventListener('click', event => { if (event.target === $('#photo-viewer')) closeModal($('#photo-viewer')); });

  // Project dialog
  $('.modal-close').addEventListener('click', () => closeModal($('#project-modal')));
  $('#project-modal').addEventListener('click', event => { if (event.target === $('#project-modal')) closeModal($('#project-modal')); });

  // Vibe engineering details and random ideas
  $('.diary-toggle').addEventListener('click', event => {
    const button = event.currentTarget, list = $('#diary-list'), expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    button.querySelector('span').textContent = expanded ? '＋' : '−';
    list.hidden = expanded;
  });
  $('.random-idea').addEventListener('click', () => {
    if (!state.experiments.length) return;
    const idea = state.experiments[Math.floor(Math.random() * state.experiments.length)];
    const result = $('.random-result');
    result.animate?.([{opacity: 0, transform: 'translateY(4px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: reducedMotion ? 1 : 350, easing: 'ease-out'});
    result.textContent = `“${idea.idea || idea.title}”`;
  });

  // Mobile nav
  $('.menu-toggle').addEventListener('click', () => $('.mobile-menu').classList.contains('is-open') ? closeMobileMenu() : openMobileMenu());
  $$('.mobile-menu a').forEach(link => link.addEventListener('click', () => closeMobileMenu(false)));
  $('.mobile-menu').addEventListener('click', event => { if (event.target === $('.mobile-menu')) closeMobileMenu(); });

  // Music player
  $('#music-launch').addEventListener('click', () => $('#music-panel').classList.contains('is-open') ? closeMusic() : openMusic());
  $('.music-close').addEventListener('click', () => closeMusic());
  $('#play-track').addEventListener('click', togglePlayback);
  $('#previous-track').addEventListener('click', () => playTrack(state.currentTrack - 1, true));
  $('#next-track').addEventListener('click', () => playTrack(state.currentTrack + 1, true));
  $('#audio-player').addEventListener('play', () => {
    $('#play-track').textContent = 'Ⅱ'; $('#play-track').setAttribute('aria-label', 'Pause music');
    $('#music-launch-status').textContent = 'ON'; $('#music-launch').classList.add('is-playing'); $('#music-panel').classList.add('is-playing');
  });
  $('#audio-player').addEventListener('pause', () => {
    $('#play-track').textContent = '▶'; $('#play-track').setAttribute('aria-label', 'Play music');
    $('#music-launch-status').textContent = 'OFF'; $('#music-launch').classList.remove('is-playing'); $('#music-panel').classList.remove('is-playing');
  });
  $('#audio-player').addEventListener('timeupdate', event => {
    const audio = event.currentTarget;
    $('#current-time').textContent = formatTime(audio.currentTime);
    if (Number.isFinite(audio.duration) && audio.duration) $('#audio-progress').value = String((audio.currentTime / audio.duration) * 100);
  });
  $('#audio-player').addEventListener('loadedmetadata', () => $('#duration-time').textContent = formatTime($('#audio-player').duration));
  $('#audio-player').addEventListener('ended', () => playTrack(state.currentTrack + 1, true));
  $('#audio-player').addEventListener('error', () => { if (state.tracks.length) showToast('Could not load this track. Check the audio path in playlist.json.'); });
  $('#audio-progress').addEventListener('input', event => {
    const audio = $('#audio-player');
    if (Number.isFinite(audio.duration)) audio.currentTime = (Number(event.target.value) / 100) * audio.duration;
  });

  // Command palette
  $('.desktop-menu').addEventListener('click', openCommandMenu);
  $$('.command-options button').forEach(button => button.addEventListener('click', () => commandAction(button.dataset.command)));
  $('.command-close').addEventListener('click', () => closeModal($('#command-overlay')));
  $('#command-overlay').addEventListener('click', event => { if (event.target === $('#command-overlay')) closeModal($('#command-overlay')); });
  $('#command-search').addEventListener('input', event => {
    const query = event.target.value.toLowerCase().trim();
    $$('.command-options button').forEach(button => button.hidden = !button.textContent.toLowerCase().includes(query));
  });
  $('#command-search').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); $('.command-options button:not([hidden])')?.click(); }
  });
  $('#command-overlay').addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = $$('.command-options button:not([hidden])');
    if (!buttons.length) return;
    event.preventDefault();
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) buttons[event.key === 'ArrowDown' ? 0 : buttons.length - 1].focus();
    else buttons[(current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
  });

  // Shortcuts, easter eggs and keyboard behavior
  $('.shortcut-open').addEventListener('click', () => showModal($('#shortcuts-overlay'), $('.shortcuts-close')));
  $('.shortcuts-close').addEventListener('click', () => closeModal($('#shortcuts-overlay')));
  $('#shortcuts-overlay').addEventListener('click', event => { if (event.target === $('#shortcuts-overlay')) closeModal($('#shortcuts-overlay')); });
  $('#hero-name').addEventListener('click', () => {
    if (finePointer && !state.transformed) setHeroName(true);
    else toggleHeroName();
  });
  if (finePointer) {
    $('#hero-name').addEventListener('pointerenter', () => setHeroName(true));
    $('#hero-name').addEventListener('pointerleave', () => setHeroName(false));
  }
  $('.wordmark').addEventListener('click', () => {
    state.logoClicks++;
    clearTimeout(state.logoTimer);
    state.logoTimer = window.setTimeout(() => state.logoClicks = 0, 1700);
    if (state.logoClicks >= 5) { state.logoClicks = 0; showToast('BUILD 026 · CODED WITH CURIOSITY.'); }
  });
  document.addEventListener('keydown', event => {
    if (state.activeModal) trapFocus(event, state.activeModal);
    else if ($('#music-panel').classList.contains('is-open') && window.matchMedia('(max-width: 680px)').matches) trapFocus(event, $('#music-panel'));
    const target = event.target;
    const typing = target.matches('input,textarea,select,[contenteditable="true"]');
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openCommandMenu(); return; }
    if (event.key === 'Escape') {
      if ($('.mobile-menu').classList.contains('is-open')) closeMobileMenu();
      else if (state.activeModal) closeModal(state.activeModal);
      else if ($('#music-panel').classList.contains('is-open')) closeMusic();
      return;
    }
    if (typing) return;
    if (event.key === '?' || (event.shiftKey && event.key === '/')) { showModal($('#shortcuts-overlay'), $('.shortcuts-close')); return; }
    const nativeControl = target.matches('button,a,[role="button"]');
    if (event.code === 'Space' && !nativeControl) { event.preventDefault(); togglePlayback(); return; }
    if (state.activeModal === $('#photo-viewer')) {
      if (event.key === 'ArrowLeft') movePhoto(-1);
      if (event.key === 'ArrowRight') movePhoto(1);
    } else if ($('#music-panel').classList.contains('is-open')) {
      if (event.key === 'ArrowLeft') playTrack(state.currentTrack - 1, true);
      if (event.key === 'ArrowRight') playTrack(state.currentTrack + 1, true);
    }
  });

  // Pointer details, magnetic response, and mobile photo swipes
  if (finePointer) {
    document.body.classList.add('cursor-enabled');
    document.addEventListener('pointermove', event => {
      const cursor = $('.cursor');
      cursor.style.transform = `translate(${event.clientX}px,${event.clientY}px)`;
      cursor.classList.add('is-visible');
      document.documentElement.style.setProperty('--mx', `${event.clientX}px`);
      document.documentElement.style.setProperty('--my', `${event.clientY}px`);
    }, {passive: true});
    document.addEventListener('pointerleave', () => $('.cursor').classList.remove('is-visible'));
    bindCursorTargets();
    $$('.interactive').forEach(element => {
      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        const dx = (event.clientX - rect.left - rect.width / 2) / rect.width;
        const dy = (event.clientY - rect.top - rect.height / 2) / rect.height;
        element.style.transform = `translate(${dx * 4}px, ${dy * 4}px)`;
      });
      element.addEventListener('pointerleave', () => element.style.transform = '');
    });
  }
  let touchStartY = 0, touchStartX = 0;
  $('#photo-viewer').addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; touchStartY = event.changedTouches[0].clientY; }, {passive: true});
  $('#photo-viewer').addEventListener('touchend', event => {
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) movePhoto(dx < 0 ? 1 : -1);
  }, {passive: true});
  $('#music-panel').addEventListener('touchstart', event => { touchStartY = event.changedTouches[0].clientY; }, {passive: true});
  $('#music-panel').addEventListener('touchend', event => {
    const dy = event.changedTouches[0].clientY - touchStartY;
    if (dy > 85 && window.matchMedia('(max-width: 680px)').matches) closeMusic();
  }, {passive: true});

  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { onScroll(); scrollQueued = false; });
  }, {passive: true});
  window.addEventListener('resize', updateScrollLock, {passive: true});
  updateClock();
  window.setInterval(updateClock, 30000);
  onScroll();
  setupReveal();
  setupNavObserver();

  Promise.all([
    loadJSON('data/projects.json'), loadJSON('data/photography.json'), loadJSON('data/experiments.json'), loadJSON('data/playlist.json')
  ]).then(([projects, photos, experiments, tracks]) => {
    state.projects = projects;
    state.photos = photos;
    state.experiments = experiments;
    state.tracks = tracks.filter(track => track && typeof track.src === 'string' && track.src.trim());
    renderProjects();
    renderPhotos();
    renderExperiments();
    renderPlaylist();
  });
})();
