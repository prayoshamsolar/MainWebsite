// =====================================================================
// PRAYOSHAM SOLAR ENERGY — site scripts
// =====================================================================
// NOTE ON EMAIL DELIVERY
// This site has no backend/database. The contact form sends the enquiry
// straight to an email inbox using FormSubmit (formsubmit.co) — a free
// forwarding service that needs no signup and no API key.
//
// It works two ways so it's reliable whether the site is hosted or just
// opened as a local file:
//  1. Primary: an AJAX request (fetch) to FORM_ENDPOINT — stays on the
//     page and shows an inline success message. Needs the page to be
//     served over http(s) (works once the site is hosted, or run through
//     a local dev server).
//  2. Fallback: if that AJAX call fails for any reason (most commonly a
//     browser blocking fetch() from a file:// page), the code falls back
//     to a plain, non-AJAX <form> submit using the action/method already
//     set on the <form id="quoteForm"> tag in index.html. A native form
//     submission is a full-page navigation, not a script-read network
//     request, so it isn't subject to the same restriction and works even
//     from file://. The trade-off: the browser navigates to FormSubmit's
//     own confirmation page instead of staying on your site.
//  3. If JavaScript fails to load at all, the form's own action/method
//     attributes still submit it the normal (non-AJAX) way automatically.
//
// The FIRST time a real submission is sent (either path), FormSubmit
// emails a one-time "activation" link to RECEIVER_EMAIL. Until that link
// is clicked, leads will NOT arrive. See the note at the bottom of this
// file for details.
// =====================================================================

