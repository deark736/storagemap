const express = require('express');
const db = require('./database');
const createLocationRouter = require('./locations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'StorageMap API is running' });
});

app.use('/api/locations', createLocationRouter(db));

// Export the app for testing without opening a listening port.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`StorageMap backend running on port ${PORT}`);
  });
}

module.exports = app;
