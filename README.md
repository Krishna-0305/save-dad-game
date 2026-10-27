# SAVE DAD! — Full-Stack MERN 3D Action Game

A complete, production-minded 3D browser action game built with the **MERN** stack (MongoDB, Express, React, Node.js) and **Three.js**.

---

## 🌟 Game Story & Premise

The player controls a college student living in an Indian hostel far from home. Late at night, while studying in his hostel room, an intense supernatural premonition strikes: his father is crossing a busy Indian urban street outside a railway junction with high-speed motorcycle traffic closing in!

The player must sprint across the tarmac, dodge traffic, reach Dad before impact, grab him, and pull him to the safe sidewalk zone.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript & Vite
- **3D Graphics:** Three.js (procedural geometries, custom lighting, shadows, animations, and object pooling)
- **Audio:** Custom Web Audio API synthesizer (horn honks, engine Doppler shifts, alert sirens, heartbeats, rescue fanfares)
- **Styling & UI:** Glassmorphism UI with Tailwind CSS utilities & Lucide icons
- **Effects:** Canvas Confetti for victory celebrations

### Backend
- **Runtime:** Node.js 24 with TypeScript & Express.js
- **Database:** MongoDB & Mongoose
- **Zero-Config Fallback:** Embedded `mongodb-memory-server` for instant standalone execution if external MongoDB is not running
- **Security:** Bcrypt password hashing, HTTP-only secure cookie sessions, JWT, Helmet security headers, Express Rate Limiter, and Zod input validation
- **Testing:** Vitest & Supertest for unit, anti-cheat, and API integration testing

---

## 🎮 Gameplay Controls

### Desktop
- **`W` / `A` / `S` / `D` or Arrow Keys:** Move in 8 directions
- **`Left Shift` / `Right Shift`:** Sprint (increases speed from 6.0 u/s to 10.5 u/s)
- **`Space` or `E`:** Rescue Dad (triggers when within 3.2m rescue radius)
- **`Escape`:** Pause / Resume game
- **`F3`:** Toggle Debug Inspector (hitboxes, trajectories, speeds, FPS)

### Mobile & Touch Devices
- **Virtual Joystick (Bottom Left):** Dynamic 360° analog movement
- **Large Red RESCUE Button (Bottom Right):** Quick rescue action
- **Sprint Toggle Button (Bottom Right):** Toggle high-speed sprint
- **Pause & Audio Buttons (Top Right):** Accessible in HUD

---

## 🧮 Scoring Formula & Difficulty Scaling

### Scoring (Section G)
1. **Base Points:** **100 points** per successful rescue.
2. **Reaction-Time Bonus:** Up to **+50 additional points** based on how quickly the player responds from danger onset:
   $$\text{Bonus} = \text{clamp}\left(0, 50, \left\lfloor\frac{2000 - \text{reactionTimeMs}}{30}\right\rfloor\right)$$
3. **Combo Multiplier:** Consecutive saves increase multiplier from **1.0x** up to **2.0x** ($+0.2\text{x}$ per save).
4. **Collision:** Ends the round immediately with 0 points awarded for the failed attempt.
5. **Round Duration:** 60-second timed round. Surviving the full round triggers a **Victory!** status.

### Round-by-Round Instant Progression (`DifficultyManager`)

**Core Progression Rule:**
`ROUND 1 → RESCUE DAD → SUCCESS EFFECT (≤ 0.5s) → ROUND 2 → RESCUE DAD → ROUND 3 → ...`
* **One Save per Round:** Round 1 ends immediately upon rescuing Dad once.
* **Instant Automatic Transition:** Shows a punchy rescue-success celebration banner for $\le 0.45\text{s}$, then automatically transitions to the next round with no manual Continue button or confirmation delays.
* **Fresh Round State:** Each new round starts with a fresh 60-second timer, reset traffic, updated speed/density settings, and valid starting positions for Son and Dad.
* **Cumulative Totals Preserved:** Total score, saves count, and combo multiplier carry over smoothly across rounds.
* **Failure Condition:** If traffic hits Dad or Son, or 60 seconds expire without rescuing Dad, the run ends with failure details and a **Retry Round** option.

