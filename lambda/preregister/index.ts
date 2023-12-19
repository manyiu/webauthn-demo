import { generateRegistrationOptions } from "@simplewebauthn/server";
import { APIGatewayProxyEventV2, Handler } from "aws-lambda";
import KSUID = require("ksuid");

import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: Handler<APIGatewayProxyEventV2> = async (
  event,
  context
) => {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));

  const body = JSON.parse(event.body || "{}");

  if (!body.username) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        errors: [
          {
            message: "Missing username",
          },
        ],
      }),
    };
  }

  const userID = KSUID.randomSync().string;

  const options = await generateRegistrationOptions({
    rpName: "AWS WebAuthn Demo",
    rpID: "localhost",
    userID,
    userName: body.username,
    authenticatorSelection: {
      authenticatorAttachment: "cross-platform",
      requireResidentKey: false,
      userVerification: "discouraged",
      residentKey: "discouraged",
    },
  });

  const command = new PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: {
        S: `RegistrationOptions#${userID}`,
      },
      sk: {
        S: `RegistrationOptions#${userID}`,
      },
      challenge: {
        S: options.challenge,
      },
      ttl: {
        N: (Math.floor(Date.now() / 1000) + 60 * 5).toString(), // 5 minutes
      },
    },
  });

  console.log("OPTIONS: \n" + JSON.stringify(options, null, 2));

  const response = await docClient.send(command);

  console.log("RESPONSE: \n" + JSON.stringify(response, null, 2));

  return options;
};
