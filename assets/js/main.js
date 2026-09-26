/*==================== MOBILE MENU ====================*/
const toggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (toggle && navMenu) {
  toggle.addEventListener('click', () => {
    navMenu.classList.toggle('show');
  });
}

document.querySelectorAll('.nav__link').forEach((link) => {
  link.addEventListener('click', () => {
    navMenu?.classList.remove('show');
  });
});

/*==================== SCROLL-SPY ACTIVE LINK ====================*/
const sections = document.querySelectorAll('section[id]');

const setActiveLink = () => {
  const scrollY = window.scrollY;

  sections.forEach((section) => {
    const sectionHeight = section.offsetHeight;
    const sectionTop = section.offsetTop - 90;
    const id = section.getAttribute('id');
    const link = document.querySelector(`.nav__link[href="#${id}"]`);
    if (!link) return;

    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      link.classList.add('active-link');
    } else {
      link.classList.remove('active-link');
    }
  });
};
window.addEventListener('scroll', setActiveLink);
setActiveLink();



/*==================== HERO TERMINAL BOOT SEQUENCE ====================*/
const terminalLines = document.querySelectorAll('#terminalBody .t-line');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion) {
  terminalLines.forEach((line) => line.classList.add('in'));
} else {
  terminalLines.forEach((line, i) => {
    setTimeout(() => line.classList.add('in'), 220 + i * 160);
  });
}
