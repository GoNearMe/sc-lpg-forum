// auth.js
import { GOOGLE_CLIENT_ID, setDocById, writeAudit } from './utility.js';
import { showCustomAlert, openModal, closeModal } from './ui.js';

export const LS = {
    CURRENT_USER: 'lpg_current_user'
};

export function isValidSession(user) {
    if (!user || !user.loginTime) return false;
    const hoursSinceLogin = (Date.now() - user.loginTime) / (1000 * 60 * 60);
    return hoursSinceLogin < 24;
}

export function saveLocalCurrentUser(u) {
    localStorage.setItem(LS.CURRENT_USER, JSON.stringify(u));
}

export function removeLocalCurrentUser() {
    localStorage.removeItem(LS.CURRENT_USER);
}

export function getLocalCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(LS.CURRENT_USER) || 'null');
    } catch (e) {
        return null;
    }
}

// ✅ Opens Google OAuth 2.0 redirect tab instead of inline button
export function redirectToGoogleLogin() {
    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: window.location.origin + '/authCallback.html',
        response_type: 'token',
        scope: 'openid email profile',
        include_granted_scopes: 'true',
        state: 'forum_login'
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ✅ Handles token from callback and saves user
export async function handleGoogleRedirect(usersCache, setCurrentUser) {
    const hash = new URLSearchParams(window.location.hash.substring(1));
    const token = hash.get('access_token');
    if (!token) return null;

    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const profile = await res.json();

    const googleUser = {
        googleId: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        verified: profile.email_verified,
        loginTime: Date.now()
    };

    let user = usersCache.find(u =>
        u.email === googleUser.email ||
        u.googleId === googleUser.googleId ||
        u.id === googleUser.googleId
    );

    if (!user) {
        const newId = googleUser.googleId || window.uid();
        user = {
            id: newId,
            googleId: googleUser.googleId,
            name: googleUser.name,
            email: googleUser.email,
            picture: googleUser.picture,
            role: 'role_student',
            grade: null,
            joined: new Date().toISOString().slice(0, 10),
            loginTime: googleUser.loginTime
        };
        await setDocById('users', user.id, user);
        await writeAudit(`Нова реєстрація через Google: ${user.name}`);
    } else {
        user.name = googleUser.name;
        user.picture = googleUser.picture;
        user.loginTime = googleUser.loginTime;
        if (!user.googleId) user.googleId = googleUser.googleId;
        await setDocById('users', user.id, user);
    }

    setCurrentUser(user);
    saveLocalCurrentUser(user);
    showCustomAlert(`Ласкаво просимо, ${user.name}!`, 'Вхід успішний');

    // Clean up URL hash (remove access_token)
    window.history.replaceState({}, document.title, window.location.pathname);

    return user;
}

// ✅ Login modal that triggers redirect
export function openLogin() {
    const body = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = 'Вхід';
    body.innerHTML = `
        <div class="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-inner space-y-6 text-center">
            <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10,17 15,12 10,7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
            </div>
            <div>
                <h4 class="text-2xl font-bold text-gray-900 mb-2">Ласкаво просимо!</h4>
                <p class="text-gray-600">Увійдіть через свій Google акаунт, щоб приєднатися до обговорень та створювати пости в нашому шкільному форумі.</p>
            </div>
            <div id="google-signin-container"></div>
            <div class="text-xs text-gray-500 space-y-1">
                <p>Використовуючи Google вхід, ви погоджуєтесь з нашими умовами використання.</p>
                <p>Ваші дані захищені та використовуються тільки для ідентифікації в форумі.</p>
            </div>
        </div>
    `;

    // Replace the button with a real redirect
    setTimeout(() => {
        const container = document.getElementById('google-signin-container');
        const btn = document.createElement('button');
        btn.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition';
        btn.textContent = 'Увійти через Google';
        btn.onclick = () => redirectToGoogleLogin();
        container.appendChild(btn);
    }, 100);

    openModal();
}
