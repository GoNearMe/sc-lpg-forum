import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    setDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    runTransaction,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import { firebaseConfig } from "./config.js";
import { GOOGLE_CLIENT_ID, defaultRoles, defaultSections, uid, escapeHtml, highlight, escapeReg, addTo, setDocById, updateDocByIdLocal, deleteDocByIdLocal, writeAudit } from "./utility.js";
import { showCustomAlert, showCustomConfirm, showCustomDialog } from "./ui.js";
import { isValidSession, saveLocalCurrentUser, removeLocalCurrentUser, getLocalCurrentUser, redirectToGoogleLogin, handleGoogleRedirect, openLogin } from "./auth.js";
import { approvePost, deletePost } from "./admin.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
console.log('Script starting...');
let currentUser = null;
let postsCache = [];
let usersCache = [];
let rolesCache = [];
let votesCache = [];
let sectionsCache = [];
let auditCache = [];


function colRef(name){ return collection(db, name); }
export async function ensureSeed() {
    if (rolesCache.length === 0) {
        for (const r of defaultRoles) {
            await setDocById('roles', r.id, r);
        }
    }

    if (sectionsCache.length === 0) {
        for (const s of defaultSections) {
            await addTo('sections', { name: s });
        }
    }
    if (usersCache.length === 0) {
        const u = {
            id: '111337990811348080631',
            name: 'Яворський Артем',
            email: 'lvivartemlviv@gmail.com',
            role: 'role_tech',
            grade: 10,
            joined: '2025-09-26',
            picture: "https://lh3.googleusercontent.com/a/ACg8ocJZjBz6OP-hy7N8siDUC7VRyJxp8471OTgIAcELY0TG8ReX9MAB=s96-c",
        };
        await setDocById('users', u.id, u);
    }

    if (postsCache.length === 0) {
        const p = {
            id: 'id_u8g90zd06',
            authorId: '111337990811348080631',
            authorName: 'Артем Яворський',
            title: 'Ласкаво просимо у форум ЛПГ!',
            content: 'Це превʼю форуму. Пишіть пропозиції та обговорюйте події.',
            created: Date.now() - 3600*1000*24,
            likes: 0,
            dislikes: 0,
            score: 0,
            approved: true,
            section: 'Новини',
            comments: []
        };
        await setDocById('posts', p.id, p);
    }
    }

export function startRealtime() {
    onSnapshot(colRef('posts'), snap => {
        postsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderPosts();
    });

    onSnapshot(colRef('users'), snap => {
        usersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderPosts();
        updateUIForLoggedInUser();
    });

    onSnapshot(colRef('roles'), snap => {
        rolesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderPosts();
        updateUIForLoggedInUser();
    });

    onSnapshot(colRef('votes'), snap => {
        votesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderPosts();
    });

    onSnapshot(colRef('sections'), snap => {
        sectionsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderQuickTags();
        renderPosts();
    });

    onSnapshot(colRef('audit'), snap => {
        auditCache = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>b.t-a.t);
    });
}

