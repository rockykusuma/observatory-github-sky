// Champion Card generator — draws a shareable 1200×630 PNG on a canvas.
import { formatStars } from "./api";

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function wrapText(ctx, text, maxWidth, maxLines) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, "") + "…";
  }
  return lines;
}

export async function downloadChampionCard(repo) {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  await Promise.all([
    document.fonts.load('300 34px Fraunces'),
    document.fonts.load('600 76px Fraunces'),
    document.fonts.load('400 21px "JetBrains Mono"'),
    document.fonts.load('700 46px "JetBrains Mono"'),
  ]).catch(() => {});

  // night sky
  ctx.fillStyle = "#05070f";
  ctx.fillRect(0, 0, W, H);
  let g = ctx.createRadialGradient(920, 60, 0, 920, 60, 520);
  g.addColorStop(0, "rgba(99,102,241,0.18)");
  g.addColorStop(1, "rgba(99,102,241,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(140, 570, 0, 140, 570, 420);
  g.addColorStop(0, "rgba(217,70,139,0.12)");
  g.addColorStop(1, "rgba(217,70,139,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // seeded starfield
  let s = 987654321;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 110; i++) {
    ctx.globalAlpha = 0.15 + rnd() * 0.6;
    ctx.fillStyle = rnd() < 0.08 ? "#f5c451" : "#dce4ff";
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, rnd() * 1.8 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // gold halo behind the headline
  g = ctx.createRadialGradient(W / 2, 150, 0, W / 2, 150, 460);
  g.addColorStop(0, "rgba(245,196,81,0.15)");
  g.addColorStop(1, "rgba(245,196,81,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";

  // kicker
  ctx.fillStyle = "#f5c451";
  ctx.font = '400 19px "JetBrains Mono"';
  try {
    ctx.letterSpacing = "5px";
  } catch {}
  const dateStr = new Date()
    .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    .toUpperCase();
  ctx.fillText(`✦ BRIGHTEST STAR TONIGHT · ${dateStr} ✦`, W / 2, 92);
  try {
    ctx.letterSpacing = "0px";
  } catch {}

  // avatar
  const avatar = await loadImage(repo.avatar).catch(() => null);
  if (avatar) {
    const size = 108;
    const ax = W / 2 - size / 2;
    const ay = 128;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(ax, ay, size, size, 26);
    ctx.clip();
    ctx.drawImage(avatar, ax, ay, size, size);
    ctx.restore();
    ctx.strokeStyle = "rgba(245,196,81,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(ax, ay, size, size, 26);
    ctx.stroke();
  }

  // owner + name
  ctx.fillStyle = "#98a2c3";
  ctx.font = '400 24px "JetBrains Mono"';
  ctx.fillText(`${repo.owner} /`, W / 2, 292);
  ctx.fillStyle = "#e8ecf8";
  let nameSize = 76;
  ctx.font = `600 ${nameSize}px Fraunces`;
  while (ctx.measureText(repo.name).width > W - 160 && nameSize > 40) {
    nameSize -= 4;
    ctx.font = `600 ${nameSize}px Fraunces`;
  }
  ctx.fillText(repo.name, W / 2, 368);

  // description
  if (repo.description) {
    ctx.fillStyle = "#98a2c3";
    ctx.font = "300 27px Fraunces";
    const lines = wrapText(ctx, repo.description, 860, 2);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 420 + i * 38));
  }

  // stats
  const statsY = 540;
  const cols = [];
  if (repo.gained != null) cols.push({ v: `+${formatStars(repo.gained)}`, l: "STARS TODAY", gold: true });
  cols.push({ v: `★ ${formatStars(repo.stars)}`, l: "TOTAL", gold: repo.gained == null });
  if (repo.language) cols.push({ v: repo.language, l: "WRITTEN IN" });
  const colW = 260;
  const startX = W / 2 - ((cols.length - 1) * colW) / 2;
  cols.forEach((c, i) => {
    const x = startX + i * colW;
    ctx.fillStyle = c.gold ? "#f5c451" : "#e8ecf8";
    ctx.font = '700 44px "JetBrains Mono"';
    ctx.fillText(c.v, x, statsY);
    ctx.fillStyle = "#5c6685";
    ctx.font = '400 15px "JetBrains Mono"';
    ctx.fillText(c.l, x, statsY + 30);
  });

  // footer
  ctx.fillStyle = "#5c6685";
  ctx.font = '400 17px "JetBrains Mono"';
  ctx.fillText("🔭 THE OBSERVATORY — github, charted nightly", W / 2, H - 24);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `observatory-champion-${repo.name}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve();
    }, "image/png");
  });
}
