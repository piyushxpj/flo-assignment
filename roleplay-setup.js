import { ROLEPLAY_STEPS, suggestionsFor, validAnswer, defaultAnswer, createRoleplayConfig } from './roleplay-setup-model.js';

const icons = {
  left: '<img class="setup-prev-icon" src="/assets/setup-prev.svg" alt="" />',
  right: '<img src="/assets/setup-next.svg" alt="" />',
  custom: '<img src="/assets/setup-custom.svg" alt="" />',
  edit: '<img src="/assets/setup-edit.svg" alt="" />',
};
const labels = { yourRole: 'Your role', floRole: 'Flo’s role', duration: 'Time budget', mode: 'Mode' };

export function mountRoleplaySetup({ screen, composer, prompt, onPromptChange, onOpen, onCreate }) {
  const header = screen.querySelector('.roleplay-intro');
  const heading = header.querySelector('h1');
  const intro = header.querySelector('p');
  const original = { heading: heading.textContent, intro: intro.textContent };
  const suggestions = screen.querySelector('.roleplay-suggestions');
  const divider = screen.querySelector('.roleplay-or');
  const composerWrap = screen.querySelector('.composer-with-update');
  const send = composer.querySelector('.send-scenario');
  const region = document.createElement('section');
  region.className = 'roleplay-setup';
  region.hidden = true;
  region.setAttribute('aria-label', 'Roleplay setup');
  region.innerHTML = `
    <div class="setup-card">
      <div class="setup-card-header">
        <div class="setup-question-heading">
          <h2 id="setup-question" tabindex="-1"></h2>
          <p class="setup-description" id="setup-description"></p>
        </div>
        <div class="setup-navigation">
          <button type="button" class="setup-icon" data-setup="back" aria-label="Previous question">${icons.left}</button>
          <span class="setup-progress" aria-live="polite"></span>
          <button type="button" class="setup-icon" data-setup="forward" aria-label="Next question">${icons.right}</button>
        </div>
      </div>
      <form class="setup-form" novalidate>
        <div class="setup-form-body">
          <div class="setup-response-list">
            <div class="setup-step"></div>
            <label class="setup-custom">
              <span class="setup-number" aria-hidden="true">4</span>
              ${icons.custom}<input id="setup-custom" maxlength="80" autocomplete="off" />
            </label>
          </div>
          <div class="setup-actions">
            <button class="setup-skip" type="button" data-setup="skip">Skip</button>
            <button class="setup-next" type="submit">Next</button>
          </div>
        </div>
        <p id="setup-error" class="setup-error" role="alert" hidden></p>
      </form>
      <div class="setup-review" hidden></div>
    </div>
    <button class="setup-scenario-bar" type="button" aria-label="Edit scenario"><span></span>${icons.edit}</button>
    <form class="setup-scenario-editor" hidden>
      <label class="sr-only" for="setup-scenario-text">Your roleplay scenario</label>
      <textarea id="setup-scenario-text" rows="2" maxlength="2000" required></textarea>
      <div class="setup-actions"><button type="button" class="setup-skip" data-setup="cancel-edit">Cancel</button><button type="submit" class="setup-next">Save scenario</button></div>
    </form>`;
  composerWrap.before(region);
  const card = region.querySelector('.setup-card');
  const step = region.querySelector('.setup-step');
  const form = region.querySelector('.setup-form');
  const review = region.querySelector('.setup-review');
  const customWrap = region.querySelector('.setup-custom');
  const custom = region.querySelector('#setup-custom');
  const back = region.querySelector('[data-setup="back"]');
  const forward = region.querySelector('[data-setup="forward"]');
  const skip = region.querySelector('[data-setup="skip"]');
  const next = region.querySelector('.setup-next');
  const error = region.querySelector('.setup-error');
  const questionHeading = region.querySelector('.setup-question-heading');
  const questionTitle = region.querySelector('#setup-question');
  const questionDescription = region.querySelector('#setup-description');
  const scenarioBar = region.querySelector('.setup-scenario-bar');
  const scenarioEditor = region.querySelector('.setup-scenario-editor');
  const scenarioText = region.querySelector('#setup-scenario-text');
  let state = null;
  let returnFocus = prompt;
  let transitions = [];
  let outgoingLayers = [];
  let measuredWidth = 0;

  function question(index = state.index) {
    const key = ROLEPLAY_STEPS[index];
    return {
      yourRole: { title: 'Who would you like to be?', description: 'Choose your role in this conversation.', options: state.suggestions.roles, custom: 'Write your own role', customLabel: 'Your custom role' },
      floRole: { title: 'Who should Flo be?', description: 'Flo will stay in character and respond from this perspective.', options: state.suggestions.flo, custom: 'Write Flo’s role', customLabel: 'Flo’s custom role' },
      duration: { title: 'How much time do you have?', description: 'Give yourself enough time to settle into the conversation.', options: ['10', '20', '30'], custom: 'Custom minutes · 1–60', customLabel: 'Custom duration in minutes, from 1 to 60' },
      mode: { title: 'How would you like to roleplay?', description: 'Choose the kind of support you want from Flo.', options: ['Practice', 'Graded'], details: ['Room to explore, with hints when you need them.', 'An uninterrupted session, followed by a scored debrief.'] },
    }[key];
  }
  function answer() { return state.answers[ROLEPLAY_STEPS[state.index]] || ''; }
  function syncControls() {
    const valid = validAnswer(ROLEPLAY_STEPS[state.index], answer());
    next.disabled = false;
    forward.disabled = !valid;
    for (const radio of step.querySelectorAll('input[type="radio"]')) radio.checked = radio.value === answer();
    customWrap.classList.toggle('has-answer', Boolean(custom.value.trim()));
    error.hidden = true;
    custom.removeAttribute('aria-invalid');
  }
  function clearTransition() {
    transitions.forEach(animation => animation.cancel());
    outgoingLayers.forEach(layer => layer.remove());
    transitions = [];
    outgoingLayers = [];
  }
  function snapshotQuestion() {
    clearTransition();
    if (region.hidden || form.hidden || !questionTitle.textContent ||
        matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.querySelector('.app').classList.contains('keyboard-input')) return [];
    return [questionHeading, region.querySelector('.setup-response-list')].map(element => {
      const layer = element.cloneNode(true);
      layer.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      layer.classList.add('setup-fade-layer');
      layer.inert = true;
      layer.setAttribute('aria-hidden', 'true');
      const bounds = element.getBoundingClientRect();
      const origin = card.getBoundingClientRect();
      Object.assign(layer.style, {
        left: `${bounds.left - origin.left - card.clientLeft}px`,
        top: `${bounds.top - origin.top - card.clientTop}px`,
        width: `${bounds.width}px`, height: `${bounds.height}px`,
      });
      return layer;
    });
  }
  function animateQuestion(layers) {
    if (!layers.length || state.index === 4) return;
    outgoingLayers = layers;
    layers.forEach(layer => {
      card.append(layer);
      const animation = layer.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 100, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards',
      });
      animation.onfinish = () => layer.remove();
      transitions.push(animation);
    });
    [questionHeading, region.querySelector('.setup-response-list')].forEach(element => {
      transitions.push(element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 180, delay: 40, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards',
      }));
    });
  }
  // Measure every question at the actual container width before the first paint.
  // Reserve the largest header/body so wrapping and the shorter mode step cannot move the card.
  function measureQuestions() {
    if (!state || region.hidden || state.index === 4) return;
    const width = card.getBoundingClientRect().width;
    if (!width) return;
    measuredWidth = width;
    const probe = card.cloneNode(true);
    probe.className = 'setup-card setup-measure';
    probe.style.width = `${width}px`;
    probe.inert = true;
    probe.setAttribute('aria-hidden', 'true');
    probe.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    probe.querySelectorAll('.setup-fade-layer').forEach(node => node.remove());
    region.append(probe);
    let headerHeight = 0;
    let bodyHeight = 0;
    ROLEPLAY_STEPS.forEach((key, index) => {
      const q = question(index);
      probe.querySelector('.setup-question-heading h2').textContent = q.title;
      probe.querySelector('.setup-description').textContent = q.description;
      const choices = probe.querySelector('.setup-choices');
      choices.replaceChildren();
      q.options.forEach((value, optionIndex) => {
        const label = document.createElement('label');
        label.className = 'setup-option';
        const number = document.createElement('span');
        number.className = 'setup-number'; number.textContent = optionIndex + 1;
        const copy = document.createElement('span'); copy.className = 'setup-option-copy';
        const text = document.createElement('span');
        text.textContent = key === 'duration' ? `${value} minutes` : value;
        copy.append(text);
        if (q.details) {
          const detail = document.createElement('small'); detail.textContent = q.details[optionIndex]; copy.append(detail);
        }
        label.append(number, copy); choices.append(label);
      });
      probe.querySelector('.setup-custom').hidden = !q.custom;
      // Review is the widest next-action label during the four questions.
      probe.querySelector('.setup-next').textContent = 'Review';
      headerHeight = Math.max(headerHeight, probe.querySelector('.setup-card-header').getBoundingClientRect().height);
      bodyHeight = Math.max(bodyHeight, probe.querySelector('.setup-form-body').getBoundingClientRect().height);
    });
    probe.remove();
    card.style.setProperty('--setup-header-height', `${Math.ceil(headerHeight)}px`);
    card.style.setProperty('--setup-body-height', `${Math.ceil(bodyHeight)}px`);
  }
  function render(focus = true, fade = true) {
    const layers = fade ? snapshotQuestion() : (clearTransition(), []);
    const isReview = state.index === 4;
    form.hidden = isReview;
    review.hidden = !isReview;
    composerWrap.hidden = true;
    questionHeading.hidden = false;
    scenarioBar.hidden = false;
    scenarioEditor.hidden = true;
    scenarioBar.querySelector('span').textContent = state.scenario;
    scenarioBar.title = state.scenario;
    error.hidden = true;
    back.disabled = state.created;
    back.setAttribute('aria-label', state.index === 0 ? 'Back to roleplays' : 'Previous question');
    forward.hidden = isReview;
    back.hidden = isReview;
    const progress = region.querySelector('.setup-progress');
    progress.hidden = isReview;
    progress.textContent = isReview ? '' : `${state.index + 1} of 4`;
    region.querySelector('.setup-card').classList.toggle('is-review', isReview);
    if (isReview) {
      renderReview();
    } else {
      const q = question();
      const key = ROLEPLAY_STEPS[state.index];
      step.replaceChildren();
      questionTitle.textContent = q.title;
      questionDescription.textContent = q.description;
      const choices = document.createElement('div');
      choices.className = 'setup-choices';
      choices.setAttribute('role', 'radiogroup');
      choices.setAttribute('aria-labelledby', questionTitle.id);
      choices.setAttribute('aria-describedby', questionDescription.id);
      q.options.forEach((value, index) => {
        const label = document.createElement('label');
        label.className = 'setup-option';
        const input = document.createElement('input');
        input.type = 'radio'; input.name = 'setup-choice'; input.value = value;
        const number = document.createElement('span');
        number.className = 'setup-number'; number.textContent = index + 1; number.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span'); text.className = 'setup-option-copy';
        const name = document.createElement('span'); name.textContent = key === 'duration' ? `${value} minutes` : value;
        text.append(name);
        if (q.details) { const detail = document.createElement('small'); detail.textContent = q.details[index]; text.append(detail); }
        label.append(input, number, text); choices.append(label);
        input.addEventListener('change', () => { state.answers[key] = value; custom.value = ''; syncControls(); });
      });
      step.append(choices);
      customWrap.hidden = !q.custom;
      custom.type = key === 'duration' ? 'number' : 'text';
      custom.min = '1'; custom.max = '60'; custom.step = '1';
      custom.placeholder = q.custom || '';
      custom.setAttribute('aria-label', q.customLabel || 'Custom response');
      custom.setAttribute('aria-describedby', 'setup-error');
      custom.value = q.options.includes(answer()) ? '' : answer();
      skip.title = `Use ${defaultAnswer(key, state.suggestions)}${key === 'duration' ? ' minutes' : ''}`;
      next.textContent = state.reviewEditing ? 'Save' : state.index === 3 ? 'Review' : 'Next';
      syncControls();
    }
    animateQuestion(layers);
    if (focus) questionTitle.focus({ preventScroll: true });
  }
  function advance(useDefault = false) {
    const key = ROLEPLAY_STEPS[state.index];
    if (useDefault) state.answers[key] = defaultAnswer(key, state.suggestions);
    if (!validAnswer(key, answer())) {
      error.textContent = key === 'duration' ? 'Choose a time or enter a whole number from 1 to 60.' : key === 'mode' ? 'Choose Practice or Graded to continue.' : 'Choose a role or write your own to continue.';
      error.hidden = false;
      return;
    }
    state.index = state.reviewEditing ? 4 : state.index + 1;
    state.reviewEditing = false;
    render();
  }
  function renderReview() {
    review.replaceChildren();
    questionTitle.textContent = state.created ? 'Your roleplay is ready.' : 'Ready to set the scene?';
    questionDescription.textContent = state.created ? 'Setup preview complete. A live conversation hasn’t started.' : 'A quick check before you create your roleplay.';
    const list = document.createElement('dl'); list.className = 'setup-summary';
    ROLEPLAY_STEPS.forEach((key, index) => {
      const row = document.createElement('div');
      const term = document.createElement('dt'); term.textContent = labels[key];
      const value = document.createElement('dd'); value.textContent = state.answers[key] + (key === 'duration' ? ' minutes' : '');
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'setup-summary-edit'; edit.innerHTML = icons.edit;
      edit.setAttribute('aria-label', `Edit ${labels[key].toLowerCase()}`);
      edit.addEventListener('click', () => { state.created = false; state.reviewEditing = true; state.index = index; composerWrap.hidden = false; render(); });
      row.append(term, value, edit); list.append(row);
    });
    const footer = document.createElement('div'); footer.className = 'setup-review-footer';
    const create = document.createElement('button'); create.className = 'setup-next'; create.type = 'button';
    create.textContent = state.created ? 'Back to roleplays' : 'Create roleplay';
    create.addEventListener('click', () => {
      if (state.created) { close(); return; }
      const config = createRoleplayConfig(state.scenario, state.answers);
      if (!config) return;
      try { sessionStorage.setItem('flo-roleplay-setup', JSON.stringify({ ...config, createdAt: new Date().toISOString() })); } catch { /* The preview also works with storage blocked. */ }
      if (onCreate) { onCreate(config); return; }
      state.created = true; composerWrap.hidden = true; render();
    });
    footer.append(create); review.append(list, footer);
  }
  function close() {
    clearTransition();
    region.hidden = true; screen.classList.remove('setup-active');
    suggestions.hidden = divider.hidden = false; composerWrap.hidden = false;
    heading.textContent = original.heading; intro.textContent = original.intro;
    send.textContent = 'Continue';
    if (!screen.hidden) returnFocus.focus({ preventScroll: true });
  }
  function open(scenario, source = prompt) {
    if (!scenario.trim()) return;
    onOpen?.();
    returnFocus = source;
    if (!state || state.scenario !== scenario.trim()) {
      state = { scenario: scenario.trim(), suggestions: suggestionsFor(scenario), answers: {}, index: 0, created: false };
    } else if (state.created) { state.created = false; state.index = 4; }
    screen.classList.add('setup-active');
    region.hidden = false; suggestions.hidden = divider.hidden = true; composerWrap.hidden = false;
    heading.textContent = 'Let’s set the scene';
    intro.textContent = 'A few details to make this conversation yours.';
    send.textContent = 'Update';
    prompt.value = scenario.trim(); onPromptChange();
    render(true, false);
    measureQuestions();
    region.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  custom.addEventListener('input', () => {
    const key = ROLEPLAY_STEPS[state.index];
    state.answers[key] = custom.value.trim();
    syncControls();
    if (key === 'duration' && custom.value && !validAnswer(key, custom.value)) {
      error.textContent = 'Choose a whole number from 1 to 60 minutes.'; error.hidden = false; custom.setAttribute('aria-invalid', 'true');
    }
  });
  form.addEventListener('submit', event => { event.preventDefault(); advance(); });
  back.addEventListener('click', () => { if (state.index > 0) { state.reviewEditing = false; state.index--; render(); } else close(); });
  forward.addEventListener('click', () => advance());
  skip.addEventListener('click', () => advance(true));
  scenarioBar.addEventListener('click', () => {
    scenarioBar.hidden = true;
    scenarioEditor.hidden = false;
    scenarioText.value = state.scenario;
    scenarioText.focus({ preventScroll: true });
  });
  function cancelScenarioEdit() {
    scenarioEditor.hidden = true;
    scenarioBar.hidden = false;
    scenarioBar.focus({ preventScroll: true });
  }
  region.querySelector('[data-setup="cancel-edit"]').addEventListener('click', cancelScenarioEdit);
  scenarioText.addEventListener('input', () => scenarioText.setCustomValidity(''));
  scenarioEditor.addEventListener('submit', event => {
    event.preventDefault();
    if (!scenarioText.value.trim()) {
      scenarioText.setCustomValidity('Describe the situation you want to roleplay.');
      scenarioText.reportValidity();
      return;
    }
    open(scenarioText.value, returnFocus);
  });
  region.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); if (!scenarioEditor.hidden) cancelScenarioEdit(); else close(); return; }
    if (event.target === custom || event.target === scenarioText || event.metaKey || event.ctrlKey || event.altKey || state.index === 4) return;
    if (event.key === '4' && !customWrap.hidden) { event.preventDefault(); custom.focus(); return; }
    if (/^[1-3]$/.test(event.key)) {
      const input = step.querySelectorAll('input[type="radio"]')[Number(event.key) - 1];
      if (input) { event.preventDefault(); input.click(); input.focus(); }
    }
  });
  new ResizeObserver(() => {
    if (!region.hidden && Math.abs(card.getBoundingClientRect().width - measuredWidth) > .5) {
      clearTransition();
      measureQuestions();
    }
  }).observe(card);
  document.fonts.ready.then(measureQuestions);
  return { open, close };
}
