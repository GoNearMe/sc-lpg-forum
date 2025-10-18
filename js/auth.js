// auth.js
import { GOOGLE_CLIENT_ID, setDocById, writeAudit} from './utility.js';
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
    } catch(e) { return null; }
}

export async function initializeGoogleSignIn(callback) {
    if (typeof google === 'undefined' || !google.accounts) {
        console.error('Google Sign-In API not loaded');
        return;
    }
    try {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback,
            auto_select: false,
            cancel_on_tap_outside: false,
            use_fedcm_for_prompt: false
        });
    } catch (error) {
        console.error('Failed to initialize Google Sign-In:', error);
        return;
    }
    const savedUser = getLocalCurrentUser();
    if (savedUser && isValidSession(savedUser)) {
        return savedUser;
    }
}

export async function handleCredentialResponse(response, usersCache, setCurrentUser) {
    const payload = window.parseJwt(response.credential);
    if(!payload) return;
    const googleUser = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        verified: payload.email_verified,
        loginTime: Date.now()
    };
    const userDocId = googleUser.sub || googleUser.googleId || window.uid();
    let user = usersCache.find(u => u.email === googleUser.email || u.googleId === googleUser.googleId || u.id === googleUser.googleId);
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
            joined: new Date().toISOString().slice(0,10),
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
}

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

    setTimeout(() => {
        initializeGoogleSignIn((response) => {
            // You should handle the credential response in your main app logic
        });
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.renderButton(
                document.getElementById("google-signin-container"),
                {
                    theme: "outline",
                    size: "large",
                    text: "signin_with",
                    shape: "rectangular",
                    logo_alignment: "left"
                }
            );
            google.accounts.id.prompt();
        }
    }, 100);
    openModal();
}
