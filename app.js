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
  "arrow"
]);

const state = {
  tools: [],
  prompts: [],
  workflows: [],
  query: "",
  activeTask: "",
  activeToolCategory: "全部",
  activePromptCategory: "全部",
  onlineOnly: false,
  showAllPrompts: false,
  loadErrors: { tools: false, prompts: false, workflows: false }
};

const dom = {
  header: document.querySelector("#site-header"),
  menuToggle: document.querySelector("#menu-toggle"),
  topNav: document.querySelector("#top-nav"),
  searchInput: document.querySelector("#global-search"),
  searchClear: document.querySelector("#search-clear"),
  searchSuggestions: document.querySelector("#search-suggestions"),
  taskGrid: document.querySelector("#task-grid"),
  featuredGrid: document.querySelector("#featured-grid"),
  workflowPanel: document.querySelector("#workflow-panel"),
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
  togglePrompts: document.querySelector("#toggle-prompts"),
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
  if (tool.status === "draft" || tool.status === "pending") return "internal";
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
    recommendedPrompts: arrayValue(tool.recommendedPrompts)
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
    relatedTools: arrayValue(prompt.relatedTools)
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
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("zh-CN");
}

function matchesQuery(item) {
  return !state.query || itemSearchText(item).includes(state.query.toLocaleLowerCase("zh-CN"));
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
  const filtered = state.prompts.filter((prompt) => {
    if (state.activePromptCategory !== "全部" && prompt.category !== state.activePromptCategory) return false;
    if (state.activeTask && !prompt.taskGroups.includes(state.activeTask)) return false;
    return matchesQuery(prompt);
  });
  const shouldLimit = !state.showAllPrompts && !state.query && !state.activeTask && state.activePromptCategory === "全部";
  return shouldLimit
    ? filtered.filter((prompt) => prompt.featured).sort((a, b) => a.featuredOrder - b.featuredOrder).slice(0, 6)
    : filtered;
}

function renderFilters() {
  dom.toolFilters.innerHTML = TOOL_CATEGORIES.map((category) => `
    <button
      class="filter-button ${category === state.activeToolCategory ? "is-active" : ""}"
      type="button"
      data-tool-category="${escapeHtml(category)}"
      aria-pressed="${category === state.activeToolCategory}"
    >${escapeHtml(category)}</button>
  `).join("");

  dom.promptFilters.innerHTML = PROMPT_CATEGORIES.map((category) => `
    <button
      class="filter-button ${category === state.activePromptCategory ? "is-active" : ""}"
      type="button"
      data-prompt-category="${escapeHtml(category)}"
      aria-pressed="${category === state.activePromptCategory}"
    >${escapeHtml(category)}</button>
  `).join("");
}

function toolOpenLink(tool, label = "打开工具", className = "button primary-button") {
  if (!isOpenable(tool)) return "";
  const url = safeExternalUrl(tool.url);
  return `<a class="${escapeHtml(className)}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}${iconMarkup("arrow", "button-arrow")}</a>`;
}

