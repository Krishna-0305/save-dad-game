# SAVE DAD! — Full-Stack MERN 3D Game

## Mission

Build a complete, production-minded, 3D browser game named SAVE DAD! using the MERN stack with Three.js.

You are acting as a senior full-stack developer, 3D game developer, UI/UX engineer, security engineer, and QA engineer.

Do not stop at generating a plan, mockup, or static UI. Create the actual project files, implement the application, run it locally, execute tests, fix issues, and document the results.

## A. Fixed technology stack

Frontend:
- React
- TypeScript
- Vite
- Three.js
- React Three Fiber and Drei if they materially simplify integration; otherwise use Three.js directly
- HTML and CSS for application UI
- A suitable client-side router

Backend:
- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose

Security:
- Argon2id or bcrypt for password hashing
- Secure, HTTP-only cookie-based sessions
- Server-side input validation
- Rate limiting and secure headers

Testing:
- Vitest for unit tests
- React Testing Library for UI tests where useful
- Supertest for API tests
- Browser end-to-end tests using Playwright if available

Use compatible, stable package versions. Keep client and server configuration separate.

## B. Story and opening

The son is staying in a college hostel far away from his father.

Create a polished cinematic opening:
1. Show a recognizable Indian college hostel room.
2. Show the son studying or relaxing.
3. Trigger a supernatural vision of his father crossing a busy road.
4. Show a motorcycle approaching the father.
5. Use a short red warning flash, atmospheric sound, and a dramatic transition.
6. Show the son realizing the danger.
7. Animate him rushing out.
8. Transition into the 3D road environment.

Provide a skip option for the cinematic. Start the round timer only when interactive gameplay begins.

Use original character designs and procedurally created or appropriately licensed assets. Do not use copyrighted game characters.

## C. Mandatory account flow

Players must register or log in before playing a ranked round.

Registration:
- Username
- Email
- Password
- Unique normalized email and username
- Clear validation and error feedback

Login:
- Email and password
- Secure session creation
- Rate-limited attempts
- Generic authentication failure messages that do not reveal whether an account exists

Account handling:
- Logout
- Current-user endpoint
- Password hashing
- Secure session cookies
- Session invalidation
- Expiring, single-use password-reset tokens if password recovery is implemented
- No plaintext passwords or secrets in logs

The public landing page and public leaderboard may be accessible without authentication. A player must be authenticated to start a ranked session and submit ranked results.

Never store session secrets, passwords, or private account data in localStorage. Keep MongoDB credentials and other secrets in environment variables.

## D. Three-dimensional gameplay

Build the road scene with Three.js.

Include:
- Indian urban road
- Road markings and pedestrian crossing
- Footpaths, buildings, and streetlights
- Third-person camera
- Son and father as distinguishable 3D characters
- Motorcycles with different speeds and trajectories
- A clearly visible safe area
- Lighting, shadows, and animation

The son must physically run to his father and pull him to safety.

Desktop controls:
- WASD or arrow keys to move
- Shift to sprint
- E or Space to rescue within range
- Escape to pause

Mobile controls:
- Virtual joystick
- Large Rescue button
- Optional sprint button
- Pause control

Implement responsive movement, frame-rate-independent updates, valid world boundaries, animation transitions, and collision detection.

A rescue succeeds only when the son is within the valid rescue radius and the danger event remains active. Play a physical pull-to-safety animation and register the save exactly once.

## E. Timed rounds

Each ranked round lasts 60 seconds.

The game supports multiple separate rescue events in one round.

After each successful rescue:
- Move the father to safety.
- Increase the saves counter.
- Award points and reaction-time bonus.
- Update the combo.
- Display a short success effect.
- Prepare another danger event.
- Increase difficulty gradually.

After a collision before rescue completion, end the round.

If time expires first, complete the round successfully.

Implement explicit game states:
MENU, AUTH, STORY, PLAYING, RESCUING, EVENT_TRANSITION, PAUSED, GAME_OVER, ROUND_COMPLETE.

Pausing must freeze game time, traffic, collision checks, and countdowns. Resuming must restore the same valid state.

## F. Fair difficulty

Create a dedicated DifficultyManager.

Progressively adjust:
- Motorcycle speed
- Traffic frequency
- Crossing patterns
- Starting distance
- Rescue window
- Route-choice pressure

Never spawn a motorcycle in an immediately unavoidable collision. Ensure each encounter has a physically possible route to rescue Dad, accounting for movement speed, sprint mechanics, rescue duration, and safe-zone position.

Show clear warning cues. Avoid overlapping events that make a rescue impossible. Make collision boundaries match visible objects.

Add a debug mode to inspect traffic trajectories, rescue radii, collision volumes, and event timing.

Difficulty should reward player skill rather than arbitrary randomness.

## G. Scoring

Use a documented scoring formula:
- 100 points per successful rescue.
- Up to 50 additional points for fast rescues.
- A capped combo multiplier for consecutive successful rescues.
- No rescue points after a failed attempt.

Measure reaction time from the beginning of the danger event to completed rescue using a monotonic clock. Paused time must not count.

Prevent duplicate scoring, duplicate finish requests, and negative or non-finite values.

Track:
- Best score in a single round
- Most saves in a single round
- Fastest rescue in milliseconds
- Longest survival
- Best combo
- Total successful saves

Clearly distinguish current-round statistics, personal bests, and cumulative totals.

## H. MongoDB data model

Create Mongoose models with validation and indexes.

User:
- Username
- Normalized email
- Password hash
- Account status
- Created and updated timestamps

