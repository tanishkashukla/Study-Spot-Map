import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("StudySpotPins")


def decimal_to_python(obj):
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)

    if isinstance(obj, list):
        return [decimal_to_python(item) for item in obj]

    if isinstance(obj, dict):
        return {
            key: decimal_to_python(value)
            for key, value in obj.items()
        }

    return obj


def lambda_handler(event, context):

    try:
        path_parameters = event.get("pathParameters") or {}
        pin_id = path_parameters.get("pinId")

        if not pin_id:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": json.dumps({
                    "error": "pinId is required"
                })
            }

        body = event.get("body")

        if not body:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": json.dumps({
                    "error": "Request body is required"
                })
            }

        data = json.loads(body)

        existing = table.get_item(
            Key={"pinId": pin_id}
        )

        if "Item" not in existing:
            return {
                "statusCode": 404,
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": json.dumps({
                    "error": "Study spot not found"
                })
            }

        if "lat" in data:
            data["lat"] = Decimal(str(data["lat"]))

        if "lng" in data:
            data["lng"] = Decimal(str(data["lng"]))

        if "rating" in data:
            data["rating"] = Decimal(str(data["rating"]))

        allowed_fields = [
            "cafeName",
            "address",
            "lat",
            "lng",
            "rating",
            "tags",
            "note"
        ]

        update_data = {
            key: value
            for key, value in data.items()
            if key in allowed_fields
        }

        if not update_data:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": json.dumps({
                    "error": "No valid fields provided for update"
                })
            }

        update_expression_parts = []
        expression_attribute_names = {}
        expression_attribute_values = {}

        for index, (key, value) in enumerate(update_data.items()):

            name_placeholder = f"#field{index}"
            value_placeholder = f":value{index}"

            update_expression_parts.append(
                f"{name_placeholder} = {value_placeholder}"
            )

            expression_attribute_names[name_placeholder] = key
            expression_attribute_values[value_placeholder] = value

        update_expression = "SET " + ", ".join(
            update_expression_parts
        )

        response = table.update_item(
            Key={"pinId": pin_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW"
        )

        updated_item = response.get("Attributes", {})
        updated_item = decimal_to_python(updated_item)

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps(updated_item)
        }

    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "error": "Invalid JSON in request body"
            })
        }

    except Exception as e:
        print("ERROR:", str(e))

        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "error": "Failed to update study spot",
                "message": str(e)
            })
        }