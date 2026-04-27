"use strict";
/**
 * Silver Oak Vision — PPTX Generator
 * Single source of truth: ../vision.yml
 * Output: ../dist/SilverOakOS_Vision.pptx
 *
 * Usage: node generators/build_pptx.js
 */

const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

// Load vision YAML
const V = yaml.load(fs.readFileSync(path.join(__dirname, "../vision.yml"), "utf8"));

// Palette aliases
const P = {
  navy:      V.theme.palette.navy,
  navyDark:  V.theme.palette.navy_dark,
  navyLight: V.theme.palette.navy_light,
  stone:     V.theme.palette.stone,
  gold:      V.theme.palette.gold,
  goldBr:    V.theme.palette.gold_bright,
  ice:       V.theme.palette.ice,
  mist:      V.theme.palette.mist,
  cream:     V.theme.palette.cream,
  white:     V.theme.palette.white,
};

const FONT_HEAD = V.theme.fonts.head;
const FONT_BODY = V.theme.fonts.body;

// Helpers
const hex = (c) => c; // pptxgenjs uses hex without #

function slide_bg(slide, color) {
  slide.background = { color: hex(color) };
}

function gold_line(slide, y = 0.55, x = 0.4, w = 9.2) {
  slide.addShape("rect", { x, y, w, h: 0.02, fill: { color: P.gold }, line: { type: "none" } });
}

function label_text(slide, text, x, y, w = 4) {
  slide.addText(text, {
    x, y, w, h: 0.25,
    fontSize: 7,
    bold: true,
    color: P.gold,
    fontFace: FONT_BODY,
    charSpacing: 3,
  });
}

function section_title(slide, text, x = 0.4, y = 0.7, w = 9.2, size = 28) {
  slide.addText(text, {
    x, y, w, h: 0.7,
    fontSize: size,
    bold: true,
    color: P.white,
    fontFace: FONT_HEAD,
  });
}

function body_text(slide, text, x, y, w, h, opts = {}) {
  slide.addText(text, {
    x, y, w, h,
    fontSize: opts.size || 11,
    color: opts.color || P.ice,
    fontFace: FONT_BODY,
    wrap: true,
    valign: "top",
    ...opts,
  });
}

// ─────────────────────────────────────────
// Init presentation
// ─────────────────────────────────────────
const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches
pptx.author = V.founder.name;
pptx.company = V.company.legal;
pptx.subject = `${V.company.name} — ${V.company.tagline}`;
pptx.title = `${V.company.name} Vision ${V.company.year}`;

// ─────────────────────────────────────────
// SLIDE 1 — HERO
// ─────────────────────────────────────────
{
  const s = pptx.addSlide();
  slide_bg(s, P.navyDark);

  // Gold accent top
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });

  // Label
  s.addText(V.hero.label, {
    x: 0.5, y: 0.4, w: 12, h: 0.3,
    fontSize: 9,
    bold: true,
    color: P.gold,
    fontFace: FONT_BODY,
    charSpacing: 4,
    align: "center",
  });

  // Main title
  s.addText(V.hero.title, {
    x: 0.5, y: 1.0, w: 12, h: 1.4,
    fontSize: 64,
    bold: true,
    color: P.white,
    fontFace: FONT_HEAD,
    align: "center",
  });

  // Gold underline
  s.addShape("rect", { x: 4.5, y: 2.35, w: 4.3, h: 0.04, fill: { color: P.gold }, line: { type: "none" } });

  // Subtitle lines
  s.addText(V.hero.subtitle_main, {
    x: 0.5, y: 2.6, w: 12, h: 0.4,
    fontSize: 16,
    color: P.mist,
    fontFace: FONT_BODY,
    align: "center",
  });
  s.addText(V.hero.subtitle_highlight, {
    x: 0.5, y: 3.0, w: 12, h: 0.45,
    fontSize: 20,
    bold: true,
    color: P.goldBr,
    fontFace: FONT_HEAD,
    align: "center",
  });
  s.addText(V.hero.subtitle_end, {
    x: 0.5, y: 3.45, w: 12, h: 0.5,
    fontSize: 12,
    color: P.ice,
    fontFace: FONT_BODY,
    align: "center",
    wrap: true,
  });

  // Badge box
  s.addShape("rect", { x: 5.5, y: 4.3, w: 2.33, h: 1.4, fill: { color: P.gold }, line: { type: "none" } });
  s.addText(V.hero.badge_value, {
    x: 5.5, y: 4.4, w: 2.33, h: 0.7,
    fontSize: 42,
    bold: true,
    color: P.navyDark,
    fontFace: FONT_HEAD,
    align: "center",
  });
  s.addText(V.hero.badge_label, {
    x: 5.5, y: 5.1, w: 2.33, h: 0.35,
    fontSize: 11,
    bold: true,
    color: P.navyDark,
    fontFace: FONT_BODY,
    align: "center",
    charSpacing: 2,
  });
  s.addText(V.hero.badge_caption, {
    x: 0.5, y: 5.8, w: 12, h: 0.4,
    fontSize: 9,
    color: P.mist,
    fontFace: FONT_BODY,
    align: "center",
    italic: true,
  });

  // Bottom gold line
  s.addShape("rect", { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });
}

