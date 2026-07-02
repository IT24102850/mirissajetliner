/*
 * tools/convert-images.js
 * - Converts .jpg/.jpeg/.png images under `public/` to .webp alongside the original
 * - Reads image dimensions and injects `width` and `height` attributes into HTML <img> tags that reference the images (if missing)
 * - Adds `loading="lazy"` and `decoding="async"` to <img> tags if missing
 *
 * Usage:
 *   npm install
 *   npm run optimize-images
 *
 * Notes:
 * - This script is conservative: it only edits <img> tags that reference the exact filename (relative path match).
 * - It attempts to be idempotent; running multiple times should not add duplicate attributes.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const glob = require('glob');

const publicDir = path.join(__dirname, '..', 'public');
const imagePatterns = ['**/*.jpg', '**/*.jpeg', '**/*.png'];
const htmlPattern = path.join(publicDir, '**/*.html');

function log(...args) { console.log('[convert-images]', ...args); }

async function convertImageToWebp(fullPath, webpPath) {
  try {
    await sharp(fullPath)
      .webp({ quality: 80 })
      .toFile(webpPath);
    const meta = await sharp(fullPath).metadata();
    return { width: meta.width || null, height: meta.height || null };
  } catch (err) {
    console.error('Error converting', fullPath, err.message);
    return { width: null, height: null };
  }
}

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  log('Scanning images and HTML files...');

  // Collect images
  const images = [];
  for (const pat of imagePatterns) {
    const matches = glob.sync(path.join(publicDir, pat), { nodir: true });
    for (const m of matches) images.push(m);
  }

  if (!images.length) {
    log('No images found to convert.');
    return;
  }

  // Collect HTML files
  const htmlFiles = glob.sync(htmlPattern, { nodir: true });

  log(`Found ${images.length} images and ${htmlFiles.length} HTML files.`);

  for (const imgPath of images) {
    const relImgPath = path.relative(publicDir, imgPath).split(path.sep).join('/');
    const webpPath = imgPath.replace(/\.(jpe?g|png)$/i, '.webp');
    const webpRel = relImgPath.replace(/\.(jpe?g|png)$/i, '.webp');

    // Convert to WebP (if missing or older)
    let convert = true;
    try {
      const webpStat = fs.statSync(webpPath);
      const imgStat = fs.statSync(imgPath);
      if (webpStat.mtimeMs >= imgStat.mtimeMs) convert = false;
    } catch (e) {
      convert = true;
    }

    let dims = { width: null, height: null };
    if (convert) {
      log('Converting to webp:', relImgPath, '->', webpRel);
      dims = await convertImageToWebp(imgPath, webpPath);
    } else {
      try {
        const meta = await sharp(imgPath).metadata();
        dims.width = meta.width || null;
        dims.height = meta.height || null;
      } catch (e) {
        // ignore
      }
    }

    // If we obtained dimensions, inject into HTML img tags that reference this filename
    if (dims.width && dims.height) {
      const fileBasename = path.basename(relImgPath);
      const fileRegex = new RegExp(escapeForRegex(relImgPath), 'g');

      for (const htmlFile of htmlFiles) {
        let content = fs.readFileSync(htmlFile, 'utf8');
        // Find <img ... src="(relImgPath|./relImgPath|../...relImgPath)" ...>
        // We'll search for occurrences of the exact relative path string in src attributes and then backfill attributes into that tag.
        if (!fileRegex.test(content)) continue;

        let changed = false;
        // Regex to find <img ... src=['"]...relImgPath['"][^>]*>
        const imgTagRegex = new RegExp('<img([^>]*)src=(\\"|\\\')([^\"\']*' + escapeForRegex(fileBasename) + ')[\\"\\']([^>]*)>', 'gi');
        content = content.replace(imgTagRegex, (match, beforeAttrs, quote, srcValue, afterAttrs) => {
          let attrs = (beforeAttrs + ' ' + afterAttrs).trim();

          // If width or height already present, skip injecting dims
          if (!/\bwidth\s*=\s*"?\d+"?/i.test(attrs) && !/\bheight\s*=\s*"?\d+"?/i.test(attrs)) {
            attrs = attrs + ` width=\"${dims.width}\" height=\"${dims.height}\"`;
            changed = true;
          }

          // Ensure loading="lazy" and decoding="async"
          if (!/\bloading\s*=\s*"?lazy"?/i.test(attrs)) {
            attrs = attrs + ' loading=\"lazy\"';
            changed = true;
          }
          if (!/\bdecoding\s*=\s*"?async"?/i.test(attrs)) {
            attrs = attrs + ' decoding=\"async\"';
            changed = true;
          }

          // Rebuild tag
          const rebuilt = `<img ${attrs} src=${quote}${srcValue}${quote}>`;
          return rebuilt;
        });

        if (changed) {
          fs.writeFileSync(htmlFile, content, 'utf8');
          log('Updated HTML attributes in', path.relative(publicDir, htmlFile));
        }
      }
    } else {
      log('No dimensions for', relImgPath, '; skipping HTML injection.');
    }
  }

  log('Image conversion and HTML injection complete.');
  log('Next steps: review generated .webp files in `public/` and consider updating templates to prefer webp via <picture> or srcset.');
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
