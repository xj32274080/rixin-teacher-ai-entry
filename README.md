# 日新教师 AI 工作台

面向小学教师、一线教师培训和校本教研的任务型 AI 工作入口。首页从教师正在处理的任务出发，把可直接使用的网页工具、可复制的提示词、组合工作流和必要的使用边界放在同一条路径中。

V2.1 的核心原则是：

> 首页不是工具展览馆，而是教师解决真实任务的起点。

## V2.1 页面结构

桌面端采用固定轻侧栏和右侧主工作区，移动端采用顶部品牌栏和固定底部导航。站点包含三个 Hash 视图，刷新后保留当前位置：

```text
#home     首页 Bento 工作区
#tools    独立工具库
#prompts  独立提示词库
```

首页只保留启动行动所需的内容：

1. 大型搜索、6 个快捷任务和一行隐私提醒；
2. 4 个常用工具与当前任务的标准路径；
3. 一个核心教学工具、写作与阅读专区、课堂观察专区；
4. 3 条精选提示词和有可靠日期的最近更新。

完整资源不在首页展开。搜索范围覆盖工具名称、别名、说明、场景、标签、补充关键词，以及提示词标题、分类和使用场景。选择任务后回到首页，核心工具、推荐路径、精选提示词和相关专区同步更新；全部匹配结果进入工具库或提示词库查看。

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
- `searchKeywords`：补充常见搜索词；
- `updatedAt`：目录内容最后确认或更新日期，只写可核验的 `YYYY-MM-DD`；
- `screenshotUrl`：本地真实工具截图路径，不使用生成式概念图代替。

只有同时满足以下条件的工具才会渲染外部跳转：

```text
visibility === "public"
status === "online"
url 为有效的 http/https 地址
```

内部、维护者、建设中或待确认项目只显示状态和详情，不提供“打开工具”按钮。由于 GitHub Pages 会公开 JSON，内部项目的 `link`、`url`、`demoUrl`、`guideUrl` 必须为空，`pendingLinks` 必须是空数组；真实内部地址也不能写入 HTML、JavaScript、Markdown、注释或示例。

### `prompts.json`

提示词正文不写入 HTML。V2 新增：

- `featured`、`featuredOrder`；
- `taskGroups`；
- `homepageSummary`；
- `searchKeywords`。

首页只显示 3 条精选提示词；提示词库显示全部提示词，并提供搜索、分类、复制和详情。

### `workflows.json`

每条工作流包含：

- `id`、`title`、`description`、`icon`；
- `toolIds`、`promptIds`；
- `steps`：按顺序引用工具或提示词，`label` 用于详情，`shortLabel` 用于首页紧凑路径。

工作流只通过已有 ID 关联内容。不存在的 ID 会被安全跳过；工作流加载失败也不会影响工具与提示词列表。

## 维护方式

### 新增工具

1. 保留完整说明、隐私提醒、使用边界和来源；
2. 确认 `type`、`status`、`visibility` 与正式 `url`；
3. 设置一个统一 `primaryCategory` 和至少一个 `taskGroups`；
4. 编写不超过 45 个汉字的 `homepageSummary`；
5. 如需推荐，设置 `featured: true` 和唯一 `featuredOrder`；
6. 不确定的公开入口只在 `pending-inputs.md` 记录文字状态，不记录真实内部地址；
7. “最近更新”需要可靠日期时再填写 `updatedAt`，它不是外部工具发布日期。

### 新增提示词

保留标题、分类、使用场景、输入材料、完整提示词、输出格式、使用提醒、标签与关联工具，并补充任务分组和首页短说明。

### 新增工作流

在 `workflows.json` 增加对象，只引用已经存在的工具或提示词 ID。内部工具可以保留在维护数据中，但普通访问者的工作流只会显示公开工具。

## 数据加载与隐私

- 三个 JSON 文件独立加载和重试，单个文件失败时只显示局部错误；
- 所有 JSON 文本在写入模板前进行 HTML 转义；
- 外部链接统一新窗口打开并使用 `noopener noreferrer`；
- 首页、工具库和提示词库使用 `#home`、`#tools`、`#prompts` 切换，不复制数据；
- 涉及学生姓名、照片、作文、评语或家庭信息时，必须先脱敏，再由教师人工审核；
- AI 输出不能替代教师对教材、学情、课堂事实和沟通边界的专业判断。

## 发布前检查

```bash
node -e "JSON.parse(require('fs').readFileSync('tools.json','utf8')); JSON.parse(require('fs').readFileSync('prompts.json','utf8')); JSON.parse(require('fs').readFileSync('workflows.json','utf8')); console.log('JSON ok')"
node --check app.js
git diff --check
```

浏览器验收至少覆盖：三个视图及 Hash 刷新、搜索、任务与分类筛选、工作流、工具详情、提示词详情与复制、内部项目折叠、移动任务抽屉和底部导航、键盘关闭弹窗，以及 1440×900、1366×768、1280×720、1024×768、768×1024、390×844、360×800 下的横向溢出。
