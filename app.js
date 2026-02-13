import { DOCS } from "./public/content/docs.js";

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
  }, 28);
}

function setActiveDoc(docKey) {
  const doc = DOCS[docKey];
  if (!doc || !docContent) return;
  docContent.innerHTML = markdownToHtml(doc.markdown);
  typeCommand(doc.command);
  treeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.doc === docKey);
  });
}

treeButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveDoc(button.dataset.doc));
});

setActiveDoc("readme");
