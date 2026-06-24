const fs = require("fs");
const path = require("path");

const files = [
  "src/public/pages/ServiceCategory/ServiceCategoryPage.jsx",
  "src/public/pages/ServiceCategory/ServiceOperatorReviewsPage.jsx",
];

for (const file of files) {
  const fullPath = path.join(__dirname, "..", file);

  let content = fs.readFileSync(fullPath, "utf8");

  content = content
    .replace(/\.jpg/g, ".webp")
    .replace(/\.jpeg/g, ".webp")
    .replace(/\.png/g, ".webp");

  fs.writeFileSync(fullPath, content, "utf8");

  console.log("Updated:", file);
}