// ─────────────────────────────────────────
// SLIDE 2 — FOUNDER / STORY
// ─────────────────────────────────────────
{
  const s = pptx.addSlide();
  slide_bg(s, P.navy);
  gold_line(s, 0.08, 0, 13.33);

  label_text(s, "THE STORY", 0.4, 0.35);
  section_title(s, "One founder. One laptop.\nOne impossible bet.", 0.4, 0.7, 8, 30);

  const story = [
    `${V.founder.name} is not a developer.`,
    "",
    `He is a solo founder based in Marbella who decided, in early 2026,\nto build a ${V.vision.exit_value_m_euros}M€+ AI company — with ${V.workers.count} autonomous agents and zero co-founders.`,
    "",
    `The product is Claudette. A voice-first multi-agent SaaS.\nThe factory is Silver Oak OS. His personal AI executive team.`,
    "",
    `No VC. No employees. No compromise on sovereignty.`,
    "",
    `Just one founder, one server in Nuremberg, and a bet on\nEuropean AI done right.`,
  ];

  s.addText(story.join("\n"), {
    x: 0.4, y: 2.1, w: 8.5, h: 4.5,
    fontSize: 13,
    color: P.ice,
    fontFace: FONT_BODY,
    lineSpacingMultiple: 1.5,
    wrap: true,
    valign: "top",
  });

  // Right: founder card
  s.addShape("rect", { x: 9.6, y: 1.6, w: 3.2, h: 4.5, fill: { color: P.navyDark }, line: { color: P.gold, pt: 1 } });
  s.addText(V.founder.name, {
    x: 9.6, y: 2.8, w: 3.2, h: 0.5,
    fontSize: 16,
    bold: true,
    color: P.white,
    fontFace: FONT_HEAD,
    align: "center",
  });
  s.addText(V.founder.role, {
    x: 9.6, y: 3.35, w: 3.2, h: 0.3,
    fontSize: 10,
    color: P.gold,
    fontFace: FONT_BODY,
    align: "center",
    charSpacing: 1,
  });
  s.addText(V.company.legal, {
    x: 9.6, y: 3.65, w: 3.2, h: 0.3,
    fontSize: 9,
    color: P.mist,
    fontFace: FONT_BODY,
    align: "center",
  });
  s.addShape("rect", { x: 10.8, y: 4.2, w: 0.7, h: 0.04, fill: { color: P.gold }, line: { type: "none" } });
  s.addText(V.company.location, {
    x: 9.6, y: 4.4, w: 3.2, h: 0.3,
    fontSize: 9,
    color: P.mist,
    fontFace: FONT_BODY,
    align: "center",
    italic: true,
  });

  s.addShape("rect", { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });
}

