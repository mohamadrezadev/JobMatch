# PRD-001 — Career Copilot Chat & Candidate Profile

**Product:** JobMatch / Pathly  
**Priority:** P0  
**Status:** Planned  
**Dependency:** Existing Auth, User, Profile, Skill modules

## 1. هدف

ساخت یک رابط چت که کارجو بتواند به زبان طبیعی با JobMatch صحبت کند. کاربر نباید برای شروع جستجوی کار مجبور به داشتن رزومه یا پروفایل کامل باشد.

نمونه:

```text
کاربر: دنبال کار بک‌اند هستم.
ایجنت: ترجیح می‌دی دورکار، حضوری یا هیبرید؟
کاربر: دورکار.
ایجنت: حداقل حقوق مدنظرت چقدره؟
کاربر: ۱۰ میلیون.
```

سیستم باید در پشت صحنه نتیجه را به داده ساختاریافته تبدیل کند:

```json
{
  "targetRoles": ["Backend Developer"],
  "workTypes": ["Remote"],
  "minimumSalary": 10000000,
  "currency": "TOMAN"
}
```

## 2. Problem

کاربران معمولاً اطلاعات خود را به شکل فرم ساختاریافته وارد نمی‌کنند و به‌صورت طبیعی می‌گویند: «یه کار بک‌اند دورکار می‌خوام حداقل ۱۰ تومن.» JobMatch باید مکالمه را بفهمد و اطلاعات موردنیاز را طی گفتگو تکمیل کند.

## 3. Goals

سیستم MUST:

- امکان چت با Career Copilot را فراهم کند.
- تاریخچه مکالمه را نگه دارد.
- intent کاربر را تشخیص دهد.
- ترجیحات کاری را از متن استخراج کند.
- اطلاعات ناقص را تشخیص دهد.
- فقط در صورت نیاز سؤال تکمیلی بپرسد.
- اطلاعات تأییدشده را ذخیره کند.
- اطلاعات فرضی تولید نکند.
- امکان اصلاح ترجیحات در ادامه مکالمه را فراهم کند.

## 4. Supported Intents

```text
JOB_SEARCH
UPDATE_SEARCH
PROFILE_UPDATE
JOB_DETAILS
JOB_FEEDBACK
RESUME_BUILD
GENERAL_CAREER_QUESTION
```

مثال:

```text
"کار React می‌خوام" → JOB_SEARCH
"فقط دورکارها رو نشون بده" → UPDATE_SEARCH
"Python بلد نیستم" → PROFILE_UPDATE
"برای این آگهی رزومه بساز" → RESUME_BUILD
```

## 5. Conversation Model

```prisma
model Conversation {
  id        String   @id @default(uuid())
  userId    String?
  status    String   @default("Active")
  context   Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages ConversationMessage[]
}

model ConversationMessage {
  id             String   @id @default(uuid())
  conversationId String
  role           String
  content        String
  metadata       Json?
  createdAt      DateTime @default(now())

  conversation Conversation
    @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}
```

## 6. Search Intent Model

```ts
interface JobSearchIntent {
  targetRoles: string[];
  preferredSkills?: string[];
  excludedSkills?: string[];
  workTypes?: Array<'Remote' | 'Hybrid' | 'OnSite'>;
  locations?: string[];
  minimumSalary?: number;
  currency?: 'TOMAN';
  experienceLevel?: string;
  excludedCompanies?: string[];
  keywords?: string[];
}
```

## 7. Conversational Rules

اگر کاربر بگوید:

```text
یه کار بک‌اند Node دورکار بالای ۱۵ تومن می‌خوام.
```

سیستم باید مستقیماً استخراج کند:

```json
{
  "targetRoles": ["Backend Developer", "Node.js Developer"],
  "preferredSkills": ["Node.js"],
  "workTypes": ["Remote"],
  "minimumSalary": 15000000
}
```

و سؤال اضافی نپرسد مگر واقعاً برای جستجو لازم باشد.

## 8. Missing Information

برای شروع جستجو فقط وجود حداقل یک `targetRole` کافی است. ایجنت MAY پیشنهاد کند که کاربر نوع همکاری یا حداقل حقوق را مشخص کند، اما نباید او را مجبور کند.

## 9. Updating Conversation Context

```text
User: کار بک‌اند می‌خوام.
```

```json
{"targetRoles":["Backend Developer"]}
```

سپس:

```text
User: فقط دورکار.
```

```json
{
  "targetRoles":["Backend Developer"],
  "workTypes":["Remote"]
}
```

و سپس:

```text
User: Node بهتره.
```

```json
{
  "targetRoles":["Backend Developer","Node.js Developer"],
  "preferredSkills":["Node.js"],
  "workTypes":["Remote"]
}
```

## 10. Candidate Facts vs Preferences

سیستم باید بین اطلاعات واقعی فرد و ترجیحات کاری تفاوت قائل شود.

Candidate Facts:

```text
Node.js بلد هستم.
۲ سال سابقه دارم.
دانشجوی مهندسی نرم‌افزار هستم.
```

Preferences:

```text
کار دورکار می‌خوام.
حداقل ۱۵ میلیون.
شرکت تهران باشه.
```

این دو دسته MUST جدا ذخیره شوند.

## 11. Truthfulness Rule

ایجنت MUST NOT نتیجه‌گیری تأییدنشده را به پروفایل اضافه کند. اگر کاربر بگوید «یه پروژه فروشگاه اینترنتی ساختم»، سیستم حق ندارد آن را به «۳ سال سابقه حرفه‌ای تجارت الکترونیک» تبدیل کند.

## 12. API

```http
POST /api/chat/message
```

Request:

```json
{
  "conversationId": "optional-uuid",
  "message": "یه کار بک‌اند دورکار بالای ۱۰ تومن می‌خوام"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "message": "چند موقعیت مناسب برات جستجو می‌کنم.",
    "intent": "JOB_SEARCH",
    "searchContext": {
      "targetRoles": ["Backend Developer"],
      "workTypes": ["Remote"],
      "minimumSalary": 10000000
    }
  }
}
```

## 13. Backend Structure

```text
backend/src/modules/chat/

chat.module.ts
chat.controller.ts
chat.service.ts
conversation.service.ts
intent.service.ts
context.service.ts

dto/
  send-message.dto.ts

types/
  conversation.types.ts
  search-intent.types.ts
```

## 14. Frontend

مسیر پیشنهادی:

```text
/chat
```

UI اصلی باید شامل پیام‌های کاربر، پاسخ ایجنت، وضعیت جستجو و ورودی پیام باشد.

## 15. Definition of Done

PRD-001 کامل است زمانی که:

- کاربر بتواند Conversation بسازد.
- پیام ارسال کند.
- سیستم intent را تشخیص دهد.
- اطلاعات job search استخراج شوند.
- context بین پیام‌ها باقی بماند.
- کاربر بتواند ترجیحات قبلی را تغییر دهد.
- اطلاعات تأییدنشده به پروفایل اضافه نشوند.
- SearchIntent آماده ارسال به Job Discovery باشد.

## 16. خروجی مرحله

```text
User
 ↓
Chat
 ↓
Intent Extraction
 ↓
Conversation Context
 ↓
Structured Job Search Request
```

در این مرحله هنوز لازم نیست Hermes جستجو کند؛ هدف این است که JobMatch بتواند کاربر را درست بفهمد.
