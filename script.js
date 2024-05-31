const fs = require('fs');
const path = require('path');
const axios = require('axios');
const readline = require('readline');
const heicConvert = require('heic-convert');

const SCOPES = ['https://www.googleapis.com/auth/photoslibrary.readonly'];
const TOKEN_PATH = 'token.json';
const CREDENTIALS_PATH = 'credentials.json';

async function loadCredentials() {
  return new Promise((resolve, reject) => {
    fs.readFile(CREDENTIALS_PATH, (err, content) => {
      if (err) reject('Error loading client secret file:', err);
      else resolve(JSON.parse(content));
    });
  });
}

async function getAccessToken(oAuth2Client) {
  const authUrl = `${oAuth2Client.auth_uri}?client_id=${oAuth2Client.client_id}&redirect_uri=${oAuth2Client.redirect_uris[0]}&response_type=code&scope=${SCOPES.join(' ')}`;
  console.log('Authorize this app by visiting this url:', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter the code from that page here: ', async (code) => {
      rl.close();
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: oAuth2Client.client_id,
        client_secret: oAuth2Client.client_secret,
        redirect_uri: oAuth2Client.redirect_uris[0],
        grant_type: 'authorization_code',
      });
      resolve(response.data);
    });
  });
}

async function authorize() {
  const credentials = await loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = { client_id, client_secret, redirect_uris, auth_uri: 'https://accounts.google.com/o/oauth2/auth' };

  return new Promise((resolve, reject) => {
    fs.readFile(TOKEN_PATH, async (err, token) => {
      if (err) {
        const accessToken = await getAccessToken(oAuth2Client);
        fs.writeFile(TOKEN_PATH, JSON.stringify(accessToken), (err) => {
          if (err) reject(err);
          console.log('Token stored to', TOKEN_PATH);
          resolve(accessToken);
        });
      } else {
        resolve(JSON.parse(token));
      }
    });
  });
}

async function convertHeicToJpg(filePath) {
  const inputBuffer = fs.readFileSync(filePath);
  const outputBuffer = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 1,
  });
  const jpgPath = filePath.replace('.HEIC', '.jpg').replace('.heic', '.jpg');
  fs.writeFileSync(jpgPath, outputBuffer);
  fs.unlinkSync(filePath); // Remove the original HEIC file
  console.log(`Converted ${filePath} to ${jpgPath}`);
}

async function downloadFavoritePhotos(accessToken) {
  const headers = {
    Authorization: `Bearer ${accessToken.access_token}`,
    'Content-Type': 'application/json',
  };

  let url = 'https://photoslibrary.googleapis.com/v1/mediaItems:search';
  let body = {
    filters: {
      featureFilter: {
        includedFeatures: ['FAVORITES'],
      },
    },
    pageSize: 100,
  };

  let pageToken = null;

  do {
    if (pageToken) {
      body.pageToken = pageToken;
    }

    try {
      const response = await axios.post(url, body, { headers });
      const mediaItems = response.data.mediaItems;
      pageToken = response.data.nextPageToken;

      if (!mediaItems || mediaItems.length === 0) {
        console.log('No favorite photos found.');
        return;
      }

      for (const item of mediaItems) {
        if (item.mimeType.startsWith('image/')) {
          const date = new Date(item.mediaMetadata.creationTime);
          const dateString = date.toISOString().split('T')[0];
          const filename = `${dateString}_${item.filename}`;
          const fileUrl = `${item.baseUrl}=d`;
          const filepath = path.join(__dirname, 'downloads', filename);

          // Check if file already exists
          if (fs.existsSync(filepath)) {
            console.log(`File already exists: ${filename}`);
            continue;
          }

          try {
            const fileResponse = await axios.get(fileUrl, { responseType: 'stream' });
            const writer = fs.createWriteStream(filepath);
            fileResponse.data.pipe(writer);
            writer.on('finish', async () => {
              console.log(`Downloaded: ${filename}`);
              if (filename.toLowerCase().endsWith('.heic')) {
                await convertHeicToJpg(filepath);
              }
            });
            writer.on('error', (error) => {
              console.error(`Error writing file ${filename}:`, error);
            });
          } catch (error) {
            console.error(`Error downloading ${filename}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching favorite photos:', error);
      break;
    }
  } while (pageToken);
}

async function main() {
  const accessToken = await authorize();
  await downloadFavoritePhotos(accessToken);
}

main().catch(console.error);
