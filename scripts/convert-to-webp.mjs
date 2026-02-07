import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, "../public");

async function convertImages(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await convertImages(filePath);
    } else if (/\.(jpg|jpeg|png)$/i.test(file)) {
      const outputFilePath = filePath.replace(/\.(jpg|jpeg|png)$/i, ".webp");

      if (!fs.existsSync(outputFilePath)) {
        try {
          await sharp(filePath).webp({ quality: 80 }).toFile(outputFilePath);
          console.log(`Converted: ${filePath} -> ${outputFilePath}`);
        } catch (error) {
          console.error(`Error converting ${filePath}:`, error);
        }
      } else {
        console.log(`Skipped (already exists): ${outputFilePath}`);
      }
    }
  }
}

console.log("Starting image conversion...");
convertImages(publicDir)
  .then(() => {
    console.log("Image conversion complete!");
  })
  .catch((err) => {
    console.error("Fatal error:", err);
  });
