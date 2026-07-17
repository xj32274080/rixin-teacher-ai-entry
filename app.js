const TOOL_CATEGORIES = [
  "全部",
  "教学设计",
  "写作与阅读",
  "课堂观察与诊断",
  "成果呈现",
  "班级事务",
  "教研与资料"
];

const PROMPT_CATEGORIES = [
  "全部",
  "备课设计",
  "文本解读",
  "作业设计",
  "课后反思",
  "听评课",
  "家校沟通",
  "班级管理",
  "AI检索",
  "评价反馈"
];

const ALLOWED_ICONS = new Set([
  "home",
  "lesson-plan",
  "book-open",
  "evidence",
  "newspaper",
  "toolbox",
  "printer",
  "layout",
  "image",
  "spark",
  "timer",
  "map",
  "archive",
  "diagnosis",
  "thinking",
  "edit",
  "copy",
  "lock",
  "arrow",
  "info"
]);

const HOME_TOOL_IDS = {
  quick: [
    "curriculum-to-classroom-workbench",
    "student-thinking-tool",
    "four-color-evidence-observer",
    "mistake-tracker"
  ],
  writing: ["student-thinking-tool", "three-color-writing-review", "class-magazine-generator"],
  observation: ["four-color-evidence-observer", "mistake-tracker"]
};

const HOME_PROMPT_IDS = ["lesson-text-analysis", "homework-design-helper", "lesson-observation-review"];
const VIEW_NAMES = { home: "首页", tools: "全部工具", prompts: "提示词库" };

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
  loadErrors: { tools: false, prompts: false, workflows: false }
};

const dom = {
  header: document.querySelector("#site-header"),
  sidebar: document.querySelector("#app-sidebar"),
  sidebarScrim: document.querySelector("#sidebar-scrim"),
  menuToggle: document.querySelector("#menu-toggle"),
  topNav: document.querySelector("#top-nav"),
  viewPanels: [...document.querySelectorAll("[data-view-panel]")],
  searchInput: document.querySelector("#global-search"),
  toolSearch: document.querySelector("#tool-search"),
  promptSearch: document.querySelector("#prompt-search"),
  searchClear: document.querySelector("#search-clear"),
  searchSuggestions: document.querySelector("#search-suggestions"),
  taskGrid: document.querySelector("#task-grid"),
  quickToolList: document.querySelector("#quick-tool-list"),
  workflowSummary: document.querySelector("#workflow-summary"),
  coreToolFeature: document.querySelector("#core-tool-feature"),
  writingTools: document.querySelector("#writing-tools"),
  observationTools: document.querySelector("#observation-tools"),
  homePromptList: document.querySelector("#home-prompt-list"),
  updateList: document.querySelector("#update-list"),
  writingZone: document.querySelector("#writing-zone"),
  observationZone: document.querySelector("#observation-zone"),
  toolFilters: document.querySelector("#tool-category-filters"),
  onlineOnly: document.querySelector("#online-only"),
  clearFilters: document.querySelector("#clear-filters"),
  toolGrid: document.querySelector("#tool-grid"),
  toolCount: document.querySelector("#tool-result-count"),
  internalToggle: document.querySelector("#internal-toggle"),
  internalPanel: document.querySelector("#internal-panel"),
  internalList: document.querySelector("#internal-list"),
  internalCount: document.querySelector("#internal-count"),
  promptFilters: document.querySelector("#prompt-category-filters"),
  promptGrid: document.querySelector("#prompt-grid"),
  promptCount: document.querySelector("#prompt-result-count"),
  dialog: document.querySelector("#detail-dialog"),
  dialogContent: document.querySelector("#dialog-content"),
  dialogClose: document.querySelector("#dialog-close"),
  toast: document.querySelector("#toast")
};

let toastTimer = null;
let lastDialogTrigger = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function arrayValue(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
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
  const category = TOOL_CATEGORIES.includes(tool.primaryCategory) && tool.primaryCategory !== "全部"
    ? tool.primaryCategory
    : inferPrimaryCategory(tool);
  return {
    ...tool,
    id: String(tool.id || ""),
    name: String(tool.name || "未命名工具"),
    primaryCategory: category,
    taskGroups: arrayValue(tool.taskGroups),
    visibility: ["public", "internal", "maintainer", "hidden"].includes(tool.visibility)
      ? tool.visibility
      : inferVisibility(tool),
    featured: Boolean(tool.featured),
    featuredOrder: Number.isFinite(tool.featuredOrder) ? tool.featuredOrder : 999,
    icon: ALLOWED_ICONS.has(tool.icon) ? tool.icon : "toolbox",
    homepageSummary: String(tool.homepageSummary || tool.shortDescription || tool.educationPosition || "查看工具详情与使用边界。"),
    searchKeywords: arrayValue(tool.searchKeywords),
    tags: arrayValue(tool.tags),
    scenarios: arrayValue(tool.scenarios),
    aliases: arrayValue(tool.aliases),
    recommendedPrompts: arrayValue(tool.recommendedPrompts),
    updatedAt: typeof tool.updatedAt === "string" ? tool.updatedAt : ""
  };
}

