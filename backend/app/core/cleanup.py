import asyncio
import datetime
import logging
from sqlalchemy import select, or_
from app.db.session import AsyncSessionLocal
from app.db.models import Share
from app.api.v1.endpoints.shares import shred_file

logger = logging.getLogger(__name__)

async def cleanup_expired_shares():
    """Periodically marks expired shares as consumed and shreds any physical file assets."""
    while True:
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.datetime.utcnow()
                stmt = select(Share).where(
                    or_(
                        Share.expires_at < now,
                        Share.view_count >= Share.max_views,
                        Share.is_revoked == True
                    ),
                    Share.is_consumed == False
                )
                result = await db.execute(stmt)
                expired_shares = result.scalars().all()

                for share in expired_shares:
                    share.is_consumed = True
                    share.encrypted_payload = None
                    shred_file(share.file_storage_path)
                    share.file_storage_path = None
                await db.commit()
        except Exception as e:
            logger.error(f"Error in background cleanup task: {e}")
        
        await asyncio.sleep(60)  # Check every 60 seconds
