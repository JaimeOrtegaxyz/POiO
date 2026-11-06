/**
 * The one server-rendered page: the invite. GET shows a button and never
 * spends the invite (link previews in chat apps fetch URLs; a GET that
 * redeemed would burn the link before the person opens it). POST redeems.
 * Copy lives in src/copy/es-MX.ts. No scripts on the page.
 */
import { INVITE } from '../src/copy/es-MX';

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<link rel="stylesheet" href="/fonts/fonts.css">
<style>
  :root { --ink: #1a1816; --paper: #f4efe4; --page: #ece8df; --red: #c93b36; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100svh; display: grid; place-items: center; padding: 24px 16px;
    background: var(--page); color: var(--ink); font: 500 17px/1.45 'Quicksand', system-ui, sans-serif; }
  main { width: min(440px, 100%); background: var(--paper); border: 2px solid var(--ink); border-radius: 18px; padding: 28px 24px; }
  h1 { font-size: 22px; line-height: 1.25; margin: 0 0 12px; }
  p { margin: 0 0 14px; }
  .small { font-size: 14px; opacity: .75; }
  button, a.button { display: inline-block; font: 700 17px 'Quicksand', sans-serif; padding: 10px 22px; border-radius: 999px;
    border: 2px solid var(--ink); background: var(--ink); color: var(--paper); cursor: pointer; text-decoration: none; }
  button:focus-visible, a:focus-visible { outline: 3px solid var(--red); outline-offset: 3px; }
  a { color: var(--ink); }
</style>
</head>
<body><main>${body}</main></body>
</html>`;
}

export function invitePage(): string {
  return shell(INVITE.title, `
<h1>${esc(INVITE.heading)}</h1>
<p>${esc(INVITE.body)}</p>
<p class="small">${esc(INVITE.once)}</p>
<form method="post"><button type="submit">${esc(INVITE.enter)}</button></form>`);
}

export function inviteUsedPage(): string {
  return shell(INVITE.title, `
<h1>${esc(INVITE.usedHeading)}</h1>
<p>${esc(INVITE.usedBody)}</p>
<p><a href="/">${esc(INVITE.home)}</a></p>`);
}
