# Transkom — Foreign Currency Exchange Platform

A full-stack currency exchange platform with a Node.js/Express REST API, MongoDB dynamic wallet system supporting 160+ global currencies, Razorpay payment integration, and an AI-powered customer support chatbot.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen?logo=mongodb)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?logo=express)
![Razorpay](https://img.shields.io/badge/Razorpay-Integrated-blue?logo=razorpay)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## Features

- **Currency Exchange** — Buy and sell between 160+ global currencies with real-time exchange rates from ExchangeRate-API
- **Dynamic Multi-Currency Wallet** — Mongoose Map-based schema supporting any currency; balances filtered dynamically in dropdowns
- **Razorpay Payment Gateway** — Server-side order creation, cryptographic signature verification, and automated wallet crediting for fiat deposits
- **Fund Withdrawals** — Withdraw from wallet with automated email notifications to admin (Keshav10.nakra@gmail.com)
- **Balance-Gated Trading** — Buy and sell modes only show currencies the user holds; balance displayed in dropdown options
- **AI Chatbot** — Google Gemini 2.5 Flash-powered support assistant with conversation history and context-aware responses
- **Secure Auth** — JWT-based authentication with bcrypt password hashing, server-side validation, and Express rate limiting
- **Random Avatars** — Auto-generated user avatars via @faker-js/faker on registration
- **Email Notifications** — Withdrawal request alerts and sell notifications via Nodemailer (Gmail SMTP)
- **Newsletter** — Email subscription system
- **Responsive UI** — Dark-themed dashboard, mobile-friendly design with smooth animations

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML, CSS, Vanilla JavaScript, Bootstrap 5, Swiper.js, Animate.css, jQuery, intl-tel-input |
| **Backend** | Node.js, Express.js 4.22, express-rate-limit |
| **Database** | MongoDB (Mongoose 9 ODM, Map-based dynamic wallet) |
| **Auth** | JWT + bcryptjs |
| **Payments** | Razorpay (order creation + signature verification) |
| **AI** | Google Gemini 2.5 Flash (@google/genai) |
| **Rates** | ExchangeRate-API (free tier) |
| **Email** | Nodemailer (Gmail SMTP) |
| **Avatars** | @faker-js/faker |

---

## Project Structure

```
TRANSKOM/
├── backend/
│   ├── server.js              # Express server entry point (CORS, rate limiting, static serving)
│   ├── .env                   # Environment variables
│   ├── package.json
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── models/
│   │   ├── User.js            # User schema (Map-based wallet, avatar, bcrypt hooks)
│   │   ├── Transaction.js     # Transaction records (buy/sell/deposit/withdrawal)
│   │   └── Subscription.js    # Newsletter subscriptions
│   ├── routes/
│   │   ├── auth.js            # Register (+ faker avatar), login, get profile
│   │   ├── transactions.js    # Buy, sell, rates, history (balance-gated)
│   │   ├── funds.js           # Razorpay order creation, payment verification, withdrawals
│   │   ├── newsletter.js      # Newsletter subscribe/unsubscribe
│   │   └── chat.js            # AI chatbot endpoint (Gemini 2.5 Flash)
│   └── utils/
│       └── notifications.js   # Email notifications (sell alerts + withdrawal requests)
│
├── frontend/
│   ├── index.html             # Landing page (hero, exchange iframe, features, footer)
│   ├── auth.html              # Login / Sign up (intl-tel-input)
│   ├── buy-sell.html          # Currency exchange widget (160+ currencies, wallet-filtered)
│   ├── profile.html           # User dashboard, wallet grid, transaction history
│   ├── funds.html             # Add / Withdraw Funds (Razorpay checkout)
│   ├── external-CSS/          # Custom stylesheets (main, auth, buy-sell, profile, funds, chatbot, etc.)
│   ├── external-JS/           # Custom scripts (main, buy-sell, profile, chatbot)
│   ├── css/                   # Bootstrap CSS
│   ├── js/                    # Bootstrap JS + auth-check (nav-funds visibility)
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
| `RAZORPAY_KEY_ID` | ✅ | [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | ✅ | Same as above (shown once on creation) |
| `EMAIL_USER` | Optional | Gmail address for sending notifications |
| `EMAIL_PASS` | Optional | [Gmail App Password](https://myaccount.google.com/apppasswords) |

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
| POST | `/api/auth/register` | Create a new account (auto-generates faker avatar) |
| POST | `/api/auth/login` | Login and receive JWT token |
| GET | `/api/auth/me` | Get current user profile + wallet balances (auth required) |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions/rate?from=USD&to=EUR` | Get live exchange rate |
| POST | `/api/transactions/buy` | Buy currency — requires sufficient fromCurrency balance (auth required) |
| POST | `/api/transactions/sell` | Sell currency from wallet (auth required) |
| GET | `/api/transactions/history?page=1&limit=10` | Paginated transaction history (auth required) |

### Funds (Razorpay)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/funds/create-order` | Create a Razorpay order for adding funds (auth required) |
| POST | `/api/funds/verify-payment` | Verify Razorpay signature and credit wallet (auth required) |
| POST | `/api/funds/withdraw` | Withdraw funds from wallet + email notification (auth required) |
| GET | `/api/funds/wallet` | Get wallet balances (auth required) |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/newsletter/subscribe` | Subscribe to newsletter |
| POST | `/api/chat` | AI chatbot message (Gemini 2.5 Flash) |

---

## Security

- **Server-side rate calculation** — Exchange rates and fees are computed on the backend; clients cannot manipulate amounts
- **Balance-gated transactions** — Buy and sell routes verify sufficient wallet balance server-side before processing
- **Razorpay signature verification** — HMAC-SHA256 cryptographic verification of payment signatures prevents forged payments
- **Rate limiting** — 100 requests/15 min globally, 20/15 min for auth routes
- **Input validation** — All inputs sanitized and validated server-side (regex-based currency code validation)
- **Password hashing** — bcrypt with salt rounds of 10
- **JWT authentication** — Tokens expire after 24 hours; middleware protects all sensitive routes
- **XSS prevention** — User content rendered via `textContent`, not `innerHTML`
- **CORS** — Restricted to configured origins
- **Admin notifications** — Automated email alerts for withdrawal requests

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
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
ALLOWED_ORIGINS=https://yourdomain.com
```

### Platforms

- **Render** / **Railway** — Connect GitHub repo, set env vars, deploy
- **VPS (DigitalOcean, AWS)** — Use PM2 + Nginx reverse proxy + Let's Encrypt SSL

---

## License

This project is licensed under the MIT License.
