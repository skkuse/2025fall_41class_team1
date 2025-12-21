import os
import json
from typing import List, Dict, Optional, AsyncGenerator
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from datetime import datetime

load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PERSIST_DIR = os.path.join(BASE_DIR, "chroma_db")
today = datetime.now().strftime("%Y-%m-%d")

def clean_text(text: str) -> str:
    """텍스트 인코딩 정리"""
    if text is None:
        return ""
    return text.encode("utf-8", "ignore").decode("utf-8", "ignore")


def get_retriever(score_threshold: float = 0.5):
    """벡터 DB에서 리트리버 생성"""
    vectordb = Chroma(
        persist_directory=PERSIST_DIR,
        embedding_function=OpenAIEmbeddings(model="text-embedding-3-small"),
    )
    return vectordb.as_retriever(search_kwargs={"k": 5})


def format_timetable(timetable: List[Dict]) -> str:
    """시간표를 읽기 쉬운 형식으로 변환"""
    if not timetable:
        return "등록된 시간표 없음"
    
    formatted = []
    for item in timetable:
        if item.get('courseName'):
            location = f" @ {item['location']}" if item.get('location') else ""
            formatted.append(
                f"- {item.get('courseName', '과목명 없음')} "
                f"({item.get('dayOfWeek', '?')}요일 "
                f"{item.get('startTime', '?')}~{item.get('endTime', '?')}){location}"
            )
    
    return "\n".join(formatted) if formatted else "등록된 수업 없음"


def format_docs_with_metadata(docs: List) -> str:
    """검색된 문서를 메타데이터 포함하여 포맷"""
    context_parts = []
    
    for i, doc in enumerate(docs, 1):
        board = doc.metadata.get('board_name', '출처불명')
        title = doc.metadata.get('title', '제목없음')
        date = doc.metadata.get('date', '날짜불명')
        content = clean_text(doc.page_content)
        
        context_parts.append(
            f"=== 문서 {i} ===\n"
            f"출처: {board}\n"
            f"제목: {title}\n"
            f"날짜: {date}\n"
            f"내용:\n{content}\n"
        )
    
    return "\n\n".join(context_parts) if context_parts else "관련 문서를 찾지 못했습니다."


def extract_sources(docs: List) -> List[Dict]:
    """검색된 문서에서 출처 정보 추출"""
    sources = []
    
    for doc in docs:
        sources.append({
            "board_name": doc.metadata.get('board_name', '출처불명'),
            "title": doc.metadata.get('title', '제목없음'),
            "date": doc.metadata.get('date', ''),
            "post_num": doc.metadata.get('post_num', '')
        })
    
    return sources

def format_user_info(user_info: Dict) -> str:
    lines = ["[사용자 정보]"]
    for key, value in user_info.items():
        if value is None or value == "":
            continue
        lines.append(f"- {key}: {value}")
    return "\n".join(lines)


def format_calendar(calendar: List[Dict]) -> str:
    if not calendar:
        return "등록된 캘린더 일정 없음"

    lines = []
    for ev in calendar:
        lines.append(
            f"- {ev.get('title', '일정')} "
            f"({ev.get('startDate')} {ev.get('startTime','')}"
            f" ~ {ev.get('endDate')} {ev.get('endTime','')})"
        )
    return "\n".join(lines)


