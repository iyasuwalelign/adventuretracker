## Local image upload server

This workspace includes a tiny Node.js server to store uploaded images into the `images/` folder and serve them to `hi.html`.

To install and run:

```bash
cd "C:\\Users\\iyasu\\OneDrive\\Desktop\\meandshe"
npm install
npm start
```

Then open `hi.html` in your browser at http://localhost:3000/hi.html and enable "Save uploads to local server" in the UI before uploading images.

YouTube search and save (optional)
 - The server supports a YouTube search proxy at `/api/search-youtube?q=...` which uses the YouTube Data API. To enable it you must set the `YT_API_KEY` environment variable before starting the server. Example (PowerShell):

```powershell
$env:YT_API_KEY = 'YOUR_API_KEY_HERE'
npm start
```

 - To get an API key, create a project in Google Cloud Console, enable the YouTube Data API v3, and create an API key. Once set, in the site choose `Song (YouTube)` as the media type, search, preview/play a result and save it to your library — the saved item will store the YouTube video id and let you play it from the app (the server does not download YouTube content).

# meandshe
# tobehosted
# tobehosted
# willbehosted
# adventure_tracker
# adventure_tracker
