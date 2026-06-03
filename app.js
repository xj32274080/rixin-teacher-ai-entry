const toolCategories = [
  "全部",
  "事务减负",
  "成果呈现",
  "课堂组织",
  "专业提质",
  "诊断增效",
  "学生思维",
  "期末复习",
  "作文教学",
  "阅读教学",
  "知识库"
];

const promptCategories = [
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

const quickPaths = {
  term: ["comment-card-printer", "mistake-tracker", "class-magazine-generator"],
  prep: ["xiaoxue-yuwen-quanjingtu", "web-knowledge-archiver", "yulai-reading-wall"],
  visible: ["student-thinking-tool", "three-color-writing-review", "mistake-tracker", "rixin-teacher-tools"]
};

const workflowPaths = [
  {
    id: "prepare-lesson",
    title: "我要备课",
    steps: ["文本解读", "学情预设", "教学目标", "核心任务", "评价设计", "课件/任务单生成"],
    toolIds: ["xiaoxue-yuwen-quanjingtu", "web-knowledge-archiver", "yulai-reading-wall"],
    promptIds: ["lesson-text-analysis", "metaso-research-helper", "homework-design-helper"]
  },
  {
    id: "design-homework",
    title: "我要设计作业",
    steps: ["课标/单元目标", "作业目标", "分层任务", "评价标准", "修改优化"],
    toolIds: ["xiaoxue-yuwen-quanjingtu", "web-knowledge-archiver", "mistake-tracker"],
    promptIds: ["homework-design-helper", "metaso-research-helper"]
  },
  {
    id: "review-learning",
    title: "我要复习",
    steps: ["错题证据", "卡点归类", "复习目标", "分层任务", "精准讲评", "课后调整"],
    toolIds: ["mistake-tracker", "rixin-teacher-tools", "xiaoxue-yuwen-quanjingtu"],
    promptIds: ["homework-design-helper", "after-class-reflection"]
  },
  {
    id: "family-talk",
    title: "我要沟通",
    steps: ["事实整理", "情绪降温", "边界表达", "合作建议", "形成沟通文本"],
    toolIds: ["comment-card-printer"],
    promptIds: ["family-communication-helper"]
  }
];

let tools = [];
let prompts = [];
let activeToolCategory = "全部";
let activePromptCategory = "全部";
let activeQuickPath = null;
let copyTimer = null;

const toolGrid = document.querySelector("#tool-grid");
const promptGrid = document.querySelector("#prompt-grid");
const toolCount = document.querySelector("#tool-result-count");
const promptCount = document.querySelector("#prompt-result-count");
const searchInput = document.querySelector("#global-search");
const toolFilters = document.querySelector("#tool-category-filters");
const promptFilters = document.querySelector("#prompt-category-filters");
const pathGrid = document.querySelector("#workflow-grid");
const dialog = document.querySelector("#detail-dialog");
const dialogContent = document.querySelector("#dialog-content");
const dialogClose = document.querySelector("#dialog-close");
const toast = document.querySelector("#toast");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusLabel(item) {
  if (item.status === "internal") return "校内使用/暂不公开";
  if (item.status === "draft") return "建设中";
  if (item.status === "pending" || !item.url) return "链接待补";
  return "在线";
}

function typeLabel(type) {
  return {
    webpage: "网页工具",
    miaoda: "妙搭应用",
    skill: "Skill / 能力包",
    hub: "聚合入口",
    "prompt-method": "提示词方法",
    pending: "待确认"
  }[type] || "网页工具";
}

function statusNotice(item) {
  if (item.status === "pending") return "此工具链接或信息仍待补充。";
  if (item.status === "draft") return "此工具仍在建设中。";
  if (item.status === "internal") return "此工具为校内或内部使用，暂不公开。";
  return "";
}

function promptStatusLabel(status) {
  return { ready: "可直接使用", draft: "待完善", pending: "待补充" }[status] || "待完善";
}

function privacyLabel(level) {
  return { low: "低隐私风险", medium: "中隐私风险", high: "高隐私风险" }[level] || "需教师把关";
}

function itemText(item) {
  return [
    item.name,
    item.title,
    item.category,
    item.platform,
    item.educationPosition,
    item.shortDescription,
    item.scenario,
    item.valueLevel,
    item.outputFormat,
    item.description,
    item.usageBoundary,
    ...(item.aliases || []),
    ...(item.tags || []),
    ...(item.scenarios || [])
  ]
    .join(" ")
    .toLowerCase();
}

function matchesSearch(item) {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return true;
  return itemText(item).includes(query);
}

function matchesToolCategory(tool) {
  if (activeToolCategory === "全部") return true;
  return [tool.category, tool.valueLevel, ...(tool.tags || []), ...(tool.scenarios || [])].join(" ").includes(activeToolCategory);
}

function matchesPromptCategory(prompt) {
  if (activePromptCategory === "全部") return true;
  return [prompt.category, prompt.platform, ...(prompt.tags || [])].join(" ").includes(activePromptCategory);
}

function visibleTools() {
  return tools.filter((tool) => {
    const pathMatch = activeQuickPath ? quickPaths[activeQuickPath].includes(tool.id) : true;
    return pathMatch && matchesToolCategory(tool) && matchesSearch(tool);
  });
}

function visiblePrompts() {
  return prompts.filter((prompt) => matchesPromptCategory(prompt) && matchesSearch(prompt));
}

function renderFilterButtons(container, categories, activeValue, attrName) {
  container.innerHTML = categories
    .map(
      (category) => `
        <button class="filter-button ${category === activeValue ? "active" : ""}" data-${attrName}="${escapeHtml(category)}">
          ${escapeHtml(category)}
        </button>
      `
    )
    .join("");
}

function renderFilters() {
  renderFilterButtons(toolFilters, toolCategories, activeToolCategory, "tool-category");
  renderFilterButtons(promptFilters, promptCategories, activePromptCategory, "prompt-category");
}

function renderTools() {
  const visible = visibleTools();
  toolCount.textContent = `当前显示 ${visible.length} 个工具`;

  if (!visible.length) {
    toolGrid.innerHTML = '<div class="empty-state">没有找到匹配工具，可以换一个关键词或选择“全部”。</div>';
    return;
  }

  toolGrid.innerHTML = visible
    .map((tool) => {
      const canOpen = tool.url && tool.status === "online";
      return `
        <article class="tool-card">
          <div class="card-top">
            <span class="category-pill">${escapeHtml(tool.category)}</span>
            <span class="status-pill status-${escapeHtml(tool.status)}">${escapeHtml(statusLabel(tool))}</span>
          </div>
          <span class="type-pill">${escapeHtml(typeLabel(tool.type))}</span>
          <h3>${escapeHtml(tool.name)}</h3>
          <p class="position">${escapeHtml(tool.educationPosition)}</p>
          <p>${escapeHtml(tool.shortDescription)}</p>
          <div class="mini-meta">
            <span>${escapeHtml(tool.platform)}</span>
            <span>${escapeHtml(privacyLabel(tool.privacyLevel))}</span>
          </div>
          <div class="tag-list">
            ${(tool.tags || []).slice(0, 4).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <div class="card-actions">
            <a class="tool-action primary ${canOpen ? "" : "disabled"}" ${canOpen ? `href="${escapeHtml(tool.url)}" target="_blank" rel="noreferrer"` : 'aria-disabled="true"'}>
              ${canOpen ? "打开工具" : statusLabel(tool)}
            </a>
            <button class="tool-action secondary" data-tool-detail="${escapeHtml(tool.id)}">查看详情</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPrompts() {
  const visible = visiblePrompts();
  promptCount.textContent = `当前显示 ${visible.length} 条提示词`;

  if (!visible.length) {
    promptGrid.innerHTML = '<div class="empty-state">没有找到匹配提示词，可以换一个关键词或选择“全部”。</div>';
    return;
  }

  promptGrid.innerHTML = visible
    .map(
      (prompt) => `
        <article class="prompt-card">
          <div class="card-top">
            <span class="category-pill">${escapeHtml(prompt.category)}</span>
            <span class="status-pill status-${escapeHtml(prompt.status || "draft")}">${escapeHtml(promptStatusLabel(prompt.status))}</span>
          </div>
          <h3>${escapeHtml(prompt.title)}</h3>
          <p>${escapeHtml(prompt.scenario)}</p>
          <div class="mini-meta">
            <span>${escapeHtml(prompt.platform)}</span>
          </div>
          <div class="tag-list">
            ${(prompt.tags || []).slice(0, 4).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <div class="card-actions">
            <button class="tool-action primary" data-copy-prompt="${escapeHtml(prompt.id)}">复制提示词</button>
            <button class="tool-action secondary" data-prompt-detail="${escapeHtml(prompt.id)}">查看详情</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderWorkflowPaths() {
  pathGrid.innerHTML = workflowPaths
    .map(
      (path) => `
        <button class="workflow-card" data-workflow="${escapeHtml(path.id)}">
          <span>我想完成</span>
          <strong>${escapeHtml(path.title)}</strong>
          <small>${path.steps.map(escapeHtml).join(" → ")}</small>
        </button>
      `
    )
    .join("");
}

function relatedPromptNames(ids = []) {
  return ids
    .map((id) => prompts.find((prompt) => prompt.id === id)?.title)
    .filter(Boolean)
    .join("、") || "暂无关联提示词";
}

function relatedToolNames(ids = []) {
  return ids
    .map((id) => tools.find((tool) => tool.id === id)?.name)
    .filter(Boolean)
    .join("、") || "暂无关联工具";
}

function renderLinkList(tool) {
  const links = [];
  if (tool.url) links.push(`<a class="inline-link" href="${escapeHtml(tool.url)}" target="_blank" rel="noreferrer">打开工具</a>`);
  if (tool.demoUrl) links.push(`<a class="inline-link" href="${escapeHtml(tool.demoUrl)}" target="_blank" rel="noreferrer">查看演示</a>`);
  if (tool.guideUrl) links.push(`<a class="inline-link" href="${escapeHtml(tool.guideUrl)}" target="_blank" rel="noreferrer">使用说明</a>`);
  const pending = (tool.pendingLinks || [])
    .map((item) => `<li>${escapeHtml(item.label || "待确认链接")}：${item.url ? `<span>${escapeHtml(item.url)}</span>` : "待补"}</li>`)
    .join("");
  const notice = statusNotice(tool);
  if (!links.length && !pending && !notice && !tool.displayNote && !tool.usageBoundary) return "";
  return `
    <div class="detail-item full link-note">
      <strong>链接与说明</strong>
      ${links.length ? `<div class="link-row">${links.join("")}</div>` : ""}
      ${notice ? `<p>${escapeHtml(notice)}</p>` : ""}
      ${tool.displayNote ? `<p>${escapeHtml(tool.displayNote)}</p>` : ""}
      ${tool.usageBoundary ? `<p>${escapeHtml(tool.usageBoundary)}</p>` : ""}
      ${pending ? `<p>待确认链接</p><ul>${pending}</ul>` : ""}
    </div>
  `;
}

function renderToolDialog(tool) {
  dialogContent.innerHTML = `
    <p class="eyebrow">${escapeHtml(tool.source)} · ${escapeHtml(statusLabel(tool))}</p>
    <h2 id="dialog-title">${escapeHtml(tool.name)}</h2>
    <p>${escapeHtml(tool.educationPosition)}</p>
    <div class="dialog-meta">
      <span class="category-pill">${escapeHtml(tool.category)}</span>
      <span class="tag">${escapeHtml(tool.valueLevel)}</span>
      <span class="tag">${escapeHtml(typeLabel(tool.type))}</span>
      <span class="tag">${escapeHtml(tool.platform)}</span>
      <span class="tag">${escapeHtml(privacyLabel(tool.privacyLevel))}</span>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><strong>真实痛点</strong><p>${escapeHtml(tool.painPoint)}</p></div>
      <div class="detail-item"><strong>教师怎么用</strong><p>${escapeHtml(tool.howToUse)}</p></div>
      <div class="detail-item"><strong>学生可能获得什么</strong><p>${escapeHtml(tool.studentBenefit)}</p></div>
      <div class="detail-item"><strong>教师获得什么</strong><p>${escapeHtml(tool.teacherBenefit)}</p></div>
      <div class="detail-item"><strong>适用场景</strong><p>${escapeHtml((tool.scenarios || []).join("、"))}</p></div>
      <div class="detail-item"><strong>关联提示词</strong><p>${escapeHtml(relatedPromptNames(tool.recommendedPrompts))}</p></div>
      ${renderLinkList(tool)}
      <div class="detail-item full"><strong>隐私与边界</strong><p>${escapeHtml(tool.privacyNote)}</p></div>
    </div>
  `;
  dialog.showModal();
}

function renderPromptDialog(prompt) {
  dialogContent.innerHTML = `
    <p class="eyebrow">${escapeHtml(prompt.category)} · ${escapeHtml(prompt.platform)} · ${escapeHtml(promptStatusLabel(prompt.status))}</p>
    <h2 id="dialog-title">${escapeHtml(prompt.title)}</h2>
    <p>${escapeHtml(prompt.scenario)}</p>
    <div class="dialog-meta">
      ${(prompt.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
    </div>
    <div class="detail-grid">
      <div class="detail-item"><strong>使用前准备</strong><p>${escapeHtml(prompt.inputNeeded)}</p></div>
      <div class="detail-item"><strong>期望输出</strong><p>${escapeHtml(prompt.outputFormat)}</p></div>
      <div class="detail-item"><strong>关联工具</strong><p>${escapeHtml(relatedToolNames(prompt.relatedTools))}</p></div>
      <div class="detail-item"><strong>使用提醒</strong><p>${escapeHtml(prompt.caution)}</p></div>
      <div class="detail-item full"><strong>完整提示词</strong><pre>${escapeHtml(prompt.prompt)}</pre></div>
    </div>
    <div class="dialog-actions">
      <button class="tool-action primary" data-copy-prompt="${escapeHtml(prompt.id)}">复制提示词</button>
    </div>
  `;
  dialog.showModal();
}

function renderWorkflowDialog(path) {
  const recommendedTools = path.toolIds.map((id) => tools.find((tool) => tool.id === id)).filter(Boolean);
  const recommendedPrompts = path.promptIds.map((id) => prompts.find((prompt) => prompt.id === id)).filter(Boolean);
  dialogContent.innerHTML = `
    <p class="eyebrow">教学场景路径</p>
    <h2 id="dialog-title">${escapeHtml(path.title)}</h2>
    <div class="workflow-steps">
      ${path.steps.map((step) => `<span>${escapeHtml(step)}</span>`).join("")}
    </div>
    <div class="recommend-layout">
      <div class="recommend-block">
        <h3>推荐工具</h3>
        ${recommendedTools.map((tool) => `<button class="recommend-row" data-tool-detail="${escapeHtml(tool.id)}"><strong>${escapeHtml(tool.name)}</strong><span>${escapeHtml(statusLabel(tool))}</span></button>`).join("")}
      </div>
      <div class="recommend-block">
        <h3>推荐提示词</h3>
        ${recommendedPrompts.map((prompt) => `<button class="recommend-row" data-prompt-detail="${escapeHtml(prompt.id)}"><strong>${escapeHtml(prompt.title)}</strong><span>${escapeHtml(prompt.platform)}</span></button>`).join("")}
      </div>
    </div>
  `;
  dialog.showModal();
}

async function copyPrompt(promptId) {
  const prompt = prompts.find((item) => item.id === promptId);
  if (!prompt) return;
  try {
    await navigator.clipboard.writeText(prompt.prompt);
    showToast("已复制");
  } catch {
    showManualCopy(prompt);
  }
}

function showManualCopy(prompt) {
  let area = dialogContent.querySelector("#manual-copy-area");
  if (!area) {
    const wrapper = document.createElement("div");
    wrapper.className = "manual-copy detail-item full";
    wrapper.innerHTML = `
      <strong>手动复制</strong>
      <p>当前浏览器不支持一键复制，请手动复制下方内容。</p>
      <textarea id="manual-copy-area" readonly></textarea>
    `;
    const actions = dialogContent.querySelector(".dialog-actions");
    if (actions) {
      actions.before(wrapper);
    } else {
      dialogContent.appendChild(wrapper);
    }
    area = wrapper.querySelector("#manual-copy-area");
  }
  area.value = prompt.prompt;
  area.focus();
  area.select();
  showToast("请手动复制");
}

function showToast(message) {
  clearTimeout(copyTimer);
  toast.textContent = message;
  toast.classList.add("show");
  copyTimer = setTimeout(() => toast.classList.remove("show"), 1400);
}

function renderAll() {
  renderFilters();
  renderTools();
  renderPrompts();
}

function wireEvents() {
  toolFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tool-category]");
    if (!button) return;
    activeToolCategory = button.dataset.toolCategory;
    activeQuickPath = null;
    renderFilters();
    renderTools();
  });

  promptFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-prompt-category]");
    if (!button) return;
    activePromptCategory = button.dataset.promptCategory;
    renderFilters();
    renderPrompts();
  });

  searchInput.addEventListener("input", () => {
    activeQuickPath = null;
    renderTools();
    renderPrompts();
  });

  document.querySelectorAll("[data-path]").forEach((button) => {
    button.addEventListener("click", () => {
      activeQuickPath = button.dataset.path;
      activeToolCategory = "全部";
      searchInput.value = "";
      renderFilters();
      renderTools();
      document.querySelector("#tools").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  pathGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-workflow]");
    if (!button) return;
    const path = workflowPaths.find((item) => item.id === button.dataset.workflow);
    if (path) renderWorkflowDialog(path);
  });

  document.addEventListener("click", (event) => {
    const toolButton = event.target.closest("[data-tool-detail]");
    if (toolButton) {
      const tool = tools.find((item) => item.id === toolButton.dataset.toolDetail);
      if (tool) renderToolDialog(tool);
      return;
    }

    const promptButton = event.target.closest("[data-prompt-detail]");
    if (promptButton) {
      const prompt = prompts.find((item) => item.id === promptButton.dataset.promptDetail);
      if (prompt) renderPromptDialog(prompt);
      return;
    }

    const copyButton = event.target.closest("[data-copy-prompt]");
    if (copyButton) {
      copyPrompt(copyButton.dataset.copyPrompt).catch(() => showToast("复制失败"));
    }
  });

  dialogClose.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

async function init() {
  const [toolResponse, promptResponse] = await Promise.all([fetch("tools.json"), fetch("prompts.json")]);
  tools = await toolResponse.json();
  prompts = await promptResponse.json();
  renderWorkflowPaths();
  renderAll();
  wireEvents();
}

init().catch(() => {
  toolGrid.innerHTML = '<div class="empty-state">数据加载失败，请通过本地服务器或 GitHub Pages 打开页面。</div>';
});
