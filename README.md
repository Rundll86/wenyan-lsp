# 文言语言服务器协议（LSP）扩展

这是一个为文言编程语言提供智能编辑支持的VSCode扩展。

## 功能特性

- 语法错误诊断
- 代码补全
- 跳转到定义
- 悬停提示

## 安装使用

1. 克隆仓库
2. 安装依赖：`yarn install`
3. 构建项目：`yarn compile`
4. 按F5运行扩展进行调试

## 开发说明

### 项目结构

- `src/client/` - VSCode扩展客户端代码
- `src/server/` - LSP服务器实现
- `src/engine/` - 文言编译器和运行时引擎（子模块）

### 调试

使用VSCode的调试功能，选择"扩展+服务器"配置可以同时调试客户端和服务器。

## 依赖

- vscode-languageclient
- vscode-languageserver
- tgkw（文言引擎）