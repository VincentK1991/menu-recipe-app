import fs from "fs";
import path from "path";

const assetsDir = "assets";
const files = fs.readdirSync(assetsDir);

// Find all hashed HTML files (e.g., pizzaz-list-2d2b.html)
const htmlFiles = files.filter(f => f.match(/^[\w-]+-[a-f0-9]{4}\.html$/));

console.log(`Found ${htmlFiles.length} HTML files to inline`);

for (const htmlFile of htmlFiles) {
  const htmlPath = path.join(assetsDir, htmlFile);
  const htmlContent = fs.readFileSync(htmlPath, "utf8");

  // Extract the base name and hash (e.g., "pizzaz-list" and "2d2b" from "pizzaz-list-2d2b.html")
  const match = htmlFile.match(/^([\w-]+)-([a-f0-9]{4})\.html$/);
  if (!match) continue;

  const [, baseName, hash] = match;
  const jsFile = `${baseName}-${hash}.js`;
  const cssFile = `${baseName}-${hash}.css`;
  const jsPath = path.join(assetsDir, jsFile);
  const cssPath = path.join(assetsDir, cssFile);

  // Read JS and CSS content
  let jsContent = "";
  let cssContent = "";

  if (fs.existsSync(jsPath)) {
    jsContent = fs.readFileSync(jsPath, "utf8");
    console.log(`  ✓ Found ${jsFile} (${(jsContent.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`  ✗ Missing ${jsFile}`);
  }

  if (fs.existsSync(cssPath)) {
    cssContent = fs.readFileSync(cssPath, "utf8");
    console.log(`  ✓ Found ${cssFile} (${(cssContent.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`  ✗ Missing ${cssFile}`);
  }

  // Create inlined HTML
  const inlinedHtml = `<!doctype html>
<html>
<head>
  <style>
${cssContent}
  </style>
  <script type="module">
${jsContent}
  </script>
</head>
<body>
  <div id="${baseName}-root"></div>
</body>
</html>
`;

  // Write the inlined version
  fs.writeFileSync(htmlPath, inlinedHtml, "utf8");
  console.log(`  → Inlined ${htmlFile}`);

  // Also update the non-hashed version if it exists
  const nonHashedHtml = `${baseName}.html`;
  const nonHashedPath = path.join(assetsDir, nonHashedHtml);
  if (fs.existsSync(nonHashedPath)) {
    fs.writeFileSync(nonHashedPath, inlinedHtml, "utf8");
    console.log(`  → Inlined ${nonHashedHtml}`);
  }
}

console.log("\n✅ All HTML files have been inlined with their JS and CSS!");