function normalizePrompt(prompt) {
  return {
    ...prompt,
    id: String(prompt.id || ""),
    title: String(prompt.title || "未命名提示词"),
    taskGroups: arrayValue(prompt.taskGroups),
    featured: Boolean(prompt.featured),
    featuredOrder: Number.isFinite(prompt.featuredOrder) ? prompt.featuredOrder : 999,
    homepageSummary: String(prompt.homepageSummary || prompt.scenario || "查看完整提示词与使用说明。"),
    searchKeywords: arrayValue(prompt.searchKeywords),
    tags: arrayValue(prompt.tags),
    relatedTools: arrayValue(prompt.relatedTools),
    updatedAt: typeof prompt.updatedAt === "string" ? prompt.updatedAt : ""
  };
}

function statusLabel(tool) {
  if (tool.visibility === "maintainer" || tool.type === "skill") return "维护者能力包";
  if (tool.visibility === "internal" || tool.status === "internal") return tool.statusText || "校内专用，暂不公开";
  if (tool.status === "draft") return "建设中";
  if (tool.status === "pending" || !tool.url) return "链接待确认";
  return "可直接使用";
}

function promptStatusLabel(status) {
  return { ready: "可直接使用", draft: "待完善", pending: "待补充" }[status] || "待完善";
}

function typeLabel(type) {
  return {
    webpage: "网页工具",
    miaoda: "妙搭应用",
    skill: "Skill / 能力包",
    hub: "聚合入口",
    pending: "待确认"
  }[type] || "网页工具";
}

function isPublicTool(tool) {
  return tool.visibility === "public";
}

function isOpenable(tool) {
  return isPublicTool(tool) && tool.status === "online" && Boolean(safeExternalUrl(tool.url));
}

