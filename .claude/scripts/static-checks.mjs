// Role: static integrity checks of verification.md section B by pattern search, instead of model reading.
// Inputs: <root> (root of the generated WPF app)
// Outputs: stdout = one "[point] file:line: message" line per finding, then a total; "OK" if none.
//   Points: 4 TODO/pragma · 6 literal colors outside Themes/, DropShadowEffect · 8 async void, .Result, .Wait(),
//   Thread.Sleep · 9 MessageBox · logging Console.WriteLine · NU1008 Version on PackageReference ·
//   16 versions · 17 .gitignore.
// Exit codes: 0 no finding, 1 at least one finding, 4 invalid argument.
// Documented exceptions (splash background literal, commented Dispatcher.Invoke) stay to be judged by the model.
// Command replaced: /wpf-p5-development, /wpf-add-feature, /wpf-fix-issue, section B.
// Example: node .claude/scripts/static-checks.mjs C:\projects\MyApp

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.argv[2];
if (!root || !existsSync(root)) {
  console.error("Usage: static-checks.mjs <root>");
  process.exit(4);
}

const findings = [];
const add = (point, file, line, msg) => findings.push(`[${point}] ${file}${line ? ":" + line : ""}: ${msg}`);
const rel = (f) => relative(root, f).split("\\").join("/");

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (["bin", "obj", "node_modules", ".git"].includes(e)) continue;
    const p = join(dir, e);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

const all = walk(join(root, "src"));
const rules = [
  { point: "4", re: /\/\/\s*TODO/, ext: /\.(cs|xaml)$/, msg: "// TODO is forbidden" },
  { point: "4", re: /#pragma\s+warning\s+disable/, ext: /\.cs$/, msg: "#pragma warning disable needs a justification" },
  { point: "6", re: /#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?\b/, ext: /\.(cs|xaml)$/, msg: "literal color outside the Themes/ dictionaries", skipPath: /[\\/]Themes[\\/]/ },
  { point: "6", re: /DropShadowEffect/, ext: /\.(cs|xaml)$/, msg: "DropShadowEffect is forbidden (depth by stroke)" },
  { point: "8", re: /\basync\s+void\b/, ext: /\.cs$/, msg: "async void outside a guarded handler" },
  { point: "8", re: /\.Result\b|\.Wait\(/, ext: /\.cs$/, msg: ".Result / .Wait() blocks the thread" },
  { point: "8", re: /Thread\.Sleep\(/, ext: /\.cs$/, msg: "Thread.Sleep is forbidden" },
  { point: "9", re: /MessageBox\.Show\(/, ext: /\.cs$/, msg: "MessageBox is forbidden for a business error" },
  { point: "logging", re: /Console\.WriteLine\(/, ext: /\.cs$/, msg: "Console.WriteLine is forbidden, use ILogger<T>" },
  { point: "NU1008", re: /<PackageReference\b[^>]*\bVersion\s*=/, ext: /\.csproj$/, msg: "Version on PackageReference, move it to Directory.Packages.props" },
];
for (const f of all) {
  const lines = readFileSync(f, "utf8").split(/\r?\n/);
  for (const r of rules) {
    if (!r.ext.test(f) || (r.skipPath && r.skipPath.test(f))) continue;
    lines.forEach((l, i) => {
      if (r.re.test(l)) add(r.point, rel(f), i + 1, r.msg);
    });
  }
}

// Point 16: the three versions must be equal
const ver = {};
try {
  const csproj = all.find((f) => f.endsWith(".csproj") && /<Version>/.test(readFileSync(f, "utf8")));
  ver[".csproj <Version>"] = csproj ? readFileSync(csproj, "utf8").match(/<Version>([^<]+)<\/Version>/)?.[1] : undefined;
  const cfg = all.find((f) => /[\\/]AppConfig\.cs$/.test(f));
  ver["AppConfig.AppVersion"] = cfg ? readFileSync(cfg, "utf8").match(/AppVersion\s*=\s*"([^"]+)"/)?.[1] : undefined;
  ver["CHANGELOG top"] = readFileSync(join(root, "docs/release/CHANGELOG.md"), "utf8").match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1];
} catch {
  add("16", "docs/release/CHANGELOG.md", 0, "changelog is unreadable");
}
if (Object.values(ver).some((v) => v === undefined) || new Set(Object.values(ver)).size > 1)
  add("16", "(versions)", 0, `versions differ or are missing: ${JSON.stringify(ver)}`);

// Point 17: .gitignore
const gi = join(root, ".gitignore");
if (!existsSync(gi)) add("17", ".gitignore", 0, "file is missing");
else {
  const set = new Set(readFileSync(gi, "utf8").split(/\r?\n/).map((l) => l.trim()));
  for (const need of ["bin/", "obj/", "/publish/", "/artifacts/", ".env", "tasks/", ".claude/settings.local.json", ".claude/agent-memory/"])
    if (!set.has(need)) add("17", ".gitignore", 0, `missing entry: ${need}`);
  for (const bad of ["tests/", ".claude/settings.json", "docs/release/CHANGELOG.md", "CLAUDE.md", "Directory.Build.props", "Directory.Packages.props"])
    if (set.has(bad)) add("17", ".gitignore", 0, `must not ignore: ${bad}`);
}

console.log(findings.length ? `${findings.join("\n")}\n\n${findings.length} finding(s).` : "OK: no finding.");
process.exit(findings.length ? 1 : 0);
