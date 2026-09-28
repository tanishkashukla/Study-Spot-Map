# StudySpot Map frontend

This is the static frontend for StudySpot Map. It uses Google Maps for the map and address search, Firebase Hosting for deployment, and T's deployed AWS API for pins and optional photos.

## Files

- `index.html` - page structure and accessible form controls
- `styles.css` - responsive visual design and small UI animations
- `app.js` - Google Maps, Places Autocomplete, API calls, markers, CRUD, and S3 upload flow
- `config.js` - API URL, Google Maps browser key, and safe frontend settings

## First setup

1. Open `config.js`.
2. Replace `PASTE_YOUR_RESTRICTED_BROWSER_KEY_HERE` with the restricted Google Maps browser key.
3. In Google Cloud, enable:
   - Maps JavaScript API
   - Places API (New)
4. Restrict the browser key by website and by API. Never put AWS access keys in this project.
5. Keep photo files under 2 MB during the class demo.

The API base URL is already configured:

```text
https://gs3tw2lcwh.execute-api.us-east-1.amazonaws.com/prod
```

## Run locally

This is a static site. Use any local static server so Google Maps can load correctly. For example, with Python installed:

```text
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

## Backend integration

The frontend calls:

```text
GET    /pins
POST   /pins
PUT    /pins/{pinId}
DELETE /pins/{pinId}
POST   /uploads/presign
```

The create/update payload is:

```json
{
  "cafeName": "Study Cafe",
  "address": "Andheri West, Mumbai",
  "lat": 19.1364,
  "lng": 72.8296,
  "rating": 4,
  "tags": ["wifi", "coffee"],
  "note": "Good place to study",
  "photoKey": "photos/example.jpg"
}
```

The optional photo flow is:

1. Request a presigned upload URL.
2. Upload the image directly to S3.
3. Send the returned `photoKey` with the pin.

## Firebase Hosting

Deploy the contents of this folder as the Firebase Hosting public directory. Do not deploy AWS credentials or any private backend files with the frontend.

Before the demo, test:

- Google Map loads
- Address search selects a place
- Existing pins load from DynamoDB
- New pin submission works
- Pin remains after refresh
- Edit and delete work
- Optional photo upload works
- Invalid ratings and oversized images are rejected
- The Firebase URL is included in the Google Maps key website restrictions
