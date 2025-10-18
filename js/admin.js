// admin.js
import { setDocById, updateDocByIdLocal, deleteDocByIdLocal, addTo, writeAudit } from './utility.js';
import { showCustomAlert, showCustomConfirm } from './ui.js';

export async function approvePost(postId, postsCache, currentUser, getCurrentUserRolePerms) {
    const perms = getCurrentUserRolePerms();
    if(!perms.approve) return showCustomAlert('У вас недостатньо прав для схвалення постів.','Помилка доступу');
    const p = postsCache.find(x => x.id === postId);
    if(!p) return;
    const confirmed = await showCustomConfirm(`Ви впевнені, що хочете схвалити пост "${p.title}"?`);
    if (confirmed) {
        await updateDocByIdLocal('posts', postId, { approved: true });
        await writeAudit(`Схвалено пост: ${p.title} (${currentUser.name})`);
        showCustomAlert(`Пост "${p.title}" успішно схвалено та опубліковано!`);
    }
}

export async function deletePost(postId, postsCache, currentUser, getCurrentUserRolePerms) {
    const perms = getCurrentUserRolePerms();
    if(!perms.delete) return showCustomAlert('У вас недостатньо прав для видалення постів.','Помилка доступу');
    const p = postsCache.find(x => x.id === postId);
    if(!p) return;
    const confirmed = await showCustomConfirm(`Ви впевнені, що хочете видалити пост "${p.title}"? Це незворотна дія.`, 'Видалення посту');
    if (confirmed) {
        await deleteDocByIdLocal('posts', postId);
        await writeAudit(`Видалено пост: ${p.title} (${currentUser.name})`);
    }
}
