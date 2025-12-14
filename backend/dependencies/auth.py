from fastapi import Header, HTTPException, status

async def get_current_user_id(x_user_id: str = Header(None)) -> str:
    """
    Simple auth dependency for HCI study.
    Gets user ID from X-User-ID header.

    For production, replace with proper Firebase token verification.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID header required",
        )

    return x_user_id
