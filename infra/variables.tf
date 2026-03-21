variable "region" {
  type    = string
  default = "us-east-1"
}

variable "ssh_cidr" {
  type        = string
  description = "Your public IP in CIDR notation for SSH access (e.g. 1.2.3.4/32)"
}

variable "jwt_secret" {
  type        = string
  description = "JWT secret key for API authentication"
  sensitive   = true
}

variable "db_password" {
  type        = string
  default     = "fintrack_prod_2026"
  description = "PostgreSQL password"
  sensitive   = true
}

variable "repo_url" {
  type        = string
  description = "Git repository URL to clone on EC2"
}

variable "domain" {
  type        = string
  description = "Domain name pointing to this EC2 via Cloudflare (e.g. fintrack.example.com)"
}
