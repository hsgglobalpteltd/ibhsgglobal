<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Style Guidelines
- **Corner Radius Uniformity**: All containers, cards, buttons, inputs, dropdowns, and modals must use the exact same corner radius ratio. We standardise on `rounded-lg` (8px) for all squared elements. Proportional nested scaling is permitted, but standard buttons and outer containers should share the `rounded-lg` class. Circular buttons/toggles remain `rounded-full`.
- **Full-Height Layout Standards**: To maximize screen real estate and prevent nested scrolling issues, all modules must occupy the full available vertical height of the screen. 
  - **DataTables**: Must always be configured with full-height calculation offsets (e.g., `height="h-[calc(100vh-240px)]"` or `height="h-[calc(100vh-220px)]"`) to fill the viewport and handle vertical scrolling natively inside the table container rather than letting the parent page overflow.
  - **Calculator & Builder Cards**: Should use `h-[calc(100vh-240px)]` and `min-h-[500px]` to fill the height dynamically.
  - **Generator Modules**: Forms and canvases must use `h-[calc(100vh-135px)]` or similar viewport calculations to match the screen boundaries.