// ─────────────────────────────────────────
// SLIDE 3 — THESIS
// ─────────────────────────────────────────
{
  const s = pptx.addSlide();
  slide_bg(s, P.navyDark);
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });

  label_text(s, "THE THESIS", 0.5, 0.35, 12);

  s.addText('"', {
    x: 0.5, y: 0.8, w: 1.5, h: 1.5,
    fontSize: 96,
    bold: true,
    color: P.gold,
    fontFace: FONT_HEAD,
    align: "left",
  });

  s.addText(V.thesis.main, {
    x: 1.5, y: 1.4, w: 10.5, h: 0.9,
    fontSize: 28,
    bold: true,
    color: P.white,
    fontFace: FONT_HEAD,
    align: "left",
    wrap: true,
  });

  s.addText(V.thesis.body, {
    x: 1.5, y: 2.5, w: 10.5, h: 1.5,
    fontSize: 16,
    color: P.ice,
    fontFace: FONT_BODY,
    align: "left",
    wrap: true,
    lineSpacingMultiple: 1.5,
  });

  s.addText(V.thesis.closing, {
    x: 1.5, y: 4.2, w: 10.5, h: 0.5,
    fontSize: 18,
    bold: true,
    color: P.gold,
    fontFace: FONT_HEAD,
    align: "left",
  });

  s.addShape("rect", { x: 1.5, y: 4.9, w: 6, h: 0.03, fill: { color: P.stone }, line: { type: "none" } });

  s.addText(V.thesis.signature, {
    x: 1.5, y: 5.1, w: 10.5, h: 0.4,
    fontSize: 11,
    color: P.mist,
    fontFace: FONT_BODY,
    italic: true,
    align: "left",
  });

  s.addShape("rect", { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });
}

// ─────────────────────────────────────────
// SLIDE 4 — TWO PILLARS
// ─────────────────────────────────────────
{
  const s = pptx.addSlide();
  slide_bg(s, P.navy);
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });

  label_text(s, "THE ARCHITECTURE", 0.4, 0.2, 12);
  section_title(s, "Two systems. One strategy.", 0.4, 0.5, 12, 24);

  V.pillars.forEach((pillar, i) => {
    const x = i === 0 ? 0.4 : 6.9;
    const w = 5.9;

    s.addShape("rect", { x, y: 1.6, w, h: 5.2, fill: { color: P.navyDark }, line: { color: i === 0 ? P.gold : P.navyLight, pt: 1.5 } });

    s.addText(pillar.label.toUpperCase(), {
      x: x + 0.3, y: 1.9, w: w - 0.6, h: 0.3,
      fontSize: 7,
      bold: true,
      color: P.gold,
      fontFace: FONT_BODY,
      charSpacing: 3,
    });

    s.addText(pillar.title, {
      x: x + 0.3, y: 2.2, w: w - 0.6, h: 0.7,
      fontSize: 26,
      bold: true,
      color: P.white,
      fontFace: FONT_HEAD,
    });

    s.addShape("rect", { x: x + 0.3, y: 2.95, w: 1.2, h: 0.03, fill: { color: P.gold }, line: { type: "none" } });

    pillar.bullets.forEach((b, bi) => {
      s.addText(`→  ${b}`, {
        x: x + 0.3, y: 3.1 + bi * 0.55, w: w - 0.6, h: 0.45,
        fontSize: 11,
        color: P.ice,
        fontFace: FONT_BODY,
        wrap: true,
      });
    });

    // Tag badge
    s.addShape("rect", { x: x + 0.3, y: 5.9, w: w - 0.6, h: 0.5, fill: { color: i === 0 ? P.gold : P.stone }, line: { type: "none" } });
    s.addText(pillar.tag, {
      x: x + 0.3, y: 5.9, w: w - 0.6, h: 0.5,
      fontSize: 9,
      bold: true,
      color: i === 0 ? P.navyDark : P.gold,
      fontFace: FONT_BODY,
      align: "center",
      valign: "middle",
    });
  });

  s.addShape("rect", { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });
}

