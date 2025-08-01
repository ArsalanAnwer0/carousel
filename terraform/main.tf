terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "carousel-cluster"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# VPC
resource "aws_vpc" "carousel_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.cluster_name}-vpc"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "carousel_igw" {
  vpc_id = aws_vpc.carousel_vpc.id

  tags = {
    Name        = "${var.cluster_name}-igw"
    Environment = var.environment
  }
}

# Subnets
resource "aws_subnet" "carousel_public_subnets" {
  count = 2

  vpc_id                  = aws_vpc.carousel_vpc.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.cluster_name}-public-subnet-${count.index + 1}"
    Environment = var.environment
    Type        = "public"
  }
}

resource "aws_subnet" "carousel_private_subnets" {
  count = 2

  vpc_id            = aws_vpc.carousel_vpc.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "${var.cluster_name}-private-subnet-${count.index + 1}"
    Environment = var.environment
    Type        = "private"
  }
}

# Route Tables
resource "aws_route_table" "carousel_public_rt" {
  vpc_id = aws_vpc.carousel_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.carousel_igw.id
  }

  tags = {
    Name        = "${var.cluster_name}-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "carousel_public_rta" {
  count = length(aws_subnet.carousel_public_subnets)

  subnet_id      = aws_subnet.carousel_public_subnets[count.index].id
  route_table_id = aws_route_table.carousel_public_rt.id
}

# NAT Gateway
resource "aws_eip" "carousel_nat_eip" {
  domain     = "vpc"
  depends_on = [aws_internet_gateway.carousel_igw]

  tags = {
    Name        = "${var.cluster_name}-nat-eip"
    Environment = var.environment
  }
}

resource "aws_nat_gateway" "carousel_nat" {
  allocation_id = aws_eip.carousel_nat_eip.id
  subnet_id     = aws_subnet.carousel_public_subnets[0].id

  tags = {
    Name        = "${var.cluster_name}-nat"
    Environment = var.environment
  }
}

resource "aws_route_table" "carousel_private_rt" {
  vpc_id = aws_vpc.carousel_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.carousel_nat.id
  }

  tags = {
    Name        = "${var.cluster_name}-private-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "carousel_private_rta" {
  count = length(aws_subnet.carousel_private_subnets)

  subnet_id      = aws_subnet.carousel_private_subnets[count.index].id
  route_table_id = aws_route_table.carousel_private_rt.id
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# EKS Cluster
resource "aws_eks_cluster" "carousel_cluster" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = "1.27"

  vpc_config {
    subnet_ids = concat(aws_subnet.carousel_public_subnets[*].id, aws_subnet.carousel_private_subnets[*].id)
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
  ]

  tags = {
    Environment = var.environment
  }
}

# EKS Node Group
resource "aws_eks_node_group" "carousel_nodes" {
  cluster_name    = aws_eks_cluster.carousel_cluster.name
  node_group_name = "${var.cluster_name}-nodes"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = aws_subnet.carousel_private_subnets[*].id

  scaling_config {
    desired_size = 2
    max_size     = 4
    min_size     = 1
  }

  instance_types = ["t3.medium"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  tags = {
    Environment = var.environment
  }
}

# IAM Roles
resource "aws_iam_role" "eks_cluster_role" {
  name = "${var.cluster_name}-cluster-role"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_iam_role" "eks_node_role" {
  name = "${var.cluster_name}-node-role"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_role.name
}

# S3 Bucket for image storage (optional upgrade)
resource "aws_s3_bucket" "carousel_images" {
  bucket = "${var.cluster_name}-images-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "${var.cluster_name}-images"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "carousel_images_pab" {
  bucket = aws_s3_bucket.carousel_images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Outputs
output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = aws_eks_cluster.carousel_cluster.endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.carousel_cluster.name
}

output "s3_bucket_name" {
  description = "S3 bucket for image storage"
  value       = aws_s3_bucket.carousel_images.bucket
}