import json
import boto3
import uuid

s3 = boto3.client("s3")

BUCKET_NAME = "studyspot-photos-663959446954"


def lambda_handler(event, context):

    try:
        photo_key = f"photos/{uuid.uuid4()}.jpg"

        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": photo_key,
                "ContentType": "image/jpeg"
            },
            ExpiresIn=300
        )

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
            "body": json.dumps({
                "uploadUrl": upload_url,
                "photoKey": photo_key
            })
        }

    except Exception as e:

        print("ERROR:", str(e))

        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "error": "Failed to generate upload URL",
                "message": str(e)
            })
        }