import json
import boto3
import uuid
from datetime import datetime, timezone
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("StudySpotPins")

ALLOWED_TAGS = {
    "quiet",
    "wifi",
    "power_outlets",
    "food",
    "coffee",
    "group_study"
}


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body, default=str)
    }


def lambda_handler(event, context):

    try:
        body = event.get("body")

        if isinstance(body, str):
            body = json.loads(body)

        if not isinstance(body, dict):
            return response(400, {
                "error": "Request body must be a JSON object"
            })

        cafe_name = body.get("cafeName")
        address = body.get("address")
        lat = body.get("lat")
        lng = body.get("lng")
        rating = body.get("rating")
        tags = body.get("tags", [])
        note = body.get("note", "")
        photo_key = body.get("photoKey")

        if not cafe_name:
            return response(400, {
                "error": "Café name is required"
            })

        if not isinstance(cafe_name, str):
            return response(400, {
                "error": "Café name must be a string"
            })

        cafe_name = cafe_name.strip()

        if len(cafe_name) > 60:
            return response(400, {
                "error": "Café name must be 60 characters or less"
            })

        if not address:
            return response(400, {
                "error": "Address is required"
            })

        if not isinstance(address, str):
            return response(400, {
                "error": "Address must be a string"
            })

        address = address.strip()

        try:
            lat = Decimal(str(lat))
        except (TypeError, ValueError):
            return response(400, {
                "error": "Invalid latitude"
            })

        if not Decimal("-90") <= lat <= Decimal("90"):
            return response(400, {
                "error": "Latitude must be between -90 and 90"
            })

        try:
            lng = Decimal(str(lng))
        except (TypeError, ValueError):
            return response(400, {
                "error": "Invalid longitude"
            })

        if not Decimal("-180") <= lng <= Decimal("180"):
            return response(400, {
                "error": "Longitude must be between -180 and 180"
            })

        try:
            rating = Decimal(str(rating))
        except (TypeError, ValueError):
            return response(400, {
                "error": "Rating must be a number between 1 and 5"
            })

        if not Decimal("1") <= rating <= Decimal("5"):
            return response(400, {
                "error": "Rating must be between 1 and 5"
            })

        if not isinstance(tags, list):
            return response(400, {
                "error": "Tags must be an array"
            })

        invalid_tags = [
            tag for tag in tags
            if tag not in ALLOWED_TAGS
        ]

        if invalid_tags:
            return response(400, {
                "error": "Invalid tag values",
                "invalidTags": invalid_tags,
                "allowedTags": sorted(ALLOWED_TAGS)
            })

        if not isinstance(note, str):
            return response(400, {
                "error": "Note must be a string"
            })

        if len(note) > 140:
            return response(400, {
                "error": "Note must be 140 characters or less"
            })

        pin_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        item = {
            "pinId": pin_id,
            "cafeName": cafe_name,
            "address": address,
            "lat": lat,
            "lng": lng,
            "rating": rating,
            "tags": tags,
            "note": note,
            "createdAt": created_at
        }

        if photo_key:
            item["photoKey"] = photo_key

        table.put_item(Item=item)

        return response(201, item)

    except Exception as e:
        print("ERROR:", str(e))
        return response(500, {
            "error": "Failed to create study spot",
            "message": str(e)
        })