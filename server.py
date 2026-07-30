#!/usr/bin/env python3
"""ConflictWatch server (stdlib only).

- Polls RSS feeds from credible news / humanitarian sources every 10 minutes
- Matches items to known conflicts (conflicts.json) by keyword
- A conflict is marked "corroborated" when 2+ independent sources are
  reporting on it within the last 48 hours
- Serves the static frontend from ./public and a JSON API at /api/data
"""

import json
import os
import re
import threading
import time
import html as html_mod
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).parent
PORT = int(os.environ.get("PORT", 4173))
HOST = os.environ.get("HOST", "127.0.0.1")  # set HOST=0.0.0.0 when deployed
REFRESH_SECONDS = 5 * 60
CORROBORATION_WINDOW = 48 * 3600
MIN_SOURCES_FOR_VERIFIED = 2

# NOTE: feeds from the same publisher share a source name on purpose — the
# corroboration rule counts distinct source names, and two BBC feeds must not
# count as two independent sources.
FEEDS = [
    ("BBC News", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/world/africa/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/world/asia/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/world/europe/rss.xml"),
    ("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
    ("The Guardian", "https://www.theguardian.com/world/rss"),
    ("UN News", "https://news.un.org/feed/subscribe/en/news/all/rss.xml"),
    ("Deutsche Welle", "https://rss.dw.com/rdf/rss-en-world"),
    ("France 24", "https://www.france24.com/en/rss"),
    ("ReliefWeb", "https://reliefweb.int/updates/rss.xml"),
    ("Dawn", "https://www.dawn.com/feeds/home"),
    ("The Diplomat", "https://thediplomat.com/feed/"),
]

CONFLICTS = json.loads((ROOT / "conflicts.json").read_text())

# ---------------------------------------------------------------------------
# Minimal RSS/Atom item parsing
# ---------------------------------------------------------------------------

ITEM_RE = re.compile(r"<item[\s>].*?</item>|<entry[\s>].*?</entry>", re.S | re.I)
LINK_HREF_RE = re.compile(r'<link[^>]*href="([^"]+)"', re.I)
TAG_STRIP_RE = re.compile(r"<[^>]+>")


def tag_content(block: str, tag: str) -> str:
    m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", block, re.S | re.I)
    if not m:
        return ""
    text = m.group(1).strip()
    text = re.sub(r"^<!\[CDATA\[", "", text)
    text = re.sub(r"\]\]>$", "", text)
    return html_mod.unescape(text).strip()


def parse_date(s: str) -> datetime:
    if not s:
        return datetime.now(timezone.utc)
    try:
        return parsedate_to_datetime(s)  # RFC 822 (RSS pubDate)
    except (TypeError, ValueError):
        pass
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))  # ISO (Atom/RDF)
    except ValueError:
        return datetime.now(timezone.utc)