// ─────────────────────────────────────────
// SLIDE 5 — THE AGENTS
// ─────────────────────────────────────────
{
  const s = pptx.addSlide();
  slide_bg(s, P.navyDark);
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });

  label_text(s, "SILVER OAK OS — THE TEAM", 0.4, 0.2, 12);
  section_title(s, "Six agents. One goal. Karim.", 0.4, 0.5, 12, 24);

  const cols = 3;
  const cardW = 3.8;
  const cardH = 2.1;
  const gapX = 0.2;
  const gapY = 0.25;
  const startX = 0.4;
  const startY = 1.55;

  V.agents.forEach((agent, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    s.addShape("rect", { x, y, w: cardW, h: cardH, fill: { color: P.navy }, line: { color: P.stone, pt: 1 } });

    // Gold top accent
    s.addShape("rect", { x, y, w: cardW, h: 0.06, fill: { color: P.gold }, line: { type: "none" } });

    s.addText(agent.name, {
      x: x + 0.2, y: y + 0.2, w: cardW - 0.4, h: 0.45,
      fontSize: 18,
      bold: true,
      color: P.white,
      fontFace: FONT_HEAD,
    });
    s.addText(agent.role_short, {
      x: x + 0.2, y: y + 0.65, w: cardW - 0.4, h: 0.25,
      fontSize: 7,
      bold: true,
      color: P.gold,
      fontFace: FONT_BODY,
      charSpacing: 2,
    });
    s.addText(agent.detail, {
      x: x + 0.2, y: y + 0.95, w: cardW - 0.4, h: 0.35,
      fontSize: 9,
      color: P.mist,
      fontFace: FONT_BODY,
    });
    s.addShape("rect", { x: x + 0.2, y: y + 1.32, w: cardW - 0.4, h: 0.015, fill: { color: P.stone }, line: { type: "none" } });
    s.addText(agent.description, {
      x: x + 0.2, y: y + 1.4, w: cardW - 0.4, h: 0.4,
      fontSize: 9,
      color: P.ice,
      fontFace: FONT_BODY,
      italic: true,
    });
  });

  s.addShape("rect", { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });
}

// ─────────────────────────────────────────
// SLIDE 6 — CAPABILITIES (8 cards)
// ─────────────────────────────────────────
{
  const s = pptx.addSlide();
  slide_bg(s, P.navy);
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });

  label_text(s, "WHAT SILVER OAK OS DOES", 0.4, 0.2, 12);
  section_title(s, "Every task. Every day. Autonomous.", 0.4, 0.5, 12, 24);

  const cols = 4;
  const cardW = 2.9;
  const cardH = 2.2;
  const gapX = 0.28;
  const gapY = 0.25;
  const startX = 0.35;
  const startY = 1.5;

  V.capabilities.forEach((cap, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    s.addShape("rect", { x, y, w: cardW, h: cardH, fill: { color: P.navyDark }, line: { color: P.stone, pt: 1 } });
    s.addShape("rect", { x, y, w: cardW, h: 0.06, fill: { color: P.gold }, line: { type: "none" } });

    s.addText(cap.title, {
      x: x + 0.2, y: y + 0.2, w: cardW - 0.4, h: 0.45,
      fontSize: 15,
      bold: true,
      color: P.white,
      fontFace: FONT_HEAD,
    });
    s.addText(cap.desc, {
      x: x + 0.2, y: y + 0.7, w: cardW - 0.4, h: 1.2,
      fontSize: 10,
      color: P.ice,
      fontFace: FONT_BODY,
      wrap: true,
      valign: "top",
    });
  });

  s.addShape("rect", { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });
}

// ─────────────────────────────────────────
// SLIDE 7 — STACK PILLARS
// ─────────────────────────────────────────
{
  const s = pptx.addSlide();
  slide_bg(s, P.navyDark);
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });

  label_text(s, "SOVEREIGN INFRASTRUCTURE", 0.4, 0.2, 12);
  section_title(s, "The stack. European. Private. Ours.", 0.4, 0.5, 12, 24);

  const cardW = 2.9;
  const cardH = 4.0;
  const gapX = 0.35;
  const startX = 0.35;
  const y = 1.55;

  V.stack_pillars.forEach((pillar, i) => {
    const x = startX + i * (cardW + gapX);

    s.addShape("rect", { x, y, w: cardW, h: cardH, fill: { color: P.navy }, line: { color: P.stone, pt: 1 } });
    s.addShape("rect", { x, y, w: cardW, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });

    s.addText(pillar.title, {
      x: x + 0.2, y: y + 0.3, w: cardW - 0.4, h: 0.6,
      fontSize: 17,
      bold: true,
      color: P.white,
      fontFace: FONT_HEAD,
      wrap: true,
    });

    s.addShape("rect", { x: x + 0.2, y: y + 1.0, w: 1.0, h: 0.03, fill: { color: P.gold }, line: { type: "none" } });

    s.addText(pillar.body, {
      x: x + 0.2, y: y + 1.15, w: cardW - 0.4, h: 2.5,
      fontSize: 11,
      color: P.ice,
      fontFace: FONT_BODY,
      wrap: true,
      lineSpacingMultiple: 1.6,
      valign: "top",
    });
  });

  s.addShape("rect", { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });
}

