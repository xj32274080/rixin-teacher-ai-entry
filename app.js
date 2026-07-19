const TOOL_CATEGORIES = ["全部", "教学设计", "写作与阅读", "课堂观察与诊断", "成果呈现", "班级事务", "教研与资料"];
const PROMPT_CATEGORIES = ["全部", "备课设计", "文本解读", "作业设计", "课后反思", "听评课", "家校沟通", "班级管理", "AI检索", "评价反馈"];
const VIEW_NAMES = { home: "首页", tools: "全部工具", prompts: "AI 助手指令" };
const ALLOWED_ICONS = new Set(["home", "lesson-plan", "book-open", "evidence", "newspaper", "toolbox", "printer", "layout", "image", "spark", "timer", "map", "archive", "diagnosis", "thinking", "edit", "copy", "lock", "arrow", "info"]);

const COMMON_TOOL_IDS = [
  "curriculum-to-classroom-workbench",
  "student-thinking-tool",
  "four-color-evidence-observer",
  "rixin-teacher-tools"
];

const TASKS = [
  {
    id: "备课与作业",
    icon: "lesson-plan",
    title: "我要备课",
    summary: "从课标、教材和学情开始。",
    focusTitle: "你现在要备课",
    focusSummary: "先完成一份可以继续修改的教学设计，再按需要查看资料或使用 AI 指令。",
    primaryTool: "curriculum-to-classroom-workbench",
    primarySummary: "跟着步骤梳理课标、目标、评价和课堂活动，完成一份可以继续修改的教学设计。",
    primaryAction: "开始备课",
    supplements: [
      { type: "tool", id: "xiaoxue-yuwen-quanjingtu", label: "查看小学语文要素全景图" },
      { type: "prompt", id: "lesson-text-analysis", label: "复制文本解读助手" }
    ],
    workflowLabel: "查看完整备课步骤"
  },
  {
    id: "写作与阅读",
    icon: "book-open",
    title: "我要处理作文",
    summary: "帮助学生构思、讲评和修改。",
    focusTitle: "你现在要处理作文",
    focusSummary: "先让学生把自己的想法说清楚，再按需要整理、展示作品。",
    primaryTool: "student-thinking-tool",
    primarySummary: "通过简单追问和卡片，帮助学生把自己的想法慢慢说清楚。",
    primaryAction: "开始梳理想法",
    supplements: [
      { type: "tool", id: "class-magazine-generator", label: "把作文整理成班级刊物" },
      { type: "prompt", id: "lesson-text-analysis", label: "复制课文分析指令" }
    ],
    workflowLabel: "查看完整作文处理步骤"
  },
  {
    id: "课堂观察与诊断",
    icon: "evidence",
    title: "我要看看课堂问题",
    summary: "记录课堂表现，发现学习卡点。",
    focusTitle: "你现在要看看课堂问题",
    focusSummary: "先记录真实看到的课堂表现，再判断学生可能卡在哪里。",
    primaryTool: "four-color-evidence-observer",
    primarySummary: "用简单打点记录课堂中的参与和学习表现，课后再根据证据回看。",
    primaryAction: "开始记录课堂",
    supplements: [
      { type: "tool", id: "mistake-tracker", label: "记录错题和常见错因" },
      { type: "prompt", id: "lesson-observation-review", label: "复制听课整理指令" }
    ],
    workflowLabel: "查看完整课堂观察步骤"
  },
  {
    id: "成果整理与展示",
    icon: "newspaper",
    title: "我要整理学生成果",
    summary: "整理作文、作品和活动材料。",
    focusTitle: "你现在要整理学生成果",
    focusSummary: "先选择一种清楚的展示方式，再整理需要公开的学生材料。",
    primaryTool: "class-magazine-generator",
    primarySummary: "把学生作文整理成班级报纸、在线刊物或可以打印的版本。",
    primaryAction: "开始整理作品",
    supplements: [
      { type: "tool", id: "student-artwork-cleaner", label: "清理学生作品照片" },
      { type: "tool", id: "comment-card-printer", label: "制作可打印的成长卡片" }
    ],
    workflowLabel: "查看完整成果整理步骤"
  },
  {
    id: "班级事务与效率",
    icon: "toolbox",
    title: "我要处理班级事务",
    summary: "完成评语、计时和日常管理。",
    focusTitle: "你现在要处理班级事务",
    focusSummary: "先进入常用工具箱，再按手头的事情选择具体功能。",
    primaryTool: "rixin-teacher-tools",
    primarySummary: "进入错题记录、课堂组织和常用小工具，减少重复操作。",
    primaryAction: "打开教师工具箱",
    supplements: [
      { type: "tool", id: "comment-card-printer", label: "批量排版期末评语" },
      { type: "prompt", id: "family-communication-helper", label: "复制家校沟通指令" }
    ],
    workflowLabel: "查看完整班级事务步骤"
  }
];

const state = {
  tools: [],
  prompts: [],
  workflows: [],
  query: "",
  activeTask: "",
  activeToolCategory: "全部",
  activePromptCategory: "全部",
  onlineOnly: false,
  currentView: "home",
  homeSection: "home",
  loadErrors: { tools: false, prompts: false, workflows: false }
};

