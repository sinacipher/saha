# گزارش پیاده‌سازی پروژه سحا

نسخه گزارش: ۲۳ نوامبر ۲۰۲۶

آخرین به‌روزرسانی وضعیت: بررسی کارهای partial از جلسه اخیر؛ درصدها تقریبی و code-based هستند.

آخرین به‌روزرسانی: بررسی فایل `Users Informations.txt` و audit کامل پروژه

این سند وضعیت کامل ویژگی‌های پیاده‌سازی‌شده در پروژه تا این تاریخ را توضیح می‌دهد. هدف سند، ثبت تصمیم‌ها، تغییرات دیتابیس، مسیرها، سطح دسترسی، نحوه تست و موارد باقی‌مانده است.

---

## 1. خلاصه پروژه

پروژه یک پلتفرم Next.js برای مدیریت مشاوره تحصیلی، ارتباط کاربری، چت و آزمون‌سازی است. نقش‌های اصلی سیستم عبارت‌اند از:

- مدیر
- مشاور
- دانش‌آموز
- والد

زیرساخت اصلی پروژه شامل موارد زیر است:

- Next.js 16.4.6 با App Router و Turbopack
- React 19
- NextAuth نسخه بتا برای احراز هویت
- Prisma ORM
- PostgreSQL یا Neon PostgreSQL
- Tailwind CSS
- TypeScript
- ESLint
- Vitest
- ExcelJS برای XLSX
- Mammoth و Docx برای فایل‌های Word

---

## 2. دستاوردهای اصلی تا این نسخه

### 2.1 احراز هویت و کنترل نقش

سیستم ورود فعلی بر پایه کد ملی و OTP ساخته شده است.

ویژگی‌های پیاده‌سازی‌شده:

- ورود با کد ملی و کد تأیید
- بررسی فعال بودن حساب کاربر
- بررسی اعتبار و انقضای OTP
- اتصال نقش کاربر به JWT و session
- هدایت خودکار کاربر به پنل نقش خود
- محدودیت دسترسی صفحات نقش‌ها در proxy
- محافظت layoutهای مدیر، مشاور، دانش‌آموز و والد
- حذف کدهای OTP استفاده‌شده

مسیرهای مرتبط:

- `src/auth.ts`
- `src/proxy.ts`
- `src/app/login/page.tsx`
- `src/app/api/otp/send/route.ts`
- `src/app/api/auth/[...nextauth]/route.ts`

مسیرهای پنل نقش‌ها:

- `/admin`
- `/counselor`
- `/student`
- `/parent`

---

## 3. OTP

امنیت OTP در نسخه فعلی شامل موارد زیر است:

- تولید کد ۵ رقمی با منبع تصادفی امن Node.js
- اعتبار زمانی دو دقیقه
- محدودیت ارسال پنج درخواست در یک ساعت
- زمان انتظار ۳۰ ثانیه برای ارسال مجدد
- حداکثر پنج تلاش نامعتبر برای هر OTP فعال
- حذف OTPهای نامعتبر یا استفاده‌شده
- اعتبارسنجی کد ملی دقیقاً ده رقم
- اعتبارسنجی کد OTP دقیقاً پنج رقم
- عدم چاپ یا نمایش کد OTP در محیط production

نکته فعلی:

در محیط توسعه کد OTP می‌تواند در terminal نمایش داده شود تا تست دستی ممکن باشد. ارسال واقعی SMS در این فاز پیاده‌سازی نشده است.

---

## 4. مدیریت کاربران

پنل مدیر برای ایجاد و مدیریت کاربران پیاده‌سازی شده است.

امکانات:

- ایجاد مدیر
- ایجاد مشاور
- ایجاد دانش‌آموز
- ایجاد والد
- نمایش نام، نقش، کد ملی، تلفن و وضعیت
- ویرایش نام و نام خانوادگی
- ویرایش کد ملی
- ویرایش شماره موبایل
- اختصاص یا تغییر مشاور برای دانش‌آموز
- اتصال یا تغییر دانش‌آموز برای والد
- فعال‌سازی و غیرفعال‌سازی حساب‌ها
- جلوگیری از تکرار کد ملی یا تلفن
- جستجو در نام، کد ملی، موبایل و نقش
- فیلتر نقش
- فیلتر وضعیت فعال و غیرفعال

مسیرها:

- صفحه: `/admin/users`
- actionها: `src/app/admin/users/actions.ts`
- رابط کاربری: `src/app/admin/users/UserManager.tsx`
- داده صفحه: `src/app/admin/users/page.tsx`

سطح امنیت:

