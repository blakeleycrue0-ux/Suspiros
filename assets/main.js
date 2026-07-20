(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Preloader */
  var preloader = document.getElementById('preloader');
  if (preloader) {
    window.addEventListener('load', function () {
      var start = Date.now();
      var minDelay = reduceMotion ? 0 : 500;
      var wait = Math.max(0, minDelay - (Date.now() - start));
      setTimeout(function () {
        preloader.classList.add('is-hidden');
      }, wait);
    });
  }

  /* Cookie notice */
  var cookieBanner = document.getElementById('cookieBanner');
  var cookieAccept = document.getElementById('cookieAccept');
  if (cookieBanner && cookieAccept) {
    try {
      if (!localStorage.getItem('suspiros-cookie-ack')) {
        setTimeout(function () {
          cookieBanner.classList.add('is-visible');
          document.body.classList.add('cookie-open');
        }, 1200);
      }
    } catch (err) {}
    cookieAccept.addEventListener('click', function () {
      cookieBanner.classList.remove('is-visible');
      document.body.classList.remove('cookie-open');
      try { localStorage.setItem('suspiros-cookie-ack', '1'); } catch (err) {}
    });
  }

  /* Floating CTA visibility */
  var floatingCta = document.getElementById('floatingCta');
  if (floatingCta) {
    var ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(function () {
          var doc = document.documentElement;
          var scrollTop = doc.scrollTop || document.body.scrollTop;
          floatingCta.classList.toggle('is-visible', scrollTop > window.innerHeight * 0.9);
          ticking = false;
        });
        ticking = true;
      }
    }
    document.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Reveal on scroll */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  /* Mobile menu */
  var navToggle = document.getElementById('navToggle');
  var mobileMenu = document.getElementById('mobileMenu');
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobileMenu.classList.remove('is-open');
        navToggle.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* Mouse-follow hero parallax */
  var heroVisual = document.getElementById('heroVisual');
  if (heroVisual && !reduceMotion) {
    var layers = heroVisual.querySelectorAll('.parallax-layer');
    heroVisual.addEventListener('mousemove', function (e) {
      var rect = heroVisual.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      layers.forEach(function (layer) {
        var depth = parseFloat(layer.getAttribute('data-depth')) / 10;
        layer.style.transform = 'translate(' + (x * depth) + 'px, ' + (y * depth) + 'px)';
      });
    });
    heroVisual.addEventListener('mouseleave', function () {
      layers.forEach(function (layer) { layer.style.transform = 'translate(0, 0)'; });
    });
  }

  /* FAQ accordion */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var question = item.querySelector('.faq-question');
    var answer = item.querySelector('.faq-answer');
    question.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');
      document.querySelectorAll('.faq-item.is-open').forEach(function (openItem) {
        openItem.classList.remove('is-open');
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        openItem.querySelector('.faq-answer').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('is-open');
        question.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  /* Enquiry form (submits to Netlify Forms) */
  var form = document.getElementById('enquiryForm');
  if (form) {
    var success = document.getElementById('formSuccess');
    var formError = document.getElementById('formError');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      formError.classList.remove('is-visible');
      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      var body = new URLSearchParams(new FormData(form)).toString();
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      }).then(function (response) {
        if (!response.ok) throw new Error('Form submission failed');
        form.style.display = 'none';
        success.classList.add('is-visible');
      }).catch(function () {
        formError.classList.add('is-visible');
        submitBtn.disabled = false;
      });
    });
  }

  /* Emergency modal */
  var emergencyOpen = document.getElementById('emergencyOpen');
  var emergencyOverlay = document.getElementById('emergencyOverlay');
  var emergencyClose = document.getElementById('emergencyClose');
  var emergencyBackdrop = document.getElementById('emergencyBackdrop');
  if (emergencyOpen && emergencyOverlay && emergencyClose && emergencyBackdrop) {
    function openEmergency() {
      if (mobileMenu) mobileMenu.classList.remove('is-open');
      if (navToggle) { navToggle.classList.remove('is-open'); navToggle.setAttribute('aria-expanded', 'false'); }
      emergencyOverlay.classList.add('is-open');
      emergencyOverlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      emergencyClose.focus();
    }
    function closeEmergency() {
      emergencyOverlay.classList.remove('is-open');
      emergencyOverlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      emergencyOpen.focus();
    }
    emergencyOpen.addEventListener('click', openEmergency);
    emergencyClose.addEventListener('click', closeEmergency);
    emergencyBackdrop.addEventListener('click', closeEmergency);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && emergencyOverlay.classList.contains('is-open')) { closeEmergency(); }
    });
  }
})();
