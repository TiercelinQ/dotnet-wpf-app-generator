// Role: run the executable verification ladder (verification.md section A) and summarize the result.
// Inputs: <root> [--publish <projectPath>]
//   Commands: dotnet restore, dotnet build -c Debug, dotnet format --verify-no-changes,
//   dotnet test (if tests/ exists), dotnet publish <projectPath> -c Release -p:PublishProfile=win-x64
//   (only with --publish; the app must be closed). Stops at the first failing command.
// Outputs: stdout = command / status / duration table, then the first diagnostics of the failure with
//   their rule ids (CSxxxx, NU1008, IDExxxx, CAxxxx, WHITESPACE...).
// Exit codes: 0 all green, 1 a command failed, 4 invalid argument.
// Not covered: the acceptance run of section A-bis (see acceptance-run.mjs).
// Command replaced: /wpf-run-tests, step 1 (interpreting a failure stays with the model).
// Example: node .claude/scripts/run-verification.mjs C:\projects\MyApp --publish src/App.Wpf

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const pi = args.indexOf("--publish");
const publishPath = pi >= 0 ? args.splice(pi, 2)[1] : "";
const root = args[0];
if (!root || !existsSync(root) || (pi >= 0 && !publishPath)) {
  console.error("Usage: run-verification.mjs <root> [--publish <projectPath>]");
  process.exit(4);
}

const steps = [
  { label: "dotnet restore", argv: ["restore"] },
  { label: "dotnet build -c Debug", argv: ["build", "-c", "Debug"] },
  { label: "dotnet format --verify-no-changes", argv: ["format", "--verify-no-changes"] },
];
if (existsSync(join(root, "tests"))) steps.push({ label: "dotnet test", argv: ["test"] });
if (publishPath) steps.push({ label: "dotnet publish", argv: ["publish", publishPath, "-c", "Release", "-p:PublishProfile=win-x64"] });

const rows = [];
let failure = null;
for (const s of steps) {
  if (failure) {
    rows.push([s.label, "not run", "-"]);
    continue;
  }
  const t0 = Date.now();
  const r = spawnSync("dotnet", s.argv, { cwd: root, encoding: "utf8", timeout: 15 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  const secs = ((Date.now() - t0) / 1000).toFixed(1) + " s";
  if (r.error) {
    rows.push([s.label, `FAILED (${r.error.message})`, secs]);
    failure = { label: s.label, output: String(r.error.message) };
  } else if (r.status === 0) rows.push([s.label, "OK", secs]);
  else {
    rows.push([s.label, `FAILED (code ${r.status ?? r.signal ?? "?"})`, secs]);
    failure = { label: s.label, output: `${r.stdout ?? ""}\n${r.stderr ?? ""}`.trim() };
  }
}

console.log("| Command | Status | Duration |\n|---|---|---|");
for (const r of rows) console.log(`| ${r.join(" | ")} |`);
if (failure) {
  const diag = failure.output
    .split(/\r?\n/)
    .filter((l) => /\b(CS\d{4}|NU\d{4}|IDE\d{4}|CA\d{4}|WHITESPACE|CHARSET|FINALNEWLINE)\b|error|Failed/i.test(l))
    .slice(0, 15);
  console.log(`\nFirst diagnostics from "${failure.label}":`);
  console.log((diag.length ? diag : failure.output.split(/\r?\n/).slice(-15)).join("\n"));
  process.exit(1);
}
