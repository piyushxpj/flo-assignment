import './sidebar-mascot.js';

const groups = {
  primary: [['home', 'Home'], ['ask-flo', 'Ask Flo']],
  practice: [['sessions', 'Sessions'], ['roleplay', 'Roleplay'], ['workshops', 'Workshops'], ['scenario', 'Scenario']],
  secondary: [['library', 'Library'], ['flopod', 'Flopod'], ['mindmap', 'Mindmap'], ['evaluator', 'Evaluator'], ['progress', 'Progress']],
};
const routes = new Map(Object.values(groups).flat());
const app = document.querySelector('.app');
const collapseToggle = document.querySelector('.collapse-toggle');
const practiceToggle = document.querySelector('.practice-toggle');
const practiceLinks = document.querySelector('#practice-links');
const content = document.querySelector('#content');
const navigation = document.querySelector('#navigation');
const highlight = document.createElement('div');
highlight.className = 'selection-highlight is-positioning';
highlight.setAttribute('aria-hidden', 'true');
navigation.prepend(highlight);
let highlightReady = false;

function positionHighlight(animate = true) {
  const active = navigation.querySelector('[aria-current="page"]');
  if (!active || !active.getClientRects().length || (practiceLinks.inert && practiceLinks.contains(active))) {
    highlight.style.opacity = '0';
    highlightReady = false;
    return;
  }
  const parent = navigation.getBoundingClientRect();
  const rect = active.getBoundingClientRect();
  highlight.classList.toggle('is-positioning', !animate || !highlightReady);
  highlight.style.transform = `translate3d(${rect.left - parent.left}px, ${rect.top - parent.top + navigation.scrollTop}px, 0) scaleX(${rect.width / highlight.offsetWidth})`;
  highlight.style.opacity = '1';
  highlightReady = true;
}
document.addEventListener('pointerdown', () => app.classList.remove('keyboard-input'));
document.addEventListener('keydown', () => app.classList.add('keyboard-input'));

for (const [group, links] of Object.entries(groups)) {
  const container = document.querySelector(`[data-links="${group}"]`);
  for (const [id, label] of links) {
    const link = document.createElement('a');
    link.className = 'nav-item';
    link.href = `#${id}`;
    link.title = label;
    link.setAttribute('aria-label', label);
    link.innerHTML = `<span class="nav-icon" style="--icon:url('/assets/${id}-mask.svg')" aria-hidden="true"></span><span class="nav-label">${label}</span>`;
    container.append(link);
  }
}

const mobileNavigation = matchMedia('(max-width: 640px)');
const sidebarBackdrop = document.createElement('button');
sidebarBackdrop.className = 'sidebar-backdrop';
sidebarBackdrop.setAttribute('aria-label', 'Close navigation');
sidebarBackdrop.hidden = true;
app.append(sidebarBackdrop);
function syncMobileNavigation() {
  const overlay = mobileNavigation.matches && !app.classList.contains('is-collapsed') && !app.classList.contains('is-call');
  sidebarBackdrop.hidden = !overlay;
  content.inert = overlay;
}
function setCollapsed(collapsed) {
  app.classList.toggle('is-collapsed', collapsed);
  document.querySelector('.brand').inert = collapsed;
  collapseToggle.setAttribute('aria-expanded', String(!collapsed));
  collapseToggle.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} sidebar`);
  collapseToggle.title = `${collapsed ? 'Expand' : 'Collapse'} sidebar`;
  syncMobileNavigation();
  try { sessionStorage.setItem('flo-sidebar-collapsed', String(collapsed)); } catch { /* Storage can be unavailable in private contexts. */ }
}
let storedCollapse;
try { storedCollapse = sessionStorage.getItem('flo-sidebar-collapsed'); } catch { /* Use viewport default. */ }
setCollapsed(mobileNavigation.matches || storedCollapse === 'true');
mobileNavigation.addEventListener('change', () => { if (mobileNavigation.matches) setCollapsed(true); else syncMobileNavigation(); });
sidebarBackdrop.addEventListener('click', () => { setCollapsed(true); collapseToggle.focus(); });
navigation.addEventListener('click', event => { if (mobileNavigation.matches && event.target.closest('a')) setCollapsed(true); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !sidebarBackdrop.hidden) { setCollapsed(true); collapseToggle.focus(); }
});
collapseToggle.addEventListener('click', () => setCollapsed(!app.classList.contains('is-collapsed')));

practiceToggle.addEventListener('click', () => {
  const expanded = practiceToggle.getAttribute('aria-expanded') === 'true';
  practiceToggle.setAttribute('aria-expanded', String(!expanded));
  practiceLinks.inert = expanded;
  practiceLinks.setAttribute('aria-hidden', String(expanded));
  document.querySelector('.practice-group').classList.toggle('is-closed', expanded);
  positionHighlight(false);
});

function navigate() {
  const requested = location.hash.slice(1);
  if (requested === 'content') return;
  const inCall = requested === 'roleplay-call';
  const route = routes.has(requested) ? requested : 'roleplay';
  const label = routes.get(route);
  for (const link of document.querySelectorAll('.nav-item[href]')) {
    if (link.hash === `#${route}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  content.setAttribute('aria-label', label);
  content.classList.toggle('is-roleplay', route === 'roleplay' && !inCall);
  content.classList.toggle('is-call', inCall);
  app.classList.toggle('is-call', inCall);
  syncMobileNavigation();
  document.querySelector('.sidebar').hidden = inCall;
  document.title = `${label} · Flo`;
  const panel = document.querySelector('.route-content');
  panel.hidden = route === 'roleplay';
  document.querySelector('.roleplay-screen').hidden = route !== 'roleplay' || inCall;
  panel.querySelector('h1').textContent = label;
  panel.querySelector('p').textContent = `${label} workspace`;
  document.querySelector('#announcement').textContent = `${label} selected`;
  positionHighlight();
}
window.addEventListener('hashchange', navigate);
navigate();
// Keep the highlight attached to its row during sidebar resizing and disclosure changes.
const layoutObserver = new ResizeObserver(() => positionHighlight(false));
layoutObserver.observe(navigation);
layoutObserver.observe(document.querySelector('.practice-reveal'));

