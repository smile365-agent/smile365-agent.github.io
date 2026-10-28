document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('app');
  root.innerHTML = `<div class="wrap">${topNav()}${Array(3).fill('<div class="skeleton"></div>').join('')}</div>`;
  try {
    const posts = await loadAllPosts();
    const list = posts.length
      ? posts.map(p => `<article class="post-card">
          <h2><a href="post.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.title)}</a></h2>
          <p class="summary">${escapeHtml(p.summary || '')}</p>
          <div class="meta">${escapeHtml(p.author)} · ${formatDate(p.createdAt)}</div>
        </article>`).join('')
      : `<div class="empty">暂无文章。<a href="write.html">去写一篇</a></div>`;
    root.innerHTML = `<div class="wrap">${topNav()}<main>${list}</main></div>`;
  } catch (e) {
    root.innerHTML = `<div class="wrap">${topNav()}<p class="err show">${escapeHtml(e.message)}</p></div>`;
  }
});