تمام عملیات ویرایش و تغییر وضعیت در Server Action انجام می‌شود و با `auth()` کنترل می‌کند که فراخواننده نقش مدیر دارد.

---

## 5. پنل مشاور

مشاور فقط دانش‌آموزان اختصاص‌یافته به خود را می‌بیند.

امکانات:

- مشاهده لیست دانش‌آموزان تخصیص‌یافته
- نمایش شماره تلفن دانش‌آموز
- ورود به اتاق گفتگو
- مشاهده دانش‌آموز و والدین مرتبط
- ارسال پیام به دانش‌آموز
- ارسال پیام به والد متصل
- polling پیام‌ها هر یک ثانیه
- انتخاب مخاطب دانش‌آموز یا والد
- نمایش تعداد پیام‌های خوانده‌نشده
- نمایش زمان ارسال پیام
- نمایش وضعیت خوانده‌شده برای پیام‌های ارسالی

مسیرها:

- `/counselor`
- `/counselor/students/[id]`

فایل‌های کلیدی:

- `src/app/counselor/page.tsx`
- `src/app/counselor/layout.tsx`
- `src/app/counselor/students/[id]/page.tsx`
- `src/app/counselor/students/[id]/ChatUI.tsx`

---

## 6. پنل دانش‌آموز

دانش‌آموز فقط اطلاعات مرتبط با مشاور اختصاصی خود را می‌بیند.

امکانات:

- نمایش مشاور اختصاصی
- مشاهده چت مشاور
- ارسال و دریافت پیام
- polling زنده
- نشان دادن تعداد پیام‌های خوانده‌نشده
- نمایش زمان پیام‌ها
- نمایش وضعیت خوانده‌شده
- ایجاد اتاق چت در صورت عدم وجود اتاق

مسیرها:

- `/student`
- `/student/assessments`
- `/student/assessments/[assessmentId]`
- `/student/assessments/results`
- `/student/assessments/[assessmentId]/result`
- `/student/assessments/analytics`

فایل‌های کلیدی:

- `src/app/student/page.tsx`
- `src/app/student/layout.tsx`
- `src/app/student/ChatUI.tsx`
- پوشه `src/app/student/assessments`

---

## 7. پنل والد

والد فقط دانش‌آموز مرتبط با خود و مشاور آن دانش‌آموز را می‌بیند.

امکانات:

- چت با مشاور
- ارسال و دریافت پیام
- polling زنده
- نمایش تعداد پیام‌های خوانده‌نشده
- مشاهده نتایج منتشر‌شده دانش‌آموز مرتبط
- مشاهده تاریخچه نتایج
- مشاهده درصد، تعداد صحیح، غلط و بدون پاسخ
- مشاهده تحلیل‌های منتشر‌شده دانش‌آموز مرتبط
- خروجی XLSX نتایج مجاز

محدودیت‌ها:

والد در این implementation فعلی نمی‌تواند:

- وارد آزمون شود
- سوالات آزمون را ببیند
- پاسخ‌های کلیدی را ببیند
- نتایج منتشرنشده را ببیند
- نتیجه دانش‌آموز دیگر را بگیرد

مسیرها:

- `/parent`
- `/parent/assessments`
- `/parent/assessments/analytics`

فایل‌های کلیدی:

- `src/app/parent/page.tsx`
- `src/app/parent/layout.tsx`
- `src/app/parent/ChatUI.tsx`

---

## 8. سیستم چت

API چت اصلی مشترک است:

- `GET /api/chat`
- `POST /api/chat`

این API:

- role دانش‌آموز را بررسی می‌کند
- role والد را بررسی می‌کند
- role مشاور را بررسی می‌کند
- برای مشاور رابطه assign شده با دانش‌آموز یا والد را بررسی می‌کند
- اتاق چت موجود را پیدا می‌کند
- اتاق چت جدید می‌سازد
- پیام‌ها را به‌صورت JSON ساده برمی‌گرداند
- Cache-Control را no-store تنظیم می‌کند
- پیام‌های دریافتی را خوانده‌شده mark می‌کند
- تاریخ و وضعیت خواندن را برمی‌گرداند

مدل‌های پایگاه داده مرتبط:

- `Chat`
- `Message`

---

## 9. مشاهده همه چت‌ها برای مدیر

مدیر یک صفحه خواندنی برای نظارت بر تمام گفت‌وگوها دارد.

مسیرها:

- صفحه: `/admin/chats`
- API لیست و جزئیات: `/api/admin/chats`

امکانات:

- مشاهده همه اتاق‌های چت
- نمایش مشاور، دانش‌آموز یا والد هر اتاق
- نمایش آخرین پیام
- انتخاب اتاق و مشاهده تاریخچه کامل
- polling برای به‌روزرسانی خودکار
- فقط نقش مدیر مجاز است

فایل‌های کلیدی:

- `src/app/admin/chats/page.tsx`
- `src/app/admin/chats/AdminChatViewer.tsx`
- `src/app/api/admin/chats/route.ts`

نکته امنیتی:

این بخش read-only برای مدیر است. مدیر از همین UI پیام ارسال نمی‌کند.

---

## 10. داشبوردهای آماری

داشبوردهای فعلی داده واقعی از Prisma دارند و mock نیستند.

داشبورد مدیر:

- تعداد کل کاربران
- تعداد مشاوران فعال
- تعداد دانش‌آموزان فعال
- تعداد والدین فعال
- تعداد اتاق‌های گفتگو
- تعداد کل پیام‌های خوانده‌نشده

داشبورد مشاور:

- تعداد دانش‌آموزهای تخصیص‌یافته
- تعداد پیام‌های خوانده‌نشده هر دانش‌آموز یا والد
- آخرین وضعیتهای دانش‌آموزی

مسیرها:

- `src/app/admin/page.tsx`
- `src/app/counselor/page.tsx`

---

## 11. معماری Assessment و Examination

با توجه به scope مطرح‌شده، زیرساخت assessment اضافه شده است.

### 11.1 نوع‌های آزمون

مدل فعلی دو نوع آزمون را پشتیبانی می‌کند:

- `KONKUR_SIMULATION`
- `PRACTICE_QUIZ`

### 11.2 Lifecycle آزمون

enum وضعیت assessment شامل:

- `DRAFT`
- `READY`
- `SCHEDULED`
- `IN_PROGRESS`
- `SUBMITTED`
- `RESULTS_PENDING`
- `PUBLISHED`
- `ARCHIVED`

لifecycle پایه در backend اضافه شده است. آزمون‌ها می‌توانند ایجاد، ready، schedule، archive و نتایج آنها publish شوند.

فقط مدیر می‌تواند نتایج را منتشر کند.

### 11.3 Snapshot تاریخی

هر سوال داخل هر آزمون یک snapshot JSON ذخیره می‌کند تا تغییرات آینده Question Bank روی attemptهای قبلی مؤثر نباشند.

---

## 12. بانک سؤال

بانک سؤال centralized پیاده‌سازی شده است.

فایل‌های اصلی:

- `src/app/api/assessments/questions/route.ts`
- `src/components/assessment/QuestionBank.tsx`
- `src/app/admin/assessments/questions/page.tsx`
- `src/app/counselor/assessments/questions/page.tsx`

امکانات فعلی:

- ساخت سؤال دستی
- چهار گزینه A تا D
- انتخاب دقیق یک پاسخ صحیح
- تنظیم درس و فصل
- موضوع و منبع
- توضیح پاسخ
- تگ‌ها
- سطح آسان، متوسط یا سخت
- جستجو
- فیلتر درس
- فیلتر وضعیت
- انتخاب چند سوال
- bulk approval
- bulk pending review
- bulk archive
- وضعیت Draft و Pending Review
- اعتبارسنجی پاسخ صحیح

انواع وضعیت سوال:

- `DRAFT`
- `PENDING_REVIEW`
- `APPROVED`
- `ARCHIVED`

کنترل نقش:

- مدیر همه سوالات را می‌بیند و می‌تواند تایید کند
- مشاور فقط سوالات خودش یا سوالات approved را می‌بیند
- مشاور سوالات خودش را در status مناسب ایجاد می‌کند
- تایید نهایی فقط مدیر مجاز است

---

## 13. درس و فصل

مدل‌های زیر برای طبقه‌بندی سوالات ساخته شدند:

- `AssessmentSubject`
- `AssessmentChapter`

APIها:

- `GET/POST /api/assessments/subjects`
- `POST /api/assessments/chapters`

در بانک سؤال فعلی:

- admin می‌تواند درس‌ها را ایجاد کند
- admin می‌تواند فصل‌ها را ایجاد کند
- admin و مشاور میتوانند از درس‌ها و فصل‌ها در سوال استفاده کنند

---

## 14. واردسازی XLSX و DOCX

### 14.1 قالب XLSX

قالب استاندارد از route زیر قابل دانلود است:

- `/api/assessments/templates?format=xlsx`

Sheets پیشنهادی:

- `Questions`
- `Passages`
- `Instructions`

فایل template شامل ردیف نمونه و توضیح Persian/English و قالب Difficulty و پاسخ صحیح است.

