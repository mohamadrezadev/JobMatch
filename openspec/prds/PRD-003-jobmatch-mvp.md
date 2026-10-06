# PRD — JobMatch MVP

## 1. مشخصات سند

**نام محصول:** JobMatch  
**نسخه سند:** 1.0  
**وضعیت:** Draft  
**هدف نسخه:** تکمیل MVP قابل استفاده برای جستجوی شغل، تحلیل تطابق، دریافت بازخورد و ساخت رزومه شخصی‌سازی‌شده  
**خارج از Scope این نسخه:** Academy / Learning Platform

---

# 2. معرفی محصول

JobMatch یک Career Copilot مبتنی بر هوش مصنوعی است که به کارجو کمک می‌کند فرصت‌های شغلی مناسب را پیدا کند، میزان تطابق خود با هر موقعیت را درک کند، نقاط ضعف مهارتی خود را بشناسد و برای فرصت‌های مناسب رزومه شخصی‌سازی‌شده تولید کند.

تجربه اصلی محصول حول یک Chat-based Career Copilot شکل می‌گیرد.

کاربر باید بتواند با زبان طبیعی، مخصوصاً فارسی، درخواست خود را بیان کند.

مثال:

> یک کار Backend .NET توی تهران می‌خوام، حداقل حقوق ۶۰ میلیون، ترجیحاً هیبرید.

JobMatch باید این درخواست را به معیارهای قابل جستجو تبدیل کند، فرصت‌های واقعی را از منابع موجود پیدا کند، نتایج را رتبه‌بندی کند و دلیل پیشنهاد هر فرصت را به کاربر توضیح دهد.

---

# 3. مسئله

فرآیند پیدا کردن شغل برای بسیاری از کارجویان پراکنده و وقت‌گیر است.

کاربر مجبور است:

- در چند سایت مختلف جستجو کند.
- شرایط هر آگهی را به‌صورت دستی بررسی کند.
- تشخیص دهد کدام موقعیت بیشتر با مهارت‌های او تطابق دارد.
- برای هر موقعیت رزومه را تغییر دهد.
- فرصت‌های مناسب یا نامناسب را خودش مدیریت کند.
- دوباره و دوباره فیلترهای مشابه وارد کند.

JobMatch باید این فرآیند را به یک flow واحد تبدیل کند.

---

# 4. هدف محصول

هدف MVP این است که کاربر بتواند از لحظه بیان نیاز شغلی تا آماده‌شدن برای Apply، کل فرآیند را در JobMatch انجام دهد.

Flow اصلی:

**Career Chat → Job Discovery → Job Matching → Feedback → Recommendation → Resume**

موفقیت MVP زمانی حاصل می‌شود که کاربر بتواند:

1. پروفایل خود را ایجاد کند.
2. با زبان طبیعی درخواست شغلی خود را بیان کند.
3. فرصت‌های واقعی دریافت کند.
4. میزان تطابق خود با هر فرصت را ببیند.
5. دلیل تطابق یا عدم تطابق را بفهمد.
6. نسبت به فرصت‌ها Feedback ثبت کند.
7. پیشنهادهای بعدی متناسب با رفتار او بهتر شوند.
8. برای یک Job مشخص رزومه شخصی‌سازی‌شده ایجاد کند.

---

# 5. کاربران هدف

کاربر اصلی JobMatch کارجوی حوزه تکنولوژی است.

تمرکز اولیه:

Junior و Mid-Level Developers

نقش‌های نمونه:

Backend Developer  
Frontend Developer  
Full-stack Developer  
.NET Developer  
Node.js Developer  
React Developer

بازار اولیه محصول فرصت‌های شغلی ایران است.

---

# 6. اصول محصول

## Explainability

سیستم نباید فقط یک Job را پیشنهاد دهد.

کاربر باید بداند:

- چرا این Job پیشنهاد شده است؟
- چه Skillهایی Match هستند؟
- چه Skillهایی Missing هستند؟
- کدام Preferenceهای کاربر رعایت شده‌اند؟

---

## Honesty

سیستم نباید اطلاعات کاربر را جعل کند.

مخصوصاً در Resume Generation، هیچ مهارت، سابقه، شرکت، پروژه یا تجربه‌ای نباید بدون وجود اطلاعات معتبر کاربر ساخته شود.

---

## Actionability

هر تحلیل باید به یک اقدام مشخص ختم شود.

مثلاً:

Job مناسب است → مشاهده جزئیات  
Job مناسب نیست → ثبت Feedback  
Job مناسب است → ساخت Resume  
Profile ناقص است → تکمیل Profile

---

# 7. محدوده MVP

MVP شامل بخش‌های زیر است:

### Authentication

Register  
Login  
Refresh Token  
Current User  
Logout

