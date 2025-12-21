from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
from urllib.parse import urljoin
from langchain_core.documents import Document

BASE_URL = "https://dorm.skku.edu/dorm_suwon/notice/notice_all.jsp"
BOARD_NO = "16"   # URL에 있는 board_no 값 (수원)

def _safe_quit(driver):
    """드라이버 종료(예외 무시)"""
    try:
        driver.quit()
    except Exception:
        pass

def crawl_notices(
    max_pages=30,
    delay=2,
    existing_post_nums=None
):
    """
    봉룡학사(수원) 공지사항 크롤링
    """
    if existing_post_nums is None:
        existing_post_nums = set()

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
    try:
        notices = []
        article_limit = 10

        for page_num in range(max_pages):
            offset = page_num * article_limit
            list_url = f"{BASE_URL}?board_no={BOARD_NO}&mode=list&pager.offset={offset}"

            print(f"\n=== [수원] Crawling page {page_num + 1}/{max_pages} (offset: {offset}) ===")
            driver.get(list_url)
            time.sleep(delay)

            soup = BeautifulSoup(driver.page_source, "html.parser")
            rows = soup.select("table tbody tr")

            if not rows:
                print("No rows found, stopping.")
                break

            page_notices = []
            total_items_on_page = 0
            skipped_items = 0
            found_existing = False

            for row in rows:
                cells = row.find_all("td")
                if len(cells) < 5:
                    continue

                total_items_on_page += 1

                no_text = cells[0].get_text(strip=True)
                category = cells[1].get_text(strip=True)
                title_tag = cells[2].find("a")

                if not title_tag:
                    continue

                title = title_tag.get_text(strip=True)
                link = title_tag.get("href", "")
                if not link.startswith("http"):
                    link = urljoin(BASE_URL, link)

                date_text = cells[-2].get_text(strip=True)

                # 번호 처리 (상단공지 / 일반글)
                is_fixed_notice = (no_text == "" or "Image" in no_text)
                
                if is_fixed_notice:
                    post_num = f"NOTICE_{title}_{date_text}"
                else:
                    post_num = no_text

                # 중복 체크 - 고정 공지가 아닌 일반 글에서 중복 발견 시 즉시 중단
                if post_num in existing_post_nums:
                    if not is_fixed_notice:
                        print(f"  → Found existing post: {title} ({post_num})")
                        print(f"  → Stopping crawl (all newer posts already collected)")
                        found_existing = True
                        break
                    else:
                        print(f"  → Skipping fixed notice: {title}")
                        skipped_items += 1
                        continue

                page_notices.append({
                    "post_num": post_num,
                    "title": title,
                    "date": date_text,
                    "link": link,
                    "category": category,
                })

            print(f"  Total rows: {total_items_on_page}, New: {len(page_notices)}, Skipped: {skipped_items}")

            if found_existing:
                driver.quit()
                print("\n=== [수원] Crawling stopped (found existing post) ===")
                print(f"Total new notices crawled: {len(notices)}")
                return notices

            if total_items_on_page == 0:
                print("No items on this page, stopping.")
                break

            for idx, notice_info in enumerate(page_notices, 1):
                print(f"  [{idx}/{len(page_notices)}] Crawling: {notice_info['title']}")
                body = crawl_notice_body(driver, notice_info["link"], delay=delay)
                notices.append({
                    "post_num": notice_info["post_num"],
                    "title": notice_info["title"],
                    "date": notice_info["date"],
                    "link": notice_info["link"],
                    "category": notice_info["category"],
                    "body": body,
                    "source": "DORM_SUWON"
                })
                existing_post_nums.add(notice_info["post_num"])
                print(f"    ✓ Completed ({notice_info['post_num']})")

        print("\n=== [수원] Crawling completed ===")
        print(f"Total notices crawled: {len(notices)}")
        return notices

    finally:
        _safe_quit(driver)


def crawl_notice_body(driver, link, delay=1):
    """상세페이지로 이동하여 본문 크롤링"""
    driver.get(link)
    time.sleep(delay)
    soup = BeautifulSoup(driver.page_source, "html.parser")

    body_tag = (
        soup.select_one("div.fr-view") or
        soup.select_one("div.bbs-view-cont") or
        soup.select_one("div.board_view") or
        soup.select_one("div#viewDetail")
    )

    if body_tag:
        body = body_tag.get_text(separator="\n", strip=True)
    else:
        full_text = soup.get_text(separator="\n", strip=True)
        lines = [line for line in full_text.splitlines() if line.strip()]
        body = "\n".join(lines)

    return body


def notices_to_documents(notices):
    """공지사항 리스트를 LangChain Document 객체로 변환"""
    docs = []
    for n in notices:
        body = n.get("body", "")
        docs.append(
            Document(
                page_content=body,
                metadata={
                    "board_name": "봉룡학사(수원)",
                    "title": n["title"],
                    "date": n["date"],
                    "post_num": n["post_num"],
                    "category": n.get("category", ""),
                    "link": n["link"]
                }
            )
        )
    return docs

"""테스트용 실행 코드"""
if __name__ == "__main__":
    existing_nums = set()
    notices = crawl_notices(
        max_pages=3,
        delay=2,
        existing_post_nums=existing_nums,
    )

    docs = notices_to_documents(notices)
    print(f"\n=== [수원] Documents Summary ===")
    print(f"Total documents created: {len(docs)}")
    if docs:
        for i, doc in enumerate(docs[:3], 1):
            print(f"\n--- Document {i} ---")
            print(f"Title: {doc.metadata['title']}")
            print(f"Date: {doc.metadata['date']}")
            print(f"Post Num: {doc.metadata['post_num']}")
            print(f"Category: {doc.metadata['category']}")
            print(f"Content preview: {doc.page_content[:150]}...")
