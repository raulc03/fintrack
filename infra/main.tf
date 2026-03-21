terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# --- SSH Key Pair ---

resource "tls_private_key" "deploy" {
  algorithm = "ED25519"
}

resource "aws_key_pair" "deploy" {
  key_name   = "fintrack-deploy"
  public_key = tls_private_key.deploy.public_key_openssh
}

resource "local_file" "private_key" {
  content         = tls_private_key.deploy.private_key_openssh
  filename        = "${path.module}/fintrack-key.pem"
  file_permission = "0400"
}

# --- Security Group ---

resource "aws_security_group" "fintrack" {
  name        = "fintrack-sg"
  description = "FinTrack - Cloudflare only HTTP/HTTPS + restricted SSH"

  # SSH from deployer IP only
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  # HTTP from Cloudflare IPs only
  dynamic "ingress" {
    for_each = local.cloudflare_ipv4_cidrs
    content {
      description = "HTTP from Cloudflare"
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  # HTTPS from Cloudflare IPs only
  dynamic "ingress" {
    for_each = local.cloudflare_ipv4_cidrs
    content {
      description = "HTTPS from Cloudflare"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "fintrack-sg"
    Project = "fintrack"
  }
}

# --- Latest Amazon Linux 2023 AMI ---

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# --- EC2 Instance (Free Tier: t2.micro) ---

resource "aws_instance" "fintrack" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t2.micro"
  key_name               = aws_key_pair.deploy.key_name
  vpc_security_group_ids = [aws_security_group.fintrack.id]

  user_data = templatefile("${path.module}/user_data.sh", {
    REPO_URL    = var.repo_url
    JWT_SECRET  = var.jwt_secret
    DB_PASSWORD = var.db_password
    DOMAIN      = var.domain
  })

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name    = "fintrack-app"
    Project = "fintrack"
  }
}

# --- Elastic IP (free while EC2 is running) ---

resource "aws_eip" "fintrack" {
  instance = aws_instance.fintrack.id

  tags = {
    Name    = "fintrack-eip"
    Project = "fintrack"
  }
}
