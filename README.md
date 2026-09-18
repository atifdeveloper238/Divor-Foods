# Home Kitchen — Food Ordering Website

Plain HTML/CSS/JS site backed by Supabase. Customers browse the menu, order,
pay via EasyPaisa (screenshot upload) or online payment, track their order,
and chat with you. You manage everything from `admin.html`.

## Files

```
food-site/
  index.html              customer menu + ordering page
  track.html               order tracking page
  admin.html                admin dashboard
  css/style.css
  js/
    supabase-config.js      <-- put your Supabase URL + anon key here
    customer.js
    track.js
    admin.js
  supabase-schema.sql       run once in Supabase SQL editor
  chrome-extension/         new-order desktop notifications
```

## 1. Create your Supabase project
1. Go to https://supabase.com → New project.
2. Once created, go to **SQL Editor** → paste the entire contents of
   `supabase-schema.sql` → Run. This creates all tables, security rules,
   and the two storage buckets (menu photos, payment screenshots).
3. Go to **Project Settings → API**. Copy the **Project URL** and the
   **anon public** key (NOT the service_role key).
4. Paste them into `js/supabase-config.js`.

## 2. Create your admin login
Go to **Authentication → Users → Add user** in Supabase, and create
yourself an email + password. That's what you'll use to log into
`admin.html`. Only logged-in accounts can edit the menu, change order
status, or delete data — customers never get this access.

## 3. How customer accounts work
Customers create an account once with their **name, phone number,
password, and delivery location**. Passwords are hashed in the database
(never stored in plain text) and checked through a secure database
function — the browser never sees or stores the password itself.
Next time, on any device or browser, they just log in with their
**phone number and password** and their saved details are pulled
straight from Supabase — nothing depends on browser storage anymore.
This also means the site works for anyone ordering delivery, not just
students in one building — the location field is a free-text address,
not tied to any specific place.

## 3. Host the site
Since this is a static site, you can host it free on **GitHub Pages**,
**Netlify**, or **Vercel**:
- Push this whole folder to a GitHub repo.
- On GitHub Pages: Settings → Pages → deploy from the `main` branch.
- Your site will be live at a link like `https://yourname.github.io/repo-name/`.

## 4. Set up the Chrome notification extension
1. Open `chrome-extension/background.js` and `popup.js` — fill in your
   Supabase URL/anon key and your live admin.html URL.
2. In Chrome, go to `chrome://extensions` → enable **Developer mode** →
   **Load unpacked** → select the `chrome-extension` folder.
3. Now, whenever a new order comes in, you'll get a desktop notification.

## 5. Day-to-day use
- **admin.html → Orders tab**: see every order, payment screenshot, mark
  status, assign a rider, print a receipt (works with mini thermal printers
  via your browser's print dialog — select the receipt printer).
- **Menu tab**: add/remove items, upload photos, toggle items on/off.
- **Kitchen Info tab**: edit your phone, location, description, EasyPaisa
  account, and delivery charge — all shown live to customers.
- **Ordering toggle** (top right): flip off to stop new orders instantly.
- **Download all orders (PDF)**: back up your order history.
- **Delete all orders**: wipe the orders table once you've backed it up,
  to keep Supabase storage small.
- **Reset order ID to 0**: next order starts again from #0.

## Notes on "online payment"
This build ships with EasyPaisa (manual transfer + screenshot upload) as
the payment method, per your latest instructions — cash on delivery was
removed. A true card/online gateway (e.g. a hosted checkout page) can be
added later; it needs a small server-side function to keep secret keys
safe, since this site currently has no backend of its own beyond Supabase.
Let me know if/when you want that added and which gateway you can get
approved in Pakistan for it (e.g. HBL, PayFast, or similar), and we'll
wire it in.

## Free tier limits to know
Supabase's free tier includes 500MB database storage and 1GB file storage
— the "delete all orders" button exists specifically to keep you under
that ceiling if order volume grows.
