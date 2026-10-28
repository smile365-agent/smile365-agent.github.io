document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('app');
  root.innerHTML = `<div class="wrap">${topNav('about')}<div class="skeleton"></div></div>`;
  try {
    const res = await fetch('api/about.json');
    const data = await res.json();
    root.innerHTML = `<div class="wrap">${topNav('about')}
      <div class="about-block">
        <h1 class="page-title">${escapeHtml(data.name || '轻墨')}</h1>
        <p class="tagline">${escapeHtml(data.tagline || '')}</p>
        <div class="body">${escapeHtml(data.body || '')}</div>
        <ul>
          <li>本站为<strong>演示</strong>用途，数据为假数据，刷新后会话内容可能丢失。</li>
          <li><strong>非商业化</strong>；无真实账号体系，不收集真实用户信息。</li>
          <li>无登录、无支付、无评论；不接生产数据库。</li>
        </ul>
      </div></div>`;
  } catch (e) {
    root.innerHTML = `<div class="wrap">${topNav('about')}
      <div class="about-block">
        <h1 class="page-title">轻墨</h1>
        <div class="body">轻墨是演示用的简易博客。</div>
        <ul>
          <li>本站为<strong>演示</strong>用途。</li>
          <li><strong>非商业化</strong>；无真实账号与支付。</li>
        </ul>
      </div></div>`;
  }
});
