# 仿折集 · 静态站点

个人折纸习作分享站（成品照与元数据），可部署在 GitHub Pages。访问地址示例：`https://<用户名>.github.io/<仓库名>/`（仓库名自定，例如 `origami`）。

## 本地预览

在仓库根目录用任意静态服务器打开，例如：

```bash
cd personal-origami
python3 -m http.server 8080
```

浏览器访问 <http://localhost:8080>。

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库，将本目录推送上去。
2. 仓库 **Settings → Pages**：
   - Source 选 **Deploy from a branch**
   - Branch 选 `main`（或 `master`），文件夹 `/ (root)`。
3. 几分钟后可通过 `https://<用户名>.github.io/<仓库名>/` 访问。

若你使用用户站点仓库 `username.github.io`，本仓库可改为子项目或整站迁移，路径规则以 GitHub 文档为准。

## 日常维护

- 成品图放在 `images/works/`，在 `data/works.json` 中维护作品条目（图片路径、标题、设计者、纸张、标签等）。
- 全站通栏、关于、选集、问答等正文已在 `index.html` 中定稿；若需改版式或文案，直接编辑 `index.html` 与 `css/styles.css`。

## 许可

网站代码你可自由按需要修改。
