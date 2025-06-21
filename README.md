# 🛡️ Fortify

**Write. Compile. Fortify.**  
A smart contract development playground designed to secure, test, and validate your Solidity code — all in one place.

---

## 🚀 What is Fortify?

Fortify is a Solidity IDE that combines:

- 🧠 **AI-powered vulnerability detection**  
- 🧑‍💻 **Live code editing and compilation**  
- 🔐 **Secure smart contract deployment and access control testing**  
- 🌐 **Full-stack dApp architecture** with a focus on usability and security

All this while guiding developers away from **real-world bugs** in Ethereum contracts.

---

## 🧰 Tech Stack

| Area         | Stack Used |
|--------------|------------|
| Frontend     | React (Vite), JavaScript |
| Backend      | Node.js, Express.js, MongoDB |
| Auth         | Google OAuth2 via Passport.js |
| Compiler     | solc-js (WebAssembly in-browser) |
| Blockchain   | Solidity, Hardhat |
| ML Analysis  | Python (TensorFlow/Sklearn models for contract auditing) |

---

## ⚠️ Why Fortify?

Smart contracts are hard to get right — Fortify addresses the most common and dangerous issues:

- ❌ Misconfigured access controls
- 🔁 Reentrancy bugs
- ⛽ Inefficient gas usage
- 🔒 Lack of immutability checks
- 📜 Unreadable ABI outputs
- 🐛 Poor test coverage
- 🧠 No static or dynamic contract analysis tools built-in

> Fortify integrates education with engineering — letting developers **build safer contracts from Day 1**.

---

## 📦 Folder Structure

```

womanTechies/
├── blockchain/         # Hardhat contracts + deployment
├── client/             # React frontend with in-browser Solidity editor
├── contracts/fetched/  # Compiled ABI & bytecode
├── model/              # ML model files (Python)
├── server/             # Express backend + OAuth + compiler API

````

---

## 🧪 Try It Locally

```bash
# 1. Clone the repo
git clone https://github.com/cjaradhye/womanTechies.git
cd womanTechies

# 2. Backend setup
cd server && npm install

# 3. Frontend setup
cd ../client && npm install

# 4. Blockchain environment
cd ../blockchain && npm install
npx hardhat node

# 5. Run the app (in separate terminals)
# Backend
cd ../server && npm run dev

# Frontend
cd ../client && npm run dev
````

---

## 🔐 Google OAuth Setup (Required)

On [Google Cloud Console](https://console.cloud.google.com):

1. Create a new OAuth 2.0 credential
2. Set redirect URI to: `http://localhost:3000/auth/google/callback`
3. Add your Client ID and Secret in a `.env` file:

```env
GOOGLE_CLIENT_ID=your-id-here
GOOGLE_CLIENT_SECRET=your-secret-here
SESSION_SECRET=random-key
```

---

## 👥 Contributors

| Name           | GitHub                                             |
| -------------- | -------------------------------------------------- |
| Aradhye Swarup | [@cjaradhye](https://github.com/cjaradhye)         |
| Ved Kulkarni   | [@Ved-Kulkarni7](https://github.com/Ved-Kulkarni7) |
| Tanya Bhardwaj | *Contributor (ML Module)*                          |

---

## 📄 License

[MIT](LICENSE)

---

> ✨ Fortify isn't just an IDE. It's a security-first experience for the next generation of Web3 devs.

```
