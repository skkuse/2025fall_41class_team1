from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from typing import List, Dict, Optional, AsyncGenerator
from rag_engine import generate_rag_response_stream, translate_response, generate_bookmark_title, extract_schedule_from_dialog
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
import jwt

load_dotenv()

app = FastAPI(title="SKKU RAG API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== DB 연결 함수 =====

def get_db_connection():
    """MySQL 연결 생성"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 3306)),
            database=os.getenv("DB_NAME", "your_database"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", "")
        )
        return connection
    except Error as e:
        print(f"DB Connection Error: {e}")
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")


def get_user_info(user_id: int) -> Dict:
    """사용자 정보 조회"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT userID, email, name, department, grade, additional_info,
                   campus, admissionYear, semester
            FROM USER 
            WHERE userID = %s
        """, (user_id,))
        
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        
        return {
            "userID": user["userID"],
            "email": user["email"],
            "name": user["name"] or "미제공",
            "department": user["department"] or "미제공",
            "grade": user["grade"] or "미제공",
            "additional_info": user["additional_info"] or "",
            "campus": user.get("campus") or "미제공",
            "admissionYear": user.get("admissionYear") or "미제공",
            "semester": user.get("semester") or "미제공"
        }
        
    finally:
        cursor.close()
        conn.close()


def get_user_timetable(user_id: int) -> List[Dict]:
    """사용자 시간표 조회"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 가장 최근 시간표 ID 가져오기
        cursor.execute("""
            SELECT timetableID 
            FROM TIMETABLE 
            WHERE userID = %s 
            ORDER BY createdAt DESC 
            LIMIT 1
        """, (user_id,))
        
        timetable = cursor.fetchone()
        
        if not timetable:
            return []
        
        timetable_id = timetable["timetableID"]
        
        # 시간표의 수업 정보 가져오기
        cursor.execute("""
            SELECT courseName, dayOfWeek, startTime, endTime, location
            FROM TIMETABLE_ITEM
            WHERE timetableID = %s
            ORDER BY 
                FIELD(dayOfWeek, '월', '화', '수', '목', '금', '토', '일'),
                startTime
        """, (timetable_id,))
        
        items = cursor.fetchall()
        
        return [
            {
                "courseName": item["courseName"],
                "dayOfWeek": item["dayOfWeek"],
                "startTime": item["startTime"],
                "endTime": item["endTime"],
                "location": item.get("location") or ""
            }
            for item in items
        ]
        
    finally:
        cursor.close()
        conn.close()


def verify_user_token(authorization: str) -> int:
    """JWT 토큰 검증 및 사용자 ID 추출"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="토큰 없음")
    
    token = authorization.replace("Bearer ", "").strip()
    
    try:
        decoded = jwt.decode(
            token, 
            os.getenv("JWT_SECRET"), 
            algorithms=["HS256"]
        )
        
        user_id = decoded.get("userID")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰")
        
        return user_id
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다")
    except jwt.InvalidTokenError as e:
        print(f"JWT 검증 실패: {e}")
        raise HTTPException(status_code=401, detail="인증 실패")


# ===== Request Models =====

class ChatRequest(BaseModel):
    message: str
    history: List[Dict] = []
    message: str
    history: List[Dict] = []
    user_info: Dict
    timetable: List[Dict] = []
    calendar: List[Dict] = []


class TranslateRequest(BaseModel):
    text: str
    target_language: str


class BookmarkTitleRequest(BaseModel):
    question: str
    answer: str


class ScheduleSummaryRequest(BaseModel):
    question: str
    answer: str


# ===== Endpoints =====

@app.get("/")
async def root():
    """API 상태 확인"""
    return {
        "status": "online",
        "message": "SKKU RAG API is running"
    }


@app.post("/chat")
async def chat(
    req: ChatRequest,
    authorization: str = Header(None)
):
    """
    채팅 엔드포인트 (스트리밍)
    
    Headers:
        Authorization: Bearer {token} 또는 Bearer {userID}
    
    SSE 형식으로 응답:
    - data: {"type": "sources", "sources": [...]}
    - data: {"type": "content", "content": "토큰"}
    - data: {"type": "done"}
    - data: {"type": "error", "message": "..."}
    """
    
    # 사용자 인증
    user_id = verify_user_token(authorization)
    
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # DB에서 사용자 정보 조회
            user_info = get_user_info(user_id)
            timetable = get_user_timetable(user_id)
            
            print(f"[DEBUG] User Info: {user_info}")
            print(f"[DEBUG] Timetable: {timetable}")
            
            # RAG 스트리밍 응답 생성
            async for event in generate_rag_response_stream(
                question=req.message,
                history=req.history,
                user_info=user_info,
                timetable=timetable,
                calendar=req.calendar
            ):
                # SSE 형식으로 전송
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                
        except HTTPException as he:
            error_event = {
                "type": "error",
                "message": he.detail,
                "details": str(he)
            }
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
        except Exception as e:
            print(f"Chat stream error: {e}")
            error_event = {
                "type": "error",
                "message": "서버 오류가 발생했습니다.",
                "details": str(e)
            }
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/translate")
async def translate(req: TranslateRequest):
    """번역 엔드포인트"""
    try:
        result = translate_response(
            text=req.text,
            target_language=req.target_language
        )
        
        if result["error"]:
            raise HTTPException(
                status_code=500,
                detail={"error": result["error"]}
            )
        
        return {"translated_text": result["translated_text"]}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Translation endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": f"번역 중 오류가 발생했습니다: {str(e)}"}
        )


@app.get("/health")
async def health_check():
    """헬스 체크"""
    import os
    
    db_exists = os.path.exists("chroma_db")
    
    # DB 연결 테스트
    try:
        conn = get_db_connection()
        conn.close()
        db_status = "connected"
    except:
        db_status = "disconnected"
    
    return {
        "status": "healthy",
        "vector_db": "ready" if db_exists else "not_found",
        "mysql_db": db_status,
        "message": "All systems operational" if db_exists and db_status == "connected" 
                   else "Please check database connections"
    }


@app.post("/bookmark/title")
async def bookmark_title(req: BookmarkTitleRequest):
    """북마크 제목 생성 API"""
    try:
        title = generate_bookmark_title(req.question, req.answer)

        if not title:
            raise HTTPException(status_code=500, detail="제목 생성 실패")

        return {
            "success": True,
            "title": title
        }

    except Exception as e:
        print("Bookmark title error:", e)
        raise HTTPException(status_code=500, detail=str(e))


def clean_llm_output(output: str) -> str:
    """
    LLM이 반환한 문자열에서 JSON 파싱을 방해하는 요소들을 최대한 제거/정리
    반환값은 "json.loads() 가능한 문자열"을 목표로 함
    """
    if output is None:
        return ""

    text = output.strip()

    # 1) 코드펜스 제거 (```json ... ``` 또는 ``` ... ```)
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1].strip()
            # "json" 같은 언어 태그 제거
            if text.lower().startswith("json"):
                text = text[4:].strip()

    # 2) 스마트 따옴표를 일반 따옴표로 변환
    text = (
        text.replace("“", '"')
            .replace("”", '"')
            .replace("‘", "'")
            .replace("’", "'")
    )

    # 3) 불필요한 BOM/제어문자 같은 것 최소 정리
    text = text.replace("\ufeff", "").strip()

    # 4) 정말 가끔 앞뒤에 잡설이 붙는 경우가 있음
    #    "가장 바깥 JSON 블록"만 아주 보수적으로 추출 시도
    #    - { ... } 또는 [ ... ] 로 시작하는 구간을 찾는 정도만 함
    first_obj = text.find("{")
    first_arr = text.find("[")
    start_candidates = [i for i in [first_obj, first_arr] if i != -1]
    if start_candidates:
        start = min(start_candidates)
        # 끝도 보수적으로: 마지막 } 또는 ] 위치
        end_obj = text.rfind("}")
        end_arr = text.rfind("]")
        end_candidates = [i for i in [end_obj, end_arr] if i != -1]
        if end_candidates:
            end = max(end_candidates)
            if end > start:
                text = text[start:end+1].strip()

    return text


def safe_json_parse(output: str):
    """
    JSON 파싱을 '안전하게' 수행
    """
    text = output.strip()

    # 1) 정상 파싱 시도
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2) 단일 객체처럼 보이면 리스트로 감싸서 재시도
    if text.startswith("{") and text.endswith("}"):
        obj = json.loads(text)
        return [obj]

    # 3) JSON이 아님 -> 에러 올려서 호출부에서 처리
    raise json.JSONDecodeError("Invalid JSON", text, 0)



@app.post("/schedule/summary")
async def schedule_summary(req: ScheduleSummaryRequest):
    try:
        raw = extract_schedule_from_dialog(req.question, req.answer)

        if raw == "null":
            raise HTTPException(status_code=400, detail="일정 정보를 추출할 수 없습니다.")

        cleaned = clean_llm_output(raw)

        try:
            schedule = safe_json_parse(cleaned)
        except Exception:
            print("[LLM JSON ERROR RAW]\n", raw)
            print("[CLEANED]\n", cleaned)
            raise HTTPException(status_code=400, detail="LLM JSON 파싱 오류")

        return {
            "success": True,
            "schedule": schedule
        }

    except HTTPException:
        raise
    except Exception as e:
        print("Calendar summary error:", e)
        raise HTTPException(status_code=500, detail="서버 내부 오류")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)