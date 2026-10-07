## ADDED Requirements

### Requirement: Distinguishable chat authors
Chat SHALL align user messages physically right and assistant messages physically left, with visible author labels and avatars.

#### Scenario: Display mixed-language history
- **WHEN** a guest or authenticated conversation displays user and assistant messages
- **THEN** users appear right and assistants left even in an RTL page
- **AND** each message text determines its own reading direction

#### Scenario: Pending send
- **WHEN** a user message is being sent
- **THEN** it appears on the same right side with a sending-state label

### Requirement: Assistant work attribution
Request activity SHALL explicitly identify assistant work while retaining actual request progress.

#### Scenario: Inspect request progress
- **WHEN** a request is active or its history is expanded
- **THEN** its activity panel identifies the assistant and preserves existing progress/result details
