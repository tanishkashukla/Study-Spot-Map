window.STUDY_SPOT_CONFIG = Object.freeze({
  apiBaseUrl: "https://gs3tw2lcwh.execute-api.us-east-1.amazonaws.com/prod",

  // Add your restricted Google Maps browser key here.
  // This key is meant for browser use, but it must be restricted by domain
  // and API in Google Cloud Console.
  googleMapsApiKey: "your_api_key_here",

  defaultCenter: { lat: 19.1364, lng: 72.8296 },
  defaultZoom: 13,
  maxPhotoBytes: 2 * 1024 * 1024,
});
