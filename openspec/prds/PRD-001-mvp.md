# PRD — Pathly MVP 1.0

### AI Career Copilot | دستیار هوشمند مسیر شغلی
**نسخه:** MVP 1.0 | **هدف:** ساخت محصول قابل دموی ۷ روزه برای BuildX  
**تمرکز:** برنامهنویسان Junior و افراد ابتدای مسیر شغلی

---

## Core Product Loop
```
Create Profile → Add Skills → Set Preferences → Discover Jobs
→ Match Analysis → Why This Job? → Skill Gap → Generate Tailored Resume → Apply
```

## Key Constraints (MUST follow)
1. **No fabrication**: NEVER invent experience, projects, companies, skills, certificates in resumes
2. **Explainable scores**: Every match % must have human-readable justification
3. **Feedback loop**: JobFeedback MUST influence recommendation ranking after 3+ entries
4. **Integrity guard**: Post-process all LLM resume output against verified user data

## Demo Scenario
User: Junior .NET Developer with C#, .NET, ASP.NET Core, SQL, Git, REST API (1 year exp)
→ Sees recommended jobs → Picks one (e.g., 82% match)
→ Sees: ✓ matched skills / ⚠ missing skills (Docker, Redis)
→ Generates tailored PDF resume from real data only
