# 日新教师 AI 工作台

当前版本：**V2.2 新手友好简化版**。

这是一个面向普通教师的静态 AI 教学工具入口。默认用户可能第一次接触这些工具、数字技能一般、没有时间研究复杂术语，因此首页只帮助老师做一件事：从手头的教学任务出发，先找到一个可以开始的工具。

## V2.2 为什么做减法

V2.1 已经具备完整的工具、AI 指令、搜索、详情和维护信息，但首页同时出现太多入口。V2.2 不增加功能，而是调整信息出现的顺序：

1. 首页先选择今天要做的事；
2. 每项任务先推荐一个工具；
3. 其他选择和完整步骤默认收起；
4. 全部工具、AI 助手指令和专业详情在需要时再进入。

首页只保留三个区域：五项教学任务、四个常用工具、辅助搜索。GitHub、维护记录、复杂标签和项目状态不进入首页主视觉。

## 页面与入口语义

```text
#home     首页与五项教学任务聚焦页
#tools    全部工具、工具搜索结果或某项任务的工具
#prompts  AI 助手指令
```

工具库的三种入口必须使用不同函数，避免残留上一次筛选：

- `openAllTools()`：清空搜索词、任务、分类和“仅可打开”，显示全部公开工具；
- `openToolSearchResults(query)`：保留搜索词，清空无关筛选，显示搜索结果；
- `openToolsForTask(task)`：保留教学任务，清空搜索词和无关筛选，显示该任务的工具。

主导航进入“AI 助手指令”时会清空搜索词、任务和用途筛选。工具筛选和 AI 指令用途筛选默认折叠。

一级导航始终只有一个选中项：首页任务选择状态选中“首页”，进入具体任务后选中“教学任务”，工具库和 AI 助手指令分别选中自己的入口。桌面侧栏与手机底部导航使用同一套状态规则。

## AI 助手指令是什么

`#prompts` 在数据和路由层仍沿用 prompts，界面统一称为“AI 助手指令”。老师可以复制完整内容，再粘贴到 ChatGPT、DeepSeek、Kimi 等 AI 工具中使用。列表只显示任务化标题、一句说明和两个操作按钮；正式标题、完整原文、使用准备、输出说明和提醒放在详情中。

第三个新手任务入口使用“我要看看学生学得怎么样”，帮助教师先看见学生的学习进展和需要支持的地方；内部任务值仍为“课堂观察与诊断”。

## 数据文件

- `tools.json`：公开工具、校内项目和维护项目；
- `prompts.json`：可复制的 AI 助手指令；
- `workflows.json`：五项教学任务的建议步骤，只引用已存在的工具或指令 ID。

### 新手字段

工具和指令可以增加以下字段：

- `noviceTitle`：列表优先显示的直白标题；
- `noviceSummary`：一句话说明能帮老师做什么；
- `primaryActionLabel`：主按钮文字，工具通常为“打开工具”，指令通常为“复制给 AI”；
- `noviceFeatured`：可选，供后续维护新手推荐位使用。

这些字段不替代专业字段。缺失时页面会自动回退到 `name/title`、`homepageSummary/shortDescription/scenario` 和默认动作文字。详情继续展示正式名称、使用方式、适用场景、边界和隐私提醒。

## 工具库收录规则

公开列表只显示 `visibility: "public"` 的项目。只有同时满足以下条件才会产生公开外链：

1. `visibility` 为 `public`；
2. `status` 为 `online`；
3. `url` 是有效的 `http` 或 `https` 地址。

校内项目、建设中项目和维护者能力包放在工具库底部“更多项目”中，默认折叠，不提供公开链接。

新增工具时：

1. 使用唯一 `id`；
2. 填写 `primaryCategory` 和至少一个 `taskGroups`；
3. 为新手列表补充 `noviceTitle`、`noviceSummary`、`primaryActionLabel`；
4. 公开工具核对 `visibility/status/url`；
5. 在详情字段中说明使用方式、边界和隐私提醒；
6. 若属于任务步骤，再把 ID 加入 `workflows.json`。

## 本地运行

这是原生 HTML/CSS/JavaScript 项目，必须通过 HTTP 服务运行，以便加载 JSON：

```powershell
python -m http.server 4174
```

然后访问 `http://127.0.0.1:4174/`。

## 提交前检查

```powershell
node -e "JSON.parse(require('fs').readFileSync('tools.json','utf8')); JSON.parse(require('fs').readFileSync('prompts.json','utf8')); JSON.parse(require('fs').readFileSync('workflows.json','utf8')); console.log('JSON ok')"
node --check app.js
git diff --check
```

浏览器至少检查首页五项任务、备课聚焦、全部工具、搜索“错题”、AI 助手指令、复制、详情弹窗、键盘关闭，以及 360px 和 390px 手机宽度无横向溢出。

## 技术边界

- 原生 HTML、CSS、JavaScript；
- GitHub Pages 静态部署；
- 不需要账号、后端、数据库或构建框架；
- 工具输出只作辅助，使用学生材料前请先删除姓名、照片等个人信息。
