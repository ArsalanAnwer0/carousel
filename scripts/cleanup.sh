#!/bin/bash
echo "🧹 Cleaning up Kubernetes resources..."
kubectl delete namespace carousel --ignore-not-found=true
echo "✅ Cleanup complete!"

echo ""
echo "To also stop minikube, run: minikube stop"
echo "To delete minikube cluster, run: minikube delete"