---

### Profile

کاربر باید بتواند اطلاعات زیر را ثبت و ویرایش کند:

نام  
نام خانوادگی  
عنوان شغلی  
Bio  
Location  
Experience Years  
Experience Level  
Work Type  
Desired Salary  
Skills

اطلاعات Profile باید منبع اصلی Matching و Recommendation باشند.

---

# 8. Onboarding

کاربر جدید پس از ثبت‌نام باید وارد Onboarding شود.

Onboarding باید اطلاعات لازم برای اولین Recommendation را دریافت کند.

اطلاعات:

Basic Information  
Target Role  
Experience  
Skills  
Location Preference  
Work Type  
Minimum Salary

تمام اطلاعات Onboarding باید در Backend ذخیره شوند.

ثبت Onboarding باید ترجیحاً به‌صورت یک Transaction انجام شود.

Endpoint پیشنهادی:

`POST /api/onboarding/complete`

پس از تکمیل موفق، کاربر وارد تجربه اصلی JobMatch می‌شود.

---

# 9. Career Copilot Chat

Chat تجربه اصلی محصول است.

کاربر باید بتواند درخواست خود را به زبان طبیعی وارد کند.

مثال:

> یه کار بکند دات نت حضوری تهران با حقوق حداقل ۶۰ تومن می‌خوام.

سیستم باید اطلاعات زیر را استخراج کند:

Role  
Skills  
Location  
Work Type  
Minimum Salary  
Excluded Skills  
Keywords

Chat باید Context مکالمه را حفظ کند.

مثلاً:

کاربر:

> یه کار Backend Node دورکار پیدا کن.

سپس:

> حداقل ۳۰ میلیون باشه و Python نخواد.

سیستم باید درخواست دوم را ادامه درخواست قبلی در نظر بگیرد.

---

# 10. Chat Run Experience

جستجو نباید فقط با یک Spinner نمایش داده شود.

کاربر باید بتواند روند اجرای درخواست را ببیند.

نمونه:

در حال تحلیل درخواست

Backend .NET  
Tehran  
On-site  
Minimum Salary: 60M

سپس:

در حال جستجو در منابع

Jobinja  
Jobvision  
IranTalent  
e-estekhdam

سپس:

در حال بررسی آگهی‌ها

سپس:

24 فرصت بررسی شد  
8 فرصت مطابق شرایط پیدا شد

این اطلاعات باید از ChatRun و ChatRunEvent دریافت شوند.

در صورت Disconnect یا Refresh، وضعیت Run باید قابل بازیابی باشد.

---

# 11. Job Discovery

JobMatch باید بتواند فرصت‌های واقعی را از Providerهای موجود دریافت کند.

منابع فعلی:

Jobinja  
Jobvision  
IranTalent  
e-estekhdam

سیستم باید:

Search انجام دهد.  
Job detail را دریافت کند.  
اطلاعات را Normalize کند.  
Jobهای تکراری را Deduplicate کند.  
Job معتبر را Persist کند.  
Source URL را نگه دارد.

Jobهای بدون شواهد معتبر نباید به‌عنوان نتیجه واقعی ارائه شوند.

---

# 12. Jobs Page

صفحه Jobs باید Jobهای ذخیره‌شده و پیدا‌شده را نمایش دهد.

فیلترهای اصلی:

Keyword  
Role  
Location  
Work Type  
Experience Level  
Minimum Salary  
Skills

Search و Filter باید سمت Backend انجام شوند.

Frontend نباید تنها روی مجموعه کوچکی از Jobهای دریافت‌شده Filter انجام دهد.

Endpoint پیشنهادی:

`GET /api/jobs/search`

نمونه:

`GET /api/jobs/search?q=.net&location=tehran&workType=Remote&page=1&pageSize=20`

Pagination یا Infinite Scroll الزامی است.

---

# 13. Job Card

هر Job Card باید حداقل شامل این اطلاعات باشد:

Job Title  
Company  
Location  
Work Type  
Salary  
Source  
Match Score  
Matched Skills  
Missing Skills

CTA اصلی:

مشاهده جزئیات

CTA ثانویه:

علاقه‌مندم

---

# 14. Job Detail

Job Detail باید صفحه تصمیم‌گیری کاربر باشد.

اطلاعات:

Job Title  
Company  
Location  
Work Type  
Salary  
Description  
Source  
Source URL  
Required Skills  
Match Score  
Matched Skills  
Missing Skills

همچنین باید توضیح داده شود:

چرا این موقعیت برای کاربر مناسب است؟

مثلاً:

۷ مهارت شما با این موقعیت منطبق است.

نوع همکاری Remote با ترجیح شما مطابقت دارد.

