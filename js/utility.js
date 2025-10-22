// Cache helpers moved from forum.module.js
export function readCache(key, postsCache, usersCache, rolesCache, votesCache, sectionsCache, auditCache) {
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

export function getCurrentUserRolePerms(currentUser, rolesCache) {
    if(!currentUser) return {};
    const roles = rolesCache || [];
    const r = roles.find(r => r.id === currentUser.role);
    return (r && r.perms) ? r.perms : {};
}

// parseJwt moved from forum.module.js
export function parseJwt(token) {
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

import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { firebaseConfig } from "./config.js";

export const GOOGLE_CLIENT_ID = '497455412781-bvsamm71v59t2jkflci0kp6mq223p305.apps.googleusercontent.com';
export const LS = {
    CURRENT_USER: 'lpg_current_user'
};

export const defaultRoles = [
    { id: 'role_student', name: 'Учень', emoji: '📘', color:'#8fb4ff', perms: { autoApprove:false, approve:false, delete:false, changeRole:false } },
    { id: 'role_selfgov', name: 'Самоврядування', emoji:'🟢', color:'#9ff0d2', perms:{ autoApprove:true, approve:true, delete:true, changeRole:false } },
    { id: 'role_tech', name: 'Технічний Адмін', emoji:'🛠️', color:'#d0d0ff', perms:{ autoApprove:true, approve:true, delete:true, changeRole:true } }
];

export const defaultSections = ['Новини','Пропозиції','Події','Спорт','Клуби','Загальні'];

export function uid() {
    return 'id_' + Math.random().toString(36).slice(2,11);
}

export function escapeHtml(s) {
    return (s || '').replace(/[&<>\"]/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
    }[m]));
}

export function highlight(text, q) {
    if(!q) return escapeHtml(text);
    const re = new RegExp('(' + escapeReg(q) + ')', 'ig');
    return escapeHtml(text).replace(re, m => '<mark>' + m + '</mark>');
}

export function escapeReg(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function colRef(name) {
    return collection(db, name);
}

export async function addTo(collName, obj) {
    const ref = await addDoc(colRef(collName), obj);
    return ref.id;
}

export async function setDocById(collName, id, obj) {
    await setDoc(doc(db, collName, id), obj, { merge: true });
}

export async function updateDocByIdLocal(collName, id, data) {
    await updateDoc(doc(db, collName, id), data);
}

export async function deleteDocByIdLocal(collName, id) {
    await deleteDoc(doc(db, collName, id));
}

export async function writeAudit(text) {
    await addTo('audit', { t: Date.now(), text });
}
