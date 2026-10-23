import { mountFloOrb } from './flo-orb.js';
import { seniorDesignerInterview } from './roleplay-interview-demo.js';

function scenarioDetails(config) {
  const scenario = config.scenario;
  if (/senior.*design|design.*interview|interview.*design/i.test(scenario)) return seniorDesignerInterview;
  if (/architect|system design/i.test(scenario)) return {
    title: 'Architecture Review',
    opening: 'Walk me through the system you’re proposing. What are the most important constraints, and why did you choose this architecture?',
    response: 'I’d start with the reliability and scale requirements. I chose a modular architecture so we can isolate failures and evolve the busiest parts independently.',
    response2: 'The database would become our first bottleneck. I’d measure the slowest queries, add caching for frequent reads, and load-test that change before considering a more complex split.',
    closing: 'That gives us a clear starting point. How would you roll out that change safely, and which signals would tell you to roll it back?',
    followup: 'Let’s challenge that decision. Where does your design become a bottleneck, and what would you change first if traffic grew tenfold?',
  };
  if (/code review|\bPR\b|pull request/i.test(scenario)) return {
    title: 'Code review pushback',
    opening: 'I’ve reviewed your pull request, and I think this approach needs a rewrite. Walk me through the tradeoffs behind your implementation.',
    response: 'I optimized for a small, reviewable change that fixes the issue safely. I’d like to understand which part of the approach concerns you most before we expand the scope.',
    response2: 'I’d document the boundaries, add coverage around the risky behavior, and ask another teammate to walk through the change. If they struggle to follow it, that’s a signal to simplify.',
    closing: 'Let’s make that concrete. Which part would you simplify first, and how would you keep the current release on schedule?',
    followup: 'My concern is maintainability. How would you show that this approach will still be easy for the team to work with six months from now?',
  };
  if (/customer|escalat|outage/i.test(scenario)) return {
    title: 'Customer escalation',
    opening: 'Our team has been blocked by this outage all morning. Why should we keep trusting your product when this keeps happening?',
    response: 'I understand how disruptive this has been. I want to give you a clear picture of what we know, what we’re doing now, and when you’ll hear from me next.',
    response2: 'I can commit to a named owner and an update every thirty minutes. I’ll also help your team use the workaround we’ve verified, while our engineers work on restoring the service.',
    closing: 'That helps for today. Once service is restored, how will you show us what changed so we can trust that this won’t happen again?',
    followup: 'I appreciate the update, but I need a concrete commitment. What can you promise us today?',
  };
  if (/interview|designer|design.*position/i.test(scenario)) return {
    title: /senior.*design/i.test(scenario) ? 'Interview for a Senior Designer Position in a Startup' : 'Interview practice',
    opening: "Thanks for joining us. To start, tell me about a product you've designed from discovery through launch, and what impact it had.",
    response: 'I designed a product for a Bitcoin liquidity protocol, from early discovery through launch. I worked with the team to simplify the experience and explain complex financial flows clearly.',
    response2: 'We chose clarity over showing every advanced option upfront. I tested the simpler flow with new users, then compared completion rates and the questions people asked before and after the change.',
    closing: 'Tell me about something those sessions revealed that surprised you. How did that insight change the experience you eventually shipped?',
    followup: 'What was the hardest tradeoff you made along the way, and how did you know your design was working?',
  };
  const clean = scenario.replace(/^I want to (?:role ?play|practice)[ .]*/i, '').trim();
  return {
    title: clean.charAt(0).toUpperCase() + clean.slice(1),
    opening: `I’ll take the role of ${config.floRole}. Set the scene for me: what do you want to achieve in this conversation?`,
    response: `As ${config.yourRole}, I want to explain my perspective clearly, understand your concerns, and work toward a useful next step.`,
    response2: 'I’d first ask what concerns you most and acknowledge that tradeoff. Then I’d explain the evidence behind my choice and suggest a small, reversible step we could evaluate together.',
    closing: 'Let’s try that in character. I’m still not convinced the benefit outweighs the risk. What would you say to move the conversation forward?',
    followup: 'What would you say if I disagreed with that approach? Give me a specific example to support your position.',
  };
}

