const DOCS = {
  readme: {
    command: "cat README.md",
    markdown: `
# John D. Lloyd
Senior Product Manager delivering measurable fintech outcomes.

## Hiring Snapshot
- Product leader with end-to-end ownership from strategy through launch.
- Strong in regulated environments where trust, risk, and speed must coexist.
- Known for clear prioritization, stakeholder alignment, and execution discipline.

## Current Focus
Leading customer-first financial product initiatives that improve growth and reliability.
`,
  },
  about: {
    command: "cat about/PROFILE.md",
    markdown: `
# PROFILE.md
I lead with structured thinking, direct communication, and accountability for outcomes.

## How I Work
- Start with customer pain and business context.
- Define success metrics before implementation.
- Partner tightly with engineering, design, compliance, and operations.
- Ship in increments, measure results, and iterate quickly.

## Outside Work
Cycling, photography, BBQ, and finding very good pizza.
`,
  },
  work: {
    command: "cat work/EXPERIENCE.md",
    markdown: `
# EXPERIENCE.md
## Senior Product Manager | FinTech
- Led roadmap programs tied to conversion, retention, and risk outcomes.
- Partnered with compliance and operations to deliver safely at speed.
- Drove alignment across senior stakeholders through clear tradeoffs and decision framing.

## Strengths
- Product strategy grounded in measurable business outcomes.
- Discovery that blends customer insight, analytics, and operational feedback.
- Consistent execution from concept, to launch, to post-launch optimization.
`,
  },
  projects: {
    command: "cat projects/INDEX.md",
    markdown: `
# INDEX.md
## Recruiter-Relevant Work
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
- LinkedIn: [linkedin.com/in/johndlloyd](https://www.linkedin.com/in/johndlloyd)

## Open To
Senior product roles where customer impact, business metrics, and execution quality all matter.
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
