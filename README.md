# 📈 Stock Broker Dashboard

A modern, real-time stock trading dashboard built with React and Node.js that allows users to subscribe to stocks and view live price updates.

## ✨ Features

### Core Functionality
- ✅ **Email-based Authentication** - Secure login system with JWT tokens
- ✅ **Stock Subscriptions** - Subscribe to your favorite stocks (GOOG, TSLA, AMZN, META, NVDA, AAPL, GOOGL, MSFT, NFLX)
- ✅ **Real-time Price Updates** - Live stock price updates every second without page refresh
- ✅ **Multi-user Support** - Multiple users can view different stocks simultaneously with async updates
- ✅ **WebSocket Integration** - Real-time communication using Socket.IO

### UI/UX Features
- 🎨 **Modern Gradient Design** - Beautiful purple gradient with glassmorphism effects
- 📊 **Live Price Indicators** - Visual indicators for price movements (up/down/stable)
- 💼 **Portfolio View** - Dedicated section for your subscribed stocks
- 🏪 **Stock Marketplace** - Browse and subscribe to available stocks
- 🔴 **Live Status Indicator** - Pulsing dot showing real-time connection
- ✨ **Smooth Animations** - Fluid transitions and hover effects

## 🚀 Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **Socket.IO Client** - WebSocket client
- **React Router** - Navigation
- **React Toastify** - Notifications
- **Zustand** - State management

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Socket.IO** - WebSocket server
- **PostgreSQL (Neon)** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing

## 📦 Installation

### Prerequisites
- Node.js (v16+)
- npm or yarn
- PostgreSQL database (Neon account)

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd stock-app
```

2. **Backend Setup**
```bash
cd Backend
npm install
```

3. **Configure Environment**
Create `.env` file in Backend folder:
```env
DATABASE_URL=postgresql://your-connection-string
PORT=3000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

4. **Initialize Database**
```bash
node setup-database.js
```

5. **Frontend Setup**
```bash
cd ../Frontend
npm install
```

## 🎯 Running the Application

### Start Backend (Terminal 1)
```bash
cd Backend
npm start
```
Backend runs on: http://localhost:3000

### Start Frontend (Terminal 2)
```bash
cd Frontend
npm run dev
```
Frontend runs on: http://localhost:5173

## 👤 Test Credentials

Use these credentials to login:
- **Email:** demo@test.com
- **Password:** demo123

Or create your own account via the Signup page!

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/getme` - Get current user (requires JWT)

### Stocks
- `GET /api/stocks` - Get all stocks with current prices

### Subscriptions
- `GET /api/users/:userId/subscriptions` - Get user's subscriptions
- `POST /api/users/:userId/subscriptions` - Subscribe to a stock
- `DELETE /api/users/:userId/subscriptions/:ticker` - Unsubscribe from stock

### WebSocket Events
- `join-stocks` - Join stock rooms for real-time updates
- `stock:update` - Receive price updates for subscribed stocks

## 📊 Supported Stocks

The application supports these 9 stocks:
- **AAPL** - Apple Inc.
- **GOOGL** - Alphabet Inc.
- **MSFT** - Microsoft Corporation
- **AMZN** - Amazon.com Inc.
- **TSLA** - Tesla Inc.
- **META** - Meta Platforms Inc.
- **NVDA** - NVIDIA Corporation
- **NFLX** - Netflix Inc.
- **GOOG** - Alphabet Inc.

## 🔧 Architecture

### Price Simulation
Prices are updated every second using a random number generator that simulates realistic stock price movements:
- Random percentage change between -2% and +2%
- Updates broadcast to subscribed users via WebSocket
- Persisted in database for consistency

### Real-time Updates
```
User subscribes to TSLA
    ↓
Frontend joins "stock:TSLA" room
    ↓
Backend price simulator updates TSLA price every 1s
    ↓
Update broadcast to all users in "stock:TSLA" room
    ↓
