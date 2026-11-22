// Role: automate the acceptance run of verification.md section A-bis on a delivered WPF app (Windows only).
// Inputs: --exe <path> --app-name <AppName> [--ids <AutomationId,AutomationId,...>]
//         [--theme-toggle <AutomationId>] [--args "<command line arguments>"]
//   --ids: AutomationIds of the Phase 4 contract commands, each invoked once through UI Automation.
//   --theme-toggle: AutomationId of the theme switch; invoked, then windows and log are checked again.
// Steps: launch, wait for a visible window (EnumWindows, IsWindowVisible, GetWindowRect, off-screen test),
//   read new lines of %APPDATA%\<AppName>\logs\app-*.log, invoke each id (InvokePattern),
//   toggle the theme, close the main window and confirm the process exits.
// Outputs: stdout = one "OK|KO <step>: <detail>" line per step, then a summary.
// Exit codes: 0 every step OK, 1 at least one KO, 4 invalid argument or not running on Windows.
// Not covered (stays with the model): synthetic mouse clicks, observable effects, visual comparison,
//   README install block copy-paste.
// Command replaced: manual acceptance run of /wpf-p5-development and the maintenance skills (A-bis, steps 1 to 6).
// Example: node .claude/scripts/acceptance-run.mjs --exe C:\app\App.Wpf.exe --app-name MyApp --ids btnSave,btnRefresh

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? (argv[i + 1] ?? "") : "";
};
const exe = opt("--exe");
const appName = opt("--app-name");
if (process.platform !== "win32" || !exe || !appName) {
  console.error('Usage: acceptance-run.mjs --exe <path> --app-name <AppName> [--ids a,b] [--theme-toggle <id>] [--args "<args>"] (Windows only)');
  process.exit(4);
}

