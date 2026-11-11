#!/usr/bin/env python3
"""Build the BJ Beyond Journal data and static HTML.

Standard library only, so it runs on a bare GitHub Actions runner.

  python3 studio/scripts/build_feed.py            # fetch everything, write JSON, render HTML
  python3 studio/scripts/build_feed.py --render   # re-render HTML from existing JSON only

Writes:
  studio/data/articles.json  BJ Beyond's own articles, cross-posts merged
  studio/data/news.json      external headlines (title, source, date, link only)
  studio/index.html          the blocks between <!-- build:NAME --> markers

Rules this script keeps:
  * Titles, dates and deks are read from the platforms. Nothing is written by hand.
    A field that cannot be read is left out, never guessed.
  * News items carry title, source, date and link. No article text is copied.
  * If a source fails, the entries it produced last time are kept, so one
    flaky feed never empties the page.
"""
from __future__ import annotations

import datetime as dt
import email.utils
import html
import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]          # studio/
DATA = ROOT / "data"
INDEX = ROOT / "index.html"
SITE_URL = "https://bjbeyond81.github.io/studio/"
# Public subscription URLs. Cloudflare counts requests on these; the files
# written below stay the uncounted github.io mirrors.
ARTICLES_FEED_URL = "https://bjbeyond.it/journal/feed.xml"
NEWS_FEED_URL = "https://bjbeyond.it/journal/news.xml"
UA = "Mozilla/5.0 (compatible; BJBeyondJournal/1.0; +https://bjbeyond81.github.io/studio/)"
ROME = dt.timezone(dt.timedelta(hours=1))  # date-only output; DST shift never moves a 18:00 UTC post across midnight
PLATFORM_ORDER = ["HackerNoon", "bjbeyond.it", "Substack", "Medium", "BJ Beyond Journal"]
NS = {"content": "http://purl.org/rss/1.0/modules/content/", "dc": "http://purl.org/dc/elements/1.1/"}

CFG = json.loads((DATA / "sources.json").read_text("utf-8"))
log = lambda *a: print(*a, file=sys.stderr)


# ---------------------------------------------------------------- utilities
def fetch(url: str, tries: int = 3) -> str:
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f"fetch failed {url}: {last}")


def text(s: str | None) -> str:
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def brand(s: str) -> str:
    """The brand is always written 'BJ Beyond'."""
    return re.sub(r"\bB[j] Beyond\b", "BJ Beyond", s or "")


def clean_url(u: str) -> str:
    u = u.split("?")[0].split("#")[0]
    return u


def strip_tracking(u: str) -> str:
    p = urllib.parse.urlsplit(u)
    q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query) if not k.lower().startswith(("utm_", "mc_")) and k.lower() not in ("source", "ref")]
    return urllib.parse.urlunsplit((p.scheme, p.netloc, p.path, urllib.parse.urlencode(q), ""))


def key_for(url: str) -> str:
    """Slug used to merge the same piece across platforms (Medium adds a hash)."""
    path = urllib.parse.urlparse(clean_url(url)).path.rstrip("/")
    slug = path.rsplit("/", 1)[-1]
    return re.sub(r"-[0-9a-f]{10,12}$", "", slug)


def rfc822_date(s: str) -> str | None:
    try:
        return email.utils.parsedate_to_datetime(s).astimezone(ROME).date().isoformat()
    except Exception:  # noqa: BLE001
        return None


def reading_minutes(words: int) -> int | None:
    return max(1, math.ceil(words / 238)) if words >= 150 else None


def first_sentence_block(html_body: str) -> str | None:
    """First paragraph-like block of an article body (Medium puts the subtitle first)."""
    for m in re.finditer(r"<(h3|h4|p)[^>]*>(.*?)</\1>", html_body or "", re.S):
        t = text(m.group(2))
        if len(t) > 25:
            return t
    return None


def excluded(title: str) -> bool:
    return any(re.search(p, title or "") for p in CFG.get("exclude_title_patterns", []))