function readCache(key) {
    switch(key) {
        case 'POSTS': return postsCache;
        case 'USERS': return usersCache;
        case 'ROLES': return rolesCache;
        case 'VOTES': return votesCache;
        case 'SECTIONS': return sectionsCache.map(s => s.name);
        case 'AUD': return auditCache;
        default: return null;
    }
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// ----------------- small helpers -----------------

function renderQuickTags() {
    const s = readCache('SECTIONS') || [];
    const container = document.getElementById('quick-tags');
    if(!container) return;
    container.innerHTML = '';
    s.forEach(sec => {
        const el = document.createElement('button');
        el.className = 'text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-primary hover:text-white transition shadow-sm';
        el.textContent = sec;
        el.onclick = () => filterBySection(sec);
        container.appendChild(el);
});
}

function filterBySection(section) {
    renderPosts({ section });
}

// ===============================================
// CONFIGURABLE PAGINATION
// ===============================================
const pagination = {
  page: 1,
  perPage: 6,  // posts per page
  total: 0,
  containerId: 'pagination',
};

// Smooth fade-in animation for posts
function fadeInElement(el) {
  el.style.opacity = 0;
  el.style.transform = 'translateY(10px)';
  el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  requestAnimationFrame(() => {
    el.style.opacity = 1;
    el.style.transform = 'translateY(0)';
  });
}

// ===============================================
// ENHANCED RENDER WITH PAGINATION SUPPORT
// ===============================================
function renderPosts(opts = {}) {
  const q = (document.getElementById('search')?.value || '').trim().toLowerCase();
  const posts = (postsCache || []).slice();
  const allUsers = usersCache || [];
  const roles = rolesCache || [];
  const perms = getCurrentUserRolePerms();

  let list = posts.filter(p => {
    if (p.approved) return true;
    if (currentUser && (p.authorId === currentUser.id || p.googleId === currentUser.googleId)) return true;
    if (perms.approve) return true;
    return false;
  });

  if (opts.section) list = list.filter(p => p.section === opts.section);
  if (q) list = list.filter(p => (p.title + ' ' + p.content).toLowerCase().includes(q));

  list.sort((a, b) => (b.created || 0) - (a.created || 0));
  pagination.total = list.length;

  // --- PAGINATION CORE ---
  const start = (pagination.page - 1) * pagination.perPage;
  const end = start + pagination.perPage;
  const pageItems = list.slice(start, end);

  const container = document.getElementById('posts-list');
  if (!container) return;
  container.innerHTML = '';

  const votesMap = {};
  for (const vDoc of votesCache) votesMap[vDoc.id] = vDoc.votes || {};

  pageItems.forEach(p => {
    const author = allUsers.find(u => u.id === p.authorId || u.googleId === p.authorId) ||
      { name: p.authorName || 'Гість', role: 'role_student', id: p.authorId || uid(), picture: null };
    const role = roles.find(r => r.id === author.role) || { name: 'Учень', emoji: '📘', color: '#8fb4ff' };
    const el = document.createElement('div');
    el.className = 'reddit-card opacity-0';

    const userVotesForPost = currentUser && votesMap[currentUser.id]
      ? (votesMap[currentUser.id][p.id] || 0) : 0;

    let formattedContent = highlight(p.content, document.getElementById('search')?.value);
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/_(.*?)_/g, '<i>$1</i>');

    let adminActions = '';
    if (!p.approved && perms.approve)
      adminActions += `<button onclick="approvePost('${p.id}')" class="admin-btn green">Схвалити</button>`;
    if (perms.delete)
      adminActions += `<button onclick="deletePost('${p.id}')" class="admin-btn red">Видалити</button>`;

    const avatarSrc = author.picture ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}&background=${role.color?.substring(1) || '3867d6'}&color=fff&size=32`;

    const subredditName = escapeHtml(p.section || 'Загальні');

    el.innerHTML = `
      <!-- Header -->
      <div class="sub-header flex items-center justify-between text-sm text-gray-600 mb-2">
        <div class="flex items-center gap-2">
          <img src="/assets/Logo.jpg" class="w-6 h-6 rounded-full" alt="logo">
          <span class="font-semibold text-gray-800 cursor-pointer hover:underline">r/${subredditName}</span>
          <span class="text-gray-400">•</span>
          <span>${new Date(p.created).toLocaleString('uk-UA')}</span>
        </div>
        <button class="join-btn">Приєднатися</button>
      </div>

      <!-- Main Body -->
      <div class="flex">
        <!-- Votes -->
        <div class="vote-col flex flex-col items-center pr-3">
          <button class="vote-btn up ${userVotesForPost === 1 ? 'active' : ''}">
            <i class="fa-solid fa-arrow-up"></i>
          </button>
          <div class="vote-score">${p.score || 0}</div>
          <button class="vote-btn down ${userVotesForPost === -1 ? 'active' : ''}">
            <i class="fa-solid fa-arrow-down"></i>
          </button>
        </div>

        <!-- Post Content -->
        <div class="flex-1 space-y-2">
          <h3 class="post-title" onclick="openComments(p)">
            ${highlight(p.title, document.getElementById('search')?.value)}
          </h3>

          <p class="post-content">${formattedContent}</p>

          <div class="flex items-center gap-2 text-xs text-gray-500 mt-2">
            <img src="${avatarSrc}" class="w-5 h-5 rounded-full border border-gray-200" alt="">
            <span class="cursor-pointer hover:underline text-gray-700 font-medium" onclick="openUserProfile('${author.id || author.googleId}')">u/${escapeHtml(author.name)}</span>
            <span class="text-gray-400">•</span>
            <span>${role.emoji || '📘'} ${role.name}</span>
            ${!p.approved ? '<span class="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">На розгляді</span>' : ''}
            ${adminActions ? `<div class="ml-auto flex gap-2">${adminActions}</div>` : ''}
          </div>

          <!-- Action Bar -->
          <div class="action-bar flex items-center gap-5 text-sm text-gray-500 pt-2">
            <button class="btn-comment hover:text-blue-600 flex items-center gap-1">
              <i class="fa-regular fa-comment-dots"></i> ${(p.comments || []).length}
            </button>
            <button class="hover:text-sky-500 flex items-center gap-1">
              <i class="fa-regular fa-share-from-square"></i> Поділитись
            </button>
            <button class="hover:text-yellow-500 flex items-center gap-1">
              <i class="fa-regular fa-award"></i> Нагорода
            </button>
            <button class="hover:text-red-500 flex items-center gap-1">
              <i class="fa-regular fa-bookmark"></i> Зберегти
            </button>
          </div>
        </div>
      </div>
    `;

    const upBtn = el.querySelector('.vote-btn.up');
    const downBtn = el.querySelector('.vote-btn.down');
    upBtn.addEventListener('click', () => vote(p.id, 1, upBtn, downBtn));
    downBtn.addEventListener('click', () => vote(p.id, -1, downBtn, upBtn));
    el.querySelector('.btn-comment').addEventListener('click', () => openComments(p));

    container.appendChild(el);
    fadeInElement(el);
  });

  renderPaginationControls();
  document.getElementById('stat-users').textContent = usersCache.length;
  document.getElementById('stat-today').textContent =
    postsCache.filter(p => new Date(p.created).toDateString() === new Date().toDateString()).length;
}


// ===============================================
// PAGINATION CONTROL RENDERER
// ===============================================
function renderPaginationControls() {
  const container = document.getElementById(pagination.containerId);
  if (!container) return;

  const totalPages = Math.ceil(pagination.total / pagination.perPage);
  if (totalPages <= 1) return (container.innerHTML = '');

  let html = `
    <div class="flex justify-center items-center gap-2 mt-6">
      <button class="px-3 py-1 rounded-md border ${pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}" ${pagination.page === 1 ? 'disabled' : ''} id="prevPage">←</button>
      ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
        <button class="px-3 py-1 rounded-md border ${p === pagination.page ? 'bg-primary text-white' : 'hover:bg-gray-100'}" data-page="${p}">${p}</button>
      `).join('')}
      <button class="px-3 py-1 rounded-md border ${pagination.page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}" ${pagination.page === totalPages ? 'disabled' : ''} id="nextPage">→</button>
    </div>
  `;

  container.innerHTML = html;

  container.querySelectorAll('[data-page]').forEach(btn =>
    btn.addEventListener('click', () => {
      pagination.page = parseInt(btn.dataset.page);
      renderPosts();
    })
  );
  container.querySelector('#prevPage')?.addEventListener('click', () => {
    if (pagination.page > 1) {
      pagination.page--;
      renderPosts();
    }
  });
  container.querySelector('#nextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(pagination.total / pagination.perPage);
    if (pagination.page < totalPages) {
      pagination.page++;
      renderPosts();
    }
  });
}