// ─────────────────────────────────────────
// SLIDE 8 — TRAJECTORY (chart + milestones)
// ─────────────────────────────────────────
{
  const s = pptx.addSlide();
  slide_bg(s, P.navy);
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });

  label_text(s, "THE TRAJECTORY", 0.4, 0.2, 12);
  section_title(s, V.trajectory.title, 0.4, 0.5, 12, 24);

  s.addText(V.trajectory.subtitle, {
    x: 0.4, y: 1.25, w: 12, h: 0.3,
    fontSize: 11,
    color: P.mist,
    fontFace: FONT_BODY,
    italic: true,
  });

  // Chart
  const chartData = [{
    name: "Valuation M€",
    labels: V.trajectory.points.map((p) => p.month),
    values: V.trajectory.points.map((p) => p.value),
  }];

  s.addChart(pptx.ChartType.line, chartData, {
    x: 0.4, y: 1.6, w: 8.5, h: 4.2,
    chartColors: [P.gold],
    lineDataSymbol: "circle",
    lineDataSymbolSize: 8,
    showLegend: false,
    dataLabelFontSize: 9,
    showValue: true,
    valAxisMajorUnit: 20,
    valAxisMaxVal: 130,
    catAxisLabelColor: P.mist.replace("#", ""),
    valAxisLabelColor: P.mist.replace("#", ""),
    chartFill: P.navy,
    plotAreaFill: P.navy,
    dataLabelColor: P.goldBr,
    seriesOnSecondaryAxis: false,
  });

  // Milestones
  V.trajectory.milestones.forEach((ms, i) => {
    const y = 1.8 + i * 1.4;
    s.addShape("rect", { x: 9.2, y, w: 3.8, h: 1.15, fill: { color: P.navyDark }, line: { color: P.stone, pt: 1 } });
    s.addText(ms.range, {
      x: 9.35, y: y + 0.1, w: 3.5, h: 0.3,
      fontSize: 8,
      bold: true,
      color: P.gold,
      fontFace: FONT_BODY,
      charSpacing: 1,
    });
    s.addText(ms.label, {
      x: 9.35, y: y + 0.38, w: 3.5, h: 0.28,
      fontSize: 11,
      bold: true,
      color: P.white,
      fontFace: FONT_HEAD,
    });
    s.addText(ms.body, {
      x: 9.35, y: y + 0.65, w: 3.5, h: 0.4,
      fontSize: 9,
      color: P.ice,
      fontFace: FONT_BODY,
      wrap: true,
    });
  });

  s.addShape("rect", { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });
}

// ─────────────────────────────────────────
// SLIDE 9 — ROADMAP
// ─────────────────────────────────────────
{
  const s = pptx.addSlide();
  slide_bg(s, P.navyDark);
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });

  label_text(s, "THE ROADMAP", 0.4, 0.2, 12);
  section_title(s, "Built today. Expanding tomorrow.", 0.4, 0.5, 12, 24);

  // Panel LEFT — current
  const rm = V.roadmap;
  const panels = [
    { label: rm.current.label, title: rm.current.title, items: rm.current.items, x: 0.4, accentColor: P.gold },
    { label: rm.next.label, title: rm.next.title, items: rm.next.items, x: 6.9, accentColor: P.navyLight },
  ];

  panels.forEach((panel) => {
    const w = 5.9;
    s.addShape("rect", { x: panel.x, y: 1.6, w, h: 5.2, fill: { color: P.navy }, line: { color: panel.accentColor, pt: 1 } });
    s.addShape("rect", { x: panel.x, y: 1.6, w, h: 0.08, fill: { color: panel.accentColor }, line: { type: "none" } });

    s.addText(panel.label, {
      x: panel.x + 0.2, y: 1.8, w: w - 0.4, h: 0.3,
      fontSize: 7,
      bold: true,
      color: P.gold,
      fontFace: FONT_BODY,
      charSpacing: 3,
    });
    s.addText(panel.title, {
      x: panel.x + 0.2, y: 2.1, w: w - 0.4, h: 0.5,
      fontSize: 18,
      bold: true,
      color: P.white,
      fontFace: FONT_HEAD,
    });
    s.addShape("rect", { x: panel.x + 0.2, y: 2.65, w: w - 0.4, h: 0.015, fill: { color: P.stone }, line: { type: "none" } });

    panel.items.forEach((item, i) => {
      const iy = 2.75 + i * 0.52;
      s.addText(`${item.name}`, {
        x: panel.x + 0.3, y: iy, w: 1.8, h: 0.38,
        fontSize: 10,
        bold: true,
        color: P.white,
        fontFace: FONT_BODY,
      });
      s.addText(item.role, {
        x: panel.x + 2.1, y: iy, w: w - 2.4, h: 0.38,
        fontSize: 10,
        color: P.mist,
        fontFace: FONT_BODY,
      });
    });
  });

  s.addShape("rect", { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });
}

