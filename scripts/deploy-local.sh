#!/bin/bash
set -e

echo "🚀 Deploying Carousel to local Kubernetes..."

# Check if minikube is running
if ! minikube status >/dev/null 2>&1; then
    echo "📋 Starting minikube..."
    minikube start --driver=docker --memory=3072 --cpus=2
else
    echo "✅ Minikube is already running"
fi

# Use minikube's Docker environment - manual export for cross-shell compatibility
echo "📦 Setting up Docker environment..."
export DOCKER_TLS_VERIFY="1"
export DOCKER_HOST="tcp://127.0.0.1:$(minikube ip | cut -d. -f4):2376"
export DOCKER_CERT_PATH="$HOME/.minikube/certs"
export MINIKUBE_ACTIVE_DOCKERD="minikube"

# Alternative: get the exact values from minikube
eval $(minikube docker-env --shell=bash)

# Build images
echo "🔨 Building Docker images..."
cd docker/
docker-compose build
cd ..

# Deploy to Kubernetes
echo "☸️  Deploying to Kubernetes..."
kubectl apply -f k8s/namespace.yaml
sleep 5
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml  
kubectl apply -f k8s/mongo-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Wait for MongoDB to be ready first
echo "⏳ Waiting for MongoDB to start..."
kubectl wait --for=condition=ready pod -l app=mongodb -n carousel --timeout=300s

# Wait for backend and frontend
echo "⏳ Waiting for backend and frontend to start..."
kubectl wait --for=condition=ready pod -l app=backend -n carousel --timeout=300s
kubectl wait --for=condition=ready pod -l app=frontend -n carousel --timeout=300s

# Show final status
echo ""
echo "✅ Deployment complete!"
echo ""
kubectl get pods -n carousel
echo ""

# Enable ingress addon if not already enabled
minikube addons enable ingress >/dev/null 2>&1 || true

echo "🌐 Access your application:"
echo "Frontend: Run 'minikube service frontend-service -n carousel --url'"
echo "Backend:  Run 'minikube service backend-service -n carousel --url'"
echo ""
echo "To check logs:"
echo "Backend logs:  kubectl logs -f deployment/backend-deployment -n carousel"
echo "Frontend logs: kubectl logs -f deployment/frontend-deployment -n carousel"