حقوق اعلام‌شده از حداقل حقوق موردنظر شما بیشتر است.

---

# 15. Matching

Matching باید برای هر User + Job یک تحلیل ایجاد کند.

خروجی حداقل شامل:

Total Match Score  
Matched Skills  
Missing Skills  
Experience Match  
Location Match  
Work Type Match  
Salary Match

Match Score باید قابل توضیح باشد.

نمونه:

Skills: 60%

Experience: 20%

Location: 10%

Salary: 10%

وزن‌ها در آینده قابل تغییر هستند.

---

# 16. Feedback

کاربر باید بتواند درباره هر Job Feedback ثبت کند.

دو Action اصلی:

Interested

Not Interested

در صورت Not Interested، دلیل نیز دریافت شود.

Reasonهای پیشنهادی:

Salary  
Technology  
Location  
Work Type  
Seniority  
Company  
Other

Endpoint:

`POST /api/feedback`

Feedback باید در Database ذخیره شود.

---

# 17. Recommendation

Endpoint فعلی:

`GET /api/jobs/recommended`

باید از حالت صرفاً نمایش Jobهای جدید خارج شود.

Recommendation باید حداقل از این اطلاعات استفاده کند:

User Profile  
User Skills  
Experience  
Location Preference  
Work Type Preference  
Salary Preference  
Job Match Score  
Job Feedback

Feedback باید روی Ranking اثر بگذارد.

مثلاً اگر کاربر چند Job مرتبط با .NET را Interested زده است، Jobهای مشابه در Ranking Boost بگیرند.

اگر کاربر چند Job On-site را رد کرده است، موقعیت‌های On-site امتیاز پایین‌تری دریافت کنند.

Recommendation باید بعد از وجود مقدار کافی Feedback شخصی‌تر شود.

---

# 18. Dashboard

کاربر لاگین‌شده باید یک Dashboard واقعی داشته باشد.

Dashboard نباید Redirect ساده باشد.

اطلاعات Dashboard:

Profile Completion  
Top Recommended Jobs  
Recent Job Discoveries  
Recent Conversations  
Resume Count  
Interested Jobs  
Recent Activity

Endpoint پیشنهادی:

`GET /api/dashboard`

Dashboard نباید برای دریافت هر Widget چندین Request مستقل غیرضروری بفرستد.

---

# 19. Resume Studio

کاربر باید بتواند برای یک Job مشخص رزومه تولید کند.

ورودی:

User Profile  
User Skills  
Verified User Experience  
Selected Job

خروجی:

Tailored Resume

Resume باید قابل مشاهده و ویرایش باشد.

Resume باید در Backend ذخیره شود.

Endpoints پیشنهادی:

`POST /api/resume/generate`

`GET /api/resumes`

`GET /api/resume/:id`

`PUT /api/resume/:id`

`GET /api/resume/:id/pdf`

---

# 20. Resume Integrity Guard

این قابلیت برای MVP الزامی است.

هر خروجی تولیدشده توسط AI باید قبل از نمایش یا ذخیره بررسی شود.

AI اجازه ندارد موارد زیر را جعل کند:

Skill  
Company  
Job Title  
Experience  
Project  
Education  
Years of Experience

تمام Claims باید با اطلاعات ثبت‌شده کاربر قابل پشتیبانی باشند.

در صورت وجود ادعای غیرقابل تایید:

Claim باید حذف یا بازنویسی شود.

سیستم باید violation را Log کند.

---

# 21. Resume PDF

دانلود Resume نباید صرفاً وابسته به `window.print()` باشد.

Backend باید بتواند PDF استاندارد ایجاد کند.

PDF باید:

ATS Friendly باشد.

قابل دانلود باشد.

نسخه تولیدشده برای Job مشخص ذخیره شود.

---

# 22. Settings

Settings در MVP فقط شامل تنظیماتی باشد که واقعاً Backend دارند.

موارد پیشنهادی:

Email Notifications  
New Job Notifications  
Minimum Match Score for Notification  
Preferred Work Types  
Minimum Salary

Endpoints:

`GET /api/users/preferences`

`PUT /api/users/preferences`

تنظیمات نمایشی که Persist نمی‌شوند نباید در UI نمایش داده شوند.

---

# 23. Academy

Academy در نسخه فعلی خارج از Scope است.

موارد زیر فعلاً توسعه داده نمی‌شوند:

Learning Paths  
Courses  
Lessons  
Progress Tracking  
Skill Training  
Education Content

Academy باید از Navigation حذف شود.

Route مربوط به Academy نیز نباید بخشی از تجربه اصلی MVP باشد.

کد فعلی Academy می‌تواند برای استفاده آینده در Repository باقی بماند اما نباید در Product Navigation فعال باشد.

---

# 24. UX Requirements

