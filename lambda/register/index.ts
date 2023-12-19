import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { RegistrationResponseJSON } from "@simplewebauthn/typescript-types";
import { APIGatewayProxyEventV2, Handler } from "aws-lambda";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: Handler<APIGatewayProxyEventV2> = async (
  event,
  context
) => {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));

  const body = JSON.parse(event.body || "{}");

  console.log("BODY: \n" + JSON.stringify(body, null, 2));

  const command = new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: {
        S: `RegistrationOptions#${body.userId}`,
      },
      sk: {
        S: `RegistrationOptions#${body.userId}`,
      },
    },
  });

  const response = await docClient.send(command);

  console.log("RESPONSE: \n" + JSON.stringify(response, null, 2));

  const registrationResponse =
    body.attestationResponse as RegistrationResponseJSON;

  const verification = await verifyRegistrationResponse({
    response: registrationResponse,
    expectedChallenge: response.Item?.challenge?.S || "",
    expectedOrigin: "http://localhost:5173",
    expectedRPID: "localhost",
    requireUserVerification: false,
  });

  console.log("VERIFICATION: \n" + JSON.stringify(verification, null, 2));

  const { verified } = verification;

  if (
    verified &&
    verification.registrationInfo &&
    verification.registrationInfo.credentialID &&
    verification.registrationInfo.credentialPublicKey
  ) {
    return {
      credentialID: isoBase64URL.fromBuffer(
        verification.registrationInfo?.credentialID
      ),
      credentialPublicKey: isoBase64URL.fromBuffer(
        verification.registrationInfo?.credentialPublicKey
      ),
      counter: verification.registrationInfo?.counter,
      credentialDeviceType: verification.registrationInfo?.credentialDeviceType,
      credentialBackedUp: verification.registrationInfo?.credentialBackedUp,
    };
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      errors: [
        {
          message: "Your WebAuthn registration was not verified.",
        },
      ],
    }),
  };
};
