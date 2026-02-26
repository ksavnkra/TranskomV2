# Transkom — Foreign Currency Exchange Platform

A full-stack web application for buying and selling foreign currencies with real-time exchange rates, AI-powered customer support, and a secure wallet system.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen?logo=mongodb)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?logo=express)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## Features

- **Currency Exchange** — Buy and sell between 40+ global currencies with real-time rates
- **Multi-Currency Wallet** — Hold USD, INR, AED, and EUR balances in one account
- **AI Chatbot** — Google Gemini-powered support assistant for instant help
- **Secure Auth** — JWT-based authentication with bcrypt password hashing
- **Rate Limiting** — Protection against brute-force and abuse
- **Email Notifications** — Transaction alerts via Nodemailer (Gmail)
- **Newsletter** — Email subscription system
- **Responsive UI** — Mobile-friendly design with smooth animations

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML, CSS, JavaScript, Bootstrap 5, Swiper.js, Animate.css |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose ODM) |
| **Auth** | JWT + bcryptjs |
| **AI** | Google Gemini 2.5 Flash |
| **Rates** | ExchangeRate-API (free tier) |
| **Email** | Nodemailer (Gmail SMTP) |

---

## Project Structure

```
TRANSKOM/
├── backend/
│   ├── server.js              # Express server entry point
│   ├── .env.example           # Environment variable template
│   ├── package.json
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── models/
│   │   ├── User.js            # User schema (wallet, auth)
│   │   ├── Transaction.js     # Transaction records
│   │   └── Subscription.js    # Newsletter subscriptions
│   ├── routes/
│   │   ├── auth.js            # Register, login, get profile
│   │   ├── transactions.js    # Buy, sell, rates, history
│   │   ├── newsletter.js      # Newsletter subscribe/unsubscribe
│   │   └── chat.js            # AI chatbot endpoint
│   └── utils/
│       └── notifications.js   # Email notification helper
│
├── frontend/
│   ├── index.html             # Landing page
│   ├── auth.html              # Login / Sign up
│   ├── buy-sell.html          # Currency exchange widget
│   ├── profile.html           # User dashboard & wallet
│   ├── external-CSS/          # Custom stylesheets
│   ├── external-JS/           # Custom scripts
│   ├── css/                   # Bootstrap CSS
│   ├── js/                    # Bootstrap JS + auth-check
│   └── rsrc/                  # Images & assets
│
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher — [Download](https://nodejs.org)
- **MongoDB** — [MongoDB Atlas](https://cloud.mongodb.com) (free tier) or local install
- **Git** — [Download](https://git-scm.com)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/transkom.git
cd transkom
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Open `backend/.env` and fill in the required values:

| Variable | Required | How to Get It |
|----------|----------|---------------|
| `MONGODB_URI` | ✅ | [MongoDB Atlas](https://cloud.mongodb.com) → Create Cluster → Connect → Drivers |
| `JWT_SECRET` | ✅ | Run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `GEMINI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `EMAIL_USER` | Optional | Gmail address for sending notifications |
| `EMAIL_PASS` | Optional | [Gmail App Password](https://myaccount.google.com/apppasswords) |
| `EXCHANGE_RATE_API_KEY` | Optional | [ExchangeRate-API](https://www.exchangerate-api.com) (free tier works without key) |

### 4. Set Up MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free account
2. Create a new **Shared Cluster** (free)
3. Go to **Database Access** → Add a database user with read/write permissions
4. Go to **Network Access** → Add your IP address (or `0.0.0.0/0` for development)
5. Go to **Cluster** → **Connect** → **Drivers** → Copy the connection string
6. Paste it into `MONGODB_URI` in your `.env` file, replacing `<username>`, `<password>`, and `<cluster>`

### 5. Run the Server

```bash
npm start
```

The app will be available at **http://localhost:5000**

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Login and receive JWT token |
| GET | `/api/auth/me` | Get current user profile (auth required) |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions/rate?from=USD&to=EUR` | Get live exchange rate |
| POST | `/api/transactions/buy` | Buy currency (auth required) |
| POST | `/api/transactions/sell` | Sell currency from wallet (auth required) |
| GET | `/api/transactions/history?page=1&limit=10` | Transaction history (auth required) |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/newsletter/subscribe` | Subscribe to newsletter |
| POST | `/api/chat` | AI chatbot message |

---

## Security

- **Server-side rate calculation** — Exchange rates and fees are computed on the backend; clients cannot manipulate amounts
- **Rate limiting** — 100 requests/15 min globally, 20/15 min for auth routes
- **Input validation** — All inputs sanitized and validated server-side
- **Password hashing** — bcrypt with salt rounds of 10
- **JWT authentication** — Tokens expire after 24 hours
- **XSS prevention** — User content rendered via `textContent`, not `innerHTML`
- **CORS** — Restricted to configured origins

---

## Deployment

### Environment Variables (Production)

Set these in your hosting platform's dashboard:

```
NODE_ENV=production
PORT=5000
MONGODB_URI=your_atlas_uri
JWT_SECRET=your_secret
GEMINI_API_KEY=your_key
ALLOWED_ORIGINS=https://yourdomain.com
```

### Platforms

- **Render** / **Railway** — Connect GitHub repo, set env vars, deploy
- **VPS (DigitalOcean, AWS)** — Use PM2 + Nginx reverse proxy + Let's Encrypt SSL

---

## License

This project is licensed under the MIT License.
