import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { CreateAuthChallengeTriggerHandler } from "aws-lambda";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: CreateAuthChallengeTriggerHandler = async (
  event,
  context,
  callback
) => {
  console.log("event: ", event);
  console.log("context: ", context);

  if (
    event.request.session.length === 0 &&
    event.request.challengeName === "CUSTOM_CHALLENGE"
  ) {
    const options = await generateAuthenticationOptions({
      rpID: "localhost",
    });

    console.log("OPTIONS: \n" + JSON.stringify(options, null, 2));

    event.response.publicChallengeParameters = {
      credentialId: event.request.userAttributes["custom:credentialId"],
      challenge: options.challenge,
    };

    const command = new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        pk: {
          S: `AuthenticationOptions#${event.request.userAttributes.sub}`,
        },
        sk: {
          S: `AuthenticationOptions#${event.request.userAttributes.sub}`,
        },
        challenge: {
          S: options.challenge,
        },
        ttl: {
          N: (Math.floor(Date.now() / 1000) + 60 * 5).toString(), // 5 minutes
        },
      },
    });

    await docClient.send(command);
  }

  callback(null, event);
};