function renderFeaturedTools() {
  if (state.loadErrors.tools) {
    dom.featuredGrid.innerHTML = '<div class="error-state">推荐工具暂时无法加载，其他内容仍可继续查看。</div>';
    return;
  }
  const featured = state.tools
    .filter((tool) => tool.featured && isPublicTool(tool))
    .sort((a, b) => a.featuredOrder - b.featuredOrder)
    .slice(0, 6);

  if (!featured.length) {
    dom.featuredGrid.innerHTML = '<div class="empty-state">当前没有可展示的推荐工具。</div>';
    return;
  }

  dom.featuredGrid.classList.remove("loading-grid");
  dom.featuredGrid.innerHTML = featured.map((tool) => {
    const preview = safeLocalAsset(tool.screenshotUrl);
    return `
      <article class="featured-card">
        <div class="featured-visual ${preview ? "has-preview" : ""}">
          ${preview
            ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(tool.name)}网页预览" width="640" height="360" loading="lazy" data-preview-image /><span class="image-fallback" hidden>${iconMarkup(tool.icon)}</span>`
            : `<span class="featured-icon">${iconMarkup(tool.icon)}</span>`}
          <span class="task-pill">${escapeHtml(tool.taskGroups[0] || tool.primaryCategory)}</span>
        </div>
        <div class="featured-content">
          <div class="card-meta"><span>${escapeHtml(tool.primaryCategory)}</span><span>${escapeHtml(tool.platform || typeLabel(tool.type))}</span></div>
          <h3>${escapeHtml(tool.name)}</h3>
          <p>${escapeHtml(tool.homepageSummary)}</p>
          <div class="card-actions">
            ${toolOpenLink(tool)}
            <button class="button secondary-button" type="button" data-tool-detail="${escapeHtml(tool.id)}">查看详情</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderTools() {
  if (state.loadErrors.tools) {
    dom.toolCount.textContent = "工具数据加载失败";
    dom.toolGrid.innerHTML = '<div class="error-state">工具数据暂时无法加载，请稍后刷新；提示词区域不受影响。</div>';
    return;
  }
  const visible = visiblePublicTools();
  dom.toolCount.textContent = `当前显示 ${visible.length} 个公开工具`;
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
        <h3>${escapeHtml(tool.name)}</h3>
        <p>${escapeHtml(tool.homepageSummary)}</p>
      </div>
      <div class="compact-tool-actions">
        <span class="status-label status-online">${escapeHtml(statusLabel(tool))}</span>
        ${isOpenable(tool)
          ? toolOpenLink(tool, "打开", "small-action primary-button")
          : `<button class="small-action secondary-button" type="button" data-tool-detail="${escapeHtml(tool.id)}">查看详情</button>`}
        ${isOpenable(tool) ? `<button class="text-detail" type="button" data-tool-detail="${escapeHtml(tool.id)}">详情</button>` : ""}
      </div>
    </article>
  `).join("");
}

function renderInternalTools() {
  if (state.loadErrors.tools) {
    dom.internalCount.textContent = "内部项目数据暂不可用";
    dom.internalList.innerHTML = '<div class="error-state">内部项目数据加载失败。</div>';
    return;
  }
  const internal = state.tools.filter((tool) => ["internal", "maintainer"].includes(tool.visibility));
  dom.internalCount.textContent = `${internal.length} 项 · 校内专用、建设中与能力包`;
  dom.internalList.innerHTML = internal.length
    ? internal.map((tool) => `
      <article class="internal-item">
        <span class="internal-icon">${iconMarkup(tool.icon)}</span>
        <div>
          <div class="card-meta"><span>${escapeHtml(typeLabel(tool.type))}</span><span>${escapeHtml(statusLabel(tool))}</span></div>
          <h3>${escapeHtml(tool.name)}</h3>
          <p>${escapeHtml(tool.homepageSummary)}</p>
        </div>
        <button class="small-action secondary-button" type="button" data-tool-detail="${escapeHtml(tool.id)}">查看详情</button>
      </article>
    `).join("")
    : '<div class="empty-state">当前没有实验项目或维护者工具。</div>';
}

function renderPrompts() {
  if (state.loadErrors.prompts) {
    dom.promptCount.textContent = "提示词数据加载失败";
    dom.promptGrid.innerHTML = '<div class="error-state">提示词暂时无法加载，工具区域仍可正常使用。</div>';
    return;
  }
  const visible = matchingPrompts();
  const totalMatching = state.prompts.filter((prompt) => {
    if (state.activePromptCategory !== "全部" && prompt.category !== state.activePromptCategory) return false;
    if (state.activeTask && !prompt.taskGroups.includes(state.activeTask)) return false;
    return matchesQuery(prompt);
  }).length;
  dom.promptCount.textContent = `当前显示 ${visible.length} / ${totalMatching} 条提示词`;
  dom.togglePrompts.hidden = Boolean(state.query || state.activeTask || state.activePromptCategory !== "全部");
  dom.togglePrompts.textContent = state.showAllPrompts ? "收起为推荐提示词" : "查看全部提示词";
  dom.togglePrompts.setAttribute("aria-expanded", String(state.showAllPrompts));
  dom.promptGrid.classList.remove("loading-grid");

  if (!visible.length) {
    dom.promptGrid.innerHTML = '<div class="empty-state">没有找到匹配提示词。可以更换关键词或清除筛选。</div>';
    return;
  }

  dom.promptGrid.innerHTML = visible.map((prompt) => `
    <article class="prompt-card">
      <div class="prompt-marker">${iconMarkup("copy")}</div>
      <div class="prompt-content">
        <div class="card-meta"><span>${escapeHtml(prompt.category)}</span><span>${escapeHtml(promptStatusLabel(prompt.status))}</span></div>
        <h3>${escapeHtml(prompt.title)}</h3>
        <p>${escapeHtml(prompt.homepageSummary)}</p>
        <dl class="prompt-prepare">
          <dt>使用前准备</dt>
          <dd>${escapeHtml(prompt.inputNeeded || "根据详情准备必要材料，并先完成脱敏。")}</dd>
        </dl>
      </div>
      <div class="prompt-actions">
        <button class="small-action copy-action" type="button" data-copy-prompt="${escapeHtml(prompt.id)}">${iconMarkup("copy")}复制</button>
        <button class="text-detail" type="button" data-prompt-detail="${escapeHtml(prompt.id)}">查看详情</button>
      </div>
    </article>
  `).join("");
}

function findWorkflow() {
  if (state.activeTask) return state.workflows.find((workflow) => workflow.title === state.activeTask) || null;
  if (state.query.length < 2) return null;

  const query = state.query.toLocaleLowerCase("zh-CN");
  const ranked = state.workflows.map((workflow) => ({
    workflow,
    score: ([workflow.title, workflow.description].join(" ").toLocaleLowerCase("zh-CN").includes(query) ? 4 : 0)
      + (workflow.toolIds || []).reduce((sum, id) => sum + (itemSearchText(state.tools.find((item) => item.id === id) || {}).includes(query) ? 2 : 0), 0)
      + (workflow.promptIds || []).reduce((sum, id) => sum + (itemSearchText(state.prompts.find((item) => item.id === id) || {}).includes(query) ? 1 : 0), 0)
  })).sort((a, b) => b.score - a.score);
  return ranked[0]?.score > 0 ? ranked[0].workflow : null;
}

function workflowStepMarkup(step, index) {
  const item = step.type === "tool"
    ? state.tools.find((tool) => tool.id === step.id && isPublicTool(tool))
    : state.prompts.find((prompt) => prompt.id === step.id);
  if (!item) return "";
  const name = step.type === "tool" ? item.name : item.title;
  const detailAttr = step.type === "tool" ? "data-tool-detail" : "data-prompt-detail";
  return `
    <li>
      <span class="step-number">${index + 1}</span>
      <div><small>${step.type === "tool" ? "工具" : "提示词"}</small><strong>${escapeHtml(step.label)}</strong></div>
      <button class="step-link" type="button" ${detailAttr}="${escapeHtml(item.id)}">${escapeHtml(name)}</button>
    </li>
  `;
}

function renderWorkflow() {
  if (state.loadErrors.workflows) {
    dom.workflowPanel.innerHTML = `
      <div class="workflow-placeholder error-state">
        <p class="eyebrow">为你推荐</p>
        <h2 id="workflow-title">工作流暂时无法加载</h2>
        <p>基础工具和提示词仍可正常使用。</p>
      </div>`;
    return;
  }
  const workflow = findWorkflow();
  if (!workflow) {
    dom.workflowPanel.innerHTML = `
      <div class="workflow-placeholder">
        <p class="eyebrow">为你推荐</p>
        <h2 id="workflow-title">${state.query ? "没有匹配到明确工作流" : "选择一项任务，获得一条可执行路径"}</h2>
        <p>${state.query ? "可以继续查看下方搜索结果，或换一个更具体的关键词。" : "工作台会按顺序组合相关工具与提示词；搜索关键词时，也会匹配最接近的任务流。"}</p>
      </div>`;
    return;
  }

  const steps = (workflow.steps || [])
    .map((step) => {
      const item = step.type === "tool"
        ? state.tools.find((tool) => tool.id === step.id && isPublicTool(tool))
        : state.prompts.find((prompt) => prompt.id === step.id);
      return item ? step : null;
    })
    .filter(Boolean);
  const relatedTools = (workflow.toolIds || [])
    .map((id) => state.tools.find((tool) => tool.id === id && isPublicTool(tool)))
    .filter(Boolean);
  const relatedPrompts = (workflow.promptIds || [])
    .map((id) => state.prompts.find((prompt) => prompt.id === id))
    .filter(Boolean);

  dom.workflowPanel.innerHTML = `
    <div class="workflow-head">
      <div>
        <p class="eyebrow">${state.activeTask ? "当前已选择任务" : "根据搜索为你推荐"}</p>
        <h2 id="workflow-title">${escapeHtml(workflow.title)}</h2>
        <p>${escapeHtml(workflow.description)}</p>
      </div>
      ${state.activeTask ? '<button class="text-button clear-task" type="button" data-clear-task>清除任务筛选</button>' : ""}
    </div>
    <div class="workflow-body">
      <div>
        <h3>建议使用顺序</h3>
        <ol class="workflow-steps">${steps.map(workflowStepMarkup).join("")}</ol>
      </div>
      <aside class="workflow-resources" aria-label="相关资源">
        <div>
          <h3>相关工具</h3>
          <div class="resource-links">${relatedTools.map((tool) => `<button type="button" data-tool-detail="${escapeHtml(tool.id)}">${escapeHtml(tool.name)}</button>`).join("") || "<p>暂无可公开工具</p>"}</div>
        </div>
        <div>
          <h3>相关提示词</h3>
          <div class="resource-links prompt-links">${relatedPrompts.map((prompt) => `<button type="button" data-prompt-detail="${escapeHtml(prompt.id)}">${escapeHtml(prompt.title)}</button>`).join("") || "<p>暂无关联提示词</p>"}</div>
        </div>
      </aside>
    </div>`;
}

function updateTaskButtons() {
  dom.taskGrid.querySelectorAll("[data-task]").forEach((button) => {
    const selected = button.dataset.task === state.activeTask;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function renderSuggestions() {
  if (state.query.length < 2 || state.loadErrors.tools || state.loadErrors.prompts) {
    closeSuggestions();
    return;
  }
  const toolMatches = state.tools.filter((tool) => isPublicTool(tool) && matchesQuery(tool)).slice(0, 3);
  const promptMatches = state.prompts.filter(matchesQuery).slice(0, 3);
  if (!toolMatches.length && !promptMatches.length) {
    dom.searchSuggestions.innerHTML = '<p class="suggestion-empty">没有找到建议，按 Enter 查看完整空状态。</p>';
  } else {
    dom.searchSuggestions.innerHTML = `
      ${toolMatches.length ? `<div class="suggestion-group"><p>工具</p>${toolMatches.map((tool) => `<button type="button" role="option" data-suggestion-tool="${escapeHtml(tool.id)}"><span>${iconMarkup(tool.icon)}</span><span><strong>${escapeHtml(tool.name)}</strong><small>${escapeHtml(tool.primaryCategory)}</small></span></button>`).join("")}</div>` : ""}
      ${promptMatches.length ? `<div class="suggestion-group"><p>提示词</p>${promptMatches.map((prompt) => `<button type="button" role="option" data-suggestion-prompt="${escapeHtml(prompt.id)}"><span>${iconMarkup("copy")}</span><span><strong>${escapeHtml(prompt.title)}</strong><small>${escapeHtml(prompt.category)}</small></span></button>`).join("")}</div>` : ""}
    `;
  }
  dom.searchSuggestions.hidden = false;
  dom.searchInput.setAttribute("aria-expanded", "true");
}

function closeSuggestions() {
  dom.searchSuggestions.hidden = true;
  dom.searchInput.setAttribute("aria-expanded", "false");
}

function renderAll() {
  renderFilters();
  renderFeaturedTools();
  renderTools();
  renderInternalTools();
  renderPrompts();
  renderWorkflow();
  updateTaskButtons();
  renderSuggestions();
  dom.searchClear.hidden = !state.query;
  dom.onlineOnly.checked = state.onlineOnly;
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
  const relatedPrompts = tool.recommendedPrompts
    .map((id) => state.prompts.find((prompt) => prompt.id === id))
    .filter(Boolean);
  const canOpen = isOpenable(tool);
  dom.dialogContent.innerHTML = `
    <div class="dialog-heading">
      <p class="eyebrow">${escapeHtml(typeLabel(tool.type))}</p>
      <h2 id="dialog-title">${escapeHtml(tool.name)}</h2>
      <p>${escapeHtml(tool.educationPosition || tool.homepageSummary)}</p>
      <div class="dialog-meta">
        <span>${escapeHtml(statusLabel(tool))}</span>
        <span>${escapeHtml(tool.primaryCategory)}</span>
        <span>${escapeHtml(tool.platform || typeLabel(tool.type))}</span>
      </div>
    </div>
    ${preview ? `<figure class="tool-preview"><img src="${escapeHtml(preview)}" alt="${escapeHtml(tool.name)}网页截图" width="960" height="540" loading="lazy" data-preview-image /><figcaption>已有网页截图，仅用于了解工具形态。</figcaption><span class="image-fallback" hidden>${iconMarkup(tool.icon)}预览图加载失败</span></figure>` : ""}
    <div class="detail-flow">
      ${detailBlock("解决什么问题", tool.painPoint || tool.shortDescription)}
      ${detailBlock("教师怎么用", tool.howToUse)}
      ${detailList("适用场景", tool.scenarios)}
      ${detailBlock("教师可能获得什么", tool.teacherBenefit)}
      ${detailBlock("学生可能获得什么", tool.studentBenefit)}
      ${detailBlock("使用边界", tool.usageBoundary || tool.displayNote || "使用前请结合真实教学目标与学情进行判断。", "boundary-block")}
      ${detailBlock("隐私提醒", tool.privacyNote || "涉及学生信息时，请先脱敏并由教师人工审核。", "privacy-block")}
      ${relatedPrompts.length ? `<section class="detail-block"><h3>关联提示词</h3><div class="related-actions">${relatedPrompts.map((prompt) => `<button type="button" data-prompt-detail="${escapeHtml(prompt.id)}">${escapeHtml(prompt.title)}</button>`).join("")}</div></section>` : ""}
    </div>
    <div class="dialog-footer">
      ${canOpen
        ? `${toolOpenLink(tool)}<p>将在新窗口打开正式公开入口。</p>`
        : `<div class="availability-note">${iconMarkup("lock")}<span><strong>${escapeHtml(statusLabel(tool))}</strong><small>当前不提供公开跳转，请以状态说明和使用边界为准。</small></span></div>`}
    </div>`;
  openDialog(trigger);
}

function renderPromptDialog(prompt, trigger) {
  const relatedTools = prompt.relatedTools
    .map((id) => state.tools.find((tool) => tool.id === id))
    .filter(Boolean);
  dom.dialogContent.innerHTML = `
    <div class="dialog-heading prompt-dialog-heading">
      <p class="eyebrow">提示词 · ${escapeHtml(prompt.category)}</p>
      <h2 id="dialog-title">${escapeHtml(prompt.title)}</h2>
      <p>${escapeHtml(prompt.scenario)}</p>
      <div class="dialog-meta"><span>${escapeHtml(promptStatusLabel(prompt.status))}</span><span>${escapeHtml(prompt.platform || "通用")}</span></div>
    </div>
    <div class="detail-flow">
      ${detailBlock("使用前准备", prompt.inputNeeded)}
      ${detailBlock("期望输出", prompt.outputFormat)}
      ${detailBlock("使用提醒", prompt.caution, "privacy-block")}
      <section class="detail-block prompt-full">
        <div class="prompt-full-head"><h3>完整提示词</h3><button class="small-action copy-action" type="button" data-copy-prompt="${escapeHtml(prompt.id)}">${iconMarkup("copy")}复制提示词</button></div>
        <pre>${escapeHtml(prompt.prompt)}</pre>
      </section>
      ${relatedTools.length ? `<section class="detail-block"><h3>关联工具</h3><div class="related-actions">${relatedTools.map((tool) => `<button type="button" data-tool-detail="${escapeHtml(tool.id)}">${escapeHtml(tool.name)}</button>`).join("")}</div></section>` : ""}
    </div>`;
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
  const prompt = state.prompts.find((item) => item.id === promptId);
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
    area.value = prompt.prompt;
    wrapper.append(title, note, area);
    dom.dialogContent.appendChild(wrapper);
  }
  const area = wrapper.querySelector("textarea");
  area.value = prompt.prompt;
  area.focus();
  area.select();
  showToast("请手动复制下方内容", "notice");
}

function selectTask(task) {
  state.activeTask = task;
  renderAll();
  document.querySelector("#search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearAllFilters() {
  state.query = "";
  state.activeTask = "";
  state.activeToolCategory = "全部";
  state.activePromptCategory = "全部";
  state.onlineOnly = false;
  state.showAllPrompts = false;
  dom.searchInput.value = "";
  renderAll();
}

function toggleMenu(force) {
  const isOpen = typeof force === "boolean" ? force : dom.menuToggle.getAttribute("aria-expanded") !== "true";
  dom.menuToggle.setAttribute("aria-expanded", String(isOpen));
  dom.menuToggle.setAttribute("aria-label", isOpen ? "关闭导航菜单" : "打开导航菜单");
  dom.topNav.classList.toggle("is-open", isOpen);
}

function handleDelegatedClick(event) {
  const toolDetail = event.target.closest("[data-tool-detail]");
  if (toolDetail) {
    const tool = state.tools.find((item) => item.id === toolDetail.dataset.toolDetail);
    if (tool) renderToolDialog(tool, toolDetail);
    return;
  }
  const promptDetail = event.target.closest("[data-prompt-detail]");
  if (promptDetail) {
    const prompt = state.prompts.find((item) => item.id === promptDetail.dataset.promptDetail);
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
    const tool = state.tools.find((item) => item.id === suggestionTool.dataset.suggestionTool);
    closeSuggestions();
    if (tool) renderToolDialog(tool, suggestionTool);
    return;
  }
  const suggestionPrompt = event.target.closest("[data-suggestion-prompt]");
  if (suggestionPrompt) {
    const prompt = state.prompts.find((item) => item.id === suggestionPrompt.dataset.suggestionPrompt);
    closeSuggestions();
    if (prompt) renderPromptDialog(prompt, suggestionPrompt);
    return;
  }
  if (event.target.closest("[data-clear-task]")) {
    state.activeTask = "";
    renderAll();
  }
}

function wireEvents() {
  dom.menuToggle.addEventListener("click", () => toggleMenu());
  dom.topNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) toggleMenu(false);
  });

  dom.searchInput.addEventListener("input", () => {
    state.query = dom.searchInput.value.trim();
    renderTools();
    renderPrompts();
    renderWorkflow();
    renderSuggestions();
    dom.searchClear.hidden = !state.query;
  });
  dom.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      closeSuggestions();
      document.querySelector("#search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (event.key === "ArrowDown" && !dom.searchSuggestions.hidden) {
      event.preventDefault();
      dom.searchSuggestions.querySelector("button")?.focus();
    }
    if (event.key === "Escape") closeSuggestions();
  });
  dom.searchClear.addEventListener("click", () => {
    state.query = "";
    dom.searchInput.value = "";
    dom.searchInput.focus();
    renderAll();
  });

  dom.taskGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-task]");
    if (button) selectTask(button.dataset.task);
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
    state.showAllPrompts = true;
    renderFilters();
    renderPrompts();
  });
  dom.onlineOnly.addEventListener("change", () => {
    state.onlineOnly = dom.onlineOnly.checked;
    renderTools();
  });
  dom.clearFilters.addEventListener("click", clearAllFilters);
  dom.togglePrompts.addEventListener("click", () => {
    state.showAllPrompts = !state.showAllPrompts;
    renderPrompts();
  });
  dom.internalToggle.addEventListener("click", () => {
    const expanded = dom.internalToggle.getAttribute("aria-expanded") === "true";
    dom.internalToggle.setAttribute("aria-expanded", String(!expanded));
    dom.internalPanel.hidden = expanded;
  });

  document.addEventListener("click", (event) => {
    handleDelegatedClick(event);
    if (!event.target.closest(".search-area")) closeSuggestions();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      toggleMenu(false);
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

  window.addEventListener("scroll", () => {
    dom.header.classList.toggle("is-scrolled", window.scrollY > 12);
  }, { passive: true });
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
  const results = await Promise.allSettled([
    fetchJsonWithRetry("tools.json"),
    fetchJsonWithRetry("prompts.json"),
    fetchJsonWithRetry("workflows.json")
  ]);

  if (results[0].status === "fulfilled" && Array.isArray(results[0].value)) {
    state.tools = results[0].value.map(normalizeTool).filter((tool) => tool.id);
  } else {
    state.loadErrors.tools = true;
  }
  if (results[1].status === "fulfilled" && Array.isArray(results[1].value)) {
    state.prompts = results[1].value.map(normalizePrompt).filter((prompt) => prompt.id);
  } else {
    state.loadErrors.prompts = true;
  }
  if (results[2].status === "fulfilled" && Array.isArray(results[2].value)) {
    state.workflows = results[2].value;
  } else {
    state.loadErrors.workflows = true;
  }
  renderAll();
}

init();
