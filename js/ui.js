
export function renderQuickTags(sections, filterBySection) {
    const container = document.getElementById('quick-tags');
    if(!container) return;
    container.innerHTML = '';
    sections.forEach(sec => {
        const el = document.createElement('button');
        el.className = 'text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-primary hover:text-white transition shadow-sm';
        el.textContent = sec;
        el.onclick = () => filterBySection(sec);
        container.appendChild(el);
    });
}

export function wrapSelection(ta, wrap) {
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = ta.value.slice(start, end);
    ta.value = ta.value.slice(0, start) + wrap + sel + wrap + ta.value.slice(end);
    ta.focus();
    ta.setSelectionRange(start + wrap.length, end + wrap.length);
}

export function openComments(post, usersCache, currentUser, writeAudit, closeModal, openModal, escapeHtml, showCustomAlert) {
    const body = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = `Коментарі: ${post.title}`;
    body.innerHTML = '';

    const list = document.createElement('div');
    list.className = 'space-y-3 mb-4 max-h-96 overflow-y-auto pr-2';

    (post.comments||[]).forEach(c => {
        const r = document.createElement('div');
        r.className = 'p-3 rounded-lg border border-gray-100 bg-gray-50 shadow-sm';
        const commentAuthor = usersCache.find(u => u.id === c.authorId || u.googleId === c.authorId);
        const avatarSrc = commentAuthor?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&background=6b7682&color=fff&size=24`;

        r.innerHTML = `
        <div class="flex items-center gap-2 text-xs text-muted font-semibold mb-1">
            <img src="${avatarSrc}" alt="${escapeHtml(c.authorName)}" class="w-5 h-5 rounded-full" />
            <span>${escapeHtml(c.authorName)} · ${new Date(c.t).toLocaleString('uk-UA')}</span>
        </div>
        <div class="ml-7">${escapeHtml(c.text)}</div>
        `;
        list.appendChild(r);
    });
    body.appendChild(list);

    const ta = document.createElement('textarea');
    ta.className = 'w-full min-h-[80px] p-3 rounded-lg border-gray-300 focus:ring-primary focus:border-primary shadow-inner';
    ta.placeholder = 'Напишіть коментар...';
    body.appendChild(ta);

    const btn = document.createElement('button');
    btn.textContent = 'Додати коментар';
    btn.className = 'btn-primary mt-3';
    btn.onclick = async () => {
        if(!currentUser) {
        openLogin();
        return;
        }
        if(!ta.value.trim()) return showCustomAlert('Коментар не може бути порожнім.','Помилка');

        if (!post.approved) {
        showCustomAlert('Ви не можете коментувати пост, поки він не схвалений модератором.');
        return;
        }

        const newComment = {
        authorId: currentUser.id,
        authorName: currentUser.name,
        text: ta.value,
        t: Date.now()
        };

        await writeAudit(`Коментар: ${currentUser.name} -> ${post.title}`);
        closeModal();
    };
    body.appendChild(btn);
    openModal();
    list.scrollTop = list.scrollHeight;
}

export function updateUIForLoggedInUser(currentUser, rolesCache) {
    const loginBtn = document.getElementById('btn-login');
    const userSection = document.getElementById('user-profile-section');
    const adminBtn = document.getElementById('btn-admin');
    const userAvatar = document.getElementById('user-avatar');

    function getCurrentUserRolePerms() {
        if(!currentUser) return {};
        const roles = rolesCache || [];
        const r = roles.find(r => r.id === currentUser.role);
        return (r && r.perms) ? r.perms : {};
    }

    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userSection) {
            userSection.classList.remove('hidden');
            userSection.style.display = 'flex';
        }
        if (userAvatar) {
            userAvatar.src = currentUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3867d6&color=fff&size=40`;
            userAvatar.alt = currentUser.name;
        }
        const perms = getCurrentUserRolePerms();
        if (adminBtn) {
            if (perms.approve || perms.changeRole || perms.delete) {
                adminBtn.style.display = 'flex';
            } else {
                adminBtn.style.display = 'none';
            }
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'flex';
        if (userSection) {
            userSection.classList.add('hidden');
            userSection.style.display = 'none';
        }
        if (adminBtn) adminBtn.style.display = 'none';
    }
}
export async function showCustomDialog(title, message, buttons) {
    return new Promise(resolve => {
        const dialogTitle = document.getElementById('dialog-title');
        const dialogMessage = document.getElementById('dialog-message');
        const dialogActions = document.getElementById('dialog-actions');
        dialogTitle.textContent = title;
        dialogMessage.innerHTML = message;
        dialogActions.innerHTML = '';
        buttons.forEach(({ text, value, className = 'btn-ghost' }) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.className = className;
            btn.onclick = () => {
                document.getElementById('custom-dialog').classList.remove('active');
                resolve(value);
            };
            dialogActions.appendChild(btn);
        });
        document.getElementById('custom-dialog').classList.add('active');
    });
}

export async function showCustomAlert(message, title = 'Сповіщення') {
    await showCustomDialog(title, message, [{ text: 'Зрозуміло', value: true, className: 'btn-primary' }]);
}

export async function showCustomConfirm(message, title = 'Підтвердження') {
    return await showCustomDialog(title, message, [
        { text: 'Скасувати', value: false, className: 'btn-ghost' },
        { text: 'Підтвердити', value: true, className: 'btn-primary' }
    ]);
}


export function openModal() {
    const m = document.getElementById('modal');
    if(!m) return;
    m.classList.add('active');
    m.setAttribute('aria-hidden', 'false');
}

export function closeModal() {
    const m = document.getElementById('modal');
    if(!m) return;
    m.classList.remove('active');
    m.setAttribute('aria-hidden', 'true');
}