async function vote(postId, delta, btn, otherBtn) {
    if(!currentUser) {
        openLogin();
        return;
    }

    const post = postsCache.find(p => p.id === postId);
    if(!post) return;
    if(!post.approved) {
        showCustomAlert('Ви не можете голосувати за пост, поки він не схвалений модератором.');
        return;
    }


    const userVoteDoc = votesCache.find(v => v.id === currentUser.id);
    const userVotes = (userVoteDoc && typeof userVoteDoc.votes === 'object') ? userVoteDoc.votes : (userVoteDoc ? {...userVoteDoc} : {});

    const currentVote = userVotes[postId] || 0;
    let change = 0;
    let newVote;
    if (currentVote === delta) {
        newVote = 0;
        change = -delta;
    } else {
        newVote = delta;
        change = delta - currentVote;
    }

    const voteDocRef = doc(db, 'votes', currentUser.id);
    await setDoc(voteDocRef, { votes: { ...(userVotes || {}), [postId]: newVote } }, { merge: true });

    const postRef = doc(db, 'posts', postId);
    try {
        await runTransaction(db, async (tx) => {
        const pSnap = await tx.get(postRef);
        if (!pSnap.exists()) throw "Post missing";
        const oldScore = pSnap.data().score || 0;
        tx.update(postRef, { score: oldScore + change });
        });
    } catch (e) {
        console.error('Transaction failed', e);
    }

    await writeAudit(`Голос: ${currentUser.name} -> ${postId} (${delta})`);
}

