import { mountRoleplaySetup } from './roleplay-setup.js';
import { mountRoleplayCall } from './roleplay-call.js';

const examples = [
  'an architecture review.',
  'handling a difficult code review.',
  'resolving a customer escalation.',
  'giving tough 1:1 feedback.',
  'defending my project in an oral exam.',
  'negotiating a better salary.',
];
const screen = document.querySelector('.roleplay-screen');
const composer = document.querySelector('.roleplay-composer');
const prompt = document.querySelector('#practice-prompt');
const rotating = document.querySelector('.rotating-prompt');
const status = document.querySelector('.roleplay-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let exampleIndex = 0;
let typingTimer;
let characterIndex = 0;
let deleting = false;
function fitPrompt() {
  // Let the complete card copy remain visible, including on narrow screens.
  const input = prompt.parentElement;
  input.style.height = '0px';
  input.style.height = `${Math.min(240, prompt.scrollHeight)}px`;
}
function updateInput() {
  prompt.parentElement.classList.toggle('has-value', Boolean(prompt.value));
  prompt.setCustomValidity('');
  fitPrompt();
  syncTyping();
}
function showStatus(message) {
  status.textContent = message;
  status.hidden = false;
}
function canType() {
  return !document.hidden && !screen.hidden && !prompt.value && document.activeElement !== prompt && !reducedMotion.matches;
}
function typeNextCharacter() {
  if (!canType()) return;
  const example = examples[exampleIndex];
  characterIndex += deleting ? -1 : 1;
  rotating.textContent = example.slice(0, characterIndex);
  let delay = deleting ? 30 : 55;
  if (!deleting && characterIndex === example.length) {
    deleting = true;
    delay = 1600;
  } else if (deleting && characterIndex === 0) {
    deleting = false;
    exampleIndex = (exampleIndex + 1) % examples.length;
    delay = 350;
  }
  typingTimer = setTimeout(typeNextCharacter, delay);
}
function syncTyping() {
  clearTimeout(typingTimer);
  if (reducedMotion.matches) {
    rotating.textContent = examples[exampleIndex];
    characterIndex = examples[exampleIndex].length;
    deleting = true;
  } else if (canType()) {
    typingTimer = setTimeout(typeNextCharacter, 450);
  }
}
rotating.textContent = reducedMotion.matches ? examples[0] : '';
syncTyping();
prompt.addEventListener('focus', syncTyping);
prompt.addEventListener('blur', syncTyping);
document.addEventListener('visibilitychange', syncTyping);
window.addEventListener('hashchange', syncTyping);
reducedMotion.addEventListener('change', syncTyping);
prompt.addEventListener('input', updateInput);
let composerWidth = 0;
new ResizeObserver(entries => {
  const width = entries[0].contentRect.width;
  if (width !== composerWidth) { composerWidth = width; fitPrompt(); }
}).observe(composer);
const call = mountRoleplayCall(document.querySelector('#content'), { onReturn: () => setup.close() });
const setup = mountRoleplaySetup({
  screen, composer, prompt, onPromptChange: updateInput,
  onOpen: () => { status.hidden = true; if (listening) recognition.stop(); },
  onCreate: config => call.open(config),
});
document.querySelectorAll('[data-scenario]').forEach(button => {
  button.addEventListener('click', () => {
    if (listening) recognition.abort();
    const title = button.dataset.scenarioTitle || button.querySelector('.scenario-title').textContent.trim();
    const description = button.querySelector('.scenario-description').textContent.trim();
    prompt.value = `${title}\n${description}`;
    status.hidden = true;
    updateInput();
    // Review or edit the prompt first; only submitting Continue opens setup.
    composer.querySelector('.send-scenario').focus({ preventScroll: true });
    composer.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });
});
const viewAll = document.querySelector('.view-scenarios');
viewAll.addEventListener('click', () => {
  const expanded = viewAll.getAttribute('aria-expanded') === 'true';
  viewAll.setAttribute('aria-expanded', String(!expanded));
  document.querySelector('#more-scenarios').hidden = expanded;
  viewAll.textContent = expanded ? 'View All →' : 'Show Less ↑';
});
composer.addEventListener('submit', event => {
  event.preventDefault();
  const message = prompt.value.trim();
  if (!message) { prompt.setCustomValidity('Describe a situation you want to practice.'); prompt.reportValidity(); return; }
  setup.open(message);
});
const talkButton = document.querySelector('.talk-to-flo');
let recognition;
let listening = false;
talkButton.addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { showStatus('Voice input is not supported in this browser. Type your scenario above.'); return; }
  if (listening) { recognition.stop(); return; }
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.onstart = () => { listening = true; talkButton.querySelector('span').textContent = 'Listening…'; talkButton.setAttribute('aria-pressed', 'true'); };
  recognition.onresult = event => { prompt.value = event.results[0][0].transcript; updateInput(); status.hidden = true; };
  recognition.onerror = () => showStatus('Voice input could not start. You can type your scenario instead.');
  recognition.onend = () => { listening = false; talkButton.querySelector('span').textContent = 'Talk to Flo'; talkButton.setAttribute('aria-pressed', 'false'); };
  try { recognition.start(); } catch { showStatus('Voice input is unavailable. You can type your scenario instead.'); }
});
window.addEventListener('hashchange', () => { if (screen.hidden && listening) recognition.stop(); });
