import { DefineAuthChallengeTriggerHandler } from "aws-lambda";

export const handler: DefineAuthChallengeTriggerHandler = (
  event,
  context,
  callback
) => {
  console.log("event: ", event);
  console.log("context: ", context);

  if (event.request.userNotFound) {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    throw new Error("User not found.");
  }

  if (event.request.session.length === 0) {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = "CUSTOM_CHALLENGE";
  } else if (
    event.request.session.length === 1 &&
    event.request.session[0].challengeName === "CUSTOM_CHALLENGE" &&
    event.request.session[0].challengeResult === true
  ) {
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  }

  callback(null, event);
};
