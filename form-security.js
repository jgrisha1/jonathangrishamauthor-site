(() => {
  'use strict';

  const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  let scriptPromise;

  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = 'true';
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error('Spam protection could not load. Please try again.'));
      };
      document.head.appendChild(script);
    });

    return scriptPromise;
  }

  async function renderForForm(form) {
    if (!form) return null;
    const slot = form.querySelector('.cf-turnstile');
    if (!slot) return null;
    if (slot.dataset.widgetId) return slot.dataset.widgetId;
    if (slot.dataset.rendering === 'true') return null;

    slot.dataset.rendering = 'true';
    try {
      const turnstile = await loadTurnstile();
      if (!turnstile || slot.dataset.widgetId) return slot.dataset.widgetId || null;
      const widgetId = turnstile.render(slot, {
        sitekey: slot.dataset.sitekey,
        theme: slot.dataset.theme || 'dark',
      });
      slot.dataset.widgetId = String(widgetId);
      return widgetId;
    } finally {
      delete slot.dataset.rendering;
    }
  }

  function resetForForm(form) {
    const slot = form ? form.querySelector('.cf-turnstile') : null;
    if (!slot || !slot.dataset.widgetId || !window.turnstile) return;
    window.turnstile.reset(slot.dataset.widgetId);
  }

  function wireLazyRendering(root = document) {
    root.querySelectorAll('form .cf-turnstile').forEach((slot) => {
      const form = slot.closest('form');
      if (!form || form.dataset.turnstileWired === 'true') return;
      form.dataset.turnstileWired = 'true';
      form.addEventListener('focusin', () => { renderForForm(form).catch(() => {}); }, { once: true });
      form.addEventListener('pointerenter', () => { renderForForm(form).catch(() => {}); }, { once: true });
    });
  }

  window.JGForms = { renderForForm, resetForForm, wireLazyRendering };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => wireLazyRendering(), { once: true });
  } else {
    wireLazyRendering();
  }
})();
