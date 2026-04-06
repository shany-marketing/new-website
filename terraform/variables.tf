variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "env" {
  description = "Environment name (prod / staging)"
  type        = string
  default     = "prod"
}

variable "db_password" {
  description = "Master password for RDS PostgreSQL"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance type"
  type        = string
  default     = "db.t3.medium"
}

variable "ecs_cpu" {
  description = "Fargate task CPU units"
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "Fargate task memory (MB)"
  type        = number
  default     = 1024
}

variable "worker_image" {
  description = "ECR image URI for the pipeline worker"
  type        = string
  default     = ""  # Set after first Docker build + push to ECR
}

variable "domain_name" {
  description = "Domain name for ACM certificate (e.g. app.upstar.io)"
  type        = string
}
