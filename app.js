import { DOCS } from "./public/content/docs.js";
import { PROJECTS } from "./public/content/projects.js";
import { ARTICLES } from "./public/content/articles.js";

const year = document.getElementById("year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const clock = document.getElementById("runtimeClock");
if (clock) {
  const tick = () => {
    clock.textContent = new Date().toLocaleTimeString([], { hour12: false });
  };
  tick();
  window.setInterval(tick, 1000);
}

const treeButtons = Array.from(document.querySelectorAll(".tree-item"));
const docContent = document.getElementById("docContent");
const typedCommand = document.getElementById("typedCommand");
let activeDocKey = "readme";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToHtml(markdown) {
  const lines = markdown.trim().split("\n");
  let html = "";
  let inList = false;
  let inOrderedList = false;
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html += "</code></pre>";
        inCodeBlock = false;
      } else {
        html += "<pre><code>";
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      html += `${escapeHtml(line)}\n`;
      continue;
    }

    if (!line.trim()) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      if (inOrderedList) {
        html += "</ol>";
        inOrderedList = false;
      }
      continue;
    }

    if (line.startsWith("# ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      if (inOrderedList) {
        html += "</ol>";
        inOrderedList = false;
      }
      html += `<h1>${inlineFormat(line.slice(2))}</h1>`;
      continue;
    }

    if (line.startsWith("## ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      if (inOrderedList) {
        html += "</ol>";
        inOrderedList = false;
      }
      html += `<h2>${inlineFormat(line.slice(3))}</h2>`;
      continue;
    }

    if (line.startsWith("- ")) {
      if (inOrderedList) {
        html += "</ol>";
        inOrderedList = false;
      }
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${inlineFormat(line.slice(2))}</li>`;
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      if (!inOrderedList) {
        html += "<ol>";
        inOrderedList = true;
      }
      html += `<li>${inlineFormat(orderedMatch[1])}</li>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }
    if (inOrderedList) {
      html += "</ol>";
      inOrderedList = false;
    }
    html += `<p>${inlineFormat(line)}</p>`;
  }

  if (inList) {
    html += "</ul>";
  }
  if (inOrderedList) {
    html += "</ol>";
  }
  if (inCodeBlock) {
    html += "</code></pre>";
  }

  return html;
}

function inlineFormat(text) {
  const withEscapes = escapeHtml(text);
  return withEscapes
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function typeCommand(command) {
  if (!typedCommand) return;
  if (typeCommand.timer) {
    window.clearInterval(typeCommand.timer);
  }
  typedCommand.textContent = "";
  let index = 0;
  typeCommand.timer = window.setInterval(() => {
    typedCommand.textContent = command.slice(0, index + 1);
    index += 1;
    if (index >= command.length) {
      window.clearInterval(typeCommand.timer);
    }
  }, 24);
}

function setActiveNav(docKey) {
  treeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.doc === docKey);
  });
}

function setHash(hash) {
  history.replaceState(null, "", `#${hash}`);
}

function renderDocMarkdown(docKey) {
  const doc = DOCS[docKey];
  if (!doc || !docContent) return;
  docContent.innerHTML = markdownToHtml(doc.markdown);
  typeCommand(doc.command);
}

function renderProjectsIndex() {
  setHash("projects");
  const doc = DOCS.projects;
  if (!doc || !docContent) return;
  const cards = PROJECTS.map(
    (project) => `
      <article class="content-card">
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.summary)}</p>
        <p><small>${escapeHtml(project.status)} • ${escapeHtml(project.tags.join(", "))}</small></p>
        <button class="content-link" data-project-id="${escapeHtml(project.id)}">View Project</button>
      </article>
    `
  ).join("");

  docContent.innerHTML = `${markdownToHtml(doc.markdown)}<div class="content-grid">${cards}</div>`;
  typeCommand(doc.command);
}

