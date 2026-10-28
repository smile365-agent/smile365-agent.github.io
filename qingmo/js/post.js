document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('app');
  const id = new URLSearchParams(location.search).get('id');
  root.innerHTML = `<div class="wrap">${topNav()}<div class="skeleton"></div></div>`;
  try {
    const posts = await loadAllPosts();
    const p = getPostById(posts, id);
    if (!p) {
      root.innerHTML = `<div class="wrap">${topNav()}
        <div class="missing">
          <p>找不到这篇文章</p>
          <a class="back" href="index.html">← 返回列表</a>
        </div></div>`;
      return;
    }
    root.innerHTML = `<div class="wrap">${topNav()}
      <article>
        <header class="post-header">
          <h1>${escapeHtml(p.title)}</h1>
          <div class="meta">${escapeHtml(p.author)} · ${formatDate(p.createdAt)}</div>
        </header>
        <div class="post-body">${escapeHtml(p.body || '')}</div>
        <a class="back" href="index.html">← 返回列表</a>
      </article></div>`;
  } catch (e) {
    root.innerHTML = `<div class="wrap">${topNav()}<p class="err show">${escapeHtml(e.message)}</p></div>`;
  }
});
