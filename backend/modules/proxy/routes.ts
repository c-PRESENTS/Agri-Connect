import type { Express } from "express";

export function registerProxyRoutes(app: Express): void {
  // ── Server-side web proxy ──────────────────────────────────────────────────
  // Fetches any URL from the server side (no X-Frame-Options / CSP restrictions
  // from the target host apply here), strips framing-blocker headers, injects
  // a <base> tag so relative resources resolve correctly, and rewrites internal
  // links so further navigation stays inside the proxy tunnel.
  app.get("/api/proxy", async (req, res) => {
    const raw = req.query.url as string;
    if (!raw) return res.status(400).send("Missing ?url= parameter");

    let targetUrl: string;
    try {
      targetUrl = raw.startsWith("http") ? raw : "https://" + raw;
      new URL(targetUrl); // validate
    } catch {
      return res.status(400).send("Invalid URL");
    }

    try {
      const upstream = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
          "Accept-Encoding": "identity",
        },
        redirect: "follow",
      });

      const contentType = upstream.headers.get("content-type") || "text/html";

      // Forward safe headers, drop the framing blockers
      const SKIP = new Set([
        "x-frame-options",
        "content-security-policy",
        "content-security-policy-report-only",
        "x-content-type-options",
        "strict-transport-security",
        "transfer-encoding",
        "content-encoding",
        "connection",
      ]);
      upstream.headers.forEach((val, key) => {
        if (!SKIP.has(key.toLowerCase())) res.setHeader(key, val);
      });
      // Ensure the browser never blocks our re-served page
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");

      if (contentType.includes("text/html")) {
        let html = await upstream.text();
        const origin = new URL(targetUrl).origin;

        // 1. Inject or replace <base> so relative URLs resolve to original host
        if (/<base\s/i.test(html)) {
          html = html.replace(/<base[^>]*>/i, `<base href="${origin}/">`);
        } else {
          html = html.replace(/(<head[^>]*>)/i, `$1<base href="${origin}/">`);
          if (!html.includes("<base")) {
            html = `<base href="${origin}/">` + html;
          }
        }

        // 2. Inject nav-rewriter script so internal links stay in the proxy
        const navScript = `
<script>
(function(){
  var PROXY = '/api/proxy?url=';
  function rewrite(href){
    if(!href) return href;
    // Already a proxy URL — leave it
    if(href.indexOf('/api/proxy') === 0) return href;
    // Fragment-only or JS — leave it
    if(href.startsWith('#') || href.startsWith('javascript:')) return href;
    return PROXY + encodeURIComponent(href);
  }
  // Intercept link clicks
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if(a && a.href && a.href.startsWith('http')){
      e.preventDefault();
      window.location.href = rewrite(a.href);
    }
  }, true);
  // Intercept form submissions
  document.addEventListener('submit', function(e){
    var f = e.target;
    if(f && f.action && f.action.startsWith('http')){
      e.preventDefault();
      f.action = rewrite(f.action);
      f.submit();
    }
  }, true);
})();
</script>`;
        html = html.replace(/<\/body>/i, navScript + "</body>");
        if (!html.includes("</body>")) html += navScript;

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
      } else {
        // Non-HTML assets: stream through as-is
        const buf = await upstream.arrayBuffer();
        res.setHeader("Content-Type", contentType);
        res.send(Buffer.from(buf));
      }
    } catch (err: any) {
      res.status(502).send(
        `<html><body style="font-family:sans-serif;padding:40px;color:#333">
          <h2>Could not reach this site</h2>
          <p>${err.message}</p>
          <p><a href="${targetUrl}" target="_blank">Try opening it in a new tab instead</a></p>
        </body></html>`
      );
    }
  });
}
