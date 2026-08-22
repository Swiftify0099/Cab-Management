import os

auth_file = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'common', 'middleware', 'auth.py'))

with open(auth_file, 'r', encoding='utf-8') as f:
    text = f.read()

target = '''def require_role(*roles: str):
    """
    Factory dependency  restricts access to specific roles.
    Usage: current_user: AuthenticatedUser = Depends(require_role("driver"))
    """
    async def _require_role(
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if current_user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted. Required role(s): {', '.join(roles)}",
            )
        return current_user

    return _require_role'''

replacement = '''def require_role(*roles: str):
    allowed_roles = set(roles)
    if 'admin' in allowed_roles:
        allowed_roles.add('super_admin')
    async def _require_role(
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted.",
            )
        return current_user
    return _require_role'''

text = text.replace(target, replacement)
with open(auth_file, 'w', encoding='utf-8') as f:
    f.write(text)
print('Done!')
