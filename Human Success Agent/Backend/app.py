from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
import uvicorn
from agent import HumanSuccessAgent

app = FastAPI(
    title="Human Success Guide API",
    description="Guiding people through their spiritual, neurological, and biological design",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agent
agent = HumanSuccessAgent()

# Models
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None  # For backward compatibility

class ChatResponse(BaseModel):
    response: str
    user_id: str
    tools_used: List[str] = []
    error: Optional[str] = None

class JourneyResponse(BaseModel):
    user_id: str
    current_phase: str
    message_count: int
    evidence_count: int
    days_active: int

class EvidenceResponse(BaseModel):
    evidence: List[Dict[str, Any]]
    count: int

class HealthResponse(BaseModel):
    status: str
    agent: str
    message: str

# Routes
@app.get("/", response_model=HealthResponse)
async def root():
    return HealthResponse(
        status="healthy",
        agent="Human Success Guide",
        message="Guiding people to understand how they were created and why."
    )

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to the Human Success Guide"""
    # Use user_id if provided, otherwise use session_id, otherwise generate new
    user_id = request.user_id or request.session_id or str(uuid.uuid4())
    
    try:
        result = agent.process_message(request.message, user_id)
        
        if result["success"]:
            return ChatResponse(
                response=result["response"],
                user_id=result["user_id"],
                tools_used=result["tools_used"]
            )
        else:
            return ChatResponse(
                response="I'm having trouble connecting right now. Please try again in a moment.",
                user_id=user_id,
                error=result.get("error", "Unknown error")
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/journey/{user_id}", response_model=JourneyResponse)
async def get_journey(user_id: str):
    """Get a user's current journey status"""
    try:
        journey = agent.get_user_journey(user_id)
        return JourneyResponse(**journey)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/evidence/{user_id}", response_model=EvidenceResponse)
async def get_evidence(user_id: str):
    """Get evidence collected for a user"""
    try:
        evidence = agent._get_user_evidence(user_id)
        return EvidenceResponse(
            evidence=evidence,
            count=len(evidence)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/user/{user_id}")
async def clear_user(user_id: str):
    """Clear all data for a user"""
    try:
        agent.clear_user_data(user_id)
        return {"status": "cleared", "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)