function itemSearchText(item) {
  return [
    item.name,
    item.title,
    item.category,
    item.primaryCategory,
    item.platform,
    item.educationPosition,
    item.homepageSummary,
    item.shortDescription,
    item.scenario,
    item.description,
    item.usageBoundary,
    ...arrayValue(item.aliases),
    ...arrayValue(item.tags),
    ...arrayValue(item.scenarios),
    ...arrayValue(item.searchKeywords),
    ...arrayValue(item.taskGroups)
  ].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN");
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

function visiblePublicTools() {
  return state.tools.filter((tool) => {
    if (!isPublicTool(tool)) return false;
    if (state.activeToolCategory !== "全部" && tool.primaryCategory !== state.activeToolCategory) return false;
    if (state.activeTask && !tool.taskGroups.includes(state.activeTask)) return false;
    if (state.onlineOnly && !isOpenable(tool)) return false;
    return matchesQuery(tool);
  });
}

function matchingPrompts() {
  return state.prompts.filter((prompt) => {
    if (state.activePromptCategory !== "全部" && prompt.category !== state.activePromptCategory) return false;
    if (state.activeTask && !prompt.taskGroups.includes(state.activeTask)) return false;
    return matchesQuery(prompt);
  });
}

function toolOpenLink(tool, label = "打开工具", className = "button primary-button") {
  if (!isOpenable(tool)) return "";
  const url = safeExternalUrl(tool.url);
  return `<a class="${escapeHtml(className)}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}${iconMarkup("arrow", "button-arrow")}</a>`;
}

function renderFilters() {
  dom.toolFilters.innerHTML = TOOL_CATEGORIES.map((category) => `
    <button class="filter-button ${category === state.activeToolCategory ? "is-active" : ""}" type="button" data-tool-category="${escapeHtml(category)}" aria-pressed="${category === state.activeToolCategory}">${escapeHtml(category)}</button>
  `).join("");

  dom.promptFilters.innerHTML = PROMPT_CATEGORIES.map((category) => `
    <button class="filter-button ${category === state.activePromptCategory ? "is-active" : ""}" type="button" data-prompt-category="${escapeHtml(category)}" aria-pressed="${category === state.activePromptCategory}">${escapeHtml(category)}</button>
  `).join("");
}

function renderQuickTools() {
  if (state.loadErrors.tools) {
    dom.quickToolList.innerHTML = '<div class="error-state compact-state">常用工具暂时无法加载。</div>';
    return;
  }
  const shortNames = {
    "curriculum-to-classroom-workbench": "AI 教学设计工作台",
    "student-thinking-tool": "写作思维小助手",
    "four-color-evidence-observer": "四色证据链",
    "mistake-tracker": "错题记录本"
  };
  dom.quickToolList.innerHTML = HOME_TOOL_IDS.quick.map(getTool).filter(Boolean).map((tool) => {
    const content = `<span class="quick-tool-icon">${iconMarkup(tool.icon)}</span><span>${escapeHtml(shortNames[tool.id] || tool.name)}</span>${iconMarkup("arrow", "quick-arrow")}`;
    return isOpenable(tool)
      ? `<a class="quick-tool" href="${escapeHtml(safeExternalUrl(tool.url))}" target="_blank" rel="noopener noreferrer">${content}</a>`
      : `<button class="quick-tool" type="button" data-tool-detail="${escapeHtml(tool.id)}">${content}</button>`;
  }).join("");
}

function currentWorkflow() {
  if (state.activeTask) return state.workflows.find((workflow) => workflow.title === state.activeTask) || null;
  if (state.query.length >= 2) {
    const query = state.query.toLocaleLowerCase("zh-CN");
    const ranked = state.workflows.map((workflow) => ({
      workflow,
      score: ([workflow.title, workflow.description].join(" ").toLocaleLowerCase("zh-CN").includes(query) ? 4 : 0)
        + arrayValue(workflow.toolIds).reduce((sum, id) => sum + (itemSearchText(getTool(id) || {}).includes(query) ? 2 : 0), 0)
        + arrayValue(workflow.promptIds).reduce((sum, id) => sum + (itemSearchText(getPrompt(id) || {}).includes(query) ? 1 : 0), 0)
    })).sort((a, b) => b.score - a.score);
    if (ranked[0]?.score > 0) return ranked[0].workflow;
  }
  return state.workflows.find((workflow) => workflow.title === "备课与作业") || state.workflows[0] || null;
}

function validWorkflowSteps(workflow) {
  return Array.isArray(workflow?.steps)
    ? workflow.steps.filter((step) => step.type === "tool" ? Boolean(getTool(step.id) && isPublicTool(getTool(step.id))) : Boolean(getPrompt(step.id)))
    : [];
}

function renderWorkflowSummary() {
  if (state.loadErrors.workflows) {
    dom.workflowSummary.innerHTML = '<div class="error-state compact-state">推荐路径暂时无法加载。</div>';
    return;
  }
  const workflow = currentWorkflow();
  if (!workflow) {
    dom.workflowSummary.innerHTML = '<div class="empty-state compact-state">当前没有可用路径。</div>';
    return;
  }
  const steps = validWorkflowSteps(workflow).slice(0, 5);
  document.querySelector("#path-title").textContent = `${workflow.title} · 标准路径`;
  dom.workflowSummary.innerHTML = `
    <ol class="path-steps">${steps.map((step, index) => `<li><span>${index + 1}</span><strong>${escapeHtml(step.shortLabel || step.label)}</strong></li>`).join("")}</ol>
    <div class="path-actions">
      <button class="text-button" type="button" data-workflow-detail="${escapeHtml(workflow.id)}">查看完整路径</button>
      ${state.activeTask ? '<button class="text-button muted" type="button" data-clear-task>清除任务</button>' : ""}
    </div>`;
}

function coreToolForTask() {
  if (state.activeTask) {
    const match = state.tools
      .filter((tool) => tool.featured && isPublicTool(tool) && tool.taskGroups.includes(state.activeTask))
      .sort((a, b) => a.featuredOrder - b.featuredOrder)[0];
    if (match) return match;
  }
  return getTool("curriculum-to-classroom-workbench") || state.tools.find((tool) => tool.featured && isPublicTool(tool));
}

function renderCoreTool() {
  if (state.loadErrors.tools) {
    dom.coreToolFeature.innerHTML = '<div class="error-state">核心工具暂时无法加载。</div>';
    return;
  }
  const tool = coreToolForTask();
  if (!tool) {
    dom.coreToolFeature.innerHTML = '<div class="empty-state">当前没有核心工具。</div>';
    return;
  }
  const preview = safeLocalAsset(tool.screenshotUrl);
  const tags = [tool.primaryCategory, tool.taskGroups[0]].filter(Boolean).slice(0, 2);
  dom.coreToolFeature.innerHTML = `
    <div class="core-visual ${preview ? "has-preview" : ""}">
      ${preview
        ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(tool.name)}真实网页截图" width="1280" height="720" loading="eager" data-preview-image /><span class="image-fallback" hidden>${iconMarkup(tool.icon)}<small>预览图加载失败</small></span>`
        : `<span class="core-icon">${iconMarkup(tool.icon)}</span>`}
    </div>
    <div class="core-content">
      <p class="eyebrow">核心教学工具</p>
      <h2 id="core-title">${escapeHtml(tool.name)}</h2>
      <p>${escapeHtml(tool.homepageSummary)}</p>
      <div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="core-actions">${toolOpenLink(tool)}<button class="text-button" type="button" data-tool-detail="${escapeHtml(tool.id)}">查看详情</button></div>
    </div>`;
}

function miniToolMarkup(tool) {
  return `
    <button class="mini-resource" type="button" data-tool-detail="${escapeHtml(tool.id)}">
      <span>${iconMarkup(tool.icon)}</span>
      <span><strong>${escapeHtml(tool.name)}</strong><small>${escapeHtml(tool.homepageSummary)}</small></span>
    </button>`;
}

function miniPromptMarkup(prompt) {
  return `
    <button class="mini-resource" type="button" data-prompt-detail="${escapeHtml(prompt.id)}">
      <span>${iconMarkup("copy")}</span>
      <span><strong>${escapeHtml(prompt.title)}</strong><small>${escapeHtml(prompt.homepageSummary)}</small></span>
    </button>`;
}

function renderHomeCollections() {
  const writing = HOME_TOOL_IDS.writing.map(getTool).filter(Boolean);
  const observation = HOME_TOOL_IDS.observation.map(getTool).filter(Boolean);
  const reflection = getPrompt("after-class-reflection");
  dom.writingTools.innerHTML = writing.map(miniToolMarkup).join("");
  dom.observationTools.innerHTML = observation.map(miniToolMarkup).join("") + (reflection ? miniPromptMarkup(reflection) : "");
  dom.writingZone.classList.toggle("is-relevant", state.activeTask === "写作与阅读");
  dom.observationZone.classList.toggle("is-relevant", state.activeTask === "课堂观察与诊断");
}

function homePrompts() {
  if (state.activeTask) {
    const matching = state.prompts
      .filter((prompt) => prompt.featured && prompt.taskGroups.includes(state.activeTask))
      .sort((a, b) => a.featuredOrder - b.featuredOrder)
      .slice(0, 3);
    if (matching.length) return matching;
  }
  return HOME_PROMPT_IDS.map(getPrompt).filter(Boolean);
}

function renderHomePrompts() {
  if (state.loadErrors.prompts) {
    dom.homePromptList.innerHTML = '<div class="error-state compact-state">精选提示词暂时无法加载。</div>';
    return;
  }
  const prompts = homePrompts();
  dom.homePromptList.innerHTML = prompts.map((prompt) => `
    <article class="home-prompt-row">
      <div><span>${escapeHtml(prompt.category)}</span><h3>${escapeHtml(prompt.title)}</h3><p>${escapeHtml(prompt.homepageSummary)}</p></div>
      <div><button class="small-action copy-action" type="button" data-copy-prompt="${escapeHtml(prompt.id)}">${iconMarkup("copy")}复制</button><button class="text-detail" type="button" data-prompt-detail="${escapeHtml(prompt.id)}">详情</button></div>
    </article>`).join("") || '<div class="empty-state compact-state">当前没有可推荐提示词。</div>';
}

function allRecentUpdates() {
  const toolUpdates = state.tools
    .filter((tool) => isPublicTool(tool) && /^\d{4}-\d{2}-\d{2}$/.test(tool.updatedAt))
    .map((tool) => ({ id: tool.id, name: tool.name, date: tool.updatedAt, type: "工具", kind: "tool" }));
  const promptUpdates = state.prompts
    .filter((prompt) => /^\d{4}-\d{2}-\d{2}$/.test(prompt.updatedAt))
    .map((prompt) => ({ id: prompt.id, name: prompt.title, date: prompt.updatedAt, type: "提示词", kind: "prompt" }));
  return [...toolUpdates, ...promptUpdates].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name, "zh-CN"));
}

function formatDate(date) {
  return date.replaceAll("-", ".");
}

function renderUpdates() {
  const updates = allRecentUpdates().slice(0, 3);
  dom.updateList.innerHTML = updates.map((item) => `
    <button class="update-row" type="button" ${item.kind === "tool" ? "data-tool-detail" : "data-prompt-detail"}="${escapeHtml(item.id)}">
      <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.type)}</small></span>
      <time datetime="${escapeHtml(item.date)}">${escapeHtml(formatDate(item.date))}</time>
    </button>`).join("") || '<div class="empty-state compact-state">暂无可靠更新时间。</div>';
}

function renderHome() {
  renderQuickTools();
  renderWorkflowSummary();
  renderCoreTool();
  renderHomeCollections();
  renderHomePrompts();
  renderUpdates();
}

function renderTools() {
  if (state.loadErrors.tools) {
    dom.toolCount.textContent = "工具数据加载失败";
    dom.toolGrid.innerHTML = '<div class="error-state">工具数据暂时无法加载，请稍后刷新；提示词库不受影响。</div>';
    return;
  }
  const visible = visiblePublicTools();
  const taskLabel = state.activeTask ? ` · ${state.activeTask}` : "";
  dom.toolCount.textContent = `${visible.length} 个公开工具${taskLabel}`;
  dom.toolGrid.classList.remove("loading-grid");
  if (!visible.length) {
    dom.toolGrid.innerHTML = '<div class="empty-state">没有找到匹配工具。可以更换关键词，或清除任务与分类筛选。</div>';
    return;
  }
  dom.toolGrid.innerHTML = visible.map((tool) => `
    <article class="compact-tool-card">
      <span class="compact-tool-icon">${iconMarkup(tool.icon)}</span>
      <div class="compact-tool-main">
        <div class="card-meta"><span>${escapeHtml(tool.primaryCategory)}</span><span>${escapeHtml(tool.platform || typeLabel(tool.type))}</span></div>
        <h2>${escapeHtml(tool.name)}</h2><p>${escapeHtml(tool.homepageSummary)}</p>
      </div>
      <div class="compact-tool-actions">
        <span class="status-label">${escapeHtml(statusLabel(tool))}</span>
        ${isOpenable(tool) ? toolOpenLink(tool, "打开", "small-action primary-button") : ""}
        <button class="text-detail" type="button" data-tool-detail="${escapeHtml(tool.id)}">详情</button>
      </div>
    </article>`).join("");
}

function renderInternalTools() {
  if (state.loadErrors.tools) {
    dom.internalCount.textContent = "内部项目数据暂不可用";
    dom.internalList.innerHTML = '<div class="error-state">内部项目数据加载失败。</div>';
    return;
  }
  const internal = state.tools.filter((tool) => ["internal", "maintainer"].includes(tool.visibility));
  dom.internalCount.textContent = `${internal.length} 项 · 校内专用、建设中与能力包`;
  dom.internalList.innerHTML = internal.length ? internal.map((tool) => `
    <article class="internal-item">
      <span class="internal-icon">${iconMarkup(tool.icon)}</span>
      <div><div class="card-meta"><span>${escapeHtml(typeLabel(tool.type))}</span><span>${escapeHtml(statusLabel(tool))}</span></div><h3>${escapeHtml(tool.name)}</h3><p>${escapeHtml(tool.homepageSummary)}</p></div>
      <button class="small-action secondary-button" type="button" data-tool-detail="${escapeHtml(tool.id)}">查看详情</button>
    </article>`).join("") : '<div class="empty-state">当前没有实验项目或维护者工具。</div>';
}

function renderPrompts() {
  if (state.loadErrors.prompts) {
    dom.promptCount.textContent = "提示词数据加载失败";
    dom.promptGrid.innerHTML = '<div class="error-state">提示词暂时无法加载，工具库仍可正常使用。</div>';
    return;
  }
  const visible = matchingPrompts();
  const taskLabel = state.activeTask ? ` · ${state.activeTask}` : "";
  dom.promptCount.textContent = `${visible.length} 条提示词${taskLabel}`;
  dom.promptGrid.classList.remove("loading-grid");
  if (!visible.length) {
    dom.promptGrid.innerHTML = '<div class="empty-state">没有找到匹配提示词。可以更换关键词或分类。</div>';
    return;
  }
  dom.promptGrid.innerHTML = visible.map((prompt) => `
    <article class="prompt-card">
      <div class="prompt-marker">${iconMarkup("copy")}</div>
      <div class="prompt-content">
        <div class="card-meta"><span>${escapeHtml(prompt.category)}</span><span>${escapeHtml(promptStatusLabel(prompt.status))}</span></div>
        <h2>${escapeHtml(prompt.title)}</h2><p>${escapeHtml(prompt.homepageSummary)}</p>
        <dl class="prompt-prepare"><dt>使用前准备</dt><dd>${escapeHtml(prompt.inputNeeded || "根据详情准备必要材料，并先完成脱敏。")}</dd></dl>
      </div>
      <div class="prompt-actions"><button class="small-action copy-action" type="button" data-copy-prompt="${escapeHtml(prompt.id)}">${iconMarkup("copy")}复制</button><button class="text-detail" type="button" data-prompt-detail="${escapeHtml(prompt.id)}">查看详情</button></div>
    </article>`).join("");
}

function updateTaskButtons() {
  document.querySelectorAll("[data-task], [data-quick-task]").forEach((button) => {
    const task = button.dataset.task || button.dataset.quickTask;
    const selected = task === state.activeTask;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function renderSuggestions() {
  if (state.currentView !== "home" || state.query.length < 2 || state.loadErrors.tools || state.loadErrors.prompts) {
    closeSuggestions();
    return;
  }
  const toolMatches = state.tools.filter((tool) => isPublicTool(tool) && matchesQuery(tool)).slice(0, 3);
  const promptMatches = state.prompts.filter(matchesQuery).slice(0, 3);
  if (!toolMatches.length && !promptMatches.length) {
    dom.searchSuggestions.innerHTML = '<p class="suggestion-empty">没有找到建议，按 Enter 前往工具库查看结果。</p>';
  } else {
    dom.searchSuggestions.innerHTML = `
      ${toolMatches.length ? `<div class="suggestion-group"><p>工具</p>${toolMatches.map((tool) => `<button type="button" role="option" data-suggestion-tool="${escapeHtml(tool.id)}"><span>${iconMarkup(tool.icon)}</span><span><strong>${escapeHtml(tool.name)}</strong><small>${escapeHtml(tool.primaryCategory)}</small></span></button>`).join("")}</div>` : ""}
      ${promptMatches.length ? `<div class="suggestion-group"><p>提示词</p>${promptMatches.map((prompt) => `<button type="button" role="option" data-suggestion-prompt="${escapeHtml(prompt.id)}"><span>${iconMarkup("copy")}</span><span><strong>${escapeHtml(prompt.title)}</strong><small>${escapeHtml(prompt.category)}</small></span></button>`).join("")}</div>` : ""}`;
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

function setQuery(value, source) {
  state.query = value.trim();
  syncSearchInputs();
  renderTools();
  renderPrompts();
  renderWorkflowSummary();
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
  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === nextView;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.title = nextView === "home" ? "日新教师 AI 工作台" : `${VIEW_NAMES[nextView]}｜日新教师 AI 工作台`;
  if (updateHash && window.location.hash !== `#${nextView}`) history.pushState(null, "", `#${nextView}`);
  closeSuggestions();
  closeSidebar();
  window.scrollTo({ top: 0, behavior: "auto" });
  if (focus) document.querySelector(`[data-view-panel="${nextView}"] h1`)?.focus({ preventScroll: true });
}

