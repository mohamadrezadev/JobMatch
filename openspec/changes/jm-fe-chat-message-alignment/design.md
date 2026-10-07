# Design

Use a shared ChatMessage component with an LTR outer layout to make physical left/right independent of the page direction. User rows justify-end with the avatar after the bubble; assistant rows justify-start with the avatar before it. Bubble UI stays RTL and message text uses dir=auto. Width is bounded and long words wrap.

Visible labels identify the user as شما and assistant as دستیار کارمچ. A pending label appears only while submission is pending. Greetings use the same assistant component. Existing run activity stays associated with its initiating user message and is labelled فعالیت دستیار کارمچ, aligned left. Preserve streaming, retries, drafts and history handling.