محصول باید Mobile Friendly باشد.

زبان اصلی UI فارسی است.

RTL باید در تمام صفحات به‌درستی رعایت شود.

English technical terms می‌توانند در کنار فارسی استفاده شوند.

هر API Request باید حداقل یکی از این Stateها را داشته باشد:

Loading  
Success  
Empty  
Error

Errorها نباید خام یا فنی به کاربر نمایش داده شوند.

---

# 25. Empty States

صفحات بدون داده نباید خالی نمایش داده شوند.

مثلاً Jobs:

> هنوز فرصتی برای شما پیدا نشده است. با Career Copilot یک جستجوی جدید شروع کنید.

Resume:

> هنوز رزومه‌ای ایجاد نکرده‌اید. ابتدا یکی از موقعیت‌های مناسب را انتخاب کنید.

Feedback:

نیازی به Empty State مستقل ندارد.

---

# 26. Error Handling

برای Job Discovery باید بین این وضعیت‌ها تفاوت وجود داشته باشد:

No Results

Partial Results

Provider Failure

Network Failure

Authentication Failure

Timeout

اگر برخی منابع fail شوند ولی Result معتبر وجود داشته باشد، نتیجه باید نمایش داده شود و وضعیت Partial مشخص شود.

---

# 27. Analytics Events

حداقل Eventهای زیر باید قابل اندازه‌گیری باشند:

User Registered  
Onboarding Completed  
Chat Started  
Job Search Started  
Job Search Completed  
Job Viewed  
Job Interested  
Job Rejected  
Resume Generated  
Resume Downloaded  
Source Job Opened

---

# 28. معیارهای موفقیت MVP

شاخص‌های اولیه:

درصد کاربرانی که Onboarding را کامل می‌کنند.

درصد Chatهایی که به Job Result می‌رسند.

تعداد Job View به ازای هر Search.

نرخ Interested روی Jobها.

نرخ Resume Generation بعد از مشاهده Job.

نرخ کلیک روی Source Job.

درصد Searchهایی که حداقل یک Result معتبر دارند.

نرخ Error در Discovery.

---

# 29. اولویت توسعه

## P0 — الزامی برای MVP

Career Chat

Job Discovery

Chat Run UI

Jobs Search

Job Matching

Job Detail

Job Feedback

Recommendation Improvements

Resume Integrity Guard

---

## P1 — بسیار مهم

Dashboard

Backend-driven Job Filters

Resume Persistence

Resume PDF

Onboarding Fixes

User Profile Improvements

---

## P2 — بعد از MVP Core

Notifications

Advanced Preferences

Advanced Recommendation Learning

Saved Jobs / Application Tracking

---

# 30. موارد خارج از Scope

Academy

Course Management

Learning Progress

Employer Dashboard

Recruiter Account

Job Posting by Employers

Payment

Subscription

Interview Video Platform

Full ATS

Social Network

---

# 31. Flow نهایی MVP

User Register

↓

Onboarding

↓

Career Copilot

↓

User describes desired job

↓

Intent Extraction

↓

Job Discovery

↓

Results

↓

Match Analysis

↓

Job Detail

↓

Interested / Not Interested

↓

Recommendation learns

↓

Generate Resume

↓

Resume Integrity Check

↓

Download Resume

↓

Open Original Job Source

---

# 32. تعریف Done برای MVP

MVP زمانی Done محسوب می‌شود که یک کاربر جدید بتواند بدون استفاده از داده‌های Demo:

ثبت‌نام کند.

Onboarding را کامل کند.

پروفایل و Skillهای خود را ذخیره کند.

با فارسی درخواست شغلی بدهد.

فرصت واقعی دریافت کند.

جزئیات Job را مشاهده کند.

Match Score واقعی دریافت کند.

Feedback ثبت کند.

Recommendation شخصی‌شده دریافت کند.

برای Job واقعی Resume تولید کند.

Resume بدون اطلاعات ساختگی دریافت کند.

PDF رزومه را دانلود کند.

و پس از Refresh یا Login مجدد اطلاعات اصلی او همچنان موجود باشند.

---

# 33. اصل تصمیم‌گیری محصول

در این مرحله هر Feature جدید باید به یکی از این سه سؤال پاسخ مثبت بدهد:

آیا پیدا کردن Job مناسب را سریع‌تر می‌کند؟

آیا تصمیم‌گیری درباره Job را بهتر می‌کند؟

آیا Apply کردن برای Job را آسان‌تر می‌کند؟

اگر پاسخ هر سه سؤال منفی باشد، Feature باید از Scope فعلی خارج شود.

بنابراین تمرکز JobMatch در MVP باید روی این زنجیره باقی بماند:

**Find → Understand → Decide → Prepare → Apply**