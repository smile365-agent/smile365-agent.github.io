document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  root.innerHTML = `<div class="wrap">${topNav('write')}
    <h1 class="page-title">写一篇</h1>
    <form id="form" novalidate>
      <div class="form-group">
        <label>标题 <span class="req">*</span></label>
        <input type="text" id="title" maxlength="200" autocomplete="off" />
        <div class="err" id="err-title">请填写标题</div>
      </div>
      <div class="form-group">
        <label>正文 <span class="req">*</span></label>
        <textarea id="body"></textarea>
        <div class="err" id="err-body">请填写正文</div>
      </div>
      <button type="submit" class="btn">发布</button>
      <p class="hint">演示：成功后 mock 回首页可见新文（会话内）。</p>
    </form>
  </div>`;

  document.getElementById('form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const title = document.getElementById('title').value.trim();
    const body = document.getElementById('body').value.trim();
    const et = document.getElementById('err-title');
    const eb = document.getElementById('err-body');
    et.classList.toggle('show', !title);
    eb.classList.toggle('show', !body);
    if (!title || !body) return;

    const summary = body.slice(0, 80);
    const post = {
      id: 'p_demo_' + Date.now(),
      title,
      summary,
      body,
      author: '访客',
      createdAt: new Date().toISOString(),
    };
    const extra = loadExtra();
    extra.unshift(post);
    saveExtra(extra);
    root.innerHTML = `<div class="wrap">${topNav('write')}
      <div class="toast">已发布（演示）</div>
      <p><a href="index.html">回首页</a></p></div>`;
    setTimeout(() => { location.href = 'index.html'; }, 800);
  });
});