function selectTask(task, targetView = "home") {
  state.activeTask = task;
  state.activeToolCategory = "全部";
  state.activePromptCategory = "全部";
  renderAll();
  setView(targetView);
}

function clearTask() {
  state.activeTask = "";
  renderAll();
}

function clearAllFilters() {
  state.query = "";
  state.activeTask = "";
  state.activeToolCategory = "全部";
  state.activePromptCategory = "全部";
  state.onlineOnly = false;
  syncSearchInputs();
  renderAll();
}

function openSidebar(force) {
  const isOpen = typeof force === "boolean" ? force : !dom.sidebar.classList.contains("is-open");
  dom.sidebar.classList.toggle("is-open", isOpen);
  dom.sidebarScrim.hidden = !isOpen;
  dom.menuToggle.setAttribute("aria-expanded", String(isOpen));
  dom.menuToggle.setAttribute("aria-label", isOpen ? "关闭任务导航" : "打开任务导航");
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
  const canOpen = isOpenable(tool);
  dom.dialogContent.innerHTML = `
    <div class="dialog-heading"><p class="eyebrow">${escapeHtml(typeLabel(tool.type))}</p><h2 id="dialog-title">${escapeHtml(tool.name)}</h2><p>${escapeHtml(tool.educationPosition || tool.homepageSummary)}</p><div class="dialog-meta"><span>${escapeHtml(statusLabel(tool))}</span><span>${escapeHtml(tool.primaryCategory)}</span><span>${escapeHtml(tool.platform || typeLabel(tool.type))}</span></div></div>
    ${preview ? `<figure class="tool-preview"><img src="${escapeHtml(preview)}" alt="${escapeHtml(tool.name)}网页截图" width="960" height="540" loading="lazy" data-preview-image /><figcaption>真实网页截图，仅用于了解工具形态。</figcaption><span class="image-fallback" hidden>${iconMarkup(tool.icon)}预览图加载失败</span></figure>` : ""}
    <div class="detail-flow">
      ${detailBlock("解决什么问题", tool.painPoint || tool.shortDescription)}${detailBlock("教师怎么用", tool.howToUse)}${detailList("适用场景", tool.scenarios)}${detailBlock("教师可能获得什么", tool.teacherBenefit)}${detailBlock("学生可能获得什么", tool.studentBenefit)}${detailBlock("使用边界", tool.usageBoundary || tool.displayNote || "使用前请结合真实教学目标与学情进行判断。", "boundary-block")}${detailBlock("隐私提醒", tool.privacyNote || "涉及学生信息时，请先脱敏并由教师人工审核。", "privacy-block")}
      ${relatedPrompts.length ? `<section class="detail-block"><h3>关联提示词</h3><div class="related-actions">${relatedPrompts.map((prompt) => `<button type="button" data-prompt-detail="${escapeHtml(prompt.id)}">${escapeHtml(prompt.title)}</button>`).join("")}</div></section>` : ""}
    </div>
    <div class="dialog-footer">${canOpen ? `${toolOpenLink(tool)}<p>将在新窗口打开正式公开入口。</p>` : `<div class="availability-note">${iconMarkup("lock")}<span><strong>${escapeHtml(statusLabel(tool))}</strong><small>当前不提供公开跳转，请以状态说明和使用边界为准。</small></span></div>`}</div>`;
  openDialog(trigger);
}

