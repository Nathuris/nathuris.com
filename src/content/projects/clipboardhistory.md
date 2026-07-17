---
title: ClipboardHistory
order: 0
image: /uploads/截屏2026-07-17 19.10.37.jpg
description: 适用于MacOS的剪贴板工具
sourceUrl: https://github.com/Nathuris/ClipboardHistory
---

**ClipboardHistory** — macOS 菜单栏剪贴板历史管理工具，纯 Swift 原生开发。

**功能**：自动记录文字/图片复制历史，支持搜索、置顶、删除。黑名单 App 的敏感内容经 AES-256-GCM 加密存储，查看时需 Touch ID 验证。全局快捷键唤出面板，定时自动清理过期记录。

**技术**：SwiftUI + AppKit 混合，纯系统框架零外部依赖。三层架构 — 数据层用 SQLite3 裸 API 直连，服务层负责剪贴板轮询/加密/清理调度，视图层用卡片式泛列表呈现。菜单栏常驻模式（不占 Dock 栏）。
