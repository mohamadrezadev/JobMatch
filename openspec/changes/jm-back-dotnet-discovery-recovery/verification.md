# Verification

The original persisted run ba64dcde-774b-4be7-8b86-9382eadc5d2a stored targetRoles=["بکند دات نت"], locations=["Tehran"] and requestedCount=10. It ended PARTIAL with zero confirmed results. Jobvision made three model extraction calls which timed out; Jobinja extracted one candidate but accepted none. IranTalent and e-estekhdam also timed out.

After the change, a read-only live AgentSearchService probe used that exact intent, all four configured sources and the existing sixty-second deadline. It confirmed two matching Jobvision vacancies: Senior Backend Developer (.NET), Houman, Tehran/Vanak; Senior .NET Backend Developer, sanacash, Tehran/Tajrish. They arrived at 4.761 and 4.855 seconds. The full search finished partial in 58.620 seconds. Jobvision used zero model extraction calls and had zero timeouts, although some fetched pages returned empty content. Jobinja and IranTalent still had retrieval/extraction failures; e-estekhdam returned connection-error pages or rejected pages. Ten vacancies were not achieved.

Safe measurement artifact: artifacts/dotnet-recovery-result.json (ignored local artifact). This is a provider/domain measurement with a candidate callback, not a persisted chat run or deployed end-to-end benchmark.

Targeted regression: 62 tests in three suites passed. Backend build and TypeScript checking passed. The full backend unit suite passed all 428 tests in 34 suites. Strict OpenSpec validation and git diff whitespace checking passed. Changes have not been deployed in this task.