function renderPromptDialog(prompt, trigger) {
  const relatedTools = prompt.relatedTools.map(getTool).filter(Boolean);
  dom.dialogContent.innerHTML = `
    <div class="dialog-heading prompt-dialog-heading"><p class="eyebrow">提示词 · ${escapeHtml(prompt.category)}</p><h2 id="dialog-title">${escapeHtml(prompt.title)}</h2><p>${escapeHtml(prompt.scenario)}</p><div class="dialog-meta"><span>${escapeHtml(promptStatusLabel(prompt.status))}</span><span>${escapeHtml(prompt.platform || "通用")}</span></div></div>
    <div class="detail-flow">${detailBlock("使用前准备", prompt.inputNeeded)}${detailBlock("期望输出", prompt.outputFormat)}${detailBlock("使用提醒", prompt.caution, "privacy-block")}
      <section class="detail-block prompt-full"><div class="prompt-full-head"><h3>完整提示词</h3><button class="small-action copy-action" type="button" data-copy-prompt="${escapeHtml(prompt.id)}">${iconMarkup("copy")}复制提示词</button></div><pre>${escapeHtml(prompt.prompt)}</pre></section>
      ${relatedTools.length ? `<section class="detail-block"><h3>关联工具</h3><div class="related-actions">${relatedTools.map((tool) => `<button type="button" data-tool-detail="${escapeHtml(tool.id)}">${escapeHtml(tool.name)}</button>`).join("")}</div></section>` : ""}
    </div>`;
  openDialog(trigger);
}