const WHATSAPP_NUMBER = '916356790782';
const RECEIVER_EMAIL = 'prayoshamsolarenergy@gmail.com';
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${RECEIVER_EMAIL}`;

document.addEventListener('DOMContentLoaded', () => {

  // ===== PAGE LOADER =====
  const loader = document.getElementById('loader');
  const hideLoader = () => loader && loader.classList.add('hide');
  window.addEventListener('load', hideLoader);
  // Safety net in case the load event is delayed by a slow asset
  setTimeout(hideLoader, 2500);

  // ===== NAVBAR SCROLL EFFECT =====
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
    });
  }

  // ===== MOBILE MENU =====
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  function closeMobileMenu() {
    mobileMenu.classList.remove('show');
    document.body.style.overflow = '';
  }

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('show');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });
  }

  // ===== ACTIVE NAV LINK ON SCROLL =====
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.desktop-menu a, .mobile-menu a');

  if (sections.length && navLinks.length) {
    window.addEventListener('scroll', () => {
      let current = '';
      const scrollPos = window.scrollY + 140;

      sections.forEach(section => {
        if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
          current = section.id;
        }
      });

      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    });
  }

  // ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = 90;
        const targetPos = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  });

  // ===== SOLAR SAVINGS CALCULATOR (#calculator) =====
  // Called from the inline onclick="calculateSolar()" on the "Calculate
  // My Savings" button, so it must live on window.
  window.calculateSolar = function () {
    const billInput = document.getElementById('billInput');
    const propertyType = document.getElementById('propertyType');
    if (!billInput || !propertyType) return;

    const bill = Math.max(parseFloat(billInput.value) || 0, 0);
    if (bill <= 0) {
      billInput.focus();
      return;
    }

    // Rough Gujarat tariff (~₹7/unit) and generation (~4.5 units/day/kW)
    const ratePerUnit = 7;
    const unitsPerKwPerYear = 4.5 * 365;
    const type = propertyType.value;

    let offsetRatio = 0.8;
    if (type === 'commercial') offsetRatio = 0.75;
    if (type === 'industrial') offsetRatio = 0.7;

    const monthlyUnits = bill / ratePerUnit;
    const annualUnits = monthlyUnits * 12;
    const recommendedKw = Math.max(1, Math.round((annualUnits * offsetRatio) / unitsPerKwPerYear));
    const annualGeneration = Math.round(recommendedKw * unitsPerKwPerYear);
    const annualSavings = Math.round(annualGeneration * ratePerUnit);

    const systemSizeEl = document.getElementById('systemSize');
    const generationEl = document.getElementById('generation');
    const savingsEl = document.getElementById('savings');

    if (systemSizeEl) systemSizeEl.textContent = recommendedKw + ' KW';
    if (generationEl) generationEl.textContent = annualGeneration.toLocaleString('en-IN') + ' Units';
    if (savingsEl) savingsEl.textContent = '₹' + annualSavings.toLocaleString('en-IN');

    const resultBox = document.getElementById('calculatorResult');
    if (resultBox) resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // ===== CONTACT / QUOTE FORM =====
  const quoteForm = document.getElementById('quoteForm');
  if (!quoteForm) return;

  const submitBtn = document.getElementById('submitBtn');
  const waFormBtn = document.getElementById('waFormBtn');
  const formMsg = document.getElementById('formMsg');
  const captchaLabel = document.getElementById('captchaLabel');
  const captchaInput = document.getElementById('captchaAnswer');
  const honeypot = document.getElementById('website');

  const fields = {
    fullName: document.getElementById('fullName'),
    mobile: document.getElementById('mobile'),
    email: document.getElementById('email'),
    propType: document.getElementById('propType'),
    message: document.getElementById('message')
  };

  // --- simple math "are you human" check (client-side deterrent, not a
  // substitute for server-side validation, but keeps casual/basic bots out)
  let captchaAnswer = 0;
  function newCaptcha() {
    const a = Math.floor(Math.random() * 8) + 1;
    const b = Math.floor(Math.random() * 8) + 1;
    captchaAnswer = a + b;
    if (captchaLabel) captchaLabel.textContent = `Security check: ${a} + ${b} = ?`;
    if (captchaInput) captchaInput.value = '';
  }
  newCaptcha();

  function setFieldError(inputEl, show) {
    if (!inputEl) return;
    inputEl.classList.toggle('error', show);
    const wrapper = inputEl.closest('.field');
    if (wrapper) wrapper.classList.toggle('has-error', show);
  }

  function showFormMsg(text, type) {
    if (!formMsg) return;
    formMsg.textContent = text;
    formMsg.className = 'form-msg show ' + type;
  }

  function clearFormMsg() {
    if (!formMsg) return;
    formMsg.className = 'form-msg';
    formMsg.textContent = '';
  }

  function validate() {
    let valid = true;

    const nameOk = fields.fullName.value.trim().length >= 2;
    setFieldError(fields.fullName, !nameOk);
    valid = valid && nameOk;

    const mobileOk = /^[6-9]\d{9}$/.test(fields.mobile.value.trim());
    setFieldError(fields.mobile, !mobileOk);
    valid = valid && mobileOk;

    const emailVal = fields.email.value.trim();
    const emailOk = emailVal !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
    setFieldError(fields.email, !emailOk);
    valid = valid && emailOk;

    const captchaOk = parseInt(captchaInput.value.trim(), 10) === captchaAnswer;
    setFieldError(captchaInput, !captchaOk);
    valid = valid && captchaOk;

    return valid;
  }

  function getFormData() {
    return {
      fullName: fields.fullName.value.trim(),
      mobile: fields.mobile.value.trim(),
      email: fields.email.value.trim(),
      propType: fields.propType.value,
      message: fields.message.value.trim()
    };
  }

  function buildWhatsAppMessage(data) {
    let msg = `Hello Prayosham Solar Energy,\nI am interested in installing a solar system.\n\n`;
    msg += `Name: ${data.fullName || '-'}\n`;
    msg += `Mobile: ${data.mobile || '-'}\n`;
    if (data.email) msg += `Email: ${data.email}\n`;
    msg += `Requirement: ${data.propType}\n`;
    if (data.message) msg += `Message: ${data.message}\n`;
    msg += `\nPlease provide me with a solar quotation.`;
    return msg;
  }

  // --- basic client-side rate limiting: block rapid repeat submissions ---
  const RATE_LIMIT_MS = 20000;
  function isRateLimited() {
    const last = parseInt(localStorage.getItem('psl_last_submit') || '0', 10);
    return Date.now() - last < RATE_LIMIT_MS;
  }
  function markSubmitted() {
    localStorage.setItem('psl_last_submit', String(Date.now()));
  }

  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormMsg();

    // Honeypot: real visitors never see/fill this field. If it has a
    // value, silently drop the submission instead of alerting the bot.
    if (honeypot && honeypot.value.trim() !== '') {
      showFormMsg('Thank you! Your enquiry has been received. Our team will contact you shortly.', 'success');
      quoteForm.reset();
      newCaptcha();
      return;
    }

    if (isRateLimited()) {
      showFormMsg('Please wait a few seconds before submitting again.', 'error');
      return;
    }

    if (!validate()) {
      showFormMsg('Please check the highlighted fields and try again.', 'error');
      newCaptcha();
      return;
    }

    const data = getFormData();

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    const labelEl = submitBtn.querySelector('.btn-label');
    const originalLabel = labelEl.textContent;
    labelEl.textContent = 'Sending';

    const subjectLine = `New Solar Enquiry — ${data.fullName} (${data.propType})`;

    // Keep the hidden native-submit fields in sync in case we need to
    // fall back to a plain form POST below (or JS breaks entirely, in
    // which case the browser will use these values as-is on its own).
    const subjectField = quoteForm.querySelector('input[name="_subject"]');
    const replytoField = quoteForm.querySelector('input[name="_replyto"]');
    if (subjectField) subjectField.value = subjectLine;
    if (replytoField) replytoField.value = data.email || '';

    try {
      const payload = {
        name: data.fullName,
        phone: data.mobile,
        email: data.email,
        requirement: data.propType,
        message: data.message || 'Not specified',
        _subject: subjectLine,
        _template: 'table',
        _captcha: 'false'
      };

      // If the visitor gave an email, set it as the Reply-To address, so
      // hitting "Reply" on the notification email in Gmail goes straight
      // back to that customer (e.g. a@gmail.com) instead of FormSubmit.
      if (data.email) payload._replyto = data.email;

      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Request failed');

      markSubmitted();
      showFormMsg('Thank you! Your enquiry has been sent. Our team will contact you shortly.', 'success');
      quoteForm.reset();
      newCaptcha();
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      labelEl.textContent = originalLabel;
    } catch (err) {
      // The AJAX request failed — most commonly because the page is
      // being opened as a local file (file://) and the browser blocks
      // fetch() calls to another origin from that context. Fall back to
      // a normal (non-AJAX) form submission instead: that's a full-page
      // navigation, not a script-read network request, so browsers allow
      // it regardless of origin, and the email still gets delivered.
      markSubmitted();
      quoteForm.submit(); // native submit; does not re-trigger this listener
      // Page will navigate to FormSubmit's confirmation screen, so no
      // need to reset button state here.
    }
  });

  // Remove error state as the person fixes a field
  [fields.fullName, fields.mobile, fields.email, captchaInput].forEach(input => {
    if (input) input.addEventListener('input', () => setFieldError(input, false));
  });

  // Secondary path: send the same details straight to WhatsApp (no email
  // service involved, works even if the form above can't reach the network)
  if (waFormBtn) {
    waFormBtn.addEventListener('click', () => {
      const data = getFormData();
      const msg = buildWhatsAppMessage(data);
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  }

});

// =====================================================================
// SETUP REQUIRED (one-time, do this before going live):
// 1. Open the site and submit the form once with real-looking test data.
// 2. FormSubmit will send an activation email to prayoshamsolarenergy@gmail.com
//    with the subject "Please Activate Email Sending On FormSubmit" —
//    open it and click "Activate Form". Every submission after that
//    lands directly in the inbox automatically, no further setup needed.
// 3. If you ever change the receiving address, update RECEIVER_EMAIL at
//    the top of this file and repeat the one-time activation step.
// =====================================================================