def create_system_prompt(
    user_info: Dict,
    timetable: List[Dict],
    calendar: Optional[List[Dict]] = None
) -> str:
    """시스템 프롬프트 생성"""

    user_info_block = format_user_info(user_info)

    timetable_info = f"\n\n[사용자 시간표]\n{format_timetable(timetable)}"

    calendar = calendar or []
    calendar_info = f"\n\n[사용자 캘린더 일정]\n{format_calendar(calendar)}"

    system_prompt = f"""너는 성균관대학교 학생을 돕는 AI 어시스턴트야.

{user_info_block}
{timetable_info}
{calendar_info}

[매우 중요한 판단 규칙]
일정, 우선순위, "가장 먼저", "다음에 해야 할 일"과 관련된 질문에서는  
반드시 아래 **우선순위 기준**을 지켜 판단해야 한다.

1 사용자 캘린더 일정  
2 사용자 시간표  
3 참고 문서에 명시된 공식 일정  
4 이전 대화(history)는 맥락 이해용으로만 사용

! user_info / calendar / timetable에 없는 정보는
임의로 추측하지 말 것

[답변 규칙]
1. 제공된 참고 문서에 명확한 정보가 있으면 그것을 기반으로 답변
2. 날짜가 있는 정보는 반드시 날짜를 함께 언급
3. 정보가 불확실하거나 없으면 솔직하게 모른다고 말하기
4. **반드시 마크다운 형식으로 출력**:
   - 리스트는 `*` 또는 `-` 사용
   - 리스트 앞뒤로 빈 줄 필수
   - 중요한 날짜, 기한은 **볼드**로 강조
   - 제목은 ## 또는 ### 사용
5. 여러 항목이 있으면 리스트로 정리
6. 사용자 정보(캠퍼스, 학과, 학년, 학기, 시간표)를 고려한 맞춤형 답변 제공
7. 시간표를 고려하여 일정 충돌 여부를 알려줄 수 있음

[언어]
사용자가 한국어로 물으면 한국어로, 영어로 물으면 영어로 답변
"""
    return system_prompt




async def generate_rag_response_stream(
    question: str,
    history: List[Dict],
    user_info: Dict,
    timetable: List[Dict],
    calendar: List[Dict] | None = None
) -> AsyncGenerator[Dict, None]:
    """
    스트리밍 RAG 응답 생성
    
    Args:
        question: 사용자 질문
        history: 대화 히스토리
        user_info: DB에서 가져온 사용자 정보 (name, campus, department, grade, semester, admissionYear, additional_info)
        timetable: DB에서 가져온 시간표 정보
    
    Yields:
        - {"type": "sources", "sources": [...]}  # 출처 정보 (첫 번째)
        - {"type": "content", "content": "토큰"} # 스트리밍 컨텐츠
        - {"type": "done"}                       # 완료
        - {"type": "error", "message": "..."}   # 에러
    """
    
    try:
        # LLM 초기화 (streaming=True 필수)
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1, streaming=True)
        
        # 1. 문서 검색
        retriever = get_retriever(score_threshold=0.5)
        docs = retriever.invoke(question)
        #DEBUG
        print("[DEBUG] retrieved titles:", [(d.metadata.get("board_name"), d.metadata.get("title"), d.metadata.get("post_num")) for d in docs])

        
        # 2. 출처 정보 먼저 전송
        sources = extract_sources(docs)
        yield {
            "type": "sources",
            "sources": sources
        }
        
        # 3. Context 생성
        context_text = format_docs_with_metadata(docs)
        
        # 4. 시스템 프롬프트 생성 (DB 정보 활용)
        system_msg = create_system_prompt(user_info, timetable, calendar or [])
        
        # 5. 메시지 구성
        messages = [SystemMessage(content=system_msg)]
        
        # 이전 대화 추가
        for msg in history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))
        
        # 현재 질문 + Context
        current_msg = f"""[참고 문서]
{context_text}

[질문]
{question}

위 참고 문서와 사용자 정보를 바탕으로 답변해줘."""
        
        messages.append(HumanMessage(content=current_msg))
        
        # 6. 스트리밍 응답 생성
        async for chunk in llm.astream(messages):
            if chunk.content:
                yield {
                    "type": "content",
                    "content": chunk.content
                }
        
        # 7. 완료 신호
        yield {"type": "done"}
        
    except Exception as e:
        print(f"RAG Stream Error: {e}")
        yield {
            "type": "error",
            "message": "답변 생성 중 오류가 발생했습니다.",
            "details": str(e)
        }


