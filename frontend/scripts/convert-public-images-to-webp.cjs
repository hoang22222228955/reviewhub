const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const PUBLIC_DIR = path.join(__dirname, "..", "public");

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png"]);
const shouldDeleteOriginal = process.argv.includes("--delete");

let converted = 0;
let skipped = 0;
let deleted = 0;
let failed = 0;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

async function convertToWebp(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (!IMAGE_EXTS.has(ext)) {
    skipped++;
    return;
  }

  const outputPath = filePath.replace(/\.(jpg|jpeg|png)$/i, ".webp");

  if (fs.existsSync(outputPath)) {
    skipped++;

    if (shouldDeleteOriginal) {
      fs.unlinkSync(filePath);
      deleted++;
      console.log(`DELETE OLD: ${path.relative(PUBLIC_DIR, filePath)}`);
    }

    return;
  }

  try {
    await sharp(filePath)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 78,
        effort: 4,
      })
      .toFile(outputPath);

    converted++;

    console.log(`WEBP: ${path.relative(PUBLIC_DIR, filePath)} -> ${path.relative(PUBLIC_DIR, outputPath)}`);

    if (shouldDeleteOriginal) {
      fs.unlinkSync(filePath);
      deleted++;
      console.log(`DELETE OLD: ${path.relative(PUBLIC_DIR, filePath)}`);
    }
  } catch (err) {
    failed++;
    console.error(`FAILED: ${filePath}`);
    console.error(err.message);
  }
}

async function main() {
  console.log("=====================================");
  console.log("Convert frontend/public images to WebP");
  console.log("Public dir:", PUBLIC_DIR);
  console.log("Delete original:", shouldDeleteOriginal);
  console.log("=====================================");

  const files = walk(PUBLIC_DIR);

  for (const file of files) {
    await convertToWebp(file);
  }

  console.log("=====================================");
  console.log("DONE");
  console.log("Converted:", converted);
  console.log("Skipped:", skipped);
  console.log("Deleted:", deleted);
  console.log("Failed:", failed);
  console.log("=====================================");
}

main();