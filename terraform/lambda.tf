data "archive_file" "function_archive" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/dist"
  output_path = "${path.module}/../lambda/dist/function.zip"
}

resource "aws_iam_role" "ws_messenger_lambda_role" {
  name = "WsMessengerLambdaRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Effect = "Allow"

      }
    ]
  })

    inline_policy {
    name = "DynamoDBAccess"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Action = [
            "dynamodb:GetItem",
            "dynamodb:Query",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:Scan"
          ],
          Effect : "Allow"
          Resource : "*"
        }
      ]
    })
  }
  inline_policy {
    name = "ApiGatewayInvoke"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Action = [
              "execute-api:Invoke",
              "execute-api:ManageConnections"
          ],
          Effect : "Allow"
          Resource: "arn:aws:execute-api:*:*:*"
        }
      ]
    })
  }

  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"]
}

resource "aws_lambda_function" "ws_messenger_lambda" {
  filename      = "${data.archive_file.function_archive.output_path}"
  function_name = "ws-messenger"
  role          = aws_iam_role.ws_messenger_lambda_role.arn
  handler       = "index.lambdaHandler"
  runtime     = "nodejs18.x"
  timeout     = "30"
  memory_size = "${local.lambda_memory}"
}

resource "aws_cloudwatch_log_group" "ws_messenger_logs" {
  name              = "/aws/lambda/${aws_lambda_function.ws_messenger_lambda.function_name}"
  retention_in_days = 30
}