function workflowStepMarkup(step, index) {
  const item = step.type === "tool" ? getTool(step.id) : getPrompt(step.id);
  if (!item || (step.type === "tool" && !isPublicTool(item))) return "";
  const name = step.type === "tool" ? item.name : item.title;
  const detailAttr = step.type === "tool" ? "data-tool-detail" : "data-prompt-detail";
  return `<li><span class="step-number">${index + 1}</span><div><small>${step.type === "tool" ? "工具" : "提示词"}</small><strong>${escapeHtml(step.label)}</strong></div><button class="step-link" type="button" ${detailAttr}="${escapeHtml(item.id)}">${escapeHtml(name)}</button></li>`;
}

function renderWorkflowDialog(workflow, trigger) {
  const steps = validWorkflowSteps(workflow);
  const relatedTools = arrayValue(workflow.toolIds).map(getTool).filter((tool) => tool && isPublicTool(tool));
  const relatedPrompts = arrayValue(workflow.promptIds).map(getPrompt).filter(Boolean);
  dom.dialogContent.innerHTML = `
    <div class="dialog-heading"><p class="eyebrow">任务标准路径</p><h2 id="dialog-title">${escapeHtml(workflow.title)}</h2><p>${escapeHtml(workflow.description)}</p></div>
    <div class="detail-flow"><section class="detail-block"><h3>建议使用顺序</h3><ol class="workflow-steps">${steps.map(workflowStepMarkup).join("")}</ol></section>
      <section class="detail-block"><h3>相关工具</h3><div class="related-actions">${relatedTools.map((tool) => `<button type="button" data-tool-detail="${escapeHtml(tool.id)}">${escapeHtml(tool.name)}</button>`).join("") || "暂无公开工具"}</div></section>
      <section class="detail-block"><h3>相关提示词</h3><div class="related-actions">${relatedPrompts.map((prompt) => `<button type="button" data-prompt-detail="${escapeHtml(prompt.id)}">${escapeHtml(prompt.title)}</button>`).join("") || "暂无提示词"}</div></section>
    </div>`;
  openDialog(trigger);
}