ستون‌های سوالات شامل:

- Question ID
- Subject
- Chapter
- Topic
- Difficulty
- Question
- Option A تا D
- Correct Answer
- Explanation
- Tags
- Source
- Passage ID

### 14.2 قالب DOCX

قالب Word از route زیر قابل دانلود است:

- `/api/assessments/templates?format=docx`

ساختار template سؤال شامل:

- `Question 001`
- `Subject`
- `Chapter`
- `Difficulty`
- `Question`
- چهار گزینه
- `Correct Answer`
- `Explanation`
- `Tags`
- `Source`

### 14.3 فرمت‌های پذیرفته‌شده

فقط:

- `.xlsx`
- `.docx`

فرمت‌های دیگر در route import رد می‌شوند.

### 14.4 محدودیت‌ها

- حداکثر حجم فعلی فایل: ۲۵ مگابایت
- فایل‌های Corrupted یا unreadable با خطا رد می‌شوند
- encrypted Word/Excel به‌طور کامل تایید نشده‌اند
- MIME validation فعلی مبتنی بر extension و parser است
- parsing تصاویر در Word/XLSX محدود است

### 14.5 Parser یکپارچه

پارسرهای Excel و Word به یک internal structure مشترک تبدیل می‌شوند.

ساختار داخلی هر سؤال شامل:

- شناسه خارجی
- درس
- فصل
- موضوع
- سطح دشواری
- متن سؤال
- چهار گزینه
- پاسخ صحیح
- توضیح
- برچسب‌ها
- منبع
- Passage ID

نرمال‌سازی فعلی:

- تبدیل اعداد فارسی و عربی به ASCII
- تبدیل ی به ی
- تبدیل ک به ک
- trim کردن فاصله‌ها
- نرمال‌سازی پاسخ‌های الف و ب و ج و د
- نرمال‌سازی Easy و Medium و Hard و معادل‌های فارسی

### 14.6 Import workflow

در implementation فعلی:

1. فایل آپلود می‌شود
2. extension بررسی می‌شود
3. حجم فایل بررسی می‌شود
4. Excel یا Word parse می‌شود
5. سوال‌ها استخراج می‌شوند
6. `ImportBatch` ایجاد می‌شود
7. هر ردیف به `ImportItem` تبدیل می‌شود
8. validation انجام می‌شود
9. duplicate text و external ID شناسایی می‌شود
10. نتیجه preview به client برگردانده می‌شود
11. موارد معتبر در یک transaction import می‌شوند

خطاهای فعلی validation:

- متن خالی
- درس خالی
- گزینه ناقص
- نبودن پاسخ صحیح معتبر

هشدارهای فعلی:

- تکرار احتمالی
- فصل ناموجود

---

## 15. Import Batch و Import History

مدل‌های دیتابیس:

- `ImportBatch`
- `ImportItem`

فیلدهای batch شامل:

- نام فایل اصلی
- فرمت
- importing user
- وضعیت
- تعداد کل
- تعداد موفق
- تعداد خطا
- تعداد هشدار
- report JSON

مسیرها:

- `POST/PATCH /api/assessments/import`
- `GET /api/assessments/imports`
- صفحه `/admin/assessments/imports`

در نسخه فعلی:

- مدیر همه batchها را می‌بیند
- مشاور فقط batchهای خودش را می‌بیند
- لیست batchها در صفحه history نمایش داده می‌شود
- خروجی XLSX سوالات موجود در بانک سؤال قابل دانلود است

---

## 16. Exam Builder

مسیرهای UI:

- `/admin/assessments/exams`
- `/counselor/assessments/exams`

API:

- `GET/POST/PATCH /api/assessments/exams`

امکانات فعلی:

- ساخت Practice Quiz
- ساخت Konkur Simulation
- عنوان و توضیح
- دستورالعمل
- مدت کل
- start date
- end date
- result release date
- maximum attempts
- تصادفی‌سازی سوالات
- تصادفی‌سازی گزینه‌ها
- اجازه navigation یا عدم اجازه
- ساخت بخش‌های چندگانه
- مدت بخش
- انتخاب چند سوال
- انتخاب دانش‌آموزهای هدف
- امتیاز پاسخ صحیح
- جریمه پاسخ غلط
- امتیاز بدون پاسخ
- دقت گرد کردن درصد
- ready کردن آزمون
- schedule کردن آزمون
- archive کردن آزمون
- publish کردن نتایج

کنترل دسترسی:

- admin می‌تواند همه آزمون‌ها را ببیند
- counselor فقط آزمون‌های خودش را می‌بیند و تغییر می‌دهد
- counselor فقط دانش‌آموزان تخصیص‌یافته به خودش را انتخاب می‌کند
- فقط سوال‌های approved قابل اضافه شدن به آزمون هستند
- فقط admin می‌تواند نتایج را publish کند

---

## 17. Snapshot امتحان

هنگام ساخت attempt، بخش‌ها و سوالات از snapshot ذخیره‌شده در `AssessmentQuestion` ساخته می‌شوند.

snapshot شامل:

- متن سوال
- topic
- difficulty
- subjectId
- chapterId
- passageId
- گزینه‌ها
- وضعیت صحیح بودن گزینه‌ها

snapshot attempt در فیلد `scoringSnapshot` ذخیره می‌شود.

این تضمین می‌کند تغییرات آینده Question Bank یا Question options روی attempt آغازشده اثر مستقیم نگذارد.

---

## 18. Student Exam Engine

مسیرهای UI:

- `/student/assessments`
- `/student/assessments/[assessmentId]`
- `/student/assessments/results`
- `/student/assessments/[assessmentId]/result`
- `/student/assessments/analytics`

APIهای backend:

- `GET /api/assessments/student/exams`
- `POST/GET /api/assessments/student/attempt/[assessmentId]`
- `PATCH /api/assessments/student/answer/[attemptId]`
- `POST /api/assessments/student/submit/[attemptId]`

امکانات فعلی:

- نمایش آزمون‌های تخصیص‌یافته
- شروع آزمون
- ادامه attempt active
- بررسی مالکیت assignment
- بررسی max attempts
- بررسی start date
- بررسی end date
- timer server-controlled از expiresAt
- بخش‌بندی آزمون
- navigation سوالات
- previous و next
- mark for review
- انتخاب و تغییر پاسخ
- grid پاسخنامه
- وضعیت answered و unanswered و marked
- ذخیره پاسخ در backend
- localStorage cache در browser
- submit confirmation
- خلاصه تعداد answered و unanswered و marked
- auto-submit بعد از رسیدن timer به صفر
- جلوگیری از تغییر attempt submitted
- جلوگیری از قرار گرفتن correct answer در student payload

امکاناتی که هنوز کامل نیستند:

- IndexedDB با recovery پیشرفته
- مدیریت کامل offline queue
- section-specific independent timing
- anti-cheating integration کامل
- attempt resume با tab reconnect کامل

---

## 19. سیستم امتیازدهی

امتیازدهی از backend و helper مستقل انجام می‌شود.

فایل engine:

- `src/lib/assessment/scoring.ts`

قواعد پیش‌فرض:

- پاسخ صحیح: ۳
- پاسخ غلط: منفی ۱
- بدون پاسخ: صفر

روند محاسبه:

1. تعداد پاسخ‌های صحیح مشخص می‌شود
2. تعداد پاسخ‌های غلط مشخص می‌شود
3. تعداد بدون پاسخ مشخص می‌شود
4. امتیاز خام جمع می‌شود
5. درصد بر اساس حداکثر امتیاز ممکن محاسبه می‌شود
6. درصد بین صفر و صد clamp می‌شود
7. نتیجه طبق roundingPrecision گرد می‌شود

رابطه درصد:

`percentage = rawScore / (correctAnswerPoints × totalQuestions) × 100`

نتایج بدنه شبیه‌سازی کنکور باید همان قواعد configurable باشند.

توضیح نمونه prompt:

برای ۲۰ صحیح، ۶ غلط و ۴ بدون پاسخ، امتیاز خام ۵۴ و حداکثر ۹۰ است. نتیجه:

`54 / 90 × 100 = 60%`

مقدار ۶۴.۴۴٪ در صورت نمونه بدون تعریف coefficients یا پارامترهای دیگر با formula استاندارد ۳-منفی-۱ سازگار نیست.

---

## 20. نتایج منتشرشده

مدل:

- `AssessmentResult`

فیلدهای اصلی:

- studentId
- assessmentId
- attemptId
- totalQuestions
- correctAnswers
- incorrectAnswers
- unansweredAnswers
- rawScore
- percentage
- subjectScoresJson
- sectionScoresJson
- percentile
- internalRank
- published
- publishedAt

API:

- `GET /api/assessments/results`

مسیرهای UI:

- `/student/assessments/results`
- `/student/assessments/[assessmentId]/result`
- `/parent/assessments`

کنترل دسترسی:

- student فقط نتایج خودش را می‌بیند
- parent فقط نتایج child وصل‌شده را می‌بیند
- counselor فقط نتایج studentهای اختصاص‌یافته را می‌بیند
- admin همه نتایج را می‌بیند
- نتایج فقط published در این API برگردانده می‌شوند
- parent هیچ payload سوال یا answer key ندارد