function openComments(post) {
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

        // push comment to post.comments using transaction to avoid race
        const postRef = doc(db, 'posts', post.id);
        try {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(postRef);
            if(!snap.exists()) throw "Post missing";
            const existing = snap.data().comments || [];
            existing.push(newComment);
            tx.update(postRef, { comments: existing });
        });
        await writeAudit(`Коментар: ${currentUser.name} -> ${post.title}`);
        } catch (e) {
        console.error('adding comment failed', e);
        showCustomAlert('Не вдалося додати коментар. Спробуйте пізніше.');
        }

        closeModal();
    };
    body.appendChild(btn);
    openModal();
    list.scrollTop = list.scrollHeight;
}

window.approvePost = async function(postId) {
    await approvePost(postId, postsCache, currentUser, getCurrentUserRolePerms);
};

window.deletePost = async function(postId) {
    await deletePost(postId, postsCache, currentUser, getCurrentUserRolePerms);
};



document.getElementById('btn-new-post')?.addEventListener('click', () => {
    if(!currentUser) {
        openLogin();
        return;
    }
    const body = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = 'Створити пост';
    body.innerHTML = '';

    body.innerHTML = `
        <div class="space-y-4">
        <input id="new-post-title" type="text" placeholder="Заголовок посту" class="w-full p-3 rounded-xl border-gray-300 focus:ring-primary focus:border-primary shadow-sm" />
        <div>
            <p class="text-sm font-semibold mb-1">Текст посту:</p>
            <div class="flex gap-2 mb-2">
            <button id='b-bold' type="button" class='btn-ghost text-sm'><b>B</b></button>
            <button id='b-italic' type="button" class='btn-ghost text-sm'><i>I</i></button>
            <button id='b-list' type="button" class='btn-ghost text-sm'>• Список</button>
            <span class='text-muted text-sm ml-auto flex items-center'>Слів: <span id='word-count' class="font-semibold ml-1">0</span></span>
            </div>
            <textarea id="new-post-content" placeholder="Текст посту (підтримуються **жирний** та _курсив_)" 
            class="w-full min-h-[180px] p-3 rounded-xl border-gray-300 focus:ring-primary focus:border-primary shadow-sm"></textarea>
        </div>

        <div>
            <p class="text-sm font-semibold mb-1">Виберіть розділ:</p>
            <select id="new-post-section" class="p-3 border-gray-300 rounded-xl shadow-sm"></select>
        </div>

        <button id="btn-submit-post" class="btn-primary w-full">Опублікувати</button>
        </div>
    `;

    const title = document.getElementById('new-post-title');
    const ta = document.getElementById('new-post-content');
    const sec = document.getElementById('new-post-section');
    const btn = document.getElementById('btn-submit-post');


    (readCache('SECTIONS')||[]).forEach(s => {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s;
        sec.appendChild(o);
    });

    document.getElementById('b-bold').onclick = () => { wrapSelection(ta,'**') };
    document.getElementById('b-italic').onclick = () => { wrapSelection(ta,'_') };
    document.getElementById('b-list').onclick = () => { ta.value += '\n- ' };
    ta.addEventListener('input', () => {
        document.getElementById('word-count').textContent = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
    });

    btn.onclick = async () => {
        if(!title.value.trim() || !ta.value.trim()) return showCustomAlert('Будь ласка, вкажіть заголовок та текст посту.','Помилка');

        const perms = getCurrentUserRolePerms();
        const newPost = {
        // let Firestore assign ID, but include an id field for compatibility (we'll set it after add)
        authorId: currentUser.googleId || currentUser.id,
        authorName: currentUser.name,
        title: title.value,
        content: ta.value,
        created: Date.now(),
        likes: 0,
        dislikes: 0,
        score: 0,
        approved: !!perms.autoApprove,
        section: sec.value,
        comments: []
        };

        // add and then set its id field to the doc id
        const docRef = await addDoc(colRef('posts'), newPost);
        await updateDoc(doc(db, 'posts', docRef.id), { id: docRef.id });

        await writeAudit(`Створено пост: ${newPost.title} (${currentUser.name})`);
        if(!newPost.approved) {
        await showCustomAlert(`Ваш пост "${newPost.title}" надіслано на розгляд модерації. Він буде опублікований після схвалення.`, 'Успішно!');
        } else {
        await showCustomAlert(`Ваш пост "${newPost.title}" успішно опубліковано!`, 'Успішно!');
        }

        closeModal();
    };
    openModal();
});

