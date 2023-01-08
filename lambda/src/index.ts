
// import {logger} from 'logger';

// var AWS = require('aws-sdk');
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {
  ApiGatewayManagementApiClient,
  DeleteConnectionCommand,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }), {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});
export const lambdaHandler: APIGatewayProxyWebsocketHandlerV2<boolean> = async event => {
  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const connectionURL = 'https://' + domainName + '/develop';
  const apiGatewayClient = new ApiGatewayManagementApiClient({ region: 'us-east-1', endpoint: connectionURL });
  try {
    console.log(event)
    switch (event.requestContext.routeKey) {
      case '$connect':
        console.log('Connect called.');
        var response = await dynamoDB.send(
          new PutCommand({
            TableName: 'Websocket-connections',
            Item: {
              'connection-id': connectionId,
            },
          })
        );
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: response,
          }),
        };
      case '$disconnect':
        console.log('Disconnect called');
        var response = await dynamoDB.send(
          new DeleteCommand({
            TableName: 'Websocket-connections',
            Key: {
              'connection-id': connectionId,
            },
          })
        );
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: response,
          }),
        };
      case '$default':
        console.log('Default Called');
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'default called',
          }),
        };
      case 'MESSAGE':
        console.log('message called');
        let eventMessage = event.body;
        let messageObj = JSON.parse(eventMessage);
        let message = messageObj.message;
        const document = await dynamoDB.send(
          new ScanCommand({
            TableName: 'Websocket-connections',
          })
        );
        console.log('document ====>' + document);
        var connectionIdArray = [];
        document.Items.forEach(item => {
          connectionIdArray.push(item['connection-id']);
        });
        await Promise.all(
          connectionIdArray.map(async connectionId => {
            await apiGatewayClient.send(
              new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: message,
              })
            );
          })
        );
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'message sent to all connections',
          }),
        };
    }
  } catch (error) {
    // logger.error(
    //   {
    //     errorData: {
    //       err: error,
    //       sipEvent: event,
    //     },
    //   },
    //   `Error occurred in ${event.requestContext.eventType}`
    // );
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'error occurred',
      }),
    };
  }
};