نتایج در publish انجام می‌شوند و به صورت `published: true` و `publishedAt` ذخیره می‌شوند.

فقط مدیر می‌تواند نتیجه را publish کند.

---

## 21. Analytics

API:

- `GET /api/assessments/analytics`

خروجی فعلی:

- تعداد attempts
- میانگین درصد
- بیشترین درصد
- کمترین درصد
- روند درصدها
- صحیح و غلط و unanswered هر آزمون
- عملکرد درس‌ها
- weakest subjects

کنترل نقش:

- student: فقط نتایج خودش
- parent: فقط child مرتبط
- counselor: فقط نتایج studentهای اختصاص‌یافته
- admin: همه نتایج published

UI مسیرها:

- `/admin/assessments/analytics`
- `/counselor/assessments/analytics`
- `/student/assessments/analytics`
- `/parent/assessments/analytics`

محدودیت فعلی:

- percentile هنوز محاسبه نمی‌شود
- ranking داخلی همچنان population-level کاملاً محاسبه نشده است
- analytics chapter-level کامل نشده است
- زمان پاسخ‌گویی و question-level metrics کامل نیستند

---

## 22. Export

API فعلی:

- `/api/assessments/exports?format=xlsx&type=questions`
- `/api/assessments/exports?format=xlsx&type=results`

Export XLSX:

- questions
- options
- correct answer برای roleهای مجاز
- نتایج published
- نام دانش‌آموز
- عنوان آزمون
- درصد
- صحیح، غلط، unanswered
- raw score
- time spent

کنترل نقش:

- student فقط export نتایج خودش
- parent فقط export نتایج child
- counselor فقط نتایج studentهای خودش و سوالات مجاز
- admin export global ممکن است
- student/parent answer key و سوالات دریافت نمی‌کنند

خروجی Word، PDF و گزارش چاپی هنوز پیاده‌سازی نشده‌اند.

---

## 23. Import History UI

مسیر:

- `/admin/assessments/imports`

ویژگی فعلی:

- لیست batchها
- نام فایل
- فرمت
- importing user
- status
- تعداد کل
- موفق و خطا و هشدار
- تاریخ ایجاد

فایل‌ها و APIهای مرتبط:

- `src/app/api/assessments/imports/route.ts`
- `src/app/admin/assessments/imports/page.tsx`

---

## 24. مدل‌های دیتابیس Assessment

### مدل‌های enums

- `Role`
- `QuestionStatus`
- `Difficulty`
- `AssessmentType`
- `AssessmentStatus`
- `AttemptStatus`
- `ImportStatus`
- `ExportFormat`

### مدل‌های سوال

- `AssessmentSubject`
- `AssessmentChapter`
- `QuestionPassage`
- `Question`
- `QuestionOption`
- `QuestionVersion`

### مدل‌های آزمون

- `Assessment`
- `AssessmentSection`
- `AssessmentQuestion`
- `AssessmentAssignment`
- `AssessmentScoringRule`

### مدل‌های attempt و نتیجه

- `ExamAttempt`
- `StudentAnswer`
- `AttemptEvent`
- `AssessmentResult`

### مدل‌های import و audit

- `ImportBatch`
- `ImportItem`
- `AssessmentAuditLog`

فایل schema:

- `prisma/schema.prisma`

دیتابیس فعلی با schema سینک شده و Prisma Client regenerate شده است.

Database strategy فعلی از `db push` استفاده کرده، نه یک سری migrationهای حفظ‌شده. برای production migration باید migrationهای Prisma formal ایجاد شود.

---

## 25. تست‌های خودکار فعلی

نتیجه audit پایش‌شده:

- ۸ تست فعلی پاس شدند
- lint، TypeScript، Prisma validate و production build پاس شدند
- migration history موجود نبود
- npm audit ۱۰ vulnerability (۶ moderate و ۴ high) گزارش کرد
- این vulnerabilityها بدون بررسی breaking upgrade به‌صورت خودکار upgrade نشدند
- دیتابیس read-only audit شد و هیچ داده‌ای پاک نشد

Counts واقعی database در زمان audit:

- Users: ۵
- Chats: ۱
- Messages: ۹
- Questions: ۱
- Assessments: ۱
- Exam attempts: ۱
- Assessment results: ۱
- Import batches: ۱


تست‌های Vitest موجود:

- role routing
- chat student assignment
- chat parent assignment
- normalize chat text
- scoring 20 correct / 6 incorrect / 4 unanswered
- custom scoring
- percentage clamp

