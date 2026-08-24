// Prerenders /privacy to a REAL static file at build time.
//
// This site is a client-rendered SPA on GitHub Pages, which has no native
// SPA fallback - a direct hit to any route but "/" 404s at the transport
// level. Copying index.html to 404.html (see package.json's build script)
// fixes that for a HUMAN clicking a link (the browser still gets a 404
// status, but react-router recovers and renders the right page), but a
// crawler or an automated policy check that reads the HTTP status code
// still sees 404 regardless of what the body contains - and Google
// generally won't index a URL that returned 404, no matter how good the
// content is.
//
// Privacy Policy specifically needs to be a real, genuinely-200 page: it's
// required before applying to any ad network, and a reviewer (human or
// automated) checking it is exactly the kind of "direct hit, not a client
// nav" request this script exists to make actually work. The page has no
// per-request dynamic data, so a one-time prerender is enough - no SSR
// server needed for one static page.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as esbuild from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

// Plain node can't import JSX directly - bundle Privacy.jsx (its CSS
// import is a no-op here since only the rendered markup matters) into a
// single importable ESM file first.
const bundleOutfile = join(__dirname, '.privacy-bundle.mjs');
await esbuild.build({
  entryPoints: [join(__dirname, '..', 'src', 'pages', 'Privacy.jsx')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  external: ['react', 'react-dom', 'react-router-dom'],
  outfile: bundleOutfile,
});
const { default: Privacy } = await import(`${bundleOutfile}?t=${Date.now()}`);
rmSync(bundleOutfile, { force: true });

const markup = renderToStaticMarkup(
  React.createElement(MemoryRouter, { initialEntries: ['/privacy'] }, React.createElement(Privacy))
);

const shell = readFileSync(join(distDir, 'index.html'), 'utf8');

const withTitle = shell
  .replace(/<title>[^<]*<\/title>/, '<title>Privacy Policy | NoodleGames</title>')
  .replace(
    /<meta name="description"[^>]*>/,
    '<meta name="description" content="Privacy policy for NoodleGames.co and every game subdomain - what\'s stored locally, the one cross-game cookie, and how to clear it." />'
  )
  .replace('<div id="root"></div>', `<div id="root">${markup}</div>`);

// Write to both /privacy/index.html (the "pretty URL" GitHub Pages
// resolves for a trailing-slash request) and /privacy.html, since which
// one actually answers a bare /privacy request isn't worth gambling on -
// covering both is free.
mkdirSync(join(distDir, 'privacy'), { recursive: true });
writeFileSync(join(distDir, 'privacy', 'index.html'), withTitle);
writeFileSync(join(distDir, 'privacy.html'), withTitle);

console.log('Prerendered /privacy -> dist/privacy/index.html and dist/privacy.html');
