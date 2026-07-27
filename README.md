<div align="center">

# ☕ CocaCode Dock

**一个轻量的 Windows 分类启动栏**

[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey?style=for-the-badge)](https://www.microsoft.com/windows)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.3.2-blue?style=for-the-badge)](CHANGELOG.md)

需要时唤出，不需要时安静待在系统托盘里——不占屏幕，不碍事。

</div>

---

## 👋 关于这个小作品

嗨，我是 **CocaCode**。

实话说，我并不是开发者——这是我在学编程的**第7天**写下的**第二个小作品**。

平时用 Windows，总觉得缺一个顺手、不打扰人的程序启动栏，于是照着自己最常用的习惯，一时兴起做了这个 **CocaCode Dock**。跟各位大神前辈们的作品比起来，它大概只是间小小的"陋室"，但里面的每一项功能，都是我最常用、最想要的。

它**不占屏幕、不吵你**：平时安静地待在系统托盘，需要时点一下图标就唤出，关掉窗口就收起，轻巧、随手。

---

## ✨ 主要功能特点

- **托盘常驻，一键唤出**：点击托盘图标弹出主窗口；关闭窗口只是收起到托盘，程序不退出（类似微信 / QQ），不占屏幕空间。
- **八类分组，井井有条**：常用（置顶）/ 设计 / 编程 / 办公 / 娱乐 / 工具 / 其他 / 收藏夹，左侧栏一目了然。
- **分组管理**：随时添加、重命名、删除分组，并拖动调整顺序；"常用""收藏夹"为系统分组，固定不动。
- **开机自动扫描归类**：首次启动自动扫描本机已装软件（开始菜单、Program Files 等），按规则预分类；你手动调整过的不会被覆盖。
- **五种视图尺寸**：图标 96 / 48 / 32 / 16 与列表视图，一键切换，舒服就好。
- **网址收藏夹**：独立分类收藏常用网址，悬停即显示链接，添加时自动生成纯色字母图标。
- **真实图标提取**：自动提取程序真实图标；无图标时回退到分类通用图标，界面统一干净。
- **右键即所用**：重命名、管理员运行、打开安装路径、打开本地源文件、卸载、移入分组、编辑、删除，还能一键以管理员运行 CMD / PowerShell。
- **模糊 + 精准搜索**：再多的程序也能秒找到。
- **配置可备份**：设置内一键导入 / 导出，换机不丢。

---

## 📦 快速使用（免构建）

1. 复制 `dist/win-unpacked` **整个文件夹**到任意位置
2. 双击 `CocaCodeDock.exe` 即可

> 当前为个人使用版本，未在 Windows 做代码签名，SmartScreen 可能提示「未知发布者」，点击「仍要运行」即可。

---

## 🛠️ 从源码开发

```bash
# 1. 安装依赖
npm install

# 2. 开发预览（需要本机已安装 electron 运行时）
npm start

# 3. 打包为 Windows 可执行文件（便携版）
#    本仓库已放弃 electron-builder 自动签名（沙箱无证书），
#    改用手动打包，保证无签名环境下也能产出可用 exe：
#    a. 将 node_modules/electron/dist 复制为 dist/win-unpacked
#    b. 将 src 复制到 dist/win-unpacked/resources/app
#    c. 将 dist/win-unpacked/electron.exe 重命名为 CocaCodeDock.exe
```

---

## 📁 目录结构

```
CocaCode Dock/
├── src/
│   ├── main/                # Electron 主进程
│   │   ├── main.js          # 窗口 / 托盘 / 扫描 / IPC
│   │   ├── preload.js       # 渲染进程安全桥接
│   │   ├── store.js         # JSON 配置存储
│   │   └── data-schema.js   # 分类清单 / 自动归类 / 数据校验
│   └── renderer/            # 界面（HTML / CSS / JS）
│       ├── index.html
│       ├── styles.css       # 苹果风设计令牌
│       └── app.js           # 交互逻辑
├── assets/icon.ico          # 窗口图标素材
├── dist/win-unpacked/       # 打包产物（已被 .gitignore 忽略）
├── package.json
├── README.md
├── CHANGELOG.md
├── LICENSE
└── .gitignore
```

---

## 💾 数据存储

配置保存在用户目录下的 JSON 文件（运行时路径由 `src/main/store.js` 决定），支持在设置内导出 / 导入备份。

---

## 🙏 致谢

本项目基于 [GameDock](https://github.com/kevclint/GameDock)（MIT License）改造，感谢原作者 Clint Lorenzo。

---

## 📄 许可证

[MIT](LICENSE) — 版权归 **CocaCode**，原作者 Clint Lorenzo 版权保留。

---

<p align="center">
作者：<b>CocaCode</b> · <a href="https://github.com/G-zorro">GitHub</a>
</p>
