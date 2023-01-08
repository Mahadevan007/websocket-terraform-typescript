resource "aws_dynamodb_table" "basic-dynamodb-table" {
  name           = "Websocket-connections"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "connection-id"

  attribute {
    name = "connection-id"
    type = "S"
  }

}