| Round | Traffic Speed | Traffic Density | Danger Warning | Rescue Window | Pattern |
|---|---|---|---|---|---|
| 1 | Very Slow (9.0 u/s) | Very Low (5.0s gap) | 3.5 sec | 5.0 sec | Single Center (Tutorial) |
| 2 | Slow (11.0 u/s) | Low (4.7s gap) | 3.2 sec | 4.7 sec | Single Center (Basics) |
| 3 | Moderate (13.0 u/s) | Low (4.4s gap) | 3.0 sec | 4.4 sec | Alternating Lanes |
| 4 | Moderate (14.5 u/s) | Medium (4.1s gap) | 2.8 sec | 4.1 sec | Variable Speeds |
| 5 | Moderately Fast (16.0 u/s) | Medium (3.8s gap) | 2.6 sec | 3.8 sec | Staggered Dual Waves |
| 6 | Fast (17.5 u/s) | Medium (3.5s gap) | 2.4 sec | 3.5 sec | Dual Lane Hazard |
| 7 | Fast (19.0 u/s) | High (3.2s gap) | 2.2 sec | 3.2 sec | Coordinated Pincer Waves |
| 8 | Very Fast (20.5 u/s) | High (3.0s gap) | 2.0 sec | 3.0 sec | Rapid Follow-Up Wave |
| 9 | Very Fast (22.0 u/s) | Very High (2.8s gap) | 1.8 sec | 2.8 sec | Complex Staggered Waves |
| 10 | Expert (23.5 u/s) | High Complex (2.6s gap) | 1.7 sec | 2.6 sec | Expert Multi-Lane Mix |

#### Scaling Beyond Round 10:
Rounds 11+ scale smoothly with bounded asymptotic caps:
- **Speed:** $\text{speed}(R) = \min(28.0, 23.5 + 4.5 \times (1 - e^{-(R - 10) / 15}))$ (strictly capped at $28.0\text{ u/s}$).
- **Warning Duration:** $\ge 1.3\text{s}$ safe minimum.
- **Rescue Window:** $\ge 2.1\text{s}$ (leaving ample margin over the player's sprint travel time).
- **Spawn Interval:** $\ge 1.7\text{s}$ safe minimum.

#### Guaranteed Fairness & Deterministic Seeds:
- **`ScenarioGenerator`:** Validates every procedural scenario. Time to collision is mathematically verified to always exceed:
  $$\text{timeToImpact} \ge \frac{\max(0, \text{distanceToDad} - \text{rescueRadius})}{\text{sprintSpeed}} + \text{rescueDuration} + 0.4\text{s buffer}$$
- Vehicles never spawn directly on the crossing ($|startZ| \ge 35\text{m}$).
- Deterministic PRNG seeds allow reproducible debugging and testing.

---

## 🛡️ Server-Authoritative Anti-Cheat Validation

Clients cannot submit arbitrary high scores:
1. **Server-Issued Sessions:** `POST /api/games/sessions` returns a cryptographically unique `sessionId` with a server timestamp.
2. **Temporal Bounds Verification:** Rejects submissions where elapsed real time is significantly less than reported survival time.
3. **Physical Capacity Checks:** Rejects impossible save counts (each rescue physically requires at least 1.2s approach + transition).
4. **Human Reflex Thresholds:** Flags reaction times under 100ms as superhuman/automated.
5. **Score Discrepancy Auditing:** Reconstructs the exact points from event logs to verify the score matches mathematical formulas.
6. **Single-Use Enforcement:** Sessions can only be finalized once.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24.18.0)
- **npm** v9+

### 2. Installation
Install dependencies for both client and server:
```bash
npm run install:all
```
*(Or install individually inside `/server` and `/client` via `npm install`)*

### 3. Database Setup
The server is configured with an **automatic zero-configuration fallback**:
- If a MongoDB service is running at `mongodb://localhost:27017/save-dad`, it connects to it.
- If no external MongoDB daemon is detected, the server automatically starts an embedded in-memory MongoDB instance. No setup required!

To specify a custom remote MongoDB connection (e.g. MongoDB Atlas), create `server/.env`:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/save-dad?retryWrites=true&w=majority
JWT_SECRET=your-production-secret-key
PORT=5000
```

### 4. Running Locally
Run the server and client concurrently:

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
```
*Backend runs on `http://localhost:5001`*

**Terminal 2 (Frontend 3D Client):**
```bash
cd client
npm run dev
```
*Frontend runs on `http://localhost:5173`*