function renderInfoDialog(type, trigger) {
  if (type === "privacy") {
    dom.dialogContent.innerHTML = `<div class="dialog-heading"><p class="eyebrow">使用边界</p><h2 id="dialog-title">隐私提醒</h2><p>AI 工具可以帮助整理材料，但不能替代教师的专业判断。</p></div><div class="detail-flow">${detailBlock("学生材料", "上传姓名、照片、作文、评语或家庭信息前，请先删除可识别个人身份的内容。", "privacy-block")}${detailBlock("人工审核", "生成结果需要结合真实学情、教学目标和学校规范进行复核。")}${detailBlock("公开边界", "校内项目和维护者能力包不提供公开入口；状态不明确的链接不会出现在公开页面。")}</div>`;
  } else if (type === "updates") {
    const rows = allRecentUpdates().map((item) => `<li><time datetime="${escapeHtml(item.date)}">${escapeHtml(formatDate(item.date))}</time><span>${escapeHtml(item.type)}</span><strong>${escapeHtml(item.name)}</strong></li>`).join("");
    dom.dialogContent.innerHTML = `<div class="dialog-heading"><p class="eyebrow">可维护目录</p><h2 id="dialog-title">最近更新</h2><p>日期表示工作台目录内容最后确认或更新的时间，不等同于外部工具发布日期。</p></div><div class="detail-flow"><section class="detail-block"><ul class="all-updates">${rows || "<li>暂无可靠更新时间。</li>"}</ul></section></div>`;
  } else {
    dom.dialogContent.innerHTML = `<div class="dialog-heading"><p class="eyebrow">关于工作台</p><h2 id="dialog-title">从真实教学任务出发</h2><p>日新教师 AI 工作台面向小学教师、一线教师培训和校本教研，帮助教师找到可直接执行的工具、提示词与组合路径。</p></div><div class="detail-flow">${detailBlock("维护", "由“字里行间的算法”持续整理与维护，维护者署名：树懒。")}${detailBlock("原则", "首页只保留帮助教师启动行动的入口；完整资源进入工具库和提示词库。")}${detailBlock("责任边界", "工具输出只作辅助，正式教学决策与学生材料使用必须由教师人工审核。", "boundary-block")}</div>`;
  }
  openDialog(trigger);
}

function openDialog(trigger) {
  if (!dom.dialog.open) {
    lastDialogTrigger = trigger || document.activeElement;
    dom.dialog.showModal();
    document.body.classList.add("modal-open");
  }
  const shell = dom.dialog.querySelector(".dialog-shell");
  if (shell) shell.scrollTop = 0;
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
    showToast("提示词已复制，可以粘贴使用");
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
  renderFilters();
  renderHome();
  renderTools();
  renderInternalTools();
  renderPrompts();
  updateTaskButtons();
  renderSuggestions();
  syncSearchInputs();
  dom.onlineOnly.checked = state.onlineOnly;
}

