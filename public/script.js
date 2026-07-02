// Site-wide interactive behaviors: mobile menu + safe typewriter enhancement
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      navMenu.setAttribute('aria-hidden', String(!isOpen));
      if (isOpen) {
        const firstLink = navMenu.querySelector('a');
        if (firstLink) firstLink.focus();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        navMenu.setAttribute('aria-hidden', 'true');
        menuToggle.focus();
      }
    });
  }

  function typeWriter(element, text, speed, delay = 0) {
    setTimeout(() => {
      if (!element || element.textContent.trim().length > 0) return; // don't overwrite static content
      let i = 0;
      element.innerHTML = '';
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      cursor.innerHTML = '|';
      element.appendChild(cursor);
      function type() {
        if (i < text.length) {
          const existingCursor = element.querySelector('.cursor');
          if (existingCursor) existingCursor.remove();
          element.innerHTML += text.charAt(i);
          const newCursor = document.createElement('span');
          newCursor.className = 'cursor';
          newCursor.innerHTML = '|';
          element.appendChild(newCursor);
          i++;
          setTimeout(type, speed);
        } else {
          const finalCursor = element.querySelector('.cursor');
          if (finalCursor) finalCursor.remove();
        }
      }
      type();
    }, delay);
  }

  // Kick off small enhancements if hero elements exist
  const heroTitle = document.getElementById('heroTitle');
  const heroSubtitle = document.getElementById('heroSubtitle');
  const heroText = document.getElementById('heroText');
  if (heroTitle) typeWriter(heroTitle, 'Unforgettable Whale Watching', 80);
  if (heroSubtitle) typeWriter(heroSubtitle, 'Premium Whale Watching Tours in Mirissa', 80, 2000);
  if (heroText) typeWriter(heroText, 'Encounter majestic blue whales and playful spinner dolphins in Sri Lanka’s pristine waters. Book now for an adventure of a lifetime!', 30, 4200);

});
