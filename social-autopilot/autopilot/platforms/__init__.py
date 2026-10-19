"""Platform adapters. Each one offers the same small interface:

    publish(post, media) -> str            # returns the platform's post id
    recent_comments(limit_posts) -> list   # [{"id", "text", "username", "media_id"}]
    reply(comment_id, text) -> None
"""


class PlatformError(RuntimeError):
    """A platform API call failed; the message is safe to show in logs."""
