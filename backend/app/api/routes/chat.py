from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    SessionSummary,
    SessionMessage,
    SessionUpdateRequest,
)

from app.agent.travel_agent import travel_agent, Runner, tool_call_log
from app.agent import travel_agent as travel_agent_module

from app.db.postgres import get_db
from app.models.postgres_models import ChatSession, Message, User
from app.core.security import get_current_user_id


router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Determine session ID
    if request.session_id:
        session_id = int(request.session_id)

        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id)
            .first()
        )

        if not session or session.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Session does not belong to user",
            )

    else:
        # Create new chat session for the current user
        new_session = ChatSession(user_id=user_id)

        db.add(new_session)
        db.commit()
        db.refresh(new_session)

        session_id = new_session.id

    # Get user email from DB
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user and user.email:
        travel_agent_module.current_user_email = user.email
    else:
        travel_agent_module.current_user_email = ""

    # Save authenticated user ID for this agent request
    authenticated_user_id = str(user_id)

    # Save user message
    user_msg = Message(
        session_id=session_id,
        role="user",
        content=request.message,
    )

    db.add(user_msg)
    db.commit()

    # Retrieve full conversation history for this session
    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at)
        .all()
    )

    history = [
        {
            "role": m.role,
            "content": m.content,
        }
        for m in messages
    ]

    # Add authenticated user ID to the agent context
    history_with_user = [
        {
            "role": "system",
            "content": (
                f"The authenticated user's ID is '{authenticated_user_id}'. "
                "Always use this exact user_id when calling memory tools. "
                "Never use demo_user and never invent another user_id."
            ),
        },
        *history,
    ]

    # Clear tool call log before running agent
    tool_call_log.clear()

    # Run agent with authenticated user ID
    result = await Runner.run(
        travel_agent,
        input=history_with_user,
    )

    # Capture tool calls made during this run
    calls = list(tool_call_log)

    # Extract options if suggest_options tool was called
    options = None
    for call in reversed(calls):  # Look for most recent
        if call.get("tool") == "suggest_options":
            options = call.get("data")
            if isinstance(options, list):
                # Ensure all items are strings
                options = [str(opt) for opt in options]
            break

    # Save assistant message
    assistant_msg = Message(
        session_id=session_id,
        role="assistant",
        content=result.final_output,
    )

    db.add(assistant_msg)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This chat session no longer exists. It may have been deleted.",
        )

    return ChatResponse(
        reply=result.final_output,
        session_id=str(session_id),
        tool_calls=calls,
        options=options,
    )


@router.get("/sessions", response_model=List[SessionSummary])
async def list_sessions(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(
            ChatSession.pinned.desc(),
            ChatSession.created_at.desc(),
        )
        .all()
    )

    result = []

    for sess in sessions:
        preview = "New chat"

        if sess.title:
            preview = sess.title

        else:
            # Get first user message
            first_user_msg = (
                db.query(Message)
                .filter(
                    Message.session_id == sess.id,
                    Message.role == "user",
                )
                .order_by(Message.created_at.asc())
                .first()
            )

            if first_user_msg:
                preview = first_user_msg.content[:50]

        result.append(
            SessionSummary(
                id=str(sess.id),
                created_at=sess.created_at,
                preview=preview,
                pinned=sess.pinned,
            )
        )

    return result


@router.get(
    "/sessions/{session_id}/messages",
    response_model=List[SessionMessage],
)
async def get_session_messages(
    session_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    if session.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Session does not belong to user",
        )

    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return [
        SessionMessage(
            role=m.role,
            content=m.content,
        )
        for m in messages
    ]


@router.patch(
    "/sessions/{session_id}",
    response_model=dict,
)
async def update_session(
    session_id: int,
    request: SessionUpdateRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    if session.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Session does not belong to user",
        )

    if request.title is not None:
        session.title = request.title

    if request.pinned is not None:
        session.pinned = request.pinned

    db.commit()

    return {"status": "ok"}


@router.delete(
    "/sessions/{session_id}",
    response_model=dict,
)
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    if session.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Session does not belong to user",
        )

    db.delete(session)
    db.commit()

    return {"status": "deleted"}