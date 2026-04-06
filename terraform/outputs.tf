output "rds_endpoint" {
  description = "PostgreSQL connection endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "sqs_queue_url" {
  description = "Main pipeline SQS queue URL"
  value       = aws_sqs_queue.pipeline.url
}

output "sqs_dlq_url" {
  description = "Dead letter queue URL"
  value       = aws_sqs_queue.dead_letter.url
}

output "alb_dns" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecr_repository_url" {
  description = "ECR repository URL for the worker image"
  value       = aws_ecr_repository.worker.repository_url
}