export function mountRoleplayCall(content, { onReturn } = {}) {
  const section = document.createElement('section');
  section.className = 'call-screen'; section.hidden = true;
  section.setAttribute('aria-labelledby', 'call-title');
  section.innerHTML = `
    <header class="call-header">
      <div class="call-heading"><h1 id="call-title" tabindex="-1"></h1>
        <div class="call-tags"><span><img src="/assets/call-roleplay.svg" alt="" />Roleplay</span><span class="call-mode"></span><button class="call-transcript-toggle" type="button" aria-expanded="false" aria-controls="call-history-panel">Show transcript</button></div>
      </div>
      <div class="call-timer"><span>Time Left</span><time>10:00</time></div>
    </header>
    <div class="call-divider" aria-hidden="true"><img src="/assets/call-divider.svg" alt="" /></div>
    <div class="call-workspace">
    <div class="call-live">
    <div class="call-body">
      <div class="call-orb" role="img" aria-label="Flo’s purple voice orb"><canvas aria-hidden="true"></canvas><span class="call-orb-fallback" aria-hidden="true"></span></div>
      <p class="call-speaker" role="status"></p>
      <div class="call-conversation-wrap">
        <div class="call-conversation" tabindex="0" aria-label="Conversation messages">
          <div class="call-transcript" role="log" aria-label="Roleplay conversation" aria-live="off"></div>
        </div>
        <div class="call-transcript-hover" hidden><button class="call-transcript-pill" type="button" aria-expanded="false" aria-controls="call-history-panel">Show transcript</button></div>
      </div>
      <div class="call-announcement sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
    </div>
    <aside class="call-share-preview" aria-label="Screen sharing preview" hidden>
      <div class="call-share-preview-heading"><img src="/assets/call-share.svg" alt="" /><span>Screen sharing preview</span><button type="button" aria-label="Stop screen sharing preview">×</button></div>
      <div class="call-share-window" aria-hidden="true"><i></i><i></i><i></i><div><span></span><span></span><span></span></div></div>
      <p>A demo view. Your screen is not being captured.</p>
    </aside>
    <footer class="call-footer">
      <div class="call-controls">
        <button type="button" class="call-mic" aria-label="Mute microphone" aria-pressed="false" title="Mute microphone (demo)"><svg aria-hidden="true" focusable="false" preserveAspectRatio="none" overflow="visible" style="display: block;" width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<g>
<path d="M6.41667 6.41667C6.41667 3.88537 8.4687 1.83333 11 1.83333C13.5313 1.83333 15.5833 3.88537 15.5833 6.41667V11C15.5833 13.5313 13.5313 15.5833 11 15.5833C8.4687 15.5833 6.41667 13.5313 6.41667 11V6.41667Z" fill="currentColor"/>
<path d="M4.814 12.7113C4.74666 12.4673 4.49425 12.324 4.25024 12.3914C4.00624 12.4588 3.86303 12.7111 3.93037 12.9552C4.74706 15.9142 7.37143 18.1237 10.5417 18.3191V19.7082C10.5417 19.9613 10.7469 20.1666 11 20.1666C11.2532 20.1666 11.4583 19.9613 11.4583 19.7082V18.3191C14.6286 18.1237 17.253 15.9142 18.0697 12.9552C18.1371 12.7111 17.9938 12.4588 17.7499 12.3914C17.5059 12.324 17.2534 12.4673 17.186 12.7113C16.4372 15.4247 13.9507 17.4166 11 17.4166C8.04942 17.4166 5.56287 15.4247 4.814 12.7113Z" fill="currentColor"/>
</g>
</svg></button>
        <button type="button" class="call-share" aria-pressed="false"><img src="/assets/call-share.svg" alt="" /><span>Share screen</span></button>
        <button type="button" class="call-end"><img src="/assets/call-end.svg" alt="" /><span>End the Roleplay</span></button>
      </div>
    </footer>
    </div>
    <aside id="call-history-panel" class="call-history-panel" aria-labelledby="call-history-title" aria-hidden="true" inert>
      <header class="call-history-header"><div class="call-history-heading"><h2 id="call-history-title" tabindex="-1">Transcript</h2><span class="call-history-count">0 messages</span></div><button class="call-history-close" type="button" aria-label="Close transcript"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
      <div class="call-history-scroll" tabindex="0" aria-label="Full conversation transcript">
        <div class="call-history-messages"></div>
      </div>
      <button class="call-history-latest" type="button" hidden><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 4v16m-6-6 6 6 6-6"/></svg>Jump to latest</button>
    </aside>
    </div>
    <section class="call-ended" hidden aria-labelledby="call-ended-title">
      <span class="call-ended-mark" aria-hidden="true">✓</span><h2 id="call-ended-title" tabindex="-1">Roleplay complete</h2>
      <p>You’ve reached the end of this demo conversation.</p>
      <dl><div><dt>Time spent</dt><dd class="call-elapsed"></dd></div><div><dt>Mode</dt><dd class="call-ended-mode"></dd></div></dl>
      <div class="call-ended-actions"><button type="button" class="call-restart">Try again</button><button type="button" class="call-return">Back to roleplays</button></div>
    </section>`;
  content.append(section);
  const $ = selector => section.querySelector(selector);
  let orb;
  let config, details, interval;
  let remaining = 0, elapsed = 0, lastTick = 0, turn = 0;
  let queue = [], activeMessage = null, nextLetterIn = 0, pause = 0;
  let followLatest = true, transcriptOpen = false, followHistory = true;
  let lastHistoryTop = 0, historyTouchY = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const compactCall = matchMedia('(max-width: 760px)');
  const conversation = $('.call-conversation');
  const historyScroll = $('.call-history-scroll');
  let muted = false, sharing = false, ended = false, speaker = 'flo';
  const formatTime = seconds => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;
  function setSpeaker(next) {
    speaker = next;
    $('.call-speaker').textContent = muted && next === 'you' ? 'Microphone off' : next === 'flo' ? 'Flo is speaking' : next === 'you' ? 'You’re speaking'  : 'Ready when you are';
    $('.call-orb').dataset.speaker = next;
    orb?.setState(next === 'flo' ? 'speaking' : next === 'you' && !muted ? 'listening' : 'idle');
  }
  function updateHistory() {
    const hasHistory = conversation.scrollTop > 2;
    $('.call-conversation-wrap').classList.toggle('has-history', hasHistory);
    $('.call-transcript-hover').hidden = !hasHistory || transcriptOpen;
  }
  function updateTranscriptScroll() {
    const above = Math.max(0, historyScroll.scrollTop);
    const below = Math.max(0, historyScroll.scrollHeight - historyScroll.clientHeight - above);
    // Grow each fade with the hidden content, avoiding a sudden edge at either end.
    historyScroll.style.setProperty('--history-fade-top', `${Math.min(32, above)}px`);
    historyScroll.style.setProperty('--history-fade-bottom', `${Math.min(32, below)}px`);
    $('.call-history-latest').hidden = !transcriptOpen || followHistory ||
      historyScroll.scrollHeight - historyScroll.clientHeight - historyScroll.scrollTop < 2;
  }
  function scrollHistoryToLatest(delta = 0) {
    const target = Math.max(0, historyScroll.scrollHeight - historyScroll.clientHeight);
    const distance = target - historyScroll.scrollTop;
    historyScroll.scrollTop = !delta || reducedMotion.matches || Math.abs(distance) < 1
      ? target : historyScroll.scrollTop + distance * (1 - Math.exp(-delta * 14));
    // Record our own movement before the scroll event, so only reader movement
    // can pause following. New text and layout changes must not cancel it.
    lastHistoryTop = historyScroll.scrollTop;
  }
  function pauseHistory() { followHistory = false; updateTranscriptScroll(); }
  function followConversation(delta) {
    if (followLatest) {
      const target = Math.max(0, conversation.scrollHeight - conversation.clientHeight);
      const distance = target - conversation.scrollTop;
      conversation.scrollTop = reducedMotion.matches || Math.abs(distance) < 1
        ? target : conversation.scrollTop + distance * (1 - Math.exp(-delta * 14));
    }
    if (transcriptOpen && followHistory) {
      scrollHistoryToLatest(delta);
    }
    updateHistory();
    updateTranscriptScroll();
  }
  function setTranscriptOpen(value, restoreFocus = false) {
    transcriptOpen = value;
    // Keep the panel mounted so closing can finish its fade and slide.
    $('.call-history-panel').inert = !value;
    $('.call-history-panel').setAttribute('aria-hidden', String(!value));
    section.classList.toggle('is-transcript-open', value);
    $('.call-transcript-pill').setAttribute('aria-expanded', String(value));
    $('.call-transcript-toggle').setAttribute('aria-expanded', String(value));
    $('.call-transcript-toggle').textContent = value ? 'Hide transcript' : 'Show transcript';
    $('.call-body').inert = value && compactCall.matches;
    updateHistory();
    if (value) {
      followHistory = true;
      scrollHistoryToLatest();
      $('#call-history-title').focus({ preventScroll: true });
    } else if (restoreFocus) {
      ($('.call-transcript-toggle').getClientRects().length ? $('.call-transcript-toggle') : $('.call-transcript-hover').hidden ? $('#call-title') : $('.call-transcript-pill')).focus({ preventScroll: true });
    }
    updateTranscriptScroll();
  }
  function beginMessage() {
    const [who, text] = queue[turn];
    setSpeaker(who);
    const row = document.createElement('div'); row.className = `call-message call-message-${who} is-streaming`;
    const avatar = document.createElement('span'); avatar.className = 'call-avatar';
    const image = document.createElement('img'); image.src = `/assets/call-${who === 'flo' ? 'flo' : 'user'}.png`; image.alt = '';
    avatar.append(image);
    const copy = document.createElement('p');
    const label = document.createElement('span'); label.className = 'sr-only';
    label.textContent = who === 'flo' ? `Flo, ${config.floRole}: ` : `You, ${details.yourRole || config.yourRole}: `;
    const textNode = document.createTextNode('');
    copy.append(label, textNode); row.append(avatar, copy);
    $('.call-transcript').append(row);
    const historyMessage = document.createElement('article');
    historyMessage.className = `call-history-message call-history-message-${who}`;
    const historyLabel = document.createElement('h4'); historyLabel.textContent = who === 'flo' ? 'Flo' : 'You';
    const historyCopy = document.createElement('p');
    const historyText = document.createTextNode(''); historyCopy.append(historyText);
    historyMessage.append(historyLabel, historyCopy); $('.call-history-messages').append(historyMessage);
    const count = $('.call-history-messages').children.length;
    $('.call-history-count').textContent = `${count} ${count === 1 ? 'message' : 'messages'}`;
    activeMessage = { row, textNode, historyText, text, label: label.textContent, index: 0 };
    nextLetterIn = 0;
  }
  function advanceConversation(delta) {
    if (turn >= queue.length || (muted && queue[turn][0] === 'you')) return;
    if (pause > 0) { pause -= delta; return; }
    if (!activeMessage) beginMessage();
    const message = activeMessage;
    nextLetterIn -= delta;
    if (reducedMotion.matches) message.index = message.text.length;
    else while (nextLetterIn <= 0 && message.index < message.text.length) {
      const character = message.text[message.index++];
      nextLetterIn += /[.!?]/.test(character) ? .19 : /[,;:]/.test(character) ? .085 : .028;
    }
    message.textNode.data = message.text.slice(0, message.index);
    message.historyText.data = message.textNode.data;
    if (message.index === message.text.length) {
      message.row.classList.remove('is-streaming');
      $('.call-announcement').textContent = message.label + message.text;
      activeMessage = null; turn++;
      pause = reducedMotion.matches ? 3.5 : 1.3;
      setSpeaker(turn < queue.length ? queue[turn][0] : 'idle');
    }
  }
  function setMuted(value) {
    muted = value; $('.call-mic').setAttribute('aria-pressed', String(value));
    $('.call-mic').setAttribute('aria-label', `${value ? 'Unmute' : 'Mute'} microphone`);
    $('.call-mic').title = `${value ? 'Unmute' : 'Mute'} microphone (demo)`;
    setSpeaker(speaker);
  }
  function setSharing(value) {
    sharing = value; $('.call-share').setAttribute('aria-pressed', String(value));
    $('.call-share span').textContent = value ? 'Stop sharing' : 'Share screen';
    $('.call-share-preview').hidden = !value;
  }
  function end() {
    if (ended) return;
    ended = true; $('.call-transcript-toggle').hidden = true; setTranscriptOpen(false); $('.call-workspace').hidden = true; clearInterval(interval); orb?.setActive(false); setSharing(false);
    $('.call-body').hidden = true; $('.call-footer').hidden = true; $('.call-ended').hidden = false;
    $('.call-elapsed').textContent = formatTime(elapsed); $('.call-ended-mode').textContent = config.mode === 'graded' ? 'Graded' : 'Practice';
    $('#call-ended-title').focus({preventScroll:true});
  }
  function tick() {
    const now = performance.now(); const delta = Math.min((now - lastTick) / 1000, 1); lastTick = now;
    if (document.hidden || section.hidden || ended) return;
    remaining = Math.max(0, remaining - delta); elapsed += delta;
    $('.call-timer time').textContent = formatTime(Math.ceil(remaining));
    if (!remaining) { end(); return; }
    advanceConversation(delta);
    followConversation(delta);
  }

  function start(nextConfig) {
    config = nextConfig; details = scenarioDetails(config);
    if (!orb) orb = mountFloOrb($('.call-orb canvas'));
    ended = false; $('.call-transcript-toggle').hidden = false; remaining = config.durationMinutes * 60; elapsed = turn = 0;
    queue = details.messages || [['flo', details.opening], ['you', details.response], ['flo', details.followup], ['you', details.response2], ['flo', details.closing]];
    activeMessage = null; pause = .6; followLatest = true; followHistory = true;
    setTranscriptOpen(false); $('.call-workspace').hidden = false;
    $('.call-history-messages').replaceChildren(); $('.call-history-count').textContent = '0 messages';
    historyScroll.scrollTop = lastHistoryTop = 0;
    $('.call-body').hidden = false; $('.call-footer').hidden = false; $('.call-ended').hidden = true;
    $('.call-transcript').replaceChildren();
    $('.call-announcement').textContent = ''; conversation.scrollTop = 0; updateHistory();
    $('#call-title').textContent = details.title;
    document.title = `${details.title} · Flo`;
    $('.call-mode').textContent = config.mode === 'graded' ? 'Graded' : 'Practice';
    $('.call-timer time').textContent = formatTime(remaining);
    setSharing(false); setMuted(false); setSpeaker('flo');
    orb.setActive(true); clearInterval(interval); lastTick = performance.now(); interval = setInterval(tick, 32);
    $('#call-title').focus({preventScroll:true});
  }
  function savedConfig() {
    try {
      const value = JSON.parse(sessionStorage.getItem('flo-roleplay-setup'));
      if (value && ['scenario', 'yourRole', 'floRole'].every(key => typeof value[key] === 'string' && value[key].trim()) && Number.isInteger(value.durationMinutes) && value.durationMinutes >= 1 && value.durationMinutes <= 60 && ['practice', 'graded'].includes(value.mode)) return value;
    } catch { /* A missing saved setup returns to the roleplay chooser. */ }
    return null;
  }
  function navigate() {
    if (location.hash === '#content') return;
    const inCall = location.hash === '#roleplay-call';
    section.hidden = !inCall;
    if (!inCall) { clearInterval(interval); orb?.setActive(false); setSharing(false); return; }
    const next = config || savedConfig();
    if (!next) { location.replace('#roleplay'); return; }
    start(next);
  }
  $('.call-mic').addEventListener('click', () => setMuted(!muted));
  $('.call-share').addEventListener('click', () => setSharing(!sharing));
  $('.call-share-preview-heading button').addEventListener('click', () => setSharing(false));
  $('.call-end').addEventListener('click', end);
  $('.call-restart').addEventListener('click', () => start(config));
  $('.call-return').addEventListener('click', () => { onReturn?.(); location.hash = 'roleplay'; });
  // Pause following when someone scrolls back; resume when they return to the latest line.
  conversation.addEventListener('wheel', event => {
    if (event.deltaY < 0) followLatest = false;
    else if (conversation.scrollHeight - conversation.clientHeight - conversation.scrollTop < 32) followLatest = true;
  }, { passive: true });
  conversation.addEventListener('touchstart', () => { followLatest = false; }, { passive: true });
  conversation.addEventListener('keydown', event => {
    if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) followLatest = false;
    if (event.key === 'End') followLatest = true;
  });
  conversation.addEventListener('scroll', () => {
    if (conversation.scrollHeight - conversation.clientHeight - conversation.scrollTop < 2) followLatest = true;
    updateHistory();
  }, { passive: true });
  compactCall.addEventListener('change', () => {
    $('.call-body').inert = transcriptOpen && compactCall.matches;
    updateHistory(); updateTranscriptScroll();
  });
  $('.call-transcript-toggle').addEventListener('click', () => setTranscriptOpen(!transcriptOpen, transcriptOpen));
  $('.call-transcript-pill').addEventListener('click', () => setTranscriptOpen(true));
  $('.call-history-close').addEventListener('click', () => setTranscriptOpen(false, true));
  section.addEventListener('keydown', event => {
    if (event.key === 'Escape' && transcriptOpen) { event.preventDefault(); setTranscriptOpen(false, true); }
  });
  historyScroll.addEventListener('wheel', event => {
    if (event.deltaY < 0) pauseHistory();
  }, { passive: true });
  historyScroll.addEventListener('touchstart', event => {
    historyTouchY = event.touches[0]?.clientY ?? null;
  }, { passive: true });
  historyScroll.addEventListener('touchmove', event => {
    const y = event.touches[0]?.clientY;
    if (historyTouchY !== null && y > historyTouchY) pauseHistory();
    historyTouchY = y ?? null;
  }, { passive: true });
  historyScroll.addEventListener('keydown', event => {
    if (['ArrowUp', 'PageUp', 'Home'].includes(event.key) || (event.key === ' ' && event.shiftKey)) pauseHistory();
    if (event.key === 'End') { followHistory = true; scrollHistoryToLatest(); updateTranscriptScroll(); }
  });
  historyScroll.addEventListener('scroll', () => {
    const top = historyScroll.scrollTop;
    if (top < lastHistoryTop - 1) followHistory = false;
    else if (historyScroll.scrollHeight - historyScroll.clientHeight - top < 2) followHistory = true;
    lastHistoryTop = top;
    updateTranscriptScroll();
  }, { passive: true });
  $('.call-history-latest').addEventListener('click', event => {
    followHistory = true;
    historyScroll.focus({ preventScroll: true });
    if (event.detail === 0 || reducedMotion.matches) scrollHistoryToLatest();
    updateTranscriptScroll();
  });
  window.addEventListener('hashchange', navigate);
  navigate();
  return { open(nextConfig) { config = nextConfig; if (location.hash === '#roleplay-call') start(config); else location.hash = 'roleplay-call'; } };
}
