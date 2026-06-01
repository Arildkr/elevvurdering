// Copies Norwegian Hunspell dictionary files from node_modules to public/dictionaries/
// so they can be fetched by the browser-side spell check Web Worker.
// Runs as "postinstall" so Vercel picks them up during npm install.
const fs = require("fs");
const path = require("path");

const dest = path.join(__dirname, "../public/dictionaries");
if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

for (const lang of ["nb", "nn"]) {
  const pkg = path.join(__dirname, `../node_modules/dictionary-${lang}`);
  fs.copyFileSync(path.join(pkg, "index.aff"), path.join(dest, `${lang}.aff`));
  fs.copyFileSync(path.join(pkg, "index.dic"), path.join(dest, `${lang}.dic`));
  console.log(`Copied ${lang} dictionary`);
}
