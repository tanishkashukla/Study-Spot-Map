import json
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("StudySpotPins")


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

        table.delete_item(
            Key={"pinId": pin_id}
        )

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "message": "Study spot deleted successfully",
                "pinId": pin_id
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
                "error": "Failed to delete study spot",
                "message": str(e)
            })
        }