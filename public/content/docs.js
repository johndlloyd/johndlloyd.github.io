export const DOCS = {
  readme: {
    command: "cat README.md",
    markdown: `
# John D. Lloyd

This is my home base on the internet.  
I tinker a lot, so parts of this site may be outdated, broken, or mid-experiment.
`,
  },
  about: {
    command: "cat about/PROFILE.md",
    markdown: `
# PROFILE.md
I am a Product Manager who loves technology and building useful products.

## Career Summary
I have spent my career working across strategy, discovery, delivery, and post-launch iteration. Most of my work has been in regulated industries, where trust and reliability matter as much as speed.

I enjoy working with cross-functional teams to move from rough ideas to clear decisions and shipped outcomes. I care most about work that is useful, measurable, and durable.


`,
  },
  work: {
    command: "cat work/EXPERIENCE.md",
    markdown: `
# EXPERIENCE.md
##Professional Experience
**Clover (Fiserv)** | Fintech, Payments | Owns the product roadmap for gift card and prepaid platform. 
**Shake Shack** | POS, Payments | Built payment platform infrastructure powering kiosk, POS, and mobile ordering across 500+ locations with multi-processor integrations.
**Scholastic** | EdTech, Payments | Owned POS and payment platform deployed at 100K+ annual retail pop-up events, integrating loyalty, eGift, and eWallet capabilities.
**Amplify (acquired by News Corp)** | EdTech | Built Android mobile applications on custom hardware for K-12 students and educators.
**Work Market (acquired by ADP)** | Two-sided marketplace, Enterprise SaaS | Built and maintained test automation frameworks for web and mobile applications, managing CI/CD deployments for an enterprise SaaS platform.
**Columbia University** | Higher Education, EdTech | Led a 15-person technical team supporting 2,500+ users in academic computing and research.
**Lowe's Companies** | LMS, WMS, Supply Chain | Drove process improvements in distribution operations as an Industrial Engineer, including engineered standards and facility operations.
**GE** | Industrial Automation | Designed and supported industrial instrumentation and control systems within GE's Automation & Controls group.

##Education
**Virginia Tech** | Industrial and Systems Engineering
`,
  },
  projects: {
    command: "cat projects/INDEX.md",
    markdown: `
# INDEX.md

## Current Focus
Building practical products and sharing the process, especially where open source can make everyday tools more accessible.

## Current Projects
- [ReloRides](https://relorides.com): Peer-to-peer vehicle relocation made simple.
- **iCompris (macOS Edition)**: A modern macOS-focused fork of [GCompris](https://www.gcompris.net/), built for Apple Silicon and current Qt6 workflows.

## Why iCompris
I was inspired by [@meimakes](https://x.com/meimakes). After trying a few of their creations, I went looking for a project where I could contribute meaningful value and learn by shipping.

I found GCompris, which is an incredible educational suite. My family is all-in on Mac, and I noticed the macOS release path had not been updated in a while, so I decided to focus on bringing that experience forward.

## What I shipped
- Reproducible macOS arm64 build + DMG workflow
- Packaging/signing fixes to avoid modern macOS launch failures
- Updated documentation so others can repeat the release process

Project repo: [github.com/johndlloyd/icompris](https://github.com/johndlloyd/icompris)
`,
  },
  contact: {
    command: "cat contact/CONNECT.md",
    markdown: `
# CONNECT.md
- X: [@johndlloyd](https://x.com/johndlloyd)
- LinkedIn: [linkedin.com/in/johndlloyd](https://www.linkedin.com/in/johndlloyd)
`,
  },
};
