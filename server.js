// server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Import the uuid module

const app = express();
const port = 3000;

// Enable CORS to allow requests from the client
app.use(cors());
app.use(express.json());

// Ensure the "images" directory exists
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// Set up multer for handling file uploads with UUID filenames
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imagesDir); // Save files to the "images" directory
    },
    filename: (req, file, cb) => {
        // Generate a UUID and preserve the original file extension
        const ext = path.extname(file.originalname);
        const uniqueFilename = `${uuidv4()}${ext}`;
        cb(null, uniqueFilename);
    }
});
const upload = multer({ storage: storage });

// Serve the "images" folder and "public" folder statically
app.use('/images', express.static(imagesDir));
app.use(express.static('public')); // Serve index.html and other static assets from "public"

// Endpoint to handle image uploads
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the file path for the frontend to use
    res.json({ imagePath: `/images/${req.file.filename}` });
});

// Endpoint to fetch the current tech tree data
app.get('/techTreeData', (req, res) => {
    const dataPath = path.join(__dirname, 'techTreeData.json');
    if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        res.json(data);
    } else {
        res.json([]); // Return an empty array if no data file exists
    }
});

// Endpoint to save tech tree data
app.post('/techTreeData', (req, res) => {
    const dataPath = path.join(__dirname, 'techTreeData.json');
    fs.writeFileSync(dataPath, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ success: true });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

