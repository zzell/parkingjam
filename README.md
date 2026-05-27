# 🚗 Parking Jam

A neon-soaked, retro-pixel take on the classic Rush Hour sliding puzzle — can you get the red car out? 🕹️

## 🎮 Play now

👉 **[zzell.github.io/parkingjam](https://zzell.github.io/parkingjam)**

No install, no login, just vibes and puzzle-solving.

## ✨ Features

- 🧠 **5 difficulty levels** — from chill warm-up to brain-melting gridlock
- ⚡ **Two generator algorithms** — *Dependency Chain* (solution-path-guided, deep puzzles) and *Move Depth* (fast & random)
- 🔀 **5 parallel Web Workers** racing to find the best puzzle for you
- 💡 **Hint system** — stuck? let the BFS solver nudge you in the right direction
- 📤 **Share any puzzle** — every board is encoded in the URL, send it to a friend
- 🏆 **Optimal move counter** — see how close you are to the perfect solution

## 🛠️ Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start sliding. 🚙💨

## 🏗️ Tech stack

- **Next.js 14** (App Router, static export → GitHub Pages)
- **TypeScript**
- **Web Workers** for parallel puzzle generation
- **BFS solver** with full solution-path reconstruction
- Pixel font + neon CSS — no UI library, pure inline styles