def parse_items(xml: str, source: str) -> list:
    items = []
    for block in ITEM_RE.findall(xml):
        title = tag_content(block, "title")
        link = tag_content(block, "link")
        if not link:
            href = LINK_HREF_RE.search(block)
            link = html_mod.unescape(href.group(1)) if href else ""
        description = tag_content(block, "description") or tag_content(block, "summary")
        description = TAG_STRIP_RE.sub("", description)[:300]
        date_str = (
            tag_content(block, "pubDate")
            or tag_content(block, "dc:date")
            or tag_content(block, "updated")
            or tag_content(block, "published")
        )
        if not title or not link:
            continue
        dt = parse_date(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        items.append({
            "source": source,
            "title": title,
            "link": link,
            "description": description,
            "publishedAt": dt.isoformat(),
        })
    return items


def fetch_feed(source: str, url: str) -> list:
    req = Request(url, headers={"User-Agent": "ConflictWatch/1.0 (open-source conflict monitor)"})
    with urlopen(req, timeout=15) as res:
        xml = res.read().decode("utf-8", errors="replace")
    return parse_items(xml, source)


# ---------------------------------------------------------------------------
# Matching + corroboration
# ---------------------------------------------------------------------------

cache = {"updatedAt": None, "sourcesOk": [], "sourcesFailed": [], "conflicts": [], "suggestions": []}
cache_lock = threading.Lock()


# An article only counts if, besides matching the conflict's keywords, it is
# actually about security/military/conflict developments (incl. diplomacy and
# humanitarian fallout). General news that merely mentions a country is dropped.
SECURITY_TERMS = [
    "strike", "missile", "drone", "rocket", "artillery", "shelling", "bomb",
    "explos", "blast", "attack", "offensive", "assault", "raid", "invasion",
    "incursion", "escalat", "clashes", "fighting", "combat", "front line",
    "frontline", "military", "troops", "soldier", "army", "forces", "fighter jet",
    "air defence", "air defense", "airspace", "nuclear", "weapon", "sanction",
    "killed", "deadly", "death", "casualt", "wounded", "injured", "massacre", "atrocit",
    "war crime", "genocide", "ceasefire", "truce", "peace", "talks", "negotiat",
    "diplomat", "militant", "insurgen", "rebel", "junta", "coup", "gunmen",
    "hostage", "kidnap", "siege", "blockade", "occupation", "annex",
    "humanitarian", "refugee", "displaced", "famine", "aid convoy",
    "security", "violence", "gang", "conflict",
    # civil unrest
    "protest", "riot", "demonstrat", "unrest", "crackdown", "curfew",
    "martial law", "uprising", "revolt", "tear gas", "water cannon",
    "civil disobedience", "hunger strike", "blockades",
]


def matches(article: dict, conflict: dict) -> bool:
    text = f"{article['title']} {article['description']}".lower()
    if not any(kw in text for kw in conflict["keywords"]):
        return False
    return any(term in text for term in SECURITY_TERMS)


# ---------------------------------------------------------------------------
# Auto-suggested unrest pins: when unrest-tagged reporting from 2+ independent
# sources clusters on a country that has no curated pin, surface it as a
# suggestion (clearly marked as auto-detected, never silently promoted).
# ---------------------------------------------------------------------------

UNREST_TERMS = [
    "protest", "riot", "demonstrat", "unrest", "crackdown", "curfew",
    "martial law", "uprising", "revolt", "tear gas", "water cannon",
    "civil disobedience", "hunger strike", "blockades", "general strike",
]

# (name, lat, lng, extra match terms) — countries scanned for unrest clusters
COUNTRIES = [
    ("Kenya", -1.29, 36.82, ["kenyan"]), ("Nigeria", 9.08, 7.40, ["nigerian"]),
    ("Ghana", 5.60, -0.19, ["ghanaian"]), ("Senegal", 14.72, -17.47, ["senegalese"]),
    ("Ivory Coast", 6.85, -5.30, ["ivorian"]), ("Cameroon", 3.87, 11.52, ["cameroonian"]),
    ("Uganda", 0.35, 32.58, ["ugandan"]), ("Tanzania", -6.80, 39.28, ["tanzanian"]),
    ("Mozambique", -25.90, 32.57, ["mozambican"]), ("Zimbabwe", -17.83, 31.05, ["zimbabwean"]),
    ("Zambia", -15.40, 28.32, ["zambian"]), ("Angola", -8.84, 13.23, ["angolan"]),
    ("South Africa", -25.75, 28.19, []), ("Tunisia", 36.80, 10.18, ["tunisian"]),
    ("Algeria", 36.75, 3.06, ["algerian"]), ("Morocco", 34.02, -6.83, ["moroccan"]),
    ("Libya", 32.89, 13.19, ["libyan"]), ("Egypt", 30.04, 31.24, ["egyptian"]),
    ("Chad", 12.13, 15.06, ["chadian"]), ("Guinea", 9.64, -13.58, []),
    ("Sierra Leone", 8.48, -13.23, []), ("Liberia", 6.30, -10.80, ["liberian"]),
    ("Togo", 6.14, 1.21, ["togolese"]), ("Benin", 6.50, 2.60, ["beninese"]),
    ("Madagascar", -18.90, 47.52, ["malagasy"]), ("Malawi", -13.97, 33.79, ["malawian"]),
    ("United States", 38.90, -77.04, []), ("Mexico", 19.43, -99.13, ["mexican"]),
    ("Guatemala", 14.63, -90.51, ["guatemalan"]), ("Honduras", 14.07, -87.19, ["honduran"]),
    ("Nicaragua", 12.11, -86.24, ["nicaraguan"]), ("Cuba", 23.11, -82.37, ["cuban"]),
    ("Ecuador", -0.18, -78.47, ["ecuadorian"]), ("Peru", -12.05, -77.04, ["peruvian"]),
    ("Chile", -33.45, -70.67, ["chilean"]), ("Argentina", -34.60, -58.38, ["argentine"]),
    ("Brazil", -15.79, -47.88, ["brazilian"]), ("Panama", 8.98, -79.52, ["panamanian"]),
    ("Paraguay", -25.26, -57.58, ["paraguayan"]), ("Uruguay", -34.90, -56.16, ["uruguayan"]),
    ("Canada", 45.42, -75.70, ["canadian"]),
    ("France", 48.86, 2.35, ["french"]), ("Germany", 52.52, 13.40, ["german"]),
    ("United Kingdom", 51.50, -0.12, ["british"]), ("Italy", 41.90, 12.50, ["italian"]),
    ("Spain", 40.42, -3.70, ["spanish"]), ("Portugal", 38.72, -9.14, ["portuguese"]),
    ("Greece", 37.98, 23.73, ["greek"]), ("Serbia", 44.79, 20.45, ["serbian"]),
    ("Hungary", 47.50, 19.04, ["hungarian"]), ("Slovakia", 48.15, 17.11, ["slovak"]),
    ("Romania", 44.43, 26.10, ["romanian"]), ("Bulgaria", 42.70, 23.32, ["bulgarian"]),
    ("Georgia", 41.72, 44.78, []), ("Moldova", 47.01, 28.86, ["moldovan"]),
    ("Belarus", 53.90, 27.57, ["belarusian"]), ("Turkey", 39.93, 32.86, ["turkish"]),
    ("Netherlands", 52.37, 4.90, ["dutch"]), ("Belgium", 50.85, 4.35, ["belgian"]),
    ("Austria", 48.21, 16.37, ["austrian"]), ("Sweden", 59.33, 18.07, ["swedish"]),
    ("Norway", 59.91, 10.75, ["norwegian"]), ("Ireland", 53.35, -6.26, ["irish"]),
    ("Russia", 55.75, 37.62, []),
    ("Indonesia", -6.20, 106.85, ["indonesian"]), ("Malaysia", 3.14, 101.69, ["malaysian"]),
    ("Thailand", 13.76, 100.50, []), ("Vietnam", 21.03, 105.85, ["vietnamese"]),
    ("Cambodia", 11.56, 104.92, ["cambodian"]), ("Bangladesh", 23.81, 90.41, ["bangladeshi"]),
    ("Sri Lanka", 6.93, 79.85, []), ("Nepal", 27.72, 85.32, ["nepali", "nepalese"]),
    ("Japan", 35.68, 139.69, ["japanese"]), ("Mongolia", 47.89, 106.91, ["mongolian"]),
    ("Kazakhstan", 51.17, 71.45, ["kazakh"]), ("Kyrgyzstan", 42.87, 74.59, ["kyrgyz"]),
    ("Uzbekistan", 41.30, 69.24, ["uzbek"]), ("Tajikistan", 38.56, 68.79, ["tajik"]),
    ("Jordan", 31.95, 35.93, ["jordanian"]), ("Saudi Arabia", 24.71, 46.68, ["saudi"]),
    ("Kuwait", 29.38, 47.99, ["kuwaiti"]), ("Bahrain", 26.23, 50.59, ["bahraini"]),
    ("Oman", 23.59, 58.41, ["omani"]), ("Qatar", 25.29, 51.53, ["qatari"]),
]


def detect_unrest_suggestions(articles, now):
    excluded = set()
    for c in CONFLICTS:
        for part in c["country"].lower().split("/"):
            excluded.add(part.strip())

    suggestions = []
    for name, lat, lng, aliases in COUNTRIES:
        lname = name.lower()
        if lname in excluded:
            continue
        terms = [lname] + aliases
        recent = []
        for a in articles:
            text = f"{a['title']} {a['description']}".lower()
            if not any(t in text for t in terms):
                continue
            if not any(u in text for u in UNREST_TERMS):
                continue
            age = (now - datetime.fromisoformat(a["publishedAt"])).total_seconds()
            if age < CORROBORATION_WINDOW:
                recent.append(a)
        sources = sorted({a["source"] for a in recent})
        if len(sources) >= 1:
            suggestions.append({
                "country": name,
                "lat": lat,
                "lng": lng,
                "recentCount": len(recent),
                "sources": sources,
                # single-source detections are "unconfirmed" until a second
                # independent source reports, which flips them to corroborated
                "corroborated": len(sources) >= MIN_SOURCES_FOR_VERIFIED,
                "articles": sorted(recent, key=lambda a: a["publishedAt"], reverse=True)[:10],
            })
    suggestions.sort(key=lambda s: (not s["corroborated"], -s["recentCount"]))
    return suggestions[:15]


def refresh():
    all_articles = []
    results = {}  # keyed by url — several feeds can share a source name

    def worker(source, url):
        try:
            results[url] = fetch_feed(source, url)
        except Exception as e:
            results[url] = e

    threads = [threading.Thread(target=worker, args=f, daemon=True) for f in FEEDS]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=25)

    ok_names, failed_names = set(), set()
    for source, url in FEEDS:
        r = results.get(url)
        if isinstance(r, list) and r:
            ok_names.add(source)
            all_articles.extend(r)
        else:
            failed_names.add(source)
    ok = sorted(ok_names)
    failed = sorted(failed_names - ok_names)  # a publisher counts as up if any of its feeds work

    seen, articles = set(), []
    for a in all_articles:
        if a["link"] not in seen:
            seen.add(a["link"])
            articles.append(a)

    now = datetime.now(timezone.utc)
    conflicts_out = []
    for c in CONFLICTS:
        matched = sorted(
            (a for a in articles if matches(a, c)),
            key=lambda a: a["publishedAt"],
            reverse=True,
        )[:25]
        recent = [
            a for a in matched
            if (now - datetime.fromisoformat(a["publishedAt"])).total_seconds() < CORROBORATION_WINDOW
        ]
        recent_sources = sorted({a["source"] for a in recent})
        conflicts_out.append({
            "id": c["id"],
            "name": c["name"],
            "country": c["country"],
            "region": c.get("region", "Other"),
            "status": c.get("status", "active"),
            "assessment": c.get("assessment"),
            "live": c.get("live", []),
            "lat": c["lat"],
            "lng": c["lng"],
            "entities": c.get("entities", []),
            "articles": matched,
            "recentCount": len(recent),
            "recentSources": recent_sources,
            "verified": len(recent_sources) >= MIN_SOURCES_FOR_VERIFIED,
        })

    with cache_lock:
        cache.update({
            "updatedAt": now.isoformat(),
            "sourcesOk": ok,
            "sourcesFailed": failed,
            "conflicts": conflicts_out,
            "suggestions": detect_unrest_suggestions(articles, now),
        })
    print(
        f"[refresh] {now.isoformat()} — {len(articles)} articles from {len(ok)}/{len(FEEDS)} sources"
        + (f" (failed: {', '.join(failed)})" if failed else ""),
        flush=True,
    )


def refresh_loop():
    while True:
        try:
            refresh()
        except Exception as e:
            print(f"[refresh] failed: {e}", flush=True)
        time.sleep(REFRESH_SECONDS)


# ---------------------------------------------------------------------------
# HTTP server
# ---------------------------------------------------------------------------

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "public"), **kwargs)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/data":
            with cache_lock:
                body = json.dumps(cache).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, fmt, *args):
        pass  # keep server output to refresh logs only


if __name__ == "__main__":
    threading.Thread(target=refresh_loop, daemon=True).start()
    print(f"ConflictWatch running at http://localhost:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