# ---------------------------------------------------------------- sources
def from_hackernoon() -> list[dict]:
    a = CFG["author"]
    page = fetch(a["hackernoon_profile"])
    nd = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', page, re.S).group(1))
    stories = nd["props"]["pageProps"]["data"].get("profileStories", [])
    out = []
    for s in stories:
        handle = (s.get("profile") or {}).get("handle") if isinstance(s.get("profile"), dict) else None
        if handle and handle != a["hackernoon_handle"]:
            continue
        url = f"https://hackernoon.com/{s['slug']}"
        item = {"platform": "HackerNoon", "url": url, "title": s.get("title"),
                "tags": [t.replace("-", " ") for t in (s.get("tags") or [])][:4]}
        if s.get("estimatedTime"):
            item["minutes"] = int(s["estimatedTime"])
        if s.get("publishedAt"):
            item["date"] = dt.datetime.fromtimestamp(float(s["publishedAt"]), ROME).date().isoformat()
        try:  # the story page has the author's own description and the publish date
            sp = fetch(url)
            d = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', sp, re.S).group(1))["props"]["pageProps"]["data"]
            item["dek"] = text(d.get("excerpt")) or None
            item["date"] = d.get("datePublished") or item.get("date")
            item["tags"] = [t.replace("-", " ") for t in (d.get("tags") or [])][:4] or item["tags"]
            img = d.get("mainImage") or ""
            if img.startswith("http"):
                item["image"] = img
        except Exception as e:  # noqa: BLE001
            log("  hackernoon story", url, e)
        out.append(item)
    return out


def rss_items(feed_url: str) -> list[ET.Element]:
    root = ET.fromstring(fetch(feed_url).encode("utf-8"))
    return root.findall("./channel/item")


def from_medium() -> list[dict]:
    out = []
    for it in rss_items(CFG["author"]["medium_feed"]):
        body = it.findtext("content:encoded", "", NS)
        desc = text(it.findtext("description", ""))
        desc = re.sub(r"\s*Continue reading on Medium.*$", "", desc).strip()
        item = {"platform": "Medium", "url": clean_url(it.findtext("link", "")),
                "title": text(it.findtext("title")), "date": rfc822_date(it.findtext("pubDate", "")),
                "dek": desc or first_sentence_block(body),
                "tags": [c.text.replace("-", " ") for c in it.findall("category") if c.text][:4]}
        if body:
            item["minutes"] = reading_minutes(len(text(body).split()))
        out.append(item)
    return out


def from_substack() -> list[dict]:
    out = []
    for it in rss_items(CFG["author"]["substack_feed"]):
        body = it.findtext("content:encoded", "", NS)
        item = {"platform": "Substack", "url": clean_url(it.findtext("link", "")),
                "title": text(it.findtext("title")), "date": rfc822_date(it.findtext("pubDate", "")),
                "dek": text(it.findtext("description")) or None}
        enc = it.find("enclosure")
        if enc is not None and (enc.get("type") or "").startswith("image/"):
            item["image"] = enc.get("url")
        if body:
            item["minutes"] = reading_minutes(len(text(body).split()))
        out.append(item)
    return out


def from_site() -> list[dict]:
    a = CFG["author"]
    locs = re.findall(r"<loc>(.*?)</loc>", fetch(a["site_sitemap"]))
    out = []
    for loc in locs:
        path = urllib.parse.urlparse(loc).path
        if not any(path.startswith(p) and len(path) > len(p) for p in a["site_article_prefixes"]):
            continue
        try:
            page = fetch(loc)
        except Exception as e:  # noqa: BLE001
            log("  site page", loc, e); continue
        post = None
        for block in re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', page, re.S):
            try:
                data = json.loads(block)
            except Exception:  # noqa: BLE001
                continue
            nodes = data.get("@graph", [data]) if isinstance(data, dict) else data
            for n in nodes if isinstance(nodes, list) else []:
                if isinstance(n, dict) and n.get("@type") in ("BlogPosting", "Article") and n.get("datePublished"):
                    post = post or n
        if not post:
            continue
        item = {"platform": "bjbeyond.it", "url": loc, "title": text(post.get("headline") or post.get("name")),
                "date": str(post["datePublished"])[:10],
                "dek": text((re.search(r'<meta name="description" content="([^"]*)"', page) or [None, ""])[1]) or text(post.get("description")) or None,
                "lang": (post.get("inLanguage") or ("it" if path.startswith("/it/") else "en"))[:2]}
        out.append(item)
    return out


