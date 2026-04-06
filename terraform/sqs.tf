resource "aws_sqs_queue" "dead_letter" {
  name                      = "upstar-pipeline-dlq-${var.env}.fifo"
  fifo_queue                = true
  content_based_deduplication = true
  message_retention_seconds = 1209600  # 14 days
}

resource "aws_sqs_queue" "pipeline" {
  name                      = "upstar-pipeline-${var.env}.fifo"
  fifo_queue                = true
  content_based_deduplication = true
  visibility_timeout_seconds = 900     # 15 min — enough for long LLM calls

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dead_letter.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue_policy" "pipeline" {
  queue_url = aws_sqs_queue.pipeline.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = aws_iam_role.ecs_task.arn }
      Action    = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
      Resource  = aws_sqs_queue.pipeline.arn
    }]
  })
}
