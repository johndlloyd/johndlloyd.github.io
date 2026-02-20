import { DOCS } from "./content/docs.js";
import { PROJECTS } from "./content/projects.js";
import { ARTICLES } from "./content/articles.js";

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

function renderDocMarkdown(docKey) {
  const doc = DOCS[docKey];
  if (!doc || !docContent) return;
  docContent.innerHTML = markdownToHtml(doc.markdown);
  typeCommand(doc.command);
}

function renderProjectsIndex() {
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
  const link = project.link
    ? `<p><a href="${escapeHtml(project.link)}" target="_blank" rel="noreferrer">Visit project</a></p>`
    : "";
  docContent.innerHTML = `
    <div class="markdown-body-inner">
      <button class="content-link secondary" data-action="back-projects">← Back to projects</button>
      <h1>${escapeHtml(project.title)}</h1>
      <p><strong>Status:</strong> ${escapeHtml(project.status)}</p>
      <p><strong>Tags:</strong> ${escapeHtml(project.tags.join(", "))}</p>
      <p>${escapeHtml(project.detail)}</p>
      ${link}
    </div>
  `;
  typeCommand(`cat projects/${project.id}.md`);
}

function renderArticlesIndex() {
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

setActiveDoc("readme");
