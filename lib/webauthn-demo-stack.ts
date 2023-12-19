import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";

export class WebauthnDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a DynamoDB Table
    const table = new cdk.aws_dynamodb.Table(this, "WebAuthnDemoTable", {
      partitionKey: {
        name: "pk",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "ttl",
    });

    // Create a Pre Signup Lambda Function
    const lambdaPreSignup = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "WebAuthnDemoLambdaPreSignup",
      {
        runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
        architecture: cdk.aws_lambda.Architecture.ARM_64,
        entry: path.join(__dirname, "..", "lambda", "presignup", "index.ts"),
        handler: "handler",
      }
    );

    // Create a Lambda Function for Defining a Custom Auth Challenge
    const lambdaDefineAuthChallenge = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "WebAuthnDemoLambdaDefineAuthChallenge",
      {
        runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
        architecture: cdk.aws_lambda.Architecture.ARM_64,
        entry: path.join(
          __dirname,
          "..",
          "lambda",
          "define-auth-challenge",
          "index.ts"
        ),
        handler: "handler",
      }
    );

    // Create a Lambda Function for Creating a Custom Auth Challenge
    const lambdaCreateAuthChallenge = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "WebAuthnDemoLambdaCreateAuthChallenge",
      {
        runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
        architecture: cdk.aws_lambda.Architecture.ARM_64,
        entry: path.join(
          __dirname,
          "..",
          "lambda",
          "create-auth-challenge",
          "index.ts"
        ),
        handler: "handler",
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantWriteData(lambdaCreateAuthChallenge);

    // Create a Lambda Function for Verifying a Custom Auth Challenge
    const lambdaVerifyAuthChallenge = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "WebAuthnDemoLambdaVerifyAuthChallenge",
      {
        runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
        architecture: cdk.aws_lambda.Architecture.ARM_64,
        entry: path.join(
          __dirname,
          "..",
          "lambda",
          "verify-auth-challenge",
          "index.ts"
        ),
        handler: "handler",
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantReadData(lambdaVerifyAuthChallenge);

    // Create a Cognito User Pool for Passwordless Authentication
    const userPool = new cdk.aws_cognito.UserPool(
      this,
      "WebAuthnDemoUserPool",
      {
        selfSignUpEnabled: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        passwordPolicy: {
          minLength: 6,
          requireLowercase: false,
          requireDigits: false,
          requireSymbols: false,
          requireUppercase: false,
        },
        customAttributes: {
          credentialId: new cdk.aws_cognito.StringAttribute(),
          credentialPublicKey: new cdk.aws_cognito.StringAttribute(),
        },
        lambdaTriggers: {
          preSignUp: lambdaPreSignup,
          defineAuthChallenge: lambdaDefineAuthChallenge,
          createAuthChallenge: lambdaCreateAuthChallenge,
          verifyAuthChallengeResponse: lambdaVerifyAuthChallenge,
        },
      }
    );

    // Create a Cognito User Pool Client for Passwordless Authentication
    const userPoolClient = new cdk.aws_cognito.UserPoolClient(
      this,
      "WebAuthnDemoUserPoolClient",
      {
        userPool,
        authFlows: {
          custom: true,
        },
      }
    );

    const api = new cdk.aws_apigatewayv2.HttpApi(this, "WebAuthnDemoApi", {
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          cdk.aws_apigatewayv2.CorsHttpMethod.GET,
          cdk.aws_apigatewayv2.CorsHttpMethod.POST,
        ],
        allowHeaders: ["*"],
      },
    });

    // Create a Lambda Function for Pre-Registering a WebAuthn Credential
    const lambdaPreregister = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "WebAuthnDemoLambdaPreregister",
      {
        runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
        architecture: cdk.aws_lambda.Architecture.ARM_64,
        entry: path.join(__dirname, "..", "lambda", "preregister", "index.ts"),
        handler: "handler",
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );

    // Grant the Lambda Function access to the DynamoDB Table
    table.grantWriteData(lambdaPreregister);

    const lambdaPreregisterIntegration =
      new cdk.aws_apigatewayv2_integrations.HttpLambdaIntegration(
        "WebAuthnDemoLambdaPreregisterIntegration",
        lambdaPreregister
      );

    // Add Route for Pre-Registering a WebAuthn Credential
    api.addRoutes({
      path: "/preregister",
      methods: [cdk.aws_apigatewayv2.HttpMethod.POST],
      integration: lambdaPreregisterIntegration,
    });

    // Create a Lambda Function for Registering a WebAuthn Credential
    const lambdaRegister = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "WebAuthnDemoLambdaRegister",
      {
        runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
        architecture: cdk.aws_lambda.Architecture.ARM_64,
        entry: path.join(__dirname, "..", "lambda", "register", "index.ts"),
        handler: "handler",
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );

    // Grant the Lambda Function access to the DynamoDB Table
    table.grantReadData(lambdaRegister);

    const lambdaRegisterIntegration =
      new cdk.aws_apigatewayv2_integrations.HttpLambdaIntegration(
        "WebAuthnDemoLambdaRegisterIntegration",
        lambdaRegister
      );

    // Add Route for Registering a WebAuthn Credential
    api.addRoutes({
      path: "/register",
      methods: [cdk.aws_apigatewayv2.HttpMethod.POST],
      integration: lambdaRegisterIntegration,
    });

    new cdk.CfnOutput(this, "Region", {
      value: this.region,
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.apiEndpoint,
    });
  }
}
