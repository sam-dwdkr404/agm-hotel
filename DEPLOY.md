// Deployment guide for AGM Canteen

## 🚀 Deploying AGM Canteen

### Option 1: Firebase Hosting (Recommended)

#### Step 1: Setup Firebase Project
1. Go to https://console.firebase.google.com
2. Create a new project (e.g., "agm-canteen")
3. Enable Firestore Database (optional, works without it)

#### Step 2: Get Firebase Config
1. In Firebase console → Project Settings → Your apps
2. Copy the Web app config values
3. Create `.env` file with your keys:
```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```

#### Step 3: Deploy
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Select your project, choose "dist" as public directory
npm run build
firebase deploy
```

Your app will be live at `https://your-project.web.app`

---

### Option 2: Vercel (Easiest)

```bash
npm i -g vercel
vercel
```

Vercel will guide you through deployment and create a live URL.

---

### Option 3: GitHub Pages (Free)

1. Push code to GitHub
2. In repo settings → Pages → Deploy from `gh-pages` branch
3. Add to `package.json`:
```json
"build": "vite build && git subtree push --prefix dist origin gh-pages"
```

---

## 🔗 QR Codes for Tables

Once deployed, generate QR codes for each table:

```javascript
import { printQRCodes } from './src/utils/qrHelper'

// In your component or console:
printQRCodes() // Prints a page with QR codes for tables 1-20
```

Print and laminate for durability.

---

## 📊 Using Firestore (Optional)

If you want real data persistence instead of localStorage:

1. Enable Firestore in Firebase Console
2. Set rules to allow read/write for now:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write;
    }
  }
}
```

The app will auto-detect and use Firestore if `.env` values are set.

---

## 🔧 Production Checklist

- [ ] Add real Firebase keys to `.env`
- [ ] Customize menu items and prices
- [ ] Print and laminate QR codes
- [ ] Test on actual mobile devices
- [ ] Train staff on kitchen screen (`/kitchen` route)
- [ ] Test ordering workflow end-to-end
- [ ] Monitor Firestore usage (if using)

---

**No complex setup needed.** Works locally with localStorage, scales to cloud with Firebase!
