import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { VerifyAuthChallengeResponseTriggerHandler } from "aws-lambda";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: VerifyAuthChallengeResponseTriggerHandler = async (
  event
) => {
  console.log("event: ", event);

  const command = new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: {
        S: `AuthenticationOptions#${event.request.userAttributes.sub}`,
      },
      sk: {
        S: `AuthenticationOptions#${event.request.userAttributes.sub}`,
      },
    },
  });

  const response = await docClient.send(command);

  console.log("RESPONSE: \n" + JSON.stringify(response, null, 2));

  const verification = await verifyAuthenticationResponse({
    response: JSON.parse(event.request.challengeAnswer),
    expectedChallenge: response.Item?.challenge?.S || "",
    expectedOrigin: "http://localhost:5173",
    expectedRPID: "localhost",
    requireUserVerification: false,
    authenticator: {
      credentialID: isoBase64URL.toBuffer(
        event.request.userAttributes["custom:credentialId"]
      ),
      credentialPublicKey: isoBase64URL.toBuffer(
        event.request.userAttributes["custom:credentialPublicKey"]
      ),
      counter: 0,
    },
  });

  console.log("VERIFICATION: \n" + JSON.stringify(verification, null, 2));

  if (verification.verified) {
    event.response.answerCorrect = true;
  }

  return event;
};