function renderProjectDetail(projectId) {
  const project = PROJECTS.find((item) => item.id === projectId);
  if (!project || !docContent) return;

  const iconHtml = project.icon
    ? `<img src="${escapeHtml(project.icon)}" alt="${escapeHtml(project.title)} icon" class="project-icon" />`
    : "";

  const screenshotHtml = project.screenshot
    ? `<img src="${escapeHtml(project.screenshot)}" alt="${escapeHtml(project.title)} screenshot" class="project-screenshot" />`
    : "";

  const actionHtml = project.downloadLink
    ? `<a href="${escapeHtml(project.downloadLink)}" class="content-link" download>Download</a>`
    : project.link
    ? `<a href="${escapeHtml(project.link)}" target="_blank" rel="noreferrer" class="content-link">Visit project</a>`
    : "";

  docContent.innerHTML = `
    <div class="markdown-body-inner">
      <button class="content-link secondary" data-action="back-projects">← Back to projects</button>
      <div class="project-header">
        ${iconHtml}
        <div>
          <h1>${escapeHtml(project.title)}</h1>
          <p><strong>Status:</strong> ${escapeHtml(project.status)} &nbsp;·&nbsp; <strong>Tags:</strong> ${escapeHtml(project.tags.join(", "))}</p>
        </div>
      </div>
      ${markdownToHtml(project.detail)}
      ${screenshotHtml}
      <p>${actionHtml}</p>
    </div>
  `;
  setHash(`projects/${project.id}`);
  typeCommand(`cat projects/${project.id}.md`);
}

function renderArticlesIndex() {
  setHash("articles");
  const doc = DOCS.articles;
  if (!doc || !docContent) return;
  const cards = ARTICLES.map(
    (article) => `
      <article class="content-card">
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.summary)}</p>
        <p><small>${escapeHtml(article.published)}</small></p>
        <button class="content-link" data-article-id="${escapeHtml(article.id)}">Read Article</button>
      </article>
    `
  ).join("");

  docContent.innerHTML = `${markdownToHtml(doc.markdown)}<div class="content-grid">${cards}</div>`;
  typeCommand(doc.command);
}

function renderArticleDetail(articleId) {
  const article = ARTICLES.find((item) => item.id === articleId);
  if (!article || !docContent) return;
  docContent.innerHTML = `
    <div class="markdown-body-inner">
      <button class="content-link secondary" data-action="back-articles">← Back to articles</button>
      ${markdownToHtml(article.markdown)}
      <p><small>Published: ${escapeHtml(article.published)}</small></p>
    </div>
  `;
  setHash(`articles/${article.id}`);
  typeCommand(`cat articles/${article.id}.md`);
}

function setActiveDoc(docKey) {
  activeDocKey = docKey;
  setActiveNav(docKey);
  if (docKey === "projects") {
    renderProjectsIndex();
    return;
  }
  if (docKey === "articles") {
    renderArticlesIndex();
    return;
  }
  setHash(docKey);
  renderDocMarkdown(docKey);
}

treeButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveDoc(button.dataset.doc));
});

if (docContent) {
  docContent.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const projectId = target.dataset.projectId;
    if (projectId) {
      renderProjectDetail(projectId);
      return;
    }

    const articleId = target.dataset.articleId;
    if (articleId) {
      renderArticleDetail(articleId);
      return;
    }

    const action = target.dataset.action;
    if (action === "back-projects" && activeDocKey === "projects") {
      renderProjectsIndex();
    }
    if (action === "back-articles" && activeDocKey === "articles") {
      renderArticlesIndex();
    }
  });
}

function routeFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    setActiveDoc("readme");
    return;
  }
  const [section, id] = hash.split("/");
  if (section === "projects" && id) {
    activeDocKey = "projects";
    setActiveNav("projects");
    renderProjectDetail(id);
  } else if (section === "articles" && id) {
    activeDocKey = "articles";
    setActiveNav("articles");
    renderArticleDetail(id);
  } else if (DOCS[section]) {
    setActiveDoc(section);
  } else {
    setActiveDoc("readme");
  }
}

window.addEventListener("hashchange", routeFromHash);
routeFromHash();
