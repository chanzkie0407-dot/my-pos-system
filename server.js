const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Buksan ang DATABASE
const db = new sqlite3.Database('pos.db', function(err) {
  if (err) {
    console.error('Database Connection Error:', err);
  } else {
    console.log('✅ Database Ready!');
    createTables(); // Gagawa ng tables KAPAG BUKSAN NA ANG DATABASE
  }
});

// GUMAGA NG LAHAT NG TABLES — DITO NAKO!
function createTables() {
  // Products Table
  db.run("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL, stock INTEGER DEFAULT 0)", function(err) {
    if (err) console.error('Products Table Error:', err);
  });

  // Users Table — ITO ANG NAGKAKA-ERROR KANINA!
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL)", function(err) {
    if (err) console.error('Users Table Error:', err);
    else createAdminUser(); // Gagawa ng admin user KAPAG TAPOS NA ANG USERS TABLE
  });

  // Transactions Table
  db.run("CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, items TEXT NOT NULL, total REAL NOT NULL, payment REAL NOT NULL, change REAL NOT NULL, cashier TEXT NOT NULL, date DATETIME DEFAULT CURRENT_TIMESTAMP, status TEXT DEFAULT 'completed')", function(err) {
    if (err) console.error('Transactions Table Error:', err);
  });

  // Void Requests Table
  db.run("CREATE TABLE IF NOT EXISTS void_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_id INTEGER NOT NULL, cashier TEXT NOT NULL, reason TEXT NOT NULL, status TEXT DEFAULT 'pending', requested_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (transaction_id) REFERENCES transactions(id))", function(err) {
    if (err) console.error('Void Requests Table Error:', err);
  });
}

// GUMAGA NG ADMIN USER
function createAdminUser() {
  db.get("SELECT * FROM users WHERE username = 'admin'", function(err, row) {
    if (err) console.error('Check Admin Error:', err);
    else if (!row) {
      db.run("INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin')", function(err) {
        if (err) console.error('Create Admin Error:', err);
        else console.log('✅ Admin Created - User: admin | Pass: admin123');
      });
    } else {
      console.log('✅ Admin User Already Exists');
    }
  });
}

// ========== API ROUTES ==========

app.get('/api/products', function(req, res) {
  db.all("SELECT * FROM products", function(err, rows) {
    if (err) res.json({error: err.message});
    else res.json(rows);
  });
});

app.post('/api/transactions', function(req, res) {
  const items = JSON.stringify(req.body.items);
  const total = req.body.total;
  const payment = req.body.payment;
  const change = req.body.change;
  const cashier = req.body.cashier;
  db.run("INSERT INTO transactions (items, total, payment, change, cashier, status) VALUES (?, ?, ?, ?, ?, 'completed')",
    [items, total, payment, change, cashier],
    function(err) {
      if (err) res.json({success: false, error: err.message});
      else res.json({success: true, transactionId: this.lastID});
    }
  );
});

app.post('/api/void-request', function(req, res) {
  const transactionId = req.body.transactionId;
  const cashier = req.body.cashier;
  const reason = req.body.reason;
  db.run("INSERT INTO void_requests (transaction_id, cashier, reason, status) VALUES (?, ?, ?, 'pending')",
    [transactionId, cashier, reason],
    function(err) {
      if (err) res.json({success: false, error: err.message});
      else res.json({success: true, message: '✅ Request sent to Admin - waiting approval!'});
    }
  );
});

app.post('/api/void-approve', function(req, res) {
  const requestId = req.body.requestId;
  const approve = req.body.approve;
  const newStatus = approve ? 'approved' : 'rejected';
  const transStatus = approve ? 'voided' : 'completed';
  
  db.run("UPDATE void_requests SET status = ? WHERE id = ?", [newStatus, requestId], function(err) {
    if (err) return res.json({success: false, error: err.message});
    db.run("UPDATE transactions SET status = ? WHERE id = (SELECT transaction_id FROM void_requests WHERE id = ?)", [transStatus, requestId], function(err2) {
      if (err2) return res.json({success: false, error: err2.message});
      res.json({success: true});
    });
  });
});

app.get('/api/void-requests', function(req, res) {
  db.all("SELECT * FROM void_requests ORDER BY requested_at DESC", function(err, rows) {
    if (err) res.json({error: err.message});
    else res.json(rows);
  });
});

app.get('/api/transactions', function(req, res) {
  db.all("SELECT * FROM transactions ORDER BY date DESC", function(err, rows) {
    if (err) res.json({error: err.message});
    else res.json(rows);
  });
});

// ========== START SERVER ==========
app.listen(PORT, function() {
  console.log('\n🎉 SERVER READY!');
  console.log('📱 POS: http://localhost:' + PORT);
  console.log('👤 Admin Login - User: admin | Pass: admin123');
});


