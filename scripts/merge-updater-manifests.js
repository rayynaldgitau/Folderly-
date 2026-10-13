/**
 * Merges multi-platform Tauri v2 updater manifests into a unified latest.json.
 *
 * Scans directories (mac-artifacts, win-artifacts) for platform latest.json files,
 * combines their `platforms` entries into a single dictionary, and writes the output.
 *
 * @param searchDirs - Array of directories to search for latest.json files.
 * @param outputFile - Output file path (defaults to ./latest.json).
 */
import fs from "node:fs";
import path from "node:path";

/**
 * Finds all files matching a specific filename recursively.
 *
 * @param {string} dir - Directory to search.
 * @param {string} filename - Target filename.
 * @returns {string[]} List of matching absolute file paths.
 */
function findFiles(dir, filename) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findFiles(full, filename));
    } else if (entry.name.toLowerCase() === filename.toLowerCase()) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Combines updater manifest files into a single unified JSON object.
 */
function mergeManifests() {
  const dirsToSearch = ["mac-artifacts", "win-artifacts", "."];
  const manifestFiles = [];

  for (const dir of dirsToSearch) {
    const found = findFiles(dir, "latest.json");
    for (const f of found) {
      if (!manifestFiles.includes(f)) {
        manifestFiles.push(f);
      }
    }
  }

  console.log(`Discovered ${manifestFiles.length} updater manifest(s):`, manifestFiles);

  if (manifestFiles.length === 0) {
    console.log("No latest.json found to merge.");
    return;
  }

  let merged = null;

  for (const file of manifestFiles) {
    try {
      const content = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!merged) {
        merged = { ...content, platforms: { ...content.platforms } };
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

  if (merged) {
    const outputPath = path.resolve(process.cwd(), "latest.json");
    fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), "utf8");
    console.log(`Successfully generated unified latest.json at: ${outputPath}`);
    console.log(JSON.stringify(merged, null, 2));
  }
}

mergeManifests();