پوشه‌های تست:

- `src/lib/role-routing.test.ts`
- `src/lib/chat-policy.test.ts`
- `src/lib/assessment/scoring.test.ts`

تعداد فعلی تست‌ها:

- ۸ تست
- ۳ فایل تست

دستورها:

```bash
npm test
npm run test:watch
npm run lint
npm run build
```

---

## 26. Validation انجام‌شده

در آخرین build نهایی:

- ESLint passed
- TypeScript passed
- Prisma schema valid
- Prisma DB in sync
- ۸ unit test passed
- Production build passed
- ۴۰ static/dynamic page generation step passed

routeهای assessment در route table production شناسایی شدند.

---

## 27. ویژگی‌های دارای محدودیت یا عدم‌کامل

این موارد نباید به‌عنوان کامل production تلقی شوند:

1. در این پروژه SMS واقعی پیاده‌سازی نشده است
2. payment system پیاده‌سازی نشده است
3. import Word هنوز همه variations و embedded images را کامل پوشش نمی‌دهد
4. import Excel row/column mapping manual کامل نیست
5. import correction مستقیم در preview کامل نیست
6. duplicate similarity algorithm کامل نیست
7. bulk editing سوالات کامل نیست
8. question version history UI ندارد
9. DOCX export ندارد
10. PDF export ندارد
11. printable exam ندارد
12. IndexedDB offline recovery ندارد
13. answer-save retry queue کامل ندارد
14. section-specific timer مستقل کامل نیست
15. ranking and percentiles هنوز محاسبه نشده‌اند
16. chapter-level analytics کامل نیست
17. question-level option distribution کامل نیست
18. observed difficulty analysis ندارد
19. rate limiting و auditing هنوز کامل نیست
20. formal migration history ندارد
21. large imports asynchronous/background نیستند
22. anti-cheating advanced ندارد
23. classroom/group assignment کامل نیست
24. file encryption and malware scanning ادغام نشده‌اند
25. PDF and DOCX security export هنوز نیست

---

## 28. Dependencyها

وابستگی‌های assessment اضافه‌شده:

- `exceljs`
- `mammoth`
- `docx`
- `vitest`

توجه مهم:

در زمان install برخی warningهای deprecated و vulnerability توسط npm گزارش شدند. این report به این معنا نیست که همه vulnerabilityها رفع شده‌اند. قبل از production، دستور زیر باید اجرا و نتیجه بررسی شود:

```bash
npm audit
```

---

## 29. دستورات اجرایی

اجرای development server:

```bash
npm run dev
```

آدرس پیش‌فرض:

```text
http://localhost:3000
```

تست:

```bash
npm test
```

lint:

```bash
npm run lint
```

typecheck:

```bash
npx tsc --noEmit
```

production build:

```bash
npm run build
```

Prisma:

```bash
npx prisma validate
npx prisma generate
npx prisma db push
npx prisma migrate status
```

---

## 30. مسیرهای مهم اضافه‌شده

### Admin

```text
/admin
/admin/users
/admin/chats
/admin/assessments
/admin/assessments/questions
/admin/assessments/exams
/admin/assessments/imports
/admin/assessments/analytics
```

### Counselor

```text
/counselor
/counselor/assessments
/counselor/assessments/questions
/counselor/assessments/exams
/counselor/assessments/analytics
/counselor/students/[id]
```

### Student

```text
/student
/student/assessments
/student/assessments/[assessmentId]
/student/assessments/results
/student/assessments/[assessmentId]/result
/student/assessments/analytics
```

### Parent

```text
/parent
/parent/assessments
/parent/assessments/analytics
```

### APIهای Assessment

```text
/api/assessments/questions
/api/assessments/subjects
/api/assessments/chapters
/api/assessments/templates
/api/assessments/import
/api/assessments/imports
/api/assessments/exams
/api/assessments/students
/api/assessments/results
/api/assessments/analytics
/api/assessments/exports
/api/assessments/student/exams
/api/assessments/student/attempt/[assessmentId]
/api/assessments/student/answer/[attemptId]
/api/assessments/student/submit/[attemptId]
```

---

## 31. وضعیت واقعی جلسات کاری اخیر

پس از audit اولیه، بخش‌های زیر تا حد partial در کد اضافه شدند:

- smart mapping suggestion برای Excel headers
- manual mapping انتخابی در API import و state suggestion در UI
- inline preview correction برای متن، درس، فصل، موضوع، درجه دشواری، گزینه‌ها، پاسخ صحیح و توضیح
- fingerprint SHA-256 برای جلوگیری از re-upload یک فایل توسط همان کاربر
- exact و normalized similarity duplicate detection
- schema fields برای fingerprint و ImportItem retry/state
- IndexedDB answer recovery helper
- IndexedDB enqueue/flush integration در ExamRunner
- `section-timing.ts` helper برای ساخت و بررسی section deadlines