const dom = {
  sidebar: document.querySelector("#app-sidebar"),
  sidebarScrim: document.querySelector("#sidebar-scrim"),
  menuToggle: document.querySelector("#menu-toggle"),
  viewPanels: [...document.querySelectorAll("[data-view-panel]")],
  homeView: document.querySelector("#home-view"),
  taskStage: document.querySelector("#task-stage"),
  taskChoice: document.querySelector("#task-choice"),
  taskGrid: document.querySelector("#task-card-grid"),
  taskFocus: document.querySelector("#task-focus"),
  commonSection: document.querySelector(".common-section"),
  searchSection: document.querySelector(".search-section"),
  commonToolList: document.querySelector("#common-tool-list"),
  homeSearchForm: document.querySelector("#home-search-form"),
  searchInput: document.querySelector("#global-search"),
  searchClear: document.querySelector("#search-clear"),
  searchSuggestions: document.querySelector("#search-suggestions"),
  toolSearch: document.querySelector("#tool-search"),
  promptSearch: document.querySelector("#prompt-search"),
  toolFilters: document.querySelector("#tool-category-filters"),
  promptFilters: document.querySelector("#prompt-category-filters"),
  onlineOnly: document.querySelector("#online-only"),
  clearFilters: document.querySelector("#clear-filters"),
  clearPromptFilters: document.querySelector("#clear-prompt-filters"),
  toolGrid: document.querySelector("#tool-grid"),
  toolCount: document.querySelector("#tool-result-count"),
  toolsTitle: document.querySelector("#tools-title"),
  toolsDescription: document.querySelector("#tools-description"),
  showAllTools: document.querySelector("#show-all-tools"),
  internalList: document.querySelector("#internal-list"),
  internalCount: document.querySelector("#internal-count"),
  promptGrid: document.querySelector("#prompt-grid"),
  promptCount: document.querySelector("#prompt-result-count"),
  promptsTitle: document.querySelector("#prompts-title"),
  promptsDescription: document.querySelector("#prompts-description"),
  showAllPrompts: document.querySelector("#show-all-prompts"),
  dialog: document.querySelector("#detail-dialog"),
  dialogContent: document.querySelector("#dialog-content"),
  dialogClose: document.querySelector("#dialog-close"),
  toast: document.querySelector("#toast")
};

let toastTimer = null;
let lastDialogTrigger = null;

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function arrayValue(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
}