def local_journal() -> dict[str, str]:
    """canonical URL -> local Journal path, for the pages under studio/articles/."""
    found = {}
    for f in sorted((ROOT / "articles").glob("*/index.html")):
        m = re.search(r'rel="canonical" href="([^"]+)"', f.read_text("utf-8"))
        if m:
            found[clean_url(m.group(1)).rstrip("/")] = f"articles/{f.parent.name}/"
    return found


# ---------------------------------------------------------------- merge
def merge(raw: list[dict]) -> list[dict]:
    aliases = {clean_url(k).rstrip("/"): clean_url(v).rstrip("/")
               for k, v in CFG.get("merge", {}).items() if not k.startswith("_")}
    groups: dict[str, list[dict]] = {}
    for it in raw:
        if not it.get("url") or not it.get("title") or excluded(it["title"]):
            continue
        u = clean_url(it["url"]).rstrip("/")
        target = aliases.get(u, u)
        k = key_for(target)
        groups.setdefault(k, []).append(it)

    rank = lambda it: PLATFORM_ORDER.index(it["platform"]) if it["platform"] in PLATFORM_ORDER else 99
    journal = local_journal()
    extra = {clean_url(k).rstrip("/"): v for k, v in CFG.get("extra_links", {}).items() if not k.startswith("_")}
    entries = []
    for k, items in groups.items():
        items.sort(key=rank)
        lead = items[0]
        dates = sorted(i["date"] for i in items if i.get("date"))
        e = {"id": k, "title": brand(lead["title"])}
        if dates:
            e["date"] = dates[0]
        dek = next((i["dek"] for i in items if i.get("dek")), None)
        if dek:
            e["dek"] = brand(dek)
        mins = next((i["minutes"] for i in items if i.get("minutes")), None)
        if mins:
            e["minutes"] = mins
        tags = next((i["tags"] for i in items if i.get("tags")), None)
        if tags:
            e["tags"] = tags
        img = next((i["image"] for i in items if i.get("image")), None)
        if img:
            e["image"] = img
        lang = next((i["lang"] for i in items if i.get("lang")), "en")
        e["lang"] = lang
        e["links"] = []
        seen = set()
        for i in items:
            u = clean_url(i["url"])
            if u in seen:
                continue
            seen.add(u)
            link = {"platform": i["platform"], "url": u}
            if i["title"] != lead["title"]:
                link["title"] = brand(i["title"])
            if i.get("date"):
                link["date"] = i["date"]
            if i.get("lang") and i["lang"] != lang:
                link["lang"] = i["lang"]
            e["links"].append(link)
        for i in list(e["links"]):
            j = journal.get(i["url"].rstrip("/"))
            if j and not any(l["platform"] == "BJ Beyond Journal" for l in e["links"]):
                e["links"].append({"platform": "BJ Beyond Journal", "url": j})
        for u, meta in extra.items():
            if key_for(aliases.get(u, u)) == k and not any(l["url"].rstrip("/") == u for l in e["links"]):
                e["links"].append({"platform": meta["platform"], "url": u + "/", "label": meta.get("label")})
        e["platforms"] = sorted({l["platform"] for l in e["links"]}, key=lambda p: PLATFORM_ORDER.index(p) if p in PLATFORM_ORDER else 99)
        entries.append(e)
    entries.sort(key=lambda e: e.get("date", ""), reverse=True)
    return entries


# ---------------------------------------------------------------- news
def load_blocklist() -> dict:
    p = DATA / "blocklist.json"
    d = json.loads(p.read_text("utf-8")) if p.exists() else {}
    return {"sources": {x.strip().lower() for x in d.get("sources", [])},
            "domains": {x.strip().lower().lstrip(".") for x in d.get("domains", [])},
            "urls": {clean_url(x).rstrip("/") for x in d.get("urls", [])}}


