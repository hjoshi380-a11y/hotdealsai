import asyncio
import html
import json
import os
import random
import re
import subprocess
from datetime import datetime
import requests
from playwright.async_api import async_playwright
from telegram import Bot

BOT_TOKEN = "9215980724:AAGMoPrqVyOgAf01Au_3QW5AM5glzpTQgoM"
CHANNEL_ID = "@fast_cart_loot_deals"
CHECK_INTERVAL = 1800
MAX_POSTS_PER_RUN = 6
HISTORY_FILE = "posted_history.json"
LIVE_DEALS_FILE = "live_deals.json"

EARNKARO_CATEGORIES = [
    ("Today's Exclusive Offers", "https://earnkaro.com"),
    ("Women's Fashion", "https://earnkaro.com"),
    ("Men's Fashion", "https://earnkaro.com"),
    ("Women's Footwear", "https://earnkaro.com"),
    ("Men's Footwear", "https://earnkaro.com"),
    ("Beauty & Cosmetics", "https://earnkaro.com"),
    ("Electronics & Gadgets", "https://earnkaro.com"),
    ("Home & Kitchen", "https://earnkaro.com"),
    ("Kids & Accessories", "https://earnkaro.com")
]

BANNED_WORDS = [
    "you earn", "per sale", "profit", "copy link", "share now",
    "commission", "cashback", "online shopping", "buy products online", "access denied"
]

