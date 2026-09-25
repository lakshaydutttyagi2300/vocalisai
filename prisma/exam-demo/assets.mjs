// P1-H demo assets: listening recordings and Writing Task 1 charts, both
// generated locally from content.mjs with tools built into Windows
// (System.Speech for the two voices, System.Drawing for the charts) -
// nothing is downloaded, and nothing is copied from real exam material.
// On any other OS, or if generation fails, the seed simply carries on
// without assets and says so (the listening groups then have no player,
// which the runner already handles).
//
// Uploads go through the same place the app itself reads item-group
// assets from (src/lib/storage.ts): R2 when R2_* is configured, otherwise
// ./uploads on local disk. Keys use the same "item-groups/<uuid>.<ext>"
// shape as admin uploads (src/lib/item-groups.ts).

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const VOICES = { F: "Microsoft Zira Desktop", M: "Microsoft David Desktop" };

export function canGenerateAssets() {
  return process.platform === "win32";
}

function runPowerShell(script) {
  execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { stdio: "pipe" });
}

const psString = (s) => `'${String(s).replace(/'/g, "''")}'`;

// Speakers keyed "F"/"M" (the practice tests) get that voice; any other
// keys ("S1", "S2", ... in the question bank) get distinct voices in order
// of first appearance, so Speaker 1 and Speaker 2 never sound the same.
const VOICE_ORDER = [VOICES.F, VOICES.M];

export function voiceMapFor(script) {
  const map = new Map();
  let next = 0;
  for (const [who] of script) {
    if (map.has(who)) continue;
    map.set(who, VOICES[who] ?? VOICE_ORDER[next++ % VOICE_ORDER.length]);
  }
  return map;
}

// SpeechSynthesizer.Rate runs -10..10 (0 = normal); a spec's speechRate is
// a multiplier (1.0 = normal), roughly 10 steps per 1.0.
export function synthRateFor(speechRate) {
  if (typeof speechRate !== "number" || !Number.isFinite(speechRate)) return -1;
  return Math.max(-10, Math.min(10, Math.round((speechRate - 1) * 10)));
}

// 16 kHz mono 16-bit WAV - ~32 KB per second, far under the 25 MB asset cap.
// `script` is [[speaker, text], ...].
export async function generateListeningWav(script, outPath, { speechRate, pauseMs = 600 } = {}) {
  const voices = voiceMapFor(script);
  const pause = Math.max(0, Math.min(3000, Math.round(pauseMs)));
  const lines = script
    .map(([who, text]) => `$pb.StartVoice(${psString(voices.get(who))}); $pb.AppendText(${psString(text)}); $pb.EndVoice(); $pb.AppendBreak([TimeSpan]::FromMilliseconds(${pause}));`)
    .join("\n");
  runPowerShell(`
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile(${psString(outPath)}, $fmt)
$s.Rate = ${speechRate === undefined ? -1 : synthRateFor(speechRate)}
$pb = New-Object System.Speech.Synthesis.PromptBuilder
${lines}
$s.Speak($pb)
$s.Dispose()
`);
  return fs.readFile(outPath);
}

// A plain grouped bar chart, drawn from the same numbers the task prompt
// lists in text, so the image and the prompt can never disagree.
export async function generateChartPng(chart, outPath) {
  const colours = ["#2563EB", "#F59E0B", "#10B981", "#EF4444"];
  const max = Math.max(...chart.series.flatMap((s) => s.values));
  const data = chart.series.map((s, i) => `@{ name=${psString(s.name)}; colour=${psString(colours[i % colours.length])}; values=@(${s.values.join(",")}) }`).join(",");
  runPowerShell(`
Add-Type -AssemblyName System.Drawing
$W = 900; $H = 520; $left = 70; $right = 30; $top = 60; $bottom = 90
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font('Segoe UI', 11)
$titleFont = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
$ink = [System.Drawing.Brushes]::Black
$grid = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220,220,220), 1)
$axis = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 1)
$g.DrawString(${psString(chart.title)}, $titleFont, $ink, $left, 18)
$series = @(${data})
$cats = @(${chart.categories.map(psString).join(",")})
$max = ${max}; $step = [Math]::Pow(10, [Math]::Floor([Math]::Log10($max))) / 2
$top_v = [Math]::Ceiling($max / $step) * $step
$ph = $H - $top - $bottom; $pw = $W - $left - $right
for ($t = 0; $t -le $top_v; $t += $step) {
  $y = $top + $ph - ($t / $top_v) * $ph
  $g.DrawLine($grid, $left, $y, $W - $right, $y)
  $g.DrawString([string]$t, $font, $ink, 10, $y - 9)
}
$g.DrawLine($axis, $left, $top + $ph, $W - $right, $top + $ph)
$groupW = $pw / $cats.Count; $barW = ($groupW * 0.7) / $series.Count
for ($c = 0; $c -lt $cats.Count; $c++) {
  $gx = $left + $c * $groupW + $groupW * 0.15
  for ($s = 0; $s -lt $series.Count; $s++) {
    $v = $series[$s].values[$c]; $bh = ($v / $top_v) * $ph
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($series[$s].colour))
    $g.FillRectangle($brush, [float]($gx + $s * $barW), [float]($top + $ph - $bh), [float]($barW - 3), [float]$bh)
  }
  $g.DrawString($cats[$c], $font, $ink, [float]($left + $c * $groupW + $groupW / 2 - 18), [float]($top + $ph + 8))
}
$lx = $left
foreach ($ser in $series) {
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($ser.colour))
  $g.FillRectangle($brush, $lx, $H - 38, 16, 16)
  $g.DrawString($ser.name, $font, $ink, $lx + 22, $H - 40)
  $lx += 160
}
$bmp.Save(${psString(outPath)}, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
`);
  return fs.readFile(outPath);
}

function r2() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) return null;
  return {
    bucket: R2_BUCKET_NAME,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    }),
  };
}

export async function uploadAsset(buffer, ext, mimeType, prefix = "item-groups") {
  const key = `${prefix}/${randomUUID()}.${ext}`;
  const remote = r2();
  if (remote) {
    await remote.client.send(new PutObjectCommand({ Bucket: remote.bucket, Key: key, Body: buffer, ContentType: mimeType }));
  } else {
    const abs = path.join(process.cwd(), "uploads", key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, buffer);
  }
  return key;
}

// Generates + uploads the asset for one group, or returns null (with the
// reason) if this machine can't generate it. Never throws for a
// generation problem - the demo is still usable without it.
export async function buildGroupAsset(group) {
  if (!canGenerateAssets()) return { key: null, reason: "asset generation needs Windows" };
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "exam-demo-"));
  try {
    if (group.type === "AUDIO" && group.script) {
      const buf = await generateListeningWav(group.script, path.join(dir, "clip.wav"));
      return { key: await uploadAsset(buf, "wav", "audio/wav"), reason: null };
    }
    if (group.type === "CHART" && group.chart) {
      const buf = await generateChartPng(group.chart, path.join(dir, "chart.png"));
      return { key: await uploadAsset(buf, "png", "image/png"), reason: null };
    }
    return { key: null, reason: null };
  } catch (err) {
    return { key: null, reason: `generation failed: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}` };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