def blocked(item: dict, bl: dict) -> bool:
    host = (urllib.parse.urlparse(item.get("url", "")).hostname or "").lower()
    return ((item.get("source") or "").strip().lower() in bl["sources"]
            or any(host == d or host.endswith("." + d) for d in bl["domains"])
            or clean_url(item.get("url", "")).rstrip("/") in bl["urls"])


def from_news() -> list[dict]:
    """Official publisher feeds only. Keeps title, source, date, link; drops everything else."""
    n = CFG["news"]
    block = [re.compile(p) for p in n["block_title_patterns"]]
    kw = re.compile(n["detection_keywords"])
    strict = re.compile(n.get("strict_keywords", n["detection_keywords"]))
    bl = load_blocklist()
    cutoff = (dt.datetime.now(ROME) - dt.timedelta(days=n["max_age_days"])).date().isoformat()
    atom = "{http://www.w3.org/2005/Atom}"
    items = []
    for f in n["feeds"]:
        try:
            raw = fetch(f["url"])
            # some feeds use HTML named entities (&nbsp;) that XML does not define
            raw = re.sub(r"&([A-Za-z][A-Za-z0-9]+);",
                         lambda m: m.group(0) if m.group(1) in ("amp", "lt", "gt", "quot", "apos")
                         else html.escape(html.unescape(m.group(0)), quote=False), raw)
            root = ET.fromstring(raw.encode("utf-8"))
        except Exception as e:  # noqa: BLE001
            log("  news feed failed", f["name"], e); continue
        entries = root.findall("./channel/item") or root.findall(f"{atom}entry")
        for it in entries:
            title = text(it.findtext("title") or it.findtext(f"{atom}title"))
            summary = text(it.findtext("description") or it.findtext(f"{atom}summary") or "")
            # detection feeds: title or summary (summary is read to filter only, never stored);
            # general AI feeds: title (broad keywords) or summary (strict keywords only)
            is_det = (bool(kw.search(title + " " + summary)) if f["mode"] == "detection"
                      else bool(kw.search(title) or strict.search(summary)))
            if f["mode"] == "detection" and not is_det:
                continue
            link = (it.findtext("link") or "").strip()
            if not link:
                le = it.find(f"{atom}link[@rel='alternate']")
                le = le if le is not None else it.find(f"{atom}link")
                link = le.get("href", "") if le is not None else ""
            date = (rfc822_date(it.findtext("pubDate") or "")
                    or (it.findtext(f"{atom}published") or it.findtext(f"{atom}updated") or "")[:10] or None)
            items.append({"title": title, "source": f["name"], "url": strip_tracking(link),
                          "date": date, "topic": "AI detection" if is_det else "AI"})

    per_source = n.get("max_per_source", 4)
    counts: dict[str, int] = {}
    seen, ok = set(), []
    for i in sorted(items, key=lambda i: i.get("date") or "", reverse=True):
        if not i["title"] or not i["url"].startswith("http") or not i.get("date") or i["date"] < cutoff:
            continue
        if any(b.search(i["title"]) for b in block) or re.search(r"(?i)bj ?beyond", i["title"]) or blocked(i, bl):
            continue
        k = re.sub(r"[^a-z0-9]+", " ", i["title"].lower()).strip()[:80]
        if k in seen or i["url"] in seen:
            continue
        if counts.get(i["source"], 0) >= per_source:
            continue
        counts[i["source"]] = counts.get(i["source"], 0) + 1
        seen.update({k, i["url"]})
        ok.append(i)
    det = [i for i in ok if i["topic"] == "AI detection"][: n["max_items"]]
    rest = [i for i in ok if i["topic"] != "AI detection"][: max(0, n["max_items"] - len(det))]
    return sorted(det + rest, key=lambda i: i["date"], reverse=True)


