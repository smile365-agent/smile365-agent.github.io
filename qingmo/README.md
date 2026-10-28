# 轻墨 · 前端静态站

纯 HTML/CSS/JS。四页：`index.html` / `post.html?id=` / `write.html` / `about.html`。

## 预览

```bash
cd /workspace/demo-qingmo/site
python3 -m http.server 8765
```

打开 http://127.0.0.1:8765/

数据：`api/posts.json` + `api/about.json`；写文用 localStorage（`qingmo_extra_posts`）会话内可见。