وضعیت تأیید فعلی:

- mapping/dedup/fingerprint: implemented and partial; به‌صورت end-to-end با دیتای واقعی XLSX هنوز کامل verify نشده
- inline correction: implemented in UI/API; bulk correction و error report Excel ناقص است
- IndexedDB: implemented as helper and runner integration; end-to-end offline test نشده است
- section timing: helper موجود است، ولی در `ExamAttempt` snapshot، answer route و runner هنوز fully enforced نیست
- import retry/resume: state/schema partial؛ dedicated API و UI retry کامل نیست
- formal migration: عملی نشده؛ دیتابیس فعلی db push state است

برآورد progress کلی assessment: حدود 60 تا 65 درصد.

---

## 32. اولویت‌های بعدی production

برای تبدیل implementation فعلی به production-ready کامل، اولویت‌ها:

1. تکمیل formal Prisma migrations
2. تکمیل mapping و correction Excel و Word import
3. افزودن DOCX/PDF export
4. افزودن error report Excel قابل دانلود
5. افزودن import retry و resumable batch
6. افزودن duplicate similarity algorithm پیشرفته
7. افزودن IndexedDB answer recovery
8. افزودن server-side section timers
9. محاسبه percentile و internal rank
10. افزودن chapter و question analytics
11. افزودن permission matrix رسمی و testهای integration
12. افزودن testهای e2e ورود نقش‌ها و آزمون کامل
13. افزودن logging، audit retention و monitoring
14. اجرای npm audit و رفع vulnerabilityهای واقعی
15. تنظیم production secrets و SMS provider وقتی تصمیم گرفته شد

---

## 32. اطلاعات کاربران فعلی

منبع اطلاعات: `Users Informations.txt`

وضعیت فعلی حساب‌های ثبت‌شده در فایل پیوست:

| نام | نقش | وضعیت |
|---|---|---|
| sama | دانش‌آموز | فعال |
| Dr Sobhan | مشاور | فعال |
| Hamed Mohammadi | مدیر | فعال |
| Sina Modir | مدیر | فعال |

خلاصه آماری:

- تعداد کل حساب‌های جدول‌شده: ۴
- مدیر: ۲
- مشاور: ۱
- دانش‌آموز: ۱
- والد: ۰
- حساب غیرفعال: ۰

نتیجه بررسی در وضعیت فعلی پروژه:

- دانش‌آموز `sama` در لیست کاربران فعال قرار دارد.
- مشاور `Dr Sobhan` فعال است و می‌تواند حساب دانش‌آموزان تخصیص‌یافته را مدیریت کند.
- دو حساب مدیر فعال وجود دارد.
- در این snapshot هیچ حساب والد ثبت نشده است، بنابراین پنل والد فعلاً برای هیچ رابطه والد-فرزندی در این فایل فعال نیست.
- ارتباط اختصاص مشاور به دانش‌آموز و ارتباط والد به دانش‌آموز در این فایل ارائه نشده است؛ این اطلاعات باید از دیتابیس و پروفایل‌های رابط بررسی شوند، نه از این فایل تصویری به‌تنهایی.
- کد ملی و شماره موبایل از فایل پیوست در گزارش تکرار نشده‌اند تا اطلاعات شناسایی و تماس در سند implementation اضافه‌تر منتشر نشود.

این بخش وضعیت فعلی فایل پیوست است و جایگزین دیتابیس نیست. در صورت تغییر داده‌ها، باید با `prisma` یا پنل مدیر دوباره همگام‌سازی شود.

---

## 33. جمع‌بندی وضعیت فعلی

نسخه فعلی یک زیرساخت کامل و قابل توسعه دارد که شامل:

- چهار نقش کاربری
- احراز هویت OTP آزمایشی
- مدیریت کاربران
- تخصیص مشاور و والد
- چت دوطرفه زنده
- مشاهده همه چت‌ها توسط مدیر
- بانک سوال اولیه
- import/export XLSX و template DOCX
- import DOCX/XLSX اولیه
- exam builder
- student exam runner
- backend scoring
- published results
- role-specific analytics اولیه
- Excel export
- unit tests پایه

این پیاده‌سازی یک پایه اجرایی برای فاز آزمون‌ها است، اما تمام معیارهای advanced و security production در spec پیوست نیازمند تکمیل در فازهای بعدی است.
