import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
profile_file = os.path.join(ROOT, "auth-service", "app", "api", "v1", "profile.py")

with open(profile_file, "r", encoding="utf-8") as f:
    content = f.read()

get_my_profile_code = """@router.get(
    "",
    response_model=APIResponse[CustomerProfileResponse],
    summary="Get current user profile (root alias)",
)
@router.get(
    "/",
    response_model=APIResponse[CustomerProfileResponse],
    summary="Get current user profile (slash alias)",
)
@router.get(
    "/me",
    response_model=APIResponse[CustomerProfileResponse],
    summary="Get current user profile",
)
async def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await get_customer_profile(db=db, user_id=current_user.id)
    if not profile:
        user_obj = getattr(current_user, "_user", None)
        user_name = getattr(user_obj, "name", None) or getattr(user_obj, "full_name", "") or ""
        user_photo = getattr(user_obj, "profile_photo", None) or getattr(user_obj, "avatar_url", None)
        resp = CustomerProfileResponse(
            user_id=current_user.id,
            full_name=user_name,
            gender=None,
            dob=None,
            emergency_contact=None,
            profile_photo=get_file_url(user_photo) if user_photo else None,
            reward_points=0,
            wallet_balance=0,
            referral_code=getattr(user_obj, "referral_code", None),
            women_only_mode=False,
            subscription_plan_id=None,
        )
        return APIResponse(message="Profile setup pending", data=resp)

    resp = CustomerProfileResponse(
        user_id=profile.user_id,
        full_name=profile.full_name,
        gender=profile.gender,
        dob=profile.dob,
        emergency_contact=profile.emergency_contact,
        profile_photo=get_file_url(profile.profile_photo) if profile.profile_photo else None,
        reward_points=profile.reward_points,
        wallet_balance=profile.wallet_balance,
        referral_code=profile.referral_code,
        women_only_mode=profile.women_only_mode,
        subscription_plan_id=profile.subscription_plan_id,
    )
    return APIResponse(message="Profile fetched", data=resp)
"""

# Replace the get_my_profile block
start_marker = '@router.get(\n    "",'
if start_marker not in content:
    start_marker = '@router.get(\n    "/me",'

end_marker = '@router.patch(\n    "/me",'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + get_my_profile_code + "\n\n" + content[end_idx:]
    with open(profile_file, "w", encoding="utf-8") as f:
        f.write(content)
    print("[OK] Fixed get_my_profile in profile.py!")
else:
    print(f"Indices: {start_idx}, {end_idx}")