function handleDelegatedClick(event) {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    setView(viewButton.dataset.view);
    return;
  }
  const taskButton = event.target.closest("[data-task]");
  if (taskButton) {
    selectTask(taskButton.dataset.task, "home");
    return;
  }
  const quickTask = event.target.closest("[data-quick-task]");
  if (quickTask) {
    selectTask(quickTask.dataset.quickTask, "home");
    return;
  }
  const taskView = event.target.closest("[data-task-view]");
  if (taskView) {
    selectTask(taskView.dataset.taskView, "tools");
    return;
  }
  if (event.target.closest("[data-open-tasks]")) {
    openSidebar(true);
    requestAnimationFrame(() => dom.taskGrid.querySelector("[data-task]")?.focus());
    return;
  }
  const infoButton = event.target.closest("[data-info-dialog]");
  if (infoButton) {
    renderInfoDialog(infoButton.dataset.infoDialog, infoButton);
    return;
  }
  const workflowButton = event.target.closest("[data-workflow-detail]");
  if (workflowButton) {
    const workflow = state.workflows.find((item) => item.id === workflowButton.dataset.workflowDetail);
    if (workflow) renderWorkflowDialog(workflow, workflowButton);
    return;
  }
  const toolDetail = event.target.closest("[data-tool-detail]");
  if (toolDetail) {
    const tool = getTool(toolDetail.dataset.toolDetail);
    if (tool) renderToolDialog(tool, toolDetail);
    return;
  }
  const promptDetail = event.target.closest("[data-prompt-detail]");
  if (promptDetail) {
    const prompt = getPrompt(promptDetail.dataset.promptDetail);
    if (prompt) renderPromptDialog(prompt, promptDetail);
    return;
  }
  const copyButton = event.target.closest("[data-copy-prompt]");
  if (copyButton) {
    copyPrompt(copyButton.dataset.copyPrompt, copyButton);
    return;
  }
  const suggestionTool = event.target.closest("[data-suggestion-tool]");
  if (suggestionTool) {
    closeSuggestions();
    const tool = getTool(suggestionTool.dataset.suggestionTool);
    if (tool) renderToolDialog(tool, suggestionTool);
    return;
  }
  const suggestionPrompt = event.target.closest("[data-suggestion-prompt]");
  if (suggestionPrompt) {
    closeSuggestions();
    const prompt = getPrompt(suggestionPrompt.dataset.suggestionPrompt);
    if (prompt) renderPromptDialog(prompt, suggestionPrompt);
    return;
  }
  if (event.target.closest("[data-clear-task]")) clearTask();
}

function wireSearch(input, enterView) {
  input.addEventListener("input", () => setQuery(input.value, input));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      closeSuggestions();
      if (enterView) setView(enterView);
    }
    if (input === dom.searchInput && event.key === "ArrowDown" && !dom.searchSuggestions.hidden) {
      event.preventDefault();
      dom.searchSuggestions.querySelector("button")?.focus();
    }
    if (event.key === "Escape") closeSuggestions();
  });
}

function wireEvents() {
  dom.menuToggle.addEventListener("click", () => openSidebar());
  dom.sidebarScrim.addEventListener("click", closeSidebar);
  wireSearch(dom.searchInput, "tools");
  wireSearch(dom.toolSearch, null);
  wireSearch(dom.promptSearch, null);

  dom.searchClear.addEventListener("click", () => {
    setQuery("", dom.searchInput);
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
  dom.clearFilters.addEventListener("click", clearAllFilters);
  dom.internalToggle.addEventListener("click", () => {
    const expanded = dom.internalToggle.getAttribute("aria-expanded") === "true";
    dom.internalToggle.setAttribute("aria-expanded", String(!expanded));
    dom.internalPanel.hidden = expanded;
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
  window.addEventListener("hashchange", () => setView(currentViewFromHash(), { updateHash: false }));
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
  const results = await Promise.allSettled([
    fetchJsonWithRetry("tools.json"),
    fetchJsonWithRetry("prompts.json"),
    fetchJsonWithRetry("workflows.json")
  ]);
  if (results[0].status === "fulfilled" && Array.isArray(results[0].value)) state.tools = results[0].value.map(normalizeTool).filter((tool) => tool.id);
  else state.loadErrors.tools = true;
  if (results[1].status === "fulfilled" && Array.isArray(results[1].value)) state.prompts = results[1].value.map(normalizePrompt).filter((prompt) => prompt.id);
  else state.loadErrors.prompts = true;
  if (results[2].status === "fulfilled" && Array.isArray(results[2].value)) state.workflows = results[2].value;
  else state.loadErrors.workflows = true;
  renderAll();
  setView(state.currentView, { updateHash: !window.location.hash });
}

init();
