(function(){
    const html = document.documentElement;

    const drawer = document.getElementById('mobile-drawer');
    const mask = document.getElementById('drawer-mask');
    const openBtn = document.getElementById('btn-open-drawer');
    const openBtnDesktop = document.getElementById('btn-open-drawer-desktop');
    const closeBtn = document.getElementById('btn-close-drawer');
    const navLinks = drawer.querySelectorAll('nav a, nav button');

    function openDrawer() {
        if (drawer) {
            drawer.classList.add('active');
            html.style.overflow = 'hidden';
        }
    }

    function closeDrawer() {
        if (drawer) {
            drawer.classList.remove('active');
            html.style.overflow = '';
        }
    }

    openBtn?.addEventListener('click', openDrawer);
    openBtnDesktop?.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    mask?.addEventListener('click', closeDrawer);

    navLinks.forEach(link => {
        link.addEventListener('click', closeDrawer);
    });

    const searchDrop = document.getElementById('search-dropdown');
    const searchBtn = document.getElementById('btn-mobile-search');

    searchBtn?.addEventListener('click', () => {
        searchDrop.classList.toggle('active');
        if (searchDrop.classList.contains('active')) {
            setTimeout(() => document.getElementById('search')?.focus(), 50);
        }
    });

    const sd = document.getElementById('search-desktop');
    const sm = document.getElementById('search');
    const sortD = document.getElementById('sort-desktop');
    const sortM = document.getElementById('sort');

    sd?.addEventListener('input', () => {
        if (sm && sm.value !== sd.value) {
            sm.value = sd.value;
            sm.dispatchEvent(new Event('input'));
        }
    });
    sm?.addEventListener('input', () => {
        if (sd && sd.value !== sm.value) {
            sd.value = sm.value;
        }
    });
    sortD?.addEventListener('change', () => {
        if (sortM) sortM.value = sortD.value;
    });
    sortM?.addEventListener('change', () => {
        if (sortD) sortD.value = sortM.value;
    });

    const authBtn = document.getElementById('btn-auth-menu');
    const authDrop = document.getElementById('auth-dropdown');

    authBtn?.addEventListener('click', () => {
        authDrop.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (drawer.classList.contains('active') && (drawer.contains(e.target) || e.target === openBtn || e.target === openBtnDesktop)) {
            return;
        }

        if (!authDrop.contains(e.target) && e.target !== authBtn) {
            authDrop.classList.remove('active');
        }
        if (!searchDrop.contains(e.target) && e.target !== searchBtn) {
            searchDrop.classList.remove('active');
        }
    });

    const THEME_KEY = 'lpg_theme_v1';
    const btnTheme = document.getElementById('btn-theme');

    function applyTheme(t) {
        html.setAttribute('data-theme', t);
        localStorage.setItem(THEME_KEY, t);
    }

    function toggleTheme() {
        const cur = html.getAttribute('data-theme') || 'light';
        applyTheme(cur === 'light' ? 'dark' : 'light');
    }

    btnTheme?.addEventListener('click', toggleTheme);
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved);

    const loginM = document.getElementById('btn-login');
    const loginD = document.getElementById('btn-login-desktop');
    loginD?.addEventListener('click', () => loginM?.click());

    const logoutM = document.getElementById('btn-logout');
    const logoutD = document.getElementById('btn-logout-desktop');
    logoutD?.addEventListener('click', () => logoutM?.click());

    const profileM = document.getElementById('btn-profile');
    const profileD = document.getElementById('btn-profile-desktop');
    profileD?.addEventListener('click', () => profileM?.click());

    const adminM = document.getElementById('btn-admin');
    const adminD = document.getElementById('btn-admin-desktop');
    adminD?.addEventListener('click', () => adminM?.click());

    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
        const w = window.innerWidth;
        if (w >= 768 && lastW < 768) {
            document.getElementById('search-dropdown')?.classList.remove('active');
            document.getElementById('auth-dropdown')?.classList.remove('active');
            // Додано примусове закриття drawer при переході до desktop
            document.getElementById('mobile-drawer')?.classList.remove('active');
            html.style.overflow = ''; // Відновити прокручування body
        }
        lastW = w;
    });
})();