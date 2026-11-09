import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const environment = { ...process.env, FINORA_BUILD_TARGET: "capacitor" };

const result = spawnSync(npmCommand, ["exec", "--", "next", "build", "--webpack"], {
  stdio: "inherit",
  env: environment,
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
