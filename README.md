# 日新教师 AI 工作台

面向小学教师、一线教师培训和校本教研的任务型 AI 工作入口。首页从教师正在处理的任务出发，把可直接使用的网页工具、可复制的提示词、组合工作流和必要的使用边界放在同一条路径中。

V2 的核心原则是：

> 首页不是工具展览馆，而是教师解决真实任务的起点。

## V2 页面结构

首页按以下顺序组织：

1. 吸顶导航与全局搜索；
2. 5 个高频任务入口；
3. 6 个核心推荐工具；
4. 数据驱动的“为你推荐”工作流；
5. 全部公开工具与分类筛选；
6. 默认折叠的实验项目与维护者工具；
7. 独立的提示词列表；
8. 工具/提示词详情弹窗与统一页脚。

搜索范围覆盖工具名称、别名、说明、场景、标签、补充关键词，以及提示词标题、分类和使用场景。选择任务后，工具和提示词会按任务分组筛选，并显示对应工作流。

## 技术路线

- 原生 HTML、CSS、JavaScript；
- JSON 数据驱动；
- 不依赖构建工具、远程字体、图标 CDN 或后端服务；
- 图标使用 `index.html` 内的本地 SVG sprite；
- 保持 GitHub Pages 根目录部署方式。

## 本地预览

进入项目目录后运行：

```bash
python -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/`。如果端口已被其他项目占用，可临时换用其他端口。不要直接双击 `index.html`，否则浏览器可能阻止 JSON 加载。

## 数据文件

### `tools.json`

原字段继续保留，V2 新增以下首页字段：

- `primaryCategory`：只能是“教学设计、写作与阅读、课堂观察与诊断、成果呈现、班级事务、教研与资料”之一；
- `taskGroups`：可包含“备课与作业、写作与阅读、课堂观察与诊断、成果整理与展示、班级事务与效率”；
- `visibility`：`public`、`internal`、`maintainer` 或 `hidden`；
- `featured`：是否进入 6 个核心推荐工具；
- `featuredOrder`：推荐顺序；
- `icon`：本地 SVG 图标名称；
- `homepageSummary`：首页短说明；
- `searchKeywords`：补充常见搜索词。

只有同时满足以下条件的工具才会渲染外部跳转：

```text
visibility === "public"
status === "online"
url 为有效的 http/https 地址
```

内部、维护者、建设中或待确认项目只显示状态和详情，不渲染 `url`、`pendingLinks` 或误导性的“打开工具”按钮。

### `prompts.json`

提示词正文不写入 HTML。V2 新增：

- `featured`、`featuredOrder`；
- `taskGroups`；
- `homepageSummary`；
- `searchKeywords`。

首页默认显示 6 条推荐提示词；搜索、任务筛选、分类筛选或“查看全部提示词”可以访问其余内容。

### `workflows.json`

每条工作流包含：

- `id`、`title`、`description`、`icon`；
- `toolIds`、`promptIds`；
- `steps`：按顺序引用工具或提示词，并提供动作说明。

工作流只通过已有 ID 关联内容。不存在的 ID 会被安全跳过；工作流加载失败也不会影响工具与提示词列表。

## 维护方式

### 新增工具

1. 保留完整说明、隐私提醒、使用边界和来源；
2. 确认 `type`、`status`、`visibility` 与正式 `url`；
3. 设置一个统一 `primaryCategory` 和至少一个 `taskGroups`；
4. 编写不超过 45 个汉字的 `homepageSummary`；
5. 如需推荐，设置 `featured: true` 和唯一 `featuredOrder`；
6. 不确定的链接写入 `pending-inputs.md`，不要伪装为公开入口。

### 新增提示词

保留标题、分类、使用场景、输入材料、完整提示词、输出格式、使用提醒、标签与关联工具，并补充任务分组和首页短说明。

### 新增工作流

在 `workflows.json` 增加对象，只引用已经存在的工具或提示词 ID。内部工具可以保留在维护数据中，但普通访问者的工作流只会显示公开工具。

## 数据加载与隐私

- 三个 JSON 文件独立加载和重试，单个文件失败时只显示局部错误；
- 所有 JSON 文本在写入模板前进行 HTML 转义；
- 外部链接统一新窗口打开并使用 `noopener noreferrer`；
- 涉及学生姓名、照片、作文、评语或家庭信息时，必须先脱敏，再由教师人工审核；
- AI 输出不能替代教师对教材、学情、课堂事实和沟通边界的专业判断。

## 发布前检查

```bash
node -e "JSON.parse(require('fs').readFileSync('tools.json','utf8')); JSON.parse(require('fs').readFileSync('prompts.json','utf8')); JSON.parse(require('fs').readFileSync('workflows.json','utf8')); console.log('JSON ok')"
node --check app.js
git diff --check
```

浏览器验收至少覆盖：搜索、任务与分类筛选、工作流、工具详情、提示词详情与复制、内部项目折叠、移动菜单、键盘关闭弹窗，以及 360、390、768、1024、1280、1440 宽度下的横向溢出。