// ─────────────────────────────────────────
// SLIDE 10 — PHASES
// ─────────────────────────────────────────
{
  const s = pptx.addSlide();
  slide_bg(s, P.navy);
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });

  label_text(s, "PRODUCT PHASES", 0.4, 0.2, 12);
  section_title(s, "Internal → Private → Public.", 0.4, 0.5, 12, 24);

  const cardW = 3.8;
  const cardH = 4.5;
  const gapX = 0.45;
  const startX = 0.4;
  const y = 1.55;

  V.phases.forEach((phase, i) => {
    const x = startX + i * (cardW + gapX);
    s.addShape("rect", { x, y, w: cardW, h: cardH, fill: { color: P.navyDark }, line: { color: P.stone, pt: 1 } });

    // Phase number badge
    s.addShape("rect", { x, y, w: 0.9, h: 0.9, fill: { color: P.gold }, line: { type: "none" } });
    s.addText(String(phase.number), {
      x, y, w: 0.9, h: 0.9,
      fontSize: 28,
      bold: true,
      color: P.navyDark,
      fontFace: FONT_HEAD,
      align: "center",
      valign: "middle",
    });

    s.addText(phase.label, {
      x: x + 0.2, y: y + 1.05, w: cardW - 0.4, h: 0.3,
      fontSize: 7,
      bold: true,
      color: P.gold,
      fontFace: FONT_BODY,
      charSpacing: 2,
    });
    s.addText(phase.title, {
      x: x + 0.2, y: y + 1.4, w: cardW - 0.4, h: 0.55,
      fontSize: 22,
      bold: true,
      color: P.white,
      fontFace: FONT_HEAD,
    });
    s.addShape("rect", { x: x + 0.2, y: y + 2.0, w: 1.5, h: 0.03, fill: { color: P.gold }, line: { type: "none" } });
    s.addText(phase.body, {
      x: x + 0.2, y: y + 2.15, w: cardW - 0.4, h: 2.0,
      fontSize: 12,
      color: P.ice,
      fontFace: FONT_BODY,
      wrap: true,
      lineSpacingMultiple: 1.5,
      valign: "top",
    });
  });

  s.addShape("rect", { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });
}

// ─────────────────────────────────────────
// SLIDE 11 — WORKERS / MAESTRO
// ─────────────────────────────────────────
{
  const s = pptx.addSlide();
  slide_bg(s, P.navyDark);
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });

  label_text(s, "MAESTRO + THE WORKERS", 0.4, 0.2, 12);
  section_title(s, `${V.workers.count} workers. One orchestrator.`, 0.4, 0.5, 12, 24);

  // Central Maestro box
  s.addShape("rect", { x: 4.4, y: 1.8, w: 4.5, h: 1.8, fill: { color: P.navy }, line: { color: P.gold, pt: 2 } });
  s.addText("MAESTRO", {
    x: 4.4, y: 2.0, w: 4.5, h: 0.6,
    fontSize: 22,
    bold: true,
    color: P.gold,
    fontFace: FONT_HEAD,
    align: "center",
  });
  s.addText("CTO · Orchestrator", {
    x: 4.4, y: 2.55, w: 4.5, h: 0.3,
    fontSize: 10,
    color: P.mist,
    fontFace: FONT_BODY,
    align: "center",
  });
  s.addText(`${V.workers.count} workers via MCP Bridge`, {
    x: 4.4, y: 2.9, w: 4.5, h: 0.4,
    fontSize: 10,
    color: P.ice,
    fontFace: FONT_BODY,
    align: "center",
  });

  // Worker provider pills
  const providers = V.workers.providers;
  const pillW = 1.8;
  const pillH = 0.5;
  const startX = (13.33 - providers.length * (pillW + 0.2)) / 2;
  providers.forEach((prov, i) => {
    const px = startX + i * (pillW + 0.2);
    s.addShape("rect", { x: px, y: 4.1, w: pillW, h: pillH, fill: { color: P.stone }, line: { color: P.navyLight, pt: 1 } });
    s.addText(prov, {
      x: px, y: 4.1, w: pillW, h: pillH,
      fontSize: 10,
      bold: true,
      color: P.ice,
      fontFace: FONT_BODY,
      align: "center",
      valign: "middle",
    });
  });

  s.addText("Powered by:", {
    x: 0.4, y: 3.9, w: 12, h: 0.3,
    fontSize: 9,
    color: P.mist,
    fontFace: FONT_BODY,
    align: "center",
    italic: true,
  });

  // Capabilities note
  s.addText(
    "Maestro dispatches tasks to specialized workers in parallel.\nEvery code commit, every deploy, every review — fully autonomous.",
    {
      x: 1.0, y: 4.9, w: 11.3, h: 0.9,
      fontSize: 12,
      color: P.ice,
      fontFace: FONT_BODY,
      align: "center",
      wrap: true,
      lineSpacingMultiple: 1.5,
    }
  );

  s.addShape("rect", { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });
}

