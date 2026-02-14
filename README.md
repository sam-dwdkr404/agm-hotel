# 🍽️ AGM CANTEEN
**QR-based digital ordering platform for college canteens**

## 🚀 Live Demo

🔗 Hosting URL:  
https://gen-lang-client-0776017148.web.app  

🔗 Firebase Project Console:  
https://console.firebase.google.com/project/gen-lang-client-0776017148/overview  


## ⚡ Quick Start

### 1. Setup
```bash
cd "c:\Users\SAMANVITA\agm canteen"
npm install
```

### 2. Run Locally
```bash
npm run dev
```
Opens on `http://localhost:5173`

### 3. Test Routes
- **Student Menu**: Go to `http://localhost:5173/table/1` (or any table number)
- **Kitchen Staff**: Go to `http://localhost:5173/kitchen` on a dedicated device

## 📱 How It Works

### Student Flow
1. Scan QR code at table → menu opens
2. Add items to cart (+ / − buttons)
3. Place order → funny message shows
4. Walk to counter & pay (no online payment)
5. Staff serves from kitchen screen

### Staff Flow
1. Open `/kitchen` on one device
2. See incoming orders in real-time
3. Press DONE when food is served
4. Order disappears from screen

## 🎯 Features
✅ Scan count analytics (localStorage)  
✅ Add to cart with +/− buttons  
✅ Order goes to staff screen instantly  
✅ Staff marks orders as served  
✅ Funny rotating messages after order  
✅ Pay at counter (no online payments)  
✅ Simple & free (React + Tailwind + Firebase-optional)  
✅ AGM Canteen branding  
✅ Dummy Karnataka menu with prices  

## 🔧 Tech Stack
- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS (mobile-first)
- **Backend**: Firebase Firestore (optional) or localStorage fallback
- **No Login** needed

## 📊 Menu
### Breakfast
- Idli (2 pcs) – ₹25
- Vada – ₹20
- Plain Dosa – ₹40
- Masala Dosa – ₹50
- Khara Bath – ₹35
- Kesari Bath – ₹30

### Lunch
- Rice + Sambar – ₹40
- Rice + Rasam – ₹35
- Rice + Palya – ₹30
- Full Meals – ₹60
- Curd Rice – ₹30

### Juices
- Mosambi – ₹30 | Watermelon – ₹25 | Pineapple – ₹35 | Mixed Fruit – ₹40

### Beverages
- Tea – ₹10 | Coffee – ₹15 | Boost – ₹20

## 🚀 Deploy (Optional)

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

### Vercel
```bash
npm i -g vercel
vercel
```

## 🔐 Firebase Setup (Optional)
Create `.env` from `.env.example`:
```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```

**Works without Firebase** – uses localStorage by default.

## 📝 Notes
- No admin login required
- No online payment (counter-only)
- Mobile-first, large readable text
- Works on low internet
- Designed for non-technical staff

