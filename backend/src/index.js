import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taw_overseas';

app.use(cors());
app.use(express.json());

let db;

// Connessione a MongoDB tramite il driver nativo
MongoClient.connect(MONGO_URI)
  .then((client) => {
    console.log('Connesso a MongoDB');
    db = client.db();
    
    // Rotta di prova per verificare che l'API risponda
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'Backend attivo e connesso al DB' });
    });

    app.listen(PORT, () => {
      console.log(`Server backend avviato sulla porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Errore di connessione a MongoDB:', err);
  });