Open `http://localhost:5173` in any modern desktop or mobile browser!

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` — Register cadet (`username`, `email`, `password`)
- `POST /api/auth/login` — Login & receive HTTP-only session cookie
- `POST /api/auth/logout` — Invalidate session and clear cookie
- `GET /api/auth/me` — Retrieve current authenticated player

### Game Sessions
- `POST /api/games/sessions` — Start server-authoritative 60s round
- `POST /api/games/sessions/:id/finish` — Submit round telemetry for validation & record personal bests

### Leaderboards & Profiles
- `GET /api/leaderboard?category=score` — Highest score rankings
- `GET /api/leaderboard?category=saves` — Most saves rankings
- `GET /api/leaderboard?category=fastest-rescue` — Fastest rescue rankings
- `GET /api/leaderboard?category=combo` — Highest combo rankings
- `GET /api/leaderboard?category=total-saves` — Cumulative saves rankings
- `GET /api/players/me/stats` — Current user stats and match history
- `GET /api/players/:username` — Public player dossier (sanitized)

---

## 🧪 Testing Checklist & Verification

Run automated test suites:
```bash
cd server
npm test
```

### Automated Test Outcomes:
- `✓` **Difficulty Progression Tuning:** Verified exact metric targets for Rounds 1, 5, and 10.
- `✓` **Bounded High-Round Scaling:** Verified Rounds 20 and 50 remain strictly within safe physical speed ($\le 28.0\text{ u/s}$) and reaction caps ($\ge 2.1\text{s}$ rescue window).
- `✓` **Guaranteed Viable Rescue Routes:** Verified mathematical fairness across generated wave scenarios.
- `✓` **Deterministic Scenario Seeds:** Verified reproducible scenario generation across runs.
- `✓` **One-Save Instant Progression Flow:** Verified Round 1 advances to Round 2 upon 1 save, updates difficulty, and preserves cumulative progress.
- `✓` **Superhuman Reaction Flagging:** Flags reactions $< 100\text{ms}$.
- `✓` **Duration Bounds:** Rejects premature result submissions.
- `✓` **Impossible Save Count:** Rejects impossible ratios of saves per second.
- `✓` **Score Discrepancy Detection:** Flags tampered client scores.
- `✓` **Registration & Validation:** Enforces alphanumeric usernames, normalized emails, minimum password lengths.
- `✓` **Duplicate Account Protection:** Rejects existing email and username combinations.
- `✓` **Password Hashing:** Hashes passwords with salt; generic login failure messages.
- `✓` **HTTP-Only Cookies:** Issues and verifies secure cookies.
- `✓` **Ranked Session Generation:** Issues server start timestamps and tracks `roundNumber`.
- `✓` **Session Completion:** Atomic update of personal records (`highScore`, `mostSaves`, `highestRound`, `fastestRescueMs`, `totalSaves`).
- `✓` **Single-Use Guard:** Rejects duplicate submissions with HTTP 409.
- `✓` **Highest Round Leaderboard:** Correct category sorting and tie-breaking by timestamp for `category=round`.
- `✓` **Public Profile Sanitization:** Omits password hashes, sessions, and emails from public profiles.
- `✓` **Session Logout:** Correct cookie invalidation.

**Result: 30 / 30 tests passing.**

---

## 🚀 Deployment to Vercel

The project is fully configured for one-click deployment on **Vercel** with both the React + Three.js frontend and the Express API serverless backend.

### Option A: Deploy via GitHub & Vercel Dashboard (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: complete SAVE DAD game with Vercel deployment"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Import into Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new) and select your GitHub repository.
   - Leave the **Framework Preset** as **Vite** or **Other**.
   - **Root Directory:** `./` (leave default).
   - **Build Command:** `npm run build` (or leave default, picked up from `vercel.json`).
   - **Output Directory:** `client/dist` (picked up from `vercel.json`).

3. **Configure Environment Variables in Vercel:**
   Under **Settings > Environment Variables**, add:
   - `MONGODB_URI`: `mongodb+srv://leelakrishnasaisannaboyina_db_user:lMZiUL6OzjWDj54S@cluster0.m8cjdes.mongodb.net/save-dad?retryWrites=true&w=majority`
   - `JWT_SECRET`: `save-dad-super-secret-key-3d-runner-2026`
   - `NODE_ENV`: `production`

4. Click **Deploy**. Vercel will build both the client and the serverless API function in `/api`.

---

### Option B: Deploy via Vercel CLI

1. Run the Vercel CLI from the project root:
   ```bash
   npx vercel
   ```
2. Follow the interactive prompts to link and deploy your project.
3. For production deployment:
   ```bash
   npx vercel --prod
   ```