const feedbackTrigger = document.querySelector('.feedback-trigger');
const feedbackPopup = document.querySelector('#feedback-popup');
const feedbackForm = document.querySelector('#feedback-form');
const feedbackMessage = document.querySelector('#feedback-message');
const feedbackStatus = document.querySelector('.feedback-status');
let feedbackCloseTimer;
const feedbackFooter = document.querySelector('.sidebar-footer');
function positionFeedback() {
  // The form lives in the footer flow, so navigation yields space above it.
}
function closeFeedback(restoreFocus = false) {
  feedbackTrigger.setAttribute('aria-expanded', 'false');
  feedbackPopup.classList.remove('is-open');
  feedbackPopup.inert = true;
  clearTimeout(feedbackCloseTimer);
  const instant = matchMedia('(prefers-reduced-motion: reduce)').matches || app.classList.contains('keyboard-input');
  const finishClose = () => {
    feedbackPopup.hidden = true;
    feedbackFooter.classList.remove('feedback-open');
    if (restoreFocus) feedbackTrigger.focus();
  };
  if (instant) finishClose();
  else feedbackCloseTimer = setTimeout(finishClose, 180);
}
feedbackTrigger.addEventListener('click', () => {
  if (feedbackTrigger.getAttribute('aria-expanded') === 'true') { closeFeedback(); return; }
  clearTimeout(feedbackCloseTimer);
  if (app.classList.contains('is-collapsed')) setCollapsed(false);
  feedbackFooter.classList.add('feedback-open');
  feedbackPopup.hidden = false;
  feedbackPopup.inert = false;
  feedbackTrigger.setAttribute('aria-expanded', 'true');
  feedbackStatus.textContent = '';
  positionFeedback();
  // Establish the starting frame before enabling the interruptible CSS transition.
  feedbackPopup.getBoundingClientRect();
  feedbackPopup.classList.add('is-open');
  feedbackMessage.focus({ preventScroll: true });
});
document.querySelector('.feedback-close').addEventListener('click', () => closeFeedback(true));
document.addEventListener('pointerdown', event => {
  if (!feedbackPopup.hidden && !feedbackPopup.contains(event.target) && !feedbackTrigger.contains(event.target)) closeFeedback();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !feedbackPopup.hidden) { event.preventDefault(); closeFeedback(true); }
});
feedbackMessage.addEventListener('input', () => feedbackMessage.setCustomValidity(''));
feedbackForm.addEventListener('submit', event => {
  event.preventDefault();
  const message = feedbackMessage.value.trim();
  if (!message) {
    feedbackMessage.setCustomValidity('Please enter your feedback.');
    feedbackMessage.reportValidity();
    return;
  }
  try {
    const stored = JSON.parse(localStorage.getItem('flo-feedback') || '[]');
    if (!Array.isArray(stored)) throw new Error('Invalid feedback storage');
    stored.push({ message, createdAt: new Date().toISOString() });
    localStorage.setItem('flo-feedback', JSON.stringify(stored));
    feedbackForm.reset();
    feedbackStatus.textContent = 'Thank you! Your feedback is saved on this device.';
  } catch {
    feedbackStatus.textContent = 'Could not save your feedback. Please try again.';
  }
});
