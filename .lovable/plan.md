# Admin Website + Shared Backend Foundation

This project becomes the **Admin** site. Schema, RLS, and storage are designed so a second Lovable project (User site) can plug into the same Cloud DB later.

## 1. Enable Lovable Cloud
Provisions Postgres, Auth, Storage, Server Functions.

## 2. Database schema (shared by both sites)

```text
profiles            id (=auth.uid), full_name, email, mobile, branch, year,
                    role_hint (student|faculty|admin), profile_pic_url,
                    father_mobile, mother_mobile, city, jvd (bool), created_at
user_roles          id, user_id, role (enum: admin|faculty|student)  -- security-definer has_role()
branches            id, name                  (CSE, ECE, MECH, ...)
fees                id, student_id, amount, paid, due_date, note, created_by
attendance          id, student_id, date, subject, period, status (P/A),
                    branch, year, marked_by
chat_messages       id, sender_id, recipient_id, body, created_at, read_at
                    (Realtime enabled for 1-to-1 DMs)
```

RLS:
- Students see only their own fees/attendance, and chat where they are sender/recipient.
- Faculty see students of their branch (+ their year selection).
- Admin sees all. `has_role()` security-definer function avoids RLS recursion.
- Profile pics stored in `avatars` bucket (public read, owner write).

## 3. Admin app pages (this project)

- **/login** — email + password sign in/up (admin-only gate after signup; first user auto-promoted to admin, subsequent signups need approval).
- **/_authenticated** layout with sidebar nav.
- **/dashboard** — KPIs (total students/faculty, low-attendance count, fees overdue).
- **/chat** — branch+year filter → list of users → 1:1 realtime DM thread.
- **/attendance** — branch+year + date range + JVD/Non-JVD/Total filter; printable view; "Notify parents <75%" button generates `wa.me` links per parent.
- **/fees** — add/edit fee record per student (branch+year filter); due-date column; "Call parent" (`tel:` link) and "WhatsApp reminder" (`wa.me`) per row.
- **/profile** — view + edit own profile (name, email, mobile, branch, profile pic upload).

## 4. Design
Professional, creative: deep indigo + warm amber accents, Plus Jakarta Sans (display) + Inter (body), soft cards with subtle gradients, semantic tokens in `src/styles.css`. No purple-on-white default.

## 5. After this project is done — User website setup
You create a new Lovable project and prompt:
> "Connect this project to the same Lovable Cloud as project `<id>`. Build the User website with student/faculty signup flow, dashboard, chat, fees view (students), attendance marking (faculty) / view (students), profile."

I'll then wire it to this same DB.

## Out of scope (intentional, can add later)
- Real Twilio WhatsApp/Calls (you chose `wa.me` + `tel:` links)
- Group chat
- Admin approval workflow UI (first signup = admin; rest are approved manually in DB until you want UI)

---

If you approve, I'll: enable Cloud → migrate schema + RLS → build the design system → build pages in order: auth, layout/sidebar, profile, chat, attendance, fees, dashboard.