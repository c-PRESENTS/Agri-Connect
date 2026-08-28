**Design QA status**

- Source visual truth: `C:\Users\harsh\AppData\Local\Temp\codex-clipboard-799f45a8-ff3c-4e75-9463-7884cc21c98c.png`
- Implementation route: `http://localhost:5000/admin/control-centre`
- Implementation evidence: `C:\Users\harsh\AppData\Local\Temp\agriconnect-admin-shell-no-overlap.png`
- Combined comparison evidence: `C:\Users\harsh\AppData\Local\Temp\agriconnect-admin-overlap-comparison.png`
- Source pixels: 387 x 1022
- Implementation viewport: 1120 x 862 CSS pixels at device scale factor 1.25
- State: the source is an authenticated Organisation Centre with overlapping global and organisation navigation; the available in-app browser is unauthenticated and redirected to the Organisation Portal sign-in page.

**Findings**

- [P0] The two navigation systems occupied the same viewport edge.
  Location: shared `AppShell` surrounding `/admin/*` routes.
  Evidence: the source shows the global AgriConnect icon rail covering the left portion of the Organisation sidebar and clipping its labels.
  Impact: primary administration navigation is obscured and difficult to operate.
  Fix applied: `/admin` and every `/admin/*` route now bypass the marketplace shell's global rail, market panel, and mobile navigation. Admin pages retain their own existing navigation and authentication shell.

- [P0] Authenticated dashboard comparison remains unavailable.
  Location: `/admin/control-centre`.
  Evidence: the corrected shell capture shows a clean, unobstructed Organisation Portal sign-in page with no global rail, but the browser session cannot display the authenticated dashboard.
  Impact: the exact post-fix Organisation sidebar and dashboard content cannot be compared in the same authenticated state as the source.
  Fix: refresh the route in an authenticated Super Admin session and capture the dashboard.

**Required fidelity surfaces**

- Fonts and typography: the available admin sign-in state is unobstructed; authenticated dashboard typography remains blocked by the state mismatch.
- Spacing and layout rhythm: the duplicate left rail is removed from the admin shell; authenticated dashboard spacing remains blocked.
- Colors and visual tokens: the admin-owned background and card colors render without interference; dashboard comparison remains blocked.
- Image quality and asset fidelity: no new image assets were introduced or changed.
- Copy and content: no copy was changed; authenticated dashboard comparison remains blocked.

**Full-view comparison evidence**

The source and post-fix capture were placed together in the combined comparison evidence. It confirms that the shared marketplace rail is no longer rendered on an `/admin/*` route. The captures do not represent the same authentication state, so no broader dashboard-fidelity claim is made.

**Focused region comparison evidence**

The left viewport edge was checked in the implementation capture: the global icon rail is absent and the admin-owned surface begins at the viewport edge. An authenticated Organisation sidebar capture is still required for final confirmation.

**Primary interactions and console**

- Direct navigation to `/admin/control-centre` correctly preserves the protected-route redirect to `/admin/sign-in` when unauthenticated.
- The redirected admin page renders without the global rail or market panel.
- Browser console errors checked: none.

**Comparison history**

1. Source capture: P0 overlap between the global app rail and fixed Organisation sidebar.
2. Fix: classified all `/admin` routes as admin-owned shell routes in `frontend/src/app/shell.tsx`.
3. Post-fix capture: no global rail or horizontal overlap on the reachable admin sign-in state; authenticated dashboard verification remains blocked.

**Implementation checklist**

- Refresh the authenticated Organisation Centre.
- Confirm the Organisation sidebar is the only left navigation surface.
- Recheck sidebar collapse/expand and dashboard width at the same state.

final result: blocked
