# Design

Introduce feature-independent LoadingState, LoadingSpinner, ContentSkeleton and PageLoading in components/ui. Use the existing brand palette, soft gradient surfaces, ring spinner and motion-safe skeleton pulse. Skeletons are aria-hidden and contain no focusable elements. A polite atomic status explains the current operation. After ten seconds, a cancellable component-local timer explains that a response is still pending; it does not change actual request state or fabricate progress.

The existing Button primitive gets an explicit loading prop, disables repeat clicks and sets aria-busy. Data loaders rely on existing requests rather than cosmetic delays. Settings and resume distinguish initial fetching from mutation busy state; profile uses its existing fetching flag. Initial forms are replaced by skeletons. Mutations retain their forms and show compact status. Resume busy labels correspond to the actual action. Existing SSE stage labels remain the source of truth for active discovery; indicators stop for finished runs.

Add App Router loading boundaries for module/route transitions and retain client loaders for asynchronous API data. Existing error handling and retry remain separate. Avoid fullscreen overlays and artificial minimum wait times.