const PS = String.raw`
param([string]$Exe, [string]$AppName, [string]$ExeArgs, [string]$Ids, [string]$ThemeToggle)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms
Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class W32 {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  public static List<long[]> ForPid(uint pid) {
    var res = new List<long[]>();
    EnumWindows((h, l) => {
      uint p; GetWindowThreadProcessId(h, out p);
      if (p == pid) { RECT r; GetWindowRect(h, out r); res.Add(new long[] { h.ToInt64(), IsWindowVisible(h) ? 1 : 0, r.L, r.T, r.R, r.B }); }
      return true;
    }, IntPtr.Zero);
    return res;
  }
}
"@

$script:fail = $false
function Step([bool]$ok, [string]$name, [string]$detail) {
  $tag = 'OK'
  if (-not $ok) { $tag = 'KO'; $script:fail = $true }
  Write-Output ("{0} {1}: {2}" -f $tag, $name, $detail)
}

function Get-Shown([uint32]$procId) {
  $vs = [System.Windows.Forms.SystemInformation]::VirtualScreen
  $all = [W32]::ForPid($procId)
  $shown = @()
  foreach ($w in $all) {
    $width = $w[4] - $w[2]; $height = $w[5] - $w[3]
    $onScreen = ($w[4] -gt $vs.Left) -and ($w[2] -lt $vs.Right) -and ($w[5] -gt $vs.Top) -and ($w[3] -lt $vs.Bottom)
    if ($w[1] -eq 1 -and $width -gt 0 -and $height -gt 0 -and $onScreen) { $shown += ,$w }
  }
  return @{ All = $all; Shown = $shown }
}

function Read-NewLog([string]$dir, [long]$offset) {
  $f = Get-ChildItem -Path $dir -Filter 'app-*.log' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $f) { return $null }
  $fs = [System.IO.File]::Open($f.FullName, 'Open', 'Read', 'ReadWrite')
  try {
    if ($offset -lt $fs.Length) { [void]$fs.Seek($offset, 'Begin') }
    $sr = New-Object System.IO.StreamReader($fs)
    $text = $sr.ReadToEnd()
  } finally { $fs.Dispose() }
  return @{ File = $f.Name; Lines = @($text -split "\r?\n" | Where-Object { $_ -match '\b(ERR|FTL|Error|Fatal)\b|Exception' }) }
}

$logDir = Join-Path $env:APPDATA (Join-Path $AppName 'logs')
$offset = 0
$last = Get-ChildItem -Path $logDir -Filter 'app-*.log' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($last) { $offset = $last.Length }

# 1. Launch
try {
  if ($ExeArgs) { $p = Start-Process -FilePath $Exe -ArgumentList $ExeArgs -PassThru } else { $p = Start-Process -FilePath $Exe -PassThru }
} catch {
  Step $false 'launch' $_.Exception.Message
  Write-Output 'RESULT: KO'
  exit 1
}
Step $true 'launch' ("pid {0}" -f $p.Id)

# 2. A window must be visible
$state = $null
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 500
  if ($p.HasExited) { break }
  $state = Get-Shown $p.Id
  if ($state.Shown.Count -gt 0) { break }
}
if ($p.HasExited) {
  Step $false 'window' ("process exited early with code {0}" -f $p.ExitCode)
} elseif ($state.Shown.Count -gt 0) {
  $w = $state.Shown[0]
  Step $true 'window' ("visible, handle {0}, rect {1},{2},{3},{4}" -f $w[0], $w[2], $w[3], $w[4], $w[5])
} else {
  $detail = "no visible on-screen window ($($state.All.Count) top-level windows found)"
  foreach ($w in $state.All) { $detail += ("; handle {0} visible={1} rect {2},{3},{4},{5}" -f $w[0], $w[1], $w[2], $w[3], $w[4], $w[5]) }
  Step $false 'window' $detail
}

# 3. Log
$log = Read-NewLog $logDir $offset
if ($null -eq $log) { Step $false 'log' ("no app-*.log found in {0}" -f $logDir) }
elseif ($log.Lines.Count -gt 0) { Step $false 'log' ("{0}: {1}" -f $log.File, (($log.Lines | Select-Object -First 10) -join ' | ')) }
else { Step $true 'log' ("{0}: no error line since launch" -f $log.File) }

# 4. Commands through UI Automation
function Invoke-Id([string]$id) {
  if (-not $state -or $state.Shown.Count -eq 0) { return 'no window' }
  $root = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]$state.Shown[0][0])
  $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty, $id)
  $el = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
  if ($null -eq $el) { return 'element not found' }
  if (-not $el.Current.IsEnabled) { return 'element disabled (command binding may resolve to null)' }
  $pat = $null
  if (-not $el.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pat)) { return 'no InvokePattern' }
  $pat.Invoke()
  return $null
}
if ($Ids) {
  foreach ($id in ($Ids -split ',' | Where-Object { $_ })) {
    try { $err = Invoke-Id $id } catch { $err = $_.Exception.Message }
    if ($err) { Step $false ("command " + $id) $err } else { Step $true ("command " + $id) 'invoked' }
    Start-Sleep -Milliseconds 300
  }
}

# 5. Theme toggle, then windows and log again
if ($ThemeToggle) {
  try { $err = Invoke-Id $ThemeToggle } catch { $err = $_.Exception.Message }
  if ($err) { Step $false 'theme toggle' $err }
  else {
    Start-Sleep -Milliseconds 1000
    $after = Get-Shown $p.Id
    $log2 = Read-NewLog $logDir $offset
    $bad = ($after.Shown.Count -eq 0) -or ($log2 -and $log2.Lines.Count -gt 0)
    Step (-not $bad) 'theme toggle' ("window visible after toggle: {0}; error lines in log: {1}" -f ($after.Shown.Count -gt 0), $(if ($log2) { $log2.Lines.Count } else { 0 }))
  }
}

# 6. Close and confirm the process exits
if (-not $p.HasExited) {
  [void]$p.CloseMainWindow()
  if ($p.WaitForExit(10000)) { Step $true 'exit' ("process exited with code {0}" -f $p.ExitCode) }
  else { Step $false 'exit' 'process survived CloseMainWindow (a window is still open); killed'; $p.Kill() }
}

if ($script:fail) { Write-Output 'RESULT: KO'; exit 1 } else { Write-Output 'RESULT: OK'; exit 0 }
`;

const dir = mkdtempSync(join(tmpdir(), "acceptance-run-"));
const script = join(dir, "run.ps1");
writeFileSync(script, "\ufeff" + PS, "utf8");
const r = spawnSync(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Exe", exe, "-AppName", appName, "-ExeArgs", opt("--args"), "-Ids", opt("--ids"), "-ThemeToggle", opt("--theme-toggle")],
  { encoding: "utf8", timeout: 5 * 60 * 1000 },
);
rmSync(dir, { recursive: true, force: true });
process.stdout.write(r.stdout ?? "");
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
