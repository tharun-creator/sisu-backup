/* eslint-disable @typescript-eslint/no-require-imports */
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const { exec } = require('child_process');
require('dotenv').config({ path: '.env.local' });

console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3002/oauth2callback'
);

const scopes = ['https://www.googleapis.com/auth/calendar'];

const authorizeUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Authorize this app by visiting this url:', authorizeUrl);
exec(`start "${authorizeUrl}"`, (err) => {
  if (err) {
    console.error('Failed to open browser:', err);
  }
});

const server = http.createServer(async (req, res) => {
  if (req.url.indexOf('/oauth2callback') > -1) {
    const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
    const code = qs.get('code');
    console.log('Code:', code);

    res.end('Authentication successful! Please return to the console.');

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('Refresh token:', tokens.refresh_token);
    console.log('Access token:', tokens.access_token);

    server.close();
  }
});

server.listen(3002, () => {
  console.log('Server listening on port 3002');
});
