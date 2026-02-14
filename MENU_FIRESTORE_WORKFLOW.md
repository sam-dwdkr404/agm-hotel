# Firestore Menu Workflow

## Goal
- Menu is read from Firestore collection `menu`
- Price/category/availability updates happen from Firebase Console without redeploy
- Images are local in this React app

## Firestore Document Shape
Collection: `menu`

Document ID example: `masala-dosa`

```json
{
  "id": "masala-dosa",
  "name": "Masala Dosa",
  "price": 50,
  "category": "Breakfast",
  "categoryId": "breakfast",
  "tagline": "South India crispy legacy",
  "imageName": "masala-dosa.jpg",
  "available": true,
  "veg": true,
  "flags": ["Bestseller"],
  "sortOrder": 4
}
```

## Where Images Go
- Place images in `src/assets/images/`
- `imageName` in Firestore must exactly match filename

Example:
- file: `src/assets/images/masala-dosa.jpg`
- Firestore field: `"imageName": "masala-dosa.jpg"`

## Runtime Behavior
- Student menu (`/order?table=5` or `/table/5`) shows item images on cards
- Cart, bill, kitchen stay text-only
- If Firebase config is missing, app falls back to local menu defaults

## Optional Seed Helper
`src/firebase.js` exports `seedMenuCollection()` to write default items into Firestore.
