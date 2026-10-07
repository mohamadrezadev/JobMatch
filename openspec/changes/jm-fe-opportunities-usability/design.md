# Design

Use a feature-local JobFilters component for draft inputs and a JobsPagination component for navigation. Retain native select controls for keyboard and mobile support, with visible labels, consistent sizing and focus styles. Search/city/work type are the main controls. Experience, role, skills and salary are optional; remove duplicate quick filters that can override them.

JobsView owns applied filters and requested page. Explicit submission trims strings and resets page synchronously, preventing requests for the previous page with new filters. Server-confirmed page is displayed until the next response completes. Existing alive guard rejects stale responses. On navigation focus and scroll return to the list. Pagination uses first/last/current-neighbour pages and ellipses to bound width. Controls wrap on small viewports.

Loading hides outdated cards and uses skeletons. Errors hide stale results and pagination, retaining retry of the requested page. Empty results offer filter reset and assistant search. Matching and job-view analytics wait for successful loading.

Tradeoff: filtering needs an explicit submit; helper text explains this. Native selects preserve established platform interaction without a new UI dependency. Optional total is used when available; otherwise only current-page count is shown.
