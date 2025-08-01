# Carousel

A modern, full-stack image gallery application built with microservices architecture, featuring Docker containerization, Kubernetes orchestration, and Infrastructure as Code.

![Carousel Demo](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Docker](https://img.shields.io/badge/Docker-Containerized-blue)
![Kubernetes](https://img.shields.io/badge/Kubernetes-Orchestrated-326ce5)
![Terraform](https://img.shields.io/badge/Terraform-IaC-623ce4)

##  Features

- ** Image Upload & Management** - Upload, view, and delete images
- ** Interactive Carousel** - Smooth image browsing experience
- ** Real-time Updates** - Dynamic image gallery
- ** Responsive Design** - Works on all device sizes
- ** Microservices Architecture** - Scalable and maintainable
- ** Cloud-Ready** - Deploy to any Kubernetes cluster

##  Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (React/HTML)  │◄──►│   (Flask API)   │◄──►│   (MongoDB)     │
│   Port: 3001    │    │   Port: 5001    │    │   Port: 27017   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Tech Stack
- **Frontend**: HTML, CSS, JavaScript, Nginx
- **Backend**: Python Flask, RESTful API
- **Database**: MongoDB
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes
- **Infrastructure**: Terraform (AWS EKS)
- **CI/CD**: GitHub Actions

##  Quick Start

### Prerequisites
- Docker Desktop
- minikube
- kubectl
- Git

### One-Command Deployment

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/carousel-image-gallery.git
cd carousel-image-gallery

# Deploy to local Kubernetes
./scripts/deploy-local.sh
```

That's it!  Your application will be running on Kubernetes.

### Access Your Application

```bash
# Get frontend URL
minikube service frontend-service -n carousel --url

# Get backend URL
minikube service backend-service -n carousel --url
```

##  Available Scripts

| Script | Description |
|--------|-------------|
| `./scripts/deploy-local.sh` | Deploy to local Kubernetes cluster |
| `./scripts/status.sh` | Check application status |
| `./scripts/cleanup.sh` | Clean up resources |

##  Docker Development

### Run with Docker Compose

```bash
cd docker/
docker-compose up --build
```

Access:
- Frontend: http://localhost:3001
- Backend: http://localhost:5001
- Health Check: http://localhost:5001/health

##  Kubernetes Deployment

### Local Development (minikube)

```bash
# Start minikube
minikube start --driver=docker --memory=3072 --cpus=2

# Deploy application
./scripts/deploy-local.sh

# Check status
kubectl get pods -n carousel
```

### Production Deployment

```bash
# Deploy to production cluster
kubectl apply -f k8s/

# Verify deployment
kubectl get all -n carousel
```

##  Infrastructure as Code (Terraform)

Deploy to AWS EKS:

```bash
cd terraform/

# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Deploy infrastructure
terraform apply
```

Creates:
- EKS Cluster with worker nodes
- VPC with public/private subnets
- S3 bucket for image storage
- IAM roles and policies
- Load balancers and networking

##  Development

### Project Structure

```
carousel/
├── backend/                 # Flask API
│   ├── app.py              # Main application
│   └── requirements.txt    # Python dependencies
├── frontend/               # Web interface
│   ├── index.html          # Main page
│   ├── script.js           # JavaScript logic
│   └── style.css           # Styling
├── docker/                 # Container configurations
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── k8s/                    # Kubernetes manifests
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── mongo-deployment.yaml
│   └── ingress.yaml
├── terraform/              # Infrastructure code
│   └── main.tf
├── scripts/                # Automation scripts
│   ├── deploy-local.sh
│   ├── status.sh
│   └── cleanup.sh
└── .github/workflows/      # CI/CD pipeline
    └── deploy.yml
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/images` | Get all images |
| POST | `/api/upload` | Upload new image |
| DELETE | `/api/images/<id>` | Delete image |
| GET | `/api/pins` | Get pinned items |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/carousel` |
| `FLASK_ENV` | Flask environment | `development` |
| `API_BASE_URL` | Backend API URL | `http://localhost:5001` |

##  Testing

### Health Check
```bash
curl http://localhost:5001/health
```

### API Testing
```bash
# Get images
curl http://localhost:5001/api/images

# Upload image
curl -X POST -F "image=@test.jpg" -F "title=Test" http://localhost:5001/api/upload
```

### Kubernetes Testing
```bash
# Check pod logs
kubectl logs -f deployment/backend-deployment -n carousel

# Test services
kubectl get services -n carousel
```

##  Monitoring

### Check Application Status
```bash
./scripts/status.sh
```

### View Logs
```bash
# Backend logs
kubectl logs -f deployment/backend-deployment -n carousel

# Frontend logs
kubectl logs -f deployment/frontend-deployment -n carousel

# MongoDB logs
kubectl logs -f deployment/mongodb-deployment -n carousel
```

##  Troubleshooting

### Common Issues

**Pods not starting?**
```bash
kubectl describe pods -n carousel
kubectl get events -n carousel --sort-by=.metadata.creationTimestamp
```

**Image pull errors?**
```bash
# Use local images
eval $(minikube docker-env)
cd docker && docker-compose build
```

**Service not accessible?**
```bash
# Check service endpoints
kubectl get endpoints -n carousel
minikube service list
```

##  Deployment Options

### 1. Local Development
- Docker Compose for quick development
- minikube for Kubernetes testing

### 2. Staging/Production
- AWS EKS with Terraform
- Google GKE
- Azure AKS
- Any Kubernetes cluster

##  Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Acknowledgments

- Built with modern DevOps practices
- Follows microservices architecture
- Production-ready configurations
- Cloud-native design patterns

---

** Star this repository if you found it helpful!**

For questions or support, please open an issue or contact [your-email@example.com](mailto:your-email@example.com).