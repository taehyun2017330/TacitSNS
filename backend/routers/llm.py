from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from openai import OpenAI
from config import get_settings

router = APIRouter()

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    model: str = "gpt-4o-mini"

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse)
async def chat_with_llm(request: ChatRequest):
    """
    Send a message to OpenAI and get a response
    """
    try:
        settings = get_settings()
        client = OpenAI(api_key=settings.openai_api_key)

        response = client.chat.completions.create(
            model=request.model,
            messages=[
                {"role": "user", "content": request.message}
            ]
        )

        return ChatResponse(
            response=response.choices[0].message.content
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
