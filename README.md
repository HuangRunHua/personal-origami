# 仿折集

个人折纸作品记录站。这里收着成品照片，也记下设计者、用纸、完成时间和一些简短的折制感受。

在线访问：<https://huangrunhua.github.io/personal-origami/>

## 这个仓库里有什么

- `index.html`：页面主体结构与主要文案
- `css/styles.css`：样式与版式
- `js/main.js`：作品列表、筛选、灯箱等交互
- `data/works.json`：作品数据
- `images/works/`：作品图片资源

## 本地预览

在仓库根目录运行任意静态服务器，例如：

```bash
python3 -m http.server 8080
```

然后在浏览器打开 <http://localhost:8080>。

## 内容维护

- 新作品图片放在 `images/works/`
- 在 `data/works.json` 中补充作品标题、设计者、用纸、时间和备注
- 若一件作品有多张照片，可使用 `images: ["a.jpg", "b.jpg"]`
- 若需调整页面文案或模块结构，直接修改 `index.html` 与 `css/styles.css`

## 部署

本站使用 GitHub Pages，从 `main` 分支的仓库根目录发布。若更新后线上未立即生效，通常等待几分钟即可。

## 许可

网站代码可按需修改；作品图片与文案请勿擅自转载或另作他用。
