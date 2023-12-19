import { Amplify } from "aws-amplify";
import cdkOutput from "./index.json";

const amplify = Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: cdkOutput.WebauthnDemoStack.UserPoolId,
      userPoolClientId: cdkOutput.WebauthnDemoStack.UserPoolClientId,
    },
  },
  Geo: {
    LocationService: {
      region: cdkOutput.WebauthnDemoStack.Region,
    },
  },
});

export default amplify;