EXPIRED_SIGNALS = [
    "out of stock", "sold out", "currently unavailable",
    "page not found", "404 error", "no longer available", "product not found"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

def upscale_cdn_image(url):
    if not url:
        return ""
    url = re.sub(r"w_\d+,q_\d+", "w_800,q_90", url)
    url = re.sub(r"/h_\d+,q_\d+,w_\d+/", "/h_1080,q_90,w_810/", url)
    url = re.sub(r"/image/\d+/\d+/", "/image/832/832/", url)
    url = re.sub(r"\._[A-Z0-9_,]+_\.", "._SL1000_.", url)
    return url

def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return set(json.load(f))
    return set()

def save_history(history):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(list(history), f, indent=2)

def load_live_deals():
    if os.path.exists(LIVE_DEALS_FILE):
        try:
            with open(LIVE_DEALS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except Exception:
            return []
    return []

def save_live_deals(deals):
    with open(LIVE_DEALS_FILE, "w", encoding="utf-8") as f:
        json.dump(deals, f, indent=2)

def detect_store(url):
    low = url.lower()
    if "myntra" in low:
        return "Myntra"
    if "flipkart" in low or "shopsy" in low:
        return "Flipkart"
    if "ajio" in low:
        return "Ajio"
    if "nykaa" in low:
        return "Nykaa"
    if "mamaearth" in low:
        return "Mamaearth"
    if "amazon" in low:
        return "Amazon"
    return "Official Store"

def is_deal_still_active(deal):
    url = deal.get("ek_link", "")
    if not url.startswith("http"):
        return False
    try:
        resp = requests.get(url, headers=HEADERS, timeout=8, allow_redirects=True)
        if resp.status_code >= 400:
            return False
        if any(sig in resp.text.lower() for sig in EXPIRED_SIGNALS):
            return False
        return True
    except Exception:
        return True

def prune_expired_deals():
    deals = load_live_deals()
    if not deals:
        return False
    active_deals = []
    removed = 0
    for d in deals:
        if is_deal_still_active(d):
            d["image"] = upscale_cdn_image(d.get("image", ""))
            active_deals.append(d)
        else:
            removed += 1
    save_live_deals(active_deals)
    return removed > 0

async def fetch_hd_via_playwright(context, affiliate_url, fallback_img="", fallback_title=""):
    try:
        resp = await context.request.get(affiliate_url, timeout=10000)
        if resp.status >= 400:
            return None
        final_url = resp.url
        body = await resp.text()
        if any(sig in body.lower() for sig in EXPIRED_SIGNALS):
            return None

        img_match = re.search(r'property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)["\']', body, re.I)
        if not img_match:
            img_match = re.search(r'content=["\'](https?://[^"\']+)["\'][^>]+property=["\']og:image["\']', body, re.I)

        title_match = re.search(r'property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', body, re.I)
        if not title_match:
            title_match = re.search(r'title[^>]*>([^<]+)</title>', body, re.I)

        raw_img = html.unescape(img_match.group(1)) if img_match else fallback_img
        hd_img = upscale_cdn_image(raw_img)

        raw_title = html.unescape(title_match.group(1)).strip() if title_match else fallback_title
        clean_title = re.split(r"\s*[-|:]\s*(?:Buy|Shop|Online|Myntra|Flipkart|Ajio|Nykaa|Amazon)", raw_title, flags=re.I).strip()

        if len(clean_title) < 8 or any(b in clean_title.lower() for b in BANNED_WORDS):
            clean_title = fallback_title
        if not clean_title or len(clean_title) < 8:
            return None
        if not hd_img.startswith("http") or any(b in hd_img.lower() for b in ["logo", "icon", "retailer", "sprite", "thumb"]):
            return None

        return {
            "title": clean_title[:100],
            "image": hd_img,
            "store": detect_store(final_url)
        }
    except Exception:
        return None

def add_deal_to_website(new_deal):
    deals = load_live_deals()
    deals = [
        d for d in deals
        if d.get("ek_link") != new_deal.get("ek_link")
        and d.get("title") != new_deal.get("title")
        and d.get("image") != new_deal.get("image")
    ]
    deals.insert(0, new_deal)
    save_live_deals(deals)

def sync_website_to_github():
    try:
        subprocess.run(["git", "add", "index.html", "app.js", "live_deals.json"], check=True)
        subprocess.run(["git", "commit", "-m", "Sync expanded HotDealsAi deals"], check=False)
        subprocess.run(["git", "push"], check=True)
        print("  🌐 Synced to HotDealsAi website!")
    except Exception as e:
        print(f"  GitHub sync error: {e}")

async def scrape_earnkaro_url(context, page, cat_name, cat_url, history):
    deals = []
    try:
        await page.goto(cat_url, wait_until="domcontentloaded", timeout=35000)
        await page.wait_for_timeout(3000)
        await page.mouse.wheel(0, 1500)
        await page.wait_for_timeout(1500)

        copy_btns = await page.locator("button, a").filter(has_text=re.compile(r"copy\s*link", re.I)).all()
        print(f"  Checking {min(len(copy_btns), 20)} deals under '{cat_name}'...")

        for btn in copy_btns[:20]:
            try:
                card = btn.locator("xpath=../../..")
                raw_text = await card.inner_text(timeout=2000)

                card_img = ""
                imgs = await card.locator("img").all()
                for img in imgs:
                    src = await img.get_attribute("src") or await img.get_attribute("data-src") or ""
                    if src.startswith("http"):
                        card_img = upscale_cdn_image(src)
                        break

                if any(bad in card_img.lower() for bad in ["retailer", "logo", "icon"]):
                    continue

                clean_lines = [
                    l.strip() for l in raw_text.split("\n")
                    if len(l.strip()) > 6
                    and not any(b in l.lower() for b in BANNED_WORDS)
                    and not l.strip().startswith("₹")
                    and not l.strip().lower().startswith("rs")
                ]
                fallback_title = max(clean_lines, key=len)[:100] if clean_lines else ""

                price_lines = [l for l in raw_text.split("\n") if "earn" not in l.lower() and "profit" not in l.lower()]
                prices = [int(p.replace(",", "")) for p in re.findall(r"(?:₹|Rs\.?)\s*([\d,]+)", "\n".join(price_lines))]
                deal_price = min(prices) if prices else None
                mrp = max(prices) if len(prices) > 1 else None
                discount = round(((mrp - deal_price) / mrp) * 100) if (mrp and deal_price and mrp > deal_price) else 0

                await btn.scroll_into_view_if_needed(timeout=2000)
                await btn.click(timeout=2000)
                await page.wait_for_timeout(800)

                for extra_page in context.pages:
                    if extra_page != page:
                        await extra_page.close()

                clip = (await page.evaluate("navigator.clipboard.readText()") or "").strip()
                if not clip.startswith("http") or "earnkaro.com" in clip or clip in history:
                    continue

                hd = await fetch_hd_via_playwright(context, clip, card_img, fallback_title)
                if not hd or hd["title"] in history:
                    continue

                deals.append({
                    "category": cat_name,
                    "title": hd["title"],
                    "price": deal_price,
                    "mrp": mrp,
                    "discount": discount,
                    "store": hd["store"],
                    "image": hd["image"],
                    "posted_at": datetime.now().strftime("%I:%M %p"),
                    "ek_link": clip
                })
                if len(deals) >= 2:
                    break
            except Exception:
                continue
    except Exception as e:
        print(f"  Category '{cat_name}' error: {e}")
    return deals

def build_telegram_message(deal):
    lt, gt = chr(60), chr(62)
    header = f"🔥 {lt}b{gt}{deal['discount']}% OFF LOOT DEAL!{lt}/b{gt}\n" if deal["discount"] >= 15 else f"🔥 {lt}b{gt}HOT DEAL ALERT!{lt}/b{gt}\n"
    price_line = ""
    if deal["price"]:
        mrp_part = f"{lt}s{gt}₹{deal['mrp']}{lt}/s{gt}" if (deal["mrp"] and deal["mrp"] > deal["price"]) else ""
        price_line = f"💰 Deal Price: {lt}b{gt}₹{deal['price']}{lt}/b{gt}  {mrp_part}\n\n"
    link_tag = f"🛒 {lt}a href='{deal['ek_link']}'{gt}Grab Deal Now{lt}/a{gt}\n"
    return (
        f"{header}"
        f"🏪 {lt}b{gt}{deal['store']}{lt}/b{gt} • {lt}i{gt}{deal['category']}{lt}/i{gt}\n\n"
        f"🛍️ {lt}b{gt}{deal['title']}{lt}/b{gt}\n"
        f"{price_line}"
        f"{link_tag}"
        f"{lt}i{gt}(HotDealsAi Verified Drop • Limited stock!){lt}/i{gt}"
    )

async def run_bot():
    bot = Bot(token=BOT_TOKEN)
    history = load_history()
    print("🚀 HotDealsAi Expanded Multi-Category Engine is live!")

    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir="./ek_session",
            channel="chrome",
            headless=True,
            permissions=["clipboard-read", "clipboard-write"],
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = await context.new_page()

        while True:
            removed_any = await asyncio.to_thread(prune_expired_deals)
            if removed_any:
                sync_website_to_github()

            cats = EARNKARO_CATEGORIES.copy()
            random.shuffle(cats)
            posts_this_round = 0

            for cat_name, cat_url in cats:
                if posts_this_round >= MAX_POSTS_PER_RUN:
                    break

                print(f"\nScanning category: {cat_name}...")
                deals = await scrape_earnkaro_url(context, page, cat_name, cat_url, history)

                for deal in deals:
                    if posts_this_round >= MAX_POSTS_PER_RUN or deal["title"] in history or deal["ek_link"] in history:
                        continue

                    msg = build_telegram_message(deal)
                    await bot.send_message(chat_id=CHANNEL_ID, text=msg, parse_mode="HTML")
                    add_deal_to_website(deal)
                    sync_website_to_github()
                    print(f"  ✅ POSTED & SYNCED: {deal['title']} ({deal['store']})")

                    history.add(deal["title"])
                    history.add(deal["ek_link"])
                    save_history(history)
                    posts_this_round += 1
                    await asyncio.sleep(5)

            print(f"\nCycle complete! Posted {posts_this_round} deals. Next scan in {CHECK_INTERVAL // 60} minutes...")
            await asyncio.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    asyncio.run(run_bot())