# ---------------------------------------------------------------- render
def esc(s) -> str:
    return html.escape(str(s or ""), quote=True)


def fmt_date(d: str | None) -> str:
    if not d:
        return ""
    y, m, dd = map(int, d.split("-"))
    return dt.date(y, m, dd).strftime("%d %b %Y").lstrip("0")


def link_attrs(url: str) -> str:
    return '' if not url.startswith("http") else ' target="_blank" rel="noopener noreferrer"'


def primary_link(e: dict) -> dict:
    return next((l for l in e["links"] if l["platform"] == "BJ Beyond Journal"), e["links"][0])



def annotation_map() -> dict:
    raw = CFG.get("annotations") or {}
    return {clean_url(k).rstrip("/"): v for k, v in raw.items() if not str(k).startswith("_")}


def apply_annotations(entries: list[dict]) -> None:
    """Attach durable notes from sources.json. Does not change title, date or dek."""
    notes = annotation_map()
    if not notes:
        return
    aliases = {clean_url(k).rstrip("/"): clean_url(v).rstrip("/")
               for k, v in CFG.get("merge", {}).items() if not k.startswith("_")}
    for e in entries:
        urls = set()
        for l in e.get("links", []):
            u = clean_url(l["url"]).rstrip("/")
            urls.add(u)
            urls.add(aliases.get(u, u))
        meta = next((notes[u] for u in urls if u in notes), None)
        if not meta:
            # Drop a note whose annotation was removed or moved to another URL.
            e.pop("note", None)
            e.pop("note_links", None)
            continue
        if meta.get("note"):
            e["note"] = meta["note"]
        if meta.get("links"):
            e["note_links"] = meta["links"]


def render_platforms(e: dict) -> str:
    parts = []
    for l in e["links"]:
        label = l.get("label") or l["platform"] + (f" ({l['lang'].upper()})" if l.get("lang") else "")
        parts.append(f'<a class="pf" href="{esc(l["url"])}"{link_attrs(l["url"])}>{esc(label)}</a>')
    return '<span class="pfs">' + "".join(parts) + "</span>"


def render_meta(e: dict) -> str:
    bits = []
    if e.get("date"):
        bits.append(f'<time datetime="{esc(e["date"])}">{esc(fmt_date(e["date"]))}</time>')
    if e.get("minutes"):
        bits.append(f'<span>{e["minutes"]} min read</span>')
    if e.get("lang") and e["lang"] != "en":
        bits.append(f'<span>{esc(e["lang"].upper())}</span>')
    return '<p class="label meta tabular">' + '<span class="sep" aria-hidden="true"></span>'.join(bits) + "</p>"


def render_note(e: dict) -> str:
    if not e.get("note"):
        return ""
    links = ""
    if e.get("note_links"):
        parts = [f'<a class="pf" href="{esc(l["url"])}"{link_attrs(l["url"])}>{esc(l.get("label") or l.get("platform") or "Link")}</a>' for l in e["note_links"]]
        links = ' <span class="pfs">' + "".join(parts) + "</span>"
    return f'<p class="label note">{esc(e["note"])}{links}</p>'


def render_featured(e: dict) -> str:
    pl = primary_link(e)
    cover = local_cover(e)
    img = (f'<a class="feat-img" href="{esc(pl["url"])}"{link_attrs(pl["url"])} tabindex="-1" aria-hidden="true">'
           f'<img src="{esc(cover)}" alt="" width="1200" height="675" loading="eager" decoding="async"></a>') if cover else ""
    dek = f'<p class="lede">{esc(e["dek"])}</p>' if e.get("dek") else ""
    note = render_note(e)
    return f'''<article class="feat" data-platforms="{esc(' '.join(e['platforms']))}">
  {img}
  <div class="feat-body">
    <p class="label eyebrow amber"><span class="dot" aria-hidden="true"></span>Latest</p>
    {render_meta(e)}
    <h2 class="feat-title"><a href="{esc(pl["url"])}"{link_attrs(pl["url"])}>{esc(e["title"])}</a></h2>
    {dek}
    {note}
    <div class="row-foot">{render_platforms(e)}</div>
  </div>
</article>'''


