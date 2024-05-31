
# Google Photos Favorite Downloader

This script downloads all your favorite photos from Google Photos, converts any HEIC files to JPG, and handles pagination to ensure all photos are processed. It also checks if files have been removed from Google Photos and deletes them from the local folder accordingly.

## Features

- Downloads all favorite photos from Google Photos.
- Converts HEIC files to JPG.
- Handles pagination to download more than 50 photos.
- Skips downloading files that already exist.
- Removes local files that have been deleted from Google Photos.

## Setup

### Prerequisites

- Node.js (>= 14.0.0)
- npm (>= 6.0.0)

### Install Required Packages

```bash
npm install axios heic-convert
```

### Set Up Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable the Photos Library API:
   - Navigate to `APIs & Services > Library`.
   - Search for "Photos Library API" and enable it.
4. Set up OAuth 2.0 credentials:
   - Go to `APIs & Services > Credentials`.
   - Click "Create Credentials" and select "OAuth 2.0 Client IDs".
   - Configure the consent screen and download the credentials JSON file.

### Configure Credentials

1. Save your credentials JSON file as `credentials.json` in the root directory of the project.
2. The `credentials.json` file should look like this:

```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID",
    "project_id": "YOUR_PROJECT_ID",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
  }
}
```

## Usage

1. Create a `downloads` directory in the same location as your script:
   ```bash
   mkdir downloads
   ```
2. Run the script:
   ```bash
   node script.js
   ```
3. Follow the instructions to authenticate via the web browser and allow access to your Google Photos.

## Script Details

### Authorization

The script handles OAuth2.0 flow manually using Axios for HTTP requests. It prompts the user to visit the authorization URL and input the authorization code. The script exchanges the authorization code for an access token and stores it locally for future use.

### Downloading Photos

- The script filters out non-photo items by checking the `mimeType`.
- Each photo is downloaded with its creation date included in the filename.
- If a downloaded file is a HEIC image, the script converts it to JPG using `heic-convert` and deletes the original HEIC file.
- The script checks if the file already exists before downloading it.

### Cleanup

The script compares the files in the `downloads` folder with the files in Google Photos and deletes any files that are no longer present in Google Photos.
