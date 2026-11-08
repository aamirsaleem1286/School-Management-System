const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("[db:down] Stopping any running local MongoDB instances...");

try {
  if (process.platform === "win32") {
    try {
      execSync("taskkill /F /IM mongod.exe", { stdio: "ignore" });
      console.log("[db:down] Terminated mongod.exe processes.");
    } catch {
      // Ignore if no process found
    }
  } else {
    try {
      execSync("killall mongod", { stdio: "ignore" });
      console.log("[db:down] Terminated mongod processes.");
    } catch {
      // Ignore
    }
  }
} catch (e) {
  // Ignore
}

// Clean up stale lock files
const lockFile = path.join(process.cwd(), ".data", "mongodb", "mongod.lock");
if (fs.existsSync(lockFile)) {
  try {
    fs.unlinkSync(lockFile);
    console.log("[db:down] Removed stale mongod.lock file.");
  } catch (e) {
    console.log("[db:down] Could not remove lock file (still held by a process):", e.message);
  }
}

console.log("[db:down] Done. You can now start the app fresh.");