def translate_response(text: str, target_language: str = "en") -> Dict:
    try:
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)
        
        lang_name = "영어" if target_language == "en" else "한국어"
        
        translation_prompt = f"""
다음 텍스트를 {lang_name}로 번역해줘.

요구사항:
1. 마크다운 형식은 그대로 유지
2. 의미를 정확하게 전달
3. 자연스러운 표현 사용
4. 볼드, 리스트 등 서식 유지

원본 텍스트:
{text}
"""
        
        response = llm.invoke([HumanMessage(content=translation_prompt)])
        
        return {
            "translated_text": response.content,
            "error": None
        }
        
    except Exception as e:
        print(f"Translation Error: {e}")
        return {
            "translated_text": None,
            "error": f"번역 중 오류가 발생했습니다: {str(e)}"
        }


def generate_bookmark_title(question: str, answer: str) -> str:
    """
    질문과 답변을 바탕으로 북마크 제목 생성
    답변을 참고하여 대화 맥락을 파악하고 완전한 제목 생성
    """
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)

    prompt = f"""
다음 대화의 핵심 주제를 파악하여 제목을 생성해줘.

중요: 질문만 보면 애매할 수 있으므로, 답변 내용을 참고하여 완전한 제목을 만들어야 해.

규칙:
1. 최대 30자 이내
2. 답변 내용을 분석하여 대화의 실제 주제 파악
3. 질문이 불완전하거나 맥락 의존적이면 답변에서 주제 추출
4. 명사형으로 끝낼 것 (예: "경영학과 졸업요건", "2학기 기말고사 일정")
5. 특수문자나 이모지 사용 금지
6. "~에 대한 질문", "~관련" 같은 불필요한 표현 제거
7. 가장 중요한 키워드를 앞에 배치

예시:
- 질문: "12월 학사일정 알려줘"
  답변: "12월에는 기말고사가..."
  제목: "12월 학사일정"

- 질문: "소프트웨어학과 졸업요건이 뭐야?"
  답변: "소프트웨어학과 졸업요건은 130학점..."
  제목: "소프트웨어학과 졸업요건"

- 질문: "그럼 경영학과는?"
  답변: "경영학과 졸업요건은 130학점이며..."
  제목: "경영학과 졸업요건"  ← 답변에서 주제 파악!

- 질문: "시험은 언제야?"
  답변: "2학기 기말고사는 12월 15일부터..."
  제목: "2학기 기말고사 일정"  ← 답변에서 구체화!

대화:
질문: {question}
답변: {answer[:300]}...

제목만 출력:
"""

    try:
        title = llm.invoke(prompt).content.strip()
        title = title.strip('"\'')
        if len(title) > 50:
            title = title[:47] + "..."
        return title
    except Exception as e:
        print(f"Title generation error: {e}")
        return question[:30] + ("..." if len(question) > 30 else "")


def extract_schedule_from_dialog(question: str, answer: str):
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)

    prompt = f"""
아래 대화를 분석하여 '일정' 데이터를 추출해줘.

매우 중요한 규칙 (시간 포함):

1. 날짜 + 시간 범위가 있는 경우:
   예: "2025년 12월 6일 09:00~18:00"
   - startDate = 2025-12-06
   - endDate = 2025-12-06
   - startTime = 09:00
   - endTime = 18:00

2. 날짜는 있고 시간이 없는 경우:
   - startTime = null
   - endTime = null
   - isAllDay = true

3. 기간만 있는 경우:
   예: 2025.12.22 ~ 2026.01.31
   - startTime = null
   - endTime = null

4. 시간 표현은 반드시 "HH:MM" 24시간 형식

5. 날짜가 없으면 반드시 "null" 출력
   (JSON 외 출력 금지)


최종 출력 형식 (JSON ONLY)

단일 일정이면:
{{
  "title": "...",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "startTime": "HH:MM" 또는 null,
  "endTime": "HH:MM" 또는 null,
  "isAllDay": true 또는 false,
  "type": "exam | schedule | personal | class | 기타",
  "location": "장소 또는 null"
}}

여러 일정이면 JSON 배열:
[
  {{
    "title": "...",
    "startDate": "...",
    "endDate": "...",
    "startTime": "...",
    "endTime": "...",
    "isAllDay": ...,
    "type": "...",
    "location": ...
  }},
  ...
]

대화 내용:

질문: {question}
답변: {answer}
"""

    return llm.invoke(prompt).content.strip()