function safeExternalUrl(value) {
  if (!value || typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function safeLocalAsset(value) {
  if (!value || typeof value !== "string" || value.includes("..")) return "";
  return /^[a-zA-Z0-9_./-]+$/.test(value) ? value : "";
}

function iconMarkup(name, className = "") {
  const safeName = ALLOWED_ICONS.has(name) ? name : "toolbox";
  const safeClass = className ? ` class="${escapeHtml(className)}"` : "";
  return `<svg${safeClass} aria-hidden="true"><use href="#icon-${safeName}"></use></svg>`;
}

function inferPrimaryCategory(tool) {
  const source = [tool.category, tool.valueLevel, ...(tool.tags || []), ...(tool.scenarios || [])].join(" ");
  if (/作文|阅读|写作|语文学习|习作/.test(source)) return "写作与阅读";
  if (/观察|诊断|错题|证据/.test(source)) return "课堂观察与诊断";
  if (/成果|作品|长图|打印|展/.test(source)) return "成果呈现";
  if (/备课|教学设计|课标/.test(source)) return "教学设计";
  if (/知识库|资料|教研|全景图/.test(source)) return "教研与资料";
  return "班级事务";
}

function inferVisibility(tool) {
  if (tool.status === "internal") return tool.type === "skill" ? "maintainer" : "internal";
  if (["draft", "pending"].includes(tool.status)) return "internal";
  return "public";
}

function normalizeTool(tool) {
  const category = TOOL_CATEGORIES.includes(tool.primaryCategory) && tool.primaryCategory !== "全部" ? tool.primaryCategory : inferPrimaryCategory(tool);
  return {
    ...tool,
    id: String(tool.id || ""),
    name: String(tool.name || "未命名工具"),
    noviceTitle: String(tool.noviceTitle || tool.name || "未命名工具"),
    noviceSummary: String(tool.noviceSummary || tool.homepageSummary || tool.shortDescription || "查看工具介绍。"),
    primaryActionLabel: String(tool.primaryActionLabel || "打开工具"),
    primaryCategory: category,
    taskGroups: arrayValue(tool.taskGroups),
    visibility: ["public", "internal", "maintainer", "hidden"].includes(tool.visibility) ? tool.visibility : inferVisibility(tool),
    icon: ALLOWED_ICONS.has(tool.icon) ? tool.icon : "toolbox",
    searchKeywords: arrayValue(tool.searchKeywords),
    tags: arrayValue(tool.tags),
    scenarios: arrayValue(tool.scenarios),
    aliases: arrayValue(tool.aliases),
    recommendedPrompts: arrayValue(tool.recommendedPrompts)
  };
}

function normalizePrompt(prompt) {
  return {
    ...prompt,
    id: String(prompt.id || ""),
    title: String(prompt.title || "未命名指令"),
    noviceTitle: String(prompt.noviceTitle || prompt.title || "未命名指令"),
    noviceSummary: String(prompt.noviceSummary || prompt.homepageSummary || prompt.scenario || "查看这条指令能帮你做什么。"),
    primaryActionLabel: String(prompt.primaryActionLabel || "复制给 AI"),
    taskGroups: arrayValue(prompt.taskGroups),
    searchKeywords: arrayValue(prompt.searchKeywords),
    tags: arrayValue(prompt.tags),
    relatedTools: arrayValue(prompt.relatedTools)
  };
}

function isPublicTool(tool) {
  return tool.visibility === "public";
}

function isOpenable(tool) {
  return isPublicTool(tool) && tool.status === "online" && Boolean(safeExternalUrl(tool.url));
}

function statusLabel(tool) {
  if (tool.visibility === "maintainer" || tool.type === "skill") return "仅供维护使用";
  if (tool.visibility === "internal" || tool.status === "internal") return tool.statusText || "暂不公开";
  if (tool.status === "draft") return "仍在整理";
  if (tool.status === "pending" || !tool.url) return "入口待确认";
  return "可以打开";
}

function typeLabel(type) {
  return { webpage: "网页工具", miaoda: "妙搭应用", skill: "维护能力包", hub: "工具入口", pending: "待确认" }[type] || "网页工具";
}

function itemSearchText(item) {
  return [item.name, item.title, item.noviceTitle, item.noviceSummary, item.category, item.primaryCategory, item.platform, item.educationPosition, item.homepageSummary, item.shortDescription, item.scenario, item.description, item.usageBoundary, ...arrayValue(item.aliases), ...arrayValue(item.tags), ...arrayValue(item.scenarios), ...arrayValue(item.searchKeywords), ...arrayValue(item.taskGroups)].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN");
}

function matchesQuery(item) {
  return !state.query || itemSearchText(item).includes(state.query.toLocaleLowerCase("zh-CN"));
}

function getTool(id) {
  return state.tools.find((tool) => tool.id === id);
}

function getPrompt(id) {
  return state.prompts.find((prompt) => prompt.id === id);
}

function currentTaskConfig() {
  return TASKS.find((task) => task.id === state.activeTask) || null;
}

function currentWorkflow() {
  return state.workflows.find((workflow) => workflow.title === state.activeTask) || null;
}

function visiblePublicTools() {
  return state.tools.filter((tool) => isPublicTool(tool)
    && (state.activeToolCategory === "全部" || tool.primaryCategory === state.activeToolCategory)
    && (!state.activeTask || tool.taskGroups.includes(state.activeTask))
    && (!state.onlineOnly || isOpenable(tool))
    && matchesQuery(tool));
}

function matchingPrompts() {
  return state.prompts.filter((prompt) => (state.activePromptCategory === "全部" || prompt.category === state.activePromptCategory)
    && (!state.activeTask || prompt.taskGroups.includes(state.activeTask))
    && matchesQuery(prompt));
}

function globalSearchMatches() {
  return {
    tools: state.tools.filter((tool) => isPublicTool(tool) && matchesQuery(tool)),
    prompts: state.prompts.filter(matchesQuery)
  };
}

function toolOpenLink(tool, label = "打开工具", className = "button primary-button") {
  if (!isOpenable(tool)) return "";
  return `<a class="${escapeHtml(className)}" href="${escapeHtml(safeExternalUrl(tool.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}${iconMarkup("arrow", "button-arrow")}</a>`;
}

function renderTaskChoice() {
  dom.taskGrid.innerHTML = TASKS.map((task) => `
    <button class="task-card" type="button" data-select-task="${escapeHtml(task.id)}">
      <span class="task-icon">${iconMarkup(task.icon)}</span>
      <span><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.summary)}</small></span>
      ${iconMarkup("arrow", "task-arrow")}
    </button>`).join("");
}

function supplementMarkup(item) {
  if (item.type === "prompt") {
    const prompt = getPrompt(item.id);
    if (!prompt) return "";
    return `<button class="supplement-button" type="button" data-copy-prompt="${escapeHtml(prompt.id)}">${iconMarkup("copy")}<span>${escapeHtml(item.label)}</span></button>`;
  }
  const tool = getTool(item.id);
  if (!tool || !isPublicTool(tool)) return "";
  if (isOpenable(tool)) return `<a class="supplement-button" href="${escapeHtml(safeExternalUrl(tool.url))}" target="_blank" rel="noopener noreferrer">${iconMarkup(tool.icon)}<span>${escapeHtml(item.label)}</span>${iconMarkup("arrow", "small-arrow")}</a>`;
  return `<button class="supplement-button" type="button" data-tool-detail="${escapeHtml(tool.id)}">${iconMarkup(tool.icon)}<span>${escapeHtml(item.label)}</span></button>`;
}

function workflowMarkup(task) {
  const workflow = currentWorkflow();
  if (!workflow || state.loadErrors.workflows) return "";
  const steps = Array.isArray(workflow.steps) ? workflow.steps.filter((step) => step.type === "prompt" ? Boolean(getPrompt(step.id)) : Boolean(getTool(step.id) && isPublicTool(getTool(step.id)))) : [];
  if (!steps.length) return "";
  return `<details class="workflow-disclosure"><summary>${escapeHtml(task.workflowLabel)}${iconMarkup("chevron")}</summary><ol>${steps.map((step, index) => `<li><span>${index + 1}</span><strong>${escapeHtml(step.shortLabel || step.label)}</strong></li>`).join("")}</ol><button class="text-button" type="button" data-workflow-detail="${escapeHtml(workflow.id)}">查看步骤说明</button></details>`;
}

function renderTaskFocus() {
  const task = currentTaskConfig();
  dom.taskChoice.hidden = Boolean(task);
  dom.taskFocus.hidden = !task;
  dom.commonSection.hidden = Boolean(task);
  dom.searchSection.hidden = Boolean(task);
  dom.homeView.setAttribute("aria-labelledby", task ? "task-focus-title" : "home-title");
  if (!task) {
    dom.taskFocus.innerHTML = "";
    return;
  }
  const tool = getTool(task.primaryTool);
  if (!tool) {
    dom.taskFocus.innerHTML = '<div class="error-state">推荐工具暂时无法加载。请返回后查看全部工具。</div>';
    return;
  }
  dom.taskFocus.innerHTML = `
    <button class="back-button" type="button" data-back-to-tasks>${iconMarkup("arrow")}返回选择其他任务</button>
    <header class="focus-heading"><p class="eyebrow">先从一个工具开始</p><h1 id="task-focus-title" tabindex="-1">${escapeHtml(task.focusTitle)}</h1><p>${escapeHtml(task.focusSummary)}</p></header>
    <article class="recommended-tool">
      <span class="recommended-icon">${iconMarkup(tool.icon)}</span>
      <div class="recommended-copy"><p>为你推荐</p><h2>${escapeHtml(tool.noviceTitle)}</h2><p>${escapeHtml(task.primarySummary)}</p></div>
      <div class="recommended-actions">${toolOpenLink(tool, task.primaryAction)}<button class="secondary-button" type="button" data-tool-detail="${escapeHtml(tool.id)}">查看介绍</button></div>
    </article>
    <section class="supplement-section" aria-labelledby="supplement-title"><h2 id="supplement-title">还可以这样做</h2><div class="supplement-list">${task.supplements.slice(0, 2).map(supplementMarkup).join("")}</div></section>
    ${workflowMarkup(task)}
    <button class="more-task-tools" type="button" data-more-tools-for-task="${escapeHtml(task.id)}">查看与这项任务有关的更多工具</button>`;
}

function renderCommonTools() {
  if (state.loadErrors.tools) {
    dom.commonToolList.innerHTML = '<div class="error-state">常用工具暂时无法加载。</div>';
    return;
  }
  dom.commonToolList.innerHTML = COMMON_TOOL_IDS.map(getTool).filter(Boolean).map((tool) => `
    <article class="common-tool-card">
      <span class="common-tool-icon">${iconMarkup(tool.icon)}</span>
      <div><h3>${escapeHtml(tool.noviceTitle)}</h3><p>${escapeHtml(tool.noviceSummary)}</p></div>
      ${toolOpenLink(tool, tool.primaryActionLabel)}
    </article>`).join("");
}

function renderFilters() {
  dom.toolFilters.innerHTML = TOOL_CATEGORIES.map((category) => `<button class="filter-button ${category === state.activeToolCategory ? "is-active" : ""}" type="button" data-tool-category="${escapeHtml(category)}" aria-pressed="${category === state.activeToolCategory}">${escapeHtml(category)}</button>`).join("");
  dom.promptFilters.innerHTML = PROMPT_CATEGORIES.map((category) => `<button class="filter-button ${category === state.activePromptCategory ? "is-active" : ""}" type="button" data-prompt-category="${escapeHtml(category)}" aria-pressed="${category === state.activePromptCategory}">${escapeHtml(category)}</button>`).join("");
}

function updateToolHeading() {
  if (state.query) {
    dom.toolsTitle.textContent = `“${state.query}”的搜索结果`;
    dom.toolsDescription.textContent = "下面只显示与搜索内容有关的工具。";
  } else if (state.activeTask) {
    dom.toolsTitle.textContent = `${state.activeTask}相关工具`;
    dom.toolsDescription.textContent = "这些工具与刚才选择的教学任务有关。";
  } else {
    dom.toolsTitle.textContent = "全部工具";
    dom.toolsDescription.textContent = "点击“打开工具”即可使用。需要时再按用途筛选。";
  }
  dom.showAllTools.hidden = !state.query && !state.activeTask && state.activeToolCategory === "全部" && !state.onlineOnly;
}

function renderTools() {
  updateToolHeading();
  if (state.loadErrors.tools) {
    dom.toolCount.textContent = "工具数据加载失败";
    dom.toolGrid.innerHTML = '<div class="error-state">工具暂时无法加载，请稍后刷新。</div>';
    return;
  }
  const visible = visiblePublicTools();
  dom.toolCount.textContent = `${visible.length} 个工具`;
  dom.toolGrid.classList.remove("loading-grid");
  if (!visible.length) {
    dom.toolGrid.innerHTML = '<div class="empty-state">没有找到合适的工具。可以换一个说法，或查看全部工具。</div>';
    return;
  }
  dom.toolGrid.innerHTML = visible.map((tool) => `
    <article class="compact-tool-card">
      <span class="compact-tool-icon">${iconMarkup(tool.icon)}</span>
      <div class="compact-tool-main"><h2>${escapeHtml(tool.noviceTitle)}</h2><p>${escapeHtml(tool.noviceSummary)}</p></div>
      <div class="compact-tool-actions">${toolOpenLink(tool, tool.primaryActionLabel)}<button class="secondary-button" type="button" data-tool-detail="${escapeHtml(tool.id)}">查看介绍</button></div>
    </article>`).join("");
}

function renderInternalTools() {
  if (state.loadErrors.tools) {
    dom.internalCount.textContent = "数据暂不可用";
    dom.internalList.innerHTML = '<div class="error-state">更多项目暂时无法加载。</div>';
    return;
  }
  const internal = state.tools.filter((tool) => ["internal", "maintainer"].includes(tool.visibility));
  dom.internalCount.textContent = `${internal.length} 项 · 校内使用或仍在整理`;
  dom.internalList.innerHTML = internal.map((tool) => `
    <article class="internal-item"><span class="internal-icon">${iconMarkup(tool.icon)}</span><div><h3>${escapeHtml(tool.noviceTitle)}</h3><p>${escapeHtml(tool.noviceSummary)}</p><small>${escapeHtml(statusLabel(tool))}</small></div><button class="secondary-button" type="button" data-tool-detail="${escapeHtml(tool.id)}">查看说明</button></article>`).join("") || '<div class="empty-state">目前没有更多项目。</div>';
}

function updatePromptHeading() {
  if (state.query) {
    dom.promptsTitle.textContent = `“${state.query}”的 AI 指令`;
    dom.promptsDescription.textContent = "复制合适的内容，再粘贴到你常用的 AI 工具中。";
  } else if (state.activeTask) {
    dom.promptsTitle.textContent = `${state.activeTask}常用的 AI 指令`;
    dom.promptsDescription.textContent = "复制下面的内容，粘贴到 ChatGPT、DeepSeek、Kimi 等 AI 工具中使用。";
  } else {
    dom.promptsTitle.textContent = "AI 助手指令";
    dom.promptsDescription.textContent = "复制下面的内容，粘贴到 ChatGPT、DeepSeek、Kimi 等 AI 工具中使用。";
  }
  dom.showAllPrompts.hidden = !state.query && !state.activeTask && state.activePromptCategory === "全部";
}

function renderPrompts() {
  updatePromptHeading();
  if (state.loadErrors.prompts) {
    dom.promptCount.textContent = "指令数据加载失败";
    dom.promptGrid.innerHTML = '<div class="error-state">AI 助手指令暂时无法加载。</div>';
    return;
  }
  const visible = matchingPrompts();
  dom.promptCount.textContent = `${visible.length} 条指令`;
  dom.promptGrid.classList.remove("loading-grid");
  if (!visible.length) {
    dom.promptGrid.innerHTML = '<div class="empty-state">没有找到合适的指令。可以换一个说法，或查看全部指令。</div>';
    return;
  }
  dom.promptGrid.innerHTML = visible.map((prompt) => `
    <article class="prompt-card">
      <div class="prompt-content">
        <span class="prompt-icon">${iconMarkup("copy")}</span>
        <div><h2>${escapeHtml(prompt.noviceTitle)}</h2>${prompt.noviceTitle !== prompt.title ? `<p class="formal-title">原指令：${escapeHtml(prompt.title)}</p>` : ""}<p>${escapeHtml(prompt.noviceSummary)}</p><dl class="prompt-prepare"><dt>使用前准备</dt><dd>${escapeHtml(prompt.inputNeeded || "准备与任务有关的材料，并删除个人信息。")}</dd></dl></div>
      </div>
      <div class="prompt-actions"><button class="button primary-button copy-action" type="button" data-copy-prompt="${escapeHtml(prompt.id)}">${iconMarkup("copy")}${escapeHtml(prompt.primaryActionLabel)}</button><button class="secondary-button" type="button" data-prompt-detail="${escapeHtml(prompt.id)}">查看使用说明</button></div>
    </article>`).join("");
}

function renderSuggestions() {
  if (state.currentView !== "home" || state.query.length < 2 || state.loadErrors.tools || state.loadErrors.prompts) {
    closeSuggestions();
    return;
  }
  const matches = globalSearchMatches();
  const tools = matches.tools.slice(0, 3);
  const prompts = matches.prompts.slice(0, 3);
  if (!tools.length && !prompts.length) {
    dom.searchSuggestions.innerHTML = '<p class="suggestion-empty">没有找到匹配内容，请换一个说法。</p>';
  } else {
    dom.searchSuggestions.innerHTML = `${tools.length ? `<div class="suggestion-group"><p>工具</p>${tools.map((tool) => `<button type="button" role="option" data-suggestion-tool="${escapeHtml(tool.id)}">${iconMarkup(tool.icon)}<span><strong>${escapeHtml(tool.noviceTitle)}</strong><small>${escapeHtml(tool.noviceSummary)}</small></span></button>`).join("")}</div>` : ""}${prompts.length ? `<div class="suggestion-group"><p>AI 指令</p>${prompts.map((prompt) => `<button type="button" role="option" data-suggestion-prompt="${escapeHtml(prompt.id)}">${iconMarkup("copy")}<span><strong>${escapeHtml(prompt.noviceTitle)}</strong><small>${escapeHtml(prompt.noviceSummary)}</small></span></button>`).join("")}</div>` : ""}`;
  }
  dom.searchSuggestions.hidden = false;
  dom.searchInput.setAttribute("aria-expanded", "true");
}

function closeSuggestions() {
  dom.searchSuggestions.hidden = true;
  dom.searchInput.setAttribute("aria-expanded", "false");
}

function syncSearchInputs() {
  [dom.searchInput, dom.toolSearch, dom.promptSearch].forEach((input) => {
    if (input.value !== state.query) input.value = state.query;
  });
  dom.searchClear.hidden = !state.query;
}

function setQuery(value) {
  state.query = value.trim();
  syncSearchInputs();
  renderTools();
  renderPrompts();
  renderSuggestions();
}

function currentViewFromHash() {
  const candidate = window.location.hash.replace("#", "");
  return Object.hasOwn(VIEW_NAMES, candidate) ? candidate : "home";
}

function setView(view, { updateHash = true, focus = false } = {}) {
  const nextView = Object.hasOwn(VIEW_NAMES, view) ? view : "home";
  state.currentView = nextView;
  dom.viewPanels.forEach((panel) => {
    const active = panel.dataset.viewPanel === nextView;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  document.querySelectorAll("[data-nav-view]").forEach((button) => {
    const navView = button.dataset.navView;
    const active = nextView === "home" ? navView === state.homeSection : navView === nextView;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  document.title = nextView === "home" ? "日新教师 AI 工作台" : `${VIEW_NAMES[nextView]}｜日新教师 AI 工作台`;
  if (updateHash && window.location.hash !== `#${nextView}`) history.pushState(null, "", `#${nextView}`);
  closeSuggestions();
  closeSidebar();
  window.scrollTo({ top: 0, behavior: "auto" });
  if (focus) document.querySelector(`[data-view-panel="${nextView}"] h1`)?.focus({ preventScroll: true });
}

function resetToolFilters() {
  state.activeToolCategory = "全部";
  state.onlineOnly = false;
  dom.onlineOnly.checked = false;
}

function resetPromptFilters() {
  state.activePromptCategory = "全部";
}

function openHome() {
  state.query = "";
  state.activeTask = "";
  state.homeSection = "home";
  resetToolFilters();
  resetPromptFilters();
  renderAll();
  setView("home");
}

function openTaskChooser() {
  state.query = "";
  state.activeTask = "";
  state.homeSection = "tasks";
  resetToolFilters();
  resetPromptFilters();
  renderAll();
  setView("home");
  requestAnimationFrame(() => dom.taskStage.scrollIntoView({ block: "start" }));
}

function selectTask(taskId) {
  if (!TASKS.some((task) => task.id === taskId)) return;
  state.query = "";
  state.activeTask = taskId;
  state.homeSection = "tasks";
  resetToolFilters();
  resetPromptFilters();
  renderAll();
  setView("home");
  requestAnimationFrame(() => dom.taskFocus.querySelector("h1")?.focus({ preventScroll: true }));
}

function openAllTools() {
  state.query = "";
  state.activeTask = "";
  resetToolFilters();
  resetPromptFilters();
  renderAll();
  setView("tools", { focus: true });
}

function openToolSearchResults(query) {
  state.query = String(query || "").trim();
  state.activeTask = "";
  resetToolFilters();
  resetPromptFilters();
  renderAll();
  setView("tools", { focus: true });
}

function openToolsForTask(task) {
  state.query = "";
  state.activeTask = task;
  resetToolFilters();
  resetPromptFilters();
  renderAll();
  setView("tools", { focus: true });
}

function openAllPrompts() {
  state.query = "";
  state.activeTask = "";
  resetToolFilters();
  resetPromptFilters();
  renderAll();
  setView("prompts", { focus: true });
}

function openPromptSearchResults(query) {
  state.query = String(query || "").trim();
  state.activeTask = "";
  resetToolFilters();
  resetPromptFilters();
  renderAll();
  setView("prompts", { focus: true });
}

function handleGlobalSearch() {
  if (!state.query) {
    showToast("请先输入正在做的事情。", "notice");
    dom.searchInput.focus();
    return;
  }
  const matches = globalSearchMatches();
  if (!matches.tools.length && !matches.prompts.length) {
    renderSuggestions();
    showToast("没有找到匹配内容，请换一个说法。", "notice");
    return;
  }
  if (matches.prompts.length > matches.tools.length) openPromptSearchResults(state.query);
  else openToolSearchResults(state.query);
}

function openSidebar(force) {
  const isOpen = typeof force === "boolean" ? force : !dom.sidebar.classList.contains("is-open");
  dom.sidebar.classList.toggle("is-open", isOpen);
  dom.sidebarScrim.hidden = !isOpen;
  dom.menuToggle.setAttribute("aria-expanded", String(isOpen));
  dom.menuToggle.setAttribute("aria-label", isOpen ? "关闭更多选项" : "打开更多选项");
  document.body.classList.toggle("nav-open", isOpen);
}

function closeSidebar() {
  openSidebar(false);
}

function detailBlock(title, content, className = "") {
  if (!content) return "";
  return `<section class="detail-block ${escapeHtml(className)}"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(content)}</p></section>`;
}

function detailList(title, values) {
  const items = arrayValue(values);
  if (!items.length) return "";
  return `<section class="detail-block"><h3>${escapeHtml(title)}</h3><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
}

function renderToolDialog(tool, trigger) {
  const preview = safeLocalAsset(tool.screenshotUrl);
  const relatedPrompts = tool.recommendedPrompts.map(getPrompt).filter(Boolean);
  dom.dialogContent.innerHTML = `
    <div class="dialog-heading"><p class="eyebrow">${escapeHtml(typeLabel(tool.type))}</p><h2 id="dialog-title">${escapeHtml(tool.name)}</h2><p>${escapeHtml(tool.educationPosition || tool.noviceSummary)}</p></div>
    ${preview ? `<figure class="tool-preview"><img src="${escapeHtml(preview)}" alt="${escapeHtml(tool.name)}网页截图" width="960" height="540" loading="lazy" data-preview-image/><figcaption>工具页面预览</figcaption><span class="image-fallback" hidden>${iconMarkup(tool.icon)}预览图加载失败</span></figure>` : ""}
    <div class="detail-flow">${detailBlock("能帮你做什么", tool.painPoint || tool.shortDescription)}${detailBlock("怎么使用", tool.howToUse)}${detailList("适合这些情况", tool.scenarios)}${detailBlock("教师可能获得什么", tool.teacherBenefit)}${detailBlock("学生可能获得什么", tool.studentBenefit)}${detailBlock("使用边界", tool.usageBoundary || tool.displayNote || "请结合真实教学目标和学生情况判断生成内容是否合适。", "boundary-block")}${detailBlock("隐私提醒", tool.privacyNote || "涉及学生信息时，请先删除姓名、照片等个人信息。", "privacy-block")}${relatedPrompts.length ? `<section class="detail-block"><h3>相关 AI 指令</h3><div class="related-actions">${relatedPrompts.map((prompt) => `<button type="button" data-prompt-detail="${escapeHtml(prompt.id)}">${escapeHtml(prompt.noviceTitle)}</button>`).join("")}</div></section>` : ""}</div>
    <div class="dialog-footer">${isOpenable(tool) ? toolOpenLink(tool, tool.primaryActionLabel) : `<div class="availability-note">${iconMarkup("lock")}<span><strong>${escapeHtml(statusLabel(tool))}</strong><small>当前没有公开跳转入口。</small></span></div>`}</div>`;
  openDialog(trigger);
}

function renderPromptDialog(prompt, trigger) {
  const relatedTools = prompt.relatedTools.map(getTool).filter((tool) => tool && isPublicTool(tool));
  dom.dialogContent.innerHTML = `
    <div class="dialog-heading"><p class="eyebrow">AI 助手指令</p><h2 id="dialog-title">${escapeHtml(prompt.noviceTitle)}</h2>${prompt.noviceTitle !== prompt.title ? `<p class="formal-title">原指令：${escapeHtml(prompt.title)}</p>` : ""}<p>${escapeHtml(prompt.scenario)}</p></div>
    <div class="detail-flow">${detailBlock("使用前准备", prompt.inputNeeded)}${detailBlock("你会得到什么", prompt.outputFormat)}${detailBlock("使用提醒", prompt.caution, "privacy-block")}<section class="detail-block prompt-full"><div class="prompt-full-head"><h3>复制给 AI 的完整内容</h3><button class="button primary-button copy-action" type="button" data-copy-prompt="${escapeHtml(prompt.id)}">${iconMarkup("copy")}复制给 AI</button></div><pre>${escapeHtml(prompt.prompt)}</pre></section>${relatedTools.length ? `<section class="detail-block"><h3>相关工具</h3><div class="related-actions">${relatedTools.map((tool) => `<button type="button" data-tool-detail="${escapeHtml(tool.id)}">${escapeHtml(tool.noviceTitle)}</button>`).join("")}</div></section>` : ""}</div>`;
  openDialog(trigger);
}

function workflowStepMarkup(step, index) {
  const item = step.type === "tool" ? getTool(step.id) : getPrompt(step.id);
  if (!item || (step.type === "tool" && !isPublicTool(item))) return "";
  const name = step.type === "tool" ? item.noviceTitle : item.noviceTitle;
  const detailAttr = step.type === "tool" ? "data-tool-detail" : "data-prompt-detail";
  return `<li><span class="step-number">${index + 1}</span><div><small>${step.type === "tool" ? "工具" : "AI 指令"}</small><strong>${escapeHtml(step.label)}</strong></div><button class="step-link" type="button" ${detailAttr}="${escapeHtml(item.id)}">${escapeHtml(name)}</button></li>`;
}

function renderWorkflowDialog(workflow, trigger) {
  const steps = Array.isArray(workflow.steps) ? workflow.steps.filter((step) => step.type === "prompt" ? Boolean(getPrompt(step.id)) : Boolean(getTool(step.id) && isPublicTool(getTool(step.id)))) : [];
  dom.dialogContent.innerHTML = `<div class="dialog-heading"><p class="eyebrow">完整步骤</p><h2 id="dialog-title">${escapeHtml(workflow.title)}</h2><p>${escapeHtml(workflow.description)}</p></div><div class="detail-flow"><section class="detail-block"><h3>建议顺序</h3><ol class="workflow-steps">${steps.map(workflowStepMarkup).join("")}</ol></section></div>`;
  openDialog(trigger);
}

function renderInfoDialog(type, trigger) {
  if (type === "privacy") {
    dom.dialogContent.innerHTML = `<div class="dialog-heading"><p class="eyebrow">使用前请留意</p><h2 id="dialog-title">隐私提醒</h2><p>AI 工具可以帮助整理材料，但不能替代教师的判断。</p></div><div class="detail-flow">${detailBlock("学生材料", "上传姓名、照片、作文、评语或家庭信息前，请先删除能识别个人身份的内容。", "privacy-block")}${detailBlock("使用结果", "生成结果需要结合真实学生情况、教学目标和学校要求重新检查。")}${detailBlock("公开入口", "校内项目和维护用项目没有公开链接；入口不明确的项目不会提供跳转。")}</div>`;
  } else {
    dom.dialogContent.innerHTML = `<div class="dialog-heading"><p class="eyebrow">关于工作台</p><h2 id="dialog-title">从今天要做的事开始</h2><p>日新教师 AI 工作台帮助普通教师先找到一个能用的工具，再按需要查看更多选择和完整说明。</p></div><div class="detail-flow">${detailBlock("适合谁", "面向小学教师、一线教师培训和校本教研，尤其照顾第一次接触这些工具的老师。")}${detailBlock("如何使用", "先选择一项教学任务；如果已经知道要找什么，也可以使用搜索或进入全部工具。")}${detailBlock("责任边界", "工具输出只作辅助，正式教学决策和学生材料使用必须由教师检查。", "boundary-block")}</div>`;
  }
  openDialog(trigger);
}

function openDialog(trigger) {
  if (!dom.dialog.open) {
    lastDialogTrigger = trigger || document.activeElement;
    dom.dialog.showModal();
    document.body.classList.add("modal-open");
  }
  dom.dialog.querySelector(".dialog-shell")?.scrollTo({ top: 0 });
  requestAnimationFrame(() => dom.dialogClose.focus());
}

function closeDialog() {
  if (dom.dialog.open) dom.dialog.close();
}

function showToast(message, kind = "success") {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.dataset.kind = kind;
  dom.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => dom.toast.classList.remove("is-visible"), 1800);
}

async function copyPrompt(promptId, trigger) {
  const prompt = getPrompt(promptId);
  if (!prompt) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
    await navigator.clipboard.writeText(prompt.prompt);
    showToast("已复制，可以粘贴给 AI 使用");
  } catch {
    showManualCopy(prompt, trigger);
  }
}

function showManualCopy(prompt, trigger) {
  if (!dom.dialog.open) renderPromptDialog(prompt, trigger);
  let wrapper = dom.dialogContent.querySelector(".manual-copy");
  if (!wrapper) {
    wrapper = document.createElement("section");
    wrapper.className = "detail-block manual-copy";
    const title = document.createElement("h3");
    title.textContent = "请手动复制";
    const note = document.createElement("p");
    note.textContent = "当前浏览器未允许一键复制，请选中下方完整内容后复制。";
    const area = document.createElement("textarea");
    area.id = "manual-copy-area";
    area.readOnly = true;
    wrapper.append(title, note, area);
    dom.dialogContent.appendChild(wrapper);
  }
  const area = wrapper.querySelector("textarea");
  area.value = prompt.prompt;
  area.focus();
  area.select();
  showToast("请手动复制下方内容", "notice");
}

function renderAll() {
  renderTaskChoice();
  renderTaskFocus();
  renderCommonTools();
  renderFilters();
  renderTools();
  renderInternalTools();
  renderPrompts();
  renderSuggestions();
  syncSearchInputs();
  dom.onlineOnly.checked = state.onlineOnly;
}

function handleDelegatedClick(event) {
  const target = event.target;
  if (target.closest("[data-open-home]")) return openHome();
  if (target.closest("[data-open-tasks]")) return openTaskChooser();
  if (target.closest("[data-open-all-tools]")) return openAllTools();
  if (target.closest("[data-open-all-prompts]")) return openAllPrompts();
  const taskButton = target.closest("[data-select-task]");
  if (taskButton) return selectTask(taskButton.dataset.selectTask);
  if (target.closest("[data-back-to-tasks]")) return openTaskChooser();
  const moreTools = target.closest("[data-more-tools-for-task]");
  if (moreTools) return openToolsForTask(moreTools.dataset.moreToolsForTask);
  const infoButton = target.closest("[data-info-dialog]");
  if (infoButton) return renderInfoDialog(infoButton.dataset.infoDialog, infoButton);
  const workflowButton = target.closest("[data-workflow-detail]");
  if (workflowButton) {
    const workflow = state.workflows.find((item) => item.id === workflowButton.dataset.workflowDetail);
    if (workflow) renderWorkflowDialog(workflow, workflowButton);
    return;
  }
  const toolDetail = target.closest("[data-tool-detail]");
  if (toolDetail) {
    const tool = getTool(toolDetail.dataset.toolDetail);
    if (tool) renderToolDialog(tool, toolDetail);
    return;
  }
  const promptDetail = target.closest("[data-prompt-detail]");
  if (promptDetail) {
    const prompt = getPrompt(promptDetail.dataset.promptDetail);
    if (prompt) renderPromptDialog(prompt, promptDetail);
    return;
  }
  const copyButton = target.closest("[data-copy-prompt]");
  if (copyButton) return copyPrompt(copyButton.dataset.copyPrompt, copyButton);
  const suggestionTool = target.closest("[data-suggestion-tool]");
  if (suggestionTool) {
    closeSuggestions();
    const tool = getTool(suggestionTool.dataset.suggestionTool);
    if (tool) renderToolDialog(tool, suggestionTool);
    return;
  }
  const suggestionPrompt = target.closest("[data-suggestion-prompt]");
  if (suggestionPrompt) {
    closeSuggestions();
    const prompt = getPrompt(suggestionPrompt.dataset.suggestionPrompt);
    if (prompt) renderPromptDialog(prompt, suggestionPrompt);
  }
}

function wireSearch(input, view) {
  input.addEventListener("input", () => {
    state.query = input.value.trim();
    syncSearchInputs();
    if (view === "tools") renderTools();
    else if (view === "prompts") renderPrompts();
    else renderSuggestions();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && view === "home") {
      event.preventDefault();
      handleGlobalSearch();
    }
    if (event.key === "ArrowDown" && view === "home" && !dom.searchSuggestions.hidden) {
      event.preventDefault();
      dom.searchSuggestions.querySelector("button")?.focus();
    }
    if (event.key === "Escape") closeSuggestions();
  });
}

function wireEvents() {
  dom.menuToggle.addEventListener("click", () => openSidebar());
  dom.sidebarScrim.addEventListener("click", closeSidebar);
  dom.homeSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleGlobalSearch();
  });
  wireSearch(dom.searchInput, "home");
  wireSearch(dom.toolSearch, "tools");
  wireSearch(dom.promptSearch, "prompts");
  dom.searchClear.addEventListener("click", () => {
    setQuery("");
    dom.searchInput.focus();
  });
  dom.toolFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tool-category]");
    if (!button) return;
    state.activeToolCategory = button.dataset.toolCategory;
    renderFilters();
    renderTools();
  });
  dom.promptFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-prompt-category]");
    if (!button) return;
    state.activePromptCategory = button.dataset.promptCategory;
    renderFilters();
    renderPrompts();
  });
  dom.onlineOnly.addEventListener("change", () => {
    state.onlineOnly = dom.onlineOnly.checked;
    renderTools();
  });
  dom.clearFilters.addEventListener("click", () => {
    state.query = "";
    state.activeTask = "";
    resetToolFilters();
    syncSearchInputs();
    renderFilters();
    renderTools();
  });
  dom.clearPromptFilters.addEventListener("click", () => {
    state.query = "";
    state.activeTask = "";
    resetPromptFilters();
    syncSearchInputs();
    renderFilters();
    renderPrompts();
  });
  document.addEventListener("click", (event) => {
    handleDelegatedClick(event);
    if (!event.target.closest(".home-search-area")) closeSuggestions();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
      closeSuggestions();
    }
  });
  document.addEventListener("error", (event) => {
    const image = event.target.closest?.("[data-preview-image]");
    if (!image) return;
    image.hidden = true;
    image.parentElement?.querySelector(".image-fallback")?.removeAttribute("hidden");
  }, true);
  dom.dialogClose.addEventListener("click", closeDialog);
  dom.dialog.addEventListener("click", (event) => {
    if (event.target === dom.dialog) closeDialog();
  });
  dom.dialog.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
    if (lastDialogTrigger?.isConnected) lastDialogTrigger.focus();
    lastDialogTrigger = null;
  });
  window.addEventListener("hashchange", () => {
    state.currentView = currentViewFromHash();
    if (state.currentView === "home" && !state.activeTask) state.homeSection = "home";
    setView(state.currentView, { updateHash: false });
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("数据请求失败");
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await wait(350 * attempt);
    }
  }
  throw lastError;
}

async function init() {
  wireEvents();
  state.currentView = currentViewFromHash();
  const results = await Promise.allSettled([fetchJsonWithRetry("tools.json"), fetchJsonWithRetry("prompts.json"), fetchJsonWithRetry("workflows.json")]);
  if (results[0].status === "fulfilled" && Array.isArray(results[0].value)) state.tools = results[0].value.map(normalizeTool).filter((tool) => tool.id); else state.loadErrors.tools = true;
  if (results[1].status === "fulfilled" && Array.isArray(results[1].value)) state.prompts = results[1].value.map(normalizePrompt).filter((prompt) => prompt.id); else state.loadErrors.prompts = true;
  if (results[2].status === "fulfilled" && Array.isArray(results[2].value)) state.workflows = results[2].value; else state.loadErrors.workflows = true;
  renderAll();
  setView(state.currentView, { updateHash: !window.location.hash });
}

init();
