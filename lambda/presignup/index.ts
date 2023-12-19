import { Handler, PreSignUpTriggerEvent } from "aws-lambda";

export const handler: Handler<PreSignUpTriggerEvent> = async (event) => {
  event.response.autoConfirmUser = true;

  return event;
};
