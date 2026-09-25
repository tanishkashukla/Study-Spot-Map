# StudySpot Map — API Documentation

## Base URL

https://gs3tw2lcwh.execute-api.us-east-1.amazonaws.com/prod

---

## 1. Get All Study Spots

### Endpoint

GET `/pins`

### Example

```text
https://gs3tw2lcwh.execute-api.us-east-1.amazonaws.com/prod/pins
````

### Response

```json
[
  {
    "pinId": "example-id",
    "cafeName": "Study Cafe",
    "address": "Andheri West, Mumbai",
    "lat": 19.1364,
    "lng": 72.8296,
    "rating": 4.5,
    "tags": [
      "wifi",
      "coffee",
      "power_outlets"
    ],
    "note": "Good place to study",
    "createdAt": "2026-09-25T12:51:06+00:00"
  }
]
```

---

## 2. Create a Study Spot

### Endpoint

POST `/pins`

### Request Body

```json
{
  "cafeName": "Study Cafe",
  "address": "Andheri West, Mumbai",
  "lat": 19.1364,
  "lng": 72.8296,
  "rating": 4.5,
  "tags": [
    "wifi",
    "coffee",
    "power_outlets"
  ],
  "note": "Good place to study",
  "photoKey": "photos/example.jpg"
}
```

### Validation

* `cafeName` is required
* `cafeName` maximum 60 characters
* `address` is required
* `rating` must be between 1 and 5
* `lat` must be between -90 and 90
* `lng` must be between -180 and 180
* `note` maximum 140 characters
* `tags` must contain only allowed values

### Allowed Tags

```text
quiet
wifi
power_outlets
food
coffee
group_study
```

---

## 3. Generate Photo Upload URL

### Endpoint

POST `/uploads/presign`

### Response

```json
{
  "uploadUrl": "temporary-presigned-url",
  "photoKey": "photos/example.jpg"
}
```

### Photo Upload Flow

1. Call `POST /uploads/presign`
2. Receive `uploadUrl` and `photoKey`
3. Upload the image using HTTP `PUT` to `uploadUrl`
4. Include the returned `photoKey` when creating the study spot

The presigned URL expires after 5 minutes.

---

## 4. Update a Study Spot

### Endpoint

PUT `/pins/{pinId}`

### Example

```text
PUT /pins/example-id
```

### Request Body

```json
{
  "cafeName": "Updated Study Cafe",
  "rating": 4.8,
  "note": "Excellent place for focused study"
}
```

Only supported study-spot fields are updated.

---

## 5. Delete a Study Spot

### Endpoint

DELETE `/pins/{pinId}`

### Example

```text
DELETE /pins/example-id
```

### Response

```json
{
  "message": "Study spot deleted successfully",
  "pinId": "example-id"
}
```

---

## AWS Components

### DynamoDB

Table:

```text
StudySpotPins
```

Partition Key:

```text
pinId
```

### S3

Photo bucket:

```text
studyspot-photos-663959446954
```

Photos are stored under:

```text
photos/
```

### Lambda Functions

```text
createPin
listPins
getUploadUrl
updatePin
deletePin
```

### API Gateway Routes

```text
GET    /pins
POST   /pins
PUT    /pins/{pinId}
DELETE /pins/{pinId}
POST   /uploads/presign
```

### API Gateway Throttling

```text
Rate: 10 requests/second
Burst: 20 requests
```

```

Save with **Ctrl + S**.

Then tell me **“next”**. We'll check the repository structure and `.gitignore` before the first Git commit.
```
