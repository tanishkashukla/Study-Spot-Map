# StudySpot Map 🧋📖

StudySpot is a web application for discovering, exploring, and adding places that are suitable for studying. Users can browse study spots on a map, view details such as ratings and notes, and contribute new locations with useful study-related features and optional photos.

## Live Website

https://studyspot-map-cloud.web.app/

## Features

- Interactive map for exploring study spots
- Search and location-based spot discovery
- Add new study spots
- Edit existing study spots
- Delete study spots
- Community ratings
- Short notes describing each location
- Study-focused attributes: Quiet, WiFi, Power, Food, Coffee, and Group study
- Optional café/place photos
- Photo upload and retrieval through AWS S3
- Firebase Hosting deployment

## Tech Stack

### Frontend
- HTML
- CSS
- JavaScript
- Google Maps integration

### Backend / Cloud
- AWS API Gateway
- AWS Lambda
- Amazon S3
- Amazon DynamoDB

### Hosting
- Firebase Hosting

## Architecture

```text
                    StudySpot Frontend
                           |
                           v
                    Firebase Hosting
                           |
                           v
                  AWS API Gateway
                     /          \
                    /            \
                   v              v
             AWS Lambda      AWS Lambda
                   |              |
                   v              v
              DynamoDB          Amazon S3
             spot metadata      spot photos
                                    |
                                    v
                         Presigned download URL
                                    |
                                    v
                            StudySpot Frontend
```

The frontend is hosted on Firebase, while the application backend and cloud storage are handled through AWS.

## Data Storage

Study spot information is stored in DynamoDB. The database stores the photo reference (`photoKey`) rather than exposing the private S3 object directly.

Example:

```text
photos/<uuid>.jpg
```

The frontend requests a temporary presigned download URL whenever it needs to display the image.

## Running Locally

### Prerequisites

- Python
- A web browser
- Access to the configured AWS backend
- Google Maps configuration for map functionality

### Start a local server

From the project directory:

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

## Deployment

The frontend is deployed using Firebase Hosting.

After making frontend changes:

```bash
firebase deploy --only hosting
```

## Security

- The S3 photo bucket is private.
- Photos are accessed through temporary presigned URLs.
- Permanent AWS credentials should not be placed in frontend code.
- API access is handled through API Gateway and Lambda.

## Live Demo

Visit the application:

https://studyspot-map-cloud.web.app/
The application allows users to search (& add) for study-friendly places, explore the map, add study spots, record ratings and notes, select study-related attributes, and optionally attach photos.

## Project Purpose

StudySpot demonstrates a cloud-based web application combining a browser-based frontend, AWS serverless services, cloud object storage, a NoSQL database, and Firebase Hosting.
