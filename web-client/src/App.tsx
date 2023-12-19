import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/typescript-types";
import { confirmSignIn, signIn, signUp } from "aws-amplify/auth";
import React from "react";
import "./App.css";
import cdkOutput from "./amplify/index.json";

const apiEndpointUrl = cdkOutput.WebauthnDemoStack.ApiEndpoint;

function App() {
  const usernameRef = React.useRef<HTMLInputElement>(null);

  const registerHandler = async () => {
    const rawPreregisterResponse = await fetch(
      `${apiEndpointUrl}/preregister`,
      {
        method: "POST",
        body: JSON.stringify({
          action: "register",
          username: usernameRef.current?.value,
        }),
      }
    );

    const preregisterResponse =
      (await rawPreregisterResponse.json()) as PublicKeyCredentialCreationOptionsJSON;

    const attestationResponse = await startRegistration(preregisterResponse);

    const rawRegisterResponse = await fetch(`${apiEndpointUrl}/register`, {
      method: "POST",
      body: JSON.stringify({
        attestationResponse,
        userId: preregisterResponse.user.id,
      }),
    });

    const registerResponse = await rawRegisterResponse.json();

    await signUp({
      username: preregisterResponse.user.name,
      password: "P@ssw0rd",
      options: {
        userAttributes: {
          "custom:credentialId": registerResponse.credentialID,
          "custom:credentialPublicKey": registerResponse.credentialPublicKey,
        },
      },
    });
  };

  const signInHandler = async () => {
    const signin = (await signIn({
      username: usernameRef.current?.value || "",
      options: {
        authFlowType: "CUSTOM_WITHOUT_SRP",
      },
    })) as unknown as {
      nextStep: {
        additionalInfo: {
          challenge: string;
          credentialId: string;
        };
      };
    };

    const asseResp = await startAuthentication({
      challenge: signin.nextStep.additionalInfo.challenge,
      rpId: "localhost",
      allowCredentials: [
        {
          id: signin.nextStep.additionalInfo.credentialId,
          type: "public-key",
          transports: [
            "ble",
            "cable",
            "hybrid",
            "internal",
            "nfc",
            "smart-card",
            "usb",
          ],
        },
      ],
      userVerification: "discouraged",
    });

    await confirmSignIn({
      challengeResponse: JSON.stringify(asseResp),
    });
  };

  return (
    <>
      <h1>WebAuthn Demo</h1>

      <input
        aria-label="username"
        type="text"
        placeholder="username"
        ref={usernameRef}
      />
      <button onClick={registerHandler}>
        Register with Passkey or Security Key
      </button>
      <button onClick={signInHandler}>
        Sign in with Passkey or Security Key
      </button>
    </>
  );
}

export default App;
