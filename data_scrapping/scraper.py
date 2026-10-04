import re
import json
import requests
from bs4 import BeautifulSoup

URL = "https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet"
OUTPUT_FILE = "raw_sheet.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
}

def clean_title(title: str) -> str:
    # Strip leading numbering like "1. ", "Step 1.1 - "
    return re.sub(r'^\d+(\.\d+)*\s*[-:.)]?\s*', '', title).strip()

def main():
    print("📡 Fetching raw Next.js flight data from TakeUForward...")
    res = requests.get(URL, headers=HEADERS)
    soup = BeautifulSoup(res.text, "html.parser")

    full_stream = ""

    # 1. Reassemble and decode all self.__next_f.push chunks
    for script in soup.find_all("script"):
        text = script.string or ""
        if "self.__next_f.push" not in text:
            continue

        # Matches the JSON string passed to push([..., "..."])
        matches = re.finditer(r'self\.__next_f\.push\(\[\s*\d+\s*,\s*("([^"\\]*(?:\\.[^"\\]*)*)")\s*\]\)', text)
        for m in matches:
            try:
                decoded_chunk = json.loads(m.group(1))
                full_stream += decoded_chunk
            except Exception:
                pass

    print(f"📦 Total flight stream reassembled: {len(full_stream)} characters.")

    # 2. Extract Category / Subtopic Name mappings
    # Structure: [0, <id>, "<category-slug>", "category", "<Category Title>", ...]
    category_map = {}
    cat_matches = re.findall(r'\[0,\s*\d+,\s*"([^"]+)",\s*"category",\s*"([^"]+)"', full_stream)
    for slug, title in cat_matches:
        category_map[slug] = title

    print(f"📂 Found {len(category_map)} category sections.")

    # 3. Extract Practice Problems
    # Structure: [<int>, <int>, "<slug>", "item", "practice", "<Title>", ...]
    problem_starts = list(re.finditer(
        r'\[\d+,\s*\d+,\s*"([^"]+)",\s*"item",\s*"practice",\s*"([^"]+)"',
        full_stream
    ))

    print(f"🎯 Found {len(problem_starts)} total practice problem entries in flight data.")

    extracted_problems = []

    for i in range(len(problem_starts)):
        cur = problem_starts[i]
        slug = cur.group(1)
        raw_title = cur.group(2)
        title = clean_title(raw_title)

        # Slice the segment for this specific problem to parse its metadata
        start_idx = cur.start()
        end_idx = problem_starts[i + 1].start() if i + 1 < len(problem_starts) else start_idx + 1500
        block = full_stream[start_idx:end_idx]

        # Extract Category Slug
        cat_match = re.search(r'"category":"([^"]+)"', block)
        category_slug = cat_match.group(1) if cat_match else ""
        subtopic_name = category_map.get(category_slug, category_slug.replace("-", " ").title())

        # Extract LeetCode URL (if present)
        lc_match = re.search(r'"(https://leetcode\.com/problems/[^"]+)"', block)
        lc_url = lc_match.group(1) if lc_match else ""

        # Extract YouTube URL (if present)
        yt_match = re.search(r'"(https://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)[^"]+)"', block)
        yt_url = yt_match.group(1) if yt_match else ""

        # Extract Blog URL (if present)
        blog_match = re.search(r'"(/blogs/[^"]+)"', block)
        blog_url = f"https://takeuforward.org{blog_match.group(1)}" if blog_match else ""

        extracted_problems.append({
            "subtopic-name": subtopic_name,
            "question-name": title,
            "question-lc": lc_url,
            "tuf-slug": f"/practice/dsa/{slug}",
            "youtube-url": yt_url,
            "article-url": blog_url,
            "question-gfg": ""
        })

    # 4. Deduplicate entries by clean question name
    unique = {}
    for p in extracted_problems:
        key = p["question-name"].lower()
        if key not in unique:
            unique[key] = p
        else:
            # If previous entry missed LeetCode link but current has it, update it
            if not unique[key]["question-lc"] and p["question-lc"]:
                unique[key]["question-lc"] = p["question-lc"]

    final_list = list(unique.values())

    print(f"\n🎉 Successfully extracted {len(final_list)} unique practice problems across all topics!")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(final_list, f, indent=2)

    print(f"💾 Saved cleanly to '{OUTPUT_FILE}'.")

if __name__ == "__main__":
    main()