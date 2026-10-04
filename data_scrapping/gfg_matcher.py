import json
import os
import re
import time
from ddgs import DDGS
from googlesearch import search as google_search

INPUT_FILE = "raw_sheet.json"
OUTPUT_FILE = "final_sheet.json"

def clean_problem_slug(url: str) -> str:
    """Ensures the URL points to a practice problem terminal and strips query params."""
    match = re.search(r'https?://(?:www\.)?geeksforgeeks\.org/problems/([a-zA-Z0-9\-]+)', url)
    if match:
        slug = match.group(1)
        return f"https://www.geeksforgeeks.org/problems/{slug}/1"
    return ""

def search_top_gfg_link(problem_name: str) -> str:
    """Finds the #1 GeeksforGeeks practice link for a question."""
    # Priority Query: Targets problem practice terminals directly
    query = f"site:geeksforgeeks.org/problems {problem_name}"

    # Strategy 1: DDGS (Fast, no captcha bans)
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=3))
            for item in results:
                target = clean_problem_slug(item.get("href", ""))
                if target:
                    return target
    except Exception:
        pass

    # Strategy 2: Google Search Fallback ("<name> gfg practice")
    fallback_query = f"{problem_name} gfg practice"
    try:
        results = google_search(fallback_query, num_results=4)
        for url in results:
            target = clean_problem_slug(url)
            if target:
                return target
    except Exception as e:
        print(f"    [!] Search warning: {e}")

    return ""

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"[!] '{INPUT_FILE}' not found. Run your extractor script first.")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        problems = json.load(f)

    # Resume from existing progress if final_sheet.json already exists
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                saved_progress = json.load(f)
                saved_map = {p["question-name"].lower(): p.get("question-gfg", "") for p in saved_progress}
                for p in problems:
                    k = p["question-name"].lower()
                    if k in saved_map and saved_map[k]:
                        p["question-gfg"] = saved_map[k]
        except Exception:
            pass

    total = len(problems)
    already_done = sum(1 for p in problems if p.get("question-gfg"))
    print(f"Loaded {total} total questions ({already_done} already matched). Starting search...\n")

    matched_count = already_done

    for idx, item in enumerate(problems):
        name = item.get("question-name", "").strip()
        current_gfg = item.get("question-gfg", "").strip()

        # Skip if already resolved
        if current_gfg:
            continue

        print(f"[{idx + 1}/{total}] Searching: '{name} gfg practice'")
        gfg_url = search_top_gfg_link(name)

        if gfg_url:
            item["question-gfg"] = gfg_url
            matched_count += 1
            print(f"   -> Top Match: {gfg_url}")
        else:
            print("   -> No exact practice problem link found")

        # Checkpoint: Save progress after every question so work is never lost
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(problems, f, indent=2)

        # 1.2s delay prevents search rate-limits
        time.sleep(1.2)

    print(f"\nFinished! Total matched: {matched_count}/{total}.")
    print(f"Complete dataset saved to '{OUTPUT_FILE}'.")

if __name__ == "__main__":
    main()