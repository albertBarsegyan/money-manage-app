import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const environment = { ...process.env, FINORA_BUILD_TARGET: "capacitor" };

for (const args of [
  ["run", "generate-routes"],
  ["exec", "--", "next", "build", "--webpack"],
]) {
  const result = spawnSync(npmCommand, args, {
    stdio: "inherit",
    env: environment,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
