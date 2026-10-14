/**
 * Merges multi-platform Tauri v2 updater manifests or synthesizes latest.json
 * from compiled updater packages (.tar.gz, .exe, .sig).
 *
 * Scans directories (mac-artifacts, win-artifacts, target) for platform files,
 * combines platform entries into a single dictionary, and writes ./latest.json.
 */
import fs from "node:fs";
import path from "node:path";

/**
 * Finds all files matching a specific regex or filter recursively.
 *
 * @param {string} dir - Directory to search.
 * @param {RegExp} pattern - Regex to match file names.
 * @returns {string[]} List of matching absolute file paths.
 */
function findFilesByPattern(dir, pattern) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findFilesByPattern(full, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Combines updater manifest files into a single unified JSON object,
 * or synthesizes one if individual latest.json files are not present.
 */
function generateOrMergeManifest() {
  const dirsToSearch = ["mac-artifacts", "win-artifacts", "src-tauri/target", "."];
  const manifestFiles = [];

  for (const dir of dirsToSearch) {
    const found = findFilesByPattern(dir, /^latest\.json$/i);
    for (const f of found) {
      if (path.resolve(f) !== path.resolve("latest.json") && !manifestFiles.includes(f)) {
        manifestFiles.push(f);
      }
    }
  }

  let merged = null;

  if (manifestFiles.length > 0) {
    console.log(`Discovered ${manifestFiles.length} updater manifest(s):`, manifestFiles);
    for (const file of manifestFiles) {
      try {
        const content = JSON.parse(fs.readFileSync(file, "utf8"));
        if (!merged) {
          merged = { ...content, platforms: { ...(content.platforms || {}) } };
        } else {
          merged.version = content.version || merged.version;
          merged.notes = content.notes || merged.notes;
          merged.pub_date = content.pub_date || merged.pub_date;
          merged.platforms = {
            ...merged.platforms,
            ...(content.platforms || {}),
          };
        }
      } catch (err) {
        console.warn(`Error parsing ${file}:`, err.message);
      }
    }
  }

  // Determine current app version and tag
  let version = "0.1.2";
  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    if (pkg.version) version = pkg.version;
  } catch {}

  const rawTag = process.env.TAG_NAME || process.env.GITHUB_REF_NAME || `v${version}`;
  const tag = rawTag.startsWith("v") ? rawTag : `v${rawTag}`;

  if (!merged) {
    merged = {
      version: version,
      notes: `Foldy ${tag} release with live updater support.`,
      pub_date: new Date().toISOString(),
      platforms: {},
    };
  }

  // Look for macOS signature and package
  const macSigFiles = [];
  for (const dir of dirsToSearch) {
    macSigFiles.push(...findFilesByPattern(dir, /\.tar\.gz\.sig$/i));
  }
  if (macSigFiles.length > 0) {
    const sigPath = macSigFiles[0];
    const signature = fs.readFileSync(sigPath, "utf8").trim();
    const tarGzName = path.basename(sigPath, ".sig");
    const downloadUrl = `https://github.com/rayynaldgitau/Folderly-/releases/download/${tag}/${tarGzName}`;

    merged.platforms["darwin-x86_64"] = {
      signature,
      url: downloadUrl,
    };
    merged.platforms["darwin-aarch64"] = {
      signature,
      url: downloadUrl,
    };
    console.log(`Attached macOS platforms from: ${sigPath}`);
  }

  // Look for Windows signature and package (.exe.sig, .msi.sig, or .nsis.zip.sig)
  const winSigFiles = [];
  for (const dir of dirsToSearch) {
    winSigFiles.push(...findFilesByPattern(dir, /(-setup\.exe\.sig|\.nsis\.zip\.sig|\.msi\.sig)$/i));
  }
  if (winSigFiles.length > 0) {
    // Prefer -setup.exe.sig if available
    const setupSig = winSigFiles.find((f) => f.includes("setup.exe.sig")) || winSigFiles[0];
    const signature = fs.readFileSync(setupSig, "utf8").trim();
    const installerName = path.basename(setupSig, ".sig");
    const downloadUrl = `https://github.com/rayynaldgitau/Folderly-/releases/download/${tag}/${installerName}`;

    merged.platforms["windows-x86_64"] = {
      signature,
      url: downloadUrl,
    };
    console.log(`Attached Windows platform from: ${setupSig}`);
  }

  const outputPath = path.resolve(process.cwd(), "latest.json");
  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), "utf8");
  console.log(`Successfully generated unified latest.json at: ${outputPath}`);
  console.log(JSON.stringify(merged, null, 2));
}

generateOrMergeManifest();
