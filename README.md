# ⚡ Carbon-Aware Scheduler

> Run your tasks when Scotland's grid is greenest. Reduce carbon emissions by 15-30% with zero cost.

[![Deploy Status](https://img.shields.io/badge/deploy-railway-purple)](https://railway.app)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## 🌍 The Problem

The UK electricity grid's carbon intensity varies dramatically throughout the day:
- **Peak times (6pm):** 280g CO2/kWh (fossil fuels)
- **Off-peak times (3am):** 18g CO2/kWh (wind power)

Running your washing machine at the greenest time can reduce emissions by **93%** for the same task.

## ✨ Features

- ⚡ Real-time carbon intensity from UK National Grid API
- 📊 48-hour forecast visualization  
- 🎯 Optimal scheduling for household & business tasks
- 💚 Carbon savings tracking (grams + percentage)
- 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland-focused (supports all UK postcodes)

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- [Git](https://git-scm.com/) installed

### Run Locally
```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/carbon-scheduler.git
cd carbon-scheduler

# Start everything with Docker Compose
docker-compose up

# Open browser to:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000/docs
# - MySQL: localhost:3306
```

That's it! 🎉

## 📁 Project Structure
```
carbon-scheduler/
├── backend/              # FastAPI (Python)
│   ├── app/
│   │   ├── main.py      # FastAPI entry point
│   │   ├── routers/     # API endpoints
│   │   ├── services/    # Business logic
│   │   └── database/    # SQLAlchemy models
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/            # Next.js (TypeScript)
│   ├── app/            # Next.js 14 app router
│   ├── components/     # React components
│   └── lib/           # API client
└── docker-compose.yml  # Local development setup
```

## 🛠️ Tech Stack

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [SQLAlchemy](https://www.sqlalchemy.org/) - Database ORM
- [MySQL 8.0](https://www.mysql.com/) - Database
- [UK Carbon Intensity API](https://carbonintensity.org.uk/) - Real-time grid data

**Frontend:**
- [Next.js 14](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Recharts](https://recharts.org/) - Data visualization

**DevOps:**
- [Docker](https://www.docker.com/) - Containerization
- [Railway](https://railway.app/) - Backend deployment
- [Vercel](https://vercel.com/) - Frontend deployment

## 📊 API Endpoints

Visit http://localhost:8000/docs when running locally for interactive Swagger documentation.

**Key endpoints:**
```bash
GET  /api/carbon/current?postcode=G1
GET  /api/carbon/forecast?postcode=G1&hours=48
POST /api/carbon/optimal-time
GET  /api/carbon/tasks
```

## 🗺️ Roadmap

**Phase 1: MVP** (Current)
- [x] Basic task scheduling
- [x] Carbon intensity integration
- [x] Docker development setup
- [ ] Deploy to Railway + Vercel

**Phase 2: User Features** (Week 2-4)
- [ ] User authentication (NextAuth.js)
- [ ] Task history tracking
- [ ] Monthly savings dashboard
- [ ] Email/SMS reminders

**Phase 3: Business Features** (Month 2-3)
- [ ] Team dashboards
- [ ] ESG reporting exports
- [ ] API access for integrations
- [ ] Kubernetes scheduling plugin

## 🤝 Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Credits

- Carbon intensity data from [National Grid ESO](https://carbonintensity.org.uk/)
- Built with ❤️ in Scotland

## 📧 Contact

Questions? Open an issue or reach out on [LinkedIn](https://linkedin.com/in/your-profile).

---

**⭐ Star this repo if you find it useful!**