Frontend updates UI without refresh
```

### Multi-user Support
- Each user maintains their own Socket.IO connection
- Users only receive updates for stocks they've subscribed to
- Multiple users can subscribe to the same stock
- Updates are sent to all connected users asynchronously

## 📁 Project Structure

```
stock-app/
├── Backend/
│   ├── config/
│   │   └── db.js              # Database configuration
│   ├── controller/
│   │   ├── authController.js  # Auth logic
│   │   ├── stocksController.js
│   │   └── subscriptionsController.js
│   ├── middleware/
│   │   └── authMiddleware.js  # JWT verification
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── stocks.js
│   │   └── subscriptions.js
│   ├── services/
│   │   └── priceSimulator.js  # Price update logic
│   ├── sockets/
│   │   └── index.js           # WebSocket handlers
│   ├── index.js               # Main server file
│   ├── setup-database.js      # DB initialization
│   └── .env                   # Environment variables
│
└── Frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard.jsx  # Main dashboard
    │   │   ├── Login.jsx
    │   │   ├── Signup.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── store/
    │   │   ├── authStore.js   # Auth state
    │   │   └── useUserStore.js
    │   ├── App.jsx
    │   ├── App.css
    │   └── main.jsx
    └── package.json
```

## 🎨 UI Features

### Dashboard Sections
1. **Header** - User info and logout button
2. **My Portfolio** - Grid of subscribed stocks with:
   - Real-time prices
   - Price movement indicators (↑↓)
   - Live status indicator
   - Unsubscribe button
3. **Available Stocks** - Grid of all stocks with:
   - Current prices
   - Subscribe/Subscribed status
   - Quick subscription actions

### Visual Feedback
- **Green (↑)** - Price increasing
- **Red (↓)** - Price decreasing  
- **Gray (—)** - Price stable
- **Pulsing dot** - Live connection indicator
- **Toast notifications** - Action feedback

## 🔒 Security

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens for authenticated requests
- Protected routes on frontend
- SQL injection prevention with parameterized queries
- CORS configured for frontend domain

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3000 is already in use
- Verify DATABASE_URL in .env
- Run `npm install` to ensure dependencies are installed

### Frontend shows 404
- Make sure backend is running
- Check if frontend is on http://localhost:5173
- Verify routes in App.jsx

### WebSocket not connecting
- Check if backend Socket.IO is running
- Verify SOCKET_URL in Dashboard.jsx
- Check browser console for connection errors

### No real-time updates
- Ensure you're subscribed to at least one stock
- Check browser console for socket events
- Verify price simulator is running in backend logs

## 📝 Database Schema

```sql
-- Users table
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT,
  password TEXT,
  created_at TIMESTAMP
)

-- Stocks table
stocks (
  id INTEGER PRIMARY KEY,
  ticker TEXT UNIQUE
)

-- Stock prices table
stock_latest_price (
  stock_id INTEGER PRIMARY KEY REFERENCES stocks(id),
  price DECIMAL,
  updated_at TIMESTAMP
)

-- Subscriptions table
subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  stock_id INTEGER REFERENCES stocks(id),
  created_at TIMESTAMP,
  UNIQUE(user_id, stock_id)
)
```

## 🚀 Future Enhancements

- [ ] Add historical price charts
- [ ] Portfolio value calculation
- [ ] Price alerts/notifications
- [ ] More stocks support
- [ ] Dark/light theme toggle
- [ ] Mobile responsive design
- [ ] Export portfolio data
- [ ] Stock search functionality

## 📄 License

This project is for educational purposes.

## 👨‍💻 Author

Built as a stock broker client web dashboard application.

---

**🎯 Requirements Fulfilled:**
✅ Email-based login
✅ Subscribe to stocks via ticker (GOOG, TSLA, AMZN, META, NVDA + 4 more)
✅ Real-time price updates without refresh
✅ Multi-user support with async dashboard updates
✅ Random price generation updated every second
✅ Modern and attractive UI