// ----------------- Profile modal (reads from caches) -----------------
document.getElementById('btn-profile')?.addEventListener('click', () => {
    if(!currentUser) {
        openLogin();
        return;
    }

    const body = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = 'Мій Профіль';
    body.innerHTML = '';

    const allRoles = rolesCache || [];
    const userRole = allRoles.find(r => r.id === currentUser.role) || {name:'Учень', emoji:'📘', color:'#8fb4ff'};
    const posts = (postsCache||[]).filter(p => p.authorId === currentUser.id || p.authorId === currentUser.googleId);
    const totalLikes = posts.reduce((s,x) => (s+(x.likes||0)),0);
    const avatarSrc = currentUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3867d6&color=fff&size=80`;

    body.innerHTML = `
        <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 space-y-4">
            <div class="p-4 bg-primary/10 rounded-xl shadow-lg border border-primary/20 text-center">
            <img src="${avatarSrc}" alt="${escapeHtml(currentUser.name)}" class="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-primary" />
            <h4 class="text-xl font-bold text-gray-900">${escapeHtml(currentUser.name)}</h4>
            <div class="text-muted text-sm">${escapeHtml(currentUser.email || '')}</div>
            <div class="mt-2 text-sm">
                <div><strong class="font-semibold">Роль:</strong> <span style="color:${userRole.color}">${userRole.emoji} ${userRole.name}</span></div>
                ${currentUser.grade ? `<div><strong class="font-semibold">Клас:</strong> ${escapeHtml(currentUser.grade)}</div>` : ''}
            </div>
            </div>
            <div class="p-4 bg-white rounded-xl shadow-lg border">
            <h4 class="font-semibold text-lg mb-2">Статистика</h4>
            <div class="text-sm space-y-1">
                <div>Постів: <span class="font-bold">${posts.length}</span></div>
                <div>Лайків отримано: <span class="font-bold text-secondary">${totalLikes}</span></div>
            </div>
            </div>
        </div>
        <div class="lg:col-span-2 p-4 bg-white rounded-xl shadow-lg border">
            <h4 class="font-semibold text-lg mb-3">Ваші пости</h4>
            <div id='profile-posts' class="space-y-3 max-h-80 overflow-y-auto pr-2">
            ${posts.length === 0 ? '<div class="text-muted">Ви ще не створили жодного посту.</div>' : ''}
            ${posts.map(p => `<div class='p-3 rounded-lg border border-gray-100 shadow-sm'>
                <strong>${escapeHtml(p.title)}</strong> 
                <span class="text-xs ${p.approved ? 'text-green-500':'text-yellow-500'} font-semibold ml-2">${p.approved ? 'Схвалено' : 'На розгляді'}</span>
                <div class='text-xs text-muted'>Розділ: ${escapeHtml(p.section||'—')} · ${new Date(p.created).toLocaleString('uk-UA')}</div>
            </div>`).join('')}
            </div>
        </div>
        </div>
    `;
    openModal();
});

document.getElementById('btn-admin')?.addEventListener('click', async () => {
    const perms = getCurrentUserRolePerms();
    if(!perms.approve && !perms.changeRole && !perms.delete) return showCustomAlert('У вас немає прав доступу до адмін-панелі.','Помилка доступу');

    const body = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = 'Адмін-панель';
    body.innerHTML = '';

    const tabs = document.createElement('div');
    tabs.className = 'flex gap-2 border-b border-gray-200 mb-4';
    tabs.innerHTML = `
        ${perms.changeRole ? `<button class='px-4 py-2 rounded-t-lg hover:bg-gray-100 transition tab active' data-tab='users'>Користувачі & Ролі</button>` : ''}
        <button class='px-4 py-2 rounded-t-lg hover:bg-gray-100 transition tab ${!perms.changeRole ? 'active' : ''}' data-tab='sections'>Розділи</button>
        <button class='px-4 py-2 rounded-t-lg hover:bg-gray-100 transition tab' data-tab='audit'>Журнал Дій</button>
    `;
    body.appendChild(tabs);

    tabs.querySelectorAll('.tab').forEach(t => t.addEventListener('click', e => {
        tabs.querySelectorAll('.tab').forEach(x => {
        x.classList.remove('active', 'border-b-2', 'border-primary', 'font-semibold');
        });
        t.classList.add('active', 'border-b-2', 'border-primary', 'font-semibold');
        renderAdminTab(t.dataset.tab);
    }));

    const area = document.createElement('div');
    area.id = 'admin-area';
    area.style.marginTop = '12px';
    body.appendChild(area);

    renderAdminTab(perms.changeRole ? 'users' : 'sections');

    const initialTab = tabs.querySelector('.tab');
    if (initialTab) {
        initialTab.classList.add('active', 'border-b-2', 'border-primary', 'font-semibold');
    }

    openModal();
});

function renderAdminTab(tab) {
    const area = document.getElementById('admin-area');
    if(!area) return;
    area.innerHTML = '';
    const allRoles = rolesCache || [];
    const perms = getCurrentUserRolePerms();

    if(tab === 'users' && perms.changeRole) {
        const users = usersCache || [];
        const list = document.createElement('div');
        list.className = 'space-y-3 max-h-96 overflow-y-auto pr-2';

        users.forEach(u => {
        const userRole = allRoles.find(r => r.id === u.role) || {name:'Учень', emoji:'📘', color:'#8fb4ff'};
        const avatarSrc = u.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=${userRole.color.substring(1)}&color=fff&size=32`;
        const el = document.createElement('div');
        el.className = 'p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center';
        el.innerHTML = `
            <div class="flex items-center gap-3">
            <img src="${avatarSrc}" alt="${escapeHtml(u.name)}" class="w-10 h-10 rounded-full border border-gray-200" />
            <div>
                <div class="font-bold">${escapeHtml(u.name)} <span class="text-xs text-muted ml-2">(ID: ${u.id})</span></div>
                <div class="text-sm text-muted">${escapeHtml(u.email || '')}</div>
                <div class="text-xs font-semibold" style="color:${userRole.color}">${userRole.emoji} ${userRole.name}</div>
            </div>
            </div>
            <select data-user-id="${u.id}" class="p-2 rounded-lg border-gray-300 shadow-sm text-sm w-40">
            ${allRoles.map(r => `<option value="${r.id}" ${u.role === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
            </select>
        `;
        list.appendChild(el);
        });
        area.appendChild(list);

        list.querySelectorAll('select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const targetId = e.target.dataset.userId;
            const newRoleId = e.target.value;
            const targetUser = usersCache.find(u => u.id === targetId);
            const newRole = rolesCache.find(r => r.id === newRoleId);

            const confirmed = await showCustomConfirm(`Призначити користувачу ${targetUser.name} нову роль: <strong>${newRole.name}</strong>?`);
            if(confirmed) {
            await setDocById('users', targetUser.id, { ...targetUser, role: newRoleId });
            await writeAudit(`Зміна ролі: ${currentUser.name} -> ${targetUser.name} (${newRole.name})`);
            showCustomAlert(`Роль ${targetUser.name} змінено на ${newRole.name}.`);
            } else {
            e.target.value = targetUser.role;
            }
        });
        });
    }

    if(tab === 'sections') {
        const secs = sectionsCache || [];
        const list = document.createElement('div');
        list.className = 'space-y-2 max-h-96 overflow-y-auto pr-2';
        secs.forEach(s => {
        const el = document.createElement('div');
        el.className = 'p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center';
        el.innerHTML = `
            <div class="font-medium">${s.name}</div>
            ${perms.delete ? `<button class='btn-ghost text-red-500 text-sm' data-delete='${s.id}'>Видалити</button>` : ''}
        `;
        list.appendChild(el);
        });
        area.appendChild(list);

        area.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => {
        const docId = btn.dataset.delete;
        const secObj = sectionsCache.find(x => x.id === docId);
        const confirmed = await showCustomConfirm(`Видалити розділ "${secObj.name}"? Усі пости залишаться, але будуть без розділу.`, 'Видалення розділу');
        if(!confirmed) return;

        await deleteDocByIdLocal('sections', docId);
        await writeAudit(`Видалений розділ: ${secObj.name}`);
        renderQuickTags();
        }));

        const add = document.createElement('button');
        add.textContent = '➕ Додати розділ';
        add.className = 'btn-primary mt-4';
        add.onclick = async () => {
        const n = await showCustomDialog('Додати новий розділ', '<input id="new-section-name" type="text" placeholder="Назва розділу" class="w-full p-2 border-gray-300 rounded-lg"/>',
            [{ text: 'Скасувати', value: null, className: 'btn-ghost' }, { text: 'Додати', value: true, className: 'btn-primary' }]
        );
        if(n) {
            const name = document.getElementById('new-section-name').value.trim();
            if(!name) return showCustomAlert('Назва не може бути порожньою.','Помилка');
            if((sectionsCache||[]).some(s=>s.name===name)) return showCustomAlert('Такий розділ вже існує.','Помилка');
            await addTo('sections', { name });
            await writeAudit(`Доданий розділ: ${name}`);
            renderQuickTags();
        }
        };
        if (perms.approve) { area.appendChild(add); }
    }

    if(tab === 'audit') {
        const a = auditCache || [];
        const el = document.createElement('div');
        el.className = 'space-y-2 max-h-96 overflow-y-auto pr-2';
        a.forEach(it => {
        const r = document.createElement('div');
        r.className = 'p-3 rounded-lg border border-gray-100 shadow-sm';
        r.innerHTML = `<div class='text-xs text-muted'>${new Date(it.t).toLocaleString('uk-UA')} · ${escapeHtml(it.user || 'Система')}</div><div class="text-sm">${escapeHtml(it.text)}</div>`;
        el.appendChild(r);
        });
        area.appendChild(el);
    }
}

function wrapSelection(ta, wrap) {
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = ta.value.slice(start, end);
    ta.value = ta.value.slice(0, start) + wrap + sel + wrap + ta.value.slice(end);
    ta.focus();
    ta.setSelectionRange(start + wrap.length, end + wrap.length);
}

function openModal() {
    const m = document.getElementById('modal');
    if(!m) return;
    m.classList.add('active');
    m.setAttribute('aria-hidden', 'false');
}
function closeModal() {
    const m = document.getElementById('modal');
    if(!m) return;
    m.classList.remove('active');
    m.setAttribute('aria-hidden', 'true');
}

document.getElementById('modal-close')?.addEventListener('click', closeModal);
document.getElementById('modal')?.addEventListener('click', (e) => { if(e.target.id === 'modal') closeModal(); });

function getCurrentUserRolePerms() {
    if(!currentUser) return {};
    const roles = rolesCache || [];
    const r = roles.find(r => r.id === currentUser.role);
    return (r && r.perms) ? r.perms : {};
    }

    function waitForGoogleAPI() {
        console.log('Google API not required — using redirect-based login.');
    }


    document.getElementById('search')?.addEventListener('input', () => renderPosts());
    document.getElementById('btn-login')?.addEventListener('click', openLogin);

    document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing forum (Firestore backend)...');
    startRealtime();
    setTimeout(async () => {
        await ensureSeed();
    }, 800);

    waitForGoogleAPI();

    renderQuickTags();
    renderPosts();
    updateUIForLoggedInUser();
    console.log('Forum with Google OAuth + Firestore initialized!');
});

function updateUIForLoggedInUser() {
const loginBtn = document.getElementById('btn-login');
const userSection = document.getElementById('user-profile-section');
const adminBtn = document.getElementById('btn-admin');
const userAvatar = document.getElementById('user-avatar');

if (currentUser) {
    if (loginBtn) {
    loginBtn.style.display = 'none';
    }

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
    if (loginBtn) {
    loginBtn.style.display = 'flex';
    }
    
    if (userSection) {
    userSection.classList.add('hidden');
    userSection.style.display = 'none';
    }

    if (adminBtn) {
    adminBtn.style.display = 'none';
    }
}
}

window.signOut = async function() {
    const confirmed = await showCustomConfirm('Ви впевнені, що хочете вийти з акаунту?', 'Підтвердження виходу');
    if (confirmed) {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
        }
        currentUser = null;
        removeLocalCurrentUser();
        updateUIForLoggedInUser();
        await writeAudit('Користувач вийшов з системи');
        renderPosts();
        showCustomAlert('Ви успішно вийшли з системи.', 'До побачення!');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
  const hash = new URLSearchParams(window.location.hash.substring(1));

  // if redirected from Google login
  if (hash.has('access_token')) {
    console.log('Google redirect detected, fetching profile...');
    await handleGoogleRedirect(usersCache, (u) => {
      currentUser = u;
      saveLocalCurrentUser(u);
      updateUIForLoggedInUser();
    });
  } 
  // else restore saved session from localStorage
  else {
    const savedUser = getLocalCurrentUser();
    if (savedUser && isValidSession(savedUser)) {
      console.log('Restoring session for', savedUser.name);
      currentUser = savedUser;
      updateUIForLoggedInUser();
    }
  }
});


window.openUserProfile = function(userId) {
    const user = usersCache.find(u => u.id === userId || u.googleId === userId);
    if(!user) return showCustomAlert('Користувача не знайдено.','Помилка');

    const body = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = `Профіль користувача: ${user.name}`;
    body.innerHTML = '';

    const userRole = rolesCache.find(r => r.id === user.role) || {name:'Невідома', emoji:'❓', color:'#cccccc'};
    const myPosts = (postsCache||[]).filter(p => p.authorId === user.id || p.authorId === user.googleId);
    const totalLikes = myPosts.reduce((s,x) => (s+(x.likes||0)),0);
    const avatarSrc = user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3867d6&color=fff&size=64`;

    body.innerHTML = `
        <div class="p-4 bg-gray-50 rounded-xl space-y-3">
        <div class="flex items-center gap-4">
            <img src="${avatarSrc}" alt="${escapeHtml(user.name)}" class="w-16 h-16 rounded-full border-2 border-primary" />
            <div>
            <h4 class="text-xl font-bold">${escapeHtml(user.name)}</h4>
            <div class="text-sm text-muted">${escapeHtml(user.email || '')}</div>
            <div class="text-xs text-muted mt-1">Приєднався: ${escapeHtml(user.joined || '')}</div>
            </div>
        </div>
        <div class="flex flex-wrap gap-4 text-sm pt-2">
            <div><strong class="text-gray-900">Роль:</strong> <span style="color:${userRole.color}">${userRole.emoji} ${userRole.name}</span></div>
            ${user.grade ? `<div><strong class="text-gray-900">Клас:</strong> ${escapeHtml(user.grade)}</div>` : ''}
        </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-4">
        <div class="p-4 bg-white rounded-xl shadow-sm border">
            <p class="font-semibold text-lg">Статистика</p>
            <div class="text-sm space-y-1 mt-2">
            <div>Постів: <span class="font-bold">${myPosts.length}</span></div>
            <div>Лайків отримано: <span class="font-bold text-secondary">${totalLikes}</span></div>
            </div>
        </div>
        <div class="p-4 bg-white rounded-xl shadow-sm border">
            <p class="font-semibold text-lg">Останні пости</p>
            <div class="text-sm space-y-1 mt-2 max-h-28 overflow-y-auto">
            ${myPosts.slice(0,3).map(p => `<div class="truncate text-gray-700">· ${escapeHtml(p.title)}</div>`).join('')}
            ${myPosts.length === 0 ? '<div class="text-muted">Постів поки немає.</div>' : ''}
            </div>
        </div>
        </div>
    `;
    openModal();
}
