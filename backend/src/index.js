import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taw_overseas';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_taw_2026';

app.use(cors());
app.use(express.json());

let db;

// Connessione a MongoDB
MongoClient.connect(MONGO_URI)
  .then((client) => {
    console.log('[INFO] Connessione a MongoDB stabilita con successo');
    db = client.db();

    app.listen(PORT, () => {
      console.log(`[INFO] Server backend avviato sulla porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[ERROR] Errore durante la connessione a MongoDB:', err);
  });

//MIDDLEWARE
// 1. Verifica del Token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Accesso negato: Token mancante' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token non valido o scaduto' });
    }
    req.user = user;
    next();
  });
};

// 2. Controllo dei Ruoli (RBAC)
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accesso negato: Permessi insufficienti' });
    }
    next();
  };
};

//ROTTE AUTENTICAZIONE E UTENTI

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend attivo e connesso al DB' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Tutti i campi obbligatori devono essere compilati' });
    }

    const usersCollection = db.collection('users');
    const existingUser = await usersCollection.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username o Email già in uso' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      username,
      email,
      password: hashedPassword,
      role: role || 'student',
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    res.status(201).json({ message: 'Utente registrato con successo', userId: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Errore durante la registrazione', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e password sono richieste' });
    }

    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'Credenziali non valide' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Credenziali non valide' });
    }

    const tokenPayload = { id: user._id, username: user.username, email: user.email, role: user.role };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login effettuato con successo',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Errore durante il login', error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { password: 0 } }
    );
    if (!user) return res.status(404).json({ message: 'Utente non trovato' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Errore nel recupero del profilo', error: error.message });
  }
});

//ROTTE DESTINAZIONI OVERSEAS
// Ottieni la lista delle destinazioni (Pubblica/Autenticata)
app.get('/api/destinations', async (req, res) => {
  try {
    const destinationsCollection = db.collection('destinations');
    const destinations = await destinationsCollection.find({}).toArray();
    res.json(destinations);
  } catch (error) {
    res.status(500).json({ message: 'Errore nel recupero delle destinazioni', error: error.message });
  }
});

// Aggiungi una nuova destinazione (Solo Admin/Professor)
app.post('/api/destinations', authenticateToken, requireRole('admin', 'professor'), async (req, res) => {
  try {
    const { universityName, country, availableSlots, requirements, description } = req.body;

    if (!universityName || !country || !availableSlots) {
      return res.status(400).json({ message: 'Nome università, paese e posti disponibili sono obbligatori' });
    }

    const newDestination = {
      universityName,
      country,
      availableSlots: Number(availableSlots),
      requirements: requirements || [],
      description: description || '',
      createdAt: new Date()
    };

    const result = await db.collection('destinations').insertOne(newDestination);
    res.status(201).json({ message: 'Destinazione creata con successo', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Errore nella creazione della destinazione', error: error.message });
  }
});

//ROTTE CANDIDATURE (APPLICATIONS)
// Invia una candidatura (Solo Studenti)
app.post('/api/applications', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { destinationId, motivationalLetter, gpa } = req.body;

    if (!destinationId || !motivationalLetter) {
      return res.status(400).json({ message: 'Destinazione e lettera motivazionale sono obbligatorie' });
    }

    // Verifica se l'utente si è già candidato a questa destinazione
    const existingApp = await db.collection('applications').findOne({
      userId: new ObjectId(req.user.id),
      destinationId: new ObjectId(destinationId)
    });

    if (existingApp) {
      return res.status(400).json({ message: 'Hai già inviato una candidatura per questa destinazione' });
    }

    const newApplication = {
      userId: new ObjectId(req.user.id),
      username: req.user.username,
      destinationId: new ObjectId(destinationId),
      motivationalLetter,
      gpa: Number(gpa) || null,
      status: 'pending', // 'pending', 'approved', 'rejected'
      submittedAt: new Date()
    };

    const result = await db.collection('applications').insertOne(newApplication);
    res.status(201).json({ message: 'Candidatura inviata con successo', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Errore durante l\'invio della candidatura', error: error.message });
  }
});

// Recupera le proprie candidature (Studente) o tutte (Admin/Professor)
app.get('/api/applications', authenticateToken, async (req, res) => {
  try {
    const applicationsCollection = db.collection('applications');
    let query = {};

    // Se è uno studente, vede solo le sue domande
    if (req.user.role === 'student') {
      query = { userId: new ObjectId(req.user.id) };
    }

    const applications = await applicationsCollection.find(query).toArray();
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Errore nel recupero delle candidature', error: error.message });
  }
});
