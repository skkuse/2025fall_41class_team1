import time
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from langchain_core.documents import Document
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

BASE_URL = "https://cse.skku.edu/cse/notice.do"

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
    공지사항 크롤링
    Args:
        max_pages: 크롤링할 최대 페이지 수
        delay: 페이지 로딩 대기 시간(초)
        existing_post_nums: 이미 크롤링된 글 번호 set (중복 방지용)
    """
    if existing_post_nums is None:
        existing_post_nums = set()

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
    try:
        notices = []
        article_limit = 10  # 페이지당 글 개수

        for page_num in range(max_pages):
            offset = page_num * article_limit
            list_url = f"{BASE_URL}?mode=list&articleLimit={article_limit}&article.offset={offset}"
            
            print(f"\n=== Crawling page {page_num + 1}/{max_pages} (offset: {offset}) ===")
            driver.get(list_url)
            time.sleep(delay)
            
            soup = BeautifulSoup(driver.page_source, "html.parser")
            # ul.board-list-wrap 내부의 각 li 항목을 선택
            items = soup.select("ul.board-list-wrap > li")
            
            if not items:
                print("No more items found, stopping.")
                break
            
            page_notices = []
            total_items_on_page = 0  
            skipped_items = 0 
            found_existing = False 

            for item in items:
                total_items_on_page += 1
                
                # 제목 & 링크
                title_tag = item.select_one('.board-list-content-title a')
                if not title_tag:
                    continue
                title = title_tag.get_text(strip=True)
                link = title_tag.get("href", "")
                link = urljoin(BASE_URL, link)

                # 글 번호, 작성자, 날짜
                info_ul = item.select_one('.board-list-content-info ul')
                info_li = info_ul.select('li') if info_ul else []
                
                post_num_raw = info_li[0].get_text(strip=True) if len(info_li) > 0 else None
                author = info_li[1].get_text(strip=True) if len(info_li) > 1 else None
                post_date_raw = info_li[2].get_text(strip=True) if len(info_li) > 2 else None

                # 고정 공지글 처리
                if post_num_raw == "공지":
                    # 고정 공지는 모든 페이지에 나타나므로, 고유 식별자 생성
                    post_num = f"NOTICE_{title}_{post_date_raw}"
                elif post_num_raw and post_num_raw.startswith("No."):
                    post_num = f"{post_num_raw.replace('No.', '').strip()}"
                else:
                    # 기타 경우
                    raw_num = post_num_raw or f"{title}_{post_date_raw}"
                    post_num = f"{raw_num}"

                # 중복 체크 - 일반 글(고정 공지 제외)에서 발견 시 즉시 중단
                if post_num in existing_post_nums:
                    if post_num_raw != "공지": 
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
                    "date": post_date_raw,
                    "link": link,
                    "author": author,
                    "is_fixed_notice": (post_num_raw == "공지")
                })
            
            print(f"  Total items on page: {total_items_on_page}, New items: {len(page_notices)}, Skipped: {skipped_items}")
            
            if found_existing:
                driver.quit()
                print(f"\n=== Crawling stopped (found existing post) ===")
                print(f"Total new notices crawled: {len(notices)}")
                return notices
            
            # 페이지에 글이 하나도 없으면 크롤링 종료
            if total_items_on_page == 0:
                print("No items found on this page, stopping.")
                break
            
            # 본문 크롤링
            for idx, notice_info in enumerate(page_notices, 1):
                print(f"  [{idx}/{len(page_notices)}] Crawling: {notice_info['title']}")
                body = crawl_notice_body(driver, notice_info["link"], delay=delay)
                notices.append({
                    "post_num": notice_info["post_num"],
                    "title": notice_info["title"],
                    "date": notice_info["date"],
                    "author": notice_info["author"],
                    "link": notice_info["link"],
                    "body": body,
                    "is_fixed_notice": notice_info["is_fixed_notice"]
                })
                # 크롤링한 post_num을 existing_post_nums에 추가 (현재 세션 내 중복 방지)
                existing_post_nums.add(notice_info["post_num"])
                print(f"    ✓ Completed ({notice_info['post_num']})")

        print(f"\n=== Crawling completed ===")
        print(f"Total notices crawled: {len(notices)}")
        return notices

    finally:
        _safe_quit(driver)
        

def crawl_notice_body(driver, link, delay=1):
    """상세페이지로 이동하여 본문 크롤링"""
    driver.get(link)
    time.sleep(delay)
    soup = BeautifulSoup(driver.page_source, "html.parser")
    body_tag = soup.select_one("div.fr-view")
    body = body_tag.get_text(separator="\n", strip=True) if body_tag else ""
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
                    "board_name": "소프트웨어학과",  
                    "title": n["title"],
                    "date": n["date"],
                    "post_num": n["post_num"],
                    "author": n.get("author", ""),
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
        existing_post_nums=existing_nums
    )
    
    # LangChain Document로 변환
    docs = notices_to_documents(notices)
    
    print(f"\n=== Documents Summary ===")
    print(f"Total documents created: {len(docs)}")
    
    if docs:
        print(f"\n=== Sample Documents ===")
        for i, doc in enumerate(docs[:3], 1):
            print(f"\n--- Document {i} ---")
            print(f"Title: {doc.metadata['title']}")
            print(f"Date: {doc.metadata['date']}")
            print(f"Post Num: {doc.metadata['post_num']}")
            print(f"Author: {doc.metadata['author']}")
            print(f"Content preview: {doc.page_content[:150]}...")