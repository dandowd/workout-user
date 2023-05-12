import * as cdk from "aws-cdk-lib";
import { SecretValue } from "aws-cdk-lib";
import { Construct } from "constructs";

export class UserAuthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new cdk.aws_cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      // sign-in can't be changed after creation
      signInAliases: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      mfa: cdk.aws_cognito.Mfa.OFF,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    userPool.addDomain("UserPoolDomain", {
      cognitoDomain: {
        domainPrefix: "workout-user",
      },
    });

    userPool.addClient("LoginClient", {
      supportedIdentityProviders: [
        cdk.aws_cognito.UserPoolClientIdentityProvider.COGNITO,
        cdk.aws_cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
      oAuth: {
        callbackUrls: ["exp://192.168.50.101:19000/--/auth", "myapp://auth"],
      },
    });

    new cdk.aws_cognito.UserPoolIdentityProviderGoogle(
      this,
      "GoogleIdProvider",
      {
        userPool,
        attributeMapping: {
          email: cdk.aws_cognito.ProviderAttribute.GOOGLE_EMAIL,
        },
        scopes: ["email"],
        clientId:
          "69790275993-vvpfap89obu9pno4soikkngr24q52gs6.apps.googleusercontent.com",
        clientSecretValue: SecretValue.secretsManager(
          "arn:aws:secretsmanager:us-east-1:589332345969:secret:staging/workout/google/idProvider-SXUXnE"
        ),
      }
    );

    const authorizer = new cdk.aws_apigateway.CognitoUserPoolsAuthorizer(
      this,
      "Authorizer",
      {
        cognitoUserPools: [userPool],
        identitySource:
          cdk.aws_apigateway.IdentitySource.header("Authorization"),
      }
    );

    new cdk.CfnOutput(this, "UserAuthorizerId", {
      value: authorizer.authorizerId,
      exportName: "UserAuthorizerId",
    });

    const api = new cdk.aws_apigateway.RestApi(this, "UserApi", {
      defaultMethodOptions: {
        authorizer,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: cdk.aws_apigateway.Cors.ALL_ORIGINS,
        allowMethods: cdk.aws_apigateway.Cors.ALL_METHODS,
      },
    });
    // Authorizer has to be attached to an api, this is a workaround
    api.root.addMethod("GET", undefined, {
      authorizer,
    });

    new cdk.CfnOutput(this, "UserApiId", {
      value: api.restApiId,
      exportName: "UserApiId",
    });

    new cdk.CfnOutput(this, "UserApiRootResourceId", {
      value: api.restApiRootResourceId,
      exportName: "UserApiRootResourceId",
    });
  }
}