GameSession:
- Unique round/session ID
- Player ID
- Server-issued start time
- Status
- Game version
- Result metadata

GameResult:
- Player ID
- Session ID
- Score
- Successful saves
- Fastest rescue time
- Survival time
- Best combo
- Validation status
- Submission timestamp

Use appropriate unique constraints and compound indexes. Add indexes that support ranked leaderboard queries.

Do not persist every animation frame or movement update to MongoDB.

## I. Leaderboards

Implement a polished global leaderboard.

Categories:
1. Highest score in one round.
2. Most saves in one round.
3. Fastest rescue.
4. Highest combo.
5. Total saves.

For every category, define whether rankings use a personal best, a single validated round, or a cumulative total. Display that definition clearly.

Requirements:
- Paginated rankings
- Player rank
- Username and score
- Personal best indicators
- Current user's highlighted row
- Deterministic tie-breaking
- Loading, empty, and error states
- Responsive mobile layout

Only validated results count toward rankings. Public profiles must not expose email addresses, password hashes, sessions, or private information.

## J. Server-authoritative result validation

Do not trust a client-provided score simply because it came from the game interface.

Implement:
1. Server-issued round IDs and start timestamps.
2. Authenticated round creation.
3. Round ownership verification.
4. Single-use round completion.
5. Input bounds and schema validation.
6. Plausible duration, save-count, reaction-time, and score checks.
7. Duplicate submission protection.
8. Rate limiting.
9. Rejection of malformed, impossible, or previously submitted results.
10. Atomic or otherwise concurrency-safe updates to personal records and leaderboard data.

For version one, use reasonable server-side plausibility checks and an event summary. Document that browser-based gameplay cannot be made fully cheat-proof by client validation alone.

Design the result-validation interface so a stronger event-log or server-authoritative validation mechanism can be introduced later.

Never update a leaderboard from an unvalidated result.

## K. API routes

Implement and document:

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me

POST /api/games/sessions
POST /api/games/sessions/:id/finish

GET /api/leaderboard?category=score
GET /api/leaderboard?category=saves
GET /api/leaderboard?category=fastest-rescue
GET /api/players/me/stats
GET /api/players/:username

Use consistent JSON responses, correct HTTP status codes, centralized error handling, and request validation.

Protect private routes with authentication middleware. Add CORS configuration and secure cookie settings appropriate to the deployment environment.

## L. UI and responsive design

Create:
- Landing and splash screen
- Login page
- Registration page
- Story cinematic
- Game HUD
- Pause screen
- Results screen
- Personal statistics page
- Global leaderboard
- Public player profile
- Helpful error and empty states

Use a coherent cinematic visual theme with strong typography, readable controls, responsive layouts, and restrained animation.

Include:
- Sound toggle
- How-to-play instructions
- Reduced-motion considerations
- Clear danger cues that do not rely on color alone
- Keyboard and touchscreen support

## M. Performance

Target smooth gameplay on ordinary laptops and modern mobile devices.

Use efficient geometry, limited dynamic lighting, object pooling for motorcycles, sensible shadow settings, controlled rendering resolution, and proper disposal of GPU resources.

Handle resizing, tab visibility changes, game restart cleanup, and browser WebGL failures.

Keep backend requests out of the per-frame render loop. Submit results after the round ends and display clear submission status.

## N. Testing and acceptance criteria

Actually run tests for:

Authentication:
- Valid registration and login
- Duplicate email and username rejection
- Invalid credentials
- Unauthenticated ranked-round rejection
- Session invalidation after logout

Gameplay:
- Player movement
- Rescue radius
- Successful rescue
- Collision failure
- Timer completion
- Pause and resume
- Multiple rescues in one round
- Difficulty progression
- Duplicate rescue prevention

Scoring:
- Base score
- Reaction-time bonus
- Combo calculations
- Round reset
- Personal best calculations

Leaderboard:
- Correct category sorting
- Pagination
- Deterministic tie-breaking
- Exclusion of unvalidated results
- Protection against duplicate result submissions

Persistence and security:
- MongoDB persistence
- Index constraints
- Server-side validation
- Access control
- Rate limits
- Safe public profiles

End-to-end:
- Register
- Log in
- Start ranked round
- Complete or fail the round
- Submit result
- View updated personal records
- View global leaderboard
- Log out and log back in

Also verify mobile layouts, asset loading, browser console errors, and production build output.

Do not claim a test passed unless it actually ran. If MongoDB or browser automation is unavailable, document the exact blocker and provide instructions for completing that test.

## O. Deliverables

Produce:
1. Complete React + Three.js client.
2. Complete Node.js + Express server.
3. MongoDB/Mongoose models.
4. Authentication and leaderboard APIs.
5. Environment variable examples without real secrets.
6. README with installation and run instructions.
7. MongoDB setup instructions.
8. Scoring and difficulty documentation.
9. Test checklist with actual outcomes.
10. Production build instructions.

## P. Execution order

First inspect the project directory.

Then:
1. Scaffold the client and server.
2. Build and test the playable 3D game loop.
3. Implement the story and responsive UI.
4. Add MongoDB models and authentication.
5. Implement validated results and leaderboards.
6. Add security protections.
7. Run unit, API, and end-to-end tests where available.
8. Run the production build and fix errors.
9. Update the README with exact commands and remaining limitations.

Build real working functionality. Do not leave placeholder buttons, fake rankings, mock authentication presented as real authentication, or unimplemented game mechanics.

Start implementation now.