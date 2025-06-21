Perfect — here's your fully updated and **final polished `README.md`** for **Fortify**, now reflecting:

* All your backend/frontend tools (Vite + MERN)
* AI model dependencies from `requirements.txt`
* The fact that **smart contracts** live in the `blockchain/` folder
* React frontend without TypeScript
* Proper contributor attribution

---

```markdown
# 🛡️ Fortify

**Write. Compile. Fortify.**  
A full-stack Solidity IDE & vulnerability scanner that lets developers build, test, and secure smart contracts — with AI-powered insights.

---

## 💡 What is Fortify?

Fortify is a developer-first smart contract IDE that allows:

- 🧠 **Live ML-based vulnerability detection**
- 🔐 **Secure contract compilation and ABI generation**
- ✍️ **Real-time Solidity editing inside a React interface**
- 🚀 **Full-stack dApp integration using Vite + MERN**
- 🔍 **Readable bytecode, test-ready ABIs, and secure deployment hooks**

Whether you're a beginner or a blockchain pro, Fortify makes sure you're never shipping unsafe Solidity again.

---

## 📁 Project Structure

```

womanTechies/
├── blockchain/         # Smart contracts (Hardhat-based)
├── client/             # React (Vite) frontend IDE
├── contracts/fetched/  # Compiled ABI + Bytecode
├── model/              # ML scripts and vulnerability detection
├── server/             # Express backend, OAuth, compiler API
├── README.md

````

---

## 🧰 Tech Stack

| Area         | Tech Used |
|--------------|-----------|
| ✍️ Frontend  | React + Vite + JavaScript |
| 🔌 Backend   | Express.js + MongoDB + Node |
| 🔒 Auth      | Passport.js (Google OAuth2) |
| ⚙️ Compiler  | solc-js (WebAssembly) |
| 🔗 Blockchain| Solidity + Hardhat |
| 🤖 ML Model  | Python, Scikit-learn, PyTorch, Streamlit, FastAPI |

---

## 🔍 Common Smart Contract Issues Solved

- ❌ Insecure `msg.sender` logic
- 🔁 Reentrancy bugs
- 📛 Unchecked external calls
- 🔐 Missing `onlyOwner` modifiers
- 📦 Overexposed storage vars
- 🚫 Gas inefficiencies and unoptimized logic
- 🧠 Developers not being alerted of real vulnerabilities

Fortify flags issues in real-time and encourages secure best practices.

---

## ⚙️ Installation

### Backend & Blockchain

```bash
# Backend
cd server
npm install

# Blockchain (Hardhat)
cd ../blockchain
npm install
````

### Frontend (Vite + React)

```bash
cd ../client
npm install
npm run dev
```

### ML Model (Python)

```bash
cd ../model
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

> Run Streamlit/FastAPI app from `model/` to expose vulnerability prediction API.

---

## 🔐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)

2. Create OAuth 2.0 credentials

3. Set callback URL:

   ```
   http://localhost:3000/auth/google/callback
   ```

4. Add to your `.env` file in `server/`:

```env
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
SESSION_SECRET=random-key
```

---

## 📦 `requirements.txt`

Used in the ML backend (`model/`):

```
numpy
pandas
virtualenv
scikit-learn
torch
streamlit
uvicorn
request
flask
fastapi
```

---

## 🧪 ABI/Bytecode Example

When a Solidity contract like this is compiled:

```solidity
function store(uint256 num) external onlyOwner { ... }
```

Fortify returns a JSON output like:

```json
{
  "abi": [...],
  "evm": {
    "bytecode": {
      "object": "0x60806040..."
    }
  }
}
```

This output is then used to analyze, test, and simulate your smart contract.

---

## 👥 Contributors

| Name           | GitHub                                             |
| -------------- | -------------------------------------------------- |
| Aradhye Swarup | [@cjaradhye](https://github.com/cjaradhye)         |
| Ved Kulkarni   | [@Ved-Kulkarni7](https://github.com/Ved-Kulkarni7) |
| Tanya Bhardwaj | [@tanya166](https://github.com/tanya166)           |

---

## 📄 License

[MIT](LICENSE)

---

> Fortify: Because one unsafe contract can bankrupt millions. Let’s fix that.