def render_list(entries: list[dict]) -> str:
    rows = []
    for n, e in enumerate(entries, 1):
        pl = primary_link(e)
        dek = f'<p class="dek">{esc(e["dek"])}</p>' if e.get("dek") else ""
        note = render_note(e)
        tags = ('<p class="label tags">' + "".join(f"<span>{esc(t)}</span>" for t in e["tags"]) + "</p>") if e.get("tags") else ""
        rows.append(f'''<li class="row" data-platforms="{esc(' '.join(e['platforms']))}">
  <div class="row-side">
    <p class="label idx tabular" aria-hidden="true">{n:02d}</p>
    {render_meta(e)}
  </div>
  <div class="row-main">
    <h3 class="row-title"><a href="{esc(pl["url"])}"{link_attrs(pl["url"])}>{esc(e["title"])}</a></h3>
    {dek}
    {note}
    <div class="row-foot">{render_platforms(e)}{tags}</div>
  </div>
</li>''')
    return "\n".join(rows)


def render_filters(entries: list[dict]) -> str:
    counts: dict[str, int] = {}
    for e in entries:
        for p in e["platforms"]:
            counts[p] = counts.get(p, 0) + 1
    order = sorted(counts, key=lambda p: PLATFORM_ORDER.index(p) if p in PLATFORM_ORDER else 99)
    btn = lambda v, label, c, on: (f'<button type="button" class="chip label" data-filter="{esc(v)}" aria-pressed="{"true" if on else "false"}">'
                                  f'{esc(label)} <span class="tabular">{c}</span></button>')
    return btn("all", "All", len(entries), True) + "".join(btn(p, p, counts[p], False) for p in order)


def render_news(news: list[dict]) -> str:
    if not news:
        return '<li class="news-empty label">No headlines right now.</li>'
    rows = []
    for i in news:
        rows.append(f'''<li class="news-item">
  <a href="{esc(i["url"])}" target="_blank" rel="noopener noreferrer external nofollow">
    <span class="label news-meta tabular"><span class="src">{esc(i.get("source") or "Source")}</span><span class="sep" aria-hidden="true"></span><time datetime="{esc(i.get("date"))}">{esc(fmt_date(i.get("date")))}</time>{'<span class="sep" aria-hidden="true"></span><span class="topic">' + esc(i["topic"]) + '</span>' if i.get("topic") == "AI detection" else ""}</span>
    <span class="news-title">{esc(i["title"])}</span>
    <span class="label ext" aria-hidden="true">External ↗</span>
  </a>
</li>''')
    return "\n".join(rows)


def render_jsonld(entries: list[dict]) -> str:
    posts = []
    for e in entries:
        p = {"@type": "BlogPosting", "headline": e["title"], "url": next((l["url"] for l in e["links"] if l["url"].startswith("http")), SITE_URL),
             "author": {"@id": "https://bjbeyond.it/#person"}, "inLanguage": e.get("lang", "en")}
        if e.get("date"):
            p["datePublished"] = e["date"]
        if e.get("dek"):
            p["description"] = e["dek"]
        same = [l["url"] if l["url"].startswith("http") else SITE_URL + l["url"] for l in e["links"]]
        if len(same) > 1:
            p["sameAs"] = same
        posts.append(p)
    graph = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": SITE_URL + "#page", "url": SITE_URL, "name": "BJ Beyond Journal",
         "description": "Every essay and public experiment by BJ Beyond, collected in one index.",
         "isPartOf": {"@id": "https://bjbeyond.it/#website"}, "about": {"@id": "https://bjbeyond.it/#person"},
         "mainEntity": {"@id": SITE_URL + "#blog"}},
        {"@type": "Blog", "@id": SITE_URL + "#blog", "name": "BJ Beyond Journal", "url": SITE_URL,
         "author": {"@id": "https://bjbeyond.it/#person"}, "blogPost": posts},
        {"@type": "Person", "@id": "https://bjbeyond.it/#person", "name": "BJ Beyond", "url": "https://bjbeyond.it",
         "homeLocation": "Verona, Italy",
         "sameAs": ["https://hackernoon.com/u/bj_beyond", "https://medium.com/@bj_beyond", "https://bjbeyond.substack.com"]},
    ]}
    return json.dumps(graph, ensure_ascii=False, indent=1).replace("</", "<\\/")


