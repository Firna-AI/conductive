# Member failure notice icon differs from mockup

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, Milestone 6 of the org skills repository plan.
- **Location:** `src/members/ComputerSections.tsx`, `docs/mockups/src/components/common/LoadFailure.tsx`.
- **Reason:** The fix changes the icon of every failure notice in the members UI, and the user decides which side of a mockup and product mismatch is right.

### 1. Member failure notice icon differs from mockup

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Mockup.
- **Location:** `src/members/ComputerSections.tsx`.
- **Terms:**
  - **Members UI:** the read-only views of the org settings for a member who is not an admin, under `src/members/`. Its README forbids imports of mockup components.
- **Background:** The Skills section of the Cloud computer tab shows a notice when the list of skills does not load. The mockup draws this notice with a warning triangle for admins and for members. The admin view in the app uses the shared notice with the triangle.
- **Problem:** The members UI draws its own failure notice, with a circle icon. So a member sees a circle where the mockup shows a triangle. Every other failure notice of the members UI also uses the circle.
- **Impact if no action:** Members see a small visual difference from the mockup and from the admin view.
- **Root question:** Which icon does a failure notice show to a member?
- **Options:**
  - **A.** Keep the circle, and change the member mockups to the circle. Effort: Small.
  - **B.** Change the members UI failure notice to the triangle. This changes every failure notice of the members UI. Effort: Small.
  - **C.** Use the triangle only in the Skills notice of the members UI. The members UI then has two failure icons. Effort: Small.
- **Left out:** None.
- **Wider fix:** B. One icon for every failure notice in both views.
- **Previous examples:** None found.
- **Recommendation:** B. Admins and members then see the same failure notice.
- **Action:** ask the user, because the fix decides which side of a mockup and product mismatch is right, and it changes notices outside this feature.
