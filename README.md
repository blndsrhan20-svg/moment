# MOMENT — Starter

واجهة React + Vite باللغة العربية وبتصميم أسود/فضي.

## التشغيل
1. ثبّت Node.js.
2. نفّذ `npm install`.
3. انسخ `.env.example` إلى `.env`.
4. ضع Supabase Project URL و anon/public key في `.env`.
5. نفّذ `npm run dev`.

## اتصال Supabase
- المشروع: `yxtjnljxjrjjxaocuwut`
- الجداول المستخدمة: `profiles`, `posts`, `stories`
- التخزين: `moment-media`

## تنبيه
هذا إصدار بداية مربوط برمجياً بـ Supabase عند إضافة المفتاح العام. لا يحتوي بعد على الرسائل الخاصة، الإعجابات/التعليقات الفعلية، القنوات، أو ميزة اللحظة الجماعية. اختبر سياسات RLS وصلاحيات Storage قبل إطلاقه للعامة. لا تضع service_role key في الواجهة أو في ملفات `.env` التي تُنشر.