def replace_block(doc: str, name: str, content: str, inline: bool = False) -> str:
    pat = re.compile(rf"(<!-- build:{name} -->)(.*?)(<!-- /build:{name} -->)", re.S)
    if not pat.search(doc):
        raise SystemExit(f"marker build:{name} missing in index.html")
    nl = "" if inline else "\n"
    return pat.sub(lambda m: m.group(1) + nl + content + nl + m.group(3), doc)


def local_cover(e: dict) -> str | None:
    """Copy the featured article's own cover into assets/covers/, so the page loads nothing from third parties."""
    if not e.get("image"):
        return None
    ext = ".png" if ".png" in e["image"].lower() else ".jpg"
    dest = ROOT / "assets" / "covers" / f"{e['id'][:60]}{ext}"
    if not dest.exists():
        try:
            req = urllib.request.Request(e["image"], headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=25) as r:
                data = r.read()
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
        except Exception as err:  # noqa: BLE001
            log("  cover download failed", err); return None
    for old in dest.parent.glob("*"):
        if old != dest:
            old.unlink()
    return f"assets/covers/{dest.name}"


def render(articles: dict, news: dict) -> None:
    entries = articles["articles"]
    apply_annotations(entries)
    bl = load_blocklist()   # re-applied at render time, so a --render after editing the blocklist is enough
    news = dict(news, items=[i for i in news.get("items", []) if not blocked(i, bl)])
    doc = INDEX.read_text("utf-8")
    doc = replace_block(doc, "featured", render_featured(entries[0]) if entries else "")
    doc = replace_block(doc, "filters", render_filters(entries))
    doc = replace_block(doc, "articles", render_list(entries))
    doc = replace_block(doc, "news", render_news(news["items"]))
    doc = replace_block(doc, "count", str(len(entries)), inline=True)
    doc = replace_block(doc, "updated", f'<time datetime="{esc(articles["updated"])}">{esc(fmt_date(articles["updated"][:10]))}</time>', inline=True)
    doc = replace_block(doc, "news-updated", f'<time datetime="{esc(news["updated"])}">{esc(fmt_date(news["updated"][:10]))}</time>', inline=True)
    doc = replace_block(doc, "jsonld", f'<script type="application/ld+json">\n{render_jsonld(entries)}\n</script>')
    INDEX.write_text(doc, "utf-8")
    render_rss(articles, news)


# ---------------------------------------------------------------- RSS
def rfc822(d: str | None, fallback: str) -> str:
    if d and len(d) == 10:
        y, m, dd = map(int, d.split("-"))
        return email.utils.format_datetime(dt.datetime(y, m, dd, 12, 0, tzinfo=dt.timezone.utc))
    return email.utils.format_datetime(dt.datetime.fromisoformat(fallback.replace("Z", "+00:00")))


def xesc(s) -> str:
    return html.escape(str(s or ""), quote=False)


def write_rss(path: Path, title: str, link: str, self_url: str, desc: str, updated: str, items: list[str]) -> None:
    body = "\n".join(items)
    path.write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>{xesc(title)}</title>
