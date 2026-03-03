import { PROJECTS } from "./content/projects.js";

const year = document.getElementById("year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const projectList = document.getElementById("projectList");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderProjects() {
  if (!projectList) return;

  const items = PROJECTS.map((project) => {
    const link = project.link && /^https?:\/\//.test(project.link) ? project.link : "";
    const projectId = `project-${normalizeId(project.id)}`;
    const title = escapeHtml(project.title);
    const summary = escapeHtml(project.summary || "");
    const status = escapeHtml(project.status || "");
    const tags = Array.isArray(project.tags) ? project.tags.map(escapeHtml).join(" • ") : "";
    const meta = [status, tags].filter(Boolean).join(" • ");

    const heading = link
      ? `<a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${title}</a>`
      : title;

    const openLink = link
      ? `<p class="project-open"><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Open project</a></p>`
      : "";

    return `
      <article class="project-item" id="${projectId}">
        <h3>${heading}</h3>
        ${meta ? `<p class="project-meta">${meta}</p>` : ""}
        ${summary ? `<p>${summary}</p>` : ""}
        ${openLink}
      </article>
    `;
  }).join("");

  projectList.innerHTML = items;
}

function focusFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (!raw) return;

  if (raw === "projects" || raw === "about" || raw === "experience" || raw === "top") {
    document.getElementById(raw)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (raw.startsWith("projects/")) {
    const slug = normalizeId(raw.split("/")[1] || "");
    const target = document.getElementById(`project-${slug}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.classList.add("targeted");
    window.setTimeout(() => target.classList.remove("targeted"), 1400);
  }
}

renderProjects();
focusFromHash();
window.addEventListener("hashchange", focusFromHash);
