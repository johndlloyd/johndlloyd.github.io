const DOCS = {
  readme: {
    command: "cat README.md",
    markdown: `
# John D. Lloyd
I build product and technology experiences, mostly in fintech.

## About This Site
This is home base for my digital presence. It is intentionally simple and not super active.

## Current Focus
- I love technology and practical systems that make work better.
- I spend most of my time turning ambiguous problems into useful shipped products.
- I care about clear thinking, good execution, and steady progress.
`,
  },
  about: {
    command: "cat about/PROFILE.md",
    markdown: `
# PROFILE.md
I am a Senior Product Manager who loves technology and building useful products.

## Career Summary
I have spent my career working across strategy, discovery, delivery, and post-launch iteration. Most of my work has been in fintech, where trust and reliability matter as much as speed.

I enjoy working with cross-functional teams to move from rough ideas to clear decisions and shipped outcomes. I care most about work that is useful, measurable, and durable.

## How I Work
- Start with the user problem, then connect it to business goals.
- Keep scope practical and execution focused.
- Make decisions explicit so teams can move with confidence.
- Stay close to the work after launch and improve what matters.

## Notes
This site is a small personal corner of the internet. It is more of a stable home than a daily feed.

## Outside Work
Cycling, photography, BBQ, and finding very good pizza.
`,
  },
  work: {
    command: "cat work/EXPERIENCE.md",
    markdown: `
# EXPERIENCE.md
## Senior Product Manager | FinTech
- Built and led roadmap work across discovery, delivery, and iteration.
- Partnered with engineering, design, compliance, and operations.
- Focused on practical outcomes like customer value, reliability, and growth.

## Areas I Enjoy Most
- Product strategy with clear priorities.
- Discovery grounded in customer and operational reality.
- Shipping, learning, and improving in tight loops.
`,
  },
  projects: {
    command: "cat projects/INDEX.md",
    markdown: `
# INDEX.md
## Ongoing Work
- **Book It:** one book per month plus one small technical artifact.
- **Automation Workflows:** lightweight scripts and recurring checks.
- **Personal Systems:** tools that reduce friction and improve decision quality.
- **Site Experiments:** iterative web and content work with fast feedback loops.

\`\`\`txt
skills/
├── about/
├── work/
└── projects/
\`\`\`
`,
  },
  contact: {
    command: "cat contact/CONNECT.md",
    markdown: `
# CONNECT.md
- X: [@johndlloyd](https://x.com/johndlloyd)
- LinkedIn: [linkedin.com/in/johndlloyd](https://www.linkedin.com/in/johndlloyd)

## Consulting
I am available for consulting services. I like helping businesses with payment integrations and PSP decisions.

## Reach Out
Please reach out via LinkedIn.
`,
  },
};

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