<link>{xesc(link)}</link>
<atom:link href="{xesc(self_url)}" rel="self" type="application/rss+xml"/>
<description>{xesc(desc)}</description>
<language>en</language>
<lastBuildDate>{rfc822(None, updated)}</lastBuildDate>
<generator>studio/scripts/build_feed.py</generator>
{body}
</channel>
</rss>
''', "utf-8")


def render_rss(articles: dict, news: dict) -> None:
    items = []
    for e in articles["articles"]:
        orig = next((l["url"] for l in e["links"] if l["url"].startswith("http")), SITE_URL)
        cats = "".join(f"<category>{xesc(p)}</category>" for p in e["platforms"])
        desc_bits = [x for x in (e.get("dek"), e.get("note")) if x]
        desc = f"<description>{xesc(' '.join(desc_bits))}</description>" if desc_bits else ""
        date = f"<pubDate>{rfc822(e['date'], articles['updated'])}</pubDate>" if e.get("date") else ""
        items.append(f"<item><title>{xesc(e['title'])}</title><link>{xesc(orig)}</link>"
                     f"<guid isPermaLink=\"true\">{xesc(orig)}</guid>{date}{desc}{cats}</item>")
    write_rss(ROOT / "feed.xml", "BJ Beyond Journal", SITE_URL, ARTICLES_FEED_URL,
              "Every essay and public experiment by BJ Beyond, collected in one index.", articles["updated"], items)
    items = []
    for i in news["items"]:
        src = ""
        cat = f"<category>{xesc(i.get('source'))}</category>" if i.get("source") else ""
        date = f"<pubDate>{rfc822(i['date'], news['updated'])}</pubDate>" if i.get("date") else ""
        desc = f"<description>{xesc(i['source'])}</description>" if i.get("source") else ""
        items.append(f"<item><title>{xesc(i['title'])}</title>"
                     f"<link>{xesc(i['url'])}</link><guid isPermaLink=\"true\">{xesc(i['url'])}</guid>{date}{desc}{cat}</item>")
    write_rss(ROOT / "news.xml", "BJ Beyond Journal: AI & AI text detection news", SITE_URL + "#news", NEWS_FEED_URL,
              "External headlines about AI and AI-text detection from publishers' official RSS feeds. Title, source and link only; headlines belong to their publishers. Removal requests: https://github.com/bjbeyond81/bjbeyond81.github.io/issues/new?template=removal-request.yml",
              news["updated"], items)


# ---------------------------------------------------------------- main
def load(name: str) -> dict:
    p = DATA / name
    return json.loads(p.read_text("utf-8")) if p.exists() else {}


def main() -> None:
    if "--render" in sys.argv:
        articles = load("articles.json")
        news = load("news.json")
        render(articles, news)
        (DATA / "articles.json").write_text(json.dumps(articles, ensure_ascii=False, indent=2) + "\n", "utf-8")
        return
    prev_raw = load("raw.json")
    raw_by_source = {}
    for name, fn in [("hackernoon", from_hackernoon), ("medium", from_medium),
                     ("substack", from_substack), ("bjbeyond.it", from_site)]:
        try:
            got = fn()
            if not got:
                raise RuntimeError("no items")
            raw_by_source[name] = got
            log(f"{name}: {len(got)}")
        except Exception as e:  # noqa: BLE001
            raw_by_source[name] = prev_raw.get(name, [])
            log(f"{name}: FAILED ({e}); kept {len(raw_by_source[name])} from last run")
    raw = [i for v in raw_by_source.values() for i in v]
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    entries = merge(raw)
    apply_annotations(entries)
    articles = {"updated": now, "count": len(entries), "articles": entries}
    (DATA / "raw.json").write_text(json.dumps(raw_by_source, ensure_ascii=False, indent=1) + "\n", "utf-8")
    (DATA / "articles.json").write_text(json.dumps(articles, ensure_ascii=False, indent=2) + "\n", "utf-8")

    try:
        items = from_news()
        if not items:
            raise RuntimeError("no items")
        news = {"updated": now, "note": "External headlines from publishers' official RSS/Atom feeds. Title, source name, date and link only; no descriptions, snippets or images. Headlines belong to their publishers.", "items": items}
    except Exception as e:  # noqa: BLE001
        log("news FAILED", e)
        news = load("news.json") or {"updated": now, "items": []}
    (DATA / "news.json").write_text(json.dumps(news, ensure_ascii=False, indent=2) + "\n", "utf-8")
    log(f"articles: {len(entries)}  news: {len(news['items'])}")
    render(articles, news)


if __name__ == "__main__":
    main()
