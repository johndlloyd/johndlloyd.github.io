export const PROJECTS = [
  {
    id: "clearance",
    title: "Clearance",
    status: "Live",
    tags: ["macOS", "Networking", "Swift"],
    summary: "A native macOS menu bar app for monitoring and managing your NextDNS activity.",
    detail:
      "Clearance is a lightweight macOS menu bar client for NextDNS — the DNS-based content filter I use to protect my home network. I wanted a way to see what was being blocked in real time and allowlist domains without opening a browser tab every time.\n\n**What it does:**\n\n- Shows the last 15 blocked domains in a floating monitoring window\n- One-click allow: adds a domain to your NextDNS allowlist instantly\n- Live mode: toggles between 30-second and 5-second refresh intervals\n- Tag/follow specific domains with a red border that persists across refreshes\n- Flush DNS cache with a single click (prompts for admin password)\n- Detects whether NextDNS is active on your network via scutil\n\nBuilt entirely in SwiftUI with no third-party dependencies. Uses `MenuBarExtra` with a `.menu` style scene plus a standalone floating `Window` scene.\n\n**First launch:** macOS may show an \"unidentified developer\" warning since the app is unsigned. Right-click the app and choose Open to bypass it, or run `xattr -dr com.apple.quarantine /Applications/Clearance.app` in Terminal.",
    icon: "/images/clearance-icon.png",
    screenshot: "/images/clearance-screenshot.png",
    downloadLink: "https://johndlloyd.com/downloads/Clearance.dmg",
  },
  {
    id: "relorides",
    title: "ReloRides",
    status: "In Development",
    tags: ["Marketplace", "Mobility", "Operations"],
    summary: "Peer-to-peer vehicle relocation made simple.",
    detail:
      "ReloRides is focused on connecting people who need vehicles moved with people who can move them. The project explores marketplace mechanics, trust and safety controls, pricing clarity, and streamlined operations.",
    link: "https://relorides.com",
  },
  {
    id: "icompris",
    title: "iCompris",
    status: "Live",
    tags: ["EdTech", "Children"],
    summary: "A modern macOS-focused fork of GCompris, built for Apple Silicon and current Qt6 workflows.",
    detail:
      "I was inspired by @meimakes. After trying a few of their creations, I went looking for a project where I could contribute meaningful value and learn by shipping.\n\nI found GCompris, which is an incredible educational suite. My family is all-in on Mac, and I noticed the macOS release path had not been updated in a while, so I decided to focus on bringing that experience forward.\n\nWhat I shipped:\n- Reproducible macOS arm64 build + DMG workflow\n- Packaging/signing fixes to avoid modern macOS launch failures\n- Updated documentation so others can repeat the release process\n\nProject repo: github.com/johndlloyd/icompris",
    link: "https://github.com/johndlloyd/icompris",
  },
  {
    id: "monitor-the-skituation",
    title: "Monitor The Ski-tuation",
    status: "Live",
    tags: ["AI", "Monitoring", "Web App"],
    summary: "A fun app for monitoring traffic cams and ski conditions across Montana.",
    detail:
      "Monitor The Ski-tuation is a focused dashboard for keeping tabs on Montana's mountains and roads. Whether you're planning a powder day or checking the pass before a drive, it pulls together live traffic cam feeds and current ski conditions into one place so you're not bouncing between a dozen different sites.",
    link: "https://monitor-the-situation.vercel.app",
  },
];