// ─────────────────────────────────────────
// SLIDE 12 — CLOSING
// ─────────────────────────────────────────
{
  const s = pptx.addSlide();
  slide_bg(s, P.navyDark);
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });
  s.addShape("rect", { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: P.gold }, line: { type: "none" } });

  s.addText(V.closing.main, {
    x: 0.5, y: 1.2, w: 12, h: 1.2,
    fontSize: 56,
    bold: true,
    color: P.white,
    fontFace: FONT_HEAD,
    align: "center",
  });
  s.addText(V.closing.sub, {
    x: 0.5, y: 2.3, w: 12, h: 0.6,
    fontSize: 22,
    color: P.gold,
    fontFace: FONT_HEAD,
    align: "center",
    italic: true,
  });

  s.addShape("rect", { x: 5.0, y: 3.15, w: 3.3, h: 0.04, fill: { color: P.gold }, line: { type: "none" } });

  s.addText(V.closing.line1, {
    x: 0.5, y: 3.4, w: 12, h: 0.45,
    fontSize: 14,
    color: P.ice,
    fontFace: FONT_BODY,
    align: "center",
  });
  s.addText(V.closing.line2, {
    x: 0.5, y: 3.85, w: 12, h: 0.45,
    fontSize: 14,
    color: P.ice,
    fontFace: FONT_BODY,
    align: "center",
  });

  // Exit badge
  s.addShape("rect", { x: 5.5, y: 4.7, w: 2.33, h: 1.4, fill: { color: P.gold }, line: { type: "none" } });
  s.addText(`${V.vision.exit_value_m_euros}M€`, {
    x: 5.5, y: 4.8, w: 2.33, h: 0.7,
    fontSize: 36,
    bold: true,
    color: P.navyDark,
    fontFace: FONT_HEAD,
    align: "center",
  });
  s.addText(`in ${V.vision.exit_months} months`, {
    x: 5.5, y: 5.5, w: 2.33, h: 0.4,
    fontSize: 10,
    bold: true,
    color: P.navyDark,
    fontFace: FONT_BODY,
    align: "center",
  });

  s.addText(V.closing.contact, {
    x: 0.5, y: 6.7, w: 12, h: 0.35,
    fontSize: 10,
    color: P.mist,
    fontFace: FONT_BODY,
    align: "center",
    italic: true,
  });
}

// ─────────────────────────────────────────
// Save
// ─────────────────────────────────────────
const outDir = path.join(__dirname, "../dist");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "SilverOakOS_Vision.pptx");

pptx
  .writeFile({ fileName: outPath })
  .then(() => {
    const size = fs.statSync(outPath).size;
    console.log(`✅ PPTX généré : ${outPath}`);
    console.log(`   Taille : ${(size / 1024).toFixed(0)} KB`);
    console.log(`   Slides : 12`);
    console.log(`   Source : vision.yml v${V.meta.version}`);
  })
  .catch((err) => {
    console.error("❌ Erreur génération PPTX :", err.message);
    process.exit(1);
  });
