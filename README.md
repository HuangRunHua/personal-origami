# 仿折作品展示 · Origami Gallery

个人折纸作品分享用静态站，主展示成品摄影与作品信息。可部署为 GitHub Project Pages，地址形如：`https://<用户名>.github.io/<仓库名>/`（仓库名自定，例如 `origami`）。

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

## 替换图片与文案

- 将成品照片放在 `images/works/`，在 `data/works.json` 中更新条目（路径、设计署名、纸张说明等）。
- 修改 `index.html` 中的个人介绍、关于段落与页脚信息。

## 许可

网站代码你可自由